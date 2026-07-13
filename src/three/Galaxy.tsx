/**
 * 3D 程序化螺旋星系 — 从诗云移植
 * 朝代色带：外层先秦汉唐，内层明清
 */
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { GALAXY, gauss3, advanceSpin, galaxySpin } from "./galaxyParams";
import { DYNASTIES } from "../data/dynasties";

function mulberry32(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const cCore = new THREE.Color("#fff1d6");
const cInner = new THREE.Color("#fff7ec");
const cMid = new THREE.Color("#ffffff");
const cArm = new THREE.Color("#cfe0ff");

// 朝代色 → THREE.Color
const dynColors = DYNASTIES.map(d => ({ key: d.key, color: new THREE.Color(d.color) }));

export function Galaxy() {
  const quality = useStore(s => s.quality);

  const built = useMemo(() => {
    const hi = quality === "high";
    const DUST = hi ? 80000 : 28000;
    const STARS = hi ? 6000 : 2200;
    const BULGE = hi ? 40000 : 16000;
    const TOTAL = DUST + STARS + BULGE;
    const rnd = mulberry32(31337);
    const R = GALAXY.RADIUS;
    const pos = new Float32Array(TOTAL * 3);
    const col = new Float32Array(TOTAL * 3);
    const scale = new Float32Array(TOTAL);
    const c = new THREE.Color();
    const expR = (h: number, cap: number) => Math.min(cap, -h * Math.log(1 - rnd() * 0.9999));

    for (let i = 0; i < TOTAL; i++) {
      const isBulge = i >= DUST + STARS;
      const isStar = !isBulge && i >= DUST;
      let x: number, y: number, z: number, t: number, armProx = 0, bright: number;

      if (isBulge) {
        const rr = expR(R * 0.10, R * 0.38);
        t = rr / R;
        const phi = rnd() * Math.PI * 2;
        const ct = 2 * rnd() - 1;
        const st = Math.sqrt(Math.max(0, 1 - ct * ct));
        x = rr * st * Math.cos(phi) + R * 0.04 * (rnd() - 0.5);
        z = rr * st * Math.sin(phi) + R * 0.04 * (rnd() - 0.5);
        y = rr * ct * 0.55 + R * 0.02 * (rnd() - 0.5);
        armProx = 0.15;
        bright = (0.82 - t * 0.7) * (0.55 + rnd() * 0.45);
      } else {
        const rr = expR(R * 0.27, R) + R * 0.012;
        t = rr / R;
        const branch = (Math.floor(rnd() * GALAXY.BRANCHES) / GALAXY.BRANCHES) * Math.PI * 2;
        const twist = t * GALAXY.TWIST;
        const armDev = gauss3(rnd(), rnd(), rnd()) * GALAXY.ARM_SPREAD;
        armProx = Math.exp(-((armDev / GALAXY.ARM_SPREAD) ** 2) * 2.2);
        const cb = Math.max(0, 0.45 - t) / 0.45;
        const ang = branch + twist + armDev + (rnd() - 0.5) * Math.PI * 2 * cb * cb;
        const scatter = (v: number) => Math.pow(rnd(), 2.6) * (rnd() < 0.5 ? -1 : 1) * v * rr;
        const coreFill = cb * cb * R * 0.06;
        x = Math.cos(ang) * rr + scatter(0.15) + (rnd() - 0.5) * 2 * coreFill;
        z = Math.sin(ang) * rr + scatter(0.15) + (rnd() - 0.5) * 2 * coreFill;
        y = gauss3(rnd(), rnd(), rnd()) * rr * GALAXY.THICKNESS * (isStar ? 0.75 : 1.0);
        const armBoost = isStar ? 0.38 + armProx * 0.95 : 0.30 + armProx * 0.70;
        bright = (armBoost + cb * 0.35) * (0.45 + cb * 0.2 + rnd() * 0.55);
      }

      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;

      // 着色：暖白核心 → 蓝白旋臂，按径向位置混合最近朝代色
      if (t < 0.12) c.copy(cCore).lerp(cInner, t / 0.12);
      else if (t < 0.4) c.copy(cInner).lerp(cMid, (t - 0.12) / 0.28);
      else c.copy(cMid).lerp(cArm, Math.min(1, (t - 0.4) / 0.5));

      // 按径向位置混合朝代色（外圈 = 先秦汉唐，内圈 = 明清）
      const dynIdx = Math.floor((1 - t) * DYNASTIES.length);
      const dc = dynColors[Math.min(dynIdx, dynColors.length - 1)];
      if (dc && t > 0.08) c.lerp(dc.color, 0.07);

      if (!isBulge) c.lerp(cArm, armProx * 0.4);

      col[i * 3] = c.r * bright; col[i * 3 + 1] = c.g * bright; col[i * 3 + 2] = c.b * bright;

      scale[i] = isBulge ? (1.2 + (0.3 - t) * 2.4) * (0.7 + rnd() * 0.6)
        : isStar ? (0.6 + armProx * 0.7) * (0.7 + rnd() * 0.5)
        : (0.45 + (1 - t) * 0.7) * (0.7 + rnd() * 0.5);
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uSize: { value: 2.8 } },
      vertexShader: `
        uniform float uSize;
        attribute vec3 aColor; attribute float aScale;
        varying vec3 vColor;
        void main() {
          vec4 vp = viewMatrix * modelMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * vp;
          gl_PointSize = clamp(uSize * aScale * (800.0 / -vp.z), 0.5, 60.0);
          vColor = aColor;
        }`,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
          float a = exp(-d * d * 4.5);
          if (a < 0.003) discard;
          gl_FragColor = vec4(vColor * a, a);
        }`,
    });
    const points = new THREE.Points(g, m);
    points.frustumCulled = false;

    // 中心光晕
    const grp = new THREE.Group();
    grp.add(points);

    // 远处星穹
    {
      const n = 4000, dp = new Float32Array(n * 3), dc = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const RR = 7000, th = rnd() * Math.PI * 2, ph = Math.acos(2 * rnd() - 1);
        dp[i * 3] = RR * Math.sin(ph) * Math.cos(th);
        dp[i * 3 + 1] = RR * Math.cos(ph);
        dp[i * 3 + 2] = RR * Math.sin(ph) * Math.sin(th);
        const gg = 0.5 + rnd() * 0.5;
        dc[i * 3] = gg; dc[i * 3 + 1] = gg; dc[i * 3 + 2] = gg * 1.05;
      }
      const dg = new THREE.BufferGeometry();
      dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
      dg.setAttribute("color", new THREE.BufferAttribute(dc, 3));
      const dome = new THREE.Points(dg, new THREE.PointsMaterial({
        size: 14, sizeAttenuation: true, vertexColors: true,
        transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      dome.frustumCulled = false;
      grp.add(dome);
    }

    return { grp, points };
  }, [quality]);

  useEffect(() => {
    const { grp } = built;
    return () => { grp.traverse((o: any) => { o.geometry?.dispose(); (o.material as THREE.Material)?.dispose(); }); };
  }, [built]);

  useFrame((_, dt) => {
    if (useStore.getState().cinema) return;
    advanceSpin(dt);
    built.points.rotation.y = galaxySpin.decorAngle;
  });

  return <primitive object={built.grp} />;
}
