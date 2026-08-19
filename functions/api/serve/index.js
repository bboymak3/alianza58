// functions/api/serve/index.js
// GET /api/serve?key=...
// Sirve imágenes del bucket R2 MEDIA con el Content-Type correcto.
//
// NOTA DE SEGURIDAD:
//   Para que las imágenes se vean en <img> tags del HTML público, este endpoint
//   NO requiere auth. Si en el futuro se quiere restringir, agregar getRequestUser
//   y devolver 401 si no hay token. Pero esto rompería el SEO (og:image) y la
//   página de detalle de propiedad. Por ahora se mantiene público, como el original.
//
// Mejoras vs versión anterior:
//   1. Devuelve Content-Type correcto (image/jpeg, image/png, etc.) — antes text/html
//   2. Sanitiza la key para evitar path traversal
//   3. Cachea con Cache-Control público de 1h
//   4. Solo permite rutas bajo: properties/, users/, site/

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
  if (key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  return ALLOWED_KEY_PREFIXES.some((p) => key.startsWith(p));
}

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

export async function onRequestGet({ request, env }) {
  if (!env.MEDIA) {
    return new Response('R2 bucket no configurado', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!isKeyAllowed(key)) {
    return new Response('Key inválida o no permitida', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    const object = await env.MEDIA.get(key);
    if (!object) {
      return new Response('Not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const httpMeta = object.httpMetadata || {};
    const r2ContentType = httpMeta.contentType || '';
    const finalContentType = r2ContentType || getContentTypeFromKey(key);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Type', finalContentType);
    headers.set('Cache-Control', 'public, max-age=3600');
    headers.set('ETag', object.httpEtag || '');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');

    return new Response(object.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error('[serve] Error:', err);
    return new Response('Error interno', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
