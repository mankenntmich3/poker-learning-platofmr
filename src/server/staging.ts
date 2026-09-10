import { timingSafeEqual } from 'node:crypto';
import { ApiError } from './errors';
import { sha256 } from './security';

function inviteCodes(): string[] {
  return [process.env.STAGING_INVITE_CODE, ...(process.env.STAGING_INVITE_CODES?.split(',') ?? [])]
    .filter((code): code is string => code !== undefined && code !== '');
}

export function stagingInviteRequired(): boolean {
  if (process.env.STAGING_MODE !== 'true') return false;
  const codes = inviteCodes();
  if (!codes.length || codes.some(code => code.length < 24 || code.length > 128 || code.trim() !== code)) {
    throw new ApiError(503, 'Der private Staging-Zugang ist noch nicht eingerichtet.', 'STAGING_CONFIGURATION_REQUIRED');
  }
  return true;
}
export function requireStagingInvite(code: string | undefined): void {
  if (!stagingInviteRequired()) return;
  const candidate = Buffer.from(sha256(code ?? ''), 'hex');
  // Compare every configured code so its position does not change the comparison count.
  const matches = inviteCodes().map(invite => timingSafeEqual(candidate, Buffer.from(sha256(invite), 'hex')));
  if (!matches.includes(true)) {
    throw new ApiError(403, 'Für dieses private Staging benötigst du den Einladungscode des Eigentümers.', 'INVITATION_REQUIRED');
  }
}
