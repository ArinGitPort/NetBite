const developmentOrigins = new Set([
  'http://localhost:4174',
  'http://127.0.0.1:4174',
]);

function configuredOrigins() {
  return new Set(
    (Deno.env.get('ADMIN_ALLOWED_ORIGINS') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get('Origin');
  if (!origin) return undefined;
  if (developmentOrigins.has(origin) || configuredOrigins().has(origin)) return origin;
  return undefined;
}

export function adminCorsHeaders(request: Request) {
  const origin = allowedOrigin(request);
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export function adminJson(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...adminCorsHeaders(request), 'Content-Type': 'application/json' },
  });
}

export function adminPreflight(request: Request) {
  if (request.method !== 'OPTIONS') return undefined;
  if (request.headers.get('Origin') && !allowedOrigin(request)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: adminCorsHeaders(request) });
}

export function requestId() {
  return crypto.randomUUID();
}

export function safeAdminFailure(request: Request, id: string, message: string, status = 500) {
  return adminJson(request, { error: { code: 'ADMIN_SERVICE_ERROR', message, requestId: id } }, status);
}
