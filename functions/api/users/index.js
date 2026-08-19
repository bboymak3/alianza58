// functions/api/users/index.js
// GET /api/users — Lista usuarios (admin only)
// POST /api/users — Crear usuario (admin only, atajo)

import { getRequestUser, isAdmin, json, jsonError, handleOptions, signJWT, getJwtSecret } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);
  if (!isAdmin(user)) return jsonError('No autorizado', 403);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const users = await env.DB.prepare(
    'SELECT id, name, email, phone, role, avatar, whatsapp, created_at, active FROM users ORDER BY created_at DESC'
  ).all();

  return json({ users: users.results || [] });
}
