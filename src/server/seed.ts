import { randomUUID } from 'node:crypto';
import type { Database } from './db';
import { DEVELOPMENT_DEMO, requireDevelopmentDatabase } from './development';
import { hashPassword, sha256 } from './security';
import { evaluateDecision, getTrainingSpots } from '@/strategy';

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
  const spots = (await getTrainingSpots()).slice(0, 3);
  for (const [index, spot] of spots.entries()) {
    const attemptId = `de000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const action = spot.actions[index % spot.actions.length].id;
    const evaluation = await evaluateDecision(spot.id, action, spot.solutionVersion);
    const created = new Date(Date.now() - (3 - index) * 86_400_000).toISOString();
    await db.query(`INSERT INTO training_decisions (id, user_id, attempt_id, spot_id, action, regret, evaluation, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8) ON CONFLICT (user_id, attempt_id) DO NOTHING`,
    [randomUUID(), users[0].id, attemptId, spot.id, action, evaluation.regret, JSON.stringify(evaluation), created]);
  }
  // Re-seeding recovers demo login after mistyped passwords without resetting study records.
  await db.query('DELETE FROM request_limits WHERE key = $1', [sha256(`login:${DEVELOPMENT_DEMO.email}`)]);
}
