// functions/api/properties/[id].js
// GET    /api/properties/:id — Detalle de propiedad + similares
// PUT    /api/properties/:id — Actualizar (admin o dueño)
// DELETE /api/properties/:id — Eliminar (admin o dueño)

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
  const imgs = await env.DB.prepare(
    'SELECT id, property_id, url, r2_key, is_cover, sort_order, created_at FROM property_images WHERE property_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC'
  ).bind(propertyId).all();
  return imgs.results || [];
}

async function fetchSimilar(env, prop) {
  try {
    const similar = await env.DB.prepare(
      `SELECT p.id, p.title, p.slug, p.property_type, p.operation_type, p.price, p.currency,
              p.city, p.state, p.state_slug, p.bedrooms, p.bathrooms, p.area,
              (SELECT url FROM property_images WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image
       FROM properties p
       WHERE p.id != ? AND p.status = 'approved'
         AND (p.property_type = ? OR p.operation_type = ? OR p.state = ?)
       ORDER BY p.featured DESC, p.views DESC
       LIMIT 3`
    ).bind(prop.id, prop.property_type, prop.operation_type, prop.state).all();
    return similar.results || [];
  } catch (e) {
    return [];
  }
}

// ─── GET: detalle de propiedad ───────────────────────────────
export async function onRequestGet({ request, env, params }) {
  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  const idParam = params.id;
  let property;

  // Buscar por ID (numérico) o por slug
  if (/^\d+$/.test(idParam)) {
    property = await env.DB.prepare(
      `SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.whatsapp as owner_whatsapp
       FROM properties p LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`
    ).bind(parseInt(idParam)).first();
  } else {
    property = await env.DB.prepare(
      `SELECT p.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone, u.whatsapp as owner_whatsapp
       FROM properties p LEFT JOIN users u ON p.user_id = u.id
       WHERE p.slug = ?`
    ).bind(idParam).first();
  }

  if (!property) {
    return jsonError('Propiedad no encontrada', 404);
  }

  // Si no es admin y la propiedad no está aprobada, denegar
  const user = await getRequestUser(request, env);
  if (property.status !== 'approved' && !isAdmin(user) && property.user_id !== user?.id) {
    return jsonError('Propiedad no encontrada', 404);
  }

  // Incrementar views (sin bloquear la respuesta)
  try {
    await env.DB.prepare('UPDATE properties SET views = views + 1 WHERE id = ?').bind(property.id).run();
  } catch (e) {
    console.warn('No se pudo incrementar views:', e);
  }

  const images = await fetchImagesForProperty(env, property.id);
  const cover = images.find(i => i.is_cover === 1) || images[0] || null;
  const similar = await fetchSimilar(env, property);

  return json({
    property: {
      ...property,
      images: images.map(i => ({
        id: i.id,
        property_id: i.property_id,
        url: i.url,
        r2_key: i.r2_key,
        is_cover: i.is_cover,
        sort_order: i.sort_order,
        created_at: i.created_at,
      })),
      cover_image: cover?.url || '/images/default-property.jpg',
    },
    similar,
  });
}

