import{d as e,f as t,t as n,u as r}from"./motion.Cv43hXFo.js";var i=`#version 300 es
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
  gl_Position = vec4(clip, mix(0.5 - pick * 0.45, 0.9, dust), 1.0);
  gl_PointSize = uSize * persp * 2.2 * mix(mix(base, GROWN, pick), 0.28 + aSeed.x * 0.85, dust);
  // what stays behind dims a little so the lifted tiles stand out
  float behind = 1.0 - 0.55 * exp(-(r * r) / 0.12) * on * (1.0 - pick);
  float big = pick;
  float twinkle = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed.y * 1.5) + aSeed.x * 30.0);
  vTile = aTile;
  vShade = mix(0.12 + 1.15 * aLum * aLum, 0.95, uLight) * behind;
  vAlpha = arrive * (1.0 - smoothstep(0.75, 1.0, uOut)) * mix(1.0, edge * (0.3 + 0.7 * twinkle), dust);
  vLens = big;
  vKind = dust;
  vSeed = aSeed.y;
  vSpeck = mix(vec3(0.93, 0.92, 0.89), vec3(0.05, 0.05, 0.06), uLight);
}`,a=`#version 300 es
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
}`;async function o(){let o=document.querySelector(`canvas[data-mosaic]`);if(!o)return;let s=o.getContext(`webgl2`,{antialias:!1,alpha:!0,premultipliedAlpha:!1});if(!s)return;let[c,l]=await Promise.all([fetch(o.dataset.map||``).then(e=>e.json()),new Promise((e,t)=>{let n=new Image;n.onload=()=>e(n),n.onerror=t,n.src=o.dataset.atlas||``})]).catch(()=>[null,null]);if(!c||!l)return;let u=(e,t)=>{let n=s.createShader(e);return s.shaderSource(n,t),s.compileShader(n),n},d=s.createProgram();if(s.attachShader(d,u(s.VERTEX_SHADER,i)),s.attachShader(d,u(s.FRAGMENT_SHADER,a)),s.linkProgram(d),!s.getProgramParameter(d,s.LINK_STATUS))return;s.useProgram(d);let f=c.points.length/3,p=1600,m=new Float32Array((f+p)*7),h=Math.max(c.cols,c.rows)/2,g=()=>Math.round(Math.random()*(c.atlas.count-1));for(let e=0;e<f;e++){let t=e*7;m[t]=(c.points[e*3]+.5-c.cols/2)/h,m[t+1]=-(c.points[e*3+1]+.5-c.rows/2)/h,m[t+2]=c.points[e*3+2]/255,m[t+3]=g(),m[t+4]=Math.random(),m[t+5]=Math.random()}for(let e=f;e<f+p;e++){let t=e*7;m[t]=(Math.random()-.5)*5.2,m[t+1]=(Math.random()-.5)*2.7,m[t+2]=Math.random(),m[t+3]=g(),m[t+4]=Math.random(),m[t+5]=Math.random(),m[t+6]=1}s.bindBuffer(s.ARRAY_BUFFER,s.createBuffer()),s.bufferData(s.ARRAY_BUFFER,m,s.STATIC_DRAW);let _=(e,t,n)=>{let r=s.getAttribLocation(d,e);r<0||(s.enableVertexAttribArray(r),s.vertexAttribPointer(r,t,s.FLOAT,!1,28,n))};_(`aHome`,2,0),_(`aLum`,1,8),_(`aTile`,1,12),_(`aSeed`,2,16),_(`aKind`,1,24),s.bindTexture(s.TEXTURE_2D,s.createTexture()),s.texImage2D(s.TEXTURE_2D,0,s.RGB,s.RGB,s.UNSIGNED_BYTE,l),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),s.enable(s.DEPTH_TEST),s.depthFunc(s.LEQUAL),s.enable(s.BLEND),s.blendFunc(s.SRC_ALPHA,s.ONE_MINUS_SRC_ALPHA),s.clearColor(0,0,0,0);let v=e=>s.getUniformLocation(d,e);s.uniform2f(v(`uGrid`),c.atlas.cols,c.atlas.rows);let y=v(`uRes`),b=v(`uTime`),x=v(`uIn`),S=v(`uOut`),C=v(`uSize`),w=v(`uLight`),T=v(`uMouse`),E=v(`uTurn`),D=v(`uLens`),O=v(`uOffset`),k=v(`uScale`),A=v(`uCell`),j=1,M=1,N=1,P=1,F=-.04,I=()=>{N=Math.min(devicePixelRatio||1,1.5),j=Math.max(1,Math.round(o.clientWidth*N)),M=Math.max(1,Math.round(o.clientHeight*N)),o.width=j,o.height=M,s.viewport(0,0,j,M),P=Math.min(1,j/M*1.05),F=j/M>1.2?.17:-.04};I(),new ResizeObserver(I).observe(o);let L={in:+!!r,out:0},R={x:-5,y:-5,tx:-5,ty:-5},z={x:0,y:0},B=0,V=-1,H=!0;n&&!r&&addEventListener(`pointermove`,e=>{let t=o.getBoundingClientRect();R.tx=(e.clientX-t.left)/t.width*2-1,R.ty=-((e.clientY-t.top)/t.height*2-1),R.x<-2&&(R.x=R.tx,R.y=R.ty)},{passive:!0});let U=!0;new IntersectionObserver(([e])=>U=e.isIntersecting).observe(o);let W=document.documentElement,G=()=>!r&&t.to(L,{in:1,duration:3.2,ease:`power1.out`,delay:.2});if(W.classList.contains(`is-ready`))G();else{let e=new MutationObserver(()=>{W.classList.contains(`is-ready`)&&(e.disconnect(),G())});e.observe(W,{attributes:!0,attributeFilter:[`class`]})}r||e.create({trigger:o.parentElement,start:`top top`,end:`bottom 15%`,scrub:.4,onUpdate:e=>L.out=e.progress});let K=o.parentElement,q=K.querySelector(`[data-mosaic-tip]`),J=.94,Y=()=>{if(H||L.in<.97||L.out>.08||R.x<-1.2)return-1;let e=J*P,t=z.x*.38,n=-z.y*.22,r=Math.cos(t),i=Math.sin(t),a=Math.cos(n),o=Math.sin(n),s=j/M,l=-1,u=1.6*e*2/Math.max(c.cols,c.rows);u*=u;for(let t=0;t<f;t++){let n=m[t*7],c=m[t*7+1],d=(m[t*7+2]-.45)*.42,f=r*n+i*d,p=-i*n+r*d,h=a*c+o*p,g=1/(2.2-(-o*c+a*p))*2.2*e,_=(f*g/s-R.x)*s,v=h*g+F-R.y,y=_*_+v*v;y<u&&(u=y,l=t)}return l},X=e=>e<0?null:c.projects[c.tiles[m[e*7+3]]]??null,Z=0,Q=0,$=``;n&&!r&&(K.addEventListener(`pointermove`,()=>H=!1),K.addEventListener(`pointerleave`,()=>H=!0),K.addEventListener(`click`,e=>{let t=X(V);if(!t||e.target instanceof Element&&e.target.closest(`a, button, [data-peek]`))return;let n=K.getBoundingClientRect();K.dispatchEvent(new CustomEvent(`mosaic:pick`,{detail:{slug:t.slug,x:e.clientX-n.left,y:e.clientY-n.top}}))})),o.classList.add(`is-live`),t.ticker.add(e=>{if(!U||document.hidden)return;R.x+=(R.tx-R.x)*.035,R.y+=(R.ty-R.y)*.035;let t=Math.hypot((R.tx-R.x)*(j/M),R.ty-R.y),i=Math.abs(R.tx)<=1.2&&Math.abs(R.ty)<=1.2;z.x+=((i?R.tx:0)-z.x)*.04,z.y+=((i?R.ty:0)-z.y)*.04,V=n&&!r?Y():-1;let a=Math.min(1,Math.max(.3,1-t*2.2));B+=((V>=0?a:0)-B)*.05;let o=X(V);K.style.cursor=o?`pointer`:``,q&&(q.classList.toggle(`is-on`,!!o),o&&o.slug!==$&&($=o.slug,q.textContent=`${o.title} · click for info`),Z=(R.x+1)/2*K.clientWidth,Q=(1-R.y)/2*K.clientHeight,q.style.transform=`translate(${Z+44}px, ${Q+40}px)`),s.clear(s.COLOR_BUFFER_BIT|s.DEPTH_BUFFER_BIT),s.uniform1f(D,B),s.uniform2f(y,j,M),s.uniform1f(b,r?0:e),s.uniform1f(x,L.in),s.uniform1f(S,L.out),s.uniform1f(w,+(W.dataset.theme===`light`)),s.uniform2f(T,R.x,R.y),s.uniform2f(E,z.x,z.y),s.uniform2f(O,0,F),s.uniform1f(k,J*P),s.uniform1f(A,2*J*P/Math.max(c.cols,c.rows)),s.uniform1f(C,M*J*P/Math.max(c.cols,c.rows)*1.02),s.drawArrays(s.POINTS,0,f+p)})}o();var s=document.querySelector(`[data-peek]`),c=document.querySelector(`[data-peek-data]`);if(s&&c){let e=JSON.parse(c.textContent||`{}`),n=s.parentElement,i=document.documentElement,a=e=>s.querySelector(`[data-peek-${e}]`),o=()=>{s.hidden||(s.hidden=!0,i.style.removeProperty(`--accent`),i.style.removeProperty(`--on-accent`),i.classList.remove(`has-glow`))};n.addEventListener(`mosaic:pick`,o=>{let{slug:c,x:l,y:u}=o.detail,d=e[c];if(!d)return;a(`img`).src=d.cover,a(`frame`).dataset.cover=c,a(`meta`).textContent=d.meta,a(`title`).textContent=d.title,a(`text`).textContent=d.text,a(`tools`).textContent=d.tools,a(`link`).href=`/work/${c}/`,s.dataset.accent=d.accent,s.hidden=!1;let f=s.offsetWidth,p=s.offsetHeight,m=l+40+f>n.clientWidth-16?l-40-f:l+40,h=Math.min(Math.max(u-p/2,80),Math.max(80,n.clientHeight-p-16));t.set(s,{x:Math.max(16,m),y:h}),d.accent&&(i.style.setProperty(`--accent`,d.accent),i.style.setProperty(`--on-accent`,`#09090a`),i.classList.add(`has-glow`)),r||t.fromTo(s,{opacity:0,scale:.94},{opacity:1,scale:1,duration:.45,ease:`expo.out`}),a(`link`).focus({preventScroll:!0})}),a(`close`).addEventListener(`click`,o),addEventListener(`keydown`,e=>e.key===`Escape`&&o()),document.addEventListener(`pointerdown`,e=>{e.target instanceof Element&&e.target.closest(`[data-peek]`)||o()}),addEventListener(`scroll`,()=>scrollY>innerHeight*.5&&o(),{passive:!0})}var l=document.querySelector(`[data-trail]`),u=l?.parentElement;if(l&&u&&n&&!r){let e=[...l.querySelectorAll(`img`)],n=0,r={x:-999,y:-999},i=1;u.addEventListener(`pointermove`,a=>{if(Math.hypot(a.clientX-r.x,a.clientY-r.y)<130)return;r={x:a.clientX,y:a.clientY};let o=u.getBoundingClientRect(),s=e[n++%e.length];t.killTweensOf(s),t.set(s,{x:a.clientX-o.left,y:a.clientY-o.top,xPercent:-50,yPercent:-50,zIndex:i++,rotate:t.utils.random(-9,9)}),t.fromTo(s,{autoAlpha:1,scale:.55},{scale:1,duration:.7,ease:`expo.out`}),t.to(s,{autoAlpha:0,scale:.85,duration:.5,ease:`power2.in`,delay:.75})})}var d=document.querySelector(`[data-hscroll]`),f=d?.querySelector(`[data-hscroll-track]`);d&&f&&t.matchMedia().add(`(min-width: 901px) and (prefers-reduced-motion: no-preference)`,()=>{let e=()=>Math.max(0,f.scrollWidth-d.clientWidth);t.to(f,{x:()=>-e(),ease:`none`,scrollTrigger:{trigger:d,start:`center center`,end:()=>`+=${e()}`,pin:!0,scrub:.6,invalidateOnRefresh:!0,anticipatePin:1,refreshPriority:1}})});var p=document.querySelector(`[data-rail-ui]`);if(p){let e=p.querySelector(`[data-rail-fill]`),n=p.querySelector(`[data-rail-now]`),r=[...document.querySelectorAll(`[data-rail]`)],i=()=>{let e=r[0]?.dataset.rail||`01`;for(let t of r)t.getBoundingClientRect().top<innerHeight*.55&&(e=t.dataset.rail||e);n&&n.textContent!==e&&(n.textContent=e)};t.fromTo(e,{scaleY:0},{scaleY:1,ease:`none`,scrollTrigger:{start:0,end:`max`,scrub:.3,onUpdate:i,onRefresh:i}})}