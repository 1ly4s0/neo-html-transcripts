module.exports = ({ accent, theme }) => `
:root{--accent:${accent};--bg:#23252b;--fg:#f3f4f7;--muted:#b8bbc5;--panel:#30333b;color-scheme:dark}
${theme === 'light' ? ':root{--bg:#fff;--fg:#24262b;--muted:#575965;--panel:#f2f3f7;color-scheme:light}' : ''}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:54rem;margin:auto;padding:clamp(1rem,4vw,3rem)}.heading{border-top:4px solid var(--accent);padding:1rem 0}
h1{margin:.15em 0;overflow-wrap:anywhere}article{display:flex;gap:.8rem;padding:.8rem 0;border-top:1px solid var(--panel)}
section{min-width:0;overflow-wrap:anywhere}.avatar{width:40px;height:40px;border-radius:50%}.emoji{height:1.4em;vertical-align:middle}
time,small,figcaption,footer{color:var(--muted);font-size:.85em}header b{margin-right:.35rem}
.text,aside,dd{white-space:pre-wrap}a,.mention{color:${theme === 'light' ? '#3241a8' : '#aebaff'}}aside,pre,.control{background:var(--panel);border-radius:.4rem}
aside{border-left:4px solid var(--accent);padding:.7rem 1rem;margin:.5rem 0}aside strong,aside small{display:block}aside img,figure img{max-width:100%;max-height:22rem}
figure,dl,p{margin:.5rem 0}dt{font-weight:600}dd{margin:0}pre{padding:.7rem;overflow:auto}.control{display:inline-block;padding:.1em .55em;margin:.2em}
footer{padding:1rem 0;text-align:center}summary{cursor:pointer}
@media print{body{background:white;color:black}article,figure{break-inside:avoid}}
`;
