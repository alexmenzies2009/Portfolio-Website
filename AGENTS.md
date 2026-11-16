# Notes for coding agents

Static portfolio for Alex Menzies, rebuilt from a Framer site. Astro 7, no UI framework, plain CSS,
GSAP + Lenis for motion. See README.md for the content model.

## Commands

- `npm run dev` / `npm run build` / `npm run preview` go through `scripts/astro.mjs`, a launcher that finds a Node >= 22 even if an old `node` binary sits in a parent folder's `node_modules`. `.npmrc` sets `ignore-scripts=true` (dependencies ship prebuilt binaries).
- The dev server must be restarted after `src/content.config.ts` changes.
- First production build generates about 1,150 image variants (roughly two minutes); later builds use the cache in `node_modules/.astro`.

## Structure

- `src/content/work/<slug>/index.md` plus that project's images in the same folder. `src/lib/work.ts` (`getWork()`) attaches `cover` (file named `cover.*`, else the first image), `gallery` (all other images, by file name) and `number`. Always use `getWork()`, not `getCollection('work')`.
- **Adding a project for the owner:** `npm run new "Name"` (or create the folder by hand), copy the supplied images in (convert HEIC/TIFF to JPG; name the main one `cover.*`, number the rest `01`, `02`, ...), fill in `index.md` (title, tagline, category, tags from Branding/Design/Print/UI-UX/Animation/AI, tools; pick an `accent` hex from the cover; leave `order` out to put it first), then run `npm run build` to confirm.
- `src/components/Home.astro` is the home page; `/` renders it with `mosaic`, `/classic` without (the earlier hero) (portrait made of project thumbnails: `src/lib/mosaic.ts` builds `/mosaic/atlas.webp` and `/mosaic/map.json` at build time from `src/assets/about/portrait-cutout.webp`; `src/scripts/mosaic.ts` draws it).
- `src/scripts/field.ts`: the WebGL contour background (`<canvas class="field" data-field>` inside a section with `isolation: isolate`).
- `src/data/site.ts`: all non-project content.
- `src/styles/global.css`: design tokens and shared classes (`.display`, `.mono`, `.pill`, `.bracket`, `.chip`, `.frame`, `.outline`).
- `src/scripts/motion.ts`: data-attribute driven motion (`data-split`, `data-reveal`, `data-parallax`, `data-kinetic`, `data-fit`, `data-marquee`, `data-magnetic`). `ui.ts`: cursor, accent colour, menu, clock, lightbox. `loader.ts`: the once-per-session intro; `app.ts` starts page animations when its curtain lifts. `wordmark.ts`: the kinetic hero word.
- Page transitions are native cross-document view transitions; the cover morph is wired by the inline script in `src/layouts/Base.astro` (`data-project-link`, `data-cover`, `data-hero-cover`, class `vt-cover`).

## Conventions

- Dark only. The interface is monochrome; colour comes from a project's `accent` via the `--accent` custom property.
- Display type is Mona Sans Variable; its width axis is driven with `--wdth` (75 to 125). Labels are Martian Mono.
- Everything animated must still read correctly with `prefers-reduced-motion` and without JavaScript.
- Astro 7's compiler rejects unclosed tags and does not repair invalid nesting.
