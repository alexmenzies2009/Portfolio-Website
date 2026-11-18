// Runs on every page.
import { initSmoothScroll, initReveals, initMarquees, initMagnetic, initTilt, initCounters, initFit, ScrollTrigger } from './motion';
import { initCursor, initAccent, initClock, initRotators, initMenu, initLightbox, initImages, initTheme, initScramble, initPulseColours } from './ui';
import { initWordmark } from './wordmark';
import { runLoader } from './loader';
import { initFields } from './field';
import { initMosaic } from './mosaic';

// the inner pages' headers: the home page's drifting particles, without the portrait
document.querySelectorAll<HTMLCanvasElement>('canvas[data-dust]').forEach((canvas) => initMosaic({ canvas, portrait: false }));

initSmoothScroll();
initCursor();
initAccent();
initClock();
initMenu();
initTheme();
initFields();
initScramble();
initLightbox();

// On the first page of a visit the intro plays first; the page animates in as its curtain lifts.
runLoader(() => {
  initFit(); // sizes first, so text is split and measured at its final size
  initWordmark();
  initReveals();
  initMarquees();
  initMagnetic();
  initTilt();
  initCounters();
  initRotators();
  initPulseColours();
  initImages();
  // start states are set: show the page
  document.documentElement.classList.add('is-ready');
  ScrollTrigger.refresh();
});

document.fonts?.ready.then(() => ScrollTrigger.refresh());
addEventListener('load', () => ScrollTrigger.refresh());
