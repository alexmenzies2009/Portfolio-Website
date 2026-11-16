import sharp from 'sharp';
import potrace from 'potrace';
import { writeFile } from 'node:fs/promises';
const [src, out] = process.argv.slice(2);
const trimmed = await sharp(src).trim({ threshold: 1 }).toBuffer();
const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// alpha histogram
const hist = new Array(256).fill(0);
for (let i = 3; i < data.length; i += 4) hist[data[i]]++;
const top = hist.map((n, a) => [a, n]).filter(([a, n]) => a > 0 && a < 255 && n > 2000).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log('size', info.width, info.height, 'opaque', hist[255], 'semi peaks', JSON.stringify(top));
const mask = async (test) => {
  const buf = Buffer.alloc(info.width * info.height);
  for (let p = 0, i = 3; i < data.length; i += 4, p++) buf[p] = test(data[i]) ? 0 : 255; // black = shape for potrace
  return sharp(buf, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toBuffer();
};
const trace = (png) => new Promise((res, rej) => potrace.trace(png, { turdSize: 20, optTolerance: 0.4, alphaMax: 1, threshold: 128 }, (e, svg) => e ? rej(e) : res(svg)));
const pathOf = svg => svg.match(/ d="([^"]+)"/)[1];
const solid = pathOf(await trace(await mask(a => a > 200)));
const fold = pathOf(await trace(await mask(a => a > 30 && a <= 200)));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${info.width} ${info.height}" fill="currentColor"><path opacity=".3" fill-rule="evenodd" d="${fold}"/><path fill-rule="evenodd" d="${solid}"/></svg>`;
await writeFile(out, svg);
console.log('svg bytes', svg.length);
await sharp(Buffer.from(svg.replace('currentColor', '#fff'))).resize(900).flatten({ background: '#222' }).png().toFile(out.replace('.svg', '-check.png'));
