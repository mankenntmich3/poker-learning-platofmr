import { spawn } from 'node:child_process';

// Only hosting settings, never load .env.local or generate a demo account here.
const appOrigin = process.env.APP_ORIGIN || (process.env.RENDER === 'true' ? process.env.RENDER_EXTERNAL_URL : undefined);
let validOrigin = false;
try { const url = new URL(appOrigin); validOrigin = url.protocol === 'https:' && url.origin === appOrigin.replace(/\/$/, '') && !url.username && !url.password; } catch { /* Fail closed below. */ }
if (!process.env.DATABASE_URL || !validOrigin || process.env.ALLOW_LOCAL_DB) {
  console.error('Hosted startup requires DATABASE_URL and an HTTPS APP_ORIGIN; ALLOW_LOCAL_DB must be unset.');
  process.exit(1);
}
if (process.env.STAGING_MODE === 'true' && (process.env.STAGING_INVITE_CODE?.length ?? 0) < 24) {
  console.error('Private staging requires a secret STAGING_INVITE_CODE of at least 24 characters.');
  process.exit(1);
}
const port = process.env.PORT ?? '3000';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid PORT');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '0.0.0.0', '--port', port], { stdio: 'inherit', env: { ...process.env, APP_ORIGIN: appOrigin, NODE_ENV: 'production' } });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => child.kill(signal));
child.on('error', () => { console.error('Hosted server could not start.'); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
