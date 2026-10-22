'use client';
import { useEffect, useRef } from 'react';
import { AIR_STORY } from '../lib/airScene';
import { cineState } from '../lib/cine';
import { TOUR_EVENTS } from '../lib/tour';
import { subscribe } from '../lib/scrollDriver';
import styles from './TourMap.module.css';

/*
 * The cinematic opening of Chubut (lib/cine.ts): an illustrated Andean forest on fire, drawn by one
 * fragment shader. Side view, three planes with parallax (mountains, burning forest, foreground
 * trees), turbulent flames, smoke lit from below by the fire, rising embers and a heat shimmer. The
 * scroll moves the camera in, raises the fire to its peak, lifts the camera above the smoke and opens
 * the smoke in holes onto the map. The time only animates the flicker and the drift (frozen under
 * reduced motion and in the visual tests).
 *
 * The WebGL context exists only while the scene is near: it is created when the Chubut story starts
 * and released when the reader leaves it, so the page never holds two shaders it does not need.
 * Rendered at a reduced internal resolution (fire and smoke are soft), lower on small screens.
 */
const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uPush;
uniform float uHeat;
uniform float uRise;
uniform float uReveal;
uniform float uEnter;
out vec4 o;

float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return s;
}
// a line of conifers (cypress, lenga): repeating cells, each tree with its own height and lean,
// a narrow cone with a ragged edge of branches and a trunk at the foot; 1 inside a tree or below base
float trees(vec2 p, float scale, float base, float hgt, float seed) {
  if (p.y < base) return 1.0;
  float x = p.x * scale;
  float c = floor(x), f = fract(x) - 0.5;
  float r = h21(vec2(c, seed));
  if (r < 0.12) return 0.0;
  float h = hgt * (0.5 + 0.7 * r);
  float y = (p.y - base) / h;
  if (y > 1.0) return 0.0;
  float crown = 0.36 * pow(1.0 - y, 1.1) * (0.7 + 0.55 * noise(vec2(y * 22.0, c * 5.3 + seed)));
  float w = y < 0.1 ? 0.045 : crown;
  return step(abs(f + 0.1 * y * (r - 0.5)), w);
}

