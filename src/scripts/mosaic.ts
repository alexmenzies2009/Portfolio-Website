// "The work makes the person": a portrait drawn from thousands of tiny project thumbnails.
// Each cell of the portrait is one WebGL point textured with a project image; brighter parts
// of the face get bigger, brighter tiles. The tiles fly in from space, turn slightly with the
// pointer (the face has real depth) and scatter as you scroll away. Hovering loosens the
// portrait slightly and lifts the few tiles under the cursor out of it, large and well apart,
// so those projects can be seen and clicked. (With { hover: false }, the V2 hero, there is no
// hover lens: emerge.ts lifts whole tiles out of the portrait instead.)
// Around the portrait, small particles (specks and tiny thumbnails) drift through the dark.
import { gsap, ScrollTrigger, reduced, finePointer } from './motion';

const VERT = `#version 300 es
precision highp float;
in vec2 aHome;   // position in the portrait, -1..1 (y up); for particles, anywhere on screen
in float aLum;   // brightness of that part of the portrait, 0..1 (for particles: their depth)
in float aTile;  // which thumbnail
in vec2 aSeed;   // two random numbers per tile
in float aKind;  // 0 = part of the portrait, 1 = a particle drifting in the background
uniform vec2 uRes;
uniform float uTime, uIn, uOut, uSize, uLight, uLens;
uniform vec2 uMouse;    // pointer in clip space (far away until it moves)
uniform vec2 uTurn;     // how far the head is turned, -1..1
uniform vec2 uOffset;   // where the portrait sits in clip space
uniform float uScale;
uniform float uCell;     // size of one portrait cell, in half screen-heights
uniform vec3 uHoles[6];  // gaps left by tiles that stepped out: home x, y and how open (0..1)
uniform float uHomeCell; // one portrait cell, in home units
out float vTile;
out float vShade;
out float vAlpha;
out float vLens;
out float vKind;
out float vSeed;
out vec3 vSpeck;

const float LOOSEN = 0.055;    // how much the whole portrait eases apart, in half screen-heights
const float REACH = 1.2;       // how far across the figure that easing is felt
const float PICK_CELLS = 2.3;  // tiles within this many cells of the cursor lift out
const float SPREAD = 13.0;     // how much further apart the lifted tiles end up
const float GROWN = 8.6;       // their size, in portrait cells
const float HOLE = 1.8;        // radius of a fully open gap, in portrait cells (keep in step with HOLE_CELLS)

float ease(float x) { return 1.0 - pow(1.0 - clamp(x, 0.0, 1.0), 4.0); }

void main() {
  float dust = aKind;
  float weight = mix(aLum, 1.0 - aLum, uLight);
  vec3 home = vec3(aHome, (aLum - 0.45) * 0.42);
  float edge = 1.0;
  if (dust > 0.5) {
    // background particles rise slowly, sway, and wrap around from top to bottom
    float y = mod(aHome.y + 1.35 + uTime * (0.008 + aSeed.x * 0.022), 2.7) - 1.35;
    home = vec3(aHome.x + sin(uTime * 0.11 + aSeed.y * 6.283) * 0.07, y, aLum * 1.9 - 1.3);
    edge = smoothstep(1.35, 1.1, abs(y));
  }
  // assemble: every tile starts far out and arrives on its own schedule
  float arrive = ease(uIn * 1.9 - aSeed.x * 0.9);
  vec3 away = vec3((aSeed - 0.5) * 7.0, 1.2 + aSeed.y * 1.6);
  vec3 p = mix(away, home, arrive);
  // breathe
  p.xy += vec2(sin(uTime * 0.7 + aSeed.x * 40.0), cos(uTime * 0.6 + aSeed.y * 40.0)) * 0.0035;
  p.z += sin(uTime * 0.5 + aSeed.y * 30.0) * 0.012;
  // leave: scrolling away blows everything apart toward the viewer
  float leave = uOut * uOut;
  p.xy += (aHome * 0.9 + (aSeed - 0.5) * 1.6) * leave * 2.6;
  p.z += leave * (0.6 + aSeed.x * 1.4);
  // turn with the pointer (particles sit at different depths, so they slide past each other)
  float ry = uTurn.x * 0.38, rx = -uTurn.y * 0.22;
  p.xz = mat2(cos(ry), -sin(ry), sin(ry), cos(ry)) * p.xz;
  p.yz = mat2(cos(rx), -sin(rx), sin(rx), cos(rx)) * p.yz;
  float persp = 1.0 / (2.2 - p.z);
  vec2 clip = p.xy * persp * 2.2 * uScale;
  clip.x *= uRes.y / uRes.x;
  clip += uOffset;
  // Hover, in two layers so the face stays a face:
  //  1. the whole portrait loosens a little around the cursor (tiles ease apart, strongest
  //     nearby, fading across the figure), like fabric relaxing rather than bursting;
  //  2. the dozen tiles right under the cursor lift out of it: they keep their arrangement,
  //     spread wide apart, grow large and show their real colours.
  vec2 aspect = vec2(uRes.x / uRes.y, 1.0);
  vec2 toMouse = (clip - uMouse) * aspect;
  float r = length(toMouse);
  vec2 dir = toMouse / max(r, 0.00001);
  float on = uLens * arrive * (1.0 - leave);
  float eased = r + LOOSEN * (1.0 - exp(-r / 0.12)) * exp(-(r * r) / (REACH * REACH));
  float reach = uCell * PICK_CELLS;
  float pick = smoothstep(reach, reach * 0.85, r) * on * (1.0 - dust);
  float lifted = r * (1.0 + SPREAD);
  clip = uMouse + dir * mix(mix(r, eased, on), lifted, pick) / aspect;
  float base = 0.3 + 0.74 * weight;
  // a project that has stepped out leaves a round gap behind it, which opens and closes from the middle
  float hole = 0.0;
  if (dust < 0.5) {
    for (int k = 0; k < 6; k++) {
      float open = uHoles[k].z;
      if (open <= 0.0) continue;
      float d = length(aHome - uHoles[k].xy) / uHomeCell;
      hole = max(hole, smoothstep(HOLE * open + 0.7, HOLE * open - 0.7, d));
    }
  }
  base *= 1.0 - hole;
  gl_Position = vec4(clip, mix(0.5 - pick * 0.45, 0.9, dust), 1.0);
  gl_PointSize = uSize * persp * 2.2 * mix(mix(base, GROWN, pick), 0.28 + aSeed.x * 0.85, dust);
  // what stays behind dims a little so the lifted tiles stand out
  float behind = 1.0 - 0.55 * exp(-(r * r) / 0.12) * on * (1.0 - pick);
  float big = pick;
  float twinkle = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed.y * 1.5) + aSeed.x * 30.0);
  vTile = aTile;
  vShade = mix(0.12 + 1.15 * aLum * aLum, 0.95, uLight) * behind;
  vAlpha = (1.0 - hole) * arrive * (1.0 - smoothstep(0.75, 1.0, uOut)) * mix(1.0, edge * (0.3 + 0.7 * twinkle), dust);
  vLens = big;
  vKind = dust;
  vSeed = aSeed.y;
  vSpeck = mix(vec3(0.93, 0.92, 0.89), vec3(0.05, 0.05, 0.06), uLight);
}`;

