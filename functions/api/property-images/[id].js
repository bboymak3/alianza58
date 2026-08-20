// functions/api/property-images/[id].js
// Operaciones sobre una imagen específica por ID.

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

// GET /api/property-images/:id
export async function onRequestGet({ params, env }) {
  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const id = parseInt(params.id);
  if (isNaN(id)) return jsonError('ID inválido', 400);

  const img = await env.DB.prepare(
    'SELECT * FROM property_images WHERE id = ?'
  ).bind(id).first();

  if (!img) return jsonError('Imagen no encontrada', 404);

  return json({ image: img });
}

// PUT /api/property-images/:id — actualizar is_cover, sort_order
export async function onRequestPut({ request, env, params }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const id = parseInt(params.id);
  if (isNaN(id)) return jsonError('ID inválido', 400);

  const img = await env.DB.prepare(
    'SELECT pi.*, p.user_id FROM property_images pi JOIN properties p ON pi.property_id = p.id WHERE pi.id = ?'
  ).bind(id).first();

  if (!img) return jsonError('Imagen no encontrada', 404);
  if (!isAdmin(user) && img.user_id !== user.id) return jsonError('No autorizado', 403);

  let body;
  try { body = await request.json(); } catch (e) { return jsonError('JSON inválido', 400); }

  const updates = [];
  const values = [];
  if (body.is_cover !== undefined) { updates.push('is_cover = ?'); values.push(body.is_cover ? 1 : 0); }
  if (body.sort_order !== undefined) { updates.push('sort_order = ?'); values.push(parseInt(body.sort_order) || 0); }
  if (body.url !== undefined) { updates.push('url = ?'); values.push(body.url); }
  if (body.r2_key !== undefined) { updates.push('r2_key = ?'); values.push(body.r2_key); }

  if (updates.length === 0) return jsonError('Nada que actualizar', 400);

  // Si se está marcando como cover, quitar cover de las demás
  if (body.is_cover) {
    await env.DB.prepare('UPDATE property_images SET is_cover = 0 WHERE property_id = ?').bind(img.property_id).run();
  }

  values.push(id);
  await env.DB.prepare(`UPDATE property_images SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const updated = await env.DB.prepare('SELECT * FROM property_images WHERE id = ?').bind(id).first();
  return json({ message: 'Imagen actualizada', image: updated });
}

// DELETE /api/property-images/:id
export async function onRequestDelete({ request, env, params }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const id = parseInt(params.id);
  if (isNaN(id)) return jsonError('ID inválido', 400);

  const img = await env.DB.prepare(
    'SELECT pi.*, p.user_id FROM property_images pi JOIN properties p ON pi.property_id = p.id WHERE pi.id = ?'
  ).bind(id).first();

  if (!img) return jsonError('Imagen no encontrada', 404);
  if (!isAdmin(user) && img.user_id !== user.id) return jsonError('No autorizado', 403);

  if (img.r2_key && env.MEDIA) {
    try { await env.MEDIA.delete(img.r2_key); } catch (e) { console.warn('R2 delete failed:', e); }
  }

  await env.DB.prepare('DELETE FROM property_images WHERE id = ?').bind(id).run();
  return json({ message: 'Imagen eliminada' });
}
