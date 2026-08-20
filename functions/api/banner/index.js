// functions/api/banner/index.js
// GET /api/banner — Devuelve la configuración del banner del hero.
// PUT /api/banner — Actualiza el banner (admin only).
//
// El banner se guarda en site_settings como campos individuales:
//   hero_banner_url, hero_banner_title, hero_banner_subtitle,
//   hero_banner_link, hero_banner_link_text, hero_banner_enabled

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
      'SELECT * FROM site_settings LIMIT 1'
    ).first();

    if (!settings) {
      return json({
        banner: {
          enabled: false,
          image_url: null,
          title: null,
          subtitle: null,
          link: null,
          link_text: null,
        }
      });
    }

    return json({
      banner: {
        enabled: !!settings.hero_banner_enabled,
        image_url: settings.hero_banner_url || null,
        title: settings.hero_banner_title || null,
        subtitle: settings.hero_banner_subtitle || null,
        link: settings.hero_banner_link || null,
        link_text: settings.hero_banner_link_text || null,
      }
    });
  } catch (e) {
    return jsonError('Error al obtener banner: ' + e.message, 500);
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

  const banner = body.banner || body;

  const allowed = [
    'hero_banner_url', 'hero_banner_title', 'hero_banner_subtitle',
    'hero_banner_link', 'hero_banner_link_text',
  ];

  const updates = [];
  const values = [];

  for (const field of allowed) {
    if (banner[field] !== undefined || (field === 'hero_banner_url' && banner.image_url !== undefined)) {
      updates.push(`${field} = ?`);
      // Mapear image_url → hero_banner_url
      const val = field === 'hero_banner_url' && banner.image_url !== undefined
        ? banner.image_url
        : banner[field];
      values.push(val);
    }
  }

  // Manejar 'enabled' por separado (es boolean → integer)
  if (banner.enabled !== undefined) {
    updates.push('hero_banner_enabled = ?');
    values.push(banner.enabled ? 1 : 0);
  }

  if (updates.length === 0) {
    return jsonError('No se proporcionaron campos para actualizar', 400);
  }

  // Verificar si existe la fila
  const existing = await env.DB.prepare('SELECT id FROM site_settings LIMIT 1').first();
  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO site_settings (site_logo_url, watermark_logo_url, watermark_enabled, public_submissions_enabled, admin_phone, admin_whatsapp) VALUES ('', '', 0, 0, '', '')`
    ).run();
  }

  values.push(existing?.id || 1);

  try {
    await env.DB.prepare(
      `UPDATE site_settings SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return json({ message: 'Banner actualizado' });
  } catch (e) {
    return jsonError('Error al actualizar banner: ' + e.message, 500);
  }
}
