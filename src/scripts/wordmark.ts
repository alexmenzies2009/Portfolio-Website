// The big kinetic word on the home page. Each letter is a variable-font glyph whose width and
// weight follow the pointer: letters near the cursor swell, the rest give way, so the word
// always spans the full width. With no pointer (or on touch) a slow wave runs through it.
import { gsap, reduced, finePointer } from './motion';

const BASE_W = 100;
const BASE_G = 800;

export function initWordmark() {
  document.querySelectorAll<HTMLElement>('[data-wordmark]').forEach((el) => {
    const outers = [...el.querySelectorAll<HTMLElement>('.wm__l')];
    const inners = outers.map((o) => o.firstElementChild as HTMLElement);
    const n = inners.length;
    if (!n) return;
    const setAxes = (node: HTMLElement, w: number, g: number) => (node.style.fontVariationSettings = `"wdth" ${w.toFixed(1)}, "wght" ${g.toFixed(0)}`);

    // size the word so it fills the row at its resting width
    let lastWidth = 0;
    const fit = () => {
      const avail = el.clientWidth;
      if (!avail) return;
      lastWidth = avail;
      inners.forEach((i) => setAxes(i, BASE_W, BASE_G));
      el.style.fontSize = '100px';
      const natural = outers.reduce((sum, o) => sum + o.getBoundingClientRect().width, 0);
      if (natural) el.style.fontSize = `${((100 * avail) / natural) * 0.985}px`;
    };
    fit();
    new ResizeObserver(() => {
      if (Math.abs(el.clientWidth - lastWidth) > 0.5) fit();
    }).observe(el);
    document.fonts?.ready.then(fit);

    if (reduced) return;
    gsap.from(inners, { yPercent: 118, duration: 1.35, ease: 'expo.out', stagger: 0.055, delay: 0.3 });

    const cur = inners.map(() => ({ w: BASE_W, g: BASE_G }));
    let pointerX = 0.5;
    let active = 0;
    let activeTarget = 0;
    let visible = true;
    const zone = el.closest<HTMLElement>('[data-wordmark-zone]') ?? el;
    if (finePointer) {
      zone.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        pointerX = (e.clientX - r.left) / r.width;
        activeTarget = 1;
      });
      zone.addEventListener('pointerleave', () => (activeTarget = 0));
    }
    new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(el);

    // touch screens: while the page is being scrolled the wave keeps moving but updates every third
    // frame (each change re-shapes the big variable-font letters, which is heavy for a phone mid-scroll)
    let scrolledAt = 0;
    let tick = 0;
    if (!finePointer) addEventListener('scroll', () => (scrolledAt = performance.now()), { passive: true });

    const SIGMA = 0.17;
    const raw = new Array<number>(n).fill(0);
    gsap.ticker.add((time) => {
      if (!visible || document.hidden) return;
      if (scrolledAt && performance.now() - scrolledAt < 220 && tick++ % 3) return;
      active += (activeTarget - active) * 0.06;
      let mean = 0;
      for (let i = 0; i < n; i++) {
        const d = pointerX - (i + 0.5) / n;
        const near = Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
        const wave = 0.5 + 0.5 * Math.sin(time * 0.9 - i * 0.75);
        raw[i] = wave * 0.55 * (1 - active) + near * active;
        mean += raw[i];
      }
      mean /= n;
      for (let i = 0; i < n; i++) {
        const targetW = gsap.utils.clamp(75, 125, BASE_W + (raw[i] - mean) * 62);
        const targetG = gsap.utils.clamp(520, 900, BASE_G + (raw[i] - mean) * 420);
        cur[i].w += (targetW - cur[i].w) * 0.09;
        cur[i].g += (targetG - cur[i].g) * 0.09;
        setAxes(inners[i], cur[i].w, cur[i].g);
      }
    });
  });
}
