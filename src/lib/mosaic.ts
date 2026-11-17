// Build-time data for the "portrait made of projects" hero (/ and /backup):
//   atlas  one image holding a tiny thumbnail of every project image, sorted dark to light
//   map    which cells of the portrait are part of the person, and how bright each one is
// Both are regenerated on every build, so new projects join the portrait automatically.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const TILE = 96; // big enough to stay sharp when a thumbnail is magnified under the cursor
const ATLAS_COLS = 16;
const GRID_COLS = 100;
const WORK = path.join(process.cwd(), 'src', 'content', 'work');
const PORTRAIT = path.join(process.cwd(), 'src', 'assets', 'about', 'portrait-cutout.webp');

let atlasCache: Promise<{ buffer: Buffer; count: number; cols: number; rows: number; slugs: string[] }> | null = null;

export function buildAtlas() {
  atlasCache ??= (async () => {
    const files: string[] = [];
    for (const dir of await readdir(WORK, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const f of await readdir(path.join(WORK, dir.name))) if (/\.(jpe?g|png|webp|avif)$/i.test(f)) files.push(path.join(WORK, dir.name, f));
    }
    const tiles = await Promise.all(
      files.map(async (file) => {
        const input = await sharp(file).resize(TILE, TILE, { fit: 'cover' }).flatten({ background: '#101011' }).removeAlpha().png().toBuffer();
        const { channels } = await sharp(input).stats();
        return { input, slug: path.basename(path.dirname(file)), lum: 0.2126 * channels[0].mean + 0.7152 * channels[1].mean + 0.0722 * channels[2].mean };
      }),
    );
    tiles.sort((a, b) => a.lum - b.lum);
    const rows = Math.ceil(tiles.length / ATLAS_COLS);
    const buffer = await sharp({ create: { width: ATLAS_COLS * TILE, height: rows * TILE, channels: 3, background: '#101011' } })
      .composite(tiles.map((t, i) => ({ input: t.input, left: (i % ATLAS_COLS) * TILE, top: Math.floor(i / ATLAS_COLS) * TILE })))
      .webp({ quality: 76 })
      .toBuffer();
    return { buffer, count: tiles.length, cols: ATLAS_COLS, rows, slugs: tiles.map((t) => t.slug) };
  })();
  return atlasCache;
}

export async function buildMap() {
  const meta = await sharp(PORTRAIT).metadata();
  const cols = GRID_COLS;
  const rows = Math.round((cols * (meta.height ?? 1)) / (meta.width ?? 1));
  const { data } = await sharp(PORTRAIT).resize(cols, rows, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Brightness is rank-equalised over the person's pixels: a dark shirt and a bright face
  // would otherwise use two narrow bands of the range and the features would wash out.
  const cells: { x: number; y: number; lum: number }[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      if (data[i + 3] < 110) continue;
      cells.push({ x, y, lum: 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] });
    }
  }
  const ranked = [...cells].sort((a, b) => a.lum - b.lum);
  const rank = new Map(ranked.map((c, i) => [c, i / Math.max(1, ranked.length - 1)]));
  // flat list of [column, row, brightness 0-255] for every cell that belongs to the person
  const points = cells.flatMap((c) => [c.x, c.y, Math.round((0.35 * (c.lum / 255) + 0.65 * (rank.get(c) ?? 0)) * 255)]);
  const atlas = await buildAtlas();
  // which project each thumbnail belongs to, so a hovered tile can name and open its project
  const slugs = [...new Set(atlas.slugs)];
  const projects = await Promise.all(
    slugs.map(async (slug) => {
      const text = await readFile(path.join(WORK, slug, 'index.md'), 'utf8').catch(() => '');
      const title = text.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1] ?? slug;
      return { slug, title };
    }),
  );
  const tiles = atlas.slugs.map((slug) => slugs.indexOf(slug));
  return { cols, rows, points, atlas: { count: atlas.count, cols: atlas.cols, rows: atlas.rows }, tiles, projects };
}
