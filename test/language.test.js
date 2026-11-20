const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('..');

const msg = { id: '2', content: 'Mi ticket', reference: { messageId: '1' }, editedTimestamp: 1,
  embeds: [{ image: { url: 'https://example.org/image' }, thumbnail: { url: 'https://example.org/thumb' } }],
  attachments: [{ url: 'https://example.org/file' }], components: [{ items: [{ media: {} }] }] };
const channel = { id: '3', messages: { fetch: async () => [msg] } };
const options = { returnType: 'string', attachmentMode: 'base64' };
test('English is the default even with Spanish date formatting', async () => {
  const html = await api.createTranscript(channel, { ...options, locale: 'es-ES' });
  for (const label of ['lang="en"', 'Reply to a message', '(edited)', 'Not archived', '1 message',
    'alt="Embed image"', 'alt="Thumbnail"', '>File<', 'Mi ticket']) assert.ok(html.includes(label), label);
});

test('CJS and ESM language instances can export concurrently without changing the default', async () => {
  const { withLanguage } = await import('../index.js');
  const es = withLanguage('es');
  const [spanish, english] = await Promise.all([
    es.generateFromMessages([msg], channel, options),
    api.withLanguage('en').createTranscript(channel, options)
  ]);
  for (const label of ['lang="es"', 'Respuesta a un mensaje', '(editado)', 'No archivado', '1 mensaje',
    'alt="Imagen del embed"', 'alt="Miniatura"', '>Archivo<', 'Mi ticket']) assert.ok(spanish.includes(label), label);
  assert.match(english, /Not archived/);
  assert.match(await api.generateFromMessages([], channel, options), /0 messages/);
  assert.throws(() => withLanguage('fr'), /en.*es/);
});
