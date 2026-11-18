// The project ring (test version of the home page's Work section): the project cards stand on a 3D
// ring that turns slowly by itself, speeds up a little as the page scrolls, and can be dragged
// (it keeps spinning after a flick, then eases back to its own pace). Covers facing away fade back.
// Without JavaScript or with reduced motion it stays a plain row that scrolls sideways.
import { gsap, lenis, reduced, finePointer } from './motion';

export function initRing() {
  const ring = document.querySelector<HTMLElement>('[data-ring]');
  const wheel = ring?.querySelector<HTMLElement>('[data-ring-wheel]');
  if (!ring || !wheel || reduced) return;
  const items = [...wheel.querySelectorAll<HTMLElement>('[data-ring-item]')];
  const n = items.length;
  if (n < 3) return;
  ring.classList.add('is-live');

  const step = 360 / n;
  // the ring's radius: just wide enough for the cards to sit side by side with a little air
  const size = () => {
    const w = items[0].offsetWidth;
    const r = (w / 2 / Math.tan(Math.PI / n)) * 1.12;
    ring.style.setProperty('--r', `${r.toFixed(1)}px`);
    ring.style.setProperty('--step', `${step}deg`);
  };
  size();
  new ResizeObserver(size).observe(items[0]);

  let angle = 0;
  let speed = 0; // degrees per frame from dragging / flicking
  const cruise = finePointer ? -0.045 : -0.04; // its own slow turn
  let hold = 1;
  let holdTarget = 1;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '15%' }).observe(ring);

  // scroll speed (from the smooth scroller, or from scroll events on touch)
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

  // dragging: the ring follows the pointer, and a flick keeps it spinning. The pointer is only
  // captured once it has moved a few pixels: capturing at once would swallow plain clicks on a card.
  let pressed = false;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let startX = 0;
  ring.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    pressed = true;
    dragging = false;
    moved = 0;
    startX = lastX = e.clientX;
  });
  ring.addEventListener('pointermove', (e) => {
    if (!pressed) return;
    if (!dragging) {
      if (Math.abs(e.clientX - startX) < 6) return;
      dragging = true;
      speed = 0;
      lastX = e.clientX;
      ring.setPointerCapture(e.pointerId);
      ring.classList.add('is-dragging');
      return;
    }
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    moved += Math.abs(dx);
    const d = dx * (finePointer ? 0.16 : 0.28);
    angle += d;
    speed = d;
  });
  const release = () => {
    pressed = false;
    if (!dragging) return;
    dragging = false;
    ring.classList.remove('is-dragging');
  };
  ring.addEventListener('pointerup', release);
  ring.addEventListener('pointercancel', release);
  // a drag is not a click on the card underneath
  ring.addEventListener(
    'click',
    (e) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
  if (finePointer) {
    ring.addEventListener('pointerenter', () => (holdTarget = 0.25));
    ring.addEventListener('pointerleave', () => (holdTarget = 1));
  }

  const fade = new Array<number>(n).fill(-1);
  gsap.ticker.add((_t, dt) => {
    if (!visible || document.hidden) return;
    const f = dt / 16.67;
    const v = lenis ? lenis.velocity : nativeV;
    nativeV *= 0.85;
    hold += (holdTarget - hold) * 0.06;
    if (!dragging) {
      speed *= 0.95; // a flick slows down
      angle += (cruise * hold + speed - gsap.utils.clamp(-2, 2, v * (finePointer ? 0.04 : 0.02))) * f;
    }
    wheel.style.transform = `translateZ(calc(-1 * var(--r))) rotateX(-6deg) rotateY(${angle.toFixed(3)}deg)`;
    // covers turned away from the viewer fade back
    for (let i = 0; i < n; i++) {
      const facing = Math.cos(((i * step + angle) * Math.PI) / 180);
      const o = Math.round(Math.max(0, Math.min(1, (facing - 0.05) / 0.75)) * 100) / 100;
      if (o !== fade[i]) {
        fade[i] = o;
        items[i].style.opacity = String(o);
        items[i].style.pointerEvents = o > 0.5 ? '' : 'none';
      }
    }
  });
}
