// functions/api/favorites/check.js
// GET /api/favorites/check?property_id=X — ¿Es favorito del usuario autenticado?

import { getRequestUser, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id');

  if (!propertyId) return jsonError('property_id es requerido', 400);

  const fav = await env.DB.prepare(
    'SELECT id FROM favorites WHERE user_id = ? AND property_id = ?'
  ).bind(user.id, parseInt(propertyId)).first();

  return json({ is_favorite: !!fav, id: fav?.id || null });
}
