const { readFileSync } = require('node:fs');
const { parse } = require('@twemoji/parser');
const { escape } = require('./html');

function transcriptEmoji() {
  const assets = new Map();
  function text(value) {
    const input = String(value ?? '');
    let html = '', start = 0;
    for (const { indices: [from, to], url: key, text: glyph } of parse(input, { buildUrl: key => key })) {
      html += escape(input.slice(start, from));
      start = to;
      // Only resolve codepoints from the parser, never paths supplied by messages.
      if (!assets.has(key) && /^[\da-f]+(?:-[\da-f]+)*$/.test(key)) {
        try {
          assets.set(key, readFileSync(require.resolve('twemoji-svg/' + key)).toString('base64'));
        } catch (error) {
          if (error.code !== 'MODULE_NOT_FOUND') throw error;
          assets.set(key, null);
        }
      }
      html += assets.get(key)
        ? `<span class="emoji twemoji tw-${key}" role="img" aria-label="${escape(glyph)}">${escape(glyph)}</span>`
        : escape(glyph);
    }
    return html + escape(input.slice(start));
  }
  function css() {
    return [...assets].filter(([, data]) => data).map(([key, data]) =>
      `.tw-${key}{background-image:url("data:image/svg+xml;base64,${data}")}`).join('\n');
  }
  return { text, css, credit: () => [...assets.values()].some(Boolean)
    ? ' · <a href="https://github.com/jdecked/twemoji" rel="noreferrer">Twemoji</a> © Twitter &amp; contributors (<a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer">CC BY 4.0</a>)' : '' };
}
module.exports = { transcriptEmoji };
