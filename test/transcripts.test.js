const test = require('node:test');
const assert = require('node:assert/strict');
const { createTranscript, generateFromMessages, ExportReturnType } = require('..');
const channel = { id: '20', name: 'soporte', guild: { name: 'Pruebas' } };
const message = (id, content) => ({ id: String(id), content, author: { username: 'Ana' } });
const string = { returnType: 'string' };
const url = 'https://cdn.discordapp.com/attachments/12/34/notas.txt';

test('reads precisely the latest 102 messages, from oldest to newest', async () => {
  const history = Array.from({ length: 105 }, (_, i) => message(105-i, 'mensaje ' + (105-i)));
  const requests = [];
  const messages = { fetch: async ({ before, limit }) => {
    requests.push([before, limit]);
    return new Map(history.filter(m => !before || +m.id < +before).slice(0, limit).map(m => [m.id, m]));
  }};
  const html = await createTranscript({ ...channel, messages }, { ...string, limit: 102 });
  assert.deepEqual(requests, [[undefined, 100], ['6', 2]]);
  assert.ok(html.indexOf('mensaje 4<') < html.indexOf('mensaje 105<'));
  assert.doesNotMatch(html, /mensaje 3</);
});

test('transcript is static HTML; text and branding cannot insert markup', async () => {
  const html = await generateFromMessages([message(2, 'á 🍉 <script>')], channel, { ...string, title: '<ticket>' });
  assert.match(html, /á 🍉 &lt;script&gt;/);
  assert.match(html, /&lt;ticket&gt;/);
  assert.doesNotMatch(html, /<script/i);
  assert.equal(ExportReturnType.Buffer, 'buffer');
});

test('embeds the original bytes of non-image attachments', async t => {
  t.mock.method(globalThis, 'fetch', async (input, options) => {
    assert.equal(String(input), url);
    assert.equal(options.redirect, 'error');
    return new Response('prueba');
  });
  const m = { ...message(1, ''), attachments: [{ name: 'notas.txt', url }] };
  const html = await generateFromMessages([m], channel, { ...string, attachmentMode: 'base64' });
  assert.match(html, /data:application\/octet-stream;base64,cHJ1ZWJh/);
  assert.match(html, /download="notas.txt"/);
  assert.ok(!html.includes(url));
});

test('a failed or oversized attachment is identified without losing the conversation', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('demasiado largo'));
  const m = { ...message(1, 'mi mensaje'), attachments: [{ name: 'notas.txt', url }] };
  const html = await generateFromMessages([m], channel, { ...string, attachmentMode: 'base64', maxFileBytes: 2 });
  assert.match(html, /mi mensaje/);
  assert.match(html, /Not archived/);
  assert.match(html, /notas.txt/);
});

test('does not fetch arbitrary hosts; URL mode does not download attachments', async t => {
  const stub = t.mock.method(globalThis, 'fetch', () => { throw Error('unexpected fetch'); });
  const make = url => [{ ...message(1, ''), attachments: [{ name: 'notas.txt', url }] }];
  await generateFromMessages(make('https://example.org/notas.txt'), channel, { ...string, attachmentMode: 'base64' });
  const html = await generateFromMessages(make(url), channel, string);
  assert.equal(stub.mock.callCount(), 0);
  assert.ok(html.includes(url));
});

test('the limit counts matching messages, even across a page with no matches', async () => {
  const history = Array.from({ length: 104 }, (_, i) => message(104-i, 'line-' + (104-i)));
  const messages = { fetch: async ({ before, limit }) => history.filter(m => !before || +m.id < +before).slice(0, limit) };
  const html = await createTranscript({ ...channel, messages }, { ...string, limit: 2, filter: m => +m.id <= 4 });
  assert.match(html, /line-3</);
  assert.match(html, /line-4</);
  assert.doesNotMatch(html, /line-2</);
});

test('archives only as many bytes as the shared budget allows', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response('abc'));
  const file = { name: 'info.txt', url, size: 3 };
  const html = await generateFromMessages([{ ...message(1, ''), attachments: [file, file] }], channel,
    { ...string, attachmentMode: 'base64', maxTotalBytes: 4 });
  assert.equal(fetch.mock.callCount(), 1);
  assert.match(html, /YWJj/);
  assert.match(html, /Not archived/);
});

test('JSON settings are read per export and a call can override them', async t => {
  const fs = require('node:fs/promises');
  const os = require('node:os');
  const path = require('node:path');
  const cwd = process.cwd();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'neo-config-'));
  t.after(async () => { process.chdir(cwd); await fs.rm(dir, { recursive: true }); });
  process.chdir(dir);
  await fs.writeFile('neo-transcripts.json', JSON.stringify({ brand: 'Mesa de ayuda', theme: 'light', title: 'No usar', language: 'es' }));
  const html = await generateFromMessages([], channel, { ...string, title: 'Incidencia' });
  assert.match(html, /Mesa de ayuda/);
  assert.match(html, /color-scheme:light/);
  assert.match(html, /<title>Incidencia<\/title>/);
  assert.doesNotMatch(html, /No usar/);
  assert.match(html, /lang="es"/);
  const english = require('..').withLanguage('en');
  assert.match(await english.generateFromMessages([], channel, string), /0 messages/);
  const custom = await english.generateFromMessages([], channel, {
    ...string, language: 'es', footerText: 'Customer support'
  });
  assert.match(custom, /lang="es"/);
  assert.match(custom, /Customer support/);
});
