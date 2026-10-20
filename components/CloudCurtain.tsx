'use client';
import { useEffect, useRef } from 'react';
import { subscribe, type Frame } from '../lib/scrollDriver';
import { DESKTOP, podRight, titleBox } from '../lib/tourLayout';
import styles from './CloudCurtain.module.css';

/*
 * Cumulus clouds drawn by a WebGL2 fragment shader (no images, no libraries): inverted cellular
 * (Worley) noise over four octaves gives round cotton-like puffs; each puff is shaded by the normal
 * of the density field with light from above (white tops, blue-grey bases).
 *
 * Uniforms, all derived from the scroll state:
 *  - coverage (0..1): 1 = clouds cover the whole viewport, 0 = fully open. The threshold varies in
 *    space, so the clouds open from the centre outwards and close back the same way: continuous and
 *    reversible, nothing pops.
 *  - bank: a static cloud bank behind the reading text (left column on desktop, bottom band on
 *    mobile). It never moves and never opens.
 *  - smoke (0..1): the same clouds turned into dark smoke with sparse embers and ash (epilogue).
 *  - drift: scroll-driven offset for embers and ash; nothing moves with time.
 * The canvas renders at reduced resolution and redraws only when a uniform changes.
 * Without WebGL2 a CSS gradient stands in (styles.fallback).
 */

