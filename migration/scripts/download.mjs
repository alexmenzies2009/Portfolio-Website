import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
const [listFile, outDir] = process.argv.slice(2);
const ids = JSON.parse(await readFile(listFile, 'utf8'));
const extra = [['playground-hero.mp4', 'https://framerusercontent.com/assets/uzqTvMN6yj99XZorPiYzNPESqo.mp4']];
const jobs = [...ids.map(id => [id, 'https://framerusercontent.com/images/' + id]), ...extra];
let total = 0, done = 0, failed = [];
async function one([name, url]) {
  const dest = path.join(outDir, name);
  try { const s = await stat(dest); if (s.size > 0) { total += s.size; done++; return; } } catch {}
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(dest, buf); total += buf.length; done++; return;
    } catch (e) { if (attempt === 2) failed.push(name + ' ' + e.message); }
  }
}
const queue = [...jobs];
await Promise.all(Array.from({ length: 8 }, async () => { while (queue.length) await one(queue.shift()); }));
console.log('downloaded', done, '/', jobs.length, '| total MB', (total / 1e6).toFixed(1), '| failed', failed.length, failed.join('; '));
