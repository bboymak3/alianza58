// functions/propiedad/[slug].js
// GET /propiedad/:slug — Sirve la página de detalle de una propiedad.
//
// Estrategia:
//   1. Si existe un HTML estático para ese slug (propiedad/{slug}.html),
//      servirlo directamente. Esto preserva las páginas estáticas existentes.
//   2. Si NO existe, servir la plantilla genérica _plantilla.html que
//      carga los datos via JS desde la API.

export async function onRequestGet({ request, env, params }) {
  const slug = params.slug;

  if (!slug || slug === '_plantilla') {
    // Si es la plantilla misma, devolver 404
    return new Response('Not found', { status: 404 });
  }

  // 1. Intentar servir el HTML estático si existe
  if (env.ASSETS) {
    try {
      const staticUrl = new URL(request.url);
      staticUrl.pathname = '/propiedad/' + slug + '.html';
      const staticResp = await env.ASSETS.fetch(staticUrl.toString());
      if (staticResp.ok) {
        // El HTML estático existe — servirlo tal cual
        return staticResp;
      }
    } catch (e) {
      // No existe el estático, continuar
    }
  }

  // 2. Servir la plantilla genérica
  if (env.ASSETS) {
    try {
      const templateUrl = new URL(request.url);
      templateUrl.pathname = '/propiedad/_plantilla.html';
      const templateResp = await env.ASSETS.fetch(templateUrl.toString());
      if (templateResp.ok) {
        // Devolver la plantilla — el JS dentro leerá el slug de window.location
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
