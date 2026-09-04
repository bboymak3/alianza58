// functions/api/upload/index.js
// POST /api/upload — Sube imágenes o videos al bucket R2 MEDIA.

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
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
    'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
    'image/avif': 'avif', 'image/bmp': 'bmp',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogg',
    'video/quicktime': 'mov', 'video/x-m4v': 'm4v',
  };
  return map[mime] || 'jpg';
}

export async function onRequestPost({ request, env }) {
  const user = await getRequestUser(request, env);
  if (!user) return jsonError('Autenticación requerida', 401);
  if (!env.MEDIA) return jsonError('R2 bucket no configurado', 500);

  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return jsonError('Se esperaba multipart/form-data', 400);
  }

  const file = formData.get('file') || formData.get('image');
  if (!file || typeof file === 'string') {
    return jsonError('No se proporcionó archivo', 400);
  }

  const contentType = file.type || 'image/jpeg';
  const isImage = contentType.startsWith('image/');
  const isVideo = contentType.startsWith('video/');

  // Solo permitir imágenes o videos
  if (!isImage && !isVideo) {
    return jsonError('Solo se permiten imágenes o videos', 400);
  }

  // Límite diferente según tipo: 10MB imágenes, 100MB videos
  const MAX_SIZE = isVideo ? 100 * 1024 * 1024 : 10 * 1024 * 1024;
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_SIZE) {
    const limitMB = Math.floor(MAX_SIZE / 1024 / 1024);
    return jsonError(`El archivo no debe superar ${limitMB}MB`, 413);
  }

  const timestamp = Date.now();
  const originalName = sanitizeFilename(file.name || `upload.${getExtFromMime(contentType)}`);
  // Organizar por tipo: properties/images/ o properties/videos/
  const folder = isVideo ? 'properties/videos' : 'properties/images';
  const r2Key = `${folder}/${timestamp}-${originalName}`;

  try {
    await env.MEDIA.put(r2Key, buffer, {
      httpMetadata: { contentType },
      customMetadata: {
        uploadedBy: String(user.id),
        propertyId: '',
        originalName: file.name || originalName,
        fileType: isVideo ? 'video' : 'image',
      },
    });
  } catch (e) {
    console.error('R2 put error:', e);
    return jsonError('Error al subir archivo a R2: ' + e.message, 500);
  }

  const publicUrl = `/api/serve?key=${encodeURIComponent(r2Key)}`;

  return json({
    url: publicUrl,
    r2_key: r2Key,
    content_type: contentType,
    size: buffer.byteLength,
    file_type: isVideo ? 'video' : 'image',
  }, 201);
}
