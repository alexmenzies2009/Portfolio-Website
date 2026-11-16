// NOTE: historical. It wrote projects as src/content/work/<slug>.md with images in src/assets/work;
// the site has since moved to one folder per project (src/content/work/<slug>/). Do not re-run as is.
// One-off migration: turns the Framer export (migration/content.json + migration/assets)
// into the site's real content: src/content/work/*.md and optimised images in src/assets.
// Safe to re-run; it overwrites what it generated.
import { readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ACCENT } from './accents.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const M = (...p) => path.join(root, 'migration', ...p);
const S = (...p) => path.join(root, 'src', ...p);
const content = JSON.parse(await readFile(M('content.json'), 'utf8'));

// ---------- copy fixes (spelling / capitalisation only; wording untouched) ----------
const FIX = {
  'blue2purple': {
    tagline: "Colourful branding for a new company's website.",
    about: 'Creating a banner that represents the services of Blue2Purple differently than usual, by creating a fun and inspirational image that shows off social media and how every case has a different style.',
  },
  'hairspace': {
    tagline: 'How to make a first impression? By creating an eye-catching business card!',
    about: "For this assignment, I received a zip file with Hairspace's logo and brand guide attached. For this, I created a proposal for a business card.",
  },
  'axa': { about: 'What better way to protect yourself than with a company that does it for you. Get attracted to company-guided banners to change your mind.' },
  'the-batman-banners': { tagline: 'What about a movie? Cool banners to promote it.' },
  'smartdata': { tagline: 'New and modern look? Create a new variant for your logo.' },
  'christmas': {
    tagline: 'The end of the year is almost here! Take your company postcard to the next level!',
    about: 'Creating a company-styled postcard for all members.',
  },
  'deepspace': { about: "Traveling to outer space to find what? A location that's unknown to the human eye." },
  'boogie': { tagline: "Let's get moving! Maybe? No? Okay!", about: 'Creating a logo for a friend who uses old CD players to create a moving dance called Boogie.' },
  'archco': { about: 'A new brand identity for an architectural bureau that focuses on creating unique buildings.' },
  'mirace': { tagline: "What's on the menu? A great restaurant.", about: 'A new brand identity for a chic restaurant.' },
  'ikonik': { tagline: 'Want to buy a house? Check out this new agency to get top-class homes.' },
  'fest-gent': { about: 'The core assignment was to create the website for Design Fest Gent. Based on the created personae, mood boards, information architecture, wireframe and design system, I now had to create the final website.' },
  'back-to-school': { tagline: 'Creating beautiful banners for a new back to school campaign.' },
  'schuifdeurtje': { about: 'Schuifdeurtje.nl wanted a design for its new homepage. They mainly focus on selling different doors in different materials. The customer already knew which parts they wanted to see on the homepage, so I implemented them.' },
  'kotfinder': { tagline: 'Searching for a new place to lay down for your studies? Find it super fast.' },
  'vrije-tijd': { about: "In a group of 4 men, we have created a paper that talks about leisure time. This paper deals with the problem statement “don't say hang out but socialize”. We are writing this paper as a result of an assignment for Communication 1 for the Multimedia and Communication Technology course at Erasmus University, Brussels." },
  'easygym-animation': { about: 'Scan it, work out! This 2D animatic video tutorial will encourage exercisers to use a website that explains to them how gym devices work properly by scanning a QR code.' },
  'easygym-folder': {
    tagline: 'Read why Easygym is the alternative to your gym buddy.',
    about: 'To represent my bachelor I had to create a folder explaining in detail what my project was about and how I achieved this with all my research.',
  },
  'pizza-hut-the-box': { tagline: "What's in it? That's the big question, check it out!" },
  'pizza-hut-bearnaise': { tagline: "Something new? Let's taste it!" },
  'pizza-hut-jeudi': { tagline: 'Anyone up for a pizza on Jeudi? Yes please!' },
  'pizza-hut-mardi-malin': { tagline: 'Anyone up for a pizza on Mardi? Yes please!' },
  'pizza-hut-delivery': { tagline: 'Food delivery anyone? Let taste take you over in images at your front door!' },
  'blaton': { about: 'Creating a vector banner for the company Blaton using Illustrator.' },
  'coldwalk': { about: 'Creating a vector banner using Illustrator.' },
  'personal': { tagline: "Who am I? That's the real question.", about: "No need to explain what this is. This is my logo, that's it. Check out my other projects." },
  'architect': { about: 'How to stand out as an architect? By creating a beautiful and inspiring portfolio with the use of large and impactful images and helpful information.' },
  'dancing-granny': { tagline: 'Anyone can dance at any age, just follow the beat.', about: 'Creating a simple animation of a dancing granny following the music.' },
  'burger-king': { about: 'Creating a simple animation for the Burger King logo.' },
  'mario': { tagline: 'Yahooooo!' },
};
const PIZZA_ABOUT = "Creating beautiful new banners to promote Pizza Hut's new pizzas or options for social media.";

