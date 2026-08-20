// functions/api/contacts/index.js
// GET  /api/contacts — Lista contactos (admin only)
// POST /api/contacts — Crea un mensaje de contacto público

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);
  if (!isAdmin(user)) return jsonError('No autorizado', 403);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const url = new URL(request.url);
  const onlyUnread = url.searchParams.get('unread') === '1';

  const sql = onlyUnread
    ? 'SELECT c.*, p.title as property_title FROM contacts c LEFT JOIN properties p ON c.property_id = p.id WHERE c.is_read = 0 ORDER BY c.created_at DESC'
    : 'SELECT c.*, p.title as property_title FROM contacts c LEFT JOIN properties p ON c.property_id = p.id ORDER BY c.created_at DESC';

  try {
    const contacts = await env.DB.prepare(sql).all();
    return json({ contacts: contacts.results || [] });
  } catch (e) {
    return jsonError('Error: ' + e.message, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  let body;
  try { body = await request.json(); } catch (e) { return jsonError('JSON inválido', 400); }

  const { name, email, phone, property_id, message } = body;

  if (!name || !message) return jsonError('Nombre y mensaje son requeridos', 400);

  const result = await env.DB.prepare(
    'INSERT INTO contacts (name, email, phone, property_id, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, datetime(\'now\'))'
  ).bind(
    name.trim(),
    email || null,
    phone || null,
    property_id ? parseInt(property_id) : null,
    message
  ).run();

  return json({ message: 'Mensaje enviado', id: result.meta.last_row_id }, 201);
}
