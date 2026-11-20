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
    if (!response.ok || !response.body) throw Error('Download unavailable');
    if (Number(response.headers.get('content-length')) > limit) throw Error('Size limit exceeded');
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > limit) throw Error('Size limit exceeded');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, size);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function attachmentRenderer(options, text = escape) {
  let remaining = options.maxTotalBytes;
  const deadline = Date.now() + options.archiveTimeoutMs;
  return async function render(file) {
    const url = https(file.url);
    const rawName = file.name || options.labels.file;
    const name = escape(rawName);
    const label = text(rawName);
    const mime = fileType(file);
    const isImage = image.test(mime);
    const link = url ? `<a rel="noreferrer" href="${escape(url.href)}">${label}</a>` : label;
    const size = Number.isFinite(file.size) && file.size >= 0
      ? new Intl.NumberFormat(options.locale, { style: 'unit', unit: file.size < 1024 ? 'byte' : 'kilobyte', maximumFractionDigits: 1 }).format(file.size < 1024 ? file.size : file.size / 1024)
      : '';
    const fileCard = (label, note = '') => `<div class="file"><span class="file-icon" aria-hidden="true"></span><div>${label}${size ? `<small>${escape(size)}</small>` : ''}${note ? `<small>${escape(note)}</small>` : ''}</div></div>`;
    const inline = options.attachmentMode === 'base64' || options.attachmentMode === 'images' && isImage;
    const trusted = url && cdn.has(url.hostname) && !url.port && /^\/(?:ephemeral-)?attachments\/\d+\/\d+\//.test(url.pathname);
    if (!inline) {
      return isImage && trusted ? `<figure><img loading="lazy" src="${escape(url.href)}" alt="${name}"><figcaption>${link}</figcaption></figure>` : fileCard(link);
    }
    try {
      if (!trusted) throw Error('Unexpected attachment origin');
      const limit = Math.min(options.maxFileBytes, remaining);
      if (!limit || file.size > limit) throw Error('Size limit exceeded');
      const timeout = Math.min(deadline - Date.now(), options.timeoutMs);
      if (timeout <= 0) throw Error('Download timed out');
      const bytes = await readFile(url.href, limit, timeout);
      remaining -= bytes.length;
      const data = `data:${mime};base64,${bytes.toString('base64')}`;
      return isImage ? `<figure><img loading="lazy" src="${data}" alt="${name}"><figcaption>${label}</figcaption></figure>`
        : fileCard(`<a download="${name}" href="${data}">${label}</a>`);
    } catch {
      return fileCard(link, options.labels.notArchived);
    }
  };
}
module.exports = { attachmentRenderer };
