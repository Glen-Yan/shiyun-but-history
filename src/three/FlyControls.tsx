/**
 * 3D 飞行控制 + 点击选择 — 从诗云 FlyControls 简化移植
 * WASD 飞行 | 鼠标拖拽旋转视角 | 点击选人物 | 滚轮变速
 */
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { loadDetails } from "../data/load";
import { pickTargets } from "./picking";

const BASE_SPEED = 120;
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight"]);

export function FlyControls() {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));
  const speedMul = useRef(1);
  const drag = useRef({ active: false, lastX: 0, lastY: 0, moved: 0 });
  const lastHover = useRef(0);

  useEffect(() => {
    euler.current.setFromQuaternion(camera.quaternion);
    const el = gl.domElement;
    const st = useStore.getState;

    const isTyping = () => {
      const a = document.activeElement;
      return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA");
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      keys.current[e.code] = true;
      if (MOVE_KEYS.has(e.code)) st().unlock?.();
    };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };

    const onDown = (e: PointerEvent) => {
      drag.current = { active: true, lastX: e.clientX, lastY: e.clientY, moved: 0 };
    };
    const onMove = (e: PointerEvent) => {
      // hover（非拖拽时，70ms 节流）
      if (!drag.current.active) {
        const now = performance.now();
        if (now - lastHover.current > 70) {
          lastHover.current = now;
          const el = gl.domElement;
          const rect = el.getBoundingClientRect();
          const cssX = e.clientX - rect.left, cssY = e.clientY - rect.top;
          const hit = pickTargets.pick?.(cssX, cssY) ?? null;
          st().setHover(hit?.kind === "person" ? hit.person.id : null);
        }
        return;
      }

      const dx = e.clientX - drag.current.lastX;
      const dy = e.clientY - drag.current.lastY;
      drag.current.lastX = e.clientX;
      drag.current.lastY = e.clientY;
      drag.current.moved += Math.abs(dx) + Math.abs(dy);
      // 拖拽旋转
      const s = 0.0024;
      euler.current.y -= dx * s;
      euler.current.x -= dy * s;
      euler.current.x = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, euler.current.x));
      camera.quaternion.setFromEuler(euler.current);
    };
    const onUp = (e: PointerEvent) => {
      const wasClick = drag.current.active && drag.current.moved < 6;
      drag.current.active = false;
      if (!wasClick) return;

      const _st = st();

      // GPU 拾取 — O(1) 颜色 ID 查找
      const el2 = gl.domElement;
      const rect = el2.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;

      const hit = pickTargets.pick?.(cssX, cssY) ?? null;
      if (hit && hit.kind === "person") {
        _st.selectPerson(hit.person);
        // 懒加载人物详情
        loadDetails(hit.person.id);
      } else {
        _st.selectPerson(null);
      }
    };
    const onWheel = (e: WheelEvent) => {
      speedMul.current = Math.min(60, Math.max(0.1, speedMul.current * (e.deltaY > 0 ? 0.82 : 1.22)));
      st().setSpeed(speedMul.current);
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [camera, gl]);

  // ── 飞行到目标人物 ──
  const flyRef = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    const unsub = useStore.subscribe(s => {
      if (s.flyTarget) {
        flyRef.current = new THREE.Vector3(s.flyTarget[0], s.flyTarget[1], s.flyTarget[2]);
        // 清除 flyTarget，避免重复触发
        if (s.flyTarget) useStore.getState().flyToPerson(null);
      }
    });
    return unsub;
  }, []);

  // ── WASD 飞行 ──
  useFrame((_, dt) => {
    const st = useStore.getState();
    if (st.cinema) return;

    // 相机飞向目标（平滑插值）
    if (flyRef.current) {
      const target = flyRef.current;
      const dir = target.clone().sub(camera.position);
      // 目标在人物外围停住（距离 ~300）
      const dist = dir.length();
      if (dist < 350) {
        flyRef.current = null; // 到达，停止飞行
      } else {
        dir.normalize();
        const speed = Math.max(200, dist * 0.15) * Math.min(dt, 0.05);
        camera.position.add(dir.multiplyScalar(speed));
        // 让相机看向目标
        camera.lookAt(target);
      }
      return;
    }

    const k = keys.current;
    const v = new THREE.Vector3();
    if (k["KeyW"]) v.z -= 1;
    if (k["KeyS"]) v.z += 1;
    if (k["KeyA"]) v.x -= 1;
    if (k["KeyD"]) v.x += 1;
    if (k["Space"]) v.y += 1;
    if (k["ShiftLeft"] || k["ShiftRight"]) v.y -= 1;
    if (v.lengthSq() > 0) {
      v.normalize().multiplyScalar(BASE_SPEED * speedMul.current * Math.min(dt, 0.05));
      v.applyQuaternion(camera.quaternion);
      camera.position.add(v);
    }
  });

  return null;
}
