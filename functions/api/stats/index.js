// functions/api/stats/index.js
// GET /api/stats — Estadísticas públicas del sitio

import { json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ env }) {
  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  try {
    const total = await env.DB.prepare("SELECT COUNT(*) as c FROM properties WHERE status = 'approved'").first();
    const users = await env.DB.prepare('SELECT COUNT(*) as c FROM users WHERE active = 1').first();
    const states = await env.DB.prepare('SELECT COUNT(*) as c FROM states').first();

    const byState = await env.DB.prepare(
      "SELECT state, COUNT(*) as count FROM properties WHERE status = 'approved' GROUP BY state ORDER BY count DESC LIMIT 15"
    ).all();

    const byType = await env.DB.prepare(
      "SELECT property_type, COUNT(*) as count FROM properties WHERE status = 'approved' GROUP BY property_type ORDER BY count DESC"
    ).all();

    const byOperation = await env.DB.prepare(
      "SELECT operation_type, COUNT(*) as count FROM properties WHERE status = 'approved' GROUP BY operation_type ORDER BY count DESC"
    ).all();

    return json({
      total_properties: total?.c || 0,
      approved_properties: total?.c || 0,
      users: users?.c || 0,
      states: states?.c || 0,
      by_state: byState.results || [],
      by_type: byType.results || [],
      by_operation: byOperation.results || [],
    });
  } catch (e) {
    return jsonError('Error: ' + e.message, 500);
  }
}
