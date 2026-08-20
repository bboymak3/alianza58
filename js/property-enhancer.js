// functions/_lib/property-page-enhancer.js
//
// Este script se incluye en las páginas de detalle de propiedad (/propiedad/*.html).
// Al cargarse, hace fetch a la API para obtener las imágenes REALES de la propiedad
// y reemplaza las URLs default que estaban pre-renderizadas en el HTML estático.
//
// Cómo funciona:
// 1. Lee el slug de la propiedad del meta tag og:url o del canonical
// 2. Hace fetch a /api/properties/{slug}
// 3. Reemplaza la galería (mainImage, galleryImages, lightbox, thumbs)
// 4. Actualiza la imagen del cover_image en la ficha
// 5. Actualiza las imágenes de propiedades similares
// 6. Actualiza meta tags og:image y twitter:image
//
// El script es idempotente: si la API falla, el HTML default se mantiene.

(function() {
  'use strict';

  // ─── Obtener el slug de la propiedad desde la URL ─────────────
  function getPropertySlug() {
    var path = window.location.pathname;
    // /propiedad/casa-en-venta-ubicada-en-la-urbanizacion-la-rosaleda
    // o /propiedad/casa-en-venta-ubicada-en-la-urbanizacion-la-rosaleda.html
    var match = path.match(/\/propiedad\/([^\/\.]+)/);
    return match ? match[1] : null;
  }

  // ─── Hacer fetch a la API ─────────────────────────────────────
  async function fetchProperty(slug) {
    try {
      var resp = await fetch('/api/properties/' + slug);
      if (!resp.ok) return null;
      var data = await resp.json();
      return data.property || null;
    } catch (e) {
      console.warn('No se pudo cargar la propiedad desde la API:', e);
      return null;
    }
  }

  // ─── Actualizar la galería principal ──────────────────────────
  function updateGallery(property) {
    if (!property || !property.images || property.images.length === 0) return;

    // Filtrar imágenes válidas (no default)
    var realImages = property.images.filter(function(img) {
      return img.url && img.url.indexOf('default-property') === -1;
    });

    if (realImages.length === 0) return;

    // Construir array de URLs
    var imageUrls = realImages.map(function(img) { return img.url; });

    // Convertir URLs relativas a absolutas
    imageUrls = imageUrls.map(function(url) {
      if (url.indexOf('http') === 0) return url;
      if (url.indexOf('/') === 0) return window.location.origin + url;
      // Relativa: ../images/...
      return new URL(url, window.location.href).href;
    });

    // Actualizar variable global galleryImages si existe
    if (typeof window.galleryImages !== 'undefined') {
      window.galleryImages = imageUrls;
    } else {
      // Crearla para que el JS inline la use
      window.galleryImages = imageUrls;
    }

    // Actualizar imagen principal
    var mainImg = document.getElementById('mainImage');
    if (mainImg) {
      mainImg.src = imageUrls[0];
      mainImg.removeAttribute('onclick');
      mainImg.setAttribute('onclick', 'openLightbox()');
    }

    // Actualizar contador
    var counter = document.getElementById('galleryCounter');
    if (counter) {
      counter.textContent = '1 / ' + imageUrls.length;
    }

    // Actualizar meta tags og:image y twitter:image
    var coverUrl = imageUrls[0];
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', coverUrl);
    var twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) twImage.setAttribute('content', coverUrl);

    // Actualizar JSON-LD schema
    var jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
      try {
        var schema = JSON.parse(jsonLd.textContent);
        if (schema.image) {
          schema.image = imageUrls;
        }
        jsonLd.textContent = JSON.stringify(schema);
      } catch (e) {}
    }

    // Si la galería tiene thumbs, actualizarlos
    var thumbsContainer = document.querySelector('.gallery-thumbs');
    if (thumbsContainer) {
      thumbsContainer.innerHTML = '';
      imageUrls.forEach(function(url, i) {
        var thumb = document.createElement('img');
        thumb.src = url;
        thumb.alt = 'Foto ' + (i + 1);
        thumb.loading = 'lazy';
        if (i === 0) thumb.classList.add('active');
        thumb.onclick = function() { goToImage(i); };
        thumbsContainer.appendChild(thumb);
      });
    } else {
      // Crear contenedor de thumbs si no existe
      var gallery = document.getElementById('gallery');
      if (gallery && imageUrls.length > 1) {
        var newThumbs = document.createElement('div');
        newThumbs.className = 'gallery-thumbs';
        imageUrls.forEach(function(url, i) {
          var thumb = document.createElement('img');
          thumb.src = url;
          thumb.alt = 'Foto ' + (i + 1);
          thumb.loading = 'lazy';
          if (i === 0) thumb.classList.add('active');
          thumb.onclick = function() { goToImage(i); };
          newThumbs.appendChild(thumb);
        });
        gallery.appendChild(newThumbs);
      }
    }

    // Agregar botones de navegación si hay más de 1 imagen
    if (imageUrls.length > 1) {
      var mainWrap = document.querySelector('.gallery-main-wrap');
      if (mainWrap && !mainWrap.querySelector('.gallery-nav.prev')) {
        var prevBtn = document.createElement('button');
        prevBtn.className = 'gallery-nav prev';
        prevBtn.innerHTML = '&#8249;';
        prevBtn.setAttribute('aria-label', 'Anterior');
        prevBtn.onclick = function(e) { e.stopPropagation(); galleryNav(-1); };
        mainWrap.appendChild(prevBtn);

        var nextBtn = document.createElement('button');
        nextBtn.className = 'gallery-nav next';
        nextBtn.innerHTML = '&#8250;';
        nextBtn.setAttribute('aria-label', 'Siguiente');
        nextBtn.onclick = function(e) { e.stopPropagation(); galleryNav(1); };
        mainWrap.appendChild(nextBtn);
      }
    }
  }

  // ─── Actualizar propiedades similares ─────────────────────────
  async function updateSimilarProperties() {
    var similarCards = document.querySelectorAll('.similar-card');
    for (var i = 0; i < similarCards.length; i++) {
      var card = similarCards[i];
      var href = card.getAttribute('href') || '';
      // href es como "casa-moderna-urb-barinas.html"
      var match = href.match(/([^\/\.]+)\.html$/);
      if (!match) continue;

      var slug = match[1];
      try {
        var resp = await fetch('/api/properties/' + slug);
        if (!resp.ok) continue;
        var data = await resp.json();
        var prop = data.property;
        if (!prop) continue;

        var coverImage = prop.cover_image;
        if (coverImage && coverImage.indexOf('default-property') === -1) {
          var img = card.querySelector('img');
          if (img) {
            // Convertir a ruta absoluta si es relativa
            if (coverImage.indexOf('/') === 0) {
              img.src = coverImage;
            } else if (coverImage.indexOf('http') !== 0) {
              img.src = new URL(coverImage, window.location.href).href;
            } else {
              img.src = coverImage;
            }
          }
        }

        // Actualizar precio si está desactualizado
        var priceEl = card.querySelector('.price, [class*="price"]');
        if (priceEl && prop.price) {
          var formatted = '$' + Number(prop.price).toLocaleString('es-VE');
          if (priceEl.textContent.trim() !== formatted) {
            priceEl.textContent = formatted;
          }
        }
      } catch (e) {
        console.warn('No se pudo cargar similar:', slug, e);
      }
    }
  }

  // ─── Ejecutar ─────────────────────────────────────────────────
  async function init() {
    var slug = getPropertySlug();
    if (!slug) return;

    var property = await fetchProperty(slug);
    if (!property) return;

    updateGallery(property);
    updateSimilarProperties();  // no await — no bloquea
  }

  // Exponer funciones para que el JS inline del HTML las pueda usar
  window.goToImage = function(idx) {
    if (typeof window.galleryImages === 'undefined' || !window.galleryImages.length) return;
    if (idx < 0 || idx >= window.galleryImages.length) return;
    var currentImg = idx;
    var main = document.getElementById('mainImage');
    if (main) {
      main.classList.add('loading');
      var img = new Image();
      img.onload = function() {
        main.src = img.src;
        main.classList.remove('loading');
      };
      img.src = window.galleryImages[idx];
    }
    var counter = document.getElementById('galleryCounter');
    if (counter) {
      counter.textContent = (idx + 1) + ' / ' + window.galleryImages.length;
    }
    document.querySelectorAll('.gallery-thumbs img').forEach(function(t, i) {
      t.classList.toggle('active', i === idx);
    });
    window._currentImg = currentImg;
  };

  window.galleryNav = function(dir) {
    var current = window._currentImg || 0;
    var next = current + dir;
    if (!window.galleryImages.length) return;
    if (next < 0) next = window.galleryImages.length - 1;
    if (next >= window.galleryImages.length) next = 0;
    window.goToImage(next);
  };

  window.openLightbox = function() {
    var lb = document.getElementById('lightbox');
    if (!lb || !window.galleryImages.length) return;
    var lbImg = document.getElementById('lightboxImg');
    var lbCounter = document.getElementById('lightboxCounter');
    if (lbImg) lbImg.src = window.galleryImages[window._currentImg || 0];
    if (lbCounter) lbCounter.textContent = ((window._currentImg || 0) + 1) + ' / ' + window.galleryImages.length;
    lb.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };

  window.closeLightbox = function() {
    var lb = document.getElementById('lightbox');
    if (lb) lb.style.display = 'none';
    document.body.style.overflow = '';
  };

  window.lightboxNav = function(dir) {
    var current = window._currentImg || 0;
    var next = current + dir;
    if (!window.galleryImages.length) return;
    if (next < 0) next = window.galleryImages.length - 1;
    if (next >= window.galleryImages.length) next = 0;
    window._currentImg = next;
    var lbImg = document.getElementById('lightboxImg');
    var lbCounter = document.getElementById('lightboxCounter');
    if (lbImg) lbImg.src = window.galleryImages[next];
    if (lbCounter) lbCounter.textContent = (next + 1) + ' / ' + window.galleryImages.length;
  };

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
