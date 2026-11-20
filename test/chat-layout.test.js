const test = require('node:test');
const assert = require('node:assert/strict');
const { generateFromMessages } = require('..');
const channel = { id: '2', name: 'support', guild: { name: 'Support desk' } };
const render = (messages, extra) => generateFromMessages(messages, channel, { returnType: 'string', ...extra });
const msg = (id, offset, extra) => ({ id, author: { id: '11', username: 'Ana' },
  createdTimestamp: Date.UTC(2026, 0, 2, 10) + offset, content: 'Hello', ...extra });

test('consecutive messages group without hiding replies or crossing date boundaries', async () => {
  const html = await render([msg('1', 0), msg('2', 60_000), msg('3', 70_000, { reference: { messageId: '1' } }),
    msg('4', 86_400_000)]);
  assert.equal((html.match(/class="message continuation"/g) || []).length, 1);
  assert.equal((html.match(/class="day-divider"/g) || []).length, 2);
  assert.match(html, /href="#m-1"[^>]*><b>Ana<\/b>/);
  assert.match(html, /datetime="2026-01-02T10:01:00.000Z"/);
});

test('embeds keep their own color, inline fields and thumbnail; buttons and reactions remain distinct', async () => {
  const html = await render([msg('1', 0, {
    member: { displayHexColor: '#123456' },
    embeds: [{ color: 0x57f287, fields: [{ name: 'Plan', value: 'Free', inline: true }] }],
    components: [{ components: [{ label: 'Close', style: 4 }] }],
    reactions: { cache: [{ emoji: { name: '👍' }, count: 2 }] }
  })]);
  for (const part of ['#57f287', '#123456', 'class="field inline"', 'button danger', 'class="reaction"']) assert.ok(html.includes(part), part);
});
