// Scroll + reveal system. Everything here is driven by data-attributes in the markup:
//
//   data-split="lines|words|chars"  text that rises out of a mask when it enters the viewport
//   data-reveal                     block that fades up            (data-reveal="clip": a block of colour opens into the image)
//   data-delay="0.2"                extra delay for either of the above
//   data-parallax="0.1"             image drifts inside its frame while scrolling
//   data-kinetic="75,125"           variable-font width is scrubbed by scroll
//   data-scrub-words                paragraph whose words light up as you scroll through it
//   data-marquee                    endless strip; speeds up with scroll velocity
//   data-magnetic                   element leans toward the pointer
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
export let lenis: Lenis | null = null;

export function initSmoothScroll() {
  if (reduced) return;
  lenis = new Lenis({ lerp: 0.13, anchors: true }); // higher = snappier scrolling
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/** Stops/starts page scrolling (used by the menu and the lightbox). */
export function lockScroll(lock: boolean) {
  if (lenis) lock ? lenis.stop() : lenis.start();
  document.documentElement.style.overflow = lock ? 'hidden' : '';
}

const num = (v: string | undefined, fallback: number) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));

// The colour a media frame shows while it opens: the project's accent (a card or piece's
// data-accent, or the page's own on a project page), else the palette in turn.
const PALETTE = ['--c-yellow', '--c-cyan', '--c-violet', '--c-red', '--c-pink', '--c-orange', '--c-green'];
let nextColor = 0;

// Leaving the page while a clicked card is still opening: finish it, so the cover that travels to
// the next page is the whole picture, not a half-open block of colour.
const reveals = new Map<HTMLElement, gsap.core.Timeline>();
addEventListener('pageswap', () => {
  reveals.forEach((tl, el) => {
    if (el.classList.contains('vt-cover') || el.querySelector('.vt-cover') || el.closest('.vt-cover')) tl.progress(1);
  });
});
function revealColor(el: HTMLElement) {
  const own = el.closest<HTMLElement>('[data-accent]')?.dataset.accent || document.documentElement.dataset.accentBase;
  if (own) return own;
  return getComputedStyle(document.documentElement).getPropertyValue(PALETTE[nextColor++ % PALETTE.length]).trim();
}

/** Finishes every media reveal inside `root` at once (for content shuffled in place, like the work filter). */
export function finishReveals(root: ParentNode) {
  reveals.forEach((tl, el) => {
    if (!root.contains(el)) return;
    tl.scrollTrigger?.kill();
    tl.progress(1);
    reveals.delete(el);
  });
}

export function initReveals(root: ParentNode = document) {
  if (reduced) return;

  // --- text
  root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    if (el.dataset.splitDone) return;
    el.dataset.splitDone = '1';
    const mode = el.dataset.split === 'chars' ? 'chars' : el.dataset.split === 'words' ? 'words' : 'lines';
    const delay = num(el.dataset.delay, 0);
    SplitText.create(el, {
      type: mode === 'chars' ? 'words,chars' : mode,
      mask: mode,
      autoSplit: mode === 'lines',
      linesClass: 'sl',
      wordsClass: 'sw',
      charsClass: 'sc',
      onSplit(self) {
        const targets = mode === 'chars' ? self.chars : mode === 'words' ? self.words : self.lines;
        return gsap.from(targets, {
          yPercent: 112,
          duration: mode === 'chars' ? 1 : 1.15,
          ease: 'expo.out',
          stagger: mode === 'chars' ? 0.028 : mode === 'words' ? 0.04 : 0.085,
          delay,
          scrollTrigger: { trigger: el, start: 'top 94%', once: true },
        });
      },
    });
  });

  // --- blocks
  root.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    if (el.dataset.revealDone) return;
    el.dataset.revealDone = '1';
    const delay = num(el.dataset.delay, 0);
    const st = { trigger: el, start: 'top 92%', once: true };
    if (el.dataset.reveal === 'clip') {
      // Media frames: a small rounded block of colour in the middle of the frame opens out to
      // fill it, and the picture comes into focus on top of it, settling from a soft zoom.
      // The colour is the project's own accent when there is one, else the next palette colour.
      const inner = el.querySelector<HTMLElement>('img, video');
      const color = revealColor(el);
      const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      const tl = gsap.timeline({
        delay,
        scrollTrigger: st,
        onComplete: () => {
          gsap.set(el, { clearProps: 'clipPath,backgroundColor' });
          if (inner) gsap.set(inner, { clearProps: inner.hasAttribute('data-parallax') ? 'opacity,filter' : 'opacity,filter,transform' });
        },
      });
      gsap.set(el, { backgroundColor: color });
      tl.fromTo(el, { clipPath: `inset(22% 26% 22% 26% round ${radius * 2.5}px)` }, { clipPath: `inset(0% 0% 0% 0% round ${radius}px)`, duration: 1.1, ease: 'expo.inOut' }, 0);
      if (inner) {
        tl.fromTo(inner, { opacity: 0, filter: 'blur(14px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power2.out' }, 0.38);
        if (!inner.hasAttribute('data-parallax')) tl.fromTo(inner, { scale: 1.28 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0.22);
      }
      reveals.set(el, tl);
    } else {
      gsap.fromTo(el, { autoAlpha: 0, y: 36 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', delay, scrollTrigger: st });
    }
  });

  // --- parallax inside frames
  root.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    const amount = num(el.dataset.parallax, 0.1);
    gsap.fromTo(
      el,
      { yPercent: -amount * 100, scale: 1 + amount * 2 },
      { yPercent: amount * 100, scale: 1 + amount * 2, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } },
    );
  });

  // --- elements that drift at their own speed (data-drift="-60" = moves 60px up over its pass)
  root.querySelectorAll<HTMLElement>('[data-drift]').forEach((el) => {
    const px = num(el.dataset.drift, -40);
    gsap.fromTo(el, { y: -px }, { y: px, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  });

  // --- kinetic type: scroll stretches the letterforms
  root.querySelectorAll<HTMLElement>('[data-kinetic]').forEach((el) => {
    const [from, to] = (el.dataset.kinetic || '75,125').split(',').map(Number);
    gsap.fromTo(
      el,
      { '--wdth': from },
      { '--wdth': to, ease: 'none', scrollTrigger: { trigger: el, start: 'top 100%', end: 'top 30%', scrub: 0.5 } },
    );
  });

  // --- paragraph that lights up word by word
  root.querySelectorAll<HTMLElement>('[data-scrub-words]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words', wordsClass: 'sw' });
    gsap.fromTo(
      split.words,
      { opacity: 0.16 },
      { opacity: 1, ease: 'none', stagger: 0.5, scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 45%', scrub: 0.4 } },
    );
  });
}

