// functions/api/admin/properties/index.js
// GET /api/admin/properties — Lista todas las propiedades (admin only, incluye pendientes)

import { getRequestUser, isAdmin, json, jsonError, handleOptions } from '../../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

export async function onRequestGet({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);
  if (!isAdmin(user)) return jsonError('No autorizado', 403);

  if (!env.DB) return jsonError('Base de datos no disponible', 500);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
  const offset = (page - 1) * limit;

  let whereClause = '';
  const binds = [];
  if (status) {
    whereClause = 'WHERE p.status = ?';
    binds.push(status);
  }

  try {
    const props = await env.DB.prepare(
      `SELECT p.*, u.name as owner_name, u.email as owner_email,
              (SELECT url FROM property_images WHERE property_id = p.id AND is_cover = 1 LIMIT 1) as cover_image,
              (SELECT COUNT(*) FROM property_images WHERE property_id = p.id) as images_count
       FROM properties p
       LEFT JOIN users u ON p.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all();

    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM properties p ${whereClause}`
    ).bind(...binds).first();

    return json({
      properties: props.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.c || 0,
        pages: Math.ceil((countResult?.c || 0) / limit),
      },
    });
  } catch (e) {
    return jsonError('Error: ' + e.message, 500);
  }
}
