const { optionsFor } = require('./lib/options');
const { render } = require('./lib/render');
const { values } = require('./lib/html');

const ExportReturnType = Object.freeze({ Attachment: 'attachment', Buffer: 'buffer', String: 'string' });

async function output(messages, channel, options) {
  const html = await render(messages, channel, options);
  if (options.returnType === 'string') return html;
  const attachment = Buffer.from(html);
  if (options.returnType === 'buffer') return attachment;
  const name = options.filename ?? `transcript-${channel.id}.html`;
  const discord = await import('discord.js');
  const sdk = discord.default ?? discord;
  if (sdk.MessageAttachment) return new sdk.MessageAttachment(attachment, name);
  if (sdk.version?.startsWith('14.') && sdk.AttachmentBuilder) return new sdk.AttachmentBuilder(attachment, { name });
  return { attachment, name };
}

async function generateFromMessages(messages, channel, options = {}) {
  if (!messages?.values || !channel) throw new TypeError('Expected messages and their channel');
  return output(values(messages), channel, await optionsFor(options));
}

async function createTranscript(channel, options = {}) {
  if (!channel?.messages?.fetch) throw new TypeError('This channel does not have a message history');
  const o = await optionsFor(options);
  const result = [];
  let before;
  while (o.limit === -1 || result.length < o.limit) {
    const limit = o.filter || o.limit === -1 ? 100 : Math.min(100, o.limit - result.length);
    const page = values(await channel.messages.fetch({ limit, cache: false, ...(before && { before }) }));
    if (!page.length) break;
    const next = page.at(-1).id;
    if (!next || (before && BigInt(next) >= BigInt(before))) throw Error('Discord did not advance the history cursor');
    for (const message of page) {
      if (!o.filter || o.filter(message)) result.push(message);
      if (result.length === o.limit) break;
    }
    if (page.length < limit) break;
    before = next;
  }
  return output(result.reverse(), channel, o);
}

exports.ExportReturnType = ExportReturnType;
exports.createTranscript = createTranscript;
exports.generateFromMessages = generateFromMessages;
exports.default = { createTranscript, generateFromMessages };
