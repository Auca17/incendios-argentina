'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styles from './ThreeGlobe.module.css';

type Props = {
  progress: number; // 0 (orbit) to 1 (close approach to Argentina)
  opacity?: number;
};

export default function ThreeGlobe({ progress, opacity = 1 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const earthRef = useRef<THREE.Mesh | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4.2);
    cameraRef.current = camera;

    // 2. Renderer with antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 3. Lighting: Directional sunlight from upper left + ambient fill
    const sunLight = new THREE.DirectionalLight(0xfff6ea, 2.2);
    sunLight.position.set(-5, 3, 5);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x223344, 0.85);
    scene.add(ambientLight);

    // 4. Earth Sphere with daytime texture
    const textureLoader = new THREE.TextureLoader();
    const earthGeo = new THREE.SphereGeometry(1.2, 64, 64);

    const earthMat = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      metalness: 0.1,
    });

    textureLoader.load('/img/earth-day.jpg', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    });

    const earth = new THREE.Mesh(earthGeo, earthMat);
    // Orient globe so Argentina (lat -38, lon -64) faces forward
    // Longitude -64 -> rotation.y = degToRad(64 - 90) = -26 deg
    // Latitude -38 -> tilt rotation.x = degToRad(-38)
    earth.rotation.y = THREE.MathUtils.degToRad(-25);
    earth.rotation.x = THREE.MathUtils.degToRad(-28);
    scene.add(earth);
    earthRef.current = earth;

    // 5. Atmosphere Glow Shell
    const atmoGeo = new THREE.SphereGeometry(1.24, 64, 64);
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmosphere);

    // 6. Subtle Starfield Particles
    const starGeo = new THREE.BufferGeometry();
    const starCount = 300;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPos[i] = (Math.random() - 0.5) * 40;
      starPos[i + 1] = (Math.random() - 0.5) * 40;
      starPos[i + 2] = -5 - Math.random() * 20;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 7. Animation / Render Loop
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Smooth camera interpolation based on progress (0 to 1)
      const p = progressRef.current;
      // Start in orbit (z = 4.2), zoom in towards Argentina (z = 1.55)
      const targetZ = THREE.MathUtils.lerp(4.2, 1.6, p);
      const targetY = THREE.MathUtils.lerp(0, -0.35, p);
      const targetX = THREE.MathUtils.lerp(0, -0.15, p);

      camera.position.z += (targetZ - camera.position.z) * 0.1;
      camera.position.y += (targetY - camera.position.y) * 0.1;
      camera.position.x += (targetX - camera.position.x) * 0.1;

      // Gentle ambient float
      if (earth) {
        earth.rotation.y = THREE.MathUtils.degToRad(-25) + Math.sin(Date.now() * 0.0004) * 0.02;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Resize Observer
    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      container.innerHTML = '';
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={styles.globeContainer}
      style={{
        opacity,
        pointerEvents: opacity < 0.05 ? 'none' : 'auto',
      }}
      aria-hidden="true"
    />
  );
}