vec3 fireRamp(float t) {
  vec3 c = mix(vec3(0.0), vec3(0.55, 0.07, 0.02), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.0, 0.36, 0.06), smoothstep(0.3, 0.6, t));
  c = mix(c, vec3(1.0, 0.78, 0.36), smoothstep(0.55, 0.85, t));
  return mix(c, vec3(1.0, 0.97, 0.86), smoothstep(0.85, 1.0, t));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;   // aspect-correct, y up
  float t = uTime;
  float zoom = 1.0 + 0.55 * uPush;
  // each plane moves by its depth: the near trees fly past, the mountains barely move; the camera
  // rising makes the ground sink, more for the near planes
  vec2 far = p / (1.0 + (zoom - 1.0) * 0.25) + vec2(0.0, 0.18 * uRise);
  vec2 mid = p / (1.0 + (zoom - 1.0) * 0.7) + vec2(0.0, 0.45 * uRise);
  vec2 near = p / zoom + vec2(0.0, 0.9 * uRise);

  float fireLine = -0.04; // where the burning forest stands (mid plane)
  float heat = uHeat;

  // heat shimmer above the fire
  float shimmer = (noise(mid * vec2(18.0, 10.0) + vec2(0.0, -t * 3.0)) - 0.5) * 0.006 * heat * smoothstep(0.5, -0.05, mid.y - fireLine);
  far.x += shimmer;

  // sky: smoke-dark above, an orange glow toward the fire
  float glow = exp(-max(0.0, far.y - fireLine) * 3.2) * heat;
  vec3 col = mix(vec3(0.045, 0.034, 0.03), vec3(0.42, 0.14, 0.05), glow);

  // the Andes behind, lit along their ridges by the fire
  float ridge = -0.02 + 0.2 * fbm(vec2(far.x * 1.3, 3.0)) + 0.06 * sin(far.x * 2.2);
  float mount = smoothstep(0.004, -0.004, far.y - ridge);
  vec3 mcol = mix(vec3(0.07, 0.06, 0.07), vec3(0.32, 0.12, 0.05), glow * 0.7);
  mcol += vec3(0.5, 0.18, 0.05) * smoothstep(0.03, 0.0, ridge - far.y) * heat * 0.35;
  col = mix(col, mcol, mount);

  // the far row of the forest, backlit, behind the flames
  float tb = trees(mid + vec2(0.13, 0.0), 16.0, fireLine + 0.005, 0.12, 3.0);
  col = mix(col, vec3(0.06, 0.025, 0.015) + vec3(0.5, 0.15, 0.03) * heat * 0.35, tb * 0.9);

  // flames: turbulent tongues rising from the forest line, taller with the heat
  vec2 fq = vec2(mid.x * 3.2, (mid.y - fireLine) * 2.4);
  float warp = fbm(fq * 1.4 + vec2(0.0, -t * 1.1));
  float f = fbm(vec2(fq.x + warp * 0.6, fq.y - t * 1.7));
  float height = 0.12 + 0.42 * heat;
  float flame = clamp(f * 1.75 - (mid.y - fireLine) / height - 0.25, 0.0, 1.0);
  flame *= smoothstep(-0.06, 0.02, mid.y - fireLine);
  col += fireRamp(flame) * 1.15 * flame;

  // smoke: billows rising and drifting east, dark above, lit orange from below
  vec2 sq = vec2(mid.x * 1.4 - t * 0.03, (mid.y - fireLine) * 1.2 - t * 0.12);
  float s = fbm(sq + 1.4 * fbm(sq * 1.6 + vec2(t * 0.05, 0.0)));
  float rise = smoothstep(fireLine + 0.02, fireLine + 0.5, mid.y);
  float dens = smoothstep(0.42, 0.85, s) * (0.35 + 0.65 * heat) * (0.25 + 0.75 * rise);
  dens = max(dens, smoothstep(0.35, 0.8, s) * uRise * 0.9);   // above the smoke when the camera climbs
  float under = exp(-max(0.0, mid.y - fireLine) * 2.6) * heat;
  vec3 scol = mix(vec3(0.11, 0.09, 0.085), vec3(0.95, 0.38, 0.11), under * 0.8);
  scol = mix(scol, vec3(0.34, 0.31, 0.3), smoothstep(0.5, 1.0, s) * (1.0 - under));
  col = mix(col, scol, clamp(dens, 0.0, 0.92));

  // the near row of the forest: dark silhouettes in front of the flames, with an orange rim
  float tm = trees(mid, 9.0, fireLine - 0.03, 0.22, 1.0);
  vec3 tcol = vec3(0.025, 0.018, 0.015) + vec3(0.6, 0.18, 0.04) * heat * smoothstep(0.3, 0.0, mid.y - fireLine) * 0.4;
  col = mix(col, tcol, tm * (1.0 - 0.55 * flame));

  // the slope in front: burnt ground with embers and a fire line creeping toward the camera
  float slope = fireLine - 0.05 - 0.22 * smoothstep(-0.9, 0.9, -mid.x) - 0.04 * fbm(vec2(mid.x * 3.0, 2.0));
  if (mid.y < slope) {
    float depth = clamp((slope - mid.y) / 0.5, 0.0, 1.0);
    vec3 gcol = mix(vec3(0.09, 0.05, 0.035), vec3(0.03, 0.022, 0.02), depth);
    gcol += vec3(0.55, 0.16, 0.04) * heat * exp(-depth * 4.0) * 0.8;       // fire light on the slope
    float em = smoothstep(0.6, 0.8, fbm(mid * vec2(10.0, 18.0) + vec2(0.0, t * 0.15)));
    gcol += vec3(1.0, 0.36, 0.07) * em * heat * 1.4 * (0.4 + 0.6 * noise(mid * 30.0 + t * 2.0)) * (1.0 - depth * 0.5);
    col = gcol;
    // a creeping ground fire: low flames along a ragged line on the slope
    float gl = slope - 0.09 - 0.05 * fbm(vec2(mid.x * 4.0, 5.0));
    float gf = clamp(fbm(vec2(mid.x * 9.0, (mid.y - gl) * 6.0 - t * 2.2)) * 1.6 - (mid.y - gl) / (0.04 + 0.06 * heat) - 0.3, 0.0, 1.0);
    gf *= smoothstep(-0.02, 0.01, mid.y - gl) * step(-0.3, mid.x) * heat;
    col += fireRamp(gf) * gf;
  }

  // foreground: grass blades against the fire light, passing as the camera pushes in
  float gy = -0.38 + 0.03 * sin(near.x * 2.0);
  float blades = noise(vec2(near.x * 140.0, 0.0)) * 0.07 + noise(vec2(near.x * 37.0, 1.0)) * 0.05;
  float grass = step(near.y, gy + blades);
  col = mix(col, vec3(0.012, 0.01, 0.009), grass);
  col += vec3(0.7, 0.2, 0.04) * heat * 0.25 * smoothstep(0.02, 0.0, abs(near.y - (gy + blades))) * grass; // rim light

  // embers rising and drifting, two layers
  for (int k = 0; k < 2; k++) {
    float sc = k == 0 ? 26.0 : 48.0;
    vec2 ep = mid * sc + vec2(t * (0.6 + 0.4 * float(k)), -t * (3.0 + 2.0 * float(k)));
    vec2 cell = floor(ep), fp = fract(ep) - 0.5;
    float r = h21(cell + float(k) * 13.0);
    vec2 off = vec2(h21(cell + 3.1), h21(cell + 7.7)) - 0.5;
    float d = length(fp - off * 0.7);
    float on = step(0.82, r) * smoothstep(fireLine - 0.05, fireLine + 0.1, mid.y) * smoothstep(0.7, 0.1, mid.y - fireLine);
    col += vec3(1.0, 0.55, 0.15) * smoothstep(0.09, 0.0, d) * on * heat * (0.6 + 0.4 * sin(t * 9.0 + r * 30.0));
  }

  // vignette and grain
  col *= 1.0 - 0.55 * dot(p * vec2(0.8, 1.0), p * vec2(0.8, 1.0));
  col += (h21(frag + fract(t)) - 0.5) * 0.025;

  // the smoke opens in holes onto the map (the reveal), like the clouds of the opening
  float holes = fbm(p * 2.6 + vec2(4.0, 7.0));
  float a = smoothstep(uReveal * 1.25 - 0.25, uReveal * 1.25, holes); // 1 while closed, 0 once open
  a *= uEnter;
  o = vec4(col * a, a);
}`;

export default function CineFire() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    let gl: WebGL2RenderingContext | null = null;
    let prog: WebGLProgram | null = null;
    let U: Record<string, WebGLUniformLocation | null> = {};
    let raf = 0;
    let last: ReturnType<typeof cineState> | null = null;
    let still = false;

    const init = () => {
      gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
      if (!gl) return false;
      const sh = (type: number, src: string) => {
        const s = gl!.createShader(type)!;
        gl!.shaderSource(s, src);
        gl!.compileShader(s);
        return s;
      };
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'aPos');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      U = Object.fromEntries(['uRes', 'uTime', 'uPush', 'uHeat', 'uRise', 'uReveal', 'uEnter'].map((n) => [n, gl!.getUniformLocation(prog!, n)]));
      return true;
    };
    const release = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
      gl = null;
      canvas.width = canvas.height = 1;
      canvas.style.visibility = 'hidden';
    };

    const draw = () => {
      raf = 0;
      if (!gl || !last) return;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const k = w < 1024 ? 0.42 : 0.6; // internal resolution: fire and smoke are soft
      const cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
      if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
      gl.viewport(0, 0, cw, ch);
      gl.uniform2f(U.uRes, cw, ch);
      gl.uniform1f(U.uTime, still ? 0 : (performance.now() / 1000) % 1000);
      gl.uniform1f(U.uPush, last.push);
      gl.uniform1f(U.uHeat, last.heat);
      gl.uniform1f(U.uRise, last.rise);
      gl.uniform1f(U.uReveal, last.reveal);
      gl.uniform1f(U.uEnter, last.enter);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!still) raf = requestAnimationFrame(draw);
    };

    const unsub = subscribe(({ st, reduced }) => {
      still = reduced || !!(window as any).__tourStill;
      const i = TOUR_EVENTS.findIndex((e) => e.id === AIR_STORY);
      const c = st.chapter === i ? cineState(st.chapterT, reduced) : null;
      if (!c || !c.on) {
        last = null;
        if (gl) release();
        return;
      }
      if (!gl && !init()) return;
      canvas.style.visibility = 'visible';
      last = c;
      cancelAnimationFrame(raf);
      draw();
    });
    return () => { unsub(); release(); };
  }, []);

  return <canvas ref={ref} className={styles.cine} data-tour-canvas="cine" aria-hidden="true" />;
}