const FRAG = `#version 300 es
precision mediump float;
uniform sampler2D uAtlas;
uniform vec2 uGrid;  // atlas columns, rows
in float vTile;
in float vShade;
in float vAlpha;
in float vLens;
in float vKind;
in float vSeed;
in vec3 vSpeck;
out vec4 o;
void main() {
  vec2 c = gl_PointCoord;
  vec2 cell = vec2(mod(vTile, uGrid.x), floor(vTile / uGrid.x));
  vec3 tex = texture(uAtlas, (cell + c * 0.92 + 0.04) / uGrid).rgb;
  if (vAlpha < 0.02) discard;
  if (vKind > 0.5) {
    // two in five particles are tiny project thumbnails, the rest are plain square specks
    if (vSeed > 0.6) { o = vec4(tex * 0.85, vAlpha * 0.75); return; }
    o = vec4(vSpeck, vAlpha * 0.6);
    return;
  }
  // flatten each thumbnail a little so the portrait's own light and shade stay readable
  vec3 col = mix((tex * 0.72 + 0.24) * vShade, tex, vLens);
  o = vec4(col, vAlpha);
}`;

type MapData = {
  cols: number;
  rows: number;
  points: number[];
  atlas: { count: number; cols: number; rows: number };
  tiles: number[];
  projects: { slug: string; title: string }[];
};

/** What the portrait lets other scripts do (used by the V2 hero, see emerge.ts). */
const HOLE_CELLS = 1.8; // radius of the gap a project leaves, in cells (HOLE in the shader)

