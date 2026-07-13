#!/usr/bin/env node
/**
 * build-index.mjs
 * 整合管线产出，生成 manifest.json
 * 同时从 CBDB 提取人物详情（官职、地址、身份）
 */

import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";

const DB_PATH = process.argv[2] || "D:/桌面/latest/cbdb_20260711.sqlite3";
const DATA_DIR = process.argv[3] || "public/data";

// ── 加载人物索引 ─────────────────────────────────────────────────
const index = JSON.parse(readFileSync(resolve(DATA_DIR, "persons.index.json"), "utf-8"));
console.error(`Loaded ${index.length} persons`);

const db = new DatabaseSync(DB_PATH);

// ── 重建 dbId → ourId 映射 ──────────────────────────────────────
// 需要重新从 CBDB 查找每个人物的原始 c_personid
// 我们用 name + dynasty 匹配（因为 extract-persons 去掉了 _dbId）
const allBio = db.prepare(`
  SELECT c_personid, c_name_chn, c_dy, c_index_year, c_birthyear, c_deathyear,
         c_female, c_fl_earliest_year, c_fl_latest_year
  FROM BIOG_MAIN WHERE c_name_chn IS NOT NULL AND c_name_chn != '未詳'
`).all();

// Dynasty mapping (same as extract-persons)
const DM = {1:"xianqin",2:"han",83:"han",25:"han",29:"han",46:"han",61:"qin",3:"weijin",23:"weijin",26:"weijin",27:"weijin",28:"weijin",30:"weijin",31:"weijin",32:"weijin",35:"weijin",37:"weijin",39:"weijin",40:"weijin",41:"weijin",42:"weijin",44:"weijin",45:"weijin",50:"weijin",51:"weijin",53:"weijin",56:"weijin",60:"weijin",62:"weijin",63:"weijin",64:"weijin",65:"weijin",69:"weijin",70:"weijin",71:"weijin",72:"weijin",73:"weijin",74:"weijin",76:"weijin",82:"weijin",87:"weijin",4:"weijin",24:"weijin",68:"weijin",5:"sui",6:"tang",77:"tang",81:"tang",7:"wudai",34:"wudai",47:"wudai",48:"wudai",49:"wudai",52:"wudai",8:"wudai",9:"wudai",10:"wudai",11:"wudai",12:"wudai",13:"wudai",36:"wudai",38:"wudai",55:"wudai",66:"wudai",75:"wudai",15:"song",16:"liao",59:"liao",17:"jin",57:"jin",18:"yuan",79:"yuan",19:"ming",80:"ming",85:"ming",86:"ming",20:"qing",21:"minguo",22:"dangdai",78:"song",14:"song",84:"ming",58:"ming",67:"tang"};

function mapDyn(c) { return DM[c] || null; }

// Build name+dyn → dbId map
const nameDynToDbId = new Map();
for (const r of allBio) {
  const dy = mapDyn(r.c_dy);
  if (!dy) continue;
  const key = r.c_name_chn.trim() + "|" + dy;
  // Keep all matches (may have multiple people with same name+dyn, pick best)
  if (!nameDynToDbId.has(key)) {
    nameDynToDbId.set(key, []);
  }
  nameDynToDbId.get(key).push(r);
}
console.error(`Built name→dbId map with ${nameDynToDbId.size} entries`);

// Find the best matching dbId for each person in our index
const ourIdToDbId = new Map();
for (const p of index) {
  const candidates = nameDynToDbId.get(p.name + "|" + p.dynasty);
  if (!candidates || candidates.length === 0) continue;
  // Pick the one with closest indexYear
  let best = candidates[0];
  let bestDiff = Math.abs((best.c_index_year || best.c_birthyear || 0) - p.indexYear);
  for (const c of candidates) {
    const diff = Math.abs((c.c_index_year || c.c_birthyear || 0) - p.indexYear);
    if (diff < bestDiff) { best = c; bestDiff = diff; }
  }
  ourIdToDbId.set(p.id, best.c_personid);
}
console.error(`Matched ${ourIdToDbId.size}/${index.length} person DB IDs`);

// ── 加载辅助码表 ──────────────────────────────────────────────
const officeNames = new Map();
db.prepare("SELECT c_office_id, c_office_chn FROM OFFICE_CODES").all()
  .forEach(r => officeNames.set(r.c_office_id, r.c_office_chn));

const addrNames = new Map();
db.prepare("SELECT c_addr_id, c_name_chn FROM ADDR_CODES WHERE c_addr_id > 0").all()
  .forEach(r => addrNames.set(r.c_addr_id, r.c_name_chn));

const statusNames = new Map();
db.prepare("SELECT c_status_code, c_status_desc_chn FROM STATUS_CODES WHERE c_status_code > 0").all()
  .forEach(r => statusNames.set(r.c_status_code, r.c_status_desc_chn));

// ── 为每个人物查询详情 ────────────────────────────────────────
console.error("Building person details...");
const personDetails = {};

