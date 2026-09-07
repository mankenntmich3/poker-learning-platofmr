import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Evaluation, StudyDashboard, StudyUser } from '@/shared/contracts';
import type { Database, SqlRow } from './db';
import { ApiError } from './errors';
import { enforceRateLimit, hashPassword, newSessionToken, SESSION_SECONDS, sha256, verifyPassword } from './security';
import { isLessonAnswerCorrect, lesson, LESSON_ID } from './lesson';
import { evaluateDecision } from '@/strategy';
import { DEVELOPMENT_DEMO, developmentAccessEnabled } from './development';

const nameSchema = z.string().trim().min(1).max(80);
const emailSchema = z.string().trim().toLowerCase().email().max(254);
const passwordSchema = z.string().min(10, 'Das Passwort muss mindestens 10 Zeichen enthalten.').max(128);
const experienceSchema = z.enum(['beginner', 'intermediate', 'advanced']);
export const registerSchema = z.object({ name: nameSchema, email: emailSchema, password: passwordSchema,
  weeklyGoal: z.number().int().min(1).max(7).optional(), experience: experienceSchema.optional() }).strict();
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
export const settingsSchema = z.object({ name: nameSchema.optional(), weeklyGoal: z.number().int().min(1).max(7).optional(), experience: experienceSchema.optional() }).strict()
  .refine((value) => Object.keys(value).length > 0, 'Mindestens eine Einstellung ist erforderlich.');
export const decisionSchema = z.object({ spotId: z.string().min(1).max(100), action: z.string().min(1).max(30), attemptId: z.string().uuid(), solutionVersion: z.string().min(1).max(100) }).strict();
export const completionSchema = z.object({ answer: z.number().int().min(0).max(2) }).strict();
export const deleteAccountSchema = z.object({ password: z.string().min(1).max(128) }).strict();
export const emptySchema = z.object({}).strict();

type UserRow = SqlRow & { id: string; name: string; email: string; password_hash: string; weekly_goal: number; experience: string; created_at: Date | string; development_only: boolean };
function iso(value: Date | string): string { return new Date(value).toISOString(); }
function toUser(row: UserRow): StudyUser {
  return { id: row.id, name: row.name, email: row.email, weeklyGoal: row.weekly_goal, experience: row.experience, createdAt: iso(row.created_at), developmentOnly: row.development_only };
}

export async function register(db: Database, input: z.infer<typeof registerSchema>): Promise<{ user: StudyUser; token: string }> {
  const data = registerSchema.parse(input);
  if (data.email === DEVELOPMENT_DEMO.email) throw new ApiError(400, 'Diese Adresse ist für das lokale Demo-Konto reserviert. Verwende den Demo-Zugang oder eine eigene E-Mail-Adresse.', 'RESERVED_ACCOUNT');
  await enforceRateLimit(db, 'register:global', 30, 3600);
  await enforceRateLimit(db, `register:${data.email}`, 5, 3600);
  const passwordHash = await hashPassword(data.password);
  const token = newSessionToken();
  const expiry = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  try {
    // User and first session commit together, so a failed session insert cannot strand an account.
    const rows = await db.query<UserRow>(
      `WITH new_user AS (
        INSERT INTO study_users (id, name, email, password_hash, weekly_goal, experience)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
      ), new_session AS (
        INSERT INTO study_sessions (token_hash, user_id, expires_at)
        SELECT $7, id, $8 FROM new_user RETURNING user_id
      ) SELECT new_user.* FROM new_user JOIN new_session ON new_user.id = new_session.user_id`,
      [randomUUID(), data.name, data.email, passwordHash, data.weeklyGoal ?? 3, data.experience ?? 'beginner', sha256(token), expiry],
    );
    return { user: toUser(rows[0]), token };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      throw new ApiError(409, 'Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melde dich an.', 'ACCOUNT_EXISTS');
    }
    throw error;
  }
}

