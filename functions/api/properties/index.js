// functions/api/properties/index.js
// GET  /api/properties — Lista propiedades aprobadas con filtros y paginación
// POST /api/properties — Crea una nueva propiedad (requiere auth)
//
// Filtros soportados (query string):
//   page, limit, estado (state), operacion (operation_type),
//   tipo (property_type), precio_min, precio_max,
//   habitaciones (bedrooms), q (búsqueda texto),
//   destacado, orden (recientes|precio_asc|precio_desc|vistas)

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

function slugify(text) {
  return (text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 120) || 'propiedad';
}

async function fetchImagesForProperty(env, propertyId) {
  try {
    const imgs = await env.DB.prepare(
      'SELECT id, property_id, url, r2_key, is_cover, sort_order, created_at FROM property_images WHERE property_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC'
    ).bind(propertyId).all();
    return imgs.results || [];
  } catch (e) {
    return [];
  }
}

async function fetchImagesForProperties(env, propertyIds) {
  if (!propertyIds.length) return {};
  try {
    const placeholders = propertyIds.map(() => '?').join(',');
    const imgs = await env.DB.prepare(
      `SELECT id, property_id, url, r2_key, is_cover, sort_order FROM property_images WHERE property_id IN (${placeholders}) ORDER BY is_cover DESC, sort_order ASC`
    ).bind(...propertyIds).all();
    const map = {};
    for (const img of (imgs.results || [])) {
      if (!map[img.property_id]) map[img.property_id] = [];
      map[img.property_id].push(img);
    }
    return map;
  } catch (e) {
    return {};
  }
}

