// functions/propiedad/[slug].js
// GET /propiedad/:slug — Sirve la página de detalle de una propiedad.
//
// Estrategia:
//   1. Si existe un HTML estático para ese slug (propiedad/{slug}.html),
//      servirlo directamente. Esto preserva las páginas estáticas existentes.
//   2. Si NO existe, servir la plantilla genérica que carga datos via JS.

export async function onRequestGet({ request, env, params }) {
  const slug = params.slug;

  if (!slug || slug === '_plantilla' || slug === '_plantilla.html') {
    return new Response('Not found', { status: 404 });
  }

  const origin = new URL(request.url).origin;

  // 1. Intentar servir el HTML estático si existe (sin .html — Cloudflare sirve así)
  if (env.ASSETS) {
    try {
      // Cloudflare Pages sirve /propiedad/casa-moderna-urb-barinas.html cuando
      // se pide /propiedad/casa-moderna-urb-barinas (sin .html).
      // Pero desde una Function, necesitamos pedir la URL sin .html
      // y seguir redirects automáticamente con redirect: 'follow'
      const staticResp = await env.ASSETS.fetch(origin + '/propiedad/' + slug, {
        redirect: 'follow',
      });
      if (staticResp.ok && staticResp.headers.get('Content-Type')?.includes('text/html')) {
        return new Response(staticResp.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
          },
        });
      }
    } catch (e) {
      // No existe el estático, continuar
    }
  }

  // 2. Servir la plantilla genérica (pedir sin .html para evitar redirect 308)
  if (env.ASSETS) {
    try {
      const templateResp = await env.ASSETS.fetch(origin + '/propiedad/_plantilla', {
        redirect: 'follow',
      });
      if (templateResp.ok) {
        return new Response(templateResp.body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
          },
        });
      }
    } catch (e) {
      console.error('Error serving template:', e);
    }
  }

  // 3. Fallback: 404
  return new Response('Propiedad no encontrada', {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