let done = 0;
for (const p of index) {
  const dbId = ourIdToDbId.get(p.id);
  if (!dbId) continue;

  // 籍贯
  const addrs = db.prepare(`
    SELECT c_addr_id FROM BIOG_ADDR_DATA
    WHERE c_personid = ? AND c_addr_type > 0
    LIMIT 3
  `).all(dbId);
  const nativePlace = addrs.map(a => addrNames.get(a.c_addr_id) || null).filter(Boolean)[0] || null;

  // 官职（POSTED_TO_OFFICE_DATA 通过 c_posting_id 关联 POSTED_TO_ADDR_DATA 获取地点）
  const offices = db.prepare(`
    SELECT o.c_office_id, o.c_posting_id, o.c_firstyear, o.c_lastyear
    FROM POSTED_TO_OFFICE_DATA o
    WHERE o.c_personid = ?
    ORDER BY o.c_firstyear
    LIMIT 8
  `).all(dbId);
  const officeList = offices.map(o => {
    // 查地点
    let place = "未知地点";
    try {
      const addrRow = db.prepare("SELECT c_addr_id FROM POSTED_TO_ADDR_DATA WHERE c_posting_id = ? LIMIT 1").get(o.c_posting_id);
      if (addrRow?.c_addr_id) place = addrNames.get(addrRow.c_addr_id) || "未知地点";
    } catch {}
    return {
      title: officeNames.get(o.c_office_id) || "未知官职",
      place,
      startYear: o.c_firstyear || p.indexYear,
      endYear: o.c_lastyear || null,
    };
  });

  // 社会身份
  const statuses = db.prepare(`
    SELECT c_status_code FROM STATUS_DATA
    WHERE c_personid = ? AND c_status_code > 0
    LIMIT 8
  `).all(dbId);
  const statusList = statuses.map(s => statusNames.get(s.c_status_code)).filter(Boolean);

  // 著作（从 BIOG_TEXT_DATA + TEXT_CODES）
  const works = [];
  const textRows = db.prepare(`
    SELECT c_textid FROM BIOG_TEXT_DATA WHERE c_personid = ? LIMIT 5
  `).all(dbId);
  for (const t of textRows) {
    try {
      const titleRow = db.prepare("SELECT c_title_chn FROM TEXT_CODES WHERE c_textid = ?").get(t.c_textid);
      if (titleRow?.c_title_chn) works.push(titleRow.c_title_chn);
    } catch {}
  }

  personDetails[p.id] = {
    id: p.id,
    name: p.name,
    dynasty: p.dynasty,
    birthYear: p.birthYear,
    deathYear: p.deathYear,
    indexYear: p.indexYear,
    gender: 0,
    nativePlace,
    offices: officeList,
    statuses: statusList,
    works,
  };

  done++;
  if (done % 1000 === 0) console.error(`  Details: ${done}/${index.length}`);
}

console.error(`Built ${Object.keys(personDetails).length} person details`);

// ── 分片写入 ──────────────────────────────────────────────────
const SHARD = 256;
const shards = {};
for (const [id, detail] of Object.entries(personDetails)) {
  const bucket = (id.charCodeAt(1) || 0) % SHARD;
  const key = bucket.toString(16).padStart(2, "0");
  if (!shards[key]) shards[key] = {};
  shards[key][id] = detail;
}

mkdirSync(resolve(DATA_DIR, "persons"), { recursive: true });
for (const [key, data] of Object.entries(shards)) {
  writeFileSync(resolve(DATA_DIR, "persons", `${key}.json`), JSON.stringify(data), "utf-8");
}
console.error(`Wrote ${Object.keys(shards).length} detail shards`);

// ── 生成 manifest ──────────────────────────────────────────────
const relations = JSON.parse(readFileSync(resolve(DATA_DIR, "relations.json"), "utf-8"));
const dynastyKeys = [...new Set(index.map(p => p.dynasty))];

const manifest = {
  version: 1,
  personCount: index.length,
  relationCount: relations.length,
  dynastyKeys,
  shardSize: SHARD,
  shardCount: Object.keys(shards).length,
};

writeFileSync(resolve(DATA_DIR, "manifest.json"), JSON.stringify(manifest), "utf-8");
console.error("Wrote manifest.json");
console.log(JSON.stringify(manifest, null, 2));

// ── 生成 dynasties.json ───────────────────────────────────────
// use the dynasties from our data layer
const DYNASTY_DEFS = {
  xianqin:  { key:"xianqin",  name:"先秦",   startYear:-2000, endYear:-221,  color:"#c9a96e" },
  qin:      { key:"qin",      name:"秦",     startYear:-221,  endYear:-206,  color:"#8b4513" },
  han:      { key:"han",      name:"汉",     startYear:-206,  endYear:220,   color:"#cd5c5c" },
  weijin:   { key:"weijin",   name:"魏晋南北朝", startYear:220, endYear:589, color:"#7b9e8c" },
  sui:      { key:"sui",      name:"隋",     startYear:581,   endYear:618,   color:"#708090" },
  tang:     { key:"tang",     name:"唐",     startYear:618,   endYear:907,   color:"#e8c84a" },
  wudai:    { key:"wudai",    name:"五代十国", startYear:907,  endYear:960,   color:"#b8860b" },
  song:     { key:"song",     name:"宋",     startYear:960,   endYear:1279,  color:"#5dbea3" },
  liao:     { key:"liao",     name:"辽",     startYear:907,   endYear:1125,  color:"#c4a35a" },
  jin:      { key:"jin",      name:"金",     startYear:1115,  endYear:1234,  color:"#d4a574" },
  yuan:     { key:"yuan",     name:"元",     startYear:1271,  endYear:1368,  color:"#517d99" },
  ming:     { key:"ming",     name:"明",     startYear:1368,  endYear:1644,  color:"#c0392b" },
  qing:     { key:"qing",     name:"清",     startYear:1644,  endYear:1912,  color:"#2c3e50" },
  minguo:   { key:"minguo",   name:"民国",   startYear:1912,  endYear:1949,  color:"#3498db" },
  dangdai:  { key:"dangdai",  name:"当代",   startYear:1949,  endYear:2025,  color:"#7dcea0" },
};

const dynasties = dynastyKeys.map(k => DYNASTY_DEFS[k]).filter(Boolean);
writeFileSync(resolve(DATA_DIR, "dynasties.json"), JSON.stringify(dynasties), "utf-8");
console.error("Wrote dynasties.json");

db.close();
console.error("Done.");
