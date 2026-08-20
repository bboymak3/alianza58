// functions/propiedad/[slug].js
// GET /propiedad/:slug — Sirve la página de detalle de una propiedad.
//
// Estrategia:
//   1. Si existe un HTML estático para ese slug (propiedad/{slug}.html),
//      servirlo directamente. Esto preserva las páginas estáticas existentes.
//   2. Si NO existe, servir la plantilla genérica /plantilla-propiedad.html
//      que carga los datos via JS desde la API.

export async function onRequestGet({ request, env, params }) {
  const slug = params.slug;

  if (!slug) {
    return new Response('Not found', { status: 404 });
  }

  const origin = new URL(request.url).origin;

  // 1. Intentar servir el HTML estático si existe
  if (env.ASSETS) {
    try {
      const staticResp = await env.ASSETS.fetch(origin + '/propiedad/' + slug, {
        redirect: 'follow',
      });
      if (staticResp.ok) {
        const ct = staticResp.headers.get('Content-Type') || '';
        if (ct.includes('text/html')) {
          return new Response(staticResp.body, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=60',
            },
          });
        }
      }
    } catch (e) {
      // No existe el estático, continuar
    }
  }

  // 2. Servir la plantilla genérica (está en la raíz, fuera de /propiedad/)
  if (env.ASSETS) {
    try {
      const templateResp = await env.ASSETS.fetch(origin + '/plantilla-propiedad.html', {
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
