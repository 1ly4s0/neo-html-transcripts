# neo-html-transcripts

[![English](https://img.shields.io/badge/docs-English-5865F2)](./README.md) [![Español](https://img.shields.io/badge/docs-Español-5865F2)](./README.es.md)

Guarda la conversación de un canal en un HTML que puedes abrir con el navegador. Si necesitas conservar también el PDF que envió un usuario o el ZIP con sus logs, puedes guardar los archivos dentro del HTML. No hace falta que la persona que lo abra tenga Discord.

## Ya uso discord-html-transcripts

Cambia la dependencia, no los comandos de tu bot. Desde la carpeta de tu proyecto:

```sh
npm install discord-html-transcripts@npm:neo-html-transcripts@^1.1.0
```

Tu `require('discord-html-transcripts')` (o tu `import`) sigue funcionando. Si empiezas de cero, usa `npm install neo-html-transcripts` e importa ese nombre.

Esta es una implementación independiente. Conserva `createTranscript`, `generateFromMessages`, `ExportReturnType` y las salidas `attachment`, `buffer` y `string`. No intenta reproducir el HTML interno ni expone los componentes React o el descargador de imágenes de la versión 3.3 del [paquete original](https://github.com/ItzDerock/discord-html-transcripts). El HTML es estático: la opción antigua `hydrate` no hace falta. La compatibilidad se prueba con discord.js 13.17.1, 14.28.1 y una **preversión** de v15; v15 aún no tiene una versión estable probada.

## Elegir idioma

Por defecto, el HTML está en inglés. Para generarlo en español, elige el idioma cuando importes el paquete:

```js
const { createTranscript } = require('neo-html-transcripts').withLanguage('es');
```

Con módulos ES:

```js
import { withLanguage } from 'neo-html-transcripts';
const { createTranscript, generateFromMessages } = withLanguage('es');
```

Puedes tener una instancia en inglés y otra en español en el mismo bot. Para cambiar solo un ticket, pasa `{ language: 'en' }` en esa llamada. La selección afecta a los textos del visor, no traduce el chat ni el pie de página que hayas escrito.

## Quiero cambiar los colores y guardar los adjuntos

Crea un archivo llamado `neo-transcripts.json` en la carpeta **desde la que arrancas Node**. Se lee en cada exportación. Por ejemplo, para tickets de soporte en horario peninsular:

```json
{
  "brand": "Soporte de NEO",
  "accent": "#7289da",
  "theme": "dark",
  "language": "es",
  "locale": "es-ES",
  "timeZone": "Europe/Madrid",
  "attachmentMode": "base64",
  "maxFileBytes": 8388608,
  "maxTotalBytes": 25165824,
  "footerText": "{number} mensaje{s} en este ticket",
  "poweredBy": false
}
```

Elige qué hacer con los archivos:

| `attachmentMode` | Qué queda en el HTML |
| --- | --- |
| `url` (por defecto) | Enlaces a Discord. Pesa poco, pero los enlaces firmados pueden caducar. |
| `images` | Copia las imágenes compatibles. Para los demás archivos conserva el enlace. Es el equivalente a `saveImages: true` para los adjuntos. |
| `base64` | Copia también PDF, ZIP, audio y otros adjuntos. Las imágenes se ven en la conversación y el resto tiene un enlace de descarga con el nombre original. |

Los emojis Unicode usan [Twemoji](https://github.com/jdecked/twemoji) (gráficos © Twitter y colaboradores, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)). El HTML guarda solo los iconos que aparecen en el chat, así que se ven sin conexión. Los emojis del servidor conservan sus imágenes de Discord. Si tienes gg sans instalada, el visor la usa. Si no, usa [Figtree](https://github.com/erikdkennedy/figtree). El HTML incluye la fuente latina de peso variable y su licencia SIL Open Font License, así que también funciona sin conexión.

Se descargan **adjuntos de mensajes** desde la CDN de Discord, no cualquier enlace que alguien pegue en el chat. El texto y los archivos copiados funcionan sin conexión; los avatares, emojis personalizados y las imágenes enlazadas en embeds pueden necesitar internet. Si un archivo falla, su nombre aparece con **No archivado** y el enlace original. No se puede recuperar un archivo que Discord ya no sirve.

Los límites se aplican a los bytes originales: 8 MiB por archivo y 24 MiB de archivos copiados por transcript, salvo que los cambies. Base64 ocupa aproximadamente un tercio más. Si vas a enviar el HTML a Discord, ten en cuenta el límite de subida de tu servidor. Un HTML con archivos dentro **no está cifrado**: quien reciba una copia podrá leerla incluso después de cerrar el ticket.

## Dos ejemplos

**Enviar los últimos 50 mensajes** al canal privado de moderación:

```js
const { createTranscript } = require('neo-html-transcripts').withLanguage('es');

async function archivarTicket(ticket, canalDeModeracion) {
  const archivo = await createTranscript(ticket, {
    limit: 50,
    filename: 'ticket-' + ticket.id + '.html'
  });
  await canalDeModeracion.send({ files: [archivo] });
}
```

El bot necesita ver el canal y leer su historial. Para que Discord entregue el contenido y los adjuntos de mensajes de usuarios, tu aplicación necesita acceso a Message Content en los casos en que Discord lo exige. Si la API no entrega esos datos, la librería no puede reconstruirlos.

**Guardar en disco los mensajes que ya tienes** sin volver a pedirlos a Discord:

```js
const { writeFile } = require('node:fs/promises');
const { generateFromMessages } = require('neo-html-transcripts').withLanguage('es');

async function guardarSeleccion(canal, seleccion) {
  const mensajes = [...seleccion.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  const html = await generateFromMessages(mensajes, canal, {
    returnType: 'buffer',
    attachmentMode: 'base64',
    title: 'Revisión de soporte',
    showAvatars: false
  });
  await writeFile('revision.html', html);
}
```

`createTranscript` pagina hacia atrás y devuelve los mensajes en orden de conversación. `limit: -1` pide todo el historial; `0` no pide mensajes. Puedes pasar `filter: m => !m.author.bot`: el límite cuenta los mensajes que pasan el filtro. `generateFromMessages` respeta el orden de tu array o colección.

## Opciones

El idioma de una llamada tiene prioridad sobre el de la instancia, y este sobre el del JSON. Sin los tres, se usa inglés.

| Opción | Para qué sirve |
| --- | --- |
| `title`, `brand` | Título y nombre que aparece encima. Por defecto, canal y servidor. |
| `theme`, `accent` | Tema `dark` o `light` y color de seis dígitos, por ejemplo `#5865f2`. |
| `showAvatars`, `favicon` | Muestra u oculta avatares; usa `"guild"`, una URL HTTPS o `""` para el icono. |
| `locale`, `timeZone` | Formato y zona horaria de las fechas. Por defecto se usan el idioma elegido y UTC; puedes elegir otro formato sin cambiar los textos. |
| `footerText`, `poweredBy` | Texto al pie (admite `{number}` y `{s}`) y firma del paquete. |
| `timeoutMs`, `archiveTimeoutMs` | Espera por descarga (8 s) y plazo compartido para adjuntos de un transcript (45 s). |
| `callbacks` | En código, puedes pasar `resolveUser(id)`, `resolveChannel(id)` y `resolveRole(id)` para las menciones. Sin callback se usa la caché; si falta un nombre se conserva el ID. |

No ejecuta scripts dentro del transcript. Los botones de Discord quedan como etiquetas y los botones con URL siguen siendo enlaces. Respuestas, embeds, reacciones, spoilers y bloques de código se pueden leer sin cargar un visor externo.

## Desarrollo

Para ejecutar las pruebas: `npm install --ignore-scripts` y `npm test`. La prueba de compatibilidad instala el tarball con el alias original en un proyecto aparte; usa mensajes y colecciones del SDK real, sin iniciar un bot ni abrir tickets.
