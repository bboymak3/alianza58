// functions/api/auth/logout.js
// POST /api/auth/logout — No-op (el JWT se invalida por expiración, no se guarda blacklist)

import { json, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestPost() {
  return json({ message: 'Sesión cerrada' });
}
