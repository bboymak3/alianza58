// functions/api/auth/register.js
// POST /api/auth/register
// Body: { name, email, phone, password, whatsapp? }
// Returns: { token, user }

import { signJWT, getJwtSecret, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('JSON inválido', 400);
  }

  const { name, email, phone, password, whatsapp } = body;
  if (!name || !email || !password) {
    return jsonError('Nombre, email y password son requeridos', 400);
  }

  // Verificar si el email ya existe
  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email.trim().toLowerCase()).first();

  if (existing) {
    return jsonError('Ya existe un usuario con este email', 409);
  }

  // Crear usuario (password en texto plano para mantener compatibilidad con backend existente)
  const result = await env.DB.prepare(
    'INSERT INTO users (name, email, phone, password_hash, role, whatsapp, active) VALUES (?, ?, ?, ?, ?, ?, 1)'
  ).bind(
    name.trim(),
    email.trim().toLowerCase(),
    phone || null,
    password,  // texto plano (legacy)
    'user',
    whatsapp || null
  ).run();

  const userId = result.meta.last_row_id;
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

  const token = await signJWT(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    getJwtSecret(env)
  );

  return json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      whatsapp: user.whatsapp,
      created_at: user.created_at,
      active: user.active,
    },
  }, 201);
}
