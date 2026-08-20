// functions/sitemap.xml/index.js
// GET /sitemap.xml — Genera un sitemap XML dinámico.
//
// Incluye:
//   1. Páginas estáticas (index, propiedades, contacto, etc.)
//   2. Páginas de propiedad dinámicas (una URL por cada propiedad aprobada)
//   3. Páginas de estado (una por cada estado con propiedades)
//   4. Imágenes de cada propiedad (para Google Images)
//
// Se actualiza automáticamente cuando se crea/edita/borra una propiedad
// porque lee directamente de la base de datos en cada request.

const BASE_URL = 'https://alianza58.pages.dev';

// Páginas estáticas del sitio
const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/propiedades.html', priority: '0.9', changefreq: 'daily' },
  { path: '/contacto.html', priority: '0.7', changefreq: 'monthly' },
  { path: '/nosotros.html', priority: '0.6', changefreq: 'monthly' },
  { path: '/servicios.html', priority: '0.6', changefreq: 'monthly' },
  { path: '/servicios/venta.html', priority: '0.6', changefreq: 'monthly' },
  { path: '/servicios/alquiler.html', priority: '0.6', changefreq: 'monthly' },
  { path: '/servicios/tasacion.html', priority: '0.6', changefreq: 'monthly' },
  { path: '/terminos.html', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacidad.html', priority: '0.3', changefreq: 'yearly' },
];

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function onRequestGet({ env }) {
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  // 1. Páginas estáticas
  for (const page of STATIC_PAGES) {
    xml += '  <url>\n';
    xml += `    <loc>${BASE_URL}${page.path}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += '  </url>\n';
  }

  // 2. Páginas de propiedad dinámicas + imágenes
  if (env.DB) {
    try {
      // Obtener todas las propiedades aprobadas
      const props = await env.DB.prepare(
        `SELECT p.id, p.slug, p.title, p.updated_at, p.state_slug,
                (SELECT url FROM property_images WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
                (SELECT GROUP_CONCAT(url, '||') FROM property_images WHERE property_id = p.id AND url NOT LIKE '%default-property%' LIMIT 10) as all_images
         FROM properties p
         WHERE p.status = 'approved'
         ORDER BY p.updated_at DESC`
      ).all();

      // Set de estados ya incluidos (para evitar duplicados)
      const includedStates = new Set();

      for (const prop of (props.results || [])) {
        const propUrl = `${BASE_URL}/propiedad/${prop.slug}`;
        const lastmod = prop.updated_at ? prop.updated_at.split(' ')[0] : today;

        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(propUrl)}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';

        // Imagen de portada
        if (prop.cover_image && !prop.cover_image.includes('default-property')) {
          const imgUrl = prop.cover_image.startsWith('http') ? prop.cover_image : BASE_URL + prop.cover_image;
          xml += '    <image:image>\n';
          xml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(prop.title)}</image:title>\n`;
          xml += '    </image:image>\n';
        }

        // Otras imágenes (hasta 10)
        if (prop.all_images) {
          const images = prop.all_images.split('||');
          for (const imgUrl of images) {
            if (imgUrl && !imgUrl.includes('default-property')) {
              const fullUrl = imgUrl.startsWith('http') ? imgUrl : BASE_URL + imgUrl;
              xml += '    <image:image>\n';
              xml += `      <image:loc>${escapeXml(fullUrl)}</image:loc>\n`;
              xml += `      <image:title>${escapeXml(prop.title)}</image:title>\n`;
              xml += '    </image:image>\n';
            }
          }
        }

        xml += '  </url>\n';

        // Página de estado (una por estado, no duplicar)
        if (prop.state_slug && !includedStates.has(prop.state_slug)) {
          includedStates.add(prop.state_slug);
          xml += '  <url>\n';
          xml += `    <loc>${BASE_URL}/estado/${prop.state_slug}.html</loc>\n`;
          xml += `    <lastmod>${today}</lastmod>\n`;
          xml += '    <changefreq>weekly</changefreq>\n';
          xml += '    <priority>0.5</priority>\n';
          xml += '  </url>\n';
        }
      }
    } catch (e) {
      console.error('Error generating sitemap from DB:', e);
    }
  }

  xml += '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
