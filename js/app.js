/* ═══════════════════════════════════════════════════════════════════════════
   Alianza 58 Bienes Raíces C.A. — Main Application Script
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
const API = '/api';
const TOKEN_KEY = 'alianza58_token';
const USER_KEY = 'alianza58_user';
const BASE_URL = window.location.origin || 'https://alianza58.pages.dev';

// ═══════════════════════════════════════════════════════════════════════════
// VENEZUELAN STATES
// ═══════════════════════════════════════════════════════════════════════════
const STATES = [
  { name: 'Amazonas', slug: 'amazonas' },
  { name: 'Anzoátegui', slug: 'anzoategui' },
  { name: 'Apure', slug: 'apure' },
  { name: 'Aragua', slug: 'aragua' },
  { name: 'Barinas', slug: 'barinas' },
  { name: 'Bolívar', slug: 'bolivar' },
  { name: 'Carabobo', slug: 'carabobo' },
  { name: 'Cojedes', slug: 'cojedes' },
  { name: 'Delta Amacuro', slug: 'delta-amacuro' },
  { name: 'Distrito Capital', slug: 'distrito-capital' },
  { name: 'Falcón', slug: 'falcon' },
  { name: 'Guárico', slug: 'guarico' },
  { name: 'Lara', slug: 'lara' },
  { name: 'Mérida', slug: 'merida' },
  { name: 'Miranda', slug: 'miranda' },
  { name: 'Monagas', slug: 'monagas' },
  { name: 'Nueva Esparta', slug: 'nueva-esparta' },
  { name: 'Portuguesa', slug: 'portuguesa' },
  { name: 'Sucre', slug: 'sucre' },
  { name: 'Táchira', slug: 'tachira' },
  { name: 'Trujillo', slug: 'trujillo' },
  { name: 'Vargas', slug: 'vargas' },
  { name: 'Yaracuy', slug: 'yaracuy' },
  { name: 'Zulia', slug: 'zulia' }
];

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY TYPES
// ═══════════════════════════════════════════════════════════════════════════
const PROPERTY_TYPES = [
  { value: 'casa', label: 'Casa' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'local_comercial', label: 'Local Comercial' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'finca', label: 'Finca' }
];

// ═══════════════════════════════════════════════════════════════════════════
// OPERATION TYPES
// ═══════════════════════════════════════════════════════════════════════════
const OPERATION_TYPES = [
  { value: 'venta', label: 'Venta' },
  { value: 'arrendamiento', label: 'Arrendamiento' }
];

// ═══════════════════════════════════════════════════════════════════════════
// API CALL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════
async function apiCall(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  try {
    const response = await fetch(API + url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error || data?.message || 'Error en la solicitud';
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Error de conexión. Verifica tu internet e intenta de nuevo.');
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// API METHODS
// ═══════════════════════════════════════════════════════════════════════════
const api = {
  get(url) {
    return apiCall(url, { method: 'GET' });
  },
  post(url, data) {
    return apiCall(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  put(url, data) {
    return apiCall(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  delete(url) {
    return apiCall(url, { method: 'DELETE' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    console.warn('No se pudo guardar el token en localStorage.');
  }
}

function removeToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // silent
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setUser(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    console.warn('No se pudo guardar el usuario en localStorage.');
  }
}

function getCachedUser() {
  return getUser();
}

function removeUser() {
  try {
    localStorage.removeItem(USER_KEY);
  } catch {
    // silent
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function isAuthenticated() {
  return !!getToken();
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '&#10003;',
    error: '&#10007;',
    warning: '&#9888;',
    info: '&#8505;'
  };

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML =
    '<span class="toast-icon">' + (icons[type] || icons.info) + '</span>' +
    '<span class="toast-message">' + escapeHtml(message) + '</span>' +
    '<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatPrice(price, currency = 'USD') {
  if (price === null || price === undefined || price === '') return 'Consulte';
  const num = Number(price);
  if (isNaN(num)) return 'Consulte';
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  if (currency === 'USD') return '$' + formatted;
  if (currency === 'EUR') return '€' + formatted;
  return formatted + ' ' + currency;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return day + ' de ' + month + ' de ' + year;
  } catch {
    return dateStr;
  }
}

function truncateText(text, max = 120) {
  if (!text || text.length <= max) return text || '';
  return text.substring(0, max).trim() + '...';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY CARD RENDERER
// ═══════════════════════════════════════════════════════════════════════════
function createPropertyCard(prop) {
  if (!prop) return '';

  const title = escapeHtml(prop.title || 'Sin título');
  const slug = prop.slug || slugify(prop.title || 'propiedad');
  const location = escapeHtml(prop.location || prop.address || 'Ubicación no disponible');
  const image = prop.cover_image || prop.image || prop.images?.[0]?.url || '/images/default-property.jpg';
  // Use thumbnail for list cards
  const thumbUrl = image.includes('/api/serve?') ? image + '&w=600' : image;
  const price = formatPrice(prop.price, prop.currency);
  const priceLabel = (prop.operation_type || prop.operation) === 'arrendamiento' ? price + ' /mes' : price;
  const area = prop.area ? prop.area + ' m²' : '';
  const landArea = prop.land_area ? prop.land_area + ' mts2' : '';
  const constructionArea = prop.construction_area ? prop.construction_area + ' mts2' : '';
  const beds = prop.bedrooms || prop.beds || 0;
  const baths = prop.bathrooms || prop.baths || 0;
  const operation = prop.operation_type || prop.operation || 'venta';
  const isFeatured = prop.featured || prop.is_featured || false;
  const detailUrl = '/propiedad/' + encodeURIComponent(slug);

  const badgeClass = operation === 'arrendamiento' ? 'badge-alquiler' : 'badge-venta';
  const badgeLabel = operation === 'arrendamiento' ? 'Arriendo' : 'Venta';

  let specsHtml = '';
  if (area) {
    specsHtml += '<span class="prop-card-spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>' + escapeHtml(area) + '</span>';
  }
  if (landArea) {
    specsHtml += '<span class="prop-card-spec" title="Metros de Terreno"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M3 21l9-18 9 18H3z"/></svg>' + escapeHtml(landArea) + ' Terreno</span>';
  }
  if (constructionArea) {
    specsHtml += '<span class="prop-card-spec" title="Metros de Construcción"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M2 22h20M4 22V8l8-6 8 6v14M9 22v-6h6v6"/></svg>' + escapeHtml(constructionArea) + ' Const.</span>';
  }
  if (beds > 0) {
    specsHtml += '<span class="prop-card-spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M2 4v16M22 4v16M2 8h20M2 16h20"/></svg>' + beds + ' Hab.</span>';
  }
  if (baths > 0) {
    specsHtml += '<span class="prop-card-spec"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M4 12h16a1 1 0 011 1v3a4 4 0 01-4 4H7a4 4 0 01-4-4v-3a1 1 0 011-1z"/><path d="M6 12V5a2 2 0 012-2h8a2 2 0 012 2v7"/></svg>' + baths + ' Baños</span>';
  }

  // Características adicionales (mostrar como tags pequeños)
  var FEATURE_ICONS = {
    wifi: '📶', piscina: '🏊', tanque_agua: '💧', bomba_agua: '🚿',
    areas_verdes: '🌳', estacionamiento: '🚗', vigilancia: '🔒',
    aire_acondicionado: '❄️', cocina_integral: '🍳', calentador: '♨️',
    terraza: '🌅', parrillero: '🔥', closet: '👕', porton_electrico: '⚙️',
    energia_solar: '☀️', pisos_ceramica: '▦', gas_domestico: '🔥',
    electricidad: '⚡', patio: '🏡', patio_techado: '🏠',
    cerca_electrica: '⚡', pozo_agua: '🛢️', arboles_frutales: '🍎',
    jardines: '🌷', transformador: '🔌'
  };
  var featuresHtml = '';
  if (prop.features) {
    try {
      var feats = typeof prop.features === 'string' ? JSON.parse(prop.features) : prop.features;
      if (Array.isArray(feats)) {
        // Mostrar máximo 4 características para no saturar la tarjeta
        feats.slice(0, 4).forEach(function(f) {
          var icon = FEATURE_ICONS[f] || '✓';
          featuresHtml += '<span class="prop-card-feature">' + icon + ' ' + f.replace(/_/g, ' ') + '</span>';
        });
      }
    } catch(e) {}
  }

  let featuredHtml = '';
  if (isFeatured) {
    featuredHtml = '<span class="prop-card-featured">&#9733; Destacado</span>';
  }

  return (
    '<div class="prop-card" data-id="' + escapeHtml(String(prop.id || '')) + '">' +
      '<div class="prop-card-img">' +
        '<a href="' + detailUrl + '">' +
          '<img src="' + escapeHtml(thumbUrl) + '" alt="' + title + '" loading="lazy">' +
        '</a>' +
        '<span class="prop-card-price">' + escapeHtml(priceLabel) + '</span>' +
        '<div class="prop-card-badges">' +
          featuredHtml +
        '</div>' +
      '</div>' +
      '<div class="prop-card-body">' +
        '<h3 class="prop-card-title"><a href="' + detailUrl + '">' + title + '</a></h3>' +
        '<p class="prop-card-location">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          location +
        '</p>' +
        (specsHtml ? '<div class="prop-card-specs">' + specsHtml + '</div>' : '') +
        (featuresHtml ? '<div class="prop-card-features">' + featuresHtml + '</div>' : '') +
      '</div>' +
    '</div>'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SKELETON LOADING CARDS
// ═══════════════════════════════════════════════════════════════════════════
function renderSkeletonCards(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html +=
      '<div class="skeleton-card">' +
        '<div class="skeleton skeleton-img"></div>' +
        '<div class="skeleton-body">' +
          '<div class="skeleton skeleton-title"></div>' +
          '<div class="skeleton skeleton-text"></div>' +
          '<div class="skeleton-specs">' +
            '<div class="skeleton skeleton-spec"></div>' +
            '<div class="skeleton skeleton-spec"></div>' +
            '<div class="skeleton skeleton-spec"></div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  return html;
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
function initHeader() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const header = document.querySelector('.header') || document.querySelector('#mainHeader') || document.querySelector('.navbar');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  if (header) {
    const scrollTarget = header.closest('#mainHeader') || header;
    const onScroll = () => {
      scrollTarget.classList.toggle('scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  const currentPath = window.location.pathname;
  document.querySelectorAll('.header-nav a, .nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (currentPath === href || currentPath.endsWith(href) || (href === '/' && (currentPath === '/' || currentPath.endsWith('index.html'))))) {
      link.classList.add('active');
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH BAR INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════
function initSearchBar() {
  const stateSelect = document.getElementById('search-state');
  const typeSelect = document.getElementById('search-type');
  const opSelect = document.getElementById('search-operation');
  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-text');

  if (stateSelect && !stateSelect.dataset.init) {
    stateSelect.dataset.init = '1';
    let optionsHtml = '<option value="">Todo el país</option>';
    STATES.forEach(s => {
      optionsHtml += '<option value="' + s.slug + '">' + escapeHtml(s.name) + '</option>';
    });
    stateSelect.innerHTML = optionsHtml;
  }

  if (typeSelect && !typeSelect.dataset.init) {
    typeSelect.dataset.init = '1';
    let optionsHtml = '<option value="">Todos</option>';
    PROPERTY_TYPES.forEach(t => {
      optionsHtml += '<option value="' + t.value + '">' + escapeHtml(t.label) + '</option>';
    });
    typeSelect.innerHTML = optionsHtml;
  }

  if (opSelect && !opSelect.dataset.init) {
    opSelect.dataset.init = '1';
    let optionsHtml = '<option value="">Venta / Arriendo</option>';
    OPERATION_TYPES.forEach(o => {
      optionsHtml += '<option value="' + o.value + '">' + escapeHtml(o.label) + '</option>';
    });
    opSelect.innerHTML = optionsHtml;
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const params = new URLSearchParams();
      if (searchInput) {
        const q = searchInput.value.trim();
        if (q) params.set('q', q);
      }
      if (stateSelect && stateSelect.value) params.set('estado', stateSelect.value);
      if (typeSelect && typeSelect.value) params.set('tipo', typeSelect.value);
      if (opSelect && opSelect.value) params.set('operacion', opSelect.value);
      const qs = params.toString();
      window.location.href = '/properties.html' + (qs ? '?' + qs : '');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD FEATURED PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════
async function loadFeaturedProperties() {
  const container = document.getElementById('featuredGrid') || document.getElementById('featured-properties');
  const spinner = document.getElementById('featuredSpinner');
  if (!container) return;

  if (spinner) spinner.classList.remove('hidden');

  try {
    const data = await api.get('/properties?featured=true&limit=6');
    if (spinner) spinner.classList.add('hidden');
    const properties = data?.properties || data?.data || (Array.isArray(data) ? data : []);
    if (!Array.isArray(properties) || properties.length === 0) {
      container.innerHTML =
        '<div class="empty-state">' +
          '<p>No hay propiedades disponibles en este momento.</p>' +
        '</div>';
      return;
    }
    let html = '';
    properties.forEach(prop => {
      html += createPropertyCard(prop);
    });
    container.innerHTML = html;
    initLazyLoading();
  } catch (error) {
    console.error('Error cargando propiedades destacadas:', error);
    if (spinner) spinner.classList.add('hidden');
    container.innerHTML =
      '<div class="empty-state">' +
        '<p>No hay propiedades disponibles en este momento.</p>' +
      '</div>';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD STATS WITH ANIMATED COUNTERS
// ═══════════════════════════════════════════════════════════════════════════
async function loadStats() {
  // Support both [data-stat] and .stat-number[data-target] patterns
  const statContainers = document.querySelectorAll('[data-stat]');
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (statContainers.length === 0 && statNumbers.length === 0) return;

  try {
    const data = await api.get('/stats');
    const stats = data?.data || data || {};
    const totalProperties = stats.total_properties || stats.total || stats.properties || 0;

    // Handle .stat-number[data-target] pattern (homepage)
    const statPropEl = document.getElementById('statProperties');
    if (statPropEl) {
      statPropEl.dataset.target = totalProperties;
      animateCounter(statPropEl, Number(totalProperties));
    }

    // Handle [data-stat] pattern (other pages)
    statContainers.forEach(el => {
      const key = el.dataset.stat;
      const value = stats[key] || 0;
      animateCounter(el, Number(value));
    });

    // Animate remaining stat-number elements that have data-target
    statNumbers.forEach(el => {
      if (el.id === 'statProperties') return; // Already handled above
      const target = parseInt(el.dataset.target, 10);
      if (!isNaN(target)) {
        animateCounter(el, target);
      }
    });
  } catch (error) {
    console.error('Error cargando estadísticas:', error);
    // Still animate the static values on error
    statNumbers.forEach(el => {
      const target = parseInt(el.dataset.target, 10);
      if (!isNaN(target) && target > 0) {
        animateCounter(el, target);
      }
    });
  }
}

function animateCounter(element, target) {
  const duration = 1500;
  const startTime = performance.now();
  const start = 0;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(start + (target - start) * eased);
    element.textContent = current.toLocaleString('en-US');
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = target.toLocaleString('en-US');
    }
  }

  requestAnimationFrame(update);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAP INITIALIZATION (LEAFLET)
// ═══════════════════════════════════════════════════════════════════════════
function initMap(containerId, properties, centerLat, centerLng) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof L === 'undefined') {
    console.warn('Leaflet no está cargado.');
    container.innerHTML = '<div class="loading"><p>Mapa no disponible</p></div>';
    return;
  }

  // Barinas, Venezuela coordinates
  const lat = centerLat || 8.6239;
  const lng = centerLng || -70.2184;

  const map = L.map(containerId).setView([lat, lng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);

  const markers = [];

  if (Array.isArray(properties)) {
    properties.forEach(prop => {
      // Si no tiene lat/lng, usar coordenadas por defecto de Barinas
      // con un pequeño offset aleatorio para que no se superpongan
      const pLat = prop.lat || (8.6239 + (Math.random() - 0.5) * 0.02);
      const pLng = prop.lng || (-70.2184 + (Math.random() - 0.5) * 0.02);
      const price = formatPrice(prop.price, prop.currency);
      const slug = prop.slug || slugify(prop.title || 'propiedad');
      const title = escapeHtml(prop.title || 'Propiedad');
      const city = escapeHtml(prop.city || prop.location || 'Barinas');
      const opLabel = (prop.operation_type || prop.operation || 'venta') === 'arrendamiento' ? 'Arriendo' : 'Venta';
      const opColor = (prop.operation_type || prop.operation || 'venta') === 'arrendamiento' ? '#2563eb' : '#C0392B';
      const pType = escapeHtml(prop.property_type || prop.type || 'Casa');
      const beds = prop.bedrooms || prop.beds || 0;
      const baths = prop.bathrooms || prop.baths || 0;
      const area = prop.area ? prop.area + ' m²' : '';
      const image = prop.cover_image || prop.image || (Array.isArray(prop.images) && prop.images[0] ? prop.images[0].url : '') || '/images/default-property.jpg';
      const detailUrl = '/propiedad/' + encodeURIComponent(slug);

      // Custom red marker with price
      const icon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background:#C0392B;color:#fff;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;position:relative;">' + escapeHtml(price) + '<div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #C0392B;"></div></div>',
        iconSize: [100, 36],
        iconAnchor: [50, 36]
      });

      // Rich popup card
      const popupContent =
        '<div style="width:220px;font-family:system-ui,-apple-system,sans-serif;">' +
          (image ? '<img src="' + escapeHtml(image) + '" alt="' + title + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px 8px 0 0;" onerror="this.style.display=\'none\'">' : '') +
          '<div style="padding:10px;">' +
            '<div style="display:flex;gap:6px;margin-bottom:6px;">' +
              '<span style="background:' + opColor + ';color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">' + opLabel + '</span>' +
              '<span style="background:#f0f0f0;color:#333;padding:2px 8px;border-radius:10px;font-size:11px;">' + pType + '</span>' +
            '</div>' +
            '<div style="font-weight:600;font-size:14px;color:#1a1a1a;margin-bottom:4px;line-height:1.3;">' + title + '</div>' +
            '<div style="font-size:12px;color:#888;margin-bottom:6px;">' + city + '</div>' +
            '<div style="font-size:16px;font-weight:700;color:#C0392B;margin-bottom:6px;">' + escapeHtml(price) + '</div>' +
            (beds > 0 || baths > 0 || area ?
              '<div style="display:flex;gap:10px;font-size:12px;color:#666;margin-bottom:8px;">' +
                (beds > 0 ? '<span>' + beds + ' hab.</span>' : '') +
                (baths > 0 ? '<span>' + baths + ' baños</span>' : '') +
                (area ? '<span>' + area + '</span>' : '') +
              '</div>' : '') +
            '<a href="' + detailUrl + '" style="display:block;text-align:center;background:#C0392B;color:#fff;padding:8px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none;">Ver propiedad</a>' +
          '</div>' +
        '</div>';

      const marker = L.marker([pLat, pLng], { icon }).addTo(map);
      marker.bindPopup(popupContent, {
        maxWidth: 250,
        minWidth: 220,
        className: 'alianza-popup'
      });
      markers.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }
  }

  setTimeout(function() {
    map.invalidateSize();
  }, 300);

  return map;
}

// Load map for home page with all Barinas properties
async function loadHomeMap() {
  var container = document.getElementById('homeMap');
  if (!container) return;

  try {
    var data = await api.get('/properties?status=approved&limit=50');
    var properties = data?.data || data?.properties || data || [];
    initMap('homeMap', properties, 8.6239, -70.2184);
  } catch (error) {
    console.error('Error cargando mapa:', error);
    initMap('homeMap', [], 8.6239, -70.2184);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOAD PROPERTIES PAGE (propiedades.html)
let _propsPageState = { page: 1 };

async function loadPropertiesPage(params) {
  const grid = document.getElementById('searchResultsGrid');
  const spinner = document.getElementById('searchSpinner');
  const noResults = document.getElementById('noResults');
  const resultsCount = document.getElementById('resultsCount');
  const paginationEl = document.getElementById('pagination');
  if (!grid) return;

  const urlParams = new URLSearchParams(window.location.search);
  const apiParams = new URLSearchParams();

  const tipo = params?.tipo || urlParams.get('tipo') || '';
  const operacion = params?.operacion || urlParams.get('operacion') || '';
  const q = params?.q || urlParams.get('q') || '';
  const precioMin = params?.precio_min || urlParams.get('precio_min') || '';
  const precioMax = params?.precio_max || urlParams.get('precio_max') || '';
  const habitaciones = params?.habitaciones || urlParams.get('habitaciones') || '';
  const banos = params?.banos || urlParams.get('banos') || '';
  const areaMin = params?.area_min || urlParams.get('area_min') || '';
  const sort = urlParams.get('orden') || 'newest';

  if (tipo) apiParams.set('property_type', tipo);
  if (operacion) apiParams.set('operation_type', operacion);
  if (q) apiParams.set('search', q);
  if (precioMin) apiParams.set('price_min', precioMin);
  if (precioMax) apiParams.set('price_max', precioMax);
  if (habitaciones) apiParams.set('bedrooms_min', habitaciones);
  if (banos) apiParams.set('bathrooms_min', banos);
  if (areaMin) apiParams.set('area_min', areaMin);
  apiParams.set('sort', sort);
  apiParams.set('limit', '12');
  apiParams.set('page', String(_propsPageState.page));

  if (spinner) spinner.classList.remove('hidden');
  if (noResults) noResults.style.display = 'none';
  grid.innerHTML = '';

  try {
    const data = await api.get('/properties?' + apiParams.toString());
    const properties = data?.properties || data?.data || (Array.isArray(data) ? data : []);
    const pag = data?.pagination || {};
    const total = pag.total || properties.length;
    const pages = pag.pages || 1;

    if (resultsCount) resultsCount.textContent = total + ' propiedades encontradas';

    if (properties.length === 0) {
      if (noResults) noResults.style.display = 'block';
    } else {
      let html = '';
      properties.forEach(prop => { html += createPropertyCard(prop); });
      grid.innerHTML = html;
      initLazyLoading();
      // Actualizar el mapa de propiedades con los resultados
      var propiedadesMap = document.getElementById('propiedadesMap');
      if (propiedadesMap && typeof initMap === 'function') {
        initMap('propiedadesMap', properties, 8.6239, -70.2184);
      }
    }

    if (paginationEl) {
      initPagination('pagination', pages, _propsPageState.page, function(newPage) {
        _propsPageState.page = newPage;
        loadPropertiesPage(params);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  } catch (error) {
    console.error('Error cargando propiedades:', error);
    if (resultsCount) resultsCount.textContent = 'Error al cargar';
    grid.innerHTML = '<div class="empty-state"><p>Error al cargar propiedades. Intenta de nuevo.</p></div>';
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
}

function initPropertiesPage() {
  var filtersForm = document.getElementById('filtersForm');
  if (filtersForm) {
    filtersForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var fd = new FormData(filtersForm);
      var params = {};
      if (fd.get('tipo')) params.tipo = fd.get('tipo');
      if (fd.get('operacion')) params.operacion = fd.get('operacion');
      if (fd.get('precio_min')) params.precio_min = fd.get('precio_min');
      if (fd.get('precio_max')) params.precio_max = fd.get('precio_max');
      if (fd.get('habitaciones')) params.habitaciones = fd.get('habitaciones');
      if (fd.get('banos')) params.banos = fd.get('banos');
      if (fd.get('area_min')) params.area_min = fd.get('area_min');
      _propsPageState.page = 1;
      loadPropertiesPage(params);
      var sidebar = document.getElementById('filtersSidebar');
      if (sidebar) sidebar.classList.remove('open');
    });
  }

  var sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      var url = new URL(window.location);
      url.searchParams.set('orden', sortSelect.value);
      window.history.replaceState(null, '', url);
      _propsPageState.page = 1;
      loadPropertiesPage({});
    });
  }

  var filterToggle = document.getElementById('filterToggle');
  var sidebar = document.getElementById('filtersSidebar');
  if (filterToggle && sidebar) {
    filterToggle.addEventListener('click', function() { sidebar.classList.toggle('open'); });
  }
  var filtersClose = document.getElementById('filtersClose');
  if (filtersClose && sidebar) {
    filtersClose.addEventListener('click', function() { sidebar.classList.remove('open'); });
  }

  _propsPageState.page = 1;
  loadPropertiesPage({});
}

// IMAGE GALLERY
// ═══════════════════════════════════════════════════════════════════════════
function initGallery() {
  const mainImg = document.querySelector('.gallery-main img');
  const thumbs = document.querySelectorAll('.gallery-thumb');
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox ? lightbox.querySelector('img') : null;

  if (!mainImg || thumbs.length === 0) return;

  const images = [];
  thumbs.forEach((thumb, index) => {
    const img = thumb.querySelector('img');
    if (img) {
      images.push(img.src || img.dataset.src);
      thumb.addEventListener('click', () => {
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        mainImg.src = images[index];
      });
    }
  });

  if (lightbox && lightboxImg) {
    let currentIndex = 0;

    mainImg.parentElement.addEventListener('click', () => {
      currentIndex = images.indexOf(mainImg.src);
      if (currentIndex === -1) currentIndex = 0;
      lightboxImg.src = images[currentIndex];
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    const closeBtn = lightbox.querySelector('.lightbox-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeLightbox);
    }

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lightboxImg.src = images[currentIndex];
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % images.length;
        lightboxImg.src = images[currentIndex];
      });
    }

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft' && prevBtn) prevBtn.click();
      if (e.key === 'ArrowRight' && nextBtn) nextBtn.click();
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTACT FORM
// ═══════════════════════════════════════════════════════════════════════════
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Enviando...';
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    try {
      await api.post('/contacts', data);
      showToast('Mensaje enviado correctamente. Te contactaremos pronto.', 'success');
      form.reset();
    } catch (error) {
      showToast(error.message || 'Error al enviar el mensaje.', 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH FORMS (LOGIN / REGISTER)
// ═══════════════════════════════════════════════════════════════════════════
function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Ingresando...';
      }

      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData);

      try {
        const result = await api.post('/auth/login', data);
        const token = result?.token || result?.data?.token;
        const user = result?.user || result?.data?.user;

        if (token) setToken(token);
        if (user) setUser(user);

        showToast('Bienvenido(a), ' + (user?.name || 'Usuario') + '!', 'success');

        const redirect = new URLSearchParams(window.location.search).get('redirect');
        setTimeout(() => {
          window.location.href = redirect || '/';
        }, 500);
      } catch (error) {
        showToast(error.message || 'Error al iniciar sesión.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const originalText = btn ? btn.textContent : '';
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Registrando...';
      }

      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData);

      try {
        const result = await api.post('/auth/register', data);
        const token = result?.token || result?.data?.token;
        const user = result?.user || result?.data?.user;

        if (token) setToken(token);
        if (user) setUser(user);

        showToast('Registro exitoso. Bienvenido(a)!', 'success');

        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } catch (error) {
        showToast(error.message || 'Error al registrarse.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = originalText;
        }
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════════════════════════
function initAdminPanel() {
  if (!requireAuth()) return;

  const sidebarToggle = document.querySelector('.admin-sidebar-toggle');
  const sidebar = document.querySelector('.admin-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  loadAdminStats();
}

async function loadAdminStats() {
  const statElements = document.querySelectorAll('[data-admin-stat]');
  if (statElements.length === 0) return;

  try {
    const data = await api.get('/admin/stats');
    const stats = data?.data || data || {};
    statElements.forEach(el => {
      const key = el.dataset.adminStat;
      const value = stats[key] || 0;
      animateCounter(el, Number(value));
    });
  } catch (error) {
    console.error('Error cargando estadísticas admin:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════════════════════
function handleLogout() {
  removeToken();
  removeUser();
  showToast('Sesión cerrada correctamente.', 'success');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 500);
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGINATION
// ═══════════════════════════════════════════════════════════════════════════
function initPagination(containerId, totalPages, currentPage, callback) {
  const container = document.getElementById(containerId);
  if (!container || totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = '<div class="pagination">';

  html += '<button class="page-btn" ' + (currentPage <= 1 ? 'disabled' : '') + ' data-page="' + (currentPage - 1) + '">&laquo;</button>';

  const maxVisible = 7;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }

  if (start > 1) {
    html += '<button class="page-btn" data-page="1">1</button>';
    if (start > 2) {
      html += '<span class="page-btn" style="cursor:default;border:none;">...</span>';
    }
  }

  for (let i = start; i <= end; i++) {
    html += '<button class="page-btn' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>';
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      html += '<span class="page-btn" style="cursor:default;border:none;">...</span>';
    }
    html += '<button class="page-btn" data-page="' + totalPages + '">' + totalPages + '</button>';
  }

  html += '<button class="page-btn" ' + (currentPage >= totalPages ? 'disabled' : '') + ' data-page="' + (currentPage + 1) + '">&raquo;</button>';
  html += '</div>';

  container.innerHTML = html;

  container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const page = parseInt(btn.dataset.page, 10);
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        if (typeof callback === 'function') callback(page);
      }
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════════════════════
function initFilters() {
  const filterState = document.getElementById('filter-state');
  const filterType = document.getElementById('filter-type');
  const filterOp = document.getElementById('filter-operation');
  const filterPriceMin = document.getElementById('filter-price-min');
  const filterPriceMax = document.getElementById('filter-price-max');
  const filterApplyBtn = document.getElementById('filter-apply');
  const filterClearBtn = document.getElementById('filter-clear');
  const activeFiltersEl = document.getElementById('active-filters');
  const filterToggleBtn = document.querySelector('.filter-toggle-btn');
  const filterSidebar = document.querySelector('.filter-sidebar');

  if (filterToggleBtn && filterSidebar) {
    filterToggleBtn.addEventListener('click', () => {
      filterSidebar.classList.toggle('open');
    });
  }

  if (filterState && !filterState.dataset.init) {
    filterState.dataset.init = '1';
    let html = '<option value="">Todos los estados</option>';
    STATES.forEach(s => {
      html += '<option value="' + s.slug + '">' + escapeHtml(s.name) + '</option>';
    });
    filterState.innerHTML = html;
  }

  if (filterType && !filterType.dataset.init) {
    filterType.dataset.init = '1';
    let html = '<option value="">Todos los tipos</option>';
    PROPERTY_TYPES.forEach(t => {
      html += '<option value="' + t.value + '">' + escapeHtml(t.label) + '</option>';
    });
    filterType.innerHTML = html;
  }

  if (filterOp && !filterOp.dataset.init) {
    filterOp.dataset.init = '1';
    let html = '<option value="">Venta / Arriendo</option>';
    OPERATION_TYPES.forEach(o => {
      html += '<option value="' + o.value + '">' + escapeHtml(o.label) + '</option>';
    });
    filterOp.innerHTML = html;
  }

  function gatherFilters() {
    const params = {};
    if (filterState && filterState.value) params.estado = filterState.value;
    if (filterType && filterType.value) params.tipo = filterType.value;
    if (filterOp && filterOp.value) params.operacion = filterOp.value;
    if (filterPriceMin && filterPriceMin.value) params.precio_min = filterPriceMin.value;
    if (filterPriceMax && filterPriceMax.value) params.precio_max = filterPriceMax.value;
    return params;
  }

  function renderActiveFilters(params) {
    if (!activeFiltersEl) return;
    const labels = {
      estado: STATES.find(s => s.slug === params.estado)?.name,
      tipo: PROPERTY_TYPES.find(t => t.value === params.tipo)?.label,
      operacion: OPERATION_TYPES.find(o => o.value === params.operacion)?.label,
      precio_min: 'Desde ' + formatPrice(params.precio_min),
      precio_max: 'Hasta ' + formatPrice(params.precio_max)
    };
    let html = '';
    Object.entries(params).forEach(([key, value]) => {
      const label = labels[key] || value;
      html += '<span class="filter-tag" data-key="' + key + '">' + escapeHtml(label) + '<span class="filter-tag-remove" data-key="' + key + '">&times;</span></span>';
    });
    if (html) {
      html += '<button class="filter-clear-all" id="filter-clear">Limpiar todo</button>';
    }
    activeFiltersEl.innerHTML = html;

    activeFiltersEl.querySelectorAll('.filter-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (key === 'estado' && filterState) filterState.value = '';
        if (key === 'tipo' && filterType) filterType.value = '';
        if (key === 'operacion' && filterOp) filterOp.value = '';
        if (key === 'precio_min' && filterPriceMin) filterPriceMin.value = '';
        if (key === 'precio_max' && filterPriceMax) filterPriceMax.value = '';
        applyFilters();
      });
    });

    const clearBtn = activeFiltersEl.querySelector('#filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAllFilters);
    }
  }

  function applyFilters() {
    const params = gatherFilters();
    const qs = new URLSearchParams(params).toString();
    window.history.replaceState(null, '', '/properties.html' + (qs ? '?' + qs : ''));
    renderActiveFilters(params);

    if (typeof window.loadProperties === 'function') {
      window.loadProperties(params);
    }
  }

  function clearAllFilters() {
    if (filterState) filterState.value = '';
    if (filterType) filterType.value = '';
    if (filterOp) filterOp.value = '';
    if (filterPriceMin) filterPriceMin.value = '';
    if (filterPriceMax) filterPriceMax.value = '';
    applyFilters();
  }

  if (filterApplyBtn) {
    filterApplyBtn.addEventListener('click', applyFilters);
  }

  if (filterClearBtn) {
    filterClearBtn.addEventListener('click', clearAllFilters);
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (filterState && urlParams.get('estado')) filterState.value = urlParams.get('estado');
  if (filterType && urlParams.get('tipo')) filterType.value = urlParams.get('tipo');
  if (filterOp && urlParams.get('operacion')) filterOp.value = urlParams.get('operacion');
  if (filterPriceMin && urlParams.get('precio_min')) filterPriceMin.value = urlParams.get('precio_min');
  if (filterPriceMax && urlParams.get('precio_max')) filterPriceMax.value = urlParams.get('precio_max');
  renderActiveFilters(gatherFilters());
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE UPLOAD
// ═══════════════════════════════════════════════════════════════════════════
function initImageUpload(inputId, previewContainer) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(previewContainer);
  if (!input || !container) return;

  const uploadedFiles = [];

  const dropZone = input.closest('.upload-area') || input.parentElement;

  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      handleFiles(e.dataTransfer.files);
    });
  }

  input.addEventListener('change', () => {
    handleFiles(input.files);
  });

  function handleFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        showToast('La imagen no debe superar 10MB.', 'warning');
        return;
      }
      uploadedFiles.push(file);
      renderPreview(file, uploadedFiles.length - 1);
    });
  }

  function renderPreview(file, index) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const item = document.createElement('div');
      item.className = 'upload-preview-item';
      item.dataset.index = index;
      item.innerHTML =
        '<img src="' + e.target.result + '" alt="Vista previa">' +
        '<button class="remove-btn" type="button">&times;</button>';

      item.querySelector('.remove-btn').addEventListener('click', () => {
        uploadedFiles.splice(index, 1);
        item.remove();
      });

      container.appendChild(item);
    };
    reader.readAsDataURL(file);
  }

  return {
    getFiles() {
      return uploadedFiles;
    },
    clear() {
      uploadedFiles.length = 0;
      container.innerHTML = '';
      input.value = '';
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LAZY LOADING WITH INTERSECTION OBSERVER
// ═══════════════════════════════════════════════════════════════════════════
function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  if (!images.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.addEventListener('load', () => {
              img.classList.add('loaded');
            });
            img.addEventListener('error', () => {
              img.src = '/images/default-property.jpg';
              img.removeAttribute('data-src');
            });
          }
          obs.unobserve(img);
        }
      });
    }, {
      rootMargin: '200px 0px',
      threshold: 0.01
    });

    images.forEach(img => observer.observe(img));
  } else {
    images.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL ANIMATIONS
// ═══════════════════════════════════════════════════════════════════════════
function initScrollAnimations() {
  const elements = document.querySelectorAll('[data-animate]');
  if (!elements.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1
    });

    elements.forEach(el => {
      el.style.opacity = '0';
      observer.observe(el);
    });
  } else {
    elements.forEach(el => {
      el.style.opacity = '1';
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE DETECTION & ROUTING
// ═══════════════════════════════════════════════════════════════════════════
function detectPage() {
  const path = window.location.pathname;

  if (path === '/' || path.endsWith('index.html')) {
    loadFeaturedProperties();
    loadHomeMap();
    loadStats();
    initScrollAnimations();
  }

  if (path.endsWith('properties.html') || path.includes('/properties') || path.includes('/propiedades')) {
    initPropertiesPage();
  }

  if (path.endsWith('property-detail.html') || path.includes('/property/')) {
    initGallery();
  }

  if (path.endsWith('contacto.html') || path.endsWith('contact.html') || path.includes('/contacto')) {
    initContactForm();
  }

  if (path.endsWith('login.html') || path.includes('/cuenta/login')) {
    initAuthForms();
  }

  if (path.endsWith('register.html') || path.endsWith('registro.html') || path.includes('/cuenta/registro')) {
    initAuthForms();
  }

  if (path.endsWith('admin.html') || path.endsWith('dashboard.html') || path.includes('/admin/')) {
    initAdminPanel();
  }

  if (path.endsWith('new-property.html') || path.includes('/publicar')) {
    const upload = initImageUpload('property-images', 'upload-preview');
    if (upload) {
      window._imageUpload = upload;
    }
  }

  if (path.endsWith('map.html')) {
    initSearchBar();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZE ON DOM READY
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initLazyLoading();
  initScrollAnimations();
  detectPage();
});
