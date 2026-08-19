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
//   2. Si el objeto R2 no tiene httpMetadata.contentType, sniff por magic bytes
//   3. Sanitiza la key para evitar path traversal
//   4. Cachea con Cache-Control público de 1h
//   5. Solo permite rutas bajo: properties/, users/, site/

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

// Sniffar magic bytes para determinar el tipo de imagen real
function sniffContentType(buffer) {
  if (buffer.byteLength < 4) return null;
  const bytes = new Uint8Array(buffer.slice(0, 16));
  
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png';
  }
  // GIF: 47 49 46 38 (GIF8)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return 'image/gif';
  }
  // WebP: RIFF....WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp';
  }
  // BMP: 42 4D
  if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
    return 'image/bmp';
  }
  // SVG (busca "<svg" o "<?xml")
  try {
    const head = new TextDecoder().decode(buffer.slice(0, 256)).toLowerCase();
    if (head.includes('<svg') || head.includes('<?xml')) {
      return 'image/svg+xml';
    }
  } catch (e) {}
  
  return null;
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

    // Leer el body completo a ArrayBuffer para poder sniffar magic bytes si es necesario
    const buffer = await object.arrayBuffer();
    const httpMeta = object.httpMetadata || {};
    let r2ContentType = httpMeta.contentType || '';
    
    // Si R2 no tiene contentType, sniffar magic bytes
    if (!r2ContentType) {
      const sniffed = sniffContentType(buffer);
      if (sniffed) {
        r2ContentType = sniffed;
      } else {
        // Último recurso: usar la extensión de la key
        r2ContentType = getContentTypeFromKey(key);
      }
    }
    
    // Construir headers manualmente — NO usar writeHttpMetadata porque puede
    // sobreescribir el Content-Type con el valor (vacío) del objeto R2.
    const headers = new Headers();
    headers.set('Content-Type', r2ContentType);
    headers.set('Cache-Control', 'public, max-age=3600');
    if (object.httpEtag) {
      headers.set('ETag', object.httpEtag);
    }
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Accept-Ranges', 'bytes');
    
    return new Response(buffer, {
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
