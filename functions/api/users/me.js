// functions/api/users/me.js
// GET /api/users/me — Devuelve el usuario autenticado (alias de /api/auth/me)

import { getRequestUser, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('No autenticado', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const fullUser = await env.DB.prepare(
    'SELECT id, name, email, phone, role, avatar, whatsapp, created_at, active FROM users WHERE id = ?'
  ).bind(user.id).first();

  if (!fullUser) return jsonError('Usuario no encontrado', 404);

  return json({ user: fullUser });
}
