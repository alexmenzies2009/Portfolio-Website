# Notes for coding agents

Static portfolio for Alex Menzies, rebuilt from a Framer site. Astro 7, no UI framework, plain CSS,
GSAP + Lenis for motion. See README.md for the content model.

## Commands

- `npm run dev` / `npm run build` / `npm run preview` go through `scripts/astro.mjs`, a launcher that finds a Node >= 22 even if an old `node` binary sits in a parent folder's `node_modules`. Deployed by Netlify from GitHub (`netlify.toml`); `node_modules`, `dist`, `.astro` and `migration` are git-ignored, so never commit them.
- The dev server must be restarted after `src/content.config.ts` changes.
- First production build generates about 1,150 image variants (roughly two minutes); later builds use the cache in `node_modules/.astro`.

## Structure

- `src/content/work/<slug>/index.md` plus that project's images in the same folder. `src/lib/work.ts` (`getWork()`) attaches `cover` (file named `cover.*`, else the first image), `gallery` (all other images, by file name) and `number`. Always use `getWork()`, not `getCollection('work')`.
- **Adding a project for the owner:** `npm run new "Name"` (or create the folder by hand), copy the supplied images in (convert HEIC/TIFF to JPG; name the main one `cover.*`, number the rest `01`, `02`, ...), fill in `index.md` (title, tagline, category, tags from Branding/Design/Print/UI-UX/Animation/AI, tools; pick an `accent` hex from the cover; leave `order` out to put it first), then run `npm run build` to confirm.
- `src/components/Home.astro` is the home page; `/` renders it with `emerge`, `/backup` with `mosaic` (the previous home page, hover lens), `/classic` with neither (the earliest hero); the two backups pass `noindex` and a `title` (portrait made of project thumbnails: `src/lib/mosaic.ts` builds `/mosaic/atlas.webp` and `/mosaic/map.json` at build time from `src/assets/about/portrait-cutout.webp`; `src/scripts/mosaic.ts` draws it).
- The home hero (`emerge`) has no hover lens on the portrait (`initMosaic({ hover: false })`); instead `src/scripts/emerge.ts` lifts tiles out of the portrait as clickable project cards that later fly back into their gaps (via the `Mosaic` API returned by `initMosaic`).
- `src/scripts/field.ts`: the WebGL contour background (`<canvas class="field" data-field>` inside a section with `isolation: isolate`); used only by the "Have a cool project?" block (`ContactCta`) and `/classic`. The inner pages' headers (`PageHero`) use the home page's drifting particles instead: `<canvas data-dust>`, started in `app.ts` with `initMosaic({ canvas, portrait: false })`.
- `src/data/site.ts`: all non-project content. Stack tools name an `icon` file in `src/assets/stack/` (monochrome SVGs, `currentColor` plus `var(--knock)` for cut-outs, made from the open logo sets gilbarbara/logos, Devicon and Simple Icons) with full-colour copies in `src/assets/stack/color/` shown on hover, and a `brand` colour for the arrow; inlined by `stack.astro`. Social links carry a `brand` colour for their hover.
- `src/styles/global.css`: design tokens and shared classes (`.display`, `.mono`, `.pill`, `.bracket`, `.chip`, `.frame`, `.outline`).
- `src/scripts/motion.ts`: data-attribute driven motion (`data-split`, `data-reveal`, `data-parallax`, `data-kinetic`, `data-fit`, `data-marquee`, `data-magnetic`). `ui.ts`: cursor, accent colour, menu, clock, lightbox. `loader.ts`: the once-per-session intro; `app.ts` starts page animations when its curtain lifts. `wordmark.ts`: the kinetic hero word.
- Page transitions are native cross-document view transitions; the cover morph is wired by the inline script in `src/layouts/Base.astro` (`data-project-link`, `data-cover`, `data-hero-cover`, class `vt-cover`). The new page is captured at its first paint, before the scripts run, so the element a cover lands on is marked `data-reveal-done` there (skips its reveal, image shown at once), and nothing on screen at load may change size or position once the scripts start.

## Conventions

- Dark only. The interface is mostly monochrome; colour comes from a project's `accent` via the `--accent` custom property, plus small touches (label numbers and rules via `--tint`, filter brackets, card tag dots, menu links, the media reveal) from the project palette: the `--c-*` tokens in `global.css`, mapped to tags and pages in `src/lib/palette.ts` and `nav` in `src/data/site.ts`. Keep colour to small accents; never large areas.
- Display type is Mona Sans Variable; its width axis is driven with `--wdth` (75 to 125). Labels are Martian Mono.
- Everything animated must still read correctly with `prefers-reduced-motion` and without JavaScript.
- Astro 7's compiler rejects unclosed tags and does not repair invalid nesting.
- `.field` is also the contact form's field class: the contour canvas styles are scoped to `canvas.field`, keep them that way.
- Per-frame code (`gsap.ticker`) must not read layout (`scrollY`, `getBoundingClientRect`) after other code has written styles in the same frame, and must not set CSS variables that many elements inherit: both made phone scrolling stutter. Take scroll speed from `lenis.velocity` or a scroll event; put per-frame motion in one element's `transform`; don't animate colours with CSS keyframes (they restyle every frame, even off screen). On touch screens: the wordmark wave updates every third frame while the page is scrolling (each change re-shapes the variable-font letters; full rate stutters, pausing it was rejected); the portrait draws 450 particles instead of 1600, renders at 1.25x, has no scroll-away explosion (it scrolls off intact) and is not redrawn while the page is scrolling (iOS scrolls apart from the canvas redraw, which made it judder); `--accent` switches without its transition (a transitioning inherited property on `html` restyles the whole page every frame); the inner pages' header particles are off below 700px.
- GSAP resets the CSS `scale`/`translate`/`rotate` properties on any element it moves: put those looks on a child (see the cursor in `Base.astro`).
- Resizing a WebGL canvas clears it; `mosaic.ts` and `field.ts` redraw inside their resize handler so no blank frame is shown. `html` has `scrollbar-gutter: stable` so locking scroll (intro, menu) never changes the page width.
