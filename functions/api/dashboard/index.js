// functions/api/dashboard/index.js
// GET /api/dashboard — Estadísticas para el dashboard del usuario

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  let stats = {};

  if (isAdmin(user)) {
    // Stats admin
    const totalProps = await env.DB.prepare('SELECT COUNT(*) as c FROM properties').first();
    const approved = await env.DB.prepare("SELECT COUNT(*) as c FROM properties WHERE status = 'approved'").first();
    const pending = await env.DB.prepare("SELECT COUNT(*) as c FROM properties WHERE status = 'pending'").first();
    const users = await env.DB.prepare('SELECT COUNT(*) as c FROM users').first();
    const states = await env.DB.prepare('SELECT COUNT(*) as c FROM states').first();
    const views = await env.DB.prepare('SELECT COALESCE(SUM(views), 0) as s FROM properties').first();
    const unread = await env.DB.prepare('SELECT COUNT(*) as c FROM contacts WHERE is_read = 0').first();

    stats = {
      total_properties: totalProps?.c || 0,
      approved_properties: approved?.c || 0,
      pending_properties: pending?.c || 0,
      users: users?.c || 0,
      states: states?.c || 0,
      total_views: views?.s || 0,
      unread_messages: unread?.c || 0,
    };
  } else {
    // Stats de usuario normal
    const myProps = await env.DB.prepare(
      'SELECT COUNT(*) as c, COALESCE(SUM(views), 0) as v FROM properties WHERE user_id = ?'
    ).bind(user.id).first();
    const myFavs = await env.DB.prepare('SELECT COUNT(*) as c FROM favorites WHERE user_id = ?').bind(user.id).first();

    stats = {
      my_properties: myProps?.c || 0,
      my_views: myProps?.v || 0,
      my_favorites: myFavs?.c || 0,
    };
  }

  return json(stats);
}
