/**
 * 全局状态管理 — zustand 单例
 * 连接数据层 ↔ 渲染层 ↔ UI 面板
 */
import { create } from "zustand";
import type { PersonIndex, PersonRecord, RelationEdge } from "../data/contract";
import { DYNASTIES } from "../data/dynasties";
import { searchByName, getPersonCount } from "../data/load";
import type { PathResult } from "../data/graph";

export type { PersonIndex, PersonRecord, RelationEdge, PathResult };

interface State {
  // ── 数据就绪 ──
  loaded: boolean;

  // ── 当前选中的人物 ──
  selected: PersonIndex | null;
  selectedDetails: PersonRecord | null;   // 懒加载的详情
  selectedRelations: RelationEdge[];       // 此人的关系边

  // ── 悬停 ──
  hoverId: string | null;

  // ── 搜索 ──
  searchQuery: string;
  searchResults: PersonIndex[];

  // ── 朝代筛选 ──
  hiddenDynasties: Set<string>;

  // ── 关系显示 ──
  showRelations: boolean;    // 是否显示选中人物的关系连线
  relationFilter: string[];  // 空 = 全部显示，否则只显示指定的关系类型

  // ── 视口（2D Canvas 用）──
  viewX: number;   // 平移 X（画布坐标偏移）
  viewY: number;   // 平移 Y
  viewScale: number; // 缩放倍率 (0.2 ~ 5)

  // ── 路径查找 ──
  pathStart: string | null;
  pathEnd: string | null;
  pathResult: PathResult | null; // 含 path + edges（关系标签）

  // ── 重建版本号（PersonStars 监听变化）──
  rebuildKey: number;

  // ── UI 面板 ──
  panelOpen: boolean;       // 人物详情面板
  searchOpen: boolean;      // 搜索面板
  dynastyFilterOpen: boolean; // 朝代筛选面板

  // ── Actions ──
  setLoaded: (b: boolean) => void;
  selectPerson: (p: PersonIndex | null) => void;
  setDetails: (rec: PersonRecord | null) => void;
  setHover: (id: string | null) => void;
  setSearch: (q: string) => void;
  toggleDynasty: (key: string) => void;
  showAllDynasties: () => void;
  toggleRelations: () => void;
  setRelationFilter: (types: string[]) => void;
  setView: (x: number, y: number) => void;
  setScale: (s: number) => void;
  zoomTo: (s: number) => void;        // 相对缩放
  togglePanel: () => void;
  toggleSearch: () => void;
  toggleDynastyFilter: () => void;
  // 3D 用
  quality: "high" | "low";
  uiHidden: boolean;
  cinema: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  unlock: () => void;
  toggleQuality: () => void;
  toggleUI: () => void;
  setPathStart: (id: string | null) => void;
  setPathEnd: (id: string | null) => void;
  setPathResult: (r: PathResult | null) => void;
  incRebuild: () => void;
  // 相机飞到目标人物
  flyTarget: [number, number, number] | null;
  flyToPerson: (pos: [number, number, number] | null) => void;
}

const ALL_DYNASTY_KEYS = DYNASTIES.map(d => d.key);

export const useStore = create<State>((set, get) => ({
  loaded: false,
  selected: null,
  selectedDetails: null,
  selectedRelations: [],
  hoverId: null,
  searchQuery: "",
  searchResults: [],
  hiddenDynasties: new Set(),
  showRelations: true,
  relationFilter: [],
  viewX: 0,
  viewY: 0,
  viewScale: 0.6,
  panelOpen: false,
  searchOpen: false,
  dynastyFilterOpen: false,

  setLoaded: (loaded) => set({ loaded }),

  selectPerson: (p) => {
    if (p === null) {
      set({
        selected: null,
        selectedDetails: null,
        selectedRelations: [],
        panelOpen: false,
      });
      return;
    }
    set({
      selected: p,
      selectedDetails: null,    // 触发懒加载
      selectedRelations: [],
      panelOpen: true,
    });
  },

  setDetails: (rec) => set({ selectedDetails: rec }),

  setHover: (hoverId) => set({ hoverId }),

  setSearch: (q) => {
    const results = searchByName(q, 20);
    set({ searchQuery: q, searchResults: results, searchOpen: q.length > 0 });
  },

  toggleDynasty: (key) => set(s => {
    const next = new Set(s.hiddenDynasties);
    if (next.has(key)) next.delete(key); else next.add(key);
    return { hiddenDynasties: next };
  }),

  showAllDynasties: () => set({ hiddenDynasties: new Set() }),

  toggleRelations: () => set(s => ({ showRelations: !s.showRelations })),

  setRelationFilter: (types) => set({ relationFilter: types }),

  setView: (viewX, viewY) => set({ viewX, viewY }),

  setScale: (viewScale) => set({ viewScale: Math.max(0.15, Math.min(5, viewScale)) }),

  zoomTo: (delta) => set(s => ({
    viewScale: Math.max(0.15, Math.min(5, s.viewScale * (1 + delta))),
  })),

  togglePanel: () => set(s => ({ panelOpen: s.selected ? !s.panelOpen : false })),

  toggleSearch: () => set(s => ({
    searchOpen: !s.searchOpen,
    searchQuery: "",
    searchResults: [],
  })),

  toggleDynastyFilter: () => set(s => ({
    dynastyFilterOpen: !s.dynastyFilterOpen,
  })),
  pathStart: null,
  pathEnd: null,
  pathResult: null,
  rebuildKey: 0,
  quality: "high" as "high" | "low",
  uiHidden: false,
  cinema: false,
  speed: 1,
  setSpeed: (speed) => set({ speed }),
  unlock: () => {},
  toggleQuality: () => set(s => ({ quality: s.quality === "high" ? "low" : "high" })),
  toggleUI: () => set(s => ({ uiHidden: !s.uiHidden })),
  setPathStart: (pathStart) => set({ pathStart, pathResult: null }),
  setPathEnd: (pathEnd) => set({ pathEnd, pathResult: null }),
  setPathResult: (pathResult) => set({ pathResult }),
  incRebuild: () => set(s => ({ rebuildKey: s.rebuildKey + 1 })),
  flyTarget: null,
  flyToPerson: (flyTarget) => set({ flyTarget }),
}));
