/**
 * 3D 人物星点 — 历史人物散布在星系旋臂上
 * 从诗云 PoetStars 移植适配
 */
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useStore } from "../state/store";
import { getIndex, onNewChunk } from "../data/load";
import { DYNASTIES, DYNASTY_BY_KEY } from "../data/dynasties";
import { personTo3D } from "../engine/positions";
import { galaxySpin } from "./galaxyParams";
import { createGpuPicker, encodePickColor } from "./gpuPick";
import { pickTargets } from "./picking";

const WHITE = new THREE.Color("#ffffff");

export function PersonStars() {
  const hidden = useStore(s => s.hiddenDynasties);
  const hoverId = useStore(s => s.hoverId);
  const selId = useStore(s => s.selected?.id ?? null);
  const loaded = useStore(s => s.loaded);
  const rebuildKey = useStore(s => s.rebuildKey);
  const incRebuild = useStore(s => s.incRebuild);
  const { gl, camera } = useThree();

  // 监听数据分片到达
  useEffect(() => {
    onNewChunk(() => incRebuild());
  }, [incRebuild]);

  const built = useMemo(() => {
    if (!loaded) return null;
    const persons = getIndex();
    const n = persons.length;
    if (n === 0) return null;

    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const pick = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const baseSize = new Float32Array(n);
    const seed = new Float32Array(n);
    const dynId = new Uint8Array(n);
    const tmp = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const p = persons[i];
      const [x, y, z] = personTo3D(p);
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      const dyn = DYNASTY_BY_KEY[p.dynasty] ?? DYNASTIES[DYNASTIES.length - 1];
      dynId[i] = DYNASTIES.indexOf(dyn);
      tmp.set(dyn.color).lerp(WHITE, 0.05).multiplyScalar(1.6);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;

      const s = 0.6 + p.clusterSize * 0.12; // 更小的星点 → 250K 不重叠
      size[i] = s;
      baseSize[i] = s;
      let h = 0;
      for (let j = 0; j < p.id.length; j++) h = ((h << 5) - h + p.id.charCodeAt(j)) | 0;
      seed[i] = (h & 0xffff) / 0xffff;

      const [pr, pg, pb] = encodePickColor(i);
      pick[i * 3] = pr;
      pick[i * 3 + 1] = pg;
      pick[i * 3 + 2] = pb;
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aPickColor", new THREE.BufferAttribute(pick, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uSizeScale: { value: 1400 } },
      vertexShader: `
        attribute vec3 aColor; attribute float aSize; attribute float aSeed;
        uniform float uTime; uniform float uSizeScale;
        varying vec3 vColor; varying float vTw;
        void main() {
          if (aSize < 0.001) { gl_Position = vec4(2.0,2.0,2.0,1.0); gl_PointSize = 0.0; return; }
          vColor = aColor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(aSize * (uSizeScale / -mv.z), 0.8, 50.0);
          vTw = 0.7 + 0.3 * sin(uTime * 0.6 + aSeed * 6.2831853);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vColor; varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0; // 0=中心, 1=边缘
          float a = exp(-d * d * 3.5); // 高斯衰减 → 锐利核心 + 柔软外晕
          if (a < 0.015) discard;
          gl_FragColor = vec4(vColor * 1.8, a * vTw);
        }`,
    });
    const points = new THREE.Points(g, m);
    points.frustumCulled = false;

    return { points, geometry: g, baseSize, dynId, persons };
  }, [loaded, rebuildKey]);

  // ── GPU 拾取器 ──────────────────────────────────────────────
  useEffect(() => {
    if (!built) return;
    pickTargets.persons = built.persons;
    const picker = createGpuPicker(gl, camera, built.geometry, built.persons);
    pickTargets.pick = (x, y) => picker.pick(x, y);
    return () => {
      picker.dispose();
      pickTargets.pick = null;
    };
  }, [gl, camera, built]);

  // 朝代筛选 — 隐藏的人物 size 设为 0
  useEffect(() => {
    if (!built) return;
    const hide = new Array(DYNASTIES.length).fill(false);
    for (const d of DYNASTIES) hide[DYNASTIES.indexOf(d)] = hidden.has(d.key);
    const attr = built.points.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < arr.length; i++) {
      if (hide[built.dynId[i]]) { arr[i] = 0; continue; }
      arr[i] = built.persons[i].id === selId ? built.baseSize[i] * 1.8 : built.baseSize[i];
    }
    attr.needsUpdate = true;
  }, [hidden, built, selId]);

  const spinRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!built) return;
    (built.points.material as THREE.ShaderMaterial).uniforms.uTime.value += dt;
    if (spinRef.current) spinRef.current.rotation.y = galaxySpin.angle;
  });

  if (!built) return null;

  // 标签（悬停/选中的人）
  const byId = useMemo(() => new Map(built.persons.map(p => [p.id, p])), [built]);
  const shown: { id: string; name: string; pos: [number, number, number]; dynasty: string; isFocus: boolean }[] = [];
  for (const id of [hoverId, selId]) {
    if (id && !shown.find(s => s.id === id)) {
      const p = byId.get(id);
      if (p) {
        const idx = built.persons.indexOf(p);
        const off = idx * 3;
        const pos: [number, number, number] = [
          built.points.geometry.getAttribute("position").array[off],
          built.points.geometry.getAttribute("position").array[off + 1],
          built.points.geometry.getAttribute("position").array[off + 2],
        ];
        shown.push({ id: p.id, name: p.name, pos, dynasty: p.dynasty, isFocus: id === selId });
      }
    }
  }

  return (
    <group ref={spinRef}>
      <primitive object={built.points} />
      {shown.map(s => {
        const dyn = DYNASTY_BY_KEY[s.dynasty] ?? DYNASTIES[DYNASTIES.length - 1];
        return (
          <Html key={s.id} position={s.pos} center zIndexRange={[8, 0]} style={{ pointerEvents: "none" }}>
            <div className={s.isFocus ? "poet-label focus" : "poet-label"} style={{ color: dyn.color }}>
              {s.name}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
