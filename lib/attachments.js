const { escape, https } = require('./html');
const cdn = new Set(['cdn.discordapp.com', 'media.discordapp.net']);
const image = /^image\/(png|jpeg|gif|webp|avif)$/i;

function fileType(file) {
  const mime = file.contentType?.split(';')[0];
  if (image.test(mime)) return mime;
  const ext = /\.(png|jpe?g|gif|webp|avif)$/i.exec(file.name ?? '')?.[1];
  return ext ? 'image/' + ext.toLowerCase().replace(/^jpg$/, 'jpeg') : 'application/octet-stream';
}

// Discord's size field is a useful early exit, but only the bytes read count.
async function readFile(url, limit, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok || !response.body) throw Error('descarga no disponible');
    if (Number(response.headers.get('content-length')) > limit) throw Error('límite de tamaño');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > limit) throw Error('límite de tamaño');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, size);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function attachmentRenderer(options) {
  let remaining = options.maxTotalBytes;
  const deadline = Date.now() + options.archiveTimeoutMs;
  return async function render(file) {
    const url = https(file.url);
    const name = escape(file.name || 'archivo');
    const mime = fileType(file);
    const isImage = image.test(mime);
    const link = url ? `<a rel="noreferrer" href="${escape(url.href)}">${name}</a>` : name;
    const inline = options.attachmentMode === 'base64' || options.attachmentMode === 'images' && isImage;
    const trusted = url && cdn.has(url.hostname) && !url.port && /^\/(?:ephemeral-)?attachments\/\d+\/\d+\//.test(url.pathname);
    if (!inline) {
      return isImage && trusted ? `<figure><img loading="lazy" src="${escape(url.href)}" alt="${name}"><figcaption>${link}</figcaption></figure>` : `<p>${link}</p>`;
    }
    try {
      if (!trusted) throw Error('origen no permitido');
      const limit = Math.min(options.maxFileBytes, remaining);
      if (!limit || file.size > limit) throw Error('límite de tamaño');
      const timeout = Math.min(deadline - Date.now(), options.timeoutMs);
      if (timeout <= 0) throw Error('tiempo agotado');
      const bytes = await readFile(url.href, limit, timeout);
      remaining -= bytes.length;
      const data = `data:${mime};base64,${bytes.toString('base64')}`;
      return isImage ? `<figure><img loading="lazy" src="${data}" alt="${name}"><figcaption>${name}</figcaption></figure>`
        : `<p><a download="${name}" href="${data}">${name}</a></p>`;
    } catch {
      return `<p>${link} <small>No archivado · enlace original, si sigue disponible</small></p>`;
    }
  };
}
module.exports = { attachmentRenderer };
