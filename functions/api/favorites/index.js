// functions/api/favorites/index.js
// GET  /api/favorites — Lista favoritos del usuario autenticado
// POST /api/favorites — Agrega un favorito { property_id }
// DELETE /api/favorites?id=X — Elimina un favorito por ID

import { getRequestUser, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  try {
    const favs = await env.DB.prepare(
      `SELECT f.id, f.created_at, p.id as property_id, p.title, p.slug, p.price, p.currency,
              p.city, p.state, p.property_type, p.operation_type,
              (SELECT url FROM property_images WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image
       FROM favorites f
       JOIN properties p ON f.property_id = p.id
       WHERE f.user_id = ? AND p.status = 'approved'
       ORDER BY f.created_at DESC`
    ).bind(user.id).all();

    return json({ favorites: favs.results || [] });
  } catch (e) {
    return jsonError('Error: ' + e.message, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  let body;
  try { body = await request.json(); } catch (e) { return jsonError('JSON inválido', 400); }

  const { property_id } = body;
  if (!property_id) return jsonError('property_id es requerido', 400);

  // Verificar que no exista ya
  const existing = await env.DB.prepare(
    'SELECT id FROM favorites WHERE user_id = ? AND property_id = ?'
  ).bind(user.id, parseInt(property_id)).first();

  if (existing) return json({ message: 'Ya es favorito', id: existing.id });

  const result = await env.DB.prepare(
    'INSERT INTO favorites (user_id, property_id, created_at) VALUES (?, ?, datetime(\'now\'))'
  ).bind(user.id, parseInt(property_id)).run();

  return json({ message: 'Favorito agregado', id: result.meta.last_row_id }, 201);
}

export async function onRequestDelete({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id') || url.searchParams.get('id');

  if (propertyId) {
    await env.DB.prepare(
      'DELETE FROM favorites WHERE user_id = ? AND property_id = ?'
    ).bind(user.id, parseInt(propertyId)).run();
  }

  return json({ message: 'Favorito eliminado' });
}
