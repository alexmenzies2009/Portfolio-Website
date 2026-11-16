// The intro: the logo rises, a counter runs to 100,
// then the panel lifts like a curtain. It plays on arrival and on reload, not between pages.
import { gsap, lockScroll } from './motion';

const html = document.documentElement;

/** Plays the intro if it is due; calls `onReveal` the moment the curtain starts to lift. */
export function runLoader(onReveal: () => void) {
  const loader = document.querySelector<HTMLElement>('.loader');
  if (!loader || !html.classList.contains('is-loading')) {
    onReveal();
    return;
  }
  const count = loader.querySelector<HTMLElement>('[data-loader-count]');
  const bar = loader.querySelector<HTMLElement>('[data-loader-bar]');
  const mark = loader.querySelector<HTMLElement>('.loader__mark');
  const rows = loader.querySelectorAll<HTMLElement>('.loader__row > span');
  const progress = { value: 0 };
  let revealed = false;
  const finish = () => {
    html.classList.remove('is-loading');
    lockScroll(false);
  };
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    onReveal();
  };

  lockScroll(true);
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.fromTo(mark, { yPercent: 110 }, { yPercent: 0, duration: 1.1 }, 0.1)
    .fromTo(rows, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.08 }, 0.25)
    .to(
      progress,
      {
        value: 100,
        duration: 1.7,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (count) count.textContent = String(Math.round(progress.value)).padStart(3, '0');
          if (bar) bar.style.transform = `scaleX(${progress.value / 100})`;
        },
      },
      0.2,
    )
    // hold on 100 until the fonts are in, so the page behind is never revealed half-dressed
    .add(() => {
      tl.pause();
      Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => tl.play());
    })
    .to(mark, { yPercent: -115, duration: 0.7, ease: 'expo.in' }, '+=0.15')
    .to(rows, { autoAlpha: 0, duration: 0.3 }, '<')
    .add(reveal, '-=0.1')
    .to(loader, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '<')
    .add(finish);

  // never trap the visitor behind the intro
  setTimeout(() => {
    if (html.classList.contains('is-loading')) {
      tl.kill();
      reveal();
      finish();
    }
  }, 7000);
}
