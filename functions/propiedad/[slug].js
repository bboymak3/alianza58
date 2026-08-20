// functions/propiedad/[slug].js
// GET /propiedad/:slug — Sirve la página de detalle de una propiedad.

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
        const body = await staticResp.text();
        // Verificar que NO sea la homepage (que tiene el title de Alianza 58)
        // y que sea un HTML de propiedad (debe tener class="gallery" o id="mainImage")
        if (ct.includes('text/html') && (body.includes('id="mainImage"') || body.includes('class="gallery"'))) {
          return new Response(body, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=60',
              'X-Source': 'static',
            },
          });
        }
      }
    } catch (e) {
      // No existe el estático, continuar
    }
  }

  // 2. Servir la plantilla genérica
  if (env.ASSETS) {
    try {
      const templateResp = await env.ASSETS.fetch(origin + '/plantilla-propiedad.html', {
        redirect: 'follow',
      });
      if (templateResp.ok) {
        const body = await templateResp.text();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
            'X-Source': 'template',
          },
        });
      }
    } catch (e) {
      console.error('Error serving template:', e);
    }
  }

  // 3. Fallback: 404
  return new Response('Propiedad no encontrada - slug: ' + slug + ', assets: ' + (env.ASSETS ? 'yes' : 'no'), {
    status: 404,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
