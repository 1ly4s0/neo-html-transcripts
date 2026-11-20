const test = require('node:test');
const assert = require('node:assert/strict');
const { generateFromMessages } = require('..');
const render = (m, o) => generateFromMessages([m], { id:'2' }, { returnType:'string', ...o });

test('offline Twemoji keep complex sequences together and share one asset across chat surfaces', async () => {
  const html = await render({content:'👩🏽‍💻 🇪🇸 1️⃣ ❤️', embeds:[{title:'👩🏽‍💻'}],
    components:[{emoji:{name:'👩🏽‍💻'}, label:'Review'}],
    reactions:{cache:[{emoji:{name:'👩🏽‍💻'},count:2}]}});
  assert.equal((html.match(/aria-label="👩🏽‍💻"/g)||[]).length, 4);
  for (const emoji of ['🇪🇸','1️⃣','❤️']) assert.ok(html.includes('aria-label="'+emoji+'"'));
  assert.equal((html.match(/data:image\/svg\+xml;base64,/g)||[]).length, 4);
  assert.match(html,/creativecommons.org\/licenses\/by\/4.0/);
});

test('custom emoji stay on Discord; code and URLs are not rewritten as Twemoji', async () => {
  const html = await render({content:'`👋` <:wave:123> https://example.org/👋 <hello>'});
  assert.match(html, /<code>👋<\/code>/);
  assert.match(html, /cdn.discordapp.com\/emojis\/123.png/);
  assert.match(html, /&lt;hello&gt;/);
  assert.doesNotMatch(html,/data:image\/svg\+xml;base64,/);
});

test('uses local gg sans when available and embeds the licensed Figtree fallback once', async () => {
  const html = await render({});
  for(const name of ['Regular','Medium','Semibold','Bold']) assert.ok(html.includes('local("gg sans '+name+'")'));
  const fonts = [...html.matchAll(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/g)];
  assert.equal(fonts.length, 1);
  assert.equal(Buffer.from(fonts[0][1], 'base64').subarray(0, 4).toString(), 'wOF2');
  assert.match(html, /"Transcript GG","gg sans","Figtree"/);
  assert.match(html, /SIL OPEN FONT LICENSE Version 1.1/);
  assert.match(html, /font-src 'self' data:/);
});
