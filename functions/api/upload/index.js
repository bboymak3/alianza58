// functions/api/upload/index.js
// POST /api/upload — Sube una imagen al bucket R2 MEDIA.
//
// Body: multipart/form-data con campo 'file' o 'image'
// Auth: requerida (Bearer JWT)
// Response: { url, r2_key, content_type, size }

import { getRequestUser, json, jsonError, handleOptions } from '../../_lib/auth.js';

export async function onRequestOptions() {
  return handleOptions();
}

function sanitizeFilename(name) {
  return (name || 'file')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100);
}

function getExtFromMime(mime) {
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/avif': 'avif',
    'image/bmp': 'bmp',
  };
  return map[mime] || 'jpg';
}

export async function onRequestPost({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) {
    return jsonError('Autenticación requerida', 401);
  }

  if (!env.MEDIA) {
    return jsonError('R2 bucket no configurado', 500);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return jsonError('Se esperaba multipart/form-data', 400);
  }

  // Aceptar 'file' o 'image'
  const file = formData.get('file') || formData.get('image');
  if (!file || typeof file === 'string') {
    return jsonError('No se proporcionó archivo', 400);
  }

  // Validar tamaño (máx 10 MB)
  const MAX_SIZE = 10 * 1024 * 1024;
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    return jsonError('La imagen no debe superar 10MB', 413);
  }

  // Validar que sea imagen
  const contentType = file.type || 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    return jsonError('Solo se permiten imágenes', 400);
  }

  // Generar R2 key
  const timestamp = Date.now();
  const originalName = sanitizeFilename(file.name || `upload.${getExtFromMime(contentType)}`);
  const r2Key = `properties/unknown/${timestamp}-${originalName}`;

  // Subir a R2
  try {
    await env.MEDIA.put(r2Key, buffer, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        uploadedBy: String(user.id),
        propertyId: '',
        originalName: file.name || originalName,
      },
    });
  } catch (e) {
    console.error('R2 put error:', e);
    return jsonError('Error al subir imagen a R2: ' + e.message, 500);
  }

  const publicUrl = `/api/serve?key=${encodeURIComponent(r2Key)}`;

  return json({
    url: publicUrl,
    r2_key: r2Key,
    content_type: contentType,
    size: buffer.byteLength,
  }, 201);
}
