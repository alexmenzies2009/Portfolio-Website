// A living contour map drawn with WebGL: thin topographic lines drift slowly, and the terrain
// rises under the pointer so the lines bend around it and take the current accent colour.
// Any <canvas data-field> gets one. Colours follow the theme (--bg, --fg, --accent).
import { gsap, reduced, finePointer } from './motion';

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 r;      // canvas size in pixels
uniform float t;     // seconds
uniform vec3 m;      // pointer x, y (pixels) and strength 0..1
uniform vec3 bg, fg, ac;
out vec4 o;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 3; i++) { s += a * noise(p); p = p * 2.02 + vec2(3.1, 1.7); a *= 0.5; }
  return s;
}
void main() {
  vec2 uv = gl_FragCoord.xy / r.y;
  float d = distance(uv, m.xy / r.y);
  vec2 q = uv * 1.5 + vec2(t * 0.028, -t * 0.02);
  float h = fbm(q + fbm(q * 1.3 + t * 0.035) * 0.9) + exp(-d * d * 9.0) * m.z * 0.5;
  float v = h * 10.0;
  float f = fract(v);
  float line = 1.0 - smoothstep(0.0, fwidth(v) * 1.3, min(f, 1.0 - f));
  float near = exp(-d * d * 5.0) * m.z;
  vec3 ink = mix(fg, ac, clamp(near * 1.5, 0.0, 1.0));
  vec3 col = mix(bg, ink, line * (0.12 + near * 0.8));
  col += (ink - bg) * near * 0.045;
  o = vec4(col, 1.0);
}`;

function parseColour(value: string, fallback: [number, number, number]): [number, number, number] {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255) as [number, number, number];
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
  }
  const srgb = v.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
  if (srgb) return [Number(srgb[1]), Number(srgb[2]), Number(srgb[3])];
  return fallback;
}

export function initFields() {
  document.querySelectorAll<HTMLCanvasElement>('canvas[data-field]').forEach((canvas) => {
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    const uR = u('r'), uT = u('t'), uM = u('m'), uBg = u('bg'), uFg = u('fg'), uAc = u('ac');

    let width = 0;
    let height = 0;
    let scale = 1;
    const resize = () => {
      // the map is soft by nature, so it is drawn at no more than 1x and scaled up: cheap on any GPU
      scale = Math.min(1, 1500 / Math.max(1, canvas.clientWidth));
      width = Math.max(1, Math.round(canvas.clientWidth * scale));
      height = Math.max(1, Math.round(canvas.clientHeight * scale));
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };
    resize();
    new ResizeObserver(resize).observe(canvas);

    let visible = true;
    new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)).observe(canvas);

    const pointer = { x: 0.5, y: 0.5, on: 0 };
    const eased = { x: width / 2, y: height / 2, s: 0 };
    if (finePointer) {
      addEventListener(
        'pointermove',
        (e) => {
          const box = canvas.getBoundingClientRect();
          pointer.x = (e.clientX - box.left) / box.width;
          pointer.y = (e.clientY - box.top) / box.height;
          pointer.on = pointer.x >= 0 && pointer.x <= 1 && pointer.y >= 0 && pointer.y <= 1 ? 1 : 0;
        },
        { passive: true },
      );
    }

    let colours = { bg: [0.035, 0.035, 0.04], fg: [0.93, 0.92, 0.89], ac: [0.93, 0.92, 0.89] } as Record<string, [number, number, number]>;
    let frame = 0;
    canvas.classList.add('is-live');
    gsap.ticker.add((time) => {
      if (!visible || document.hidden) return;
      if (frame++ % 8 === 0) {
        const css = getComputedStyle(canvas);
        colours = {
          bg: parseColour(css.getPropertyValue('--bg'), colours.bg),
          fg: parseColour(css.getPropertyValue('--fg'), colours.fg),
          ac: parseColour(css.getPropertyValue('--accent'), colours.ac),
        };
      }
      const t = reduced ? 20 : time;
      // without a mouse, a slow wanderer keeps the map alive
      const tx = finePointer ? pointer.x : 0.5 + 0.32 * Math.sin(time * 0.31);
      const ty = finePointer ? pointer.y : 0.5 + 0.28 * Math.cos(time * 0.23);
      const target = reduced ? 0 : finePointer ? pointer.on : 0.7;
      eased.x += (tx * width - eased.x) * 0.07;
      eased.y += ((1 - ty) * height - eased.y) * 0.07;
      eased.s += (target - eased.s) * 0.05;
      gl.uniform2f(uR, width, height);
      gl.uniform1f(uT, t);
      gl.uniform3f(uM, eased.x, eased.y, eased.s);
      gl.uniform3fv(uBg, colours.bg);
      gl.uniform3fv(uFg, colours.fg);
      gl.uniform3fv(uAc, colours.ac);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
  });
}
