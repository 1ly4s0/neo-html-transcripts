// Run from a consumer project so this exercises the installed tarball, not src.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function main() {
  const consumer = createRequire(path.resolve('package.json'));
  const sdkModule = await import(pathToFileURL(consumer.resolve('discord.js')));
  const sdk = sdkModule.default ?? sdkModule;
  const transcripts = consumer('discord-html-transcripts');
  const client = new sdk.Client({ intents: [] });
  const channel = { id: '100000000000000001', name: 'qa' };
  const message = new sdk.Message(client, { id: '100000000000000002', channel_id: channel.id,
    type: 0, content: 'Probando ñ y 🍉', mentions: [], mention_roles: [], attachments: [],
    author: { id: '100000000000000003', username: 'Soporte', discriminator: '0001', avatar: null } });
  const history = new sdk.Collection([[message.id, message]]);
  channel.messages = { fetch: async () => history };
  const file = await transcripts.createTranscript(channel, { filename: 'soporte.html' });
  const resolved = await sdk.MessagePayload.resolveFile(file);
  assert.equal(resolved.name, 'soporte.html');
  assert.match(file.attachment.toString(), /Probando ñ y <span[^>]+aria-label="🍉"/u);
  const buffer = await transcripts.generateFromMessages(history, channel, { returnType: 'buffer' });
  assert.ok(Buffer.isBuffer(buffer));
  assert.deepEqual(file.attachment, buffer);
  console.log(`discord.js ${sdk.version}: Message, Collection y envío del HTML verificados`);
  await client.destroy();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
