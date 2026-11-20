const { escape: e, https, values } = require('./html');
const { attachmentRenderer } = require('./attachments');
const styles = require('./style');

function picture(raw, alt, className = '') {
  const url = https(raw);
  return url ? `<img loading="lazy" class="${className}" src="${e(url.href)}" alt="${e(alt)}">` : '';
}
function link(raw, label) {
  const url = https(raw);
  return url ? `<a rel="noreferrer" href="${e(url.href)}">${e(label)}</a>` : e(label);
}

// Parse the original text once. Resolved usernames and code blocks are never
// fed back into the formatter as markup.
async function content(input, context) {
  const text = String(input ?? '');
  const token = /\x60\x60\x60(?:[\w-]*\n)?([\s\S]*?)\x60\x60\x60|\x60([^\x60\n]+)\x60|<(@!?|@&|#)(\d+)>|<(a?):(\w+):(\d+)>|\*\*([^*\n]+)\*\*|\|\|([^|\n]+)\|\||https:\/\/[^\s<>]+/g;
  let output = '', offset = 0;
  for (const m of text.matchAll(token)) {
    output += e(text.slice(offset, m.index));
    offset = m.index + m[0].length;
    if (m[1] != null) output += `<pre><code>${e(m[1])}</code></pre>`;
    else if (m[2]) output += `<code>${e(m[2])}</code>`;
    else if (m[3]) {
      const kind = m[3] === '#' ? 'Channel' : m[3] === '@&' ? 'Role' : 'User';
      const name = await context.name(kind, m[4]);
      output += `<span class="mention">${kind === 'Channel' ? '#' : '@'}${e(name)}</span>`;
    } else if (m[6]) output += picture(`https://cdn.discordapp.com/emojis/${m[7]}.${m[5] ? 'gif' : 'png'}`, ':' + m[6] + ':', 'emoji');
    else if (m[8]) output += `<strong>${e(m[8])}</strong>`;
    else if (m[9]) output += `<details><summary>Spoiler</summary>${e(m[9])}</details>`;
    else output += link(m[0], m[0]);
  }
  return output + e(text.slice(offset));
}

async function embed(data, ctx) {
  const x = data.toJSON?.() ?? data;
  const fields = [];
  for (const f of x.fields ?? []) fields.push(`<dt>${e(f.name)}</dt><dd>${await content(f.value, ctx)}</dd>`);
  return `<aside>${e(x.author?.name)}<strong>${link(x.url, x.title)}</strong><div>${await content(x.description, ctx)}</div><dl>${fields.join('')}</dl>${picture(x.image?.proxy_url ?? x.image?.url, 'Imagen del embed')}${picture(x.thumbnail?.proxy_url ?? x.thumbnail?.url, 'Miniatura')}<small>${e(x.footer?.text)}</small></aside>`;
}

async function component(c, ctx) {
  if (c.components) {
    const children = [];
    for (const child of c.components) children.push(await component(child, ctx));
    if (c.accessory) children.push(await component(c.accessory, ctx));
    return children.join(' ');
  }
  if (c.content) return content(c.content, ctx);
  if (c.items) return c.items.map(i => link(i.media?.url, i.description || 'Archivo')).join(' ');
  const label = c.label || c.placeholder || c.emoji?.name || c.file?.url;
  return label ? `<span class="control">${link(c.url ?? c.file?.url, label)}</span>` : '';
}

async function render(messages, channel, o) {
  const attachment = attachmentRenderer(o);
  const date = new Intl.DateTimeFormat(o.locale, { timeZone: o.timeZone, dateStyle: 'medium', timeStyle: 'short' });
  const names = new Map();
  const users = new Map(messages.map(m => [m.author?.id, m.author]));
  const ctx = { async name(kind, id) {
    const key = kind + id;
    if (!names.has(key)) {
      const cached = kind === 'User' ? users.get(id) ?? channel.client?.users?.cache.get(id)
        : kind === 'Role' ? channel.guild?.roles?.cache.get(id) : channel.guild?.channels?.cache.get(id);
      const resolve = o.callbacks?.['resolve' + kind];
      const obj = resolve ? await resolve(id) : cached;
      names.set(key, obj?.globalName || obj?.username || obj?.name || id);
    }
    return names.get(key);
  }};
  const rows = [];
  for (const m of messages) {
    const name = m.member?.displayName || m.author?.globalName || m.author?.username || 'Discord';
    const avatar = o.showAvatars ? picture(m.author?.displayAvatarURL?.(), '', 'avatar') : '';
    const time = new Date(m.createdTimestamp ?? m.createdAt);
    const parts = [];
    if (m.reference?.messageId) parts.push(`<a href="#m-${e(m.reference.messageId)}">↳ Respuesta a un mensaje</a>`);
    parts.push(`<div class="text">${await content(m.content, ctx)}</div>`);
    for (const x of m.embeds ?? []) parts.push(await embed(x, ctx));
    for (const a of values(m.attachments)) parts.push(await attachment(a));
    for (const s of values(m.stickers)) parts.push(`<small>Sticker: ${e(s.name)}</small>`);
    for (const c of m.components ?? []) parts.push(await component(c.toJSON?.() ?? c, ctx));
    for (const r of values(m.reactions?.cache)) parts.push(`<span class="control">${e(r.emoji?.name)} × ${e(r.count)}</span>`);
    rows.push(`<article id="m-${e(m.id)}">${avatar}<section><header><b>${e(name)}</b> ${m.author?.bot ? '<small>BOT</small>' : ''} <time>${Number.isNaN(+time) ? '' : e(date.format(time))}</time></header>${parts.join('')}${m.editedTimestamp ? '<small>(editado)</small>' : ''}</section></article>`);
  }
  const title = o.title ?? '#' + (channel.name || channel.id);
  const favicon = https(o.favicon === 'guild' ? channel.guild?.iconURL?.() : o.favicon);
  const footer = String(o.footerText).replaceAll('{number}', messages.length).replaceAll('{s}', messages.length === 1 ? '' : 's');
  return `<!doctype html><html lang="${e(o.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${e(title)}</title>${favicon ? `<link rel="icon" href="${e(favicon.href)}">` : ''}<style>${styles(o)}</style></head><body><main><header class="heading"><small>${e(o.brand ?? channel.guild?.name)}</small><h1>${e(title)}</h1></header>${rows.join('\n')}<footer>${e(footer)}${o.poweredBy ? ' · neo-html-transcripts' : ''}</footer></main></body></html>`;
}
module.exports = { render };
