/**
 * 2D Canvas 星图 — 事件处理学习诗云的 FlyControls 模式:
 *   1. 原生 DOM 事件（pointerdown/move/up/wheel），不依赖 React 合成事件
 *   2. moved 像素累计区分"拖拽"和"点击"（mouse slop 6px, touch 14px）
 *   3. 预计算数据到 TypedArray，视口裁剪渲染
 */
import { useEffect, useRef } from "react";
import { useStore } from "../state/store";
import { getIndex, getRelations } from "../data/load";
import { DYNASTIES, DYNASTY_BY_KEY } from "../data/dynasties";
import { personTo2D } from "../engine/positions";
import type { PersonIndex, RelationEdge } from "../data/contract";
import { RELATION_LABELS } from "../data/contract";

const DOT_R = 3;
const HIT_R = 13;
const BG = "#080810";
const TAG = "StarCanvas";

function hex8(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function StarCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  // ── 预计算缓存 ───────────────────────────────────────────────
  const C = useRef({
    points: new Float32Array(0),       // 7 floats/person: x, y, r, g, b, baseSize, visible
    idToIdx: new Map<string, number>(),
    persons: [] as PersonIndex[],
    relations: [] as RelationEdge[],
    selRels: [] as RelationEdge[],
    selPos: null as { x: number; y: number } | null,
    ready: false,
  });
  // ref 版本避免闭包陈旧
  const Cv = C.current;

  // ── 加载数据 → 构建缓存 ──────────────────────────────────────
  const loaded = useStore(s => s.loaded);
  useEffect(() => {
    if (!loaded) return;
    const persons = getIndex();
    const relations = getRelations();
    const idToIdx = new Map<string, number>();
    const points = new Float32Array(persons.length * 7);
    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      const pos = personTo2D(p);
      const dyn = DYNASTY_BY_KEY[p.dynasty];
      const col = dyn?.color ?? "#888";
      const off = i * 7;
      points[off]     = pos.x;
      points[off + 1] = pos.y;
      points[off + 2] = parseInt(col.slice(1, 3), 16) / 255;
      points[off + 3] = parseInt(col.slice(3, 5), 16) / 255;
      points[off + 4] = parseInt(col.slice(5, 7), 16) / 255;
      points[off + 5] = DOT_R + p.clusterSize * 0.3;
      points[off + 6] = 1;
      idToIdx.set(p.id, i);
    }
    Cv.points = points;
    Cv.idToIdx = idToIdx;
    Cv.persons = persons;
    Cv.relations = relations;
    Cv.ready = true;
    console.log(`${TAG}: loaded ${persons.length} persons, ${relations.length} relations`);
  }, [loaded]);

  // ── 选中人物 → 关系缓存 ──────────────────────────────────────
  const selected = useStore(s => s.selected);
  useEffect(() => {
    if (!Cv.ready || !selected) { Cv.selRels = []; Cv.selPos = null; return; }
    const idx = Cv.idToIdx.get(selected.id);
    if (idx === undefined) { Cv.selRels = []; Cv.selPos = null; return; }
    const off = idx * 7;
    Cv.selPos = { x: Cv.points[off], y: Cv.points[off + 1] };
    Cv.selRels = Cv.relations.filter(e => e.from === selected.id || e.to === selected.id);
  }, [selected]);

  // ── 渲染 ─────────────────────────────────────────────────────
  function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!Cv.ready) return;
    const st = useStore.getState();
    const s = st.viewScale, vx = st.viewX, vy = st.viewY;
    const hidden = st.hiddenDynasties;
    const sel = st.selected;
    const hovId = st.hoverId;
    const searchQ = st.searchQuery;
    const searchRes = st.searchResults;
    const showRels = st.showRelations;

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, s);
    ctx.translate(vx, vy);

    // 视口 (世界坐标)
    const vl = -w / 2 / s - vx - 40, vr = w / 2 / s - vx + 40;
    const vt = -h / 2 / s - vy - 40, vb = h / 2 / s - vy + 40;

    // ── 朝代环 ────────────────────────────────────────────────
    for (const dyn of DYNASTIES) {
      let ringR = -1;
      for (let i = 0; i < Cv.persons.length; i++) {
        if (Cv.persons[i].dynasty === dyn.key) {
          const off = i * 7;
          ringR = Math.hypot(Cv.points[off], Cv.points[off + 1]);
          break;
        }
      }
      if (ringR < 0) continue;
      ctx.strokeStyle = hex8(dyn.color, 0.08);
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = hex8(dyn.color, 0.25);
      ctx.font = "10px sans-serif";
      ctx.fillText(dyn.name, ringR + 5, 3);
    }

    // ── 关系连线 ──────────────────────────────────────────────
    if (sel && showRels && Cv.selRels.length && Cv.selPos) {
      for (const e of Cv.selRels) {
        const oid = e.from === sel.id ? e.to : e.from;
        const oi = Cv.idToIdx.get(oid);
        if (oi === undefined) continue;
        const oo = oi * 7;
        const ox = Cv.points[oo], oy = Cv.points[oo + 1];
        const sx = Cv.selPos.x, sy = Cv.selPos.y;
        const ri = RELATION_LABELS[e.type];
        ctx.beginPath(); ctx.moveTo(sx, sy);
        const mx = (sx + ox) / 2, my = (sy + oy) / 2;
        const cp = Math.min(Math.hypot(ox - sx, oy - sy) * 0.18, 28);
        ctx.quadraticCurveTo(mx + cp, my + cp, ox, oy);
        ctx.strokeStyle = hex8(ri.color, 0.4);
        ctx.lineWidth = 0.7; ctx.stroke();
      }
    }

    // ── 人物星点 ──────────────────────────────────────────────
    const selIdx = sel ? Cv.idToIdx.get(sel.id) : undefined;
    const hovIdx = hovId ? Cv.idToIdx.get(hovId) : undefined;
    const searchIds = searchQ ? new Set(searchRes.map(r => r.id)) : null;

    for (let i = 0; i < Cv.persons.length; i++) {
      const off = i * 7;
      const px = Cv.points[off], py = Cv.points[off + 1];
      if (px < vl || px > vr || py < vt || py > vb) continue;
      if (hidden.has(Cv.persons[i].dynasty)) continue;

      const isSel = i === selIdx, isHov = i === hovIdx, isSrch = searchIds?.has(Cv.persons[i].id);
      let a = 0.65;
      if (sel && !isSel && !isHov) a = 0.2;
      if (isSrch) a = 1;
      let sz = Cv.points[off + 5];
      if (isSel) sz = sz * 2.2 + 2;
      else if (isHov) sz = sz * 1.5 + 1;

      if (isSel || isHov) {
        ctx.beginPath(); ctx.arc(px, py, sz + 6, 0, Math.PI * 2);
        ctx.fillStyle = isSel ? "rgba(255,255,200,0.22)" : "rgba(255,255,255,0.08)";
        ctx.fill();
      }
      if (isSrch) {
        ctx.beginPath(); ctx.arc(px, py, sz + 5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,200,50,0.3)"; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(px, py, sz, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(Cv.points[off+2]*255)},${Math.round(Cv.points[off+3]*255)},${Math.round(Cv.points[off+4]*255)},${a})`;
      ctx.fill();
    }

    // ── 标签 ──────────────────────────────────────────────────
    const labels: { name: string; x: number; y: number; r: number; isSel: boolean }[] = [];
    if (selIdx !== undefined) {
      const o = selIdx * 7;
      labels.push({ name: Cv.persons[selIdx].name, x: Cv.points[o], y: Cv.points[o + 1], r: Cv.points[o + 5], isSel: true });
    }
    if (hovIdx !== undefined && hovIdx !== selIdx) {
      const o = hovIdx * 7;
      labels.push({ name: Cv.persons[hovIdx].name, x: Cv.points[o], y: Cv.points[o + 1], r: Cv.points[o + 5], isSel: false });
    }
    for (const lb of labels) {
      const ly = lb.y - lb.r - 10;
      ctx.font = lb.isSel ? "bold 14px sans-serif" : "12px sans-serif";
      ctx.textAlign = "center";
      const tm = ctx.measureText(lb.name);
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(lb.x - tm.width / 2 - 6, ly - 14, tm.width + 12, 20);
      ctx.fillStyle = lb.isSel ? "#fff" : "rgba(255,255,255,0.85)";
      ctx.fillText(lb.name, lb.x, ly);
      ctx.textAlign = "start";
    }

    ctx.restore();
  }

  // ── 命中检测 ─────────────────────────────────────────────────
  function hitTest(cx: number, cy: number): PersonIndex | null {
    if (!Cv.ready) return null;
    const st = useStore.getState();
    const s = st.viewScale, vx = st.viewX, vy = st.viewY;
    const hidden = st.hiddenDynasties;
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    let best: PersonIndex | null = null, bestD = Infinity;
    const t2 = HIT_R * HIT_R;
    for (let i = 0; i < Cv.persons.length; i++) {
      if (hidden.has(Cv.persons[i].dynasty)) continue;
      const off = i * 7;
      const sx = (Cv.points[off] + vx) * s + w / 2;
      const sy = (Cv.points[off + 1] + vy) * s + h / 2;
      const d2 = (cx - sx) ** 2 + (cy - sy) ** 2;
      if (d2 < t2 && d2 < bestD) { best = Cv.persons[i]; bestD = d2; }
    }
    return best;
  }

  // ── 动画循环 ───────────────────────────────────────────────
  useEffect(() => {
    let running = true;
    const loop = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) draw(ctx, canvas.clientWidth, canvas.clientHeight);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── 尺寸自适应 ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── 原生 DOM 事件（学习诗云 FlyControls 模式）─────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const st = useStore.getState;

    // 拖拽状态
    const drag = { active: false, lastX: 0, lastY: 0, moved: 0 };

    const onDown = (e: PointerEvent) => {
      drag.active = true;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.moved = 0;
    };

    const onMove = (e: PointerEvent) => {
      if (!drag.active) return;
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);

      // 拖拽平移
      const s = st().viewScale;
      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        st().setView(st().viewX + dx / s, st().viewY + dy / s);
      }

      // hover
      const hit = hitTest(e.clientX, e.clientY);
      st().setHover(hit?.id ?? null);
    };

    const onUp = (e: PointerEvent) => {
      const wasClick = drag.active && drag.moved < 6;
      drag.active = false;
      if (!wasClick) return;
      const hit = hitTest(e.clientX, e.clientY);
      if (hit) {
        st().selectPerson(hit);
      } else {
        st().selectPerson(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const _st = st();
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      const worldX = (e.clientX - cw / 2) / _st.viewScale - _st.viewX;
      const worldY = (e.clientY - ch / 2) / _st.viewScale - _st.viewY;
      const delta = -e.deltaY * 0.001;
      const newScale = Math.max(0.08, Math.min(5, _st.viewScale * (1 + delta)));
      const newViewX = (e.clientX - cw / 2) / newScale - worldX;
      const newViewY = (e.clientY - ch / 2) / newScale - worldY;
      useStore.setState({ viewScale: newScale, viewX: newViewX, viewY: newViewY });
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />;
}
