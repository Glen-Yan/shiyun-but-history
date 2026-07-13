/**
 * GPU 拾取 — 颜色编码 ID → O(1) 命中检测
 * 从诗云移植简化版（只要人物星点）
 */
import * as THREE from "three";
import type { PersonIndex } from "../data/contract";
import { galaxySpin } from "./galaxyParams";
import { pickTargets, type PickResult } from "./picking";

// index i (0-based) → RGB in [0,1]; id = i+1 so 0 = background/miss
export function encodePickColor(i: number): [number, number, number] {
  const id = i + 1;
  return [(id & 255) / 255, ((id >> 8) & 255) / 255, ((id >> 16) & 255) / 255];
}

const SIZE_SCALE = 1400; // MUST match PersonStars uSizeScale
const GATE_PX = 4.0;    // minimum pixel size for a star to be clickable
const PICK_RADIUS = 5;  // search radius around cursor (drawing-buffer px)

// Scan N×N readback for nearest non-background pixel → decode id
function nearest(buf: Uint8Array, n: number, radius: number): number {
  let best = -1, bestD = Infinity;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const o = (y * n + x) * 4;
      const id = buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16);
      if (id === 0) continue;
      const dx = x - radius, dy = y - radius;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = id - 1; }
    }
  }
  return best;
}

export interface GpuPicker {
  pick(cssX: number, cssY: number): PickResult | null;
  dispose(): void;
}

/**
 * 创建 GPU 拾取器
 * geometry 与视觉 PersonStars 共享（含 aPickColor）
 */
export function createGpuPicker(
  gl: THREE.WebGLRenderer,
  defaultCamera: THREE.Camera,
  geometry: THREE.BufferGeometry,
  persons: PersonIndex[],
): GpuPicker {
  const material = new THREE.ShaderMaterial({
    transparent: false,
    depthTest: true,
    depthWrite: true,
    blending: THREE.NoBlending,
    uniforms: { uSizeScale: { value: SIZE_SCALE }, uGate: { value: GATE_PX } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute vec3 aPickColor;
      uniform float uSizeScale; uniform float uGate;
      varying vec3 vPick;
      void main() {
        if (aSize < 0.001) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float sz = aSize * (uSizeScale / -mv.z);
        if (sz < uGate) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; return; }
        gl_PointSize = clamp(sz, uGate, 50.0);
        vPick = aPickColor;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vPick;
      void main() {
        if (length(gl_PointCoord - 0.5) > 0.5) discard;
        gl_FragColor = vec4(vPick, 1.0);
      }`,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const group = new THREE.Group();
  group.add(points);
  const scene = new THREE.Scene();
  scene.add(group);

  const rt = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthBuffer: true, stencilBuffer: false,
  });
  let buf = new Uint8Array(4);
  const sizeV = new THREE.Vector2();
  const clearC = new THREE.Color();

  function pick(cssX: number, cssY: number): PickResult | null {
    const pr = gl.getPixelRatio();
    gl.getDrawingBufferSize(sizeV);
    const fullW = sizeV.x, fullH = sizeV.y;
    if (fullW < 1 || fullH < 1) return null;

    const n = PICK_RADIUS * 2 + 1;
    if (rt.width !== n) {
      rt.setSize(n, n);
      buf = new Uint8Array(n * n * 4);
    }
    const dbx = Math.floor(cssX * pr), dby = Math.floor(cssY * pr);

    // 同步旋转
    group.rotation.y = galaxySpin.angle;
    group.updateMatrixWorld(true);

    // 渲染 n×n 窗口
    const viewCam = defaultCamera as THREE.PerspectiveCamera & {
      setViewOffset(fw: number, fh: number, x: number, y: number, w: number, h: number): void;
      clearViewOffset(): void;
    };
    viewCam.setViewOffset(fullW, fullH, dbx - PICK_RADIUS, dby - PICK_RADIUS, n, n);

    const prevRT = gl.getRenderTarget();
    gl.getClearColor(clearC);
    const prevAlpha = gl.getClearAlpha();
    gl.setRenderTarget(rt);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, false);

    try {
      gl.render(scene, defaultCamera);
    } finally {
      gl.setRenderTarget(prevRT);
      gl.setClearColor(clearC, prevAlpha);
      viewCam.clearViewOffset();
    }

    gl.readRenderTargetPixels(rt, 0, 0, n, n, buf);
    const idx = nearest(buf, n, PICK_RADIUS);
    if (idx < 0 || idx >= persons.length) return null;
    return { kind: "person", person: persons[idx] };
  }

  function dispose() {
    material.dispose();
    rt.dispose();
  }

  return { pick, dispose };
}
