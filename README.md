# neo-html-transcripts

[![English](https://img.shields.io/badge/docs-English-5865F2)](./README.md) [![Español](https://img.shields.io/badge/docs-Español-5865F2)](./README.es.md)

Save a Discord conversation as an HTML file. You can keep the attachments inside it, so someone reviewing a ticket can open the screenshots or download the logs without signing in to Discord.

## Installation

```sh
npm install neo-html-transcripts
```

If your bot already uses `discord-html-transcripts`, install this package under the old name. Your existing imports and calls to `createTranscript` or `generateFromMessages` can stay as they are:

```sh
npm install discord-html-transcripts@npm:neo-html-transcripts@^1.1.0
```

The examples below use the new name. If you installed the alias, use `discord-html-transcripts` in their place.

## Choose a language

Transcripts use English by default. To use Spanish, choose the language once when you import the package:

```js
const { createTranscript } = require('neo-html-transcripts').withLanguage('es');
```

With ES modules:

```js
import { withLanguage } from 'neo-html-transcripts';
const { createTranscript, generateFromMessages } = withLanguage('es');
```

Each instance keeps its own language. An English-speaking server and a Spanish-speaking server can close tickets at the same time without affecting each other. To override the language for one export, pass `{ language: 'en' }` or `{ language: 'es' }`. This changes the viewer labels. Messages, filenames and any footer you wrote stay as they are.

## Archive a ticket

Send the last 50 messages to a staff channel:

```js
const { createTranscript } = require('neo-html-transcripts');

async function archiveTicket(ticket, staffChannel) {
  const file = await createTranscript(ticket, {
    limit: 50,
    filename: 'ticket-' + ticket.id + '.html'
  });
  await staffChannel.send({ files: [file] });
}
```

The bot needs permission to view the channel and read its message history. Where Discord requires the Message Content intent, your bot needs it to receive user messages and attachments. A transcript cannot recover content Discord did not send.

`limit: -1` reads the full history; `0` skips the fetch. To skip bot messages, pass `filter: m => !m.author.bot`. The limit counts messages that pass the filter. Messages appear oldest first.

## Keep attachments offline

Place `neo-transcripts.json` in the directory where you start Node. The package reads it for each export:

```json
{
  "brand": "NEO Support",
  "accent": "#7289da",
  "language": "en",
  "locale": "en-GB",
  "timeZone": "Europe/London",
  "attachmentMode": "base64",
  "maxFileBytes": 8388608,
  "maxTotalBytes": 25165824,
  "footerText": "{number} message{s} in this ticket",
  "poweredBy": false
}
```

| Attachment mode | What the reader gets |
| --- | --- |
| `url` (default) | A small HTML file with links to Discord. Signed links can expire. |
| `images` | Copies of supported image attachments; links for other files. Equivalent to `saveImages: true` for attachments. |
| `base64` | Images in the conversation and download links for other copied files, including PDFs, audio and ZIPs. |

Unicode emoji use [Twemoji](https://github.com/jdecked/twemoji) (graphics © Twitter and contributors, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). Each transcript includes only the icons it uses, so they also work offline. Custom server emoji keep their Discord images. The viewer uses gg sans if it is installed locally. Otherwise it uses [Figtree](https://github.com/erikdkennedy/figtree). The Latin variable font and its SIL Open Font License are included in each HTML file, so it works offline.

Only message attachments from Discord's CDN are copied. Avatars, custom emoji and images linked in embeds can still need a connection. A missing or oversized attachment is marked **Not archived** beside its original link.

The default limits are 8 MiB per file and 24 MiB per transcript, measured before encoding. Base64 adds about a third to that size. Check your server's upload limit if you plan to send the HTML back to Discord. The file is not encrypted; anyone with a copy can read the conversation and the archived attachments.

## Save messages you already have

`generateFromMessages` takes an array or collection in the order you want to show it. It doesn't fetch the channel history again.

```js
const { writeFile } = require('node:fs/promises');
const { generateFromMessages } = require('neo-html-transcripts');

async function saveSelection(channel, selection) {
  const messages = [...selection.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const html = await generateFromMessages(messages, channel, {
    returnType: 'buffer',
    attachmentMode: 'base64',
    title: 'Support review',
    showAvatars: false
  });
  await writeFile('review.html', html);
}
```

## Options

Call options override the JSON file. For language, the order is: call, instance, JSON, then English.

| Option | Use |
| --- | --- |
| `title`, `brand` | Page title and the name above it. Defaults to the channel and server names. |
| `theme`, `accent` | Choose `dark` or `light` and a six-digit hex color such as `#5865f2`. |
| `showAvatars`, `favicon` | Toggle avatars. For the icon, use `"guild"`, an HTTPS URL or `""` for none. |
| `locale`, `timeZone` | Dates use the selected language and UTC unless you specify a date locale or time zone. Changing `locale` alone doesn't change viewer labels. |
| `footerText`, `poweredBy` | Set a footer with `{number}` and `{s}`, or hide the package credit. |
| `timeoutMs`, `archiveTimeoutMs` | Download timeout per attachment (8 seconds) and shared attachment deadline per transcript (45 seconds). |
| `callbacks` | Pass `resolveUser(id)`, `resolveChannel(id)` or `resolveRole(id)` in code to supply mention names. By default the renderer checks the cache and keeps the ID if the name is unknown. |

## Compatibility and tests

This independent implementation supports the original export functions, `ExportReturnType` and the `attachment`, `buffer` and `string` outputs. It generates static HTML; it doesn't use the original package's React components, its v3.3 image downloader or the legacy `hydrate` option. Discord buttons appear as labels; URL buttons remain links.

Run `npm install --ignore-scripts` and `npm test` to test locally. The compatibility workflow installs the packed archive under the original name and checks it against discord.js 13.17.1, 14.28.1 and a v15 development build without logging a bot in.