// ─── GET: Listar propiedades ─────────────────────────────────
export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  const url = new URL(request.url);
  const params = url.searchParams;

  const page = Math.max(1, parseInt(params.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '12')));
  const offset = (page - 1) * limit;

  const estado = params.get('estado') || params.get('state');
  const operacion = params.get('operacion') || params.get('operation_type');
  const tipo = params.get('tipo') || params.get('property_type');
  const precioMin = parseFloat(params.get('precio_min') || '0') || 0;
  const precioMax = parseFloat(params.get('precio_max') || '0') || 0;
  const habitaciones = parseInt(params.get('habitaciones') || '0') || 0;
  const q = (params.get('q') || params.get('search') || '').trim();
  // Aceptar tanto 'destacado' (ES) como 'featured' (EN) para filtrar destacadas
  const destacado = params.get('destacado') || params.get('featured');
  const orden = params.get('orden') || 'recientes';
  const estadoSlug = params.get('estado_slug');

  // Si es admin y pide status=pending, mostrar pendientes. Sino solo approved.
  const user = await getRequestUser(request, env);
  const isAdminReq = isAdmin(user);
  const statusParam = params.get('status');

  // Construir WHERE dinámico
  const where = [];
  const binds = [];

  // Filtro por status:
  // - admin puede pasar 'all' para ver TODAS (incluida pendientes, rechazadas, etc.)
  // - admin puede pasar un status específico ('pending', 'approved', 'rejected')
  // - si no es admin, siempre solo 'approved'
  if (statusParam === 'all' && isAdminReq) {
    // No filtrar por status — devolver todas
  } else if (statusParam && isAdminReq) {
    where.push('p.status = ?');
    binds.push(statusParam);
  } else {
    where.push('p.status = ?');
    binds.push('approved');
  }

  if (estado) {
    where.push('p.state = ?');
    binds.push(estado);
  }
  if (estadoSlug) {
    where.push('p.state_slug = ?');
    binds.push(estadoSlug);
  }
  if (operacion) {
    where.push('p.operation_type = ?');
    binds.push(operacion);
  }
  if (tipo) {
    where.push('p.property_type = ?');
    binds.push(tipo);
  }
  if (precioMin > 0) {
    where.push('p.price >= ?');
    binds.push(precioMin);
  }
  if (precioMax > 0) {
    where.push('p.price <= ?');
    binds.push(precioMax);
  }
  if (habitaciones > 0) {
    where.push('p.bedrooms >= ?');
    binds.push(habitaciones);
  }
  if (q) {
    where.push('(p.title LIKE ? OR p.description LIKE ? OR p.city LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  if (destacado === 'true' || destacado === '1') {
    where.push('p.featured = 1');
  }

  // Orden — aceptar valores en español (frontend) e inglés
  const ordenParam = orden || params.get('sort') || 'recientes';
  let orderClause = 'p.created_at DESC';
  if (ordenParam === 'precio_asc' || ordenParam === 'precio_menor') orderClause = 'p.price ASC';
  else if (ordenParam === 'precio_desc' || ordenParam === 'precio_mayor') orderClause = 'p.price DESC';
  else if (ordenParam === 'vistas' || ordenParam === 'mas_vistos') orderClause = 'p.views DESC';
  else if (ordenParam === 'newest' || ordenParam === 'recientes') orderClause = 'p.created_at DESC';
  else if (ordenParam === 'oldest') orderClause = 'p.created_at ASC';

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  // Query principal
  const sql = `
    SELECT p.id, p.user_id, p.title, p.slug, p.description, p.property_type,
           p.operation_type, p.price, p.currency, p.area, p.bedrooms, p.bathrooms,
           p.parking_spaces, p.floors, p.year_built, p.address, p.city, p.state,
           p.state_slug, p.lat, p.lng, p.youtube_url, p.featured, p.status,
           p.views, p.created_at, p.updated_at, p.expires_at,
           p.seo_title, p.seo_description, p.features, p.sort_order,
           p.land_area, p.construction_area,
           u.name as owner_name, u.email as owner_email, u.phone as owner_phone,
           u.whatsapp as owner_whatsapp
    FROM properties p
    LEFT JOIN users u ON p.user_id = u.id
    ${whereClause}
    ORDER BY p.featured DESC, p.sort_order ASC, ${orderClause}
    LIMIT ? OFFSET ?
  `;

  let properties;
  try {
    properties = await env.DB.prepare(sql).bind(...binds, limit, offset).all();
  } catch (e) {
    return jsonError('Error al consultar propiedades: ' + e.message, 500);
  }

  // Conteo total para paginación
  const countSql = `SELECT COUNT(*) as total FROM properties p ${whereClause}`;
  let total = 0;
  try {
    const countResult = await env.DB.prepare(countSql).bind(...binds).first();
    total = countResult?.total || 0;
  } catch (e) {
    console.error('Count error:', e);
  }

  // Adjuntar imágenes
  const propIds = (properties.results || []).map(p => p.id);
  const imagesByProp = await fetchImagesForProperties(env, propIds);

  const result = (properties.results || []).map(p => {
    const imgs = imagesByProp[p.id] || [];
    const cover = imgs.find(i => i.is_cover === 1) || imgs[0] || null;
    return {
      ...p,
      cover_image: cover?.url || '/images/default-property.jpg',
      images: imgs.map(i => ({
        id: i.id,
        url: i.url,
        r2_key: i.r2_key,
        is_cover: i.is_cover,
        sort_order: i.sort_order,
      })),
    };
  });

  return json({
    properties: result,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

// ─── POST: Crear propiedad ───────────────────────────────────
export async function onRequestPost({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) {
    return jsonError('Autenticación requerida', 401);
  }

  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('JSON inválido', 400);
  }

  const {
    title, description, property_type, operation_type, price, currency,
    area, bedrooms, bathrooms, parking_spaces, floors, year_built,
    address, city, state, lat, lng, youtube_url, featured, status,
    seo_title, seo_description, features, sort_order,
    land_area, construction_area,
    images,  // ← array de URLs de imágenes subidas previamente
  } = body;

  if (!title || !title.trim()) {
    return jsonError('El título es requerido', 400);
  }

  // Generar slug único
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 1;
  while (await env.DB.prepare('SELECT id FROM properties WHERE slug = ?').bind(slug).first()) {
    slug = `${baseSlug}-${suffix++}`;
  }

  // State slug
  const stateSlug = state ? slugify(state) : 'barinas';

  // Status por defecto: si es admin, puede forzar approved; si no, pending
  const finalStatus = isAdmin(user) ? (status || 'approved') : 'pending';

  // Insertar propiedad
  const result = await env.DB.prepare(
    `INSERT INTO properties (
      user_id, title, slug, description, property_type, operation_type,
      price, currency, area, bedrooms, bathrooms, parking_spaces, floors, year_built,
      address, city, state, state_slug, lat, lng, youtube_url, featured, status, views,
      created_at, updated_at, seo_title, seo_description, features, sort_order,
      land_area, construction_area
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'), ?, ?, ?, ?, ?, ?)`
  ).bind(
    user.id,
    title.trim(),
    slug,
    description || null,
    property_type || 'casa',
    operation_type || 'venta',
    parseFloat(price) || 0,
    currency || 'USD',
    parseFloat(area) || 0,
    parseInt(bedrooms) || 0,
    parseInt(bathrooms) || 0,
    parseInt(parking_spaces) || 0,
    floors ? parseInt(floors) : null,
    year_built ? parseInt(year_built) : null,
    address || null,
    city || 'Barinas',
    state || 'Barinas',
    stateSlug,
    parseFloat(lat) || null,
    parseFloat(lng) || null,
    youtube_url || null,
    featured ? 1 : 0,
    finalStatus,
    seo_title || null,
    seo_description || null,
    features || null,
    parseInt(sort_order) || 0,
    parseFloat(land_area) || null,
    parseFloat(construction_area) || null
  ).run();

  const propertyId = result.meta.last_row_id;

  // Asociar imágenes si vienen en el body
  let attachedImages = [];
  if (Array.isArray(images) && images.length > 0) {
    for (let i = 0; i < images.length; i++) {
      const url = images[i];
      // La URL viene como /api/serve?key=... — extraer la r2_key
      let r2Key = null;
      const match = url.match(/[?&]key=([^&]+)/);
      if (match) {
        r2Key = decodeURIComponent(match[1]);
      }
      await env.DB.prepare(
        'INSERT INTO property_images (property_id, url, r2_key, is_cover, sort_order, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
      ).bind(
        propertyId,
        url,
        r2Key,
        i === 0 ? 1 : 0,
        i
      ).run();
      attachedImages.push({ url, r2_key: r2Key, is_cover: i === 0, sort_order: i });
    }
  } else {
    // Si no hay imágenes, insertar la default como cover
    await env.DB.prepare(
      'INSERT INTO property_images (property_id, url, r2_key, is_cover, sort_order, created_at) VALUES (?, ?, NULL, 1, 0, datetime(\'now\'))'
    ).bind(propertyId, '/images/default-property.jpg').run();
  }

  // Recuperar la propiedad creada
  const newProp = await env.DB.prepare(
    'SELECT * FROM properties WHERE id = ?'
  ).bind(propertyId).first();

  return json({
    message: 'Propiedad creada',
    property: {
      ...newProp,
      images: attachedImages,
      cover_image: attachedImages[0]?.url || '/images/default-property.jpg',
    },
  }, 201);
}
