// functions/api/states/index.js
// GET /api/states — Lista todos los estados

import { json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  try {
    const states = await env.DB.prepare(
      'SELECT id, name, slug FROM states ORDER BY name ASC'
    ).all();

    return json({ states: states.results || [] });
  } catch (e) {
    return jsonError('Error al obtener estados: ' + e.message, 500);
  }
}
