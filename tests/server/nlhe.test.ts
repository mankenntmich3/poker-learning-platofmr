import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createMemoryDatabase, type Database } from '@/server/db';
import { register, login, exportAccount, deleteAccount } from '@/server/service';
import { answerNlhe, finishNlheSession, getNlheSession, nextNlheQuestion, nlheProgress, startNlheSession } from '@/server/nlhe-service';
import { getNlheProvider } from '@/strategy/nlhe-provider';
import { DEFAULT_NLHE, POSTFLOP_CONFIG, type NlheConfig } from '@/shared/nlhe';
let db: Database; let userId: string;
const password = 'NLHE-test-password-2026!'; const email = () => `${randomUUID()}@example.test`;
beforeEach(async () => { db = await createMemoryDatabase(); userId = (await register(db, { name: 'NLHE Test', email: email(), password })).user.id; });
afterEach(async () => db.close());
async function start(config: NlheConfig = DEFAULT_NLHE, clientId = randomUUID()) {
  const range = await (await getNlheProvider()).getNode(config);
  return startNlheSession(db, userId, { config, clientId, solutionVersion: range.provenance.solutionVersion });
}
describe('durable NLHE learning sessions', () => {
  test('uses the exact chosen spot and samples real combinations without disclosing feedback', async () => {
    const config: NlheConfig = { ...DEFAULT_NLHE, stackBb: 40, hero: 'HJ', villain: 'UTG', scenario: 'vs-open' };
    const session = await start(config); expect(session.spot.config).toEqual(config); expect(session.question.cards).toHaveLength(2);
    expect(session.feedback).toBeNull(); expect(session.spot).not.toHaveProperty('classes'); expect(session.spot).not.toHaveProperty('combos');
    const expected = await (await getNlheProvider()).getComboStrategy(config, session.question.cards);
    const action = session.spot.actions[0].id;
    const result = await answerNlhe(db, userId, { sessionId: session.id, questionId: session.question.id, action });
    expect(result.actions).toEqual(expected.actions); expect(result.regret).toBeNull(); expect(result.provenance.sourceType).toBe('APPROXIMATED');
    expect((await nlheProgress(db, userId)).decisions).toBe(1);
  });
  test('idempotent start/answers survive reload, reject conflicting actions and finish at ten', async () => {
    const clientId = randomUUID(); let session = await start(DEFAULT_NLHE, clientId);
    expect((await start(DEFAULT_NLHE, clientId)).id).toBe(session.id);
    expect((await start(DEFAULT_NLHE, clientId)).question.id).toBe(session.question.id);
    for (let index = 0; index < 10; index++) {
      const input = { sessionId: session.id, questionId: session.question.id, action: session.spot.actions[0].id };
      const results = await Promise.all([answerNlhe(db, userId, input), answerNlhe(db, userId, input)]); expect(results[0]).toEqual(results[1]);
      await expect(answerNlhe(db, userId, { ...input, action: session.spot.actions[1].id })).rejects.toMatchObject({ code: 'ATTEMPT_CONFLICT' });
      expect((await getNlheSession(db, userId, session.id)).feedback).toEqual(results[0]);
      session = await nextNlheQuestion(db, userId, session.id);
    }
    expect(session.complete).toBe(true); expect(session.answered).toBe(10); expect((await nlheProgress(db, userId)).completedSessions).toBe(1);
    expect((await nextNlheQuestion(db, userId, session.id)).answered).toBe(10);
  });
  test('protects session ownership, version, supplied fields and early completion', async () => {
    const session = await start(); const stranger = (await register(db, { name: 'Other', email: email(), password })).user.id;
    await expect(getNlheSession(db, stranger, session.id)).rejects.toMatchObject({ status: 404 });
    await expect(answerNlhe(db, stranger, { sessionId: session.id, questionId: session.question.id, action: 'fold' })).rejects.toMatchObject({ status: 404 });
    await expect(finishNlheSession(db, userId, session.id)).rejects.toMatchObject({ code: 'NO_DECISION' });
    await expect(answerNlhe(db, userId, { sessionId: session.id, questionId: randomUUID(), action: 'fold' })).rejects.toMatchObject({ status: 404 });
    await expect(startNlheSession(db, userId, { config: DEFAULT_NLHE, clientId: randomUUID(), solutionVersion: 'invented' })).rejects.toMatchObject({ code: 'SOLUTION_CHANGED' });
    await expect(answerNlhe(db, userId, { sessionId: session.id, questionId: session.question.id, action: 'check' })).rejects.toMatchObject({ status: 400 });
    await answerNlhe(db, userId, { sessionId: session.id, questionId: session.question.id, action: 'fold' });
    expect((await finishNlheSession(db, userId, session.id)).complete).toBe(true);
    expect((await nlheProgress(db, stranger)).decisions).toBe(0);
  });
  test('postflop displays an opponent range with board and hero removal, then saves the answer', async () => {
    const session = await start(POSTFLOP_CONFIG); expect(session.spot.config.scenario).toBe('flop-srp');
    expect(session.question.cards.some(c => session.spot.board.includes(c))).toBe(false);
    expect(session.question.villainRange!.length).toBeGreaterThan(10);
    expect(session.question.villainRange!.reduce((n, r) => n + r.combos, 0)).toBeLessThan(1081);
    const answer = await answerNlhe(db, userId, { sessionId: session.id, questionId: session.question.id, action: 'check' });
    expect(answer.regret).toBeNull(); expect((await nlheProgress(db, userId)).postflop).toBe(1);
  });
  test('progress belongs to the account across logins, is exported, and cascades on deletion', async () => {
    const accountEmail = email(); const created = await register(db, { name: 'Persistent', email: accountEmail, password }); userId = created.user.id;
    const session = await start(); await answerNlhe(db, userId, { sessionId: session.id, questionId: session.question.id, action: 'fold' });
    await finishNlheSession(db, userId, session.id);
    const returning = await login(db, { email: accountEmail, password }); expect((await nlheProgress(db, returning.user.id)).decisions).toBe(1);
    const exported = await exportAccount(db, returning.user); expect(exported.nlheSessions).toHaveLength(1); expect(exported.nlheDecisions).toHaveLength(1);
    await deleteAccount(db, returning.user, password); expect(await db.query('SELECT * FROM nlhe_questions WHERE session_id = $1', [session.id])).toEqual([]);
  });
  test('existing sessions use their immutable snapshot even when the current library is unavailable', async () => {
    const session = await start(); const provider = await getNlheProvider();
    const spy = vi.spyOn(provider, 'getRangeStrategy').mockRejectedValue(new Error('new library unavailable'));
    try {
      await answerNlhe(db, userId, { sessionId: session.id, questionId: session.question.id, action: 'fold' });
      const resumed = await nextNlheQuestion(db, userId, session.id);
      expect(resumed.spot.provenance.solutionVersion).toBe(session.spot.provenance.solutionVersion);
      expect(resumed.answered).toBe(1); expect(resumed.question.ordinal).toBe(2);
    } finally { spy.mockRestore(); }
  });
});