export async function login(db: Database, input: z.infer<typeof loginSchema>): Promise<{ user: StudyUser; token: string }> {
  const data = loginSchema.parse(input);
  await enforceRateLimit(db, 'login:global', 120, 900);
  await enforceRateLimit(db, `login:${data.email}`, 12, 900);
  const rows = await db.query<UserRow>('SELECT * FROM study_users WHERE email = $1', [data.email]);
  const valid = await verifyPassword(data.password, rows[0]?.password_hash);
  if (!rows[0] || !valid || (rows[0].development_only && !developmentAccessEnabled())) throw new ApiError(401, 'E-Mail-Adresse oder Passwort ist nicht korrekt.', 'INVALID_CREDENTIALS');
  const token = newSessionToken();
  await db.query('DELETE FROM study_sessions WHERE expires_at <= now()');
  await db.query('INSERT INTO study_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [sha256(token), rows[0].id, new Date(Date.now() + SESSION_SECONDS * 1000).toISOString()]);
  return { user: toUser(rows[0]), token };
}

export async function sessionUser(db: Database, token: string | null): Promise<StudyUser | null> {
  if (!token) return null;
  const rows = await db.query<UserRow>(
    `SELECT u.* FROM study_users u JOIN study_sessions s ON s.user_id = u.id WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha256(token)],
  );
  return rows[0] && (!rows[0].development_only || developmentAccessEnabled()) ? toUser(rows[0]) : null;
}
export async function requireUser(db: Database, token: string | null): Promise<StudyUser> {
  const user = await sessionUser(db, token);
  if (!user) throw new ApiError(401, 'Bitte melde dich an.', 'AUTHENTICATION_REQUIRED');
  return user;
}
export async function logout(db: Database, token: string | null): Promise<void> {
  if (token) await db.query('DELETE FROM study_sessions WHERE token_hash = $1', [sha256(token)]);
}

export async function dashboard(db: Database, user: StudyUser): Promise<StudyDashboard> {
  const [stats, lessons, recent, daily] = await Promise.all([
    db.query<{ decisions: number; average_regret: number | null; best_decisions: number }>(
      `SELECT count(*)::integer AS decisions, avg(regret) AS average_regret,
       count(*) FILTER (WHERE regret <= 0.01)::integer AS best_decisions FROM training_decisions WHERE user_id = $1`, [user.id]),
    db.query('SELECT lesson_id FROM lesson_completions WHERE user_id = $1 AND lesson_id = $2', [user.id, LESSON_ID]),
    db.query<{ id: string; kind: string; spot_id: string | null; action: string | null; regret: number | null; created_at: Date | string }>(
      `SELECT * FROM (
         SELECT id::text, 'decision' AS kind, spot_id, action, regret, created_at FROM training_decisions WHERE user_id = $1
         UNION ALL
         SELECT 'lesson:' || lesson_id AS id, 'lesson' AS kind, NULL AS spot_id, NULL AS action,
                NULL::double precision AS regret, completed_at AS created_at FROM lesson_completions WHERE user_id = $1
       ) activity ORDER BY created_at DESC, id DESC LIMIT 8`, [user.id]),
    db.query<{ date: string; decisions: number }>(
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date, count(*)::integer AS decisions
       FROM training_decisions WHERE user_id = $1 AND created_at >= now() - interval '30 days'
       GROUP BY date ORDER BY date`, [user.id]),
  ]);
  return { user, lessonCompleted: lessons.length > 0, decisions: stats[0].decisions,
    xp: stats[0].decisions * 10 + (lessons.length > 0 ? 50 : 0), averageRegret: stats[0].average_regret,
    bestDecisions: stats[0].best_decisions,
    recent: recent.map((row) => {
      if (row.kind === 'lesson') return { id: row.id, label: 'Lektion abgeschlossen', detail: lesson.title, createdAt: iso(row.created_at) };
      const card = row.spot_id?.split(':')[1] ?? '';
      const cardLabel = ({ J: 'Bube', Q: 'Dame', K: 'König' } as Record<string, string>)[card] ?? 'Trainingsspot';
      const actionLabel = ({ check: 'Check', bet: 'Bet 1', fold: 'Fold', call: 'Call 1' } as Record<string, string>)[row.action ?? ''] ?? 'Entscheidung';
      return { id: row.id, label: `Kuhn-Poker · ${cardLabel}`, detail: `${actionLabel} · ${(row.regret ?? 0).toFixed(3)} Chips EV-Verlust`, createdAt: iso(row.created_at) };
    }), daily };
}

