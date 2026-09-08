import { randomInt, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { SIX_MAX_POSITIONS } from '@/domain/chips';
import { getHandClass, type Combo } from '@/domain/cards';
import { getNlheProvider } from '@/strategy/nlhe-provider';
import { validNlheConfig, SCENARIOS, spotLabel, type NlheConfig, type NlheFeedback, type NlheProgress, type NlheRange, type NlheSession } from '@/shared/nlhe';
import type { Database } from './db';
import { ApiError } from './errors';

export const nlheConfigSchema = z.object({ game: z.literal('nlhe'), format: z.literal('6max-cash'), stackBb: z.number(), hero: z.enum(SIX_MAX_POSITIONS), villain: z.enum(SIX_MAX_POSITIONS).nullable(), scenario: z.enum(SCENARIOS) }).strict().refine(validNlheConfig, 'Ungültiger Stack oder unmögliche Positionsfolge.');
export const startNlheSchema = z.object({ config: nlheConfigSchema, solutionVersion: z.string().min(1).max(100), clientId: z.string().uuid() }).strict();
export const sessionIdSchema = z.string().uuid();
export const nlheDecisionSchema = z.object({ sessionId: sessionIdSchema, questionId: z.string().uuid(), action: z.enum(['fold', 'call', 'raise', 'check', 'bet']) }).strict();
type SessionRow = { id: string; config: NlheConfig; solution_version: string; completed_at: Date | string | null; range_snapshot: NlheRange | null; opponent_snapshot: NlheRange | null };
type QuestionRow = { id: string; ordinal: number; cards: Combo; feedback: NlheFeedback | null };
const SESSION_LIMIT = 10;

async function ownedSession(db: Database, userId: string, id: string): Promise<SessionRow> {
  sessionIdSchema.parse(id);
  const rows = await db.query<SessionRow>('SELECT id, config, solution_version, completed_at, range_snapshot, opponent_snapshot FROM nlhe_sessions WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!rows[0]) throw new ApiError(404, 'Diese Trainingssitzung wurde nicht gefunden.', 'SESSION_NOT_FOUND');
  return rows[0];
}
async function sessionRange(session: SessionRow): Promise<NlheRange> {
  if (session.range_snapshot) return session.range_snapshot;
  const range = await (await getNlheProvider()).getRangeStrategy(session.config);
  if (range.provenance.solutionVersion !== session.solution_version) throw new ApiError(409, 'Die Range-Version wurde aktualisiert. Dein Fortschritt bleibt gespeichert; starte eine neue Sitzung aus dem Explorer.', 'SOLUTION_CHANGED');
  return range;
}
async function questions(db: Database, id: string): Promise<QuestionRow[]> {
  return db.query<QuestionRow>('SELECT q.id, q.ordinal, q.cards, d.feedback FROM nlhe_questions q LEFT JOIN nlhe_decisions d ON d.question_id = q.id WHERE q.session_id = $1 ORDER BY q.ordinal', [id]);
}
function sample(range: NlheRange): Combo {
  const pool = range.combos.filter(c => c.reach > 0);
  const total = pool.reduce((n, c) => n + c.reach, 0);
  if (!total) throw new Error('Empty training range');
  let cursor = randomInt(1_000_000_000) / 1_000_000_000 * total;
  for (const combo of pool) { cursor -= combo.reach; if (cursor < 0) return combo.cards; }
  return pool.at(-1)!.cards;
}
async function ensureQuestion(db: Database, session: SessionRow, range: NlheRange): Promise<void> {
  const existing = await questions(db, session.id);
  if (session.completed_at || (existing.length && !existing.at(-1)!.feedback) || existing.length >= SESSION_LIMIT) return;
  await db.query('INSERT INTO nlhe_questions (id, session_id, ordinal, cards) SELECT $1, id, $3, $4::jsonb FROM nlhe_sessions WHERE id = $2 AND completed_at IS NULL ON CONFLICT (session_id, ordinal) DO NOTHING',
    [randomUUID(), session.id, existing.length + 1, JSON.stringify(sample(range))]);
}

export async function startNlheSession(db: Database, userId: string, raw: z.infer<typeof startNlheSchema>): Promise<NlheSession> {
  const input = startNlheSchema.parse(raw);
  const range = await (await getNlheProvider()).getRangeStrategy(input.config);
  if (range.provenance.solutionVersion !== input.solutionVersion) throw new ApiError(409, 'Bitte lade die aktuelle Range erneut.', 'SOLUTION_CHANGED');
  const opponent = input.config.scenario === 'flop-srp' ? await (await getNlheProvider()).getRangeStrategy({ game: 'nlhe', format: '6max-cash', stackBb: 100, scenario: 'vs-open', hero: 'BB', villain: 'BTN' }) : null;
  await db.query('INSERT INTO nlhe_sessions (id, user_id, client_id, config, solution_version, range_snapshot, opponent_snapshot) VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7::jsonb) ON CONFLICT (user_id, client_id) DO NOTHING',
    [randomUUID(), userId, input.clientId, JSON.stringify(input.config), input.solutionVersion, JSON.stringify(range), JSON.stringify(opponent)]);
  const rows = await db.query<SessionRow>('SELECT id, config, solution_version, completed_at, range_snapshot, opponent_snapshot FROM nlhe_sessions WHERE user_id = $1 AND client_id = $2', [userId, input.clientId]);
  const session = rows[0];
  if (spotLabel(session.config) !== spotLabel(input.config) || session.solution_version !== input.solutionVersion) throw new ApiError(409, 'Dieser Startversuch gehört bereits zu einer anderen Range.', 'ATTEMPT_CONFLICT');
  await ensureQuestion(db, session, range);
  return getNlheSession(db, userId, session.id);
}

export async function getNlheSession(db: Database, userId: string, id: string): Promise<NlheSession> {
  const session = await ownedSession(db, userId, id); const range = await sessionRange(session);
  const rows = await questions(db, id); const question = rows.at(-1);
  if (!question) { await ensureQuestion(db, session, range); return getNlheSession(db, userId, id); }
  const { combos, classes, related, ...spot } = range;
  void combos; void classes; void related;
  let villainRange: NlheSession['question']['villainRange'];
  if (range.board.length) {
    const defense = session.opponent_snapshot;
    if (!defense) throw new ApiError(409, 'Für diese alte Sitzung fehlt die gegnerische Range. Starte eine neue Flop-Sitzung.', 'SOLUTION_CHANGED');
    const allowed = defense.combos.filter(c => !c.cards.some(card => [...range.board, ...question.cards].includes(card)));
    villainRange = defense.classes.map(row => {
      const combos = allowed.filter(c => c.handClass === row.handClass);
      return { handClass: row.handClass, combos: combos.length, weight: combos.length ? combos.reduce((n, c) => n + c.actions.find(a => a.action === 'call')!.frequency, 0) / combos.length : 0 };
    }).filter(row => row.combos && row.weight);
  }
  return { id, spot, question: { id: question.id, ordinal: question.ordinal, cards: question.cards, handClass: getHandClass(question.cards), ...(villainRange ? { villainRange } : {}) },
    feedback: question.feedback, answered: rows.filter(q => q.feedback).length, limit: SESSION_LIMIT, complete: session.completed_at !== null };
}
export async function nextNlheQuestion(db: Database, userId: string, id: string): Promise<NlheSession> {
  const session = await ownedSession(db, userId, id); const range = await sessionRange(session);
  const rows = await questions(db, id);
  if (rows.length === SESSION_LIMIT && rows.at(-1)?.feedback) await db.query('UPDATE nlhe_sessions SET completed_at = COALESCE(completed_at, now()) WHERE id = $1 AND user_id = $2', [id, userId]);
  else await ensureQuestion(db, session, range);
  return getNlheSession(db, userId, id);
}
export async function finishNlheSession(db: Database, userId: string, id: string): Promise<NlheSession> {
  await ownedSession(db, userId, id);
  const rows = await questions(db, id);
  if (!rows.some(q => q.feedback)) throw new ApiError(400, 'Beantworte zuerst eine Hand.', 'NO_DECISION');
  await db.query('UPDATE nlhe_sessions SET completed_at = COALESCE(completed_at, now()) WHERE id = $1 AND user_id = $2', [id, userId]);
  return getNlheSession(db, userId, id);
}
export async function answerNlhe(db: Database, userId: string, raw: z.infer<typeof nlheDecisionSchema>): Promise<NlheFeedback> {
  const input = nlheDecisionSchema.parse(raw); const session = await ownedSession(db, userId, input.sessionId);
  const rows = await questions(db, session.id); const question = rows.find(q => q.id === input.questionId);
  if (!question) throw new ApiError(404, 'Die Hand gehört nicht zu dieser Sitzung.', 'QUESTION_NOT_FOUND');
  if (question.feedback) {
    if (question.feedback.chosenAction !== input.action) throw new ApiError(409, 'Diese Hand wurde bereits anders beantwortet.', 'ATTEMPT_CONFLICT');
    return question.feedback;
  }
  if (session.completed_at) throw new ApiError(409, 'Diese Sitzung ist bereits abgeschlossen.', 'SESSION_COMPLETE');
  const range = await sessionRange(session);
  const combo = range.combos.find(c => c.cards.join('') === question.cards.join(''));
  const choice = combo?.actions.find(a => a.action === input.action);
  if (!choice || !combo?.reach) throw new ApiError(400, 'Diese Aktion ist in diesem Spot nicht legal.', 'INVALID_DECISION');
  const feedback: NlheFeedback = { questionId: question.id, chosenAction: input.action, chosenFrequency: choice.frequency,
    inPolicy: choice.frequency > 0, actions: combo.actions, regret: null, provenance: range.provenance,
    explanation: `${choice.frequency > 0 ? 'Deine Aktion kommt in dieser Lernrange vor.' : 'Diese Lernrange verwendet deine Aktion mit dieser Hand nicht.'} Die Prozentwerte beschreiben eine grobe, ursprüngliche Lernregel. Mehrere Aktionen können vorgesehen sein; eine einzelne Wahl prüft keine langfristige Mischfrequenz. Ohne echte Solution gibt es keine Aussage über GTO-Richtigkeit oder EV-Verlust.` };
  const inserted = await db.query<{ feedback: NlheFeedback }>('INSERT INTO nlhe_decisions (question_id, user_id, action, feedback) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (question_id) DO NOTHING RETURNING feedback',
    [question.id, userId, input.action, JSON.stringify(feedback)]);
  if (inserted[0]) return inserted[0].feedback;
  const winner = (await questions(db, session.id)).find(q => q.id === question.id)!.feedback!;
  if (winner.chosenAction !== input.action) throw new ApiError(409, 'Diese Hand wurde bereits anders beantwortet.', 'ATTEMPT_CONFLICT');
  return winner;
}

export async function nlheProgress(db: Database, userId: string): Promise<NlheProgress> {
  const [stats, counts, daily, recent, sessions] = await Promise.all([
    db.query<{ decisions: number; preflop: number; postflop: number }>(`SELECT count(*)::int AS decisions, count(*) FILTER (WHERE s.config->>'scenario' <> 'flop-srp')::int AS preflop,
      count(*) FILTER (WHERE s.config->>'scenario' = 'flop-srp')::int AS postflop FROM nlhe_decisions d JOIN nlhe_questions q ON q.id = d.question_id JOIN nlhe_sessions s ON s.id = q.session_id WHERE d.user_id = $1`, [userId]),
    db.query<{ count: number }>('SELECT count(*)::int AS count FROM nlhe_sessions WHERE user_id = $1 AND completed_at IS NOT NULL', [userId]),
    db.query<{ date: string; decisions: number }>(`SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, count(*)::int AS decisions FROM nlhe_decisions WHERE user_id = $1 AND created_at >= now() - interval '30 days' GROUP BY date ORDER BY date`, [userId]),
    db.query<{ id: string; config: NlheConfig; cards: Combo; action: string; created_at: string }>('SELECT d.question_id AS id, s.config, q.cards, d.action, d.created_at FROM nlhe_decisions d JOIN nlhe_questions q ON q.id = d.question_id JOIN nlhe_sessions s ON s.id = q.session_id WHERE d.user_id = $1 ORDER BY d.created_at DESC, d.question_id DESC LIMIT 8', [userId]),
    db.query<{ id: string; config: NlheConfig; answered: number; completed_at: string | null }>(`SELECT s.id, s.config, s.completed_at, count(d.question_id)::int AS answered FROM nlhe_sessions s LEFT JOIN nlhe_questions q ON q.session_id = s.id LEFT JOIN nlhe_decisions d ON d.question_id = q.id WHERE s.user_id = $1 GROUP BY s.id ORDER BY s.created_at DESC LIMIT 5`, [userId]),
  ]);
  return { ...stats[0], completedSessions: counts[0].count, daily,
    recent: recent.map(row => ({ id: row.id, label: `${getHandClass(row.cards)} · ${spotLabel(row.config)}`, detail: `${row.action} · APPROXIMATED`, createdAt: new Date(row.created_at).toISOString() })),
    sessions: sessions.map(row => ({ id: row.id, label: spotLabel(row.config), answered: row.answered, complete: row.completed_at !== null })) };
}
