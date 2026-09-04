// js/compress-video.js
// Comprime videos locales antes de subirlos al servidor.
// Usa Canvas + MediaRecorder para re-encodear a menor calidad.
// Reduce resolución a 720p max y bitrate a 1.5Mbps.

(function (global) {
  'use strict';

  /**
   * Comprime un video antes de subirlo.
   * @param {File} file - El archivo de video original
   * @param {Object} options
   * @param {number} options.maxWidth - Ancho máximo (default: 1280 = 720p)
   * @param {number} options.maxHeight - Alto máximo (default: 720)
   * @param {number} options.videoBitrate - Bitrate de video en bits/s (default: 1500000 = 1.5Mbps)
   * @param {number} options.audioBitrate - Bitrate de audio (default: 128000 = 128kbps)
   * @param {function} options.onProgress - Callback de progreso (0-100)
   * @returns {Promise<{file: File, compressed: boolean, originalSize: number, newSize: number}>}
   */
  async function compressVideo(file, options) {
    var opts = options || {};
    var maxWidth = opts.maxWidth || 1280;
    var maxHeight = opts.maxHeight || 720;
    var videoBitrate = opts.videoBitrate || 1500000;
    var audioBitrate = opts.audioBitrate || 128000;
    var onProgress = opts.onProgress || function () {};

    // Si no es video, devolver original
    if (!file.type || !file.type.startsWith('video/')) {
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    // Si es menor a 10MB, no comprimir
    if (file.size < 10 * 1024 * 1024) {
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    // Detectar formatos soportados por MediaRecorder
    var mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      // No se puede comprimir, devolver original
      console.warn('[compress-video] MediaRecorder no soporta webm, devolviendo original');
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    return new Promise(function (resolve) {
      // Crear video element para decodificar el original
      var video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;

      var videoURL = URL.createObjectURL(file);
      video.src = videoURL;

      video.onloadedmetadata = function () {
        // Calcular dimensiones de salida manteniendo aspect ratio
        var srcW = video.videoWidth;
        var srcH = video.videoHeight;
        var outW = srcW;
        var outH = srcH;

        if (srcW > maxWidth) {
          outH = Math.round(srcH * (maxWidth / srcW));
          outW = maxWidth;
        }
        if (outH > maxHeight) {
          outW = Math.round(outW * (maxHeight / outH));
          outH = maxHeight;
        }

        // Asegurar dimensiones pares (requerido por algunos codecs)
        outW = Math.round(outW / 2) * 2;
        outH = Math.round(outH / 2) * 2;

        // Crear canvas para renderizar frames
        var canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        var ctx = canvas.getContext('2d');

        // Crear stream del canvas + audio del video
        var canvasStream = canvas.captureStream(30); // 30 FPS

        // Intentar capturar audio del video original
        try {
          var audioCtx = new AudioContext();
          var source = audioCtx.createMediaElementSource(video);
          var dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);

          // Combinar canvas + audio
          var combinedStream = new MediaStream();
          canvasStream.getVideoTracks().forEach(function (t) { combinedStream.addTrack(t); });
          dest.stream.getAudioTracks().forEach(function (t) { combinedStream.addTrack(t); });
        } catch (e) {
          // Si no se puede capturar audio, usar solo video
          var combinedStream = canvasStream;
        }

        // Crear MediaRecorder
        var recorder = new MediaRecorder(combinedStream, {
          mimeType: mimeType,
          videoBitsPerSecond: videoBitrate,
          audioBitsPerSecond: audioBitrate,
        });

        var chunks = [];
        recorder.ondataavailable = function (e) {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = function () {
          URL.revokeObjectURL(videoURL);
          var blob = new Blob(chunks, { type: mimeType });
          var newSize = blob.size;

          // Si la versión comprimida es más grande, usar original
          if (newSize >= file.size) {
            console.log('[compress-video] Compresión no mejoró, usando original');
            resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
            return;
          }

          // Cambiar extensión a .webm
          var originalName = file.name.replace(/\.[^.]+$/, '');
          var newName = originalName + '.webp';
          // Actually webm, not webp
          newName = originalName + '.webm';

          var compressedFile = new File([blob], newName, {
            type: mimeType.split(';')[0],
            lastModified: Date.now(),
          });

          resolve({
            file: compressedFile,
            compressed: true,
            originalSize: file.size,
            newSize: compressedFile.size,
            format: 'webm',
          });
        };

        // Reproducir el video y renderizar frames al canvas
        var startTime = Date.now();
        var duration = video.duration;

        function renderFrame() {
          if (video.ended || video.paused) {
            ctx.drawImage(video, 0, 0, outW, outH);
            recorder.stop();
            return;
          }
          ctx.drawImage(video, 0, 0, outW, outH);

          // Progreso
          if (duration > 0) {
            var pct = Math.round((video.currentTime / duration) * 100);
            onProgress(pct);
          }

          requestAnimationFrame(renderFrame);
        }

        // Iniciar
        recorder.start(1000); // chunk cada 1s
        video.play();
        renderFrame();
      };

      video.onerror = function () {
        URL.revokeObjectURL(videoURL);
        console.warn('[compress-video] Error al cargar video, devolviendo original');
        resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
      };
    });
  }

  global.compressVideo = compressVideo;
})(window);
