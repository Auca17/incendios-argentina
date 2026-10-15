'use client';
import { useEffect, useRef } from 'react';

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_progress; // 0.0 to 1.0
uniform float u_direction; // +1.0 = Left-to-Right (forward), -1.0 = Right-to-Left (backward)

// Fast 2D hash
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// 2D Value Noise with smooth hermite interpolation
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 4-octave Fractal Brownian Motion for swirling flame turbulence
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.52;
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = rot * p * 2.15 + vec2(12.7, 34.5);
    a *= 0.48;
  }
  return v;
}

// Fire color palette: charred ember black -> deep ruby red -> blazing orange -> radiant gold -> core flame
vec3 firePalette(float t) {
  vec3 c0 = vec3(0.06, 0.015, 0.01); // charred dark smoke
  vec3 c1 = vec3(0.85, 0.12, 0.01);  // deep ruby embers
  vec3 c2 = vec3(1.0, 0.40, 0.02);   // blazing flame orange
  vec3 c3 = vec3(1.0, 0.84, 0.18);   // radiant gold
  vec3 c4 = vec3(1.0, 0.98, 0.85);   // white incandescent core

  if (t < 0.18) return mix(c0, c1, t / 0.18);
  if (t < 0.48) return mix(c1, c2, (t - 0.18) / 0.30);
  if (t < 0.80) return mix(c2, c3, (t - 0.48) / 0.32);
  return mix(c3, c4, clamp((t - 0.80) / 0.20, 0.0, 1.0));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 p = uv;
  p.x *= aspect;

  // Total horizontal span to sweep across with generous offscreen margins
  float totalSpan = aspect + 2.2;
  float sweep;

  if (u_direction > 0.0) {
    // Forward: sweeps from Left to Right
    sweep = u_progress * totalSpan - 1.1;
  } else {
    // Backward: sweeps from Right to Left
    sweep = (1.0 - u_progress) * totalSpan - 1.1;
  }

  // Upward convective heat motion and aerodynamic drift in sweep direction
  vec2 flameUv = p * 3.5;
  flameUv.y -= u_time * 6.5;
  flameUv.x -= u_direction * u_time * 2.2;

  // Dual-layer swirling flame turbulence
  float n1 = fbm(flameUv);
  float n2 = fbm(flameUv * 1.8 + vec2(u_time * 2.5, -u_time * 4.5));
  float flameNoise = n1 * 0.65 + n2 * 0.35;

  // Licking flame front
  float front = (p.x - sweep) + (flameNoise - 0.5) * 0.85;

  // Center fullness: swells dramatically as it crosses viewport center
  float fullness = sin(u_progress * 3.14159265);
  float halfWidth = 0.55 + fullness * 0.65;

  // Base flame shape
  float wall = 1.0 - smoothstep(0.0, halfWidth, abs(front));
  float intensity = wall * (1.2 + fullness * 1.6);

  // Border licking flames along top and bottom edges
  float borderDist = min(uv.y, 1.0 - uv.y) * 3.0;
  float borderFlame = 1.0 - smoothstep(0.0, 1.0, borderDist);
  if (borderFlame > 0.0) {
    float borderNoise = fbm(vec2(p.x * 4.5 + u_time * 3.0, uv.y * 6.0));
    intensity += borderFlame * borderNoise * fullness * 1.2;
  }

  // Central blazing engulf apex when fire crosses center
  if (fullness > 0.75) {
    float centerEngulf = (fullness - 0.75) * 3.6;
    float centerNoise = fbm(flameUv * 2.2 + vec2(u_time * 3.0, -u_time * 5.0));
    intensity = max(intensity, centerEngulf * (0.75 + 0.35 * centerNoise));
  }

  // Blazing flying sparks and embers traveling along the wave
  vec2 sparkGrid = floor(vec2(p.x * 32.0 + u_direction * u_time * 20.0, p.y * 32.0 + u_time * 12.0));
  float sparkVal = hash(sparkGrid);
  if (sparkVal > 0.93 && abs(front) < (halfWidth + 0.45)) {
    intensity += 0.85 * (1.0 + fullness);
  }

  // Map intensity into fire palette
  vec3 col = firePalette(clamp(intensity, 0.0, 1.0));

  // Alpha computation: solid and roaring in fire body, smooth falloff on edges
  float alpha = smoothstep(0.06, 0.28, intensity);

  // Soft charred smoke edge around flame silhouettes
  if (intensity > 0.03 && intensity < 0.22) {
    col = mix(vec3(0.05, 0.02, 0.01), col, (intensity - 0.03) / 0.19);
    alpha = min(alpha, 0.90);
  }

  gl_FragColor = vec4(col, alpha);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vert: WebGLShader,
  frag: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

interface FireShaderCanvasProps {
  direction?: 'forward' | 'backward';
  duration?: number;
  onFinish: () => void;
}

export default function FireShaderCanvas({
  direction = 'forward',
  duration = 850,
  onFinish,
}: FireShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
    });
    if (!gl) {
      onFinish();
      return;
    }

    const vert = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const frag = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
    if (!vert || !frag) {
      onFinish();
      return;
    }

    const program = createProgram(gl, vert, frag);
    if (!program) {
      onFinish();
      return;
    }

    gl.useProgram(program);

    // Quad geometry (2 triangles covering clip space -1 to 1)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uProgress = gl.getUniformLocation(program, 'u_progress');
    const uDirection = gl.getUniformLocation(program, 'u_direction');

    // High performance DPR: 1.25 gives crisp anti-aliased look with rock-solid 60 FPS
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let start: number | null = null;
    let animId: number;

    const render = (now: number) => {
      if (start === null) start = now;
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1.0);

      // Smooth custom acceleration curve: fast sweep, heavy apex, smooth dissipation
      const p = progress * progress * (3.0 - 2.0 * progress);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, elapsed * 0.001);
      if (uProgress) gl.uniform1f(uProgress, p);
      if (uDirection) gl.uniform1f(uDirection, direction === 'forward' ? 1.0 : -1.0);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (progress < 1.0) {
        animId = requestAnimationFrame(render);
      } else {
        onFinish();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
      gl.deleteBuffer(positionBuffer);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteProgram(program);
      const ext = gl.getExtension('WEBGL_lose_context');
      ext?.loseContext();
    };
  }, [direction, duration, onFinish]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    />
  );
}
