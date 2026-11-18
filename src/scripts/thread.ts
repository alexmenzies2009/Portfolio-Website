// The thread (test v2 of the home page): one line that starts at the About section's dot and runs
// all the way down the page, through every section's label dot, to the "available" dot in the
// footer, in one smooth curve. It leaves each dot heading straight down, and every stretch has its own
// move, shaped by what is there: a loop around the About portrait, a pendulum swinging across the
// services, an orbit around the project ring, a spiral opening out around "Let's talk". It draws itself as
// you scroll; at each dot it stops for a moment of scrolling (the dot answers with a pulse), then
// carries on. The line sits between the page background and the content (html.has-thread).
// Reduced motion: the whole line is simply shown.
import { gsap, reduced } from './motion';

type Point = { x: number; y: number };
// a dot the line passes through: where it is, how far along the line, and how far the page must
// scroll (plus ANCHOR) to get there (less than y near the bottom, where the page cannot scroll that far)
type Stop = Point & { len: number; reach: number; el: HTMLElement | null; tint: string };

export function initThread() {
  const html = document.documentElement;
  if (!html.classList.contains('has-thread')) return;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.classList.add('thread');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(NS, 'path');
  line.classList.add('thread__line');
  const ruler = document.createElementNS(NS, 'path'); // measures lengths, never drawn
  ruler.setAttribute('fill', 'none');
  ruler.style.visibility = 'hidden';
  const tip = document.createElementNS(NS, 'circle');
  tip.classList.add('thread__tip');
  tip.setAttribute('r', '5');
  svg.append(ruler, line, tip);
  document.body.append(svg);

  // where an element sits in the page's layout, ignoring transforms (reveal animations would
  // otherwise move the targets while they are being measured)
  const place = (el: HTMLElement): Point => {
    let x = el.offsetWidth / 2;
    let y = el.offsetHeight / 2;
    for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y };
  };
  const tintOf = (el: Element | null) => (el ? getComputedStyle(el).getPropertyValue('--tint').trim() : '') || 'var(--fg)';

  let stops: Stop[] = [];
  let total = 0;
  const PAUSE = () => innerHeight * 0.22; // how much scrolling the line waits at each dot
  const ANCHOR = () => innerHeight * 0.62; // the line arrives at a dot when it is this far down the screen

  // a smooth curve through every point: centripetal Catmull-Rom, turned into cubic Béziers (it never
  // kinks or overshoots, even where points sit close together)
  const curve = (pts: Point[]) => {
    const f = (n: number) => n.toFixed(1);
    let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
    const cuts: number[] = [d.length];
    const dist = (p: Point, q: Point) => Math.sqrt(Math.hypot(q.x - p.x, q.y - p.y));
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];
      const A = i === 0 ? 0 : dist(p0, p1);
      const B = dist(p1, p2) || 1e-4;
      const C = i + 2 >= pts.length ? 0 : dist(p2, p3);
      const c1 = A
        ? { x: (A * A * p2.x - B * B * p0.x + (2 * A * A + 3 * A * B + B * B) * p1.x) / (3 * A * (A + B)), y: (A * A * p2.y - B * B * p0.y + (2 * A * A + 3 * A * B + B * B) * p1.y) / (3 * A * (A + B)) }
        : { x: p1.x + (p2.x - p1.x) / 3, y: p1.y + (p2.y - p1.y) / 3 };
      const c2 = C
        ? { x: (C * C * p1.x - B * B * p3.x + (2 * C * C + 3 * C * B + B * B) * p2.x) / (3 * C * (C + B)), y: (C * C * p1.y - B * B * p3.y + (2 * C * C + 3 * C * B + B * B) * p2.y) / (3 * C * (C + B)) }
        : { x: p2.x - (p2.x - p1.x) / 3, y: p2.y - (p2.y - p1.y) / 3 };
      d += ` C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(p2.x)} ${f(p2.y)}`;
      cuts.push(d.length); // the path up to point i + 1
    }
    return { d, cuts };
  };

  // points around an ellipse, from angle a to angle b (radians, clockwise on screen)
  const arc = (c: Point, rx: number, ry: number, a: number, b: number, step = 0.55) => {
    const out: Point[] = [];
    const n = Math.max(2, Math.ceil(Math.abs(b - a) / step));
    for (let k = 0; k <= n; k++) {
      const t = a + ((b - a) * k) / n;
      out.push({ x: c.x + Math.cos(t) * rx, y: c.y + Math.sin(t) * ry });
    }
    return out;
  };
  const box = (el: HTMLElement) => ({ ...place(el), w: el.offsetWidth, h: el.offsetHeight });
  const between = (sel: string, top: number, bottom: number) =>
    [...document.querySelectorAll<HTMLElement>(sel)].find((el) => {
      const y = place(el).y;
      return y > top && y < bottom && el.offsetWidth > 0;
    });

  const build = () => {
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.scrollHeight;
    const narrow = w < 700;
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.height = `${h}px`;

    // the dots: every section label in the page, then the footer's "available" dot
    const dots = [...document.querySelectorAll<HTMLElement>('main .eyebrow__rule')].map((el) => ({ el, at: place(el), tint: tintOf(el.closest('.eyebrow')) }));
    const end = document.querySelector<HTMLElement>('.ftr .pulse');
    if (end) dots.push({ el: end, at: place(end), tint: 'var(--fg)' });
    dots.sort((a, b) => a.at.y - b.at.y);
    if (dots.length < 2) return;

    const X = (x: number) => Math.min(w * 0.97, Math.max(w * 0.03, x));
    const pts: Point[] = [];
    const stopAt: number[] = [];
    dots.forEach((dot, i) => {
      stopAt.push(pts.length);
      pts.push(dot.at);
      const next = dots[i + 1];
      if (!next) return;
      const A = dot.at;
      const B = next.at;
      const span = B.y - A.y;
      // leave every dot heading straight down, and arrive at the next one straight from above
      // (the footer's dot is reached from the side, where nothing is written)
      const drop = Math.min(span * 0.14, narrow ? 70 : 120);
      pts.push({ x: A.x, y: A.y + drop });
      const isEnd = next.el === end;
      const arrive: Point = isEnd ? { x: B.x - (narrow ? 60 : 110), y: B.y } : { x: B.x, y: B.y - drop };
      const top = A.y + drop;
      const bottom = arrive.y;

      // each stretch has its own move, shaped by what is in that part of the page
      const face = between('.about__face', top, bottom);
      const ring = between('.ring__stage', top, bottom);
      const button = between('.cta__btn', top, bottom);
      const list = between('.svc__list', top, bottom);
      if (face) {
        // a loop around the portrait, then out to the far edge and back
        const c = box(face);
        const r = Math.max(c.w, c.h) / 2 + (narrow ? 18 : 30);
        const from = Math.atan2(top - c.y, A.x - c.x);
        const to = from + Math.PI * 2 + ((0.35 - from + Math.PI * 4) % (Math.PI * 2));
        pts.push(...arc(c, r, r, from, to));
        pts.push({ x: X(w * 0.93), y: c.y + (bottom - c.y) * 0.5 });
      } else if (list) {
        // a pendulum: swings across the full width, each one smaller, settling toward the middle
        const reach = [0.46, 0.33, 0.21, 0.1];
        reach.forEach((amp, k) => {
          const y = top + ((bottom - top) * (k + 1)) / (reach.length + 1);
          pts.push({ x: X(w / 2 + (k % 2 ? -1 : 1) * amp * w), y });
        });
      } else if (ring) {
        // around the project ring once, like the ring of a planet, then on down
        const c = box(ring);
        const rx = Math.min(w * 0.47, c.w * 0.47);
        const ry = c.h * 0.62;
        // in at the left heading down, once round (under, across, over), out at the left heading down
        pts.push({ x: X(c.x - rx), y: c.y - ry * 0.55 });
        pts.push(...arc(c, rx, ry, Math.PI, -Math.PI));
      } else if (button) {
        // a spiral opening out around the "Let's talk" button, then off toward the footer
        const c = box(button);
        const r = Math.max(c.w, c.h) / 2 + (narrow ? 14 : 24);
        pts.push({ x: c.x, y: c.y - r });
        // ends at the upper right, where it is heading down and to the right: on toward the footer
        const turns = Math.PI * 2.25;
        const n = 14;
        for (let k = 1; k <= n; k++) {
          const t = -Math.PI / 2 + (turns * k) / n;
          const rr = r * (1 + (k / n) * 1.1);
          pts.push({ x: X(c.x + Math.cos(t) * rr), y: c.y + Math.sin(t) * rr });
        }
      } else {
        // nothing in particular here: one wide, easy swing to the far side
        pts.push({ x: X(A.x < w / 2 ? w * 0.9 : w * 0.1), y: top + (bottom - top) * 0.5 });
      }
      pts.push(arrive);
    });

    const { d, cuts } = curve(pts);
    line.setAttribute('d', d);
    total = line.getTotalLength();
    line.style.strokeDasharray = `${total}`;

    // how far along the line each dot is
    const lens = stopAt.map((p) => {
      if (p === 0) return 0;
      ruler.setAttribute('d', d.slice(0, cuts[p]));
      return ruler.getTotalLength();
    });

    // near the bottom the page cannot scroll far enough for the arrival line to reach the last dots:
    // squeeze them into the reachable range, so the line lands on the footer as the page ends
    const most = h - innerHeight + ANCHOR();
    const last = dots[dots.length - 1].at.y;
    const from = Math.min(most - innerHeight * 0.5, last);
    stops = dots.map((dot, i) => ({
      ...dot.at,
      len: lens[i],
      reach: dot.at.y <= from ? dot.at.y : from + ((dot.at.y - from) / Math.max(1, last - from)) * (most - from),
      el: dot.el,
      tint: dot.tint,
    }));
  };

  // scroll position -> how much of the line is drawn (holding at each dot for a while)
  const drawnAt = (s: number) => {
    const pause = PAUSE();
    if (s <= stops[0].reach) return 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (s >= b.reach) continue;
      const wait = Math.min(pause, (b.reach - a.reach) * 0.4);
      if (s < a.reach + wait) return a.len; // waiting at the dot
      return a.len + ((s - a.reach - wait) / Math.max(1, b.reach - a.reach - wait)) * (b.len - a.len);
    }
    return total;
  };

  build();
  let raf = 0;
  const rebuild = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(build);
  };
  new ResizeObserver(rebuild).observe(document.body);
  addEventListener('load', rebuild);
  document.fonts?.ready.then(rebuild);

  if (reduced) {
    line.style.strokeDashoffset = '0';
    tip.style.display = 'none';
    return;
  }

  const drawn = { len: 0 };
  let reached = -1;
  gsap.ticker.add(() => {
    if (stops.length < 2) return;
    const target = drawnAt(scrollY + ANCHOR());
    drawn.len += (target - drawn.len) * 0.12;
    if (Math.abs(target - drawn.len) < 0.3) drawn.len = target;
    line.style.strokeDashoffset = String(total - drawn.len);
    const p = line.getPointAtLength(drawn.len);
    tip.setAttribute('cx', p.x.toFixed(1));
    tip.setAttribute('cy', p.y.toFixed(1));
    tip.style.opacity = drawn.len > 1 ? '1' : '0';
    // which dot has the line got to? that dot answers, and the tip takes its colour
    let at = -1;
    for (let i = 0; i < stops.length; i++) if (drawn.len >= stops[i].len - 1) at = i;
    if (at !== reached) {
      reached = at;
      if (at < 0) return;
      tip.style.fill = stops[at].tint;
      const el = stops[at].el;
      if (el) {
        el.classList.remove('is-reached');
        void el.offsetWidth; // restart the pulse
        el.classList.add('is-reached');
      }
    }
  });
}
