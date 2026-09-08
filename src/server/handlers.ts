import { getSolutionSummary, getTrainingSpots } from '@/strategy';
import { body, json, route } from './http';
import { lesson } from './lesson';
import { readSessionToken, sessionCookie } from './security';
import {
  completeLesson, completionSchema, dashboard, decisionSchema, deleteAccount, deleteAccountSchema,
  emptySchema, exportAccount, login, loginSchema, logout, recordDecision, register, registerSchema,
  requireUser, sessionUser, settingsSchema, updateSettings,
} from './service';

export const sessionGet = route(async (request, db) => ({ user: await sessionUser(db, readSessionToken(request)) }));
export const registerPost = route(async (request, db) => {
  const result = await register(db, await body(request, registerSchema));
  await logout(db, readSessionToken(request));
  return json({ user: result.user }, 201, { 'Set-Cookie': sessionCookie(result.token) });
}, { mutation: true });
export const loginPost = route(async (request, db) => {
  const result = await login(db, await body(request, loginSchema));
  await logout(db, readSessionToken(request));
  return json({ user: result.user }, 200, { 'Set-Cookie': sessionCookie(result.token) });
}, { mutation: true });
export const logoutPost = route(async (request, db) => {
  await body(request, emptySchema);
  await logout(db, readSessionToken(request));
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', true) });
}, { mutation: true });
export const dashboardGet = route(async (request, db) => dashboard(db, await requireUser(db, readSessionToken(request))));
export const lessonGet = route(async (request, db) => {
  await requireUser(db, readSessionToken(request));
  return lesson;
});
export const lessonCompletePost = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  return completeLesson(db, user, (await body(request, completionSchema)).answer);
}, { mutation: true });
export const trainerGet = route(async (request, db) => {
  await requireUser(db, readSessionToken(request));
  return { spots: await getTrainingSpots() };
});
export const decisionPost = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  return recordDecision(db, user, await body(request, decisionSchema));
}, { mutation: true });
export const solutionGet = route(async (request, db) => {
  await requireUser(db, readSessionToken(request));
  return getSolutionSummary();
});
export const settingsPatch = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  return { user: await updateSettings(db, user, await body(request, settingsSchema)) };
}, { mutation: true });
export const accountExportGet = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  return json(await exportAccount(db, user), 200, { 'Content-Disposition': 'attachment; filename="rangeform-account.json"' });
});
export const accountDelete = route(async (request, db) => {
  const user = await requireUser(db, readSessionToken(request));
  await deleteAccount(db, user, (await body(request, deleteAccountSchema)).password);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', true) });
}, { mutation: true });
export const healthGet = route(async (_request, db) => {
  await db.query('SELECT 1 AS ready');
  const solution = await getSolutionSummary();
  return { status: 'ok', database: { status: 'ready', engine: process.env.DATABASE_URL ? 'postgresql' : 'pglite', durable: true },
    strategy: { status: 'ready', storage: 'versioned-local-artifact', version: solution.version, cloudCompute: 'disabled' },
    queue: { status: 'inactive', reason: 'The MVP does not enqueue background jobs.' },
    worker: { status: 'inactive', reason: 'Strategies are generated offline; no worker is running.' } };
});
