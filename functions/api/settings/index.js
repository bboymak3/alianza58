// functions/api/settings/index.js
// GET /api/settings — Devuelve configuración pública del sitio
// PUT /api/settings — Actualiza configuración (admin only)

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  try {
    const settings = await env.DB.prepare(
      'SELECT site_logo_url, watermark_logo_url, watermark_enabled, public_submissions_enabled, admin_phone, admin_whatsapp FROM site_settings LIMIT 1'
    ).first();

    if (!settings) {
      return json({
        site_logo_url: '',
        watermark_logo_url: '',
        watermark_enabled: 0,
        public_submissions_enabled: 0,
        admin_phone: '',
        admin_whatsapp: '',
      });
    }

    return json(settings);
  } catch (e) {
    return jsonError('Error al obtener settings: ' + e.message, 500);
  }
}

export async function onRequestPut({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!isAdmin(user)) {
    return jsonError('No autorizado. Se requiere rol de administrador', 403);
  }

  if (!env.DB) {
    return jsonError('Base de datos no disponible', 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError('JSON inválido', 400);
  }

  const allowed = [
    'site_logo_url', 'watermark_logo_url', 'watermark_enabled',
    'public_submissions_enabled', 'admin_phone', 'admin_whatsapp',
    'hero_banner_url', 'marketplace_banner_url', 'empleo_banner_url',
    'hero_logo_url', 'contact_email', 'whatsapp_number',
    'businesses_enabled', 'marketplace_enabled', 'jobs_enabled',
  ];

  const updates = [];
  const values = [];

  for (const field of allowed) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      if (['watermark_enabled', 'public_submissions_enabled', 'businesses_enabled', 'marketplace_enabled', 'jobs_enabled'].includes(field)) {
        values.push(body[field] ? 1 : 0);
      } else {
        values.push(body[field]);
      }
    }
  }

  if (updates.length === 0) {
    return jsonError('No se proporcionaron campos para actualizar', 400);
  }

  // Verificar si existe la fila
  const existing = await env.DB.prepare('SELECT id FROM site_settings LIMIT 1').first();
  if (!existing) {
    // Crear fila si no existe
    await env.DB.prepare(
      `INSERT INTO site_settings (site_logo_url, watermark_logo_url, watermark_enabled, public_submissions_enabled, admin_phone, admin_whatsapp) VALUES ('', '', 0, 0, '', '')`
    ).run();
  }

  updates.push("updated_at = datetime('now')");
  values.push(existing?.id || 1);

  await env.DB.prepare(
    `UPDATE site_settings SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const updated = await env.DB.prepare('SELECT * FROM site_settings LIMIT 1').first();
  return json({ message: 'Settings actualizados', settings: updated });
}
