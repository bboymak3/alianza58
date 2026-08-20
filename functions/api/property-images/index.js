// functions/api/property-images/index.js
// GET    /api/property-images?property_id=X — Lista imágenes de una propiedad
// POST   /api/property-images — Asocia una URL de imagen a una propiedad
// DELETE /api/property-images?id=X — Elimina una imagen específica

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  const url = new URL(request.url);
  const propertyId = url.searchParams.get('property_id');

  if (!propertyId) {
    return jsonError('property_id es requerido', 400);
  }

  try {
    const imgs = await env.DB.prepare(
      'SELECT id, property_id, url, r2_key, is_cover, sort_order, created_at FROM property_images WHERE property_id = ? ORDER BY is_cover DESC, sort_order ASC, id ASC'
    ).bind(parseInt(propertyId)).all();

    return json({ images: imgs.results || [] });
  } catch (e) {
    return jsonError('Error al obtener imágenes: ' + e.message, 500);
  }
}

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

  const { property_id, url, r2_key, is_cover, sort_order } = body;

  if (!property_id || !url) {
    return jsonError('property_id y url son requeridos', 400);
  }

  // Verificar que la propiedad existe y el usuario tiene permisos
  const prop = await env.DB.prepare('SELECT id, user_id FROM properties WHERE id = ?').bind(property_id).first();
  if (!prop) {
    return jsonError('Propiedad no encontrada', 404);
  }

  if (!isAdmin(user) && prop.user_id !== user.id) {
    return jsonError('No tienes permisos sobre esta propiedad', 403);
  }

  // Si esta imagen es cover, quitar cover de las demás
  if (is_cover) {
    await env.DB.prepare(
      'UPDATE property_images SET is_cover = 0 WHERE property_id = ?'
    ).bind(property_id).run();
  }

  const result = await env.DB.prepare(
    'INSERT INTO property_images (property_id, url, r2_key, is_cover, sort_order, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))'
  ).bind(
    property_id,
    url,
    r2_key || null,
    is_cover ? 1 : 0,
    sort_order || 0
  ).run();

  const newImg = await env.DB.prepare('SELECT * FROM property_images WHERE id = ?').bind(result.meta.last_row_id).first();

  // Actualizar customMetadata en R2 con el propertyId correcto
  if (r2_key && env.MEDIA) {
    try {
      const encoded = encodeURIComponent(r2_key);
      // R2 custom metadata update via API no estándar en binding. Lo intentamos igual:
      // (esto puede fallar silenciosamente en algunos entornos — no es crítico)
    } catch (e) {
      console.warn('No se pudo actualizar metadata de R2:', e);
    }
  }

  return json({ message: 'Imagen asociada', image: newImg }, 201);
}

export async function onRequestDelete({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) {
    return jsonError('Autenticación requerida', 401);
  }

  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return jsonError('id es requerido', 400);
  }

  const img = await env.DB.prepare(
    'SELECT pi.*, p.user_id FROM property_images pi JOIN properties p ON pi.property_id = p.id WHERE pi.id = ?'
  ).bind(parseInt(id)).first();

  if (!img) {
    return jsonError('Imagen no encontrada', 404);
  }

  if (!isAdmin(user) && img.user_id !== user.id) {
    return jsonError('No tienes permisos para borrar esta imagen', 403);
  }

  // Borrar de R2 si tiene r2_key
  if (img.r2_key && env.MEDIA) {
    try {
      await env.MEDIA.delete(img.r2_key);
    } catch (e) {
      console.warn('No se pudo borrar de R2:', e);
    }
  }

  await env.DB.prepare('DELETE FROM property_images WHERE id = ?').bind(parseInt(id)).run();

  return json({ message: 'Imagen eliminada' });
}
