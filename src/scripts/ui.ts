// Interface behaviour that is not scroll animation: cursor label, the accent colour the page
// borrows from the work, the menu, clocks, rotating words, the image viewer.
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { gsap, lockScroll, reduced, finePointer } from './motion';

gsap.registerPlugin(ScrambleTextPlugin);

const html = document.documentElement;
const closest = (e: Event, sel: string) => (e.target instanceof Element ? e.target.closest<HTMLElement>(sel) : null);

/* ---------- cursor: a dot and a trailing ring; links open the ring, work turns it into a labelled
   disc ("View", "Zoom", "Play" from data-cursor). The system cursor is hidden only while the
   custom one is on screen, and comes back in text fields and embeds. ---------- */
export function initCursor() {
  const el = document.querySelector<HTMLElement>('.cursor');
  if (!el || !finePointer) return;
  const ring = el.querySelector<HTMLElement>('.cursor__ring')!;
  const dot = el.querySelector<HTMLElement>('.cursor__dot')!;
  const label = el.querySelector<HTMLElement>('.cursor__label');
  const ringX = gsap.quickTo(ring, 'x', { duration: reduced ? 0 : 0.42, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: reduced ? 0 : 0.42, ease: 'power3' });
  let on = false;
  let last = { x: innerWidth / 2, y: innerHeight / 2 };
  try {
    const saved = JSON.parse(sessionStorage.getItem('cursor') || 'null');
    if (saved) last = saved;
  } catch {}
  gsap.set([ring, dot], { x: last.x, y: last.y });

  const show = (x: number, y: number) => {
    gsap.set([ring, dot], { x, y });
    el.classList.add('is-on');
    html.classList.add('has-cursor');
    on = true;
  };
  const hide = () => {
    el.classList.remove('is-on', 'is-down');
    html.classList.remove('has-cursor');
    on = false;
  };
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      last = { x: e.clientX, y: e.clientY };
      if (!on) show(e.clientX, e.clientY);
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      ringX(e.clientX);
      ringY(e.clientY);
    },
    { passive: true },
  );

  const stateOf = (t: Element | null): [string, HTMLElement | null] => {
    if (!t) return ['', null];
    if (t.closest('input, textarea, select, [contenteditable="true"], iframe')) return ['text', null];
    const work = t.closest<HTMLElement>('[data-cursor]');
    if (work) return ['label', work];
    const link = t.closest<HTMLElement>('a, button, [role="button"], label, summary');
    if (link) return ['link', link];
    return ['', null];
  };
  document.addEventListener('pointerover', (e) => {
    const [state, target] = stateOf(e.target instanceof Element ? e.target : null);
    if (state === 'label' && label && target) label.textContent = target.dataset.cursor || '';
    const tint = state === 'link' && target ? getComputedStyle(target).getPropertyValue('--tint').trim() : '';
    if (tint) el.style.setProperty('--cursor-tint', tint);
    else el.style.removeProperty('--cursor-tint');
    el.dataset.state = state;
  });
  addEventListener('pointerdown', (e) => e.pointerType === 'mouse' && el.classList.add('is-down'));
  addEventListener('pointerup', () => el.classList.remove('is-down'));
  html.addEventListener('pointerleave', hide);
  addEventListener('blur', hide);
  addEventListener('pagehide', () => {
    try {
      sessionStorage.setItem('cursor', JSON.stringify(last));
    } catch {}
  });
}

/* ---------- accent: the page takes the colour of the piece of work in focus ---------- */
export function initAccent() {
  const base = html.dataset.accentBase || '';
  let current: HTMLElement | null = null;
  const set = (t: HTMLElement | null) => {
    if (t === current) return;
    current = t;
    const colour = t?.dataset.accent || '';
    const active = colour || base;
    if (active) {
      html.style.setProperty('--accent', active);
      html.style.setProperty('--on-accent', '#09090a');
    } else {
      html.style.removeProperty('--accent');
      html.style.removeProperty('--on-accent');
    }
    html.classList.toggle('has-glow', !!colour);
  };
  if (finePointer) {
    document.addEventListener('pointerover', (e) => set(closest(e, '[data-accent]')));
    document.addEventListener('focusin', (e) => set(closest(e, '[data-accent]')));
    html.addEventListener('pointerleave', () => set(null));
  } else {
    // touch: whatever passes through the middle of the screen lends its colour
    const seen = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? seen.add(e.target as HTMLElement) : seen.delete(e.target as HTMLElement)));
        set([...seen].pop() ?? null);
      },
      { rootMargin: '-46% 0px -46% 0px' },
    );
    document.querySelectorAll<HTMLElement>('[data-accent]').forEach((n) => io.observe(n));
  }
}

