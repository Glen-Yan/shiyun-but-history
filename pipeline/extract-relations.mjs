#!/usr/bin/env node
/**
 * extract-relations.mjs
 * 从 CBDB ASSOC_DATA + KIN_DATA 提取人物关系
 *
 * 输入：persons.index.json（从 extract-persons.mjs 产出）
 * 输出：public/data/relations.json
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = process.argv[2] || "D:/桌面/latest/cbdb_20260711.sqlite3";
const INDEX_PATH = process.argv[3] || "public/data/persons.index.json";
const OUT_DIR = process.argv[4] || "public/data";

// ── 加载人物索引 ─────────────────────────────────────────────────
const persons = JSON.parse(readFileSync(INDEX_PATH, "utf-8"));
const personSet = new Set(persons.map(p => p.id));

// 建立 _dbId → 我们的 id 映射
const dbIdToOurId = new Map();
// 需要在管线第一步保留 _dbId... 但我们目前去掉了
// 重新从 CBDB 加载映射
console.error("Loading person ID mapping...");
const db = new DatabaseSync(DB_PATH);
const allIdRows = db.prepare("SELECT c_personid FROM BIOG_MAIN").all();
const dbIdToName = new Map();
for (const r of allIdRows) {
  dbIdToName.set(r.c_personid, true);
}

// 从 persons.index.json 重建映射：name + dynasty → id
const nameDynToId = new Map();
for (const p of persons) {
  nameDynToId.set(p.name + "|" + p.dynasty, p.id);
}

// ── 读取 ASSOC_CODES 类型映射 ──────────────────────────────────
console.error("Loading association type codes...");
const assocCodes = db.prepare(`
  SELECT c_assoc_code, c_assoc_desc_chn, c_assoc_desc
  FROM ASSOC_CODES WHERE c_assoc_code > 0
`).all();
const assocCodeMap = new Map();
for (const r of assocCodes) {
  assocCodeMap.set(r.c_assoc_code, r.c_assoc_desc_chn);
}

// 将 ASSOC_CODES 归类到我们的 RelationType
function classifyAssoc(desc) {
  if (!desc) return "other";
  // 师生/学术传承
  if (/師|生|門人|弟子|學侶|門下|授業|受經|從學|從游|從遊|講學|學派|傳經|欣賞|器重/.test(desc)) return "teacher_student";
  // 朋友/同年/交往/赠诗
  if (/友|同年|交往|交游|唱和|來往|知己|知交|故交|舊友|世交|忘年|贈詩|送別|臨別/.test(desc)) return "friend";
  // 政治/官场
  if (/黨|政|官|彈劾|舉|薦|僚|恩主|幕僚|座主|門生|下屬|上司|同僚/.test(desc)) return "political";
  // 学术/写作/文字交往
  if (/學術|論爭|論辯|攻訐|辯難|往復|墓誌|書序|書跋|祭文|傳記|墓表|神道碑|行狀|題詠|作跋|畫贊|挽詩|哀辭|答書|致書|為Y之|為Y所/.test(desc)) return "academic";
  // 亲属（社会关系中的亲属类）
  if (/親|戚|族|姻/.test(desc)) return "kinship";
  return "other";
}

// ── 提取关系 ──────────────────────────────────────────────────
const relations = [];
const seenEdges = new Set(); // 去重

function addRelation(fromId, toId, type, label) {
  if (!personSet.has(fromId) || !personSet.has(toId)) return;
  if (fromId === toId) return;
  const key = [fromId, toId, type].sort().join("|");
  if (seenEdges.has(key)) return;
  seenEdges.add(key);
  relations.push({ from: fromId, to: toId, type, label, source: null });
}

// 此处需要更高效的方式 — 直接从 CBDB 查询关系，然后用 name+dynasty 匹配
// 简化方案：直接在 CBDB 中查找存在于我们人物列表中的关系
console.error("Building DB person ID → our ID map...");
// 重新查询 BIOG_MAIN 建立 dbId → (name, dynasty) → ourId
const dbIdToOur = new Map();
const allPersons = db.prepare(`
  SELECT c_personid, c_name_chn, c_dy FROM BIOG_MAIN
  WHERE c_name_chn IS NOT NULL AND c_name_chn != '未詳'
`).all();

// 构建 name+dynasty → ourId 的快速查找
for (const r of allPersons) {
  // 只处理在我们列表中的人
  const dyKey = DYNASTY_MAP_INLINE(r.c_dy);
  if (!dyKey) continue;
  const key = r.c_name_chn.trim() + "|" + dyKey;
  const ourId = nameDynToId.get(key);
  if (ourId) dbIdToOur.set(r.c_personid, ourId);
}

function DYNASTY_MAP_INLINE(cDy) {
  const m = {1:"xianqin",2:"han",83:"han",25:"han",29:"han",46:"han",61:"qin",3:"weijin",23:"weijin",26:"weijin",27:"weijin",28:"weijin",30:"weijin",31:"weijin",32:"weijin",35:"weijin",37:"weijin",39:"weijin",40:"weijin",41:"weijin",42:"weijin",44:"weijin",45:"weijin",50:"weijin",51:"weijin",53:"weijin",56:"weijin",60:"weijin",62:"weijin",63:"weijin",64:"weijin",65:"weijin",69:"weijin",70:"weijin",71:"weijin",72:"weijin",73:"weijin",74:"weijin",76:"weijin",82:"weijin",87:"weijin",4:"weijin",24:"weijin",68:"weijin",5:"sui",6:"tang",77:"tang",81:"tang",7:"wudai",34:"wudai",47:"wudai",48:"wudai",49:"wudai",52:"wudai",8:"wudai",9:"wudai",10:"wudai",11:"wudai",12:"wudai",13:"wudai",36:"wudai",38:"wudai",55:"wudai",66:"wudai",75:"wudai",15:"song",16:"liao",59:"liao",17:"jin",57:"jin",18:"yuan",79:"yuan",19:"ming",80:"ming",85:"ming",86:"ming",20:"qing",21:"minguo",22:"dangdai",78:"song",14:"song",84:"ming",58:"ming",67:"tang"};
  return m[cDy] || null;
}

console.error(`Mapped ${dbIdToOur.size} person IDs`);

// 提取 ASSOC_DATA 关系
console.error("Extracting social associations...");
const assocBatch = 50000;
let assocOffset = 0;
let assocCount = 0;
while (true) {
  const rows = db.prepare(`
    SELECT c_personid, c_assoc_id, c_assoc_code
    FROM ASSOC_DATA
    WHERE c_assoc_code > 0
    LIMIT ${assocBatch} OFFSET ${assocOffset}
  `).all();
  if (rows.length === 0) break;

  for (const r of rows) {
    const fromId = dbIdToOur.get(r.c_personid);
    const toId = dbIdToOur.get(r.c_assoc_id);
    if (!fromId || !toId) continue;

    const desc = assocCodeMap.get(r.c_assoc_code) || "";
    const type = classifyAssoc(desc);
    addRelation(fromId, toId, type, desc);
    assocCount++;
  }
  assocOffset += assocBatch;
  console.error(`  ASSOC: ${assocOffset} processed, ${assocCount} matched`);
}

// 提取 KIN_DATA 关系
console.error("Extracting kinship relations...");
const kinBatch = 50000;
let kinOffset = 0;
let kinCount = 0;
while (true) {
  const rows = db.prepare(`
    SELECT c_personid, c_kin_id, c_kin_code
    FROM KIN_DATA
    WHERE c_kin_code > 0
    LIMIT ${kinBatch} OFFSET ${kinOffset}
  `).all();
  if (rows.length === 0) break;

  for (const r of rows) {
    const fromId = dbIdToOur.get(r.c_personid);
    const toId = dbIdToOur.get(r.c_kin_id);
    if (!fromId || !toId) continue;

    addRelation(fromId, toId, "kinship", "亲属");
    kinCount++;
  }
  kinOffset += kinBatch;
  console.error(`  KIN: ${kinOffset} processed, ${kinCount} matched`);
}

console.error(`Total relations: ${relations.length}`);

// ── 写入 ──────────────────────────────────────────────────────
writeFileSync(resolve(OUT_DIR, "relations.json"), JSON.stringify(relations), "utf-8");
console.error(`Wrote ${relations.length} relations to relations.json`);

// ── 预览 ──────────────────────────────────────────────────────
console.log(JSON.stringify(relations.slice(0, 15), null, 2));

db.close();
console.error("Done.");
