// js/compress-video.js
// Comprime videos locales antes de subirlos.
// Usa Canvas + MediaRecorder para re-encodear a menor calidad.
// Mejorado: reproduce a 4x para comprimir más rápido y evitar cortes.

(function (global) {
  'use strict';

  async function compressVideo(file, options) {
    var opts = options || {};
    var maxWidth = opts.maxWidth || 1280;
    var maxHeight = opts.maxHeight || 720;
    var videoBitrate = opts.videoBitrate || 1200000;
    var audioBitrate = opts.audioBitrate || 96000;
    var onProgress = opts.onProgress || function () {};

    if (!file.type || !file.type.startsWith('video/')) {
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    if (file.size < 10 * 1024 * 1024) {
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    var mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn('[compress-video] MediaRecorder no soporta webm');
      return { file: file, compressed: false, originalSize: file.size, newSize: file.size };
    }

    return new Promise(function (resolve) {
      var video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      var videoURL = URL.createObjectURL(file);
      video.src = videoURL;

      // Timeout de seguridad: 90 segundos máximo
      var timeoutId = setTimeout(function () {
        console.warn('[compress-video] Timeout, devolviendo original');
        try { recorder.stop(); } catch(e) {}
        URL.revokeObjectURL(videoURL);
        resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
      }, 90000);

      video.onloadedmetadata = function () {
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
        outW = Math.round(outW / 2) * 2;
        outH = Math.round(outH / 2) * 2;

        var canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        var ctx = canvas.getContext('2d');

        var canvasStream = canvas.captureStream(30);

        var combinedStream = new MediaStream();
        canvasStream.getVideoTracks().forEach(function (t) { combinedStream.addTrack(t); });

        // Intentar capturar audio
        try {
          var audioCtx = new AudioContext();
          var source = audioCtx.createMediaElementSource(video);
          var dest = audioCtx.createMediaStreamDestination();
          source.connect(dest);
          source.connect(audioCtx.destination);
          dest.stream.getAudioTracks().forEach(function (t) { combinedStream.addTrack(t); });
        } catch (e) {
          console.warn('[compress-video] Audio capture failed, video only');
        }

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
          clearTimeout(timeoutId);
          URL.revokeObjectURL(videoURL);
          var blob = new Blob(chunks, { type: mimeType });
          var newSize = blob.size;

          if (newSize >= file.size) {
            resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
            return;
          }

          var originalName = file.name.replace(/\.[^.]+$/, '');
          var compressedFile = new File([blob], originalName + '.webm', {
            type: 'video/webm',
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

        var duration = video.duration;
        var frameCount = 0;
        var stopped = false;

        function renderFrame() {
          if (stopped) return;
          if (video.ended || video.paused) {
            ctx.drawImage(video, 0, 0, outW, outH);
            stopped = true;
            try { recorder.stop(); } catch(e) {}
            return;
          }
          ctx.drawImage(video, 0, 0, outW, outH);
          frameCount++;

          if (duration > 0 && isFinite(duration)) {
            var pct = Math.round((video.currentTime / duration) * 100);
            onProgress(pct);
          }

          requestAnimationFrame(renderFrame);
        }

        // Reproducir a 4x para comprimir más rápido
        video.playbackRate = 4.0;
        try { video.play(); } catch(e) {}
        recorder.start(2000); // chunk cada 2s
        renderFrame();
      };

      video.onerror = function () {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(videoURL);
        resolve({ file: file, compressed: false, originalSize: file.size, newSize: file.size });
      };
    });
  }

  global.compressVideo = compressVideo;
})(window);
