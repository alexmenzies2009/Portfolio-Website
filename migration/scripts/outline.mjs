// Prints a compact, de-duplicated outline of a saved Framer page.
import { readFile } from 'node:fs/promises';
import { parse } from 'node-html-parser';
const [file, maxArg] = process.argv.slice(2);
const html = await readFile(file, 'utf8');
const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false } });
const main = root.querySelector('#main') || root.querySelector('body');
const SKIP = new Set(['script','style','path','noscript','link','meta','svg']);
const KEEP = new Set(['img','a','video','iframe','h1','h2','h3','h4','form','input','textarea','select','button','label']);
// Framer renders each breakpoint variant; skip subtrees whose name marks tablet/phone duplicates
const lines = [];
const m = html.match(/@media\s*\(min-width:\s*1200px\)\s*\{\s*\.(hidden-[a-z0-9]+)/);
const DESKTOP_HIDDEN = m ? m[1] : null;
function ownText(el){ return el.childNodes.filter(n => n.nodeType === 3).map(n => n.text.replace(/\s+/g,' ').trim()).join(' ').trim(); }
function walk(el, depth){
  for (const c of el.childNodes) {
    if (c.nodeType !== 1) continue;
    const tag = c.rawTagName.toLowerCase();
    if (SKIP.has(tag)) continue;
    const cls = c.getAttribute('class') || '';
    if (DESKTOP_HIDDEN && cls.split(/\s+/).includes(DESKTOP_HIDDEN)) continue;
    let info = tag;
    const n = c.getAttribute('data-framer-name');
    if (n) info += '[' + n + ']';
    if (tag === 'img') info += ' ' + (c.getAttribute('src')||'').replace('https://framerusercontent.com/images/','IMG:').split('?')[0] + (c.getAttribute('alt') ? ' alt=' + c.getAttribute('alt') : '');
    if (tag === 'a') info += ' ->' + c.getAttribute('href');
    if (tag === 'video' || tag === 'iframe') info += ' src=' + c.getAttribute('src');
    if (['input','textarea','select','button','form','label'].includes(tag)) info += ' {' + Object.entries(c.attributes).filter(([k]) => !['class','style'].includes(k)).map(([k,v]) => k + '=' + String(v).slice(0,50)).join(' ') + '}';
    const own = ownText(c);
    if (own) info += ' :: ' + own.slice(0, 400);
    const keep = n || own || KEEP.has(tag);
    if (keep) lines.push(' '.repeat(Math.min(depth, 12)) + info);
    walk(c, depth + (keep ? 1 : 0));
  }
}
walk(main, 0);
// collapse consecutive duplicate blocks cheaply: drop exact repeated lines that directly follow an identical line
const out = [];
for (const l of lines) { if (out[out.length-1] !== l) out.push(l); }
const s = out.join('\n');
console.log(s.length);
console.log(s.slice(0, Number(maxArg || 20000)));
