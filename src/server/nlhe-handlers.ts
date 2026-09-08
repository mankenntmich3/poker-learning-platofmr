import { z } from 'zod';
import { getNlheProvider } from '@/strategy/nlhe-provider';
import { configFromSearch } from '@/shared/nlhe';
import { route, body } from './http';
import { requireUser } from './service';
import { readSessionToken, enforceRateLimit } from './security';
import { ApiError } from './errors';
import { answerNlhe, finishNlheSession, getNlheSession, nextNlheQuestion, nlheDecisionSchema, nlheProgress, sessionIdSchema, startNlheSchema, startNlheSession } from './nlhe-service';

export const nlheRangeGet = route(async (request, db) => {
  await requireUser(db, readSessionToken(request));
  let config;
  try { config = configFromSearch(new URL(request.url).searchParams); }
  catch { throw new ApiError(400, 'Wähle einen gültigen Stack und eine passende Positionsfolge.', 'INVALID_SPOT'); }
  return (await getNlheProvider()).getNode(config);
});
export const nlheStartPost = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  await enforceRateLimit(db, `nlhe-start:${user.id}`, 60, 900);
  return startNlheSession(db, user.id, await body(request, startNlheSchema));
}, { mutation: true });
export const nlheSessionGet = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  return getNlheSession(db, user.id, sessionIdSchema.parse(new URL(request.url).searchParams.get('id')));
});
const commandSchema = z.object({ id: sessionIdSchema, command: z.enum(['next', 'finish']) }).strict();
export const nlheSessionPost = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  await enforceRateLimit(db, `nlhe-command:${user.id}`, 240, 900);
  const input = await body(request, commandSchema);
  return input.command === 'next' ? nextNlheQuestion(db, user.id, input.id) : finishNlheSession(db, user.id, input.id);
}, { mutation: true });
export const nlheDecisionPost = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  await enforceRateLimit(db, `nlhe-decision:${user.id}`, 240, 900);
  const input = await body(request, nlheDecisionSchema);
  await answerNlhe(db, user.id, input);
  return getNlheSession(db, user.id, input.sessionId);
}, { mutation: true });
export const nlheProgressGet = route(async (request, db) => nlheProgress(db, (await requireUser(db, readSessionToken(request))).id));