export function initMarquees() {
  document.querySelectorAll<HTMLElement>('[data-marquee]').forEach((el) => {
    const track = el.querySelector<HTMLElement>('[data-marquee-track]');
    if (!track || reduced) return;
    const originals = [...track.children] as HTMLElement[];
    originals.forEach((node) => {
      const clone = node.cloneNode(true) as HTMLElement;
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll<HTMLElement>('a, button').forEach((a) => (a.tabIndex = -1));
      clone.querySelectorAll('[data-cover]').forEach((c) => c.removeAttribute('data-cover'));
      track.appendChild(clone);
    });
    el.classList.add('is-live');
    const base = num(el.dataset.speed, 0.7);
    const dir = el.dataset.dir === 'right' ? 1 : -1;
    let x = 0;
    let half = 0;
    let boost = 0;
    let hold = 1;
    let holdTarget = 1;
    let visible = true;
    const measure = () => (half = track.scrollWidth / 2);
    measure();
    new ResizeObserver(measure).observe(track);
    new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '20%' }).observe(el);
    if (el.hasAttribute('data-marquee-pause')) {
      el.addEventListener('pointerenter', () => (holdTarget = 0.12));
      el.addEventListener('pointerleave', () => (holdTarget = 1));
    }
    // scrolling nudges the strip along, gently and never past a limit; touch scrolling (with its
    // momentum) reports far larger speeds than a mouse wheel, so it counts for much less
    const touch = !finePointer;
    const gain = touch ? 0.08 : 0.35;
    const most = touch ? 1.6 : 9;
    // scroll speed without smooth scrolling: measured in the scroll event (reading the position in
    // the animation frame, after other elements have changed, would force a full layout every frame)
    let lastY = scrollY;
    let nativeV = 0;
    if (!lenis) {
      addEventListener(
        'scroll',
        () => {
          nativeV = scrollY - lastY;
          lastY = scrollY;
        },
        { passive: true },
      );
    }
    gsap.ticker.add((_t, dt) => {
      if (!visible || !half) return;
      const v = lenis ? lenis.velocity : nativeV;
      nativeV *= 0.85;
      boost += (gsap.utils.clamp(-most, most, v * gain) - boost) * 0.1;
      hold += (holdTarget - hold) * 0.08;
      x += dir * (base + Math.abs(boost)) * hold * (dt / 16.67);
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      // one transform on the track only (a CSS variable here would restyle every card each frame)
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${gsap.utils.clamp(-7, 7, boost * 0.35).toFixed(2)}deg)`;
    });
  });
}

export function initMagnetic() {
  if (reduced || !finePointer) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const strength = num(el.dataset.magnetic, 0.3);
    const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener('pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  });
}

/** Numbers count up from zero when they scroll into view (data-count="43"). */
export function initCounters() {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!Number.isFinite(end)) return;
    const state = { value: 0 };
    el.textContent = '0';
    gsap.to(state, { value: end, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => (el.textContent = String(Math.round(state.value))) });
  });
}

/** Frames lean toward the pointer in 3D (data-tilt). */
export function initTilt() {
  if (reduced || !finePointer) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    const host = el.closest<HTMLElement>('a') ?? el;
    gsap.set(el, { transformPerspective: 900 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.7, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.7, ease: 'power3' });
    host.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      ry(((e.clientX - r.left) / r.width - 0.5) * 9);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 9);
    });
    host.addEventListener('pointerleave', () => {
      rx(0);
      ry(0);
    });
  });
}

/** Sizes single-line display text so it spans its container exactly (data-fit, optional data-fit-max="vh"). */
export function initFit() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-fit]')];
  if (!els.length) return;
  const widths = new WeakMap<HTMLElement, number>();
  const apply = (el: HTMLElement) => {
    const inner = el.querySelector<HTMLElement>('[data-fit-text]') ?? el;
    const avail = el.clientWidth;
    if (!avail) return;
    widths.set(el, avail);
    const prev = inner.style.fontSize;
    inner.style.fontSize = '100px';
    const range = document.createRange();
    range.selectNodeContents(inner);
    const natural = range.getBoundingClientRect().width;
    inner.style.fontSize = prev;
    if (!natural) return;
    const maxVh = num(el.dataset.fitMax, 0);
    let size = (100 * avail) / natural;
    if (maxVh) size = Math.min(size, (innerHeight * maxVh) / 100);
    inner.style.fontSize = `${Math.floor(size * 100) / 100}px`;
  };
  els.forEach(apply);
  const ro = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      if (Math.abs((widths.get(el) ?? 0) - el.clientWidth) > 0.5) apply(el);
    }
  });
  els.forEach((el) => ro.observe(el));
  document.fonts?.ready.then(() => els.forEach(apply));
}

export { gsap, ScrollTrigger, SplitText };