/* ---------- light / dark toggle ---------- */
export function initTheme() {
  const btn = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!btn) return;
  const label = btn.querySelector<HTMLElement>('[data-theme-label]');
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const isLight = () => html.dataset.theme === 'light';
  const sync = () => {
    const next = isLight() ? 'dark' : 'light';
    if (label) label.textContent = next;
    btn.setAttribute('aria-label', `Switch to ${next} mode`);
    if (meta) meta.content = isLight() ? '#f3f0ea' : '#09090a';
  };
  const apply = () => {
    if (isLight()) delete html.dataset.theme;
    else html.dataset.theme = 'light';
    try {
      localStorage.setItem('theme', isLight() ? 'light' : 'dark');
    } catch {}
    sync();
  };
  sync();
  btn.addEventListener('click', () => {
    const start = (document as Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready: Promise<void> } }).startViewTransition;
    if (!start || reduced) return apply();
    const r = btn.getBoundingClientRect();
    html.style.setProperty('--tx', `${r.left + 8}px`);
    html.style.setProperty('--ty', `${r.top + r.height / 2}px`);
    html.classList.add('theme-switching');
    const done = () => html.classList.remove('theme-switching');
    const transition = start.call(document, apply);
    transition.ready.catch(() => {}); // skipped (e.g. hidden tab): the theme still changes
    transition.finished.then(done, done);
  });
}

/* ---------- mono labels scramble into place on hover ---------- */
export function initScramble() {
  if (reduced || !finePointer) return;
  document.querySelectorAll<HTMLElement>('.bracket').forEach((el) => {
    if (el.childElementCount) return;
    const text = (el.textContent || '').trim();
    let busy = false;
    el.addEventListener('pointerenter', () => {
      if (busy) return;
      busy = true;
      gsap.to(el, { duration: 0.55, ease: 'none', scrambleText: { text, chars: 'upperCase', speed: 0.7 }, onComplete: () => void (busy = false) });
    });
  });
}

/* ---------- local time in Brussels ---------- */
export function initClock() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-clock]')];
  if (!els.length) return;
  const zone = els[0].dataset.zone || 'Europe/Brussels';
  const make = (seconds: boolean) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', ...(seconds ? { second: '2-digit' } : {}), hour12: false });
  const long = make(true);
  const short = make(false);
  const tick = () => {
    const now = new Date();
    els.forEach((el) => (el.textContent = (el.dataset.clock === 'short' ? short : long).format(now)));
  };
  tick();
  setInterval(tick, 1000);
  const abbr = new Intl.DateTimeFormat('en-GB', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value;
  if (abbr) document.querySelectorAll<HTMLElement>('[data-clock-zone]').forEach((el) => (el.textContent = abbr));
}

/* ---------- words that swap in place: data-rotate='["Graphic","Brand"]' ----------
   Optional data-rotate-colors='["#ffcc4d","#19d3e0"]' gives each word a colour, set as
   --rotate-color on the nearest [data-rotate-scope] so nearby elements can share it. */
export function initRotators() {
  if (reduced) return;
  document.querySelectorAll<HTMLElement>('[data-rotate]').forEach((el) => {
    let words: string[] = [];
    try {
      words = JSON.parse(el.dataset.rotate || '[]');
    } catch {}
    let colors: string[] = [];
    try {
      colors = JSON.parse(el.dataset.rotateColors || '[]');
    } catch {}
    const scope = el.closest<HTMLElement>('[data-rotate-scope]') ?? el;
    if (words.length < 2) return;
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % words.length;
      gsap.to(el, {
        yPercent: -115,
        duration: 0.4,
        ease: 'power3.in',
        onComplete: () => {
          el.textContent = words[i];
          if (colors[i]) scope.style.setProperty('--rotate-color', colors[i]);
          gsap.fromTo(el, { yPercent: 115 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' });
        },
      });
    }, 2400);
  });
}

