/**
 * 星系坐标引擎 — 严格按诗云 poetPosition 算法
 * 只改一个参数：臂散布系数从 0.45 → 0.8（适配 250K 人）
 */
import type { PersonIndex } from "../data/contract";
import { DYNASTIES } from "../data/dynasties";

const GALAXY_RADIUS = 3600;
const GALAXY_TWIST = 5.2;
const GALAXY_ARM_SPREAD = 0.42;
const GALAXY_THICKNESS = 0.11;
const BRANCHES = 4;

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function gauss3(a: number, b: number, c: number): number {
  return a + b + c - 1.5;
}

// ── 2D（保留）───────────────────────────────────────────────────
export interface Position2D { x: number; y: number; radius: number; }
export function personTo2D(p: PersonIndex): Position2D {
  const dynIdx = DYNASTIES.findIndex(d => d.key === p.dynasty);
  const r = 150 + (DYNASTIES.length - 1 - dynIdx) * 80;
  const a = ((p.indexYear + 2000) % 500) / 500 * Math.PI * 2;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, radius: r };
}

// ── 3D 星系坐标（逐行对应诗云 poetPosition）──────────────────

/**
 * 人物 → 3D 螺旋星系坐标
 *
 * 这是诗云 poetPosition 的精确移植。
 * 只改一处：ARM_SPREAD 乘数 0.45 → 0.75（因为 250K > 32K 诗人）
 */
export function personTo3D(p: { dynasty: string; indexYear: number; id: string }): [number, number, number] {
  const dynIdx = DYNASTIES.findIndex(d => d.key === p.dynasty);

  // 朝代 → 半径带（和诗云的 bandRadius 一样）
  const t = (DYNASTIES.length - 1 - dynIdx) / Math.max(DYNASTIES.length - 1, 1);
  const inner = GALAXY_RADIUS * 0.06 + t * GALAXY_RADIUS * 0.86;
  const outer = inner + GALAXY_RADIUS * 0.06;
  const center = (inner + outer) / 2;
  const width = outer - inner;

  const h = hashStr(p.id);
  const ra = ((h >>> 2) & 0xff) / 255;
  const rb = ((h >>> 10) & 0xff) / 255;
  const rc = ((h >>> 18) & 0xff) / 255;

  // 半径 = center + 高斯散布 × width × 1.5
  let rr = center + gauss3(ra, rb, rc) * width * 1.5;
  rr = Math.max(GALAXY_RADIUS * 0.03, Math.min(GALAXY_RADIUS * 1.05, rr));
  const rt = rr / GALAXY_RADIUS;

  // 旋臂（离散 4 臂 + 高斯散布 + 核心溶解）—— 和诗云逐行一致
  const branch = ((h % BRANCHES) / BRANCHES) * Math.PI * 2;
  const twist = rt * GALAXY_TWIST;
  const a1 = ((h >>> 3) & 0xff) / 255;
  const b1 = ((h >>> 11) & 0xff) / 255;
  const c1 = ((h >>> 19) & 0xff) / 255;
  const armDev = gauss3(a1, b1, c1) * GALAXY_ARM_SPREAD * 0.75;
  const az = ((h >>> 24) & 0xff) / 255;
  const centerBlur = Math.max(0, 0.5 - rt) / 0.5;
  const ang = branch + twist + armDev + (az - 0.5) * Math.PI * 2 * centerBlur;

  // 垂直
  const ya = ((h >>> 5) & 0xff) / 255;
  const yb = ((h >>> 13) & 0xff) / 255;
  const yc = ((h >>> 21) & 0xff) / 255;
  const bulge = 1 + Math.max(0, 0.45 - rt) * 2.6;
  const y = gauss3(ya, yb, yc) * rr * GALAXY_THICKNESS * 2.1 * bulge;

  // x/z 面内散射
  const h2 = hashStr("#" + p.id);
  const sxu = ((h2 >>> 2) & 0xff) / 255;
  const sxs = ((h2 >>> 10) & 0xff) / 255;
  const szu = ((h2 >>> 18) & 0xff) / 255;
  const szs = ((h2 >>> 26) & 0xff) / 255;
  const scat = (u: number, sgn: number) => Math.pow(u, 2.2) * (sgn < 0.5 ? -1 : 1) * 0.22 * rr;
  const cs = centerBlur * centerBlur * GALAXY_RADIUS * 0.22;
  const cjx = (((h2 >>> 5) & 0xff) / 255 - 0.5) * 2;
  const cjz = (((h2 >>> 13) & 0xff) / 255 - 0.5) * 2;

  return [
    Math.cos(ang) * rr + scat(sxu, sxs) + cjx * cs,
    y,
    Math.sin(ang) * rr + scat(szu, szs) + cjz * cs,
  ];
}