const VERT = `#version 300 es
in vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uView;      // viewport in CSS px
uniform float uRatio;    // canvas px per CSS px
uniform float uCov;
uniform vec3 uBank;      // mode (0 none, 1 left column, 2 bottom band), edge in CSS px, strength 0..1
uniform vec2 uCenter;    // opening centre in CSS px
uniform float uSmoke;
uniform float uDrift;
uniform vec4 uGlow;      // sunlit patch behind the cover title: centre xy, radii zw (CSS px); 0 radius = none
uniform vec3 uColumn;    // flat bright column behind the epilogue: centre x, half width, strength
uniform float uZoom;     // fly-through: the curtain's clouds grow from the opening centre (1 = none)
uniform float uAsh;      // first hint of the fire on the white clouds: falling ash and a few embers
out vec4 outColor;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float billow(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * (1.0 - abs(2.0 * noise(p) - 1.0)); p = p * 2.03 + 11.7; a *= 0.5; }
  return s;
}
vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
// smooth F1 cellular distance: a soft minimum, so the shading has no creases at cell borders
float worley(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float acc = 0.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 r = g + 0.15 + 0.7 * hash2(i + g) - f;
    acc += exp(-9.0 * dot(r, r));
  }
  return sqrt(max(0.0, -log(acc) / 9.0));
}
// cumulus puffs: inverted cellular noise over three octaves (big soft lumps, few wrinkles)
float density(vec2 q) {
  vec2 p = q / 300.0;
  float s = 0.0, a = 0.56;
  for (int k = 0; k < 3; k++) {
    float w = worley(p);
    s += a * (1.0 - smoothstep(0.0, 0.95, w));
    p = p * 2.13 + vec2(5.2, 1.3);
    a *= 0.45;
  }
  // low-frequency masses so the puffs merge into larger clouds
  float mass = noise(q / 520.0 + 2.0) * 0.6 + noise(q / 260.0 + 7.0) * 0.4;
  return smoothstep(0.1, 0.9, 0.72 * s + 0.38 * mass);
}

// light from above: shade a puff by the normal of the density field at p (e = sample step)
float lightAt(vec2 p, float d, float e, float depth) {
  float dx = density(p + vec2(e, 0.0)) - d;
  float dy = density(p + vec2(0.0, e)) - d;
  vec3 n = normalize(vec3(-dx * 6.0, -dy * 6.0, 1.0));
  vec3 L = normalize(vec3(-0.25, -0.8, 0.55)); // up-left (screen y grows downwards)
  return clamp(dot(n, L) * 0.85 + 0.2 + 0.25 * d + 0.15 * depth, 0.0, 1.0);
}

void main() {
  vec2 q = vec2(gl_FragCoord.x, uView.y * uRatio - gl_FragCoord.y) / uRatio; // CSS px, y down
  // the curtain is sampled zoomed in around the opening centre: as it opens the camera flies through
  vec2 qz = uCenter + (q - uCenter) / uZoom;
  float dz = density(qz);
  float d0 = density(q); // the bank never zooms: it is static

  // curtain: radial distance from the opening centre, broken up by the cloud density
  vec2 rel = (q - uCenter) / (0.62 * uView);
  float g = min(length(rel), 1.0); // corners open with the outer ring: nothing lingers at 0
  float F = 0.85 * g + 0.95 * (dz - 0.5);
  // threshold grows a little faster than the opening, so the open area grows at an even pace
  float R = mix(-0.62, 1.25, pow(1.0 - uCov, 0.75));
  // a soft fringe, then a firmer edge: puffs read crisp without popping
  float a = smoothstep(0.08, 0.92, smoothstep(R, R + 0.26, F));
  float curtain = a;
  float depth = smoothstep(R, R + 0.6, F);
  float light = lightAt(qz, dz, 12.0 / uZoom, depth);
  float d = dz;

  // static bank behind the text
  float inside = -1e4;
  if (uBank.x > 0.5) {
    float along = uBank.x < 1.5 ? q.y : q.x;
    float across = uBank.x < 1.5 ? uBank.y - q.x : q.y - uBank.y;
    float wobble = (billow(vec2(along / 140.0, 3.7)) - 0.75) * 55.0;
    inside = across + wobble + (d0 - 0.5) * 80.0; // puffy edge: within about +-60 px of uBank.y
    float b = smoothstep(-12.0, 12.0, inside) * uBank.z;
    if (b > a) {
      a = b;
      d = d0;
      light = lightAt(q, d0, 12.0, max(depth, smoothstep(0.0, 220.0, inside)));
    }
  }

  vec3 shadowC = vec3(0.5, 0.57, 0.68);
  vec3 litC = vec3(1.0, 0.995, 0.985);
  vec3 col = mix(shadowC, litC, light);
  // calm, bright interior under the text (contrast for dark type)
  // flat bright interior under the text (contrast for dark type), shaded puffs only along the edge
  float calm = smoothstep(0.0, 34.0, inside) * (1.0 - curtain);
  col = mix(col, vec3(0.972, 0.975, 0.978), calm);

  // sunlit patch behind the cover title: the clouds there stay bright, so the text keeps its contrast
  if (uGlow.z > 0.0) {
    float gl = 1.0 - smoothstep(0.75, 1.0, length((q - uGlow.xy) / uGlow.zw));
    col = mix(col, vec3(0.985, 0.985, 0.98), gl * a);
  }

  // flat bright column behind the epilogue text once the clouds have closed (puffy edges stay at the sides)
  float cm = 0.0;
  if (uColumn.z > 0.0) {
    cm = 1.0 - smoothstep(uColumn.y - 60.0, uColumn.y + 30.0, abs(q.x - uColumn.x) + (d - 0.5) * 60.0);
    col = mix(col, vec3(0.972, 0.975, 0.978), cm * uColumn.z);
  }

  // first hint of the fire: grey ash falling on the white clouds and a few embers, with the scroll
  if (uAsh > 0.0) {
    vec2 aq = q + vec2(uDrift * 0.06, uDrift * 0.45);
    vec2 acell = floor(aq / 26.0);
    float ah = hash(acell + 41.0);
    vec2 ac = (acell + 0.25 + 0.5 * vec2(hash(acell + 6.1), hash(acell + 1.7))) * 26.0;
    float fleck = ah < 0.09 ? smoothstep(2.2, 0.6, length(aq - ac)) : 0.0;
    float spark = ah > 0.995 ? smoothstep(3.0, 0.5, length(aq - ac)) : 0.0;
    float k = uAsh * (1.0 - cm * uColumn.z); // never over the epilogue text
    col = mix(col, vec3(0.32, 0.31, 0.3), fleck * 0.7 * k);
    col = mix(col, vec3(1.0, 0.42, 0.14), spark * k);
  }

  // smoke palette
  if (uSmoke > 0.0) {
    vec3 sDark = vec3(0.045, 0.047, 0.055);
    vec3 sLit = vec3(0.22, 0.225, 0.24);
    vec3 smoke = mix(sDark, sLit, light * 0.85);
    smoke = mix(smoke, vec3(0.06, 0.062, 0.07), calm * 0.8);
    // embers: sparse, rising with the scroll
    vec2 eq = q + vec2(0.0, uDrift * 0.35);
    vec2 cell = floor(eq / 34.0);
    float h = hash(cell);
    vec2 c = (cell + 0.2 + 0.6 * vec2(hash(cell + 3.1), hash(cell + 7.7))) * 34.0;
    float r = length(eq - c);
    float ember = h < 0.035 ? smoothstep(3.2, 0.6, r) : 0.0;
    float glow = h < 0.035 ? smoothstep(14.0, 0.0, r) * 0.35 : 0.0;
    // ash: small grey flecks drifting faster
    vec2 aq = q + vec2(uDrift * 0.08, uDrift * 0.6);
    vec2 acell = floor(aq / 22.0);
    float ah = hash(acell + 19.0);
    vec2 ac = (acell + 0.25 + 0.5 * vec2(hash(acell + 5.3), hash(acell + 2.9))) * 22.0;
    float ash = ah < 0.06 ? smoothstep(1.6, 0.4, length(aq - ac)) * 0.55 : 0.0;
    smoke += vec3(1.0, 0.24, 0.08) * glow + vec3(1.0, 0.36, 0.12) * ember + vec3(0.62) * ash;
    col = mix(col, smoke, uSmoke);
    a = mix(a, 1.0, uSmoke);
  }
  outColor = vec4(col * a, a);
}`;