export async function completeLesson(db: Database, user: StudyUser, answer: number): Promise<{ correct: boolean }> {
  completionSchema.parse({ answer });
  await enforceRateLimit(db, `lesson:${user.id}`, 60, 900);
  const correct = isLessonAnswerCorrect(answer);
  if (correct) await db.query('INSERT INTO lesson_completions (user_id, lesson_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, LESSON_ID]);
  return { correct };
}

export async function recordDecision(db: Database, user: StudyUser, input: z.infer<typeof decisionSchema>): Promise<Evaluation> {
  const data = decisionSchema.parse(input);
  await enforceRateLimit(db, `decision:${user.id}`, 240, 900);
  const previous = await db.query<{ spot_id: string; action: string; evaluation: Evaluation }>(
    'SELECT spot_id, action, evaluation FROM training_decisions WHERE user_id = $1 AND attempt_id = $2', [user.id, data.attemptId]);
  if (previous[0]) {
    if (previous[0].spot_id !== data.spotId || previous[0].action !== data.action || previous[0].evaluation.solutionVersion !== data.solutionVersion) throw new ApiError(409, 'Dieser Trainingsversuch wurde bereits anders beantwortet.', 'ATTEMPT_CONFLICT');
    return previous[0].evaluation;
  }
  let evaluation: Evaluation;
  try { evaluation = await evaluateDecision(data.spotId, data.action, data.solutionVersion); }
  catch (error) {
    if (error instanceof Error && /solution version (?:changed|mismatch)/i.test(error.message)) {
      throw new ApiError(409, 'Die berechnete Strategie wurde aktualisiert. Bitte lade den Trainer neu und beginne einen neuen Versuch.', 'SOLUTION_CHANGED');
    }
    if (error instanceof Error && /unknown|invalid|illegal|not found|unbekannt|ungültig/i.test(error.message)) {
      throw new ApiError(400, 'Unbekannter Spot oder ungültige Aktion.', 'INVALID_DECISION');
    }
    throw error;
  }
  const inserted = await db.query<{ evaluation: Evaluation }>(
    `INSERT INTO training_decisions (id, user_id, attempt_id, spot_id, action, regret, evaluation)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) ON CONFLICT (user_id, attempt_id) DO NOTHING RETURNING evaluation`,
    [randomUUID(), user.id, data.attemptId, data.spotId, data.action, evaluation.regret, JSON.stringify(evaluation)]);
  if (inserted[0]) return inserted[0].evaluation;
  // A simultaneous retry may have won the unique constraint; verify its payload.
  const winner = await db.query<{ spot_id: string; action: string; evaluation: Evaluation }>(
    'SELECT spot_id, action, evaluation FROM training_decisions WHERE user_id = $1 AND attempt_id = $2', [user.id, data.attemptId]);
  if (!winner[0] || winner[0].spot_id !== data.spotId || winner[0].action !== data.action || winner[0].evaluation.solutionVersion !== data.solutionVersion) throw new ApiError(409, 'Dieser Trainingsversuch wurde bereits anders beantwortet.', 'ATTEMPT_CONFLICT');
  return winner[0].evaluation;
}

export async function updateSettings(db: Database, user: StudyUser, input: z.infer<typeof settingsSchema>): Promise<StudyUser> {
  const data = settingsSchema.parse(input);
  await enforceRateLimit(db, `settings:${user.id}`, 30, 900);
  const rows = await db.query<UserRow>(
    `UPDATE study_users SET name = COALESCE($2, name), weekly_goal = COALESCE($3, weekly_goal), experience = COALESCE($4, experience) WHERE id = $1 RETURNING *`,
    [user.id, data.name ?? null, data.weeklyGoal ?? null, data.experience ?? null]);
  if (!rows[0]) throw new ApiError(401, 'Bitte melde dich erneut an.', 'AUTHENTICATION_REQUIRED');
  return toUser(rows[0]);
}

export async function exportAccount(db: Database, user: StudyUser): Promise<Record<string, unknown>> {
  await enforceRateLimit(db, `export:${user.id}`, 6, 3600);
  const [lessons, decisions] = await Promise.all([
    db.query('SELECT lesson_id, completed_at FROM lesson_completions WHERE user_id = $1 ORDER BY completed_at', [user.id]),
    db.query('SELECT id, attempt_id, spot_id, action, regret, evaluation, created_at FROM training_decisions WHERE user_id = $1 ORDER BY created_at, id', [user.id]),
  ]);
  return { schemaVersion: 1, exportedAt: new Date().toISOString(), user, lessonCompletions: lessons, trainingDecisions: decisions };
}
export async function deleteAccount(db: Database, user: StudyUser, password: string): Promise<void> {
  deleteAccountSchema.parse({ password });
  await enforceRateLimit(db, `delete:${user.id}`, 5, 3600);
  const rows = await db.query<UserRow>('SELECT * FROM study_users WHERE id = $1', [user.id]);
  if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) throw new ApiError(401, 'Das aktuelle Passwort ist nicht korrekt.', 'INVALID_CREDENTIALS');
  // Cascading foreign keys atomically delete sessions, decisions and lesson history.
  await db.query('DELETE FROM study_users WHERE id = $1', [user.id]);
}
