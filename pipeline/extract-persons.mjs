#!/usr/bin/env node
/**
 * extract-persons.mjs
 * 从 CBDB SQLite 的 BIOG_MAIN 表提取人物数据
 *
 * 筛选条件：
 *   1. 有 c_index_year 或 c_birthyear 或 c_deathyear（至少有一个非空且非零）
 *   2. 中文名不为空且不是"未詳"
 *   3. 有至少一项社会关系（ASSOC_DATA 或 KIN_DATA）或至少一项官职/身份
 *
 * 输出：public/data/persons.index.json（全量人物索引）
 */

import { DatabaseSync } from "node:sqlite";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

// ── 配置 ────────────────────────────────────────────────────────
const DB_PATH = process.argv[2] || "D:/桌面/latest/cbdb_20260711.sqlite3";
const OUT_DIR = process.argv[3] || "public/data";

// ── CBDB 朝代 → 我们的朝代 key 映射 ───────────────────────────
const DYNASTY_MAP = {
  // 0: skip (unknown)
  1:  "xianqin",  // 漢前
  2:  "han",      // 秦漢
  83: "han",      // 漢
  25: "han",      // 東漢
  29: "han",      // 西漢
  46: "han",      // 新
  61: "qin",      // 贏秦
  3:  "weijin",   // 三國
  23: "weijin",   // 西晉
  26: "weijin",   // 三國魏
  27: "weijin",   // 東晉
  28: "weijin",   // 宋(劉)
  30: "weijin",   // 北魏
  31: "weijin",   // 北周
  32: "weijin",   // 南齊
  35: "weijin",   // 北齊
  37: "weijin",   // 西梁
  39: "weijin",   // 前燕
  40: "weijin",   // 西魏
  41: "weijin",   // 東魏
  42: "weijin",   // 三國吳
  44: "weijin",   // 南梁
  45: "weijin",   // 後秦
  50: "weijin",   // 南燕
  51: "weijin",   // 前涼
  53: "weijin",   // 三國蜀
  56: "weijin",   // 西涼
  60: "weijin",   // 北燕
  62: "weijin",   // 北涼
  63: "weijin",   // 後燕
  64: "weijin",   // 後趙
  65: "weijin",   // 前秦
  69: "weijin",   // 前趙
  70: "weijin",   // 成漢
  71: "weijin",   // 夏
  72: "weijin",   // 西秦
  73: "weijin",   // 後涼
  74: "weijin",   // 南涼
  76: "weijin",   // 西燕
  82: "weijin",   // 晉
  87: "weijin",   // 代
  4:  "weijin",   // 南北朝
  24: "weijin",   // 陳
  68: "weijin",   // 東梁
  5:  "sui",      // 隋
  6:  "tang",     // 唐
  77: "tang",     // 周(武周)
  81: "tang",     // 鄭(王世充)
  7:  "wudai",    // 五代
  34: "wudai",    // 後梁
  47: "wudai",    // 後唐
  48: "wudai",    // 後晉
  49: "wudai",    // 後周
  52: "wudai",    // 後漢
  8:  "wudai",    // 後蜀
  9:  "wudai",    // 吳
  10: "wudai",    // 南唐
  11: "wudai",    // 吳越
  12: "wudai",    // 閩國
  13: "wudai",    // 南漢
  36: "wudai",    // 吳(楊)
  38: "wudai",    // 楚(馬)
  55: "wudai",    // 南平
  66: "wudai",    // 北漢
  75: "wudai",    // 前蜀
  15: "song",     // 宋
  16: "liao",     // 遼
  59: "liao",     // 西遼
  17: "jin",      // 金
  57: "jin",      // 偽齊
  18: "yuan",     // 元
  79: "yuan",     // 北元
  19: "ming",     // 明
  80: "ming",     // 南明
  85: "ming",     // 大順
  86: "ming",     // 大西
  20: "qing",     // 清
  21: "minguo",   // 中華民國
  22: "dangdai",  // 中華人民共和國
  78: "song",     // 西夏 → 归宋
  14: "song",     // 高麗 → 归宋同期
  84: "ming",     // 朝鮮 → 归明同期
  58: "ming",     // 韓國 → 归明同期
  67: "tang",     // 新羅 → 归唐同期
};

// ── 辅助函数 ────────────────────────────────────────────────────
function mapDynasty(cDy) {
  if (cDy === null || cDy === undefined) return null;
  return DYNASTY_MAP[cDy] || null;
}

/** 生成短 hash ID */
function makeId(personid) {
  // 用 personid 的 hex 作为短 ID
  return "p" + personid.toString(16);
}

/** 判断年份是否有效（非空且非零） */
function validYear(y) {
  return y !== null && y !== undefined && y !== 0;
}

// ── 主流程 ──────────────────────────────────────────────────────
console.error("Opening database:", DB_PATH);
const db = new DatabaseSync(DB_PATH);

// 先收集有社会关系的人物 ID（用于筛选）
console.error("Collecting persons with social connections...");
const connectedIds = new Set();