/** Curtain coverage for a scroll state: closes again over the epilogue. */
export const coverageOf = (open: number, close: number) => (close > 0 ? close : 1 - open);

export default function CloudCurtain() {
  const cv = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = cv.current!;
    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false });
    if (!gl) {
      // no WebGL2: a plain cloud-coloured veil that follows the same coverage
      wrap.current!.classList.add(styles.fallback);
      return subscribe(({ st }) => {
        const c = coverageOf(st.open, st.close);
        wrap.current!.style.opacity = String(Math.max(c, st.smoke));
        wrap.current!.dataset.smoke = st.smoke > 0.5 ? '1' : '0';
        canvas.dataset.coverage = c.toFixed(4);
        return false;
      });
    }

    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { view: U('uView'), ratio: U('uRatio'), cov: U('uCov'), bank: U('uBank'), center: U('uCenter'), smoke: U('uSmoke'), drift: U('uDrift'), glow: U('uGlow'), column: U('uColumn'), zoom: U('uZoom'), ash: U('uAsh') };

    let w = 0, h = 0, ratio = 0.5, lastKey = '';
    const onFrame = (f: Frame) => {
      if (f.vw !== w || f.vh !== h) {
        w = f.vw; h = f.vh;
        ratio = Math.min(window.devicePixelRatio || 1, 2) * (w < DESKTOP ? 0.4 : 0.5);
        canvas.width = Math.round(w * ratio);
        canvas.height = Math.round(h * ratio);
        gl.viewport(0, 0, canvas.width, canvas.height);
        lastKey = '';
      }
      const { st } = f;
      const cov = coverageOf(st.open, st.close);
      const mobile = w < DESKTOP;
      const key = [cov.toFixed(4), st.bank.toFixed(3), st.smoke.toFixed(4), Math.round(st.drift), st.title.toFixed(3), st.titleDock.toFixed(4), st.close.toFixed(4), st.ash.toFixed(3)].join('|');
      if (key === lastKey) return false;
      lastKey = key;
      canvas.dataset.coverage = cov.toFixed(4);
      // in front while the curtain covers something or turns to smoke; otherwise only the bank shows, behind the text
      wrap.current!.dataset.front = cov > 0.001 || st.smoke > 0 ? '1' : '0';
      gl.uniform2f(u.view, w, h);
      gl.uniform1f(u.ratio, ratio);
      gl.uniform1f(u.cov, cov);
      gl.uniform3f(u.bank, mobile ? 2 : 1, mobile ? h * 0.44 + 24 : podRight(w) + 70, st.bank);
      gl.uniform2f(u.center, mobile ? w / 2 : (podRight(w) + w) / 2, mobile ? h * 0.25 : h / 2);
      gl.uniform1f(u.smoke, st.smoke);
      gl.uniform1f(u.drift, st.drift);
      // fly-through: the closed curtain is seen from afar; as it opens it grows past the camera
      gl.uniform1f(u.zoom, f.reduced ? 1 : 1 + 0.7 * Math.pow(1 - cov, 2));
      gl.uniform1f(u.ash, st.ash);
      if (st.title > 0) {
        const d = st.titleDock * st.titleDock * (3 - 2 * st.titleDock);
        const b = titleBox(w, h, d);
        const tw = b.width * b.scale;
        gl.uniform4f(u.glow, b.x + tw / 2, b.y + b.height / 2, tw * 0.78, b.height * 1.1);
      } else gl.uniform4f(u.glow, 0, 0, 0, 0);
      gl.uniform3f(u.column, w / 2, mobile ? w / 2 + 40 : Math.min(420, w / 2), st.close);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return false;
    };
    return subscribe(onFrame);
  }, []);

  return (
    <div ref={wrap} className={styles.curtain} aria-hidden="true">
      <canvas ref={cv} className={styles.canvas} data-tour-canvas="clouds" />
    </div>
  );
}
