import type { DynastyDef } from "./contract";

/**
 * 中国历史朝代定义 — 按时间顺序排列（从早到晚）
 * 星系中：越早的朝代越靠外圈，越晚的越靠内圈（类似"辏"）
 * 颜色方案：每个朝代有独特的主题色，参考传统中国色彩
 */
export const DYNASTIES: DynastyDef[] = [
  { key: "xianqin",  name: "先秦",   startYear: -2000, endYear: -221,  color: "#c9a96e" }, // 青铜色
  { key: "qin",      name: "秦",     startYear: -221,  endYear: -206,  color: "#8b4513" }, // 深褐
  { key: "han",      name: "汉",     startYear: -206,  endYear: 220,   color: "#cd5c5c" }, // 汉红
  { key: "weijin",   name: "魏晋南北朝", startYear: 220, endYear: 589, color: "#7b9e8c" }, // 青灰
  { key: "sui",      name: "隋",     startYear: 581,   endYear: 618,   color: "#708090" }, // 岩灰
  { key: "tang",     name: "唐",     startYear: 618,   endYear: 907,   color: "#e8c84a" }, // 唐金
  { key: "wudai",    name: "五代十国", startYear: 907,  endYear: 960,   color: "#b8860b" }, // 暗金
  { key: "song",     name: "宋",     startYear: 960,   endYear: 1279,  color: "#5dbea3" }, // 青瓷
  { key: "liao",     name: "辽",     startYear: 907,   endYear: 1125,  color: "#c4a35a" },
  { key: "jin",      name: "金",     startYear: 1115,  endYear: 1234,  color: "#d4a574" },
  { key: "yuan",     name: "元",     startYear: 1271,  endYear: 1368,  color: "#517d99" }, // 元蓝
  { key: "ming",     name: "明",     startYear: 1368,  endYear: 1644,  color: "#c0392b" }, // 朱红
  { key: "qing",     name: "清",     startYear: 1644,  endYear: 1912,  color: "#2c3e50" }, // 靛青
  { key: "minguo",   name: "民国",   startYear: 1912,  endYear: 1949,  color: "#3498db" }, // 蔚蓝
  { key: "dangdai",  name: "当代",   startYear: 1949,  endYear: 2025,  color: "#7dcea0" }, // 新绿
];

/** key → DynastyDef 快速查找 */
export const DYNASTY_BY_KEY: Record<string, DynastyDef> = {};
for (const d of DYNASTIES) DYNASTY_BY_KEY[d.key] = d;

/** 朝代总数 */
export const DYNASTY_COUNT = DYNASTIES.length;

/**
 * 给定年份 → 朝代 key
 * 用于从 CBDB 的 c_index_year / c_dy 推导朝代
 */
export function dynastyForYear(year: number): string {
  for (let i = DYNASTIES.length - 1; i >= 0; i--) {
    const d = DYNASTIES[i];
    if (year >= d.startYear && year <= d.endYear) return d.key;
  }
  // 公元前/超出范围的归入最早或最晚
  return year < DYNASTIES[0].endYear ? DYNASTIES[0].key : DYNASTIES[DYNASTY_COUNT-1].key;
}
