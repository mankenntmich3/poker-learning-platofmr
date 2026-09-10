import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { createMemoryDatabase, type Database } from '@/server/db';
import { register, login, exportAccount } from '@/server/service';
import { stagingInviteRequired } from '@/server/staging';
let db: Database;
beforeEach(async () => { db = await createMemoryDatabase(); vi.stubEnv('STAGING_MODE', 'true'); vi.stubEnv('STAGING_INVITE_CODES', ''); });
afterEach(async () => { vi.unstubAllEnvs(); await db.close(); });
test('private staging refuses missing configuration and uninvited signup without storing the invitation', async () => {
  vi.stubEnv('STAGING_INVITE_CODE', '');
  expect(() => stagingInviteRequired()).toThrow();
  const invite = 'a-staging-test-invite-only-2026'; vi.stubEnv('STAGING_INVITE_CODE', invite);
  const account = { name: 'Staging', email: 'staging@example.test', password: 'Staging-test-password!' };
  await expect(register(db, account)).rejects.toMatchObject({ status: 403 });
  await expect(register(db, { ...account, inviteCode: 'wrong' })).rejects.toMatchObject({ status: 403 });
  expect(await db.query('SELECT id FROM study_users')).toEqual([]);
  const created = await register(db, { ...account, inviteCode: invite });
  expect((await login(db, { email: account.email, password: account.password })).user.id).toBe(created.user.id);
  expect(JSON.stringify(await exportAccount(db, created.user))).not.toContain(invite);
  vi.stubEnv('STAGING_INVITE_CODE', 'rotated-staging-invite-code-2026');
  expect((await login(db, { email: account.email, password: account.password })).user.id).toBe(created.user.id);
  await expect(register(db, { ...account, email: 'new@example.test', inviteCode: invite })).rejects.toMatchObject({ status: 403 });
});

test('each additional invitation permits signup and can be revoked without affecting login', async () => {
  vi.stubEnv('STAGING_INVITE_CODE', 'legacy-staging-invitation-2026');
  const codes = ['first-private-invitation-test-2026', 'second-private-invitation-test-2026'];
  vi.stubEnv('STAGING_INVITE_CODES', codes.join(','));
  for (const [index, inviteCode] of [...codes, process.env.STAGING_INVITE_CODE!].entries()) {
    const account = { name: 'Invited', email: `invite-${index}@example.test`, password: 'Invitation-test-password!' };
    const created = await register(db, { ...account, inviteCode });
    expect(JSON.stringify(await exportAccount(db, created.user))).not.toContain(inviteCode);
    expect((await login(db, { email: account.email, password: account.password })).user.id).toBe(created.user.id);
  }
  vi.stubEnv('STAGING_INVITE_CODES', codes[1]);
  await expect(register(db, { name: 'Revoked', email: 'revoked@example.test', password: 'Invitation-test-password!', inviteCode: codes[0] })).rejects.toMatchObject({ status: 403 });
  expect((await login(db, { email: 'invite-0@example.test', password: 'Invitation-test-password!' })).user.name).toBe('Invited');
  vi.stubEnv('STAGING_INVITE_CODE', '');
  expect(stagingInviteRequired()).toBe(true);
});

test('invalid additional codes fail closed; local signup remains independent', () => {
  vi.stubEnv('STAGING_INVITE_CODE', 'legacy-staging-invitation-2026');
  for (const invalid of ['short', 'x'.repeat(129), ' padded-staging-invitation-2026']) {
    vi.stubEnv('STAGING_INVITE_CODES', invalid);
    expect(() => stagingInviteRequired()).toThrow();
  }
  vi.stubEnv('STAGING_MODE', 'false');
  expect(stagingInviteRequired()).toBe(false);
});
