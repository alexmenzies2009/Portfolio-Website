import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const [assetsDir, contentFile, out] = process.argv.slice(2);
const c = JSON.parse(await readFile(contentFile, 'utf8'));
const items = [
  ['logo', c.site.logo], ['og', c.site.ogImage], ['portrait', c.about.portrait], ['contact', c.site.contactImage],
  ...c.about.services.map((s, i) => ['svc' + (i + 1), s.image]),
  ...c.site.filmStrip.map((s, i) => ['film' + (i + 1), s]),
  ...c.playground.items.map((s, i) => ['pg' + (i + 1), s.image]),
];
const cell = 250, pad = 6, cols = 8;
const comps = [];
for (const [i, [label, id]] of items.entries()) {
  const buf = await sharp(path.join(assetsDir, id)).resize(cell, cell, { fit: 'contain', background: '#333' }).flatten({ background: '#333' }).jpeg({ quality: 72 }).toBuffer();
  const x = (i % cols) * (cell + pad), y = Math.floor(i / cols) * (cell + pad);
  comps.push({ input: buf, left: x, top: y });
  comps.push({ input: Buffer.from(`<svg width="90" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="24" fill="black"/><text x="5" y="17" font-family="Helvetica" font-size="15" font-weight="bold" fill="white">${label}</text></svg>`), left: x, top: y });
}
await sharp({ create: { width: cols * (cell + pad), height: Math.ceil(items.length / cols) * (cell + pad), channels: 3, background: '#111' } }).composite(comps).jpeg({ quality: 74 }).toFile(out);
const m = JSON.parse(await readFile(path.join(path.dirname(contentFile), 'image-meta.json'), 'utf8'));
console.log(items.map(([l, id]) => l + ':' + m[id].w + 'x' + m[id].h).join(' '));