// 从 ASSOC_DATA 收集
const assocRows = db.prepare(`
  SELECT DISTINCT c_personid FROM ASSOC_DATA
  WHERE c_assoc_code > 0
`).all();
for (const r of assocRows) connectedIds.add(r.c_personid);

// 从 KIN_DATA 收集（排除 kin_code = -10000 的无效数据）
const kinRows = db.prepare(`
  SELECT DISTINCT c_personid FROM KIN_DATA
  WHERE c_kin_code > 0
`).all();
for (const r of kinRows) connectedIds.add(r.c_personid);

// 从 POSTED_TO_OFFICE_DATA 收集
const officeRows = db.prepare(`
  SELECT DISTINCT c_personid FROM POSTED_TO_OFFICE_DATA
`).all();
for (const r of officeRows) connectedIds.add(r.c_personid);

// 从 STATUS_DATA 收集
const statusRows = db.prepare(`
  SELECT DISTINCT c_personid FROM STATUS_DATA
  WHERE c_status_code > 0
`).all();
for (const r of statusRows) connectedIds.add(r.c_personid);

console.error(`Found ${connectedIds.size} persons with data connections`);

// 提取人物 — 分批处理避免内存溢出
console.error("Extracting persons from BIOG_MAIN...");
const totalInDb = db.prepare("SELECT COUNT(*) as c FROM BIOG_MAIN").get().c;
console.error(`Total BIOG_MAIN rows: ${totalInDb}`);

const persons = [];
const BATCH = 50000;
let processed = 0;
let offset = 0;

while (true) {
  const rows = db.prepare(`
    SELECT c_personid, c_name_chn, c_index_year, c_birthyear, c_deathyear,
           c_dy, c_female, c_fl_earliest_year, c_fl_latest_year
    FROM BIOG_MAIN
    ORDER BY c_personid
    LIMIT ${BATCH} OFFSET ${offset}
  `).all();

  if (rows.length === 0) break;

  for (const r of rows) {
    processed++;

    // 跳过"未詳"
    if (!r.c_name_chn || r.c_name_chn === "未詳") continue;

    // 需要有效年份
    const indexYear = validYear(r.c_index_year) ? r.c_index_year
      : validYear(r.c_birthyear) ? r.c_birthyear
      : validYear(r.c_deathyear) ? r.c_deathyear
      : validYear(r.c_fl_earliest_year) ? r.c_fl_earliest_year
      : validYear(r.c_fl_latest_year) ? r.c_fl_latest_year
      : null;

    if (indexYear === null) continue;

    // 朝代映射
    const dynasty = mapDynasty(r.c_dy);
    if (!dynasty) continue;

    // 需要有关联数据（关系/官职/身份/著作）
    if (!connectedIds.has(r.c_personid)) continue;

    // 计算重要性
    // birth + death known = +2, has connections = +1, more specific year = +1
    let importance = 1;
    if (validYear(r.c_birthyear) && validYear(r.c_deathyear)) importance += 2;
    if (validYear(r.c_index_year)) importance += 1;

    persons.push({
      id: makeId(r.c_personid),
      name: r.c_name_chn.trim(),
      dynasty,
      indexYear,
      birthYear: validYear(r.c_birthyear) ? r.c_birthyear : null,
      deathYear: validYear(r.c_deathyear) ? r.c_deathyear : null,
      importance,
      clusterSize: Math.round(Math.sqrt(importance) * 2.5 * 10) / 10,
      _dbId: r.c_personid, // 保留原始 ID 供后续关联
    });
  }

  offset += BATCH;
  console.error(`  Processed ${processed}/${totalInDb}, kept ${persons.length}`);
}

// ── 重要性排序后保留前 N 个 ───────────────────────────────────
// 655K 人太多，按重要性排序取前 15000
const MAX_PERSONS = 500000;  // 全量
persons.sort((a, b) => b.importance - a.importance);
const top = persons.slice(0, MAX_PERSONS);

// 重新规范化 importance 和 clusterSize
const maxImp = top[0]?.importance ?? 1;
for (const p of top) {
  p.importance = Math.round((p.importance / maxImp) * 100);
  p.clusterSize = Math.round(Math.sqrt(p.importance) * 2 * 10) / 10;
}

console.error(`Final count: ${top.length} persons`);

// ── 收集 dynasty 统计 ──────────────────────────────────────────
const dynCounts = {};
for (const p of top) {
  dynCounts[p.dynasty] = (dynCounts[p.dynasty] || 0) + 1;
}
console.error("Dynasty distribution:", JSON.stringify(dynCounts));

// ── 写入输出 ────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

// 写入 persons.index.json（去掉 _dbId 内部字段）
const cleanPersons = top.map(({ _dbId, ...rest }) => rest);
writeFileSync(resolve(OUT_DIR, "persons.index.json"), JSON.stringify(cleanPersons), "utf-8");
console.error(`Wrote ${cleanPersons.length} persons to persons.index.json`);

// ── 预览 ────────────────────────────────────────────────────────
console.log(JSON.stringify(cleanPersons.slice(0, 10), null, 2));

db.close();
console.error("Done.");
