// Turns the saved Framer HTML into one structured content.json (desktop variant only).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'node-html-parser';
const [htmlDir, outFile] = process.argv.slice(2);
const IMG = 'https://framerusercontent.com/images/';
const clean = s => (s || '').replace(/­/g, '').replace(/\s+/g, ' ').trim();
async function load(name) {
  const html = await readFile(path.join(htmlDir, name + '.html'), 'utf8');
  const m = html.match(/@media\s*\(min-width:\s*1200px\)\s*\{\s*\.(hidden-[a-z0-9]+)/);
  const root = parse(html);
  if (m) root.querySelectorAll('.' + m[1]).forEach(el => el.remove()); // drop tablet/phone duplicates
  return { root, html };
}
const imgId = el => (el.getAttribute('src') || '').split('?')[0].replace(IMG, '');
const uniq = a => [...new Set(a)];

// ---- work listing (order, cover, category label)
const work = await load('work');
const cards = work.root.querySelectorAll('section[data-framer-name="Projects"] a').map(a => ({
  slug: a.getAttribute('href').replace('./work/', ''),
  cover: imgId(a.querySelector('img')),
  cardCategory: clean(a.querySelector('[data-framer-name="Category"] p')?.text),
  cardTitle: clean(a.querySelector('h3')?.text),
}));
const filters = uniq(work.root.querySelectorAll('aside[data-framer-name="Sidebar"] span p').map(p => clean(p.text)).filter(t => t && t !== '[' && t !== ']'));
const workIntro = clean(work.root.querySelector('aside[data-framer-name="Sidebar"] header p')?.text);

// ---- projects
const projects = [];
for (const [i, c] of cards.entries()) {
  const { root } = await load('work__' + c.slug);
  const sec = root.querySelector('section[data-framer-name="Project"]');
  const art = sec.querySelector('article');
  const header = art.querySelector('[data-framer-name="Header"]');
  const about = art.querySelector('[data-framer-name="About"]').querySelectorAll('p').map(p => p.innerHTML.replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g,'"').replace(/­/g,'').trim());
  const iframe = sec.querySelector('iframe');
  projects.push({
    order: i + 1,
    slug: c.slug,
    title: clean(art.querySelector('h3').text),
    cardTitle: c.cardTitle,
    tagline: clean(header.querySelector('p').text),
    category: clean(art.querySelector('[data-framer-name="Category"] [data-framer-name="Primary"] p')?.text),
    cardCategory: c.cardCategory,
    tools: clean(art.querySelector('[data-framer-name="Category"] [data-framer-name="Secondary"] p')?.text),
    live: art.querySelector('[data-framer-name="Live site"] a')?.getAttribute('href') || null,
    about: about.slice(1).join('\n\n'),
    cover: c.cover,
    images: uniq(sec.querySelectorAll('img').map(imgId)),
    embed: iframe ? iframe.getAttribute('src') : (sec.querySelector('.framer-vimeo') ? 'vimeo' : null),
  });
}

// ---- playground
const pg = await load('playground');
const playground = {
  intro: clean(pg.root.querySelector('[data-framer-name="Hero"] p')?.text),
  video: pg.root.querySelector('video')?.getAttribute('src') || null,
  items: pg.root.querySelector('section[data-framer-name="Playground"]').querySelectorAll('img').map(img => {
    let box = img.parentNode; let title = null;
    while (box && !(title = box.querySelector('[data-framer-name="Title"]'))) box = box.parentNode;
    const ps = title ? title.querySelectorAll('p').map(p => clean(p.text)) : [];
    return { image: imgId(img), label: ps[0] || '', title: ps[1] || '' };
  }),
};

