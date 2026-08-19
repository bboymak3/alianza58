// functions/api/serve/index.js
// GET: Sirve imágenes del bucket R2 `MEDIA` (binding name: MEDIA).
//
// MEJORAS DE SEGURIDAD vs versión anterior:
//   1. Requiere autenticación (JWT Bearer token) — antes era pública.
//   2. Devuelve Content-Type correcto basado en el objeto R2 — antes devolvía text/html.
//   3. Sanitiza la key para evitar path traversal.
//   4. Cachea con Cache-Control público de 1h (las imágenes no cambian).
//
// Uso:
//   GET /api/serve?key=properties/123/photo.jpg
//   Header: Authorization: Bearer <jwt>
//
// Respuestas:
//   200 — binario de la imagen con Content-Type correcto
//   401 — token ausente o inválido
//   404 — objeto R2 no encontrado
//   500 — error del servidor

import { getRequestUser } from '../../_lib/auth.js';

const ALLOWED_KEY_PREFIXES = [
  'properties/',
  'users/',
  'site/',
];

const EXT_TO_CONTENT_TYPE = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
};

function getContentTypeFromKey(key, fallback) {
  const ext = (key.split('.').pop() || '').toLowerCase();
  return EXT_TO_CONTENT_TYPE[ext] || fallback || 'application/octet-stream';
}

function isKeyAllowed(key) {
  if (!key || typeof key !== 'string') return false;
  // Rechazar path traversal
  if (key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  // Solo permitir rutas bajo prefixes válidos
  return ALLOWED_KEY_PREFIXES.some((p) => key.startsWith(p));
}

export async function onRequestGet(context) {
  const { request, env } = context;

  // 1. Auth requerida
  const user = await getRequestUser(request, env);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Autenticación requerida' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  // 2. Validar bucket R2
  if (!env.MEDIA) {
    return new Response(JSON.stringify({ error: 'R2 bucket no configurado' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // 3. Obtener y validar key
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!isKeyAllowed(key)) {
    return new Response(JSON.stringify({ error: 'Key inválida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    // 4. Obtener objeto de R2
    const object = await env.MEDIA.get(key);
    if (!object) {
      return new Response(JSON.stringify({ error: 'Imagen no encontrada' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 5. Determinar Content-Type correcto
    const httpMeta = object.httpMetadata || {};
    const r2ContentType = httpMeta.contentType || '';
    const finalContentType = r2ContentType || getContentTypeFromKey(key);

    // 6. Devolver binario con headers correctos
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Type', finalContentType);
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('ETag', object.httpEtag || '');
    if (object.rangeOk) headers.set('Accept-Ranges', 'bytes');

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[serve] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