const TOOL = { AI: 'Illustrator', PSD: 'Photoshop', AE: 'After Effects', PR: 'Premiere Pro', XD: 'Adobe XD', Indesign: 'InDesign', Code: 'Code', Midjourney: 'Midjourney' };
const FEATURED = ['blue2purple', 'luminus', 'hairspace', 'the-batman'];

// ---------- colour helpers (OKLCH) ----------
const toLin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function rgbToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function oklabToRgb(L, a, b) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
function oklchToHex(L, C, H) {
  const h = (H * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.004) {
    const rgb = oklabToRgb(L, c * Math.cos(h), c * Math.sin(h));
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return '#' + rgb.map((v) => Math.round(Math.min(1, Math.max(0, toSrgb(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('');
  }
  return '#edeae4';
}
/** Picks the most present vivid hue of an image and returns a UI-safe accent (or null when the image is basically grey). */
async function accentOf(file) {
  const { data, info } = await sharp(file).resize(64, 64, { fit: 'cover' }).flatten({ background: '#0a0a0b' }).raw().toBuffer({ resolveWithObject: true });
  const BINS = 30; const bins = Array.from({ length: BINS }, () => ({ w: 0, sin: 0, cos: 0, c: 0 }));
  let vivid = 0; const total = info.width * info.height;
  for (let i = 0; i < data.length; i += info.channels) {
    const [L, a, b] = rgbToOklab(toLin(data[i]), toLin(data[i + 1]), toLin(data[i + 2]));
    const C = Math.hypot(a, b);
    if (C < 0.06 || L < 0.22 || L > 0.96) continue;
    vivid++;
    const hue = (Math.atan2(b, a) * 180) / Math.PI + 360;
    const w = C ** 1.6;
    const bin = bins[Math.floor(((hue % 360) / 360) * BINS) % BINS];
    bin.w += w; bin.sin += Math.sin((hue * Math.PI) / 180) * w; bin.cos += Math.cos((hue * Math.PI) / 180) * w; bin.c += C * w;
  }
  if (vivid / total < 0.012) return null;
  let best = 0, bestScore = -1;
  for (let i = 0; i < BINS; i++) { const sc = bins[i].w + 0.6 * (bins[(i + 1) % BINS].w + bins[(i + BINS - 1) % BINS].w); if (sc > bestScore) { bestScore = sc; best = i; } }
  const g = [bins[(best + BINS - 1) % BINS], bins[best], bins[(best + 1) % BINS]];
  const w = g.reduce((s, x) => s + x.w, 0);
  const hue = ((Math.atan2(g.reduce((s, x) => s + x.sin, 0), g.reduce((s, x) => s + x.cos, 0)) * 180) / Math.PI + 360) % 360;
  const chroma = g.reduce((s, x) => s + x.c, 0) / w;
  return oklchToHex(0.8, Math.min(0.17, Math.max(0.105, chroma * 1.05)), hue);
}

// ---------- image pipeline ----------
const done = new Map();
async function put(id, destRel) {
  const dest = S('assets', destRel);
  if (done.has(dest)) return;
  await mkdir(path.dirname(dest), { recursive: true });
  await sharp(M('assets', id)).rotate().resize({ width: 2560, height: 5200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88, effort: 5 }).toFile(dest);
  done.set(dest, true);
}
const yaml = (v) => JSON.stringify(v);

await rm(S('content', 'work'), { recursive: true, force: true });
await rm(S('assets', 'work'), { recursive: true, force: true });
await mkdir(S('content', 'work'), { recursive: true });

const report = [];
for (const p of content.projects) {
  const fix = FIX[p.slug] || {};
  const rest = p.images.filter((id) => id !== p.cover);
  await put(p.cover, `work/${p.slug}/cover.webp`);
  const gallery = [];
  for (const [i, id] of rest.entries()) { const name = String(i + 1).padStart(2, '0') + '.webp'; await put(id, `work/${p.slug}/${name}`); gallery.push(`../../assets/work/${p.slug}/${name}`); }
  const accent = p.slug in ACCENT ? ACCENT[p.slug] : await accentOf(M('assets', p.cover));
  const tags = p.category.split('&').map((t) => t.trim()).filter(Boolean);
  const tools = p.tools.split(',').map((t) => TOOL[t.trim()] || t.trim()).filter(Boolean);
  let link = null;
  if (p.live) {
    const host = new URL(p.live).host;
    link = { label: /xd\.adobe/.test(host) ? 'View prototype' : /vimeo|adobe\.io/.test(host) ? 'Watch video' : 'Live site', url: p.live };
  }
  let video = null;
  if (p.embed) {
    const yt = p.embed.match(/youtube\.com\/embed\/([\w-]+)/); const vm = p.embed.match(/vimeo\.com\/video\/(\d+)/);
    if (yt) video = { provider: 'youtube', id: yt[1] }; else if (vm) video = { provider: 'vimeo', id: vm[1] };
  }
  let about = fix.about || (p.slug.startsWith('pizza-hut') ? PIZZA_ABOUT : p.about);
  const fm = [
    '---',
    `title: ${yaml(p.title)}`,
    `tagline: ${yaml(fix.tagline || p.tagline)}`,
    `category: ${yaml(p.category)}`,
    `tags: [${tags.map(yaml).join(', ')}]`,
    `tools: [${tools.map(yaml).join(', ')}]`,
    `order: ${p.order}`,
    ...(FEATURED.includes(p.slug) ? ['featured: true'] : []),
    ...(accent ? [`accent: ${yaml(accent)}`] : []),
    `cover: ${yaml(`../../assets/work/${p.slug}/cover.webp`)}`,
    ...(gallery.length ? ['gallery:', ...gallery.map((g) => `  - ${yaml(g)}`)] : []),
    ...(link ? ['link:', `  label: ${yaml(link.label)}`, `  url: ${yaml(link.url)}`] : []),
    ...(video ? ['video:', `  provider: ${yaml(video.provider)}`, `  id: ${yaml(video.id)}`] : []),
    '---',
    '',
    about,
    '',
  ].join('\n');
  await writeFile(S('content', 'work', p.slug + '.md'), fm);
  report.push(`${String(p.order).padStart(2)} ${p.slug.padEnd(24)} ${accent || '  —    '} imgs:${1 + gallery.length}${video ? ' video:' + video.provider : ''}${link ? ' link' : ''}`);
}

// ---------- other imagery ----------
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
await put(content.about.portrait, 'about/portrait.webp');
for (const s of content.about.services) await put(s.image, `services/${slugify(s.name.replace('+', ' '))}.webp`);
const pg = [];
for (const [i, it] of content.playground.items.entries()) {
  const name = `${String(i + 1).padStart(2, '0')}-${slugify(it.title)}.webp`;
  await put(it.image, `playground/${name}`);
  pg.push({ file: name, label: it.label, title: it.title, accent: await accentOf(M('assets', it.image)) });
}
await mkdir(path.join(root, 'public', 'media'), { recursive: true });
await copyFile(M('assets', 'playground-hero.mp4'), path.join(root, 'public', 'media', 'playground.mp4'));

console.log(report.join('\n'));
console.log('\nplayground:', JSON.stringify(pg));
console.log('services:', content.about.services.map((s) => slugify(s.name.replace('+', ' '))).join(', '));
console.log('images written:', done.size);
