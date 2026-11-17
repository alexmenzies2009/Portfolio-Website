// V2 hero: projects step out of the portrait.
// Up to four at a time, a patch of the portrait lifts out (leaving a visible round gap), grows
// into a small project card and floats right beside the figure, never over it. After a while each one flies back into its gap and
// another project steps out somewhere else. Clicking a card opens the same preview as before
// (the 'mosaic:pick' event handled in Home.astro). A card waits while it is hovered or
// focused, and they all wait while the preview is open.
import { gsap, reduced, finePointer } from './motion';
import type { Mosaic } from './mosaic';

type Info = { title: string; meta: string; thumb: string };
type Card = {
  el: HTMLButtonElement;
  slug: string;
  cell: number;
  slot: number;
  x: number;
  y: number;
  w: number;
  h: number;
  float?: gsap.core.Tween;
  leaving: boolean;
};

const SLOTS = 6; // the portrait can leave at most this many gaps at once

export function initEmerge(mosaic: Mosaic, info: Record<string, Info>) {
  const layer = document.querySelector<HTMLElement>('[data-emerge]');
  const hero = layer?.parentElement;
  if (!layer || !hero) return;
  const peek = hero.querySelector<HTMLElement>('[data-peek]');
  // text the cards must not cover
  const obstacles = [...hero.querySelectorAll<HTMLElement>('.hero__avail, .hero__intro, .hero__kicker, .wordmark, .hero__base')];

  const cards: Card[] = [];
  const free = Array.from({ length: SLOTS }, (_, i) => i);
  let spawning = false;

  const narrow = () => hero.clientWidth < 700;
  const most = () => 4;
  // the open band between the site header and the wordmark, in px from the hero's top
  const band = () => {
    const box = hero.getBoundingClientRect();
    const top = (document.querySelector('.hdr')?.getBoundingClientRect().bottom ?? box.top) - box.top;
    const word = hero.querySelector('.hero__word')?.getBoundingClientRect().top ?? box.bottom;
    return { top, bottom: word - box.top };
  };
  // computer: as big as fits two above each other beside the figure (short laptop screens get smaller cards)
  const cardWidth = () => {
    if (narrow()) return 64;
    const { top, bottom } = band();
    const fits = (bottom - top - 3 * 14) / 2 - 30; // 30: the caption under the image
    return Math.round(Math.max(84, Math.min(150, hero.clientWidth * 0.1, fits)));
  };
  // how quickly cards fly (1 = the original, slower timing) and how long they stay out
  const pace = () => 0.75;
  const lifetime = () => gsap.utils.random(3.5, 5.5) * (reduced ? 1.4 : 1);
  const paused = () => (peek && !peek.hidden) || document.hidden;

  // text areas, in px from the hero's top left, grown by a margin
  const blockedAreas = (pad: number) => {
    const box = hero.getBoundingClientRect();
    return obstacles.map((el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - box.left - pad, t: r.top - box.top - pad, r: r.right - box.left + pad, b: r.bottom - box.top + pad };
    });
  };

  // ---- where cards can go: a pool of spots beside the figure (never over it), clear of the text.
  // Candidates start from a tile of the portrait and step sideways away from it, so nearly all of
  // them land in the band around the figure. Rebuilt after a resize and every few seconds (the
  // head turns a little with the pointer).
  type Spot = { x: number; y: number };
  let pool: Spot[] = [];
  let poolKey = '';
  let poolAt = 0;
  const spots = (w: number, h: number) => {
    const H = hero.clientHeight, W = hero.clientWidth;
    const key = [W, H, w, h].join('x');
    if (key === poolKey && performance.now() - poolAt < 8000) return pool;
    const pad = narrow() ? 8 : 14;
    const clear = narrow() ? 9 : 34; // at least this far from the nearest tile
    // and no further than this (short laptop screens have little height, so they may reach a bit wider)
    const open = band();
    const close = narrow() ? 28 : open.bottom - open.top < 450 ? 210 : 80;
    const blocked = blockedAreas(pad);
    const top = open.top + pad;
    const floor = open.bottom - pad;
    const cells = mosaic.outline();
    const count = cells.length / 2;
    const b = mosaic.bounds();
    const mid = (b.left + b.right) / 2;
    const found: Spot[] = [];
    for (let k = 0; k < 2500 && found.length < 300; k++) {
      const i = Math.floor(Math.random() * count) * 2;
      if (cells[i + 1] < top || cells[i + 1] > floor) continue;
      const side = cells[i] < mid ? -1 : 1;
      const a = (side < 0 ? Math.PI : 0) + gsap.utils.random(-0.95, 0.95) * -side;
      const dx = Math.cos(a), dy = Math.sin(a);
      const reach = Math.abs(dx) * (w / 2) + Math.abs(dy) * (h / 2) + gsap.utils.random(clear, close);
      const x = cells[i] + dx * reach - w / 2;
      const y = cells[i + 1] + dy * reach - h / 2;
      if (x < pad || x + w > W - pad || y < top || y + h > H - pad) continue;
      if (blocked.some((o) => x < o.r && x + w > o.l && y < o.b && y + h > o.t)) continue;
      let gap = 1e4;
      for (let j = 0; j < cells.length && gap >= clear; j += 2) {
        const ex = Math.max(x - cells[j], 0, cells[j] - x - w);
        const ey = Math.max(y - cells[j + 1], 0, cells[j + 1] - y - h);
        gap = Math.min(gap, Math.hypot(ex, ey));
      }
      if (gap >= clear && gap <= close) found.push({ x, y });
    }
    pool = found;
    poolKey = key;
    poolAt = performance.now();
    return pool;
  };

  // ---- choosing a spot for the next card: one that still leaves room for the rest (up to four)
  const place = (w: number, h: number) => {
    const pad = narrow() ? 8 : 14;
    type Box = { x: number; y: number; w: number; h: number };
    const hits = (a: Spot, o: Box) => a.x < o.x + o.w + pad && a.x + w + pad > o.x && a.y < o.y + o.h + pad && a.y + h + pad > o.y;
    const taken: Box[] = cards.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h }));
    const options = spots(w, h).filter((p) => !taken.some((t) => hits(p, t)));
    if (!options.length) return null;
    const b = mosaic.bounds();
    const mid = (b.left + b.right) / 2;
    const leftCount = cards.filter((c) => c.x + c.w / 2 < mid).length;
    // the side with fewer cards is more likely; the rest is chance, for variety
    const ranked = options
      .map((p) => ({ p, score: -(p.x + w / 2 < mid ? leftCount : cards.length - leftCount) * 2 + Math.random() * 1.5 }))
      .sort((a, z) => z.score - a.score)
      .map((o) => o.p);
    const need = most() - cards.length - 1;
    const roomFor = (p: Spot) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const placed: Box[] = [{ x: p.x, y: p.y, w, h }];
        for (const q of gsap.utils.shuffle(options.slice())) {
          if (placed.length - 1 >= need) break;
          if (!placed.some((t) => hits(q, t))) placed.push({ x: q.x, y: q.y, w, h });
        }
        if (placed.length - 1 >= need) return true;
      }
      return false;
    };
    return ranked.slice(0, 30).find(roomFor) ?? ranked[0];
  };

  // ---- choosing where the project comes from: a bright, visible tile near its spot
  const chooseCell = (spot: Spot, w: number, h: number) => {
    const showing = new Set(cards.map((c) => c.slug));
    const holes = cards.map((c) => mosaic.locate(c.cell));
    const covered = blockedAreas(4);
    const cx = spot.x + w / 2, cy = spot.y + h / 2;
    let best = -1;
    let bestScore = Infinity;
    for (let t = 0; t < 160; t++) {
      const i = Math.floor(Math.random() * mosaic.count);
      if (mosaic.lum(i) < 0.42) continue; // bright tiles are drawn bigger, so the gap reads
      const project = mosaic.project(i);
      if (!project || showing.has(project.slug) || !info[project.slug]) continue;
      const at = mosaic.locate(i);
      if (covered.some((o) => at.x > o.l && at.x < o.r && at.y > o.t && at.y < o.b)) continue; // hidden behind text
      if (holes.some((o) => Math.hypot(at.x - o.x, at.y - o.y) < 40)) continue; // not right next to another gap
      const score = Math.hypot(at.x - cx, at.y - cy) + Math.random() * 90;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  };

  // card height for a given width (image plus caption)
  const heights = new Map<number, number>();
  const cardHeight = (w: number) => {
    if (!heights.has(w)) {
      const probe = make(Object.keys(info)[0], w);
      probe.style.visibility = 'hidden';
      layer.append(probe);
      heights.set(w, probe.offsetHeight);
      probe.remove();
    }
    return heights.get(w)!;
  };

  const make = (slug: string, w: number) => {
    const project = info[slug];
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'emerge__card';
    el.dataset.cursor = 'Info';
    el.setAttribute('aria-label', `${project.title}, show project details`);
    el.style.width = `${w}px`;
    el.innerHTML = `<span class="emerge__img"><img alt="" decoding="async"></span><span class="emerge__cap mono"><span class="dim"></span><span></span></span>`;
    el.querySelector('img')!.src = project.thumb;
    const [num, title] = el.querySelectorAll<HTMLElement>('.emerge__cap > span');
    num.textContent = project.meta.slice(0, 2);
    title.textContent = project.title;
    return el;
  };

  // ---- a tile steps out of the portrait
  const emerge = async () => {
    const slot = free[0];
    if (slot === undefined) return;
    const w = cardWidth();
    const h = cardHeight(w);
    const spot = place(w, h);
    if (!spot) return;
    const cell = chooseCell(spot, w, h);
    if (cell < 0) return;
    const slug = mosaic.project(cell)!.slug;
    const el = make(slug, w);
    el.style.visibility = 'hidden';
    layer.append(el);
    const at = mosaic.locate(cell);
    const img = el.querySelector('img')!;
    await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 1200))]);
    if (paused() || mosaic.progress().out > 0.05) return el.remove();

    free.shift();
    const card: Card = { el, slug, cell, slot, x: spot.x, y: spot.y, w, h, leaving: false };
    cards.push(card);
    el.addEventListener('click', () => {
      const box = hero.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      hero.dispatchEvent(new CustomEvent('mosaic:pick', { detail: { slug, x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, pad: r.width / 2 + 18 } }));
    });

    const cap = el.querySelector('.emerge__cap')!;
    const gap = { v: 0 };
    const setGap = () => mosaic.hide(slot, cell, gap.v);
    el.style.visibility = '';
    if (reduced) {
      gap.v = 1;
      setGap();
      gsap.set(el, { x: spot.x, y: spot.y });
      gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    } else {
      // starts as the patch of portrait it comes from (same place and size, the portrait's muted
      // colour) and the patch opens into a gap as it lifts out...
      const k = pace();
      gsap.set(el, { x: at.x - w / 2, y: at.y - w / 2, scale: at.hole / w, rotation: 0, transformOrigin: `${w / 2}px ${w / 2}px`, opacity: 0 });
      gsap.set(img, { filter: 'brightness(0.7) saturate(0.35)' });
      gsap.set(cap, { opacity: 0, y: 6 });
      gsap.to(el, { opacity: 1, duration: 0.2 });
      gsap.to(gap, { v: 1, duration: 0.5 * k, ease: 'power2.out', onUpdate: setGap });
      // ...then grows into a card as it floats out
      gsap.to(el, { x: spot.x, y: spot.y, scale: 1, rotation: gsap.utils.random(-5, 5), duration: 1.5 * k, delay: 0.12, ease: 'expo.out' });
      gsap.to(img, { filter: 'brightness(1) saturate(1)', duration: 1.1 * k, ease: 'power2.out' });
      gsap.to(cap, { opacity: 1, y: 0, duration: 0.45, delay: 0.7 * k, ease: 'power2.out' });
      card.float = gsap.to(el, { yPercent: gsap.utils.random(-4, 4), rotation: `+=${gsap.utils.random(-2, 2)}`, duration: gsap.utils.random(2.6, 3.6), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.6 * k });
    }
    gsap.delayedCall(lifetime(), () => recall(card));
  };

  // ---- it flies back into its gap
  const recall = (card: Card, now = false) => {
    if (card.leaving) return;
    const held = paused() || (finePointer && card.el.matches(':hover')) || card.el.matches(':focus-visible');
    if (held && !now) {
      gsap.delayedCall(1.2, () => recall(card));
      return;
    }
    card.leaving = true;
    card.float?.kill();
    const { el, cell, slot, w } = card;
    const img = el.querySelector('img')!;
    const cap = el.querySelector('.emerge__cap')!;
    const gap = { v: 1 };
    const setGap = () => mosaic.hide(slot, cell, gap.v);
    const done = () => {
      mosaic.hide(slot, cell, 0);
      el.remove();
      cards.splice(cards.indexOf(card), 1);
      free.push(slot);
    };
    if (reduced || now) {
      gsap.to(el, { opacity: 0, duration: now ? 0.25 : 0.5, onComplete: done });
      return;
    }
    // fly back into the gap (following it even if the head turns on the way), shrinking to its
    // size, then the gap fills back up from the edges as the card melts into it
    const k = pace();
    const from = { x: Number(gsap.getProperty(el, 'x')), y: Number(gsap.getProperty(el, 'y')), r: Number(gsap.getProperty(el, 'rotation')), yp: Number(gsap.getProperty(el, 'yPercent')) };
    const p = { t: 0 };
    gsap.to(cap, { opacity: 0, y: 6, duration: 0.25 });
    gsap.to(img, { filter: 'brightness(0.7) saturate(0.35)', duration: 0.9 * k, ease: 'power2.in' });
    let filling = false;
    gsap.to(p, {
      t: 1,
      duration: 1.2 * k,
      ease: 'power3.inOut',
      onUpdate: () => {
        const at = mosaic.locate(cell);
        const t = p.t;
        gsap.set(el, {
          x: from.x + (at.x - w / 2 - from.x) * t,
          y: from.y + (at.y - w / 2 - from.y) * t,
          rotation: from.r * (1 - t),
          yPercent: from.yp * (1 - t),
          scale: 1 + (at.hole / w - 1) * t,
        });
        if (t > 0.88 && !filling) {
          filling = true;
          gsap.to(el, { opacity: 0, duration: 0.35 * k, ease: 'power1.in' });
          gsap.to(gap, { v: 0, duration: 0.7 * k, ease: 'power2.inOut', onUpdate: setGap, onComplete: done });
        }
      },
    });
  };

  // ---- keep a few out at a time, stepping out one after another
  const pump = async () => {
    const { in: built, out } = mosaic.progress();
    // cards on their way back still count, so there are never more than four on screen
    if (!spawning && built > 0.97 && out < 0.05 && !paused() && cards.length < most()) {
      spawning = true;
      await emerge();
      spawning = false;
    }
    gsap.delayedCall(cards.length ? gsap.utils.random(0.3, 0.6) : 0.3, pump);
  };
  pump();

  // the cards fade as the portrait is scrolled away
  gsap.ticker.add(() => {
    const out = mosaic.progress().out;
    layer.style.opacity = String(Math.max(0, 1 - out * 3));
    layer.style.visibility = out > 0.33 ? 'hidden' : '';
  });

  // after a resize the cards would sit in the wrong places: send them home
  let width = hero.clientWidth;
  new ResizeObserver(() => {
    if (hero.clientWidth === width) return;
    width = hero.clientWidth;
    for (const c of [...cards]) recall(c, true);
  }).observe(hero);
}
