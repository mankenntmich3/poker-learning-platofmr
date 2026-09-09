/** Host liveness probe: do not wake a sleeping managed database every few seconds. */
export function GET() { return Response.json({ status: 'alive' }, { headers: { 'Cache-Control': 'no-store' } }); }
