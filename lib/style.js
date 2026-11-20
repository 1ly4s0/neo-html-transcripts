const { readFileSync } = require('node:fs');
const { join } = require('node:path');

// Read once per process; each exported file remains independent of the bot.
const font = readFileSync(join(__dirname, 'fonts/figtree-latin-wght-normal.woff2')).toString('base64');
const license = readFileSync(join(__dirname, 'fonts/Figtree-OFL.txt'), 'utf8');
const figtree = `/* ${license} */
@font-face{font-family:"Figtree";font-style:normal;font-weight:300 900;font-display:swap;src:url("data:font/woff2;base64,${font}") format("woff2")}`;

// Full names and PostScript names differ between desktop font installations.
const localFaces = [[400, 'Regular'], [500, 'Medium'], [600, 'Semibold'], [700, 'Bold']]
  .map(([weight, name]) => `@font-face{font-family:"Transcript GG";font-style:normal;font-weight:${weight};src:local("gg sans ${name}"),local("ggsans-${name}")${weight === 400 ? ',local("gg sans")' : ''}}`).join('\n');

module.exports = ({ accent, theme }) => `
${localFaces}
${figtree}
:root {
  color-scheme: dark; --bg:#36393f; --fg:#dcddde; --strong:#fff; --muted:#babcc0;
  --panel:#2f3136; --inset:#202225; --line:#4b4e54; --hover:#32353b; --link:#65baff;
  --mention-bg:#50557e; --mention-fg:#e0e3ff; --accent:${accent};
}
${theme === 'light' ? ':root {color-scheme:light;--bg:#fff;--fg:#313338;--strong:#17181b;--muted:#565961;--panel:#f2f3f5;--inset:#e3e5e8;--line:#c4c8ce;--hover:#f7f8fa;--link:#0066ad;--mention-bg:#e6e8fd;--mention-fg:#3545a0}' : ''}
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.375 "Transcript GG","gg sans","Figtree",Whitney,"Segoe UI",system-ui,sans-serif}
.chat{padding-bottom:1rem;--gutter:56px}.heading{display:flex;align-items:center;gap:10px;padding:8px;border-bottom:1px solid var(--line)}
.heading>div,section{min-width:0;overflow-wrap:anywhere}.heading strong{font-size:1.25rem;color:var(--strong)}.heading h1{font-size:1rem;margin:2px 0;font-weight:500}
.guild-icon{display:grid;place-items:center;flex:none;width:80px;height:80px;border-radius:50%;background:var(--line);font-size:32px;color:var(--muted);object-fit:cover}
.topic{font-size:.875rem;color:var(--muted);white-space:pre-wrap}.day-divider{display:flex;align-items:center;gap:8px;margin:18px 16px 4px;color:var(--muted);font-size:.75rem;font-weight:600}
.day-divider::before,.day-divider::after{content:"";flex:1;border-top:1px solid var(--line)}
.message{display:grid;grid-template-columns:var(--gutter) minmax(0,1fr);padding:2px 16px;margin-top:12px;scroll-margin-block:12px}
.message:hover,.message:target{background:var(--hover)}.message:target{box-shadow:inset 2px 0 var(--accent)}.continuation{margin:0}.gutter{grid-column:1}
.message section{grid-column:2}.message header{display:flex;align-items:baseline;gap:.4rem;flex-wrap:wrap}
.author{color:var(--strong);font-weight:600}.bot{background:#5865f2;color:#fff;font-family:inherit;font-size:10px;line-height:15px;font-weight:700;border-radius:3px;padding:0 4px;align-self:center}
.message time,.text small,figcaption,.embed-footer,footer,.file small{color:var(--muted);font-size:.75rem}
.gutter time{opacity:0;font-size:.62rem}.message:hover .gutter time,.message:focus-within .gutter time{opacity:1}
.no-avatars{--gutter:0px}.no-avatars .gutter{width:0;overflow:hidden}
.avatar{position:relative;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:hsl(var(--hue) 42% 39%);color:white;font-weight:600}
.avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.text,.description,dd{white-space:pre-wrap}.text:empty{display:none}
a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}:focus-visible{outline:2px solid var(--link);outline-offset:2px}
.reply{grid-column:2;position:relative;overflow-wrap:anywhere;font-size:.825rem;color:var(--muted);padding-bottom:3px}.reply b{color:var(--fg)}.reply::before{content:"";position:absolute;right:calc(100% + 5px);bottom:0;width:29px;height:60%;border:solid var(--line);border-width:2px 0 0 2px;border-radius:5px 0 0}
.no-avatars .reply::before{display:none}.mention{background:var(--mention-bg);color:var(--mention-fg);padding:0 2px;border-radius:3px;font-weight:500}
.emoji,.mini{width:20px;height:20px;object-fit:contain;vertical-align:middle}.mini{border-radius:50%}.twemoji{display:inline-block;overflow:hidden;white-space:nowrap;color:transparent;background-position:center;background-size:contain;background-repeat:no-repeat;forced-color-adjust:none;vertical-align:-.22em}.reaction .emoji,.button .emoji{width:1rem;height:1rem}
.embed{display:flow-root;max-width:min(100%,32rem);width:fit-content;margin:.3rem 0 0;padding:.75rem 1rem;background:var(--panel);border-left:4px solid var(--accent);border-radius:4px;overflow-wrap:anywhere;font-size:.875rem}
.embed-title{display:block;color:var(--strong);font-size:1rem}.embed-author,.embed-footer{display:flex;align-items:center;gap:6px}.embed-author{font-weight:600;color:var(--strong)}
.embed-author+.embed-title,.description,.embed dl,.embed-footer{margin-top:.4rem}.thumbnail{float:right;width:72px;max-width:25%;max-height:80px;object-fit:contain;margin-left:1rem;border-radius:4px}
.embed dl{clear:both;display:flex;flex-wrap:wrap;gap:8px 12px;margin-bottom:0}.field{flex:1 0 100%;min-width:0}.field.inline{flex:1 1 26%}.field dt{font-weight:600;color:var(--strong)}dd{margin:0}
.embed-image,figure img{display:block;max-width:100%;height:auto;max-height:24rem;object-fit:contain;border-radius:3px}.embed-image{border-radius:4px;margin-top:.6rem}figure{margin:5px 0}
.file{width:fit-content;max-width:100%;display:flex;align-items:center;gap:10px;padding:10px 14px;margin:5px 0 0;background:var(--panel);border:1px solid var(--inset);border-radius:3px}
.file-icon{position:relative;width:25px;height:32px;border:2px solid var(--muted);border-radius:4px;flex:none}.file-icon:after{content:"";position:absolute;top:-2px;right:-2px;width:8px;height:8px;background:linear-gradient(45deg,var(--muted) 49%,var(--panel) 50%)}.file-icon:before{content:"";position:absolute;left:4px;right:4px;top:13px;height:4px;border-block:1px solid var(--muted)}.file small{display:block}
.action-row,.reactions{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.reaction,.button{display:inline-flex;align-items:center;gap:5px;border-radius:3px}
.reaction{border-radius:.5rem;padding:2px 7px;background:var(--panel);border:1px solid var(--line);font-size:.8rem}.reaction b{font-weight:500}
.button{font-size:.875rem;font-weight:600;line-height:1.25rem;padding:7px 15px;color:white;background:#50535b}.button a{color:inherit}.button.primary{background:#505bd9}.button.success{background:#267a50}.button.danger{background:#bb3439}.button.disabled{opacity:.65}
code,pre{background:var(--panel);border-radius:4px;font: .875rem/1.45 ui-monospace,monospace}code{padding:1px 4px}pre{padding:8px;border:1px solid var(--inset);white-space:pre-wrap;margin:3px 0}pre code{padding:0}
footer{margin:24px 16px 0;border-top:1px solid var(--line);padding-top:10px;text-align:center}summary{cursor:pointer}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media(max-width:540px){.chat:not(.no-avatars){--gutter:44px}.message{padding-inline:10px}.avatar{width:34px;height:34px}.heading{padding:10px;gap:10px}.guild-icon{width:48px;height:48px}.field.inline{flex-basis:100%}.embed{padding:.6rem .75rem}.reply::before{width:22px}}
@media print{body{background:white;color:black}.message{break-inside:avoid}.gutter time{opacity:1}footer{color:black}}
`;
