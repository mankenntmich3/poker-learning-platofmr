import { randomUUID } from 'node:crypto';
import type { Database } from './db';
import { DEVELOPMENT_DEMO, requireDevelopmentDatabase } from './development';
import { hashPassword, sha256 } from './security';
import { getNlheProvider } from '@/strategy/nlhe-provider';
import { DEFAULT_NLHE } from '@/shared/nlhe';
import { answerNlhe, finishNlheSession, nextNlheQuestion, startNlheSession } from './nlhe-service';

/** Idempotent, real persisted sample decisions; existing learning progress is preserved. */
export async function seedDevelopmentAccount(db: Database): Promise<void> {
  requireDevelopmentDatabase();
  const passwordHash = await hashPassword(DEVELOPMENT_DEMO.password);
  const users = await db.query<{ id: string }>(
    `INSERT INTO study_users (id, name, email, password_hash, weekly_goal, experience, development_only)
     VALUES ($1, 'Demo Spieler', $2, $3, 3, 'beginner', true)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     WHERE study_users.development_only = true RETURNING id`,
    [randomUUID(), DEVELOPMENT_DEMO.email, passwordHash]);
  if (!users[0]) throw new Error('Die Demo-Adresse gehört zu einem persönlichen Konto. Dieses Konto wird nicht überschrieben.');
  const existing = await db.query('SELECT id FROM nlhe_sessions WHERE user_id = $1 AND client_id = $2 AND completed_at IS NOT NULL', [users[0].id, 'de000000-0000-4000-8000-000000000100']);
  if (!existing.length) {
    const range = await (await getNlheProvider()).getRangeStrategy(DEFAULT_NLHE);
    let session = await startNlheSession(db, users[0].id, { config: DEFAULT_NLHE, solutionVersion: range.provenance.solutionVersion, clientId: 'de000000-0000-4000-8000-000000000100' });
    await db.query('UPDATE nlhe_sessions SET is_sample = true WHERE id = $1', [session.id]);
    while (session.answered < 3) {
      const combo = range.combos.find(c => c.cards.join('') === session.question.cards.join(''))!;
      const action = [...combo.actions].sort((a, b) => b.frequency - a.frequency)[0].action;
      await answerNlhe(db, users[0].id, { sessionId: session.id, questionId: session.question.id, action });
      await db.query('UPDATE nlhe_decisions SET created_at = $2 WHERE question_id = $1', [session.question.id, new Date(Date.now() - (3 - session.answered) * 86400000).toISOString()]);
      if (session.answered === 2) break;
      session = await nextNlheQuestion(db, users[0].id, session.id);
    }
    await finishNlheSession(db, users[0].id, session.id);
  }
  await db.query('UPDATE nlhe_sessions SET is_sample = true WHERE user_id = $1 AND client_id = $2', [users[0].id, 'de000000-0000-4000-8000-000000000100']);
  // Re-seeding recovers demo login after mistyped passwords without resetting study records.
  await db.query('DELETE FROM request_limits WHERE key = $1', [sha256(`login:${DEVELOPMENT_DEMO.email}`)]);
}
