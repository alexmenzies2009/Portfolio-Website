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
}`,o=1.8;async function s({hover:s=!0}={}){let c=document.querySelector(`canvas[data-mosaic]`);if(!c)return null;let l=c.getContext(`webgl2`,{antialias:!1,alpha:!0,premultipliedAlpha:!1});if(!l)return null;let[u,d]=await Promise.all([fetch(c.dataset.map||``).then(e=>e.json()),new Promise((e,t)=>{let n=new Image;n.onload=()=>e(n),n.onerror=t,n.src=c.dataset.atlas||``})]).catch(()=>[null,null]);if(!u||!d)return null;let f=(e,t)=>{let n=l.createShader(e);return l.shaderSource(n,t),l.compileShader(n),n},p=l.createProgram();if(l.attachShader(p,f(l.VERTEX_SHADER,i)),l.attachShader(p,f(l.FRAGMENT_SHADER,a)),l.linkProgram(p),!l.getProgramParameter(p,l.LINK_STATUS))return null;l.useProgram(p);let m=u.points.length/3,h=1600,g=new Float32Array((m+h)*7),_=Math.max(u.cols,u.rows)/2,v=()=>Math.round(Math.random()*(u.atlas.count-1));for(let e=0;e<m;e++){let t=e*7;g[t]=(u.points[e*3]+.5-u.cols/2)/_,g[t+1]=-(u.points[e*3+1]+.5-u.rows/2)/_,g[t+2]=u.points[e*3+2]/255,g[t+3]=v(),g[t+4]=Math.random(),g[t+5]=Math.random()}for(let e=m;e<m+h;e++){let t=e*7;g[t]=(Math.random()-.5)*5.2,g[t+1]=(Math.random()-.5)*2.7,g[t+2]=Math.random(),g[t+3]=v(),g[t+4]=Math.random(),g[t+5]=Math.random(),g[t+6]=1}l.bindBuffer(l.ARRAY_BUFFER,l.createBuffer()),l.bufferData(l.ARRAY_BUFFER,g,l.STATIC_DRAW);let y=(e,t,n)=>{let r=l.getAttribLocation(p,e);r<0||(l.enableVertexAttribArray(r),l.vertexAttribPointer(r,t,l.FLOAT,!1,28,n))};y(`aHome`,2,0),y(`aLum`,1,8),y(`aTile`,1,12),y(`aSeed`,2,16),y(`aKind`,1,24),l.bindTexture(l.TEXTURE_2D,l.createTexture()),l.texImage2D(l.TEXTURE_2D,0,l.RGB,l.RGB,l.UNSIGNED_BYTE,d),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MIN_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_MAG_FILTER,l.LINEAR),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_S,l.CLAMP_TO_EDGE),l.texParameteri(l.TEXTURE_2D,l.TEXTURE_WRAP_T,l.CLAMP_TO_EDGE),l.enable(l.DEPTH_TEST),l.depthFunc(l.LEQUAL),l.enable(l.BLEND),l.blendFunc(l.SRC_ALPHA,l.ONE_MINUS_SRC_ALPHA),l.clearColor(0,0,0,0);let b=e=>l.getUniformLocation(p,e);l.uniform2f(b(`uGrid`),u.atlas.cols,u.atlas.rows);let x=b(`uRes`),S=b(`uTime`),C=b(`uIn`),w=b(`uOut`),T=b(`uSize`),E=b(`uLight`),D=b(`uMouse`),O=b(`uTurn`),k=b(`uLens`),A=b(`uOffset`),j=b(`uScale`),M=b(`uCell`),N=b(`uHoles`),P=new Float32Array(18);l.uniform1f(b(`uHomeCell`),1/_);let F=1,I=1,L=1,R=1,z=-.04,ee=()=>{L=Math.min(devicePixelRatio||1,1.5),F=Math.max(1,Math.round(c.clientWidth*L)),I=Math.max(1,Math.round(c.clientHeight*L)),c.width=F,c.height=I,l.viewport(0,0,F,I),R=Math.min(1,F/I*1.05),z=F/I>1.2?.17:-.04};ee(),new ResizeObserver(ee).observe(c);let B={in:+!!r,out:0},V={x:-5,y:-5,tx:-5,ty:-5},H={x:0,y:0},U=0,W=-1,G=!0;n&&!r&&addEventListener(`pointermove`,e=>{let t=c.getBoundingClientRect();V.tx=(e.clientX-t.left)/t.width*2-1,V.ty=-((e.clientY-t.top)/t.height*2-1),V.x<-2&&(V.x=V.tx,V.y=V.ty)},{passive:!0});let K=!0;new IntersectionObserver(([e])=>K=e.isIntersecting).observe(c);let q=document.documentElement,J=()=>!r&&t.to(B,{in:1,duration:3.2,ease:`power1.out`,delay:.2});if(q.classList.contains(`is-ready`))J();else{let e=new MutationObserver(()=>{q.classList.contains(`is-ready`)&&(e.disconnect(),J())});e.observe(q,{attributes:!0,attributeFilter:[`class`]})}r||e.create({trigger:c.parentElement,start:`top top`,end:`bottom 15%`,scrub:.4,onUpdate:e=>B.out=e.progress});let Y=c.parentElement,X=Y.querySelector(`[data-mosaic-tip]`),Z=.94,Q={x:0,y:0,persp:0},$=(e,t=H.x,n=H.y)=>{let r=t*.38,i=-n*.22,a=Math.cos(r),o=Math.sin(r),s=Math.cos(i),c=Math.sin(i),l=g[e*7],u=g[e*7+1],d=(g[e*7+2]-.45)*.42,f=a*l+o*d,p=-o*l+a*d,m=s*u+c*p,h=-c*u+s*p;return Q.persp=1/(2.2-h)*2.2*Z*R,Q.x=f*Q.persp/(F/I),Q.y=m*Q.persp+z,Q},te=()=>{if(G||B.in<.97||B.out>.08||V.x<-1.2)return-1;let e=F/I,t=-1,n=1.6*Z*R*2/Math.max(u.cols,u.rows);n*=n;for(let r=0;r<m;r++){let i=$(r),a=(i.x-V.x)*e,o=i.y-V.y,s=a*a+o*o;s<n&&(n=s,t=r)}return t},ne=e=>e<0?null:u.projects[u.tiles[g[e*7+3]]]??null,re=0,ie=0,ae=``;return s&&n&&!r&&(Y.addEventListener(`pointermove`,()=>G=!1),Y.addEventListener(`pointerleave`,()=>G=!0),Y.addEventListener(`click`,e=>{let t=ne(W);if(!t||e.target instanceof Element&&e.target.closest(`a, button, [data-peek]`))return;let n=Y.getBoundingClientRect();Y.dispatchEvent(new CustomEvent(`mosaic:pick`,{detail:{slug:t.slug,x:e.clientX-n.left,y:e.clientY-n.top}}))})),c.classList.add(`is-live`),t.ticker.add(e=>{if(!K||document.hidden)return;V.x+=(V.tx-V.x)*.035,V.y+=(V.ty-V.y)*.035;let t=Math.hypot((V.tx-V.x)*(F/I),V.ty-V.y),i=Math.abs(V.tx)<=1.2&&Math.abs(V.ty)<=1.2;H.x+=((i?V.tx:0)-H.x)*.04,H.y+=((i?V.ty:0)-H.y)*.04,W=s&&n&&!r?te():-1;let a=Math.min(1,Math.max(.3,1-t*2.2));U+=((W>=0?a:0)-U)*.05;let o=ne(W);s&&(Y.style.cursor=o?`pointer`:``),X&&(X.classList.toggle(`is-on`,!!o),o&&o.slug!==ae&&(ae=o.slug,X.textContent=`${o.title} · click for info`),re=(V.x+1)/2*Y.clientWidth,ie=(1-V.y)/2*Y.clientHeight,X.style.transform=`translate(${re+44}px, ${ie+40}px)`),l.clear(l.COLOR_BUFFER_BIT|l.DEPTH_BUFFER_BIT),l.uniform1f(k,U),l.uniform3fv(N,P),l.uniform2f(x,F,I),l.uniform1f(S,r?0:e),l.uniform1f(C,B.in),l.uniform1f(w,B.out),l.uniform1f(E,+(q.dataset.theme===`light`)),l.uniform2f(D,V.x,V.y),l.uniform2f(O,H.x,H.y),l.uniform2f(A,0,z),l.uniform1f(j,Z*R),l.uniform1f(M,2*Z*R/Math.max(u.cols,u.rows)),l.uniform1f(T,I*Z*R/Math.max(u.cols,u.rows)*1.02),l.drawArrays(l.POINTS,0,m+h)}),{count:m,lum:e=>g[e*7+2],project:e=>u.projects[u.tiles[g[e*7+3]]]??null,locate(e){let t=$(e),n=c.clientHeight/Math.max(u.cols,u.rows)*t.persp,r=n*1.02*(.3+.74*g[e*7+2]);return{x:(t.x+1)/2*c.clientWidth,y:(1-t.y)/2*c.clientHeight,size:r,hole:n*2*o}},outline(){let e=new Float32Array(m*2),t=c.clientWidth,n=c.clientHeight;for(let r=0;r<m;r++){let i=$(r);e[r*2]=(i.x+1)/2*t,e[r*2+1]=(1-i.y)/2*n}return e},bounds(){let e=1/0,t=-1/0,n=-1/0,r=1/0;for(let i=0;i<m;i++){let a=$(i,0,0);e=Math.min(e,a.x),n=Math.max(n,a.x),t=Math.max(t,a.y),r=Math.min(r,a.y)}let i=c.clientWidth,a=c.clientHeight;return{left:(e+1)/2*i,right:(n+1)/2*i,top:(1-t)/2*a,bottom:(1-r)/2*a}},hide(e,t,n){P[e*3]=g[t*7],P[e*3+1]=g[t*7+1],P[e*3+2]=n},progress:()=>({in:B.in,out:B.out})}}var c=6;function l(e,i){let a=document.querySelector(`[data-emerge]`),o=a?.parentElement;if(!a||!o)return;let s=o.querySelector(`[data-peek]`),l=[...o.querySelectorAll(`.hero__avail, .hero__intro, .hero__kicker, .wordmark, .hero__base`)],u=[],d=Array.from({length:c},(e,t)=>t),f=!1,p=()=>o.clientWidth<700,m=()=>4,h=()=>{let e=o.getBoundingClientRect();return{top:(document.querySelector(`.hdr`)?.getBoundingClientRect().bottom??e.top)-e.top,bottom:(o.querySelector(`.hero__word`)?.getBoundingClientRect().top??e.bottom)-e.top}},g=()=>{if(p())return 64;let{top:e,bottom:t}=h(),n=(t-e-42)/2-30;return Math.round(Math.max(84,Math.min(150,o.clientWidth*.1,n)))},_=()=>.75,v=()=>t.utils.random(3.5,5.5)*(r?1.4:1),y=()=>s&&!s.hidden||document.hidden,b=e=>{let t=o.getBoundingClientRect();return l.map(n=>{let r=n.getBoundingClientRect();return{l:r.left-t.left-e,t:r.top-t.top-e,r:r.right-t.left+e,b:r.bottom-t.top+e}})},x=[],S=``,C=0,w=(n,r)=>{let i=o.clientHeight,a=o.clientWidth,s=[a,i,n,r].join(`x`);if(s===S&&performance.now()-C<8e3)return x;let c=p()?8:14,l=p()?9:34,u=h(),d=p()?28:u.bottom-u.top<450?210:80,f=b(c),m=u.top+c,g=u.bottom-c,_=e.outline(),v=_.length/2,y=e.bounds(),w=(y.left+y.right)/2,T=[];for(let e=0;e<2500&&T.length<300;e++){let e=Math.floor(Math.random()*v)*2;if(_[e+1]<m||_[e+1]>g)continue;let o=_[e]<w?-1:1,s=(o<0?Math.PI:0)+t.utils.random(-.95,.95)*-o,u=Math.cos(s),p=Math.sin(s),h=n/2*Math.abs(u)+r/2*Math.abs(p)+t.utils.random(l,d),y=_[e]+u*h-n/2,b=_[e+1]+p*h-r/2;if(y<c||y+n>a-c||b<m||b+r>i-c||f.some(e=>y<e.r&&y+n>e.l&&b<e.b&&b+r>e.t))continue;let x=1e4;for(let e=0;e<_.length&&x>=l;e+=2){let t=Math.max(y-_[e],0,_[e]-y-n),i=Math.max(b-_[e+1],0,_[e+1]-b-r);x=Math.min(x,Math.hypot(t,i))}x>=l&&x<=d&&T.push({x:y,y:b})}return x=T,S=s,C=performance.now(),x},T=(n,r)=>{let i=p()?8:14,a=(e,t)=>e.x<t.x+t.w+i&&e.x+n+i>t.x&&e.y<t.y+t.h+i&&e.y+r+i>t.y,o=u.map(e=>({x:e.x,y:e.y,w:e.w,h:e.h})),s=w(n,r).filter(e=>!o.some(t=>a(e,t)));if(!s.length)return null;let c=e.bounds(),l=(c.left+c.right)/2,d=u.filter(e=>e.x+e.w/2<l).length,f=s.map(e=>({p:e,score:-(e.x+n/2<l?d:u.length-d)*2+Math.random()*1.5})).sort((e,t)=>t.score-e.score).map(e=>e.p),h=m()-u.length-1;return f.slice(0,30).find(e=>{for(let i=0;i<4;i++){let i=[{x:e.x,y:e.y,w:n,h:r}];for(let e of t.utils.shuffle(s.slice())){if(i.length-1>=h)break;i.some(t=>a(e,t))||i.push({x:e.x,y:e.y,w:n,h:r})}if(i.length-1>=h)return!0}return!1})??f[0]},E=(t,n,r)=>{let a=new Set(u.map(e=>e.slug)),o=u.map(t=>e.locate(t.cell)),s=b(4),c=t.x+n/2,l=t.y+r/2,d=-1,f=1/0;for(let t=0;t<160;t++){let t=Math.floor(Math.random()*e.count);if(e.lum(t)<.42)continue;let n=e.project(t);if(!n||a.has(n.slug)||!i[n.slug])continue;let r=e.locate(t);if(s.some(e=>r.x>e.l&&r.x<e.r&&r.y>e.t&&r.y<e.b)||o.some(e=>Math.hypot(r.x-e.x,r.y-e.y)<40))continue;let u=Math.hypot(r.x-c,r.y-l)+Math.random()*90;u<f&&(f=u,d=t)}return d},D=new Map,O=e=>{if(!D.has(e)){let t=k(Object.keys(i)[0],e);t.style.visibility=`hidden`,a.append(t),D.set(e,t.offsetHeight),t.remove()}return D.get(e)},k=(e,t)=>{let n=i[e],r=document.createElement(`button`);r.type=`button`,r.className=`emerge__card`,r.dataset.cursor=`Info`,r.setAttribute(`aria-label`,`${n.title}, show project details`),r.style.width=`${t}px`,r.innerHTML=`<span class="emerge__img"><img alt="" decoding="async"></span><span class="emerge__cap mono"><span class="dim"></span><span></span></span>`,r.querySelector(`img`).src=n.thumb;let[a,o]=r.querySelectorAll(`.emerge__cap > span`);return a.textContent=n.meta.slice(0,2),o.textContent=n.title,r},A=async()=>{let n=d[0];if(n===void 0)return;let i=g(),s=O(i),c=T(i,s);if(!c)return;let l=E(c,i,s);if(l<0)return;let f=e.project(l).slug,p=k(f,i);p.style.visibility=`hidden`,a.append(p);let m=e.locate(l),h=p.querySelector(`img`);if(await Promise.race([h.decode().catch(()=>{}),new Promise(e=>setTimeout(e,1200))]),y()||e.progress().out>.05)return p.remove();d.shift();let b={el:p,slug:f,cell:l,slot:n,x:c.x,y:c.y,w:i,h:s,leaving:!1};u.push(b),p.addEventListener(`click`,()=>{let e=o.getBoundingClientRect(),t=p.getBoundingClientRect();o.dispatchEvent(new CustomEvent(`mosaic:pick`,{detail:{slug:f,x:t.left-e.left+t.width/2,y:t.top-e.top+t.height/2,pad:t.width/2+18}}))});let x=p.querySelector(`.emerge__cap`),S={v:0},C=()=>e.hide(n,l,S.v);if(p.style.visibility=``,r)S.v=1,C(),t.set(p,{x:c.x,y:c.y}),t.fromTo(p,{opacity:0},{opacity:1,duration:.5});else{let e=_();t.set(p,{x:m.x-i/2,y:m.y-i/2,scale:m.hole/i,rotation:0,transformOrigin:`${i/2}px ${i/2}px`,opacity:0}),t.set(h,{filter:`brightness(0.7) saturate(0.35)`}),t.set(x,{opacity:0,y:6}),t.to(p,{opacity:1,duration:.2}),t.to(S,{v:1,duration:.5*e,ease:`power2.out`,onUpdate:C}),t.to(p,{x:c.x,y:c.y,scale:1,rotation:t.utils.random(-5,5),duration:1.5*e,delay:.12,ease:`expo.out`}),t.to(h,{filter:`brightness(1) saturate(1)`,duration:1.1*e,ease:`power2.out`}),t.to(x,{opacity:1,y:0,duration:.45,delay:.7*e,ease:`power2.out`}),b.float=t.to(p,{yPercent:t.utils.random(-4,4),rotation:`+=${t.utils.random(-2,2)}`,duration:t.utils.random(2.6,3.6),ease:`sine.inOut`,yoyo:!0,repeat:-1,delay:1.6*e})}t.delayedCall(v(),()=>j(b))},j=(i,a=!1)=>{if(i.leaving)return;if((y()||n&&i.el.matches(`:hover`)||i.el.matches(`:focus-visible`))&&!a){t.delayedCall(1.2,()=>j(i));return}i.leaving=!0,i.float?.kill();let{el:o,cell:s,slot:c,w:l}=i,f=o.querySelector(`img`),p=o.querySelector(`.emerge__cap`),m={v:1},h=()=>e.hide(c,s,m.v),g=()=>{e.hide(c,s,0),o.remove(),u.splice(u.indexOf(i),1),d.push(c)};if(r||a){t.to(o,{opacity:0,duration:a?.25:.5,onComplete:g});return}let v=_(),b={x:Number(t.getProperty(o,`x`)),y:Number(t.getProperty(o,`y`)),r:Number(t.getProperty(o,`rotation`)),yp:Number(t.getProperty(o,`yPercent`))},x={t:0};t.to(p,{opacity:0,y:6,duration:.25}),t.to(f,{filter:`brightness(0.7) saturate(0.35)`,duration:.9*v,ease:`power2.in`});let S=!1;t.to(x,{t:1,duration:1.2*v,ease:`power3.inOut`,onUpdate:()=>{let n=e.locate(s),r=x.t;t.set(o,{x:b.x+(n.x-l/2-b.x)*r,y:b.y+(n.y-l/2-b.y)*r,rotation:b.r*(1-r),yPercent:b.yp*(1-r),scale:1+(n.hole/l-1)*r}),r>.88&&!S&&(S=!0,t.to(o,{opacity:0,duration:.35*v,ease:`power1.in`}),t.to(m,{v:0,duration:.7*v,ease:`power2.inOut`,onUpdate:h,onComplete:g}))}})},M=async()=>{let{in:n,out:r}=e.progress();!f&&n>.97&&r<.05&&!y()&&u.length<m()&&(f=!0,await A(),f=!1),t.delayedCall(u.length?t.utils.random(.3,.6):.3,M)};M(),t.ticker.add(()=>{let t=e.progress().out;a.style.opacity=String(Math.max(0,1-t*3)),a.style.visibility=t>.33?`hidden`:``});let N=o.clientWidth;new ResizeObserver(()=>{if(o.clientWidth!==N){N=o.clientWidth;for(let e of[...u])j(e,!0)}}).observe(o)}var u=document.querySelector(`[data-emerge]`),d=JSON.parse(document.querySelector(`[data-peek-data]`)?.textContent||`{}`);s({hover:!u}).then(e=>e&&u&&l(e,d));var f=document.querySelector(`[data-peek]`),p=document.querySelector(`[data-peek-data]`);if(f&&p){let e=d,n=f.parentElement,i=document.documentElement,a=e=>f.querySelector(`[data-peek-${e}]`),o=()=>{f.hidden||(f.hidden=!0,i.style.removeProperty(`--accent`),i.style.removeProperty(`--on-accent`),i.classList.remove(`has-glow`))};n.addEventListener(`mosaic:pick`,o=>{let{slug:s,x:c,y:l,pad:u=40}=o.detail,d=e[s];if(!d)return;a(`img`).src=d.cover,a(`frame`).dataset.cover=s,a(`meta`).textContent=d.meta,a(`title`).textContent=d.title,a(`text`).textContent=d.text,a(`tools`).textContent=d.tools,a(`link`).href=`/work/${s}/`,f.dataset.accent=d.accent,f.hidden=!1;let p=f.offsetWidth,m=f.offsetHeight,h=c+u+p>n.clientWidth-16?c-u-p:c+u,g=Math.min(Math.max(l-m/2,80),Math.max(80,n.clientHeight-m-16));t.set(f,{x:Math.max(16,h),y:g}),d.accent&&(i.style.setProperty(`--accent`,d.accent),i.style.setProperty(`--on-accent`,`#09090a`),i.classList.add(`has-glow`)),r||t.fromTo(f,{opacity:0,scale:.94},{opacity:1,scale:1,duration:.45,ease:`expo.out`}),a(`link`).focus({preventScroll:!0})}),a(`close`).addEventListener(`click`,o),addEventListener(`keydown`,e=>e.key===`Escape`&&o()),document.addEventListener(`pointerdown`,e=>{e.target instanceof Element&&e.target.closest(`[data-peek]`)||o()}),addEventListener(`scroll`,()=>scrollY>innerHeight*.5&&o(),{passive:!0})}var m=document.querySelector(`[data-trail]`),h=m?.parentElement;if(m&&h&&n&&!r){let e=[...m.querySelectorAll(`img`)],n=0,r={x:-999,y:-999},i=1;h.addEventListener(`pointermove`,a=>{if(Math.hypot(a.clientX-r.x,a.clientY-r.y)<130)return;r={x:a.clientX,y:a.clientY};let o=h.getBoundingClientRect(),s=e[n++%e.length];t.killTweensOf(s),t.set(s,{x:a.clientX-o.left,y:a.clientY-o.top,xPercent:-50,yPercent:-50,zIndex:i++,rotate:t.utils.random(-9,9)}),t.fromTo(s,{autoAlpha:1,scale:.55},{scale:1,duration:.7,ease:`expo.out`}),t.to(s,{autoAlpha:0,scale:.85,duration:.5,ease:`power2.in`,delay:.75})})}var g=document.querySelector(`[data-hscroll]`),_=g?.querySelector(`[data-hscroll-track]`);g&&_&&t.matchMedia().add(`(min-width: 901px) and (prefers-reduced-motion: no-preference)`,()=>{let e=()=>Math.max(0,_.scrollWidth-g.clientWidth);t.to(_,{x:()=>-e(),ease:`none`,scrollTrigger:{trigger:g,start:`center center`,end:()=>`+=${e()}`,pin:!0,scrub:.6,invalidateOnRefresh:!0,anticipatePin:1,refreshPriority:1}})});var v=document.querySelector(`[data-rail-ui]`);if(v){let e=v.querySelector(`[data-rail-fill]`),n=v.querySelector(`[data-rail-now]`),r=[...document.querySelectorAll(`[data-rail]`)],i=()=>{let e=r[0]?.dataset.rail||`01`;for(let t of r)t.getBoundingClientRect().top<innerHeight*.55&&(e=t.dataset.rail||e);n&&n.textContent!==e&&(n.textContent=e)};t.fromTo(e,{scaleY:0},{scaleY:1,ease:`none`,scrollTrigger:{start:0,end:`max`,scrub:.3,onUpdate:i,onRefresh:i}})}