import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const [assetsDir, contentFile, outDir] = process.argv.slice(2);
const content = JSON.parse(await readFile(contentFile, 'utf8'));
const files = (await readdir(assetsDir)).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
const meta = {};
for (const f of files) {
  const img = sharp(path.join(assetsDir, f), { animated: false });
  const m = await img.metadata();
  const st = await img.stats();
  meta[f] = { w: m.width, h: m.height, alpha: m.hasAlpha && !st.isOpaque, pages: m.pages || 1, fmt: m.format };
}
await writeFile(path.join(outDir, 'image-meta.json'), JSON.stringify(meta, null, 1));
const ws = Object.values(meta).map(m => m.w).sort((a, b) => a - b);
console.log('count', files.length, 'width min/median/max', ws[0], ws[ws.length >> 1], ws[ws.length - 1]);
console.log('alpha:', Object.entries(meta).filter(([, m]) => m.alpha).map(([f, m]) => f + ' ' + m.w + 'x' + m.h).join(', '));
console.log('small (<1000w):', Object.entries(meta).filter(([, m]) => m.w < 1000).map(([f, m]) => f + ' ' + m.w + 'x' + m.h).join(', '));
// contact sheet of covers
const cell = 220, pad = 6, cols = 9;
const items = content.projects.map(p => ({ id: p.cover, label: String(p.order) }));
const rowsN = Math.ceil(items.length / cols);
const comps = [];
for (const [i, it] of items.entries()) {
  const buf = await sharp(path.join(assetsDir, it.id)).resize(cell, cell, { fit: 'cover' }).jpeg({ quality: 70 }).toBuffer();
  const x = (i % cols) * (cell + pad), y = Math.floor(i / cols) * (cell + pad);
  comps.push({ input: buf, left: x, top: y });
  const svg = Buffer.from(`<svg width="46" height="26" xmlns="http://www.w3.org/2000/svg"><rect width="46" height="26" fill="black"/><text x="6" y="19" font-family="Helvetica" font-size="17" font-weight="bold" fill="white">${it.label}</text></svg>`);
  comps.push({ input: svg, left: x, top: y });
}
await sharp({ create: { width: cols * (cell + pad), height: rowsN * (cell + pad), channels: 3, background: '#111' } }).composite(comps).jpeg({ quality: 72 }).toFile(path.join(outDir, 'covers-sheet.jpg'));
console.log('sheet written');
