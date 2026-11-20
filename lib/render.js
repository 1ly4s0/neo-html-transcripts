const { escape: e, https, values } = require('./html');
const { attachmentRenderer } = require('./attachments');
const styles = require('./style');
const { transcriptEmoji } = require('./twemoji');

function picture(raw, alt, className = '') {
  const url = https(raw);
  return url ? `<img loading="lazy" class="${className}" src="${e(url.href)}" alt="${e(alt)}">` : '';
}
function link(raw, label, text = e) {
  const url = https(raw);
  return url ? `<a rel="noreferrer" href="${e(url.href)}">${text(label)}</a>` : text(label);
}

// Parse the original text once. Resolved usernames and code blocks are never
// fed back into the formatter as markup.
async function content(input, context) {
  const text = String(input ?? '');
  const token = /\x60\x60\x60(?:[\w-]*\n)?([\s\S]*?)\x60\x60\x60|\x60([^\x60\n]+)\x60|<(@!?|@&|#)(\d+)>|<(a?):(\w+):(\d+)>|\*\*([^*\n]+)\*\*|\|\|([^|\n]+)\|\||https:\/\/[^\s<>]+/g;
  let output = '', offset = 0;
  for (const m of text.matchAll(token)) {
    output += context.text(text.slice(offset, m.index));
    offset = m.index + m[0].length;
    if (m[1] != null) output += `<pre><code>${e(m[1])}</code></pre>`;
    else if (m[2]) output += `<code>${e(m[2])}</code>`;
    else if (m[3]) {
      const kind = m[3] === '#' ? 'Channel' : m[3] === '@&' ? 'Role' : 'User';
      const name = await context.name(kind, m[4]);
      output += `<span class="mention">${kind === 'Channel' ? '#' : '@'}${context.text(name)}</span>`;
    } else if (m[6]) output += picture(`https://cdn.discordapp.com/emojis/${m[7]}.${m[5] ? 'gif' : 'png'}`, ':' + m[6] + ':', 'emoji');
    else if (m[8]) output += `<strong>${context.text(m[8])}</strong>`;
    else if (m[9]) output += `<details><summary>Spoiler</summary>${context.text(m[9])}</details>`;
    else output += link(m[0], m[0]);
  }
  return output + context.text(text.slice(offset));
}

async function embed(data, ctx) {
  const x = data.toJSON?.() ?? data;
  const fields = [];
  for (const f of x.fields ?? []) fields.push(`<div class="field${f.inline ? ' inline' : ''}"><dt>${ctx.text(f.name)}</dt><dd>${await content(f.value, ctx)}</dd></div>`);
  const color = Number.isInteger(x.color) && x.color >= 0 && x.color <= 0xffffff ? '#' + x.color.toString(16).padStart(6, '0') : null;
  const thumb = picture(x.thumbnail?.proxy_url ?? x.thumbnail?.url, ctx.labels.thumbnail, 'thumbnail');
  const author = x.author?.name ? `<div class="embed-author">${picture(x.author.proxy_icon_url ?? x.author.icon_url, '', 'mini')}${link(x.author.url, x.author.name, ctx.text)}</div>` : '';
  return `<aside class="embed"${color ? ` style="border-color:${color}"` : ''}>${thumb}${author}${x.title ? `<strong class="embed-title">${link(x.url, x.title, ctx.text)}</strong>` : ''}${x.description ? `<div class="description">${await content(x.description, ctx)}</div>` : ''}${fields.length ? `<dl>${fields.join('')}</dl>` : ''}${picture(x.image?.proxy_url ?? x.image?.url, ctx.labels.embedImage, 'embed-image')}${x.footer?.text ? `<small class="embed-footer">${picture(x.footer.proxy_icon_url ?? x.footer.icon_url, '', 'mini')}${ctx.text(x.footer.text)}</small>` : ''}</aside>`;
}

async function component(c, ctx) {
  if (c.components) {
    const children = [];
    for (const child of c.components) children.push(await component(child, ctx));
    if (c.accessory) children.push(await component(c.accessory, ctx));
    return `<div class="action-row">${children.join('')}</div>`;
  }
  if (c.content) return content(c.content, ctx);
  if (c.items) return c.items.map(i => link(i.media?.url, i.description || ctx.labels.file, ctx.text)).join(' ');
  const label = c.label || c.placeholder || c.file?.url;
  const icon = discordEmoji(c.emoji, ctx);
  if (!label && !icon) return '';
  const style = ({ 1: 'primary', 2: 'secondary', 3: 'success', 4: 'danger' })[c.style] || 'secondary';
  return `<span class="button ${style}${c.disabled ? ' disabled' : ''}">${link(c.disabled ? null : c.url ?? c.file?.url, label, value => icon + (icon && value ? ' ' : '') + ctx.text(value))}</span>`;
}

function discordEmoji(emoji, ctx) {
  return emoji?.id ? picture(`https://cdn.discordapp.com/emojis/${encodeURIComponent(emoji.id)}.${emoji.animated ? 'gif' : 'png'}`, emoji.name, 'emoji') : ctx.text(emoji?.name);
}

function displayName(m) {
  return m.member?.displayName || m.author?.globalName || m.author?.username || 'Discord';
}

function avatarFor(m, name) {
  const src = m.member?.displayAvatarURL?.({ size: 64 }) ?? m.author?.displayAvatarURL?.({ size: 64 });
  const hue = Array.from(String(m.author?.id || name)).reduce((n, c) => (n * 31 + c.codePointAt(0)) % 360, 0);
  return `<span class="avatar" aria-hidden="true" style="--hue:${hue}">${e(Array.from(name)[0])}${picture(src, '')}</span>`;
}

async function render(messages, channel, o) {
  const emojiAssets = transcriptEmoji();
  const attachment = attachmentRenderer(o, emojiAssets.text);
  const date = new Intl.DateTimeFormat(o.locale, { timeZone: o.timeZone, dateStyle: 'medium', timeStyle: 'short' });
  const names = new Map();
  const users = new Map(messages.map(m => [m.author?.id, m.author]));
  const ctx = { text: emojiAssets.text, labels: o.labels, async name(kind, id) {
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
  const byId = new Map(messages.map(m => [m.id, m]));
  const day = new Intl.DateTimeFormat(o.locale, { timeZone: o.timeZone, dateStyle: 'long' });
  const clock = new Intl.DateTimeFormat(o.locale, { timeZone: o.timeZone, timeStyle: 'short' });
  let previous, lastDay;
  for (const m of messages) {
    const name = displayName(m);
    const time = new Date(m.createdTimestamp ?? m.createdAt);
    const valid = Number.isFinite(+time);
    const dateKey = valid && day.format(time);
    if (valid && dateKey !== lastDay) rows.push(`<div class="day-divider"><time>${e(dateKey)}</time></div>`);
    const elapsed = +time - previous?.time;
    const grouped = valid && lastDay === dateKey && elapsed >= 0 && elapsed < 7 * 60_000
      && m.author?.id && previous?.id === m.author.id && previous.name === name && !m.reference && !m.system && !previous.system;
    previous = { time: +time, id: m.author?.id, name, system: m.system };
    lastDay = dateKey;
    const stamp = valid ? `<time datetime="${time.toISOString()}" title="${e(date.format(time))}">${e(clock.format(time))}</time>` : '';
    const avatar = !grouped && o.showAvatars ? avatarFor(m, name) : '';
    const color = m.member?.displayHexColor;
    const role = typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) && color !== '#000000' ? ` style="color:${color}"` : '';
    const author = `<b class="author"${role}>${ctx.text(name)}</b>`;
    const header = grouped ? `<span class="sr-only">${e(name)}</span>` : `<header>${author}${m.author?.bot ? '<span class="bot">BOT</span>' : ''}${stamp}</header>`;
    let reply = '';
    if (m.reference?.messageId) {
      const parent = byId.get(m.reference.messageId);
      reply = parent ? `<a class="reply" href="#m-${e(parent.id)}" aria-label="${e(o.labels.reply)}"><b>${ctx.text(displayName(parent))}</b> ${ctx.text(parent.content?.slice(0, 120) || o.labels.reply)}</a>` : `<span class="reply">${o.labels.reply}</span>`;
    }
    const parts = [];
    if (m.content || m.editedTimestamp) parts.push(`<div class="text">${await content(m.content, ctx)}${m.editedTimestamp ? ` <small>${o.labels.edited}</small>` : ''}</div>`);
    for (const x of m.embeds ?? []) parts.push(await embed(x, ctx));
    for (const a of values(m.attachments)) parts.push(await attachment(a));
    for (const s of values(m.stickers)) parts.push(`<small>Sticker: ${ctx.text(s.name)}</small>`);
    for (const c of m.components ?? []) parts.push(await component(c.toJSON?.() ?? c, ctx));
    const reactions = values(m.reactions?.cache).map(r => {
      const emoji = discordEmoji(r.emoji, ctx);
      return `<span class="reaction">${emoji} <b>${e(r.count)}</b></span>`;
    });
    if (reactions.length) parts.push(`<div class="reactions">${reactions.join('')}</div>`);
    rows.push(`<article class="message${grouped ? ' continuation' : ''}" id="m-${e(m.id)}">${reply}<div class="gutter">${grouped ? stamp : avatar}</div><section>${header}${parts.join('')}</section></article>`);
  }
  const title = o.title ?? '#' + (channel.name || channel.id);
  const favicon = https(o.favicon === 'guild' ? channel.guild?.iconURL?.() : o.favicon);
  const guildName = o.brand ?? channel.guild?.name;
  const initials = String(guildName || '#').split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word)).slice(0, 2).map(word => Array.from(word)[0]).join('') || '#';
  const icon = picture(channel.guild?.iconURL?.({ size: 128 }), '', 'guild-icon') || `<span class="guild-icon" aria-hidden="true">${e(initials)}</span>`;
  const heading = `<header class="heading">${icon}<div>${guildName ? `<strong>${ctx.text(guildName)}</strong>` : ''}<h1>${ctx.text(title)}</h1>${channel.topic ? `<div class="topic">${await content(channel.topic, ctx)}</div>` : ''}</div></header>`;
  const footer = String(o.footerText).replaceAll('{number}', messages.length).replaceAll('{s}', messages.length === 1 ? '' : 's');
  const footerHTML = ctx.text(footer);
  return `<!doctype html><html lang="${e(o.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: https:; font-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none';"><title>${e(title)}</title>${favicon ? `<link rel="icon" href="${e(favicon.href)}">` : ''}<style>${styles(o)}${emojiAssets.css()}</style></head><body><main class="${o.showAvatars ? 'chat' : 'chat no-avatars'}">${heading}${rows.join('\n')}<footer>${footerHTML}${o.poweredBy ? ' · neo-html-transcripts' : ''}${emojiAssets.credit()}</footer></main></body></html>`;
}
module.exports = { render };