/* ---------- full-screen menu ---------- */
export function initMenu() {
  const menu = document.getElementById('menu');
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (!menu || !btn) return;
  const label = btn.querySelector<HTMLElement>('[data-menu-label]');
  const items = menu.querySelectorAll<HTMLElement>('[data-menu-item]');
  const fades = menu.querySelectorAll<HTMLElement>('[data-menu-fade]');
  const outside = [document.getElementById('main'), document.querySelector<HTMLElement>('.ftr')];
  let open = false;

  const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' }, onReverseComplete: () => void (menu.hidden = true) });
  if (!reduced) {
    tl.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.85, ease: 'expo.inOut' })
      .fromTo(items, { yPercent: 118 }, { yPercent: 0, duration: 1, stagger: 0.065 }, 0.32)
      .fromTo(fades, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.05 }, 0.55);
  }

  const set = (state: boolean, instant = false) => {
    if (state === open) return;
    open = state;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    html.classList.toggle('menu-open', open);
    if (label) label.textContent = open ? 'Cl0s3' : 'Menu';
    outside.forEach((n) => n && (n.inert = open));
    lockScroll(open);
    if (open) {
      menu.hidden = false;
      if (!reduced) tl.timeScale(1).play(0);
      menu.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
    } else if (reduced || instant) {
      tl.pause(0);
      menu.hidden = true;
    } else {
      tl.timeScale(1.8).reverse();
    }
  };
  btn.addEventListener('click', () => set(!open));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) {
      set(false);
      btn.focus({ preventScroll: true });
    }
  });
  // coming back with the browser's back button must not land on an open menu
  addEventListener('pageshow', (e) => {
    if (e.persisted) set(false, true);
  });

  // each link shows its own picture
  const preview = menu.querySelector<HTMLElement>('[data-menu-preview]');
  if (preview && finePointer) {
    menu.querySelectorAll<HTMLElement>('[data-menu-link]').forEach((a) => {
      const show = () => (preview.dataset.active = a.dataset.menuLink || '');
      a.addEventListener('pointerenter', show);
      a.addEventListener('focus', show);
    });
    menu.querySelector('ul')?.addEventListener('pointerleave', () => (preview.dataset.active = ''));
  }
}

/* ---------- images fade in once loaded ---------- */
export function initImages() {
  html.classList.add('img-fade');
  document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
    if (img.complete) img.classList.add('is-loaded');
    else {
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
    }
  });
}

/* ---------- image viewer: any element with data-lightbox="<large image url>" ---------- */
export function initLightbox() {
  const items = [...document.querySelectorAll<HTMLElement>('[data-lightbox]')];
  if (!items.length) return;
  const dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Image viewer');
  dlg.innerHTML = `
    <div class="lightbox__stage" data-lenis-prevent><img alt="" /></div>
    <div class="lightbox__bar">
      <button type="button" class="bracket" data-prev>Prev</button>
      <span class="mono" data-count></span>
      <button type="button" class="bracket" data-next>Next</button>
      <button type="button" class="bracket lightbox__close" data-close>Close</button>
    </div>`;
  document.body.appendChild(dlg);
  const img = dlg.querySelector('img')!;
  const stage = dlg.querySelector<HTMLElement>('.lightbox__stage')!;
  const count = dlg.querySelector<HTMLElement>('[data-count]')!;
  const pad = (n: number) => String(n).padStart(2, '0');
  let index = 0;
  const show = (i: number) => {
    index = (i + items.length) % items.length;
    const it = items[index];
    stage.classList.remove('is-tall');
    img.style.opacity = '0';
    img.onload = () => {
      stage.classList.toggle('is-tall', img.naturalHeight / img.naturalWidth > 1.9);
      stage.scrollTop = 0;
      img.style.opacity = '1';
    };
    img.src = it.dataset.lightbox || '';
    img.alt = it.dataset.alt || '';
    count.textContent = `${pad(index + 1)} / ${pad(items.length)}`;
    if (items.length < 2) dlg.classList.add('is-single');
  };
  const open = (i: number) => {
    show(i);
    dlg.showModal();
    lockScroll(true);
  };
  dlg.addEventListener('close', () => lockScroll(false));
  items.forEach((it, i) => it.addEventListener('click', () => open(i)));
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target === stage) dlg.close();
  });
  dlg.querySelector('[data-close]')!.addEventListener('click', () => dlg.close());
  dlg.querySelector('[data-prev]')!.addEventListener('click', () => show(index - 1));
  dlg.querySelector('[data-next]')!.addEventListener('click', () => show(index + 1));
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });
}
