// js/properties-list-enhancer.js
//
// Se ejecuta en /propiedades.html (listado de propiedades).
// Hace fetch a /api/properties y reemplaza las imágenes default por las reales
// en cada tarjeta de propiedad listada.

(function() {
  'use strict';

  function isPropertyListPage() {
    var path = window.location.pathname;
    return path === '/propiedades' || path === '/propiedades.html' ||
           path === '/' || path === '/index.html' || path === '/index';
  }

  async function loadPropertyImages() {
    try {
      var resp = await fetch('/api/properties?limit=50');
      if (!resp.ok) return;
      var data = await resp.json();
      var props = data.properties || [];

      // Construir mapa slug → cover_image
      var coverMap = {};
      props.forEach(function(p) {
        if (p.cover_image && p.cover_image.indexOf('default-property') === -1) {
          coverMap[p.slug] = p.cover_image;
        }
      });

      // Buscar todas las imágenes en tarjetas de propiedad
      var imgs = document.querySelectorAll('img[src*="default-property"]');
      imgs.forEach(function(img) {
        // Buscar el link padre que contenga el slug
        var link = img.closest('a[href*="propiedad/"]');
        if (!link) return;

        var href = link.getAttribute('href') || '';
        var match = href.match(/propiedad\/([^\/\.]+)/);
        if (!match) return;

        var slug = match[1];
        var cover = coverMap[slug];
        if (cover) {
          // Convertir a ruta absoluta si es relativa
          if (cover.indexOf('/') === 0) {
            img.src = cover;
          } else if (cover.indexOf('http') !== 0) {
            img.src = new URL(cover, window.location.href).href;
          } else {
            img.src = cover;
          }
        }
      });
    } catch (e) {
      console.warn('properties-list-enhancer error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPropertyImages);
  } else {
    loadPropertyImages();
  }
})();
