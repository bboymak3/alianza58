// functions/api/auth/login.js
// POST /api/auth/login
// Body: { email, password }
// Returns: { token, user }

import { signJWT, getJwtSecret, json, jsonError, handleOptions, corsHeaders } from '../../_lib/auth.js';

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

  const { email, password } = body;
  if (!email || !password) {
    return jsonError('Email y password son requeridos', 400);
  }

  // Buscar usuario por email
  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE email = ? AND active = 1'
  ).bind(email.trim().toLowerCase()).first();

  if (!user) {
    return jsonError('Credenciales inválidas', 401);
  }

  // Verificar password — el backend actual usa texto plano (NO seguro pero compatible)
  // Si password_hash empieza con $2b$, es bcrypt (futuro). Si no, es texto plano.
  let valid = false;
  if (user.password_hash && user.password_hash.startsWith('$2b$')) {
    // TODO: implementar bcrypt si en el futuro se migra
    valid = false;
  } else {
    valid = (user.password_hash === password);
  }

  if (!valid) {
    return jsonError('Credenciales inválidas', 401);
  }

  // Generar JWT
  const token = await signJWT(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    getJwtSecret(env)
  );

  // Devolver respuesta
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    whatsapp: user.whatsapp,
    created_at: user.created_at,
    active: user.active,
  };

  return json({ token, user: safeUser });
}
