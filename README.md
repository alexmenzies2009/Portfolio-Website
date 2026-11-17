# Alex Menzies — Portfolio

Your portfolio as a plain static website. No Framer, no subscription: the files in this
folder are the whole site. It is built with [Astro](https://astro.build), which turns the
content below into fast HTML pages you can host anywhere.

## Run it on your Mac

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:4321. The page refreshes when you save a file.

To produce the final site (it lands in the `dist` folder):

```bash
npm run build
```

The first build takes about two minutes because it creates every image in several sizes.
After that only changed images are rebuilt.

## Where things live

| What | Where |
| --- | --- |
| Projects: one folder each, text and images together | `src/content/work/` |
| Your name, intro texts, social links, CV, tools, playground pieces | `src/data/site.ts` |
| Portrait, service and playground images | `src/assets/` |
| Colours, fonts, spacing (dark and light) | `src/styles/global.css` |
| Pages | `src/pages/` |
| Logo, favicon, share image | `src/assets/brand/`, `public/` |

## Add a project

Every project is one folder in `src/content/work/`. The folder name is the web address:
`src/content/work/my-project/` becomes `/work/my-project`.

```
src/content/work/my-project/
  index.md     the text
  cover.jpg    the main image (cards, top of the project page)
  01.jpg       every other image in the folder becomes the gallery,
  02.png       in file-name order
```

The quick way:

```bash
npm run new "My Project"
```

That creates the folder with a ready-to-edit `index.md`. Then:

1. Drop the images into the folder. Name the main one `cover` (`cover.jpg`, `cover.png`, ...). Any size works; they are resized automatically.
2. Open `index.md` and fill in the top part:

```md
---
title: "My Project"
tagline: "One line that sells it."
category: "Branding"
tags: ["Branding"]
tools: ["Illustrator", "Photoshop"]
---

The "About" text goes here. Leave a blank line between paragraphs.
```

That is all. Nothing else needs to be registered: the project shows up on `/work`, gets its own page,
and joins the portrait on the home page.

Optional lines for the top part:

- `order: 5` position in the work list. Leave it out and the project goes to the very front.
- `featured: true` also shows it under "Selected work" on the home page.
- `accent: "#19d3e0"` the colour the site borrows while the project is in focus.
- `tags` decide which filters on `/work` show it: Branding, Design, Print, UI/UX, Animation, AI.
- `link` (with `label` and `url`) and `video` (with `provider: vimeo` or `youtube`, and `id`).

To remove a project, delete its folder.

**Handing a project to Claude:** put the images in a folder anywhere, say what the project is
(name, one-line description, type, tools), and ask Claude to "add this project". The steps above
are all it needs to do.

## The home page and its backups

- `/` is the home page: the hero is your portrait built from thumbnails of every project image.
  Every few seconds a project steps out of the portrait as a small card, floats beside it and
  later flies back into the gap it left. Clicking a card opens a preview of that project.
- `/backup` is the previous home page: the same portrait, where hovering magnifies the thumbnails
  under the cursor and clicking one opens that project. To switch back, change `<Home emerge />`
  to `<Home mosaic />` in `src/pages/index.astro`.
- `/classic` is the earliest hero (contour map and image trail). To use it, change the line in
  `src/pages/index.astro` to `<Home />`.

Both backups are not linked from the menu and are hidden from search engines.


## Contact form

Messages are forwarded to your inbox by FormSubmit (set in `src/data/site.ts` under `contactForm`).
The very first message makes FormSubmit send you an "activate" email; click its link once and the
form is live. After activating, FormSubmit gives you a random code you can use in place of the
email address in the endpoint, so the address is not visible in the page source.

## Put it online

Any static host works: Netlify, Vercel, Cloudflare Pages, GitHub Pages.

- Build command: `npm run build`
- Folder to publish: `dist`

Without connecting anything you can also run `npm run build` and drag the `dist` folder onto
https://app.netlify.com/drop.

Once you have a domain, set it as `SITE_URL` when building (for example
`SITE_URL=https://yourdomain.com npm run build`, or as an environment variable at your host).
It is used for the canonical link and the social-share image address.

## The `migration` folder

Everything pulled from the old Framer site on 15 November 2026: the original texts
(`content.json`), the full-size original images (`assets/`, about 200 MB) and the scripts that
converted them. The site does not need this folder to run. Keep it as a backup, or delete it
once you are sure you have your originals elsewhere.

## Why `npm run` goes through `scripts/astro.mjs`

That small launcher makes sure Astro starts on a recent Node.js even when an old `node`
is sitting in a parent folder's `node_modules`, which otherwise takes over `npm` scripts.
