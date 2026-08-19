// functions/api/users/[id].js
// GET /api/users/:id — Detalle de un usuario (admin o propio)
// PUT /api/users/:id — Actualizar usuario

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env, params }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  const id = parseInt(params.id);
  if (isNaN(id)) return jsonError('ID inválido', 400);

  if (id !== user.id && !isAdmin(user)) return jsonError('No autorizado', 403);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const target = await env.DB.prepare(
    'SELECT id, name, email, phone, role, avatar, whatsapp, created_at, active FROM users WHERE id = ?'
  ).bind(id).first();

  if (!target) return jsonError('Usuario no encontrado', 404);

  return json({ user: target });
}

export async function onRequestPut({ request, env, params }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  const id = parseInt(params.id);
  if (isNaN(id)) return jsonError('ID inválido', 400);

  if (id !== user.id && !isAdmin(user)) return jsonError('No autorizado', 403);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  let body;
  try { body = await request.json(); } catch (e) { return jsonError('JSON inválido', 400); }

  const allowed = ['name', 'phone', 'avatar', 'whatsapp'];
  if (isAdmin(user)) allowed.push('role', 'active');

  const updates = [];
  const values = [];
  for (const f of allowed) {
    if (body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(f === 'active' ? (body[f] ? 1 : 0) : body[f]);
    }
  }

  if (body.password) {
    updates.push('password_hash = ?');
    values.push(body.password); // texto plano legacy
  }

  if (updates.length === 0) return jsonError('Nada que actualizar', 400);

  values.push(id);
  await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

  const updated = await env.DB.prepare(
    'SELECT id, name, email, phone, role, avatar, whatsapp, created_at, active FROM users WHERE id = ?'
  ).bind(id).first();

  return json({ message: 'Usuario actualizado', user: updated });
}
