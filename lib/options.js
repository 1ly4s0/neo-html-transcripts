const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { labelsFor } = require('./languages');

async function optionsFor(call) {
  let config = {};
  try {
    config = JSON.parse(await readFile(path.resolve('neo-transcripts.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const o = { limit: -1, language: 'en', timeZone: 'UTC', accent: '#5865f2', theme: 'dark',
    maxFileBytes: 8 * 1024 ** 2, maxTotalBytes: 24 * 1024 ** 2, timeoutMs: 8000,
    archiveTimeoutMs: 45000, returnType: 'attachment', poweredBy: true, showAvatars: true,
    favicon: 'guild', ...config, ...call };
  o.labels = labelsFor(o.language);
  o.locale ??= o.language;
  o.footerText ??= o.labels.footer;
  o.attachmentMode ??= o.saveImages ? 'images' : 'url';
  for (const [key, allowed] of Object.entries({
    attachmentMode: ['url', 'base64', 'images'], returnType: ['buffer', 'string', 'attachment'],
    theme: ['dark', 'light']
  })) {
    if (!allowed.includes(o[key])) throw new TypeError(`Invalid ${key}: ${o[key]}`);
  }
  for (const key of ['maxFileBytes', 'maxTotalBytes', 'timeoutMs', 'archiveTimeoutMs', 'limit']) {
    if (!Number.isSafeInteger(o[key]) || o[key] < (key === 'limit' ? -1 : 0))
      throw new RangeError(`Invalid ${key}`);
  }
  if (!/^#[a-f\d]{6}$/i.test(o.accent)) throw new TypeError('accent must be a six-digit hex color');
  return o;
}
module.exports = { optionsFor };
