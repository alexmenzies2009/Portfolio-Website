#!/usr/bin/env node
// Creates the folder for a new project:  npm run new "Project name"
// Then drop the images into that folder (name the main one cover.jpg) and edit index.md.
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const name = process.argv.slice(2).join(' ').trim();
if (!name) {
  console.error('Give the project a name, for example:  npm run new "Pizza Hut Summer"');
  process.exit(1);
}
const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src', 'content', 'work', slug);
if (existsSync(dir)) {
  console.error(`There is already a project folder called "${slug}".`);
  process.exit(1);
}
mkdirSync(dir, { recursive: true });
writeFileSync(
  path.join(dir, 'index.md'),
  `---
title: ${JSON.stringify(name)}
tagline: "One line that sells it."
category: "Branding"
tags: ["Branding"]
tools: ["Illustrator", "Photoshop"]
# order: 1            position in the list; leave out to put this project first
# featured: true      show under "Selected work" on the home page
# accent: "#19d3e0"   the colour the site borrows for this project
# link:
#   label: "Live site"
#   url: "https://example.com"
# video:
#   provider: "vimeo"   or "youtube"
#   id: "815699036"
---

Write the "About" text here. Leave a blank line between paragraphs.
`,
);
console.log(`Created src/content/work/${slug}/`);
console.log('Next: put the images in that folder (the main one named cover.jpg / cover.png) and edit index.md.');
console.log(`It will appear at /work/${slug}`);