// ---- stack (+ inline svg logos)
const st = await load('stack');
const stack = st.root.querySelector('[data-framer-name="Tech Stack"]').childNodes.filter(n => n.nodeType === 1).map(n => {
  const el = n.rawTagName && ['a','span'].includes(n.rawTagName.toLowerCase()) ? n : n.querySelector('a, span');
  const tile = el || n;
  const ps = tile.querySelectorAll('p').map(p => clean(p.text));
  const svg = tile.querySelector('svg');
  const logoImg = tile.querySelector('img');
  return { label: ps[0], name: ps[ps.length - 1], href: tile.getAttribute('href') || null, svg: svg ? svg.toString() : null, logoImg: logoImg ? imgId(logoImg) : null, logoBg: (tile.toString().match(/background-image:url\(([^)]+)\)/) || [])[1] || null };
}).filter(t => t.name);

// ---- about
const ab = await load('about');
const rows = sec => sec.querySelectorAll('a[data-framer-name="Desktop"]').map(a => { const ps = a.querySelectorAll('p').map(p => clean(p.text)); return { name: ps[0], role: ps[1], when: ps[2], href: a.getAttribute('href') }; });
const secs = ab.root.querySelectorAll('section[data-framer-name="Awards"]');
const cols = ab.root.querySelectorAll('section[data-framer-name="Colophon"]').map(s => ({ title: clean(s.querySelector('h3').text), items: s.querySelectorAll('span[data-framer-name="Desktop V2"]').map(sp => { const ps = sp.querySelectorAll('p').map(p => clean(p.text)); return { label: ps[0], name: ps[1] }; }) }));
const about = {
  portrait: imgId(ab.root.querySelector('[data-framer-name="Hero Image"] img')),
  quotes: ab.root.querySelectorAll('[data-framer-name="Quote"] p').map(p => clean(p.text)),
  services: ab.root.querySelectorAll('header[data-framer-name="Service Title"] > div').map(d => ({ name: clean(d.querySelector('h1').text), image: imgId(d.querySelector('img')) })),
  experience: rows(secs[0]), experienceMore: secs[0].querySelector('a[data-framer-name="Primary"]')?.getAttribute('href'),
  education: rows(secs[1]),
  columns: cols,
};

// ---- home + contact
const home = await load('index');
const ct = await load('contact');
const site = {
  logo: imgId(home.root.querySelector('header img')),
  ogImage: (home.html.match(/property="og:image" content="([^"]+)"/) || [])[1]?.replace(IMG, ''),
  filmStrip: uniq(home.root.querySelector('section[data-framer-name="Film Strip"]').querySelectorAll('img').map(imgId)),
  featured: home.root.querySelector('section[data-framer-name="Projects"]').querySelectorAll('a[data-framer-name="Desktop"]').map(a => ({ slug: a.getAttribute('href').replace('./work/', ''), cover: imgId(a.querySelector('img')) })),
  contactImage: imgId(ct.root.querySelector('[data-framer-name="Feature Image"] img')),
};
const all = { site, filters, workIntro, projects, playground, stack, about };
await writeFile(outFile, JSON.stringify(all, null, 1));
const images = uniq([site.logo, site.ogImage, ...site.filmStrip, ...site.featured.map(f => f.cover), site.contactImage, about.portrait, ...about.services.map(s => s.image), ...playground.items.map(i => i.image), ...projects.flatMap(p => [p.cover, ...p.images]), ...stack.map(s => s.logoImg)].filter(Boolean));
await writeFile(outFile.replace('.json', '.images.json'), JSON.stringify(images, null, 1));
console.log('projects', projects.length, '| images', images.length, '| playground', playground.items.length, '| stack', stack.length, stack.map(s => s.name + (s.svg ? '(svg ' + s.svg.length + ')' : s.logoImg ? '(img)' : s.logoBg ? '(bg)' : '(none)')).join(', '));
console.log('filters', filters.join(' | '));
console.log('covers not in gallery:', projects.filter(p => !p.images.includes(p.cover)).map(p => p.slug).join(', '));
console.log('category mismatches:', projects.filter(p => p.category.toLowerCase() !== p.cardCategory.toLowerCase()).map(p => p.slug + ':' + p.category + '/' + p.cardCategory).join(', ') || 'none');
console.log(JSON.stringify(about.columns));
console.log(JSON.stringify(site));