export type Mosaic = {
  /** number of portrait cells */
  count: number;
  /** brightness of a cell, 0..1 */
  lum(i: number): number;
  /** the project whose thumbnail fills a cell */
  project(i: number): { slug: string; title: string } | null;
  /** where a cell is drawn right now, in CSS pixels from the canvas's top left, its size, and the
   * diameter of the gap it leaves when it steps out */
  locate(i: number): { x: number; y: number; size: number; hole: number };
  /** every portrait cell's position right now, in CSS pixels, as x, y pairs */
  outline(): Float32Array;
  /** the box the portrait occupies, in CSS pixels */
  bounds(): { left: number; top: number; right: number; bottom: number };
  /** open a gap around a cell (amount 0..1) while its project is out of the picture; slot 0-5 */
  hide(slot: number, cell: number, amount: number): void;
  /** how far the portrait has assembled (in) and been scrolled away (out), 0..1 */
  progress(): { in: number; out: number };
};

/** Draws the portrait (or, with portrait: false, only the drifting particles around it) into a canvas. */
export async function initMosaic({
  hover = true,
  portrait: withPortrait = true,
  canvas = document.querySelector<HTMLCanvasElement>('canvas[data-mosaic]'),
}: { hover?: boolean; portrait?: boolean; canvas?: HTMLCanvasElement | null } = {}): Promise<Mosaic | null> {
  if (!canvas) return null;
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false });
  if (!gl) return null;

  const [map, image] = await Promise.all([
    fetch(canvas.dataset.map || '').then((r) => r.json() as Promise<MapData>),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = canvas.dataset.atlas || '';
    }),
  ]).catch(() => [null, null] as const);
  if (!map || !image) return null;

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram()!;
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // one point per portrait cell, followed by the background particles
  const n = withPortrait ? map.points.length / 3 : 0;
  if (!withPortrait) hover = false;
  const DUST = 1600;
  const STRIDE = 7;
  const data = new Float32Array((n + DUST) * STRIDE);
  const half = Math.max(map.cols, map.rows) / 2;
  const randomTile = () => Math.round(Math.random() * (map.atlas.count - 1));
  for (let i = 0; i < n; i++) {
    const o = i * STRIDE;
    data[o] = (map.points[i * 3] + 0.5 - map.cols / 2) / half;
    data[o + 1] = -(map.points[i * 3 + 1] + 0.5 - map.rows / 2) / half;
    data[o + 2] = map.points[i * 3 + 2] / 255;
    data[o + 3] = randomTile();
    data[o + 4] = Math.random();
    data[o + 5] = Math.random();
  }
  for (let i = n; i < n + DUST; i++) {
    const o = i * STRIDE;
    data[o] = (Math.random() - 0.5) * 5.2; // spread well past both sides of the portrait
    data[o + 1] = (Math.random() - 0.5) * 2.7;
    data[o + 2] = Math.random(); // depth
    data[o + 3] = randomTile();
    data[o + 4] = Math.random();
    data[o + 5] = Math.random();
    data[o + 6] = 1;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const attr = (name: string, size: number, offset: number) => {
    const loc = gl.getAttribLocation(program, name);
    if (loc < 0) return;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, offset);
  };
  attr('aHome', 2, 0);
  attr('aLum', 1, 8);
  attr('aTile', 1, 12);
  attr('aSeed', 2, 16);
  attr('aKind', 1, 24);

  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.enable(gl.DEPTH_TEST); // enlarged tiles are drawn nearer, particles further back
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform2f(u('uGrid'), map.atlas.cols, map.atlas.rows);
  const uRes = u('uRes'), uTime = u('uTime'), uIn = u('uIn'), uOut = u('uOut'), uSize = u('uSize'), uLight = u('uLight'), uMouse = u('uMouse'), uTurn = u('uTurn'), uLens = u('uLens'), uOffset = u('uOffset'), uScale = u('uScale'), uCell = u('uCell'), uHoles = u('uHoles');
  const holes = new Float32Array(6 * 3);
  gl.uniform1f(u('uHomeCell'), 1 / half);

  let width = 1, height = 1, dpr = 1, portrait = 1, offsetY = -0.04;
  // resizing a canvas wipes it: draw again straight away, so a blank frame is never shown
  let redraw: (() => void) | null = null;
  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 1.5);
    width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    // narrow screens: shrink the portrait so the shoulders still fit
    portrait = Math.min(1, (width / height) * 1.05);
    // on a computer screen the head moves up into the empty space above the wordmark
    offsetY = width / height > 1.2 ? 0.17 : -0.04;
    redraw?.();
  };
  resize();
  new ResizeObserver(resize).observe(canvas);

  const state = { in: reduced ? 1 : 0, out: 0 };
  const mouse = { x: -5, y: -5, tx: -5, ty: -5 };
  const turn = { x: 0, y: 0 };
  let lens = 0;
  let hot = -1; // index of the tile under the cursor, or -1
  let away = true; // pointer is outside the hero
  if (finePointer && !reduced) {
    addEventListener(
      'pointermove',
      (e) => {
        const box = canvas.getBoundingClientRect();
        mouse.tx = ((e.clientX - box.left) / box.width) * 2 - 1;
        mouse.ty = -(((e.clientY - box.top) / box.height) * 2 - 1);
        // arriving from outside: start at the pointer instead of sweeping in from afar
        if (mouse.x < -2) {
          mouse.x = mouse.tx;
          mouse.y = mouse.ty;
        }
      },
      { passive: true },
    );
  }
  let visible = true;
  new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);

  // assemble once the page has been revealed (after the intro)
  const html = document.documentElement;
  const start = () => !reduced && gsap.to(state, { in: 1, duration: 3.2, ease: 'power1.out', delay: 0.2 });
  if (html.classList.contains('is-ready')) start();
  else {
    const mo = new MutationObserver(() => {
      if (!html.classList.contains('is-ready')) return;
      mo.disconnect();
      start();
    });
    mo.observe(html, { attributes: true, attributeFilter: ['class'] });
  }
  if (!reduced) {
    ScrollTrigger.create({ trigger: canvas.parentElement, start: 'top top', end: 'bottom 15%', scrub: 0.4, onUpdate: (self) => (state.out = self.progress) });
  }

  // ---- which tile is under the cursor? (same projection as the shader, done on the CPU)
  const hero = canvas.parentElement as HTMLElement;
  const tip = hero.querySelector<HTMLElement>('[data-mosaic-tip]');
  const SCALE = 0.94;
  // where cell i lands in clip space (the shader's projection, without the small breathing)
  const P = { x: 0, y: 0, persp: 0 };
  const projectCell = (i: number, tx = turn.x, ty = turn.y) => {
    const ry = tx * 0.38, rx = -ty * 0.22;
    const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
    const hx = data[i * STRIDE], hy = data[i * STRIDE + 1], hz = (data[i * STRIDE + 2] - 0.45) * 0.42;
    const x1 = cy * hx + sy * hz, z1 = -sy * hx + cy * hz;
    const y2 = cx * hy + sx * z1, z2 = -sx * hy + cx * z1;
    P.persp = (1 / (2.2 - z2)) * 2.2 * SCALE * portrait;
    P.x = (x1 * P.persp) / (width / height);
    P.y = y2 * P.persp + offsetY;
    return P;
  };
  const pick = () => {
    if (away || state.in < 0.97 || state.out > 0.08 || mouse.x < -1.2) return -1;
    const ratio = width / height;
    let best = -1;
    let bestD = (1.6 * SCALE * portrait * 2) / Math.max(map.cols, map.rows); // must be within about 1.6 cells
    bestD *= bestD;
    for (let i = 0; i < n; i++) {
      const c = projectCell(i);
      const dx = (c.x - mouse.x) * ratio;
      const dy = c.y - mouse.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  };
  const projectOf = (i: number) => (i < 0 ? null : map.projects[map.tiles[data[i * STRIDE + 3]]] ?? null);
  let tipX = 0, tipY = 0, shownSlug = '';
  if (hover && finePointer && !reduced) {
    hero.addEventListener('pointermove', () => (away = false));
    hero.addEventListener('pointerleave', () => (away = true));
    hero.addEventListener('click', (e) => {
      const project = projectOf(hot);
      if (!project || (e.target instanceof Element && e.target.closest('a, button, [data-peek]'))) return;
      const box = hero.getBoundingClientRect();
      hero.dispatchEvent(new CustomEvent('mosaic:pick', { detail: { slug: project.slug, x: e.clientX - box.left, y: e.clientY - box.top } }));
    });
  }

  canvas.classList.add('is-live');
  const draw = (time: number) => {
    if (!visible || document.hidden) return;
    // the opening follows the pointer at an unhurried pace, so a quick sweep of the mouse
    // does not race through every project
    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;
    const lag = Math.hypot((mouse.tx - mouse.x) * (width / height), mouse.ty - mouse.y);
    const inside = Math.abs(mouse.tx) <= 1.2 && Math.abs(mouse.ty) <= 1.2;
    turn.x += ((inside ? mouse.tx : 0) - turn.x) * 0.04;
    turn.y += ((inside ? mouse.ty : 0) - turn.y) * 0.04;
    hot = hover && finePointer && !reduced ? pick() : -1;
    // it opens fully only once the pointer settles
    const settle = Math.min(1, Math.max(0.3, 1 - lag * 2.2));
    lens += ((hot >= 0 ? settle : 0) - lens) * 0.05;
    const project = projectOf(hot);
    if (hover) hero.style.cursor = project ? 'pointer' : '';
    if (tip) {
      tip.classList.toggle('is-on', !!project);
      if (project && project.slug !== shownSlug) {
        shownSlug = project.slug;
        tip.textContent = `${project.title} · click for info`;
      }
      // the label sits at the centre of the opening (which trails the pointer slightly)
      tipX = ((mouse.x + 1) / 2) * hero.clientWidth;
      tipY = ((1 - mouse.y) / 2) * hero.clientHeight;
      tip.style.transform = `translate(${tipX + 44}px, ${tipY + 40}px)`;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(uLens, lens);
    gl.uniform3fv(uHoles, holes);
    gl.uniform2f(uRes, width, height);
    gl.uniform1f(uTime, reduced ? 0 : time);
    gl.uniform1f(uIn, state.in);
    gl.uniform1f(uOut, state.out);
    gl.uniform1f(uLight, html.dataset.theme === 'light' ? 1 : 0);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform2f(uTurn, turn.x, turn.y);
    gl.uniform2f(uOffset, 0.0, offsetY);
    gl.uniform1f(uScale, SCALE * portrait);
    gl.uniform1f(uCell, (2 * SCALE * portrait) / Math.max(map.cols, map.rows));
    // tile size: one portrait cell, in device pixels
    const sizeRef = withPortrait ? height : Math.max(height, innerHeight * dpr);
    gl.uniform1f(uSize, ((sizeRef * SCALE * portrait) / Math.max(map.cols, map.rows)) * 1.02);
    gl.drawArrays(gl.POINTS, 0, n + DUST);
  };
  gsap.ticker.add(draw);
  redraw = () => draw(gsap.ticker.time);

  const projectOfCell = (i: number) => map.projects[map.tiles[data[i * STRIDE + 3]]] ?? null;
  return {
    count: n,
    lum: (i) => data[i * STRIDE + 2],
    project: projectOfCell,
    locate(i) {
      const c = projectCell(i);
      const pitch = (canvas.clientHeight / Math.max(map.cols, map.rows)) * c.persp;
      const size = pitch * 1.02 * (0.3 + 0.74 * data[i * STRIDE + 2]);
      return { x: ((c.x + 1) / 2) * canvas.clientWidth, y: ((1 - c.y) / 2) * canvas.clientHeight, size, hole: pitch * 2 * HOLE_CELLS };
    },
    outline() {
      const out = new Float32Array(n * 2);
      const W = canvas.clientWidth, H = canvas.clientHeight;
      for (let i = 0; i < n; i++) {
        const c = projectCell(i);
        out[i * 2] = ((c.x + 1) / 2) * W;
        out[i * 2 + 1] = ((1 - c.y) / 2) * H;
      }
      return out;
    },
    bounds() {
      let l = Infinity, t = -Infinity, r = -Infinity, b = Infinity;
      for (let i = 0; i < n; i++) {
        const c = projectCell(i, 0, 0);
        l = Math.min(l, c.x);
        r = Math.max(r, c.x);
        t = Math.max(t, c.y);
        b = Math.min(b, c.y);
      }
      const W = canvas.clientWidth, H = canvas.clientHeight;
      return { left: ((l + 1) / 2) * W, right: ((r + 1) / 2) * W, top: ((1 - t) / 2) * H, bottom: ((1 - b) / 2) * H };
    },
    hide(slot, cell, amount) {
      holes[slot * 3] = data[cell * STRIDE];
      holes[slot * 3 + 1] = data[cell * STRIDE + 1];
      holes[slot * 3 + 2] = amount;
    },
    progress: () => ({ in: state.in, out: state.out }),
  };
}
