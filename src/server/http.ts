import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDatabase, type Database } from './db';
import { ApiError } from './errors';
import { configuredOrigin, requireSameOrigin } from './security';

export type Handler = (request: Request, db: Database) => Promise<Response | unknown>;
export function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(data, { status, headers });
}
export function route(handler: Handler, options: { mutation?: boolean } = {}): (request: Request) => Promise<Response> {
  return async (request) => {
    const requestId = randomUUID();
    const started = Date.now();
    let response: Response;
    try {
      // Fail closed even for authenticated reads when production origin is missing.
      configuredOrigin(request);
      if (options.mutation) requireSameOrigin(request);
      const db = await getDatabase();
      const result = await handler(request, db);
      response = result instanceof Response ? result : json(result);
    } catch (error) {
      if (error instanceof ApiError) {
        response = json({ error: error.message, code: error.code, requestId }, error.status);
        if (error.status === 429) response.headers.set('Retry-After', '900');
      } else if (error instanceof z.ZodError) {
        response = json({ error: error.issues[0]?.message ?? 'Bitte prüfe deine Eingaben.', code: 'VALIDATION_FAILED', requestId }, 400);
      } else {
        // Do not log credentials, cookies, request bodies, query parameters or database detail.
        console.error(JSON.stringify({ event: 'api.error', requestId, kind: error instanceof Error ? error.name : 'UnknownError' }));
        response = json({ error: 'Die Anfrage konnte nicht verarbeitet werden. Bitte versuche es erneut.', code: 'INTERNAL_ERROR', requestId }, 500);
      }
    }
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Request-Id', requestId);
    console.info(JSON.stringify({ event: 'api.request', requestId, method: request.method,
      path: new URL(request.url).pathname, status: response.status, durationMs: Date.now() - started }));
    return response;
  };
}

export async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const maximum = 8192;
  if (Number(request.headers.get('content-length') ?? 0) > maximum) throw new ApiError(413, 'Die Anfrage ist zu groß.', 'BODY_TOO_LARGE');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'JSON-Inhalt fehlt.', 'INVALID_JSON');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximum) { await reader.cancel(); throw new ApiError(413, 'Die Anfrage ist zu groß.', 'BODY_TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const raw = Buffer.concat(chunks).toString('utf8');
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new ApiError(400, 'Ungültiges JSON.', 'INVALID_JSON'); }
  return schema.parse(parsed);
}
