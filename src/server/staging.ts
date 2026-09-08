import { timingSafeEqual } from 'node:crypto';
import { ApiError } from './errors';
import { sha256 } from './security';

export function stagingInviteRequired(): boolean {
  if (process.env.STAGING_MODE !== 'true') return false;
  if (!process.env.STAGING_INVITE_CODE || process.env.STAGING_INVITE_CODE.length < 24) {
    throw new ApiError(503, 'Der private Staging-Zugang ist noch nicht eingerichtet.', 'STAGING_CONFIGURATION_REQUIRED');
  }
  return true;
}
export function requireStagingInvite(code: string | undefined): void {
  if (!stagingInviteRequired()) return;
  if (!timingSafeEqual(Buffer.from(sha256(code ?? ''), 'hex'), Buffer.from(sha256(process.env.STAGING_INVITE_CODE!), 'hex'))) {
    throw new ApiError(403, 'Für dieses private Staging benötigst du den Einladungscode des Eigentümers.', 'INVITATION_REQUIRED');
  }
}
