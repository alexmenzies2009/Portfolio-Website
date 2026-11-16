import { writeFile } from 'node:fs/promises';
import path from 'node:path';
const outDir = process.argv[2];
const base = 'https://alexmenzies.framer.website';
const idxUrl = 'https://framerusercontent.com/sites/zppRV6bOVV7Zr4tDxxUkk/searchIndex-pLJ6d8TReYXG.json';
const idx = await (await fetch(idxUrl)).json();
await writeFile(path.join(outDir, '_searchIndex.json'), JSON.stringify(idx, null, 1));
const urls = Object.keys(idx);
let ok = 0;
for (const u of urls) {
  const res = await fetch(base + u, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' } });
  const html = await res.text();
  const name = (u === '/' ? 'index' : u.replace(/^\//, '').replace(/\//g, '__')) + '.html';
  await writeFile(path.join(outDir, name), html);
  console.log(res.status, u, html.length);
  if (res.ok) ok++;
}
console.log('done', ok, '/', urls.length);