// ─── PUT: actualizar propiedad ───────────────────────────────
export async function onRequestPut({ request, env, params }) {
  const user = await getRequestUser(request, env);
  if (!user) {
    return jsonError('Autenticación requerida', 401);
  }

  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return jsonError('ID inválido', 400);
  }

  // Verificar que existe y el usuario tiene permisos
  const existing = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first();
  if (!existing) {
    return jsonError('Propiedad no encontrada', 404);
  }

  if (!isAdmin(user) && existing.user_id !== user.id) {
    return jsonError('No tienes permisos para editar esta propiedad', 403);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('JSON inválido', 400);
  }

  const allowed = [
    'title', 'description', 'property_type', 'operation_type', 'price', 'currency',
    'area', 'bedrooms', 'bathrooms', 'parking_spaces', 'floors', 'year_built',
    'address', 'city', 'state', 'lat', 'lng', 'youtube_url', 'featured', 'status',
    'seo_title', 'seo_description', 'features', 'sort_order',
    'land_area', 'construction_area',
  ];

  const updates = [];
  const values = [];

  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      // Coerción de tipos
      if (['price', 'area', 'lat', 'lng', 'land_area', 'construction_area'].includes(field)) {
        values.push(body[field] === null || body[field] === '' ? null : parseFloat(body[field]) || 0);
      } else if (['bedrooms', 'bathrooms', 'parking_spaces', 'floors', 'year_built'].includes(field)) {
        values.push(body[field] === null || body[field] === '' ? null : parseInt(body[field]) || 0);
      } else if (['featured'].includes(field)) {
        values.push(body[field] ? 1 : 0);
      } else {
        values.push(body[field]);
      }
    }
  }

  // Si cambia el título, regenerar slug
  if (body.title && body.title !== existing.title) {
    const newSlug = slugify(body.title);
    // Verificar que no exista (excepto esta misma)
    const slugOwner = await env.DB.prepare(
      'SELECT id FROM properties WHERE slug = ? AND id != ?'
    ).bind(newSlug, id).first();
    if (!slugOwner) {
      updates.push('slug = ?');
      values.push(newSlug);
    }
  }

  // State slug si cambia state
  if (body.state && body.state !== existing.state) {
    updates.push('state_slug = ?');
    values.push(slugify(body.state));
  }

  // Si no hay campos para actualizar PERO hay imágenes, permitir el PUT
  // (solo para actualizar imágenes/portada)
  if (updates.length === 0 && !Array.isArray(body.images)) {
    return jsonError('No se proporcionaron campos para actualizar', 400);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);

    await env.DB.prepare(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();
  }

  // Manejo de imágenes: si body.images viene como array, reemplazar
  if (Array.isArray(body.images)) {
    // Borrar imágenes existentes
    await env.DB.prepare('DELETE FROM property_images WHERE property_id = ?').bind(id).run();

    if (body.images.length > 0) {
      for (let i = 0; i < body.images.length; i++) {
        const item = body.images[i];
        // Aceptar tanto string (URL) como objeto {url, is_cover}
        const url = typeof item === 'string' ? item : item.url;
        const isCover = typeof item === 'object' && item.is_cover === 1 ? 1 : (i === 0 ? 1 : 0);
        if (!url) continue;
        let r2Key = null;
        const match = url.match(/[?&]key=([^&]+)/);
        if (match) r2Key = decodeURIComponent(match[1]);
        await env.DB.prepare(
          'INSERT INTO property_images (property_id, url, r2_key, is_cover, sort_order, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
        ).bind(id, url, r2Key, isCover, i).run();
      }
    } else {
      // Sin imágenes → default
      await env.DB.prepare(
        'INSERT INTO property_images (property_id, url, r2_key, is_cover, sort_order, created_at) VALUES (?, ?, NULL, 1, 0, datetime(\'now\'))'
      ).bind(id, '/images/default-property.jpg').run();
    }
  }

  // Recuperar la propiedad actualizada
  const updated = await env.DB.prepare('SELECT * FROM properties WHERE id = ?').bind(id).first();
  const images = await fetchImagesForProperty(env, id);
  const cover = images.find(i => i.is_cover === 1) || images[0] || null;

  return json({
    message: 'Propiedad actualizada',
    property: {
      ...updated,
      images,
      cover_image: cover?.url || '/images/default-property.jpg',
    },
  });
}

// ─── DELETE: eliminar propiedad ──────────────────────────────
export async function onRequestDelete({ request, env, params }) {
  const user = await getRequestUser(request, env);
  if (!user) {
    return jsonError('Autenticación requerida', 401);
  }

  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  const id = parseInt(params.id);
  if (isNaN(id)) {
    return jsonError('ID inválido', 400);
  }

  const existing = await env.DB.prepare('SELECT id, user_id FROM properties WHERE id = ?').bind(id).first();
  if (!existing) {
    return jsonError('Propiedad no encontrada', 404);
  }

  if (!isAdmin(user) && existing.user_id !== user.id) {
    return jsonError('No tienes permisos para eliminar esta propiedad', 403);
  }

  // Borrar imágenes asociadas de la BD
  await env.DB.prepare('DELETE FROM property_images WHERE property_id = ?').bind(id).run();

  // Borrar propiedad
  await env.DB.prepare('DELETE FROM properties WHERE id = ?').bind(id).run();

  return json({ message: 'Propiedad eliminada correctamente' });
}
