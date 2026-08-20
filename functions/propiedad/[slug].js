// functions/propiedad/[slug].js
// GET /propiedad/:slug — Sirve la página de detalle de una propiedad.
//
// Si existe un archivo HTML estático para ese slug (ej: /propiedad/casa-moderna-urb-barinas.html),
// Cloudflare lo sirve automáticamente y esta Function NO se ejecuta.
//
// Pero si NO existe (propiedad nueva creada desde el admin), esta Function
// genera una plantilla HTML genérica que:
//   1. Carga el CSS y JS del sitio
//   2. Carga property-enhancer.js que hace fetch a /api/properties/{slug}
//   3. Rellena dinámicamente todos los datos (título, precio, imágenes, etc.)

const BASE_URL = 'https://alianza58.pages.dev';

export async function onRequestGet(context) {
  const { params, env } = context;
  const slug = params.slug;

  if (!slug) {
    return new Response('Slug requerido', { status: 400 });
  }

  // Intentar obtener la propiedad de la BD para pre-renderizar meta tags (SEO)
  let property = null;
  if (env.DB) {
    try {
      property = await env.DB.prepare(
        `SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.whatsapp as owner_whatsapp
         FROM properties p LEFT JOIN users u ON p.user_id = u.id
         WHERE p.slug = ? AND p.status = 'approved'`
      ).bind(slug).first();
    } catch (e) {
      console.warn('Error fetching property:', e);
    }
  }

  // Si la propiedad no existe o no está aprobada, devolver 404
  if (!property) {
    return new Response(generateNotFoundHTML(slug), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  // Obtener imágenes de la propiedad
  let images = [];
  if (env.DB) {
    try {
      const imgs = await env.DB.prepare(
        'SELECT id, url, r2_key, is_cover, sort_order FROM property_images WHERE property_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC'
      ).bind(property.id).all();
      images = imgs.results || [];
    } catch (e) {}
  }

  const coverImage = images.find(i => i.is_cover === 1) || images[0];
  const coverUrl = coverImage?.url || '/images/default-property.jpg';
  const fullCoverUrl = coverUrl.startsWith('http') ? coverUrl : BASE_URL + coverUrl;

  // Generar HTML
  const html = generatePropertyHTML(property, images, fullCoverUrl);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(price, currency) {
  if (!price) return 'Consultar';
  const formatted = Number(price).toLocaleString('es-VE');
  return currency === 'USD' ? `$${formatted}` : `${formatted} ${currency || ''}`;
}

function generatePropertyHTML(p, images, coverUrl) {
  const title = escapeHtml(p.title);
  const description = escapeHtml(p.description || '');
  const price = formatPrice(p.price, p.currency);
  const propertyType = escapeHtml(p.property_type || '');
  const operationType = escapeHtml(p.operation_type || '');
  const city = escapeHtml(p.city || '');
  const state = escapeHtml(p.state || '');
  const address = escapeHtml(p.address || '');
  const bedrooms = p.bedrooms || 0;
  const bathrooms = p.bathrooms || 0;
  const parking = p.parking_spaces || 0;
  const area = p.area || 0;
  const slug = escapeHtml(p.slug);

  const imageList = images.map(i => {
    const url = i.url.startsWith('http') ? i.url : BASE_URL + i.url;
    return `"${url}"`;
  }).join(',');

  const canonicalUrl = `${BASE_URL}/propiedad/${p.slug}`;
  const ownerName = escapeHtml(p.owner_name || 'Alianza 58');
  const ownerPhone = escapeHtml(p.owner_phone || '04126942043');
  const ownerWhatsapp = escapeHtml(p.owner_whatsapp || '584126942043');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Alianza 58</title>
  <meta name="description" content="${description.substring(0, 160)}">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="icon" href="/images/favicon.png" type="image/png">

  <!-- Open Graph -->
  <meta property="og:title" content="${title} - Alianza 58">
  <meta property="og:description" content="${description.substring(0, 200)}">
  <meta property="og:image" content="${coverUrl}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="Alianza 58 Bienes Raíces C.A.">
  <meta property="og:type" content="website">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description.substring(0, 200)}">
  <meta name="twitter:image" content="${coverUrl}">

  <!-- JSON-LD: RealEstateListing -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": "${title}",
    "description": ${JSON.stringify(p.description || '')},
    "url": "${canonicalUrl}",
    "image": [${images.map(i => `"${i.url.startsWith('http') ? i.url : BASE_URL + i.url}"`).join(',')}],
    "offers": {
      "@type": "Offer",
      "price": "${p.price || 0}",
      "priceCurrency": "${p.currency || 'USD'}"
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "${city}",
      "addressRegion": "${state}",
      "addressCountry": "VE"
    }
  }
  </script>

  <!-- Styles -->
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
</head>
<body>

  <!-- ============ HEADER / NAV ============ -->
  <header id="mainHeader">
    <nav class="navbar">
      <a href="/index.html" class="logo" aria-label="Alianza 58 Inicio">
        <img src="/images/arriendo-alquiler-venta-de-propiedades-fincas-inmuebles-negocios-en-barinas-alianza58.jpg" alt="Alianza 58 Bienes Raíces" class="logo-img">
      </a>
      <button class="hamburger" id="hamburger" aria-label="Menú">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links" id="navLinks">
        <li><a href="/index.html">Inicio</a></li>
        <li><a href="/propiedades.html">Propiedades</a></li>
        <li class="dropdown">
          <a href="/servicios.html">Servicios <i class="fa-solid fa-chevron-down"></i></a>
        </li>
        <li><a href="/nosotros.html">Nosotros</a></li>
        <li><a href="/contacto.html">Contacto</a></li>
      </ul>
      <div class="nav-actions">
        <a href="https://wa.me/${ownerWhatsapp}" class="btn-whatsapp" target="_blank">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp
        </a>
      </div>
    </nav>
  </header>

  <!-- ============ PROPERTY DETAIL ============ -->
  <section class="section prop-detail-section">
    <div class="container">

      <!-- Breadcrumb -->
      <div class="breadcrumb">
        <a href="/index.html">Inicio</a><span>›</span>
        <a href="/propiedades.html">Propiedades</a><span>›</span>
        <a href="/estado/${(p.state_slug || 'barinas').toLowerCase()}.html">${state}</a><span>›</span>
        <span>${title}</span>
      </div>

      <!-- Gallery -->
      <div class="gallery" id="gallery">
        <div class="gallery-main-wrap">
          <img class="gallery-main" id="mainImage" src="${coverUrl}" alt="${title}" onclick="openLightbox()" />
          <button class="gallery-nav prev" onclick="galleryNav(-1)" aria-label="Anterior">‹</button>
          <button class="gallery-nav next" onclick="galleryNav(1)" aria-label="Siguiente">›</button>
          <span class="gallery-counter" id="galleryCounter">1 / ${images.length || 1}</span>
        </div>
        <div class="gallery-thumbs" id="galleryThumbs"></div>
      </div>

      <!-- Lightbox Modal -->
      <div id="lightbox" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;align-items:center;justify-content:center;" onclick="closeLightbox()">
        <button style="position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:2rem;cursor:pointer;z-index:10;" onclick="closeLightbox()">&times;</button>
        <button class="gallery-nav prev" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);opacity:1;width:50px;height:50px;font-size:1.6rem;" onclick="event.stopPropagation();lightboxNav(-1)" aria-label="Anterior">‹</button>
        <button class="gallery-nav next" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);opacity:1;width:50px;height:50px;font-size:1.6rem;" onclick="event.stopPropagation();lightboxNav(1)" aria-label="Siguiente">›</button>
        <img id="lightboxImg" style="max-width:92vw;max-height:88vh;object-fit:contain;border-radius:8px;" onclick="event.stopPropagation();" />
        <div id="lightboxCounter" style="position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#fff;font-size:.9rem;background:rgba(0,0,0,.5);padding:6px 16px;border-radius:20px;"></div>
      </div>

      <div class="prop-detail-layout">
        <!-- Main column -->
        <div>
          <div class="card">
            <div class="price-section">
              <span class="op-badge">${operationType === 'venta' ? 'En Venta' : operationType === 'arrendamiento' ? 'En Alquiler' : operationType}</span>
              <span class="type-badge">🏠 ${propertyType}</span>
              <h1 style="font-size:1.5rem;margin:12px 0 8px">${title}</h1>
              <div class="price">${price}</div>
              <div style="color:#888;font-size:.9rem;margin-top:4px">📍 ${city}, ${state}${address ? ' — ' + address : ''}</div>
            </div>
          </div>

          <!-- Specs -->
          <div class="card">
            <div class="specs">
              <div class="spec"><div class="value">${bedrooms}</div><div class="label">Habitaciones</div></div>
              <div class="spec"><div class="value">${bathrooms}</div><div class="label">Baños</div></div>
              <div class="spec"><div class="value">${area > 0 ? area + ' m²' : '--'}</div><div class="label">Área</div></div>
              <div class="spec"><div class="value">${parking}</div><div class="label">Estacionamientos</div></div>
            </div>
          </div>

          ${p.youtube_url ? `
          <!-- Video -->
          <div class="card">
            <h2>Video</h2>
            <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;">
              <iframe src="https://www.youtube.com/embed/${escapeHtml(p.youtube_url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|embed\/)([^&\?]+)/)?.[2] || '')}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
            </div>
          </div>
          ` : ''}

          <!-- Description -->
          <div class="card">
            <h2>Descripción</h2>
            <div class="description">${description.replace(/\n/g, '<br>')}</div>
          </div>

          ${p.features ? `
          <!-- Features -->
          <div class="card">
            <h2>Características</h2>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
              ${(() => {
                try {
                  const feats = JSON.parse(p.features);
                  if (!Array.isArray(feats) || feats.length === 0) return '';
                  return feats.map(f => `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#f9f9f9;border-radius:6px;"><i class="fa-solid fa-check" style="color:#27ae60;"></i> ${escapeHtml(f)}</div>`).join('');
                } catch(e) { return ''; }
              })()}
            </div>
          </div>
          ` : ''}

          <!-- Map -->
          <div class="card">
            <h2>📍 Ubicación</h2>
            <div id="map" style="height:400px;border-radius:8px;overflow:hidden;"></div>
          </div>
        </div>

        <!-- Sidebar -->
        <aside>
          <div class="card" style="position:sticky;top:20px;">
            <h2>Contactar</h2>
            <div style="text-align:center;margin-bottom:16px;">
              <img src="/images/arriendo-alquiler-venta-de-propiedades-fincas-inmuebles-negocios-en-barinas-alianza58.jpg" alt="Alianza 58" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;">
              <div style="font-weight:700;color:#1a1a1a;">${ownerName}</div>
              <div style="font-size:.85rem;color:#888;">Asesor Inmobiliario</div>
            </div>
            <a href="https://wa.me/${ownerWhatsapp}?text=Hola,%20me%20interesa%20la%20propiedad%20${encodeURIComponent(title)}" class="btn-wa" target="_blank" style="display:block;background:#25D366;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:8px;">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </a>
            <a href="tel:${ownerPhone}" style="display:block;background:#0066cc;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:8px;">
              <i class="fa-solid fa-phone"></i> Llamar
            </a>
            <a href="/contacto.html" style="display:block;background:#C0392B;color:#fff;text-align:center;padding:12px;border-radius:8px;text-decoration:none;font-weight:600;">
              <i class="fa-solid fa-envelope"></i> Enviar Mensaje
            </a>
          </div>
        </aside>
      </div>
    </div>
  </section>

  <!-- ============ FOOTER ============ -->
  <footer class="footer">
    <div class="container">
      <p>&copy; 2026 Alianza 58 — Inmuebles en Venezuela</p>
      <p style="margin-top:8px">
        <a href="/nosotros.html">Nosotros</a> · <a href="/contacto.html">Contacto</a> · <a href="/privacidad.html">Privacidad</a>
      </p>
    </div>
  </footer>

  <!-- WhatsApp Float -->
  <a href="https://wa.me/${ownerWhatsapp}" class="wa-float" target="_blank" aria-label="WhatsApp">
    <i class="fa-brands fa-whatsapp"></i>
  </a>

  <!-- Leaflet -->
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Gallery data — pre-llenar con las imágenes reales
    window.galleryImages = [${imageList}];
    window._currentImg = 0;

    function goToImage(idx) {
      if (idx < 0 || idx >= window.galleryImages.length) return;
      window._currentImg = idx;
      var main = document.getElementById('mainImage');
      if (main) {
        main.classList.add('loading');
        var img = new Image();
        img.onload = function() { main.src = img.src; main.classList.remove('loading'); };
        img.src = window.galleryImages[idx];
      }
      var counter = document.getElementById('galleryCounter');
      if (counter) counter.textContent = (idx + 1) + ' / ' + window.galleryImages.length;
      document.querySelectorAll('#galleryThumbs img').forEach(function(t, i) {
        t.classList.toggle('active', i === idx);
      });
    }

    function galleryNav(dir) {
      if (!window.galleryImages.length) return;
      var next = window._currentImg + dir;
      if (next < 0) next = window.galleryImages.length - 1;
      if (next >= window.galleryImages.length) next = 0;
      goToImage(next);
    }

    function openLightbox() {
      var lb = document.getElementById('lightbox');
      if (!lb || !window.galleryImages.length) return;
      var lbImg = document.getElementById('lightboxImg');
      var lbCounter = document.getElementById('lightboxCounter');
      if (lbImg) lbImg.src = window.galleryImages[window._currentImg];
      if (lbCounter) lbCounter.textContent = (window._currentImg + 1) + ' / ' + window.galleryImages.length;
      lb.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      var lb = document.getElementById('lightbox');
      if (lb) lb.style.display = 'none';
      document.body.style.overflow = '';
    }
    function lightboxNav(dir) {
      var next = window._currentImg + dir;
      if (!window.galleryImages.length) return;
      if (next < 0) next = window.galleryImages.length - 1;
      if (next >= window.galleryImages.length) next = 0;
      window._currentImg = next;
      var lbImg = document.getElementById('lightboxImg');
      var lbCounter = document.getElementById('lightboxCounter');
      if (lbImg) lbImg.src = window.galleryImages[next];
      if (lbCounter) lbCounter.textContent = (next + 1) + ' / ' + window.galleryImages.length;
    }

    // Render thumbnails
    (function renderThumbs() {
      var container = document.getElementById('galleryThumbs');
      if (!container || !window.galleryImages.length) return;
      container.innerHTML = '';
      window.galleryImages.forEach(function(url, i) {
        var thumb = document.createElement('img');
        thumb.src = url;
        thumb.alt = 'Foto ' + (i + 1);
        thumb.loading = 'lazy';
        if (i === 0) thumb.classList.add('active');
        thumb.onclick = function() { goToImage(i); };
        container.appendChild(thumb);
      });
    })();

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
      if (document.getElementById('lightbox').style.display === 'flex') {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxNav(-1);
        if (e.key === 'ArrowRight') lightboxNav(1);
      } else {
        if (e.key === 'ArrowLeft') galleryNav(-1);
        if (e.key === 'ArrowRight') galleryNav(1);
      }
    });

    // Map
    (function initMap() {
      var mapEl = document.getElementById('map');
      if (!mapEl || typeof L === 'undefined') return;
      var lat = ${p.lat || 8.6226};
      var lng = ${p.lng || -70.2075};
      var map = L.map('map').setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);
      L.marker([lat, lng]).addTo(map)
        .bindPopup('<strong>${title}</strong><br>${escapeHtml(address)}<br>${escapeHtml(city)}, ${escapeHtml(state)}')
        .openPopup();
    })();

    // Hamburger menu
    (function initHamburger() {
      var hamburger = document.getElementById('hamburger');
      var navLinks = document.getElementById('navLinks');
      if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
          navLinks.classList.toggle('open');
          hamburger.classList.toggle('active');
        });
      }
    })();
  </script>
</body>
</html>`;
}

function generateNotFoundHTML(slug) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Propiedad no encontrada - Alianza 58</title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f5f5f5;">
  <div style="text-align:center;padding:40px;">
    <h1 style="font-size:3rem;color:#C0392B;margin-bottom:16px;">404</h1>
    <h2 style="margin-bottom:16px;">Propiedad no encontrada</h2>
    <p style="color:#888;margin-bottom:24px;">La propiedad "${escapeHtml(slug)}" no existe o ya no está disponible.</p>
    <a href="/propiedades.html" style="display:inline-block;background:#C0392B;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Ver propiedades disponibles</a>
  </div>
</body>
</html>`;
}
