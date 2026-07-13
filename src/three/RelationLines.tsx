/**
 * 3D 关系连线 — 选中人物时显示关系网络弧线
 * 使用 engine/positions.ts 的 personTo3D 保证端点与星点精确对齐
 */
import * as THREE from "three";
import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { getRelations, getPersonById } from "../data/load";
import { personTo3D } from "../engine/positions";
import { galaxySpin } from "./galaxyParams";
import { RELATION_LABELS, type RelationEdge } from "../data/contract";

const STEPS = 24;
const BUNDLE = 0.3;
const CENTER = new THREE.Vector3(0, 0, 0);

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c1 = new THREE.Vector3();
const _c2 = new THREE.Vector3();
const _v = new THREE.Vector3();

interface EdgeData {
  pts: Float32Array;   // (STEPS+1)*3 立方 Bézier 采样点
  col: Float32Array;   // 对应颜色（末端渐隐）
  seed: number;        // 脉冲种子
}

export function RelationLines() {
  const selected = useStore(s => s.selected);
  const showRelations = useStore(s => s.showRelations);
  const pathResult = useStore(s => s.pathResult); // 路径高亮
  const pathIds = pathResult?.path; // PathResult.path: string[]

  const edges = useMemo<EdgeData[]>(() => {
    const allRels = getRelations();
    const selRels: RelationEdge[] = [];

    // 路径边（始终显示）
    if (pathIds && pathIds.length > 1) {
      for (let i = 0; i < pathIds.length - 1; i++) {
        const a = pathIds[i], b = pathIds[i + 1];
        const rel = allRels.find(r =>
          (r.from === a && r.to === b) || (r.from === b && r.to === a)
        );
        if (rel) selRels.push(rel);
      }
    }

    // 选中人物的关系边
    if (selected && showRelations) {
      for (const r of allRels) {
        if (r.from === selected.id || r.to === selected.id) {
          if (!selRels.some(s => s.from === r.from && s.to === r.to)) selRels.push(r);
        }
      }
    }

    if (selRels.length === 0) return [];

    const out: EdgeData[] = [];
    // 路径边 ID 集合（用于着色区分）
    const pathPairs = new Set<string>();
    if (pathIds) {
      for (let i = 0; i < pathIds.length - 1; i++) {
        pathPairs.add(pathIds[i] + "|" + pathIds[i + 1]);
        pathPairs.add(pathIds[i + 1] + "|" + pathIds[i]);
      }
    }

    for (const rel of selRels) {
      const isPathEdge = pathPairs.has(rel.from + "|" + rel.to);
      // 确定两个端点
      const fromPerson = getPersonById(rel.from);
      const toPerson = getPersonById(rel.to);
      if (!fromPerson || !toPerson) continue;

      _a.set(...personTo3D(fromPerson));
      _b.set(...personTo3D(toPerson));

      _c1.lerpVectors(_a, _b, 0.33).lerp(CENTER, BUNDLE);
      _c2.lerpVectors(_a, _b, 0.67).lerp(CENTER, BUNDLE);

      // 路径边用金色，普通边用关系类型色
      const lc = isPathEdge
        ? new THREE.Color("#ffd54f")
        : new THREE.Color((RELATION_LABELS as Record<string, {color: string}>)[rel.type]?.color ?? "#888");

      const pts = new Float32Array((STEPS + 1) * 3);
      const col = new Float32Array((STEPS + 1) * 3);

      for (let s = 0; s <= STEPS; s++) {
        const t = s / STEPS;
        const u = 1 - t;
        _v.set(0, 0, 0)
          .addScaledVector(_a, u * u * u)
          .addScaledVector(_c1, 3 * u * u * t)
          .addScaledVector(_c2, 3 * u * t * t)
          .addScaledVector(_b, t * t * t);
        pts[s * 3]     = _v.x;
        pts[s * 3 + 1] = _v.y;
        pts[s * 3 + 2] = _v.z;
        const fade = Math.sin(Math.PI * t);
        col[s * 3]     = lc.r * fade;
        col[s * 3 + 1] = lc.g * fade;
        col[s * 3 + 2] = lc.b * fade;
      }

      const seed = ((parseInt(toPerson.id.slice(1, 7), 16) || 0) % 997) / 997;
      out.push({ pts, col, seed });
    }
    return out;
  }, [selected, showRelations, pathResult]);

  // 材质（流光脉冲）
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute vec3 color; attribute float aSeed;
      varying vec3 vColor; varying float vSeed;
      void main() {
        vColor = color; vSeed = aSeed;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vSeed;
      uniform float uTime;
      void main() {
        float pulse = 1.0 + sin(uTime * 1.5 + vSeed * 6.2832) * 0.35;
        vec3 col = vColor * pulse;
        float a = max(max(col.r, col.g), col.b);
        if (a < 0.003) discard;
        gl_FragColor = vec4(col, a);
      }`,
  }), []);

  // LineSegments geometry
  const object = useMemo(() => {
    if (!edges.length) return null;
    const pos: number[] = [];
    const colors: number[] = [];
    const seeds: number[] = [];

    for (const e of edges) {
      for (let s = 0; s < STEPS; s++) {
        const i0 = s * 3, i1 = (s + 1) * 3;
        pos.push(e.pts[i0], e.pts[i0 + 1], e.pts[i0 + 2]);
        pos.push(e.pts[i1], e.pts[i1 + 1], e.pts[i1 + 2]);
        colors.push(e.col[i0], e.col[i0 + 1], e.col[i0 + 2]);
        colors.push(e.col[i1], e.col[i1 + 1], e.col[i1 + 2]);
        seeds.push(e.seed, e.seed);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pos), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(seeds), 1));
    const ls = new THREE.LineSegments(g, mat);
    ls.frustumCulled = false;
    return ls;
  }, [edges, mat]);

  // 旋转同步
  useFrame((_, dt) => {
    if (object) {
      mat.uniforms.uTime.value += dt;
      object.rotation.y = galaxySpin.angle;
    }
  });

  const hasPath = pathIds && pathIds.length > 1;
  if (!object || edges.length === 0) return null;
  if (!hasPath && (!selected || !showRelations)) return null;
  return <primitive object={object} />;
}
