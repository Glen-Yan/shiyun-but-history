/**
 * 数据加载层 — 流式分片加载
 * 1. 先加载 chunk 0（即时显示 ~25K 人）
 * 2. 后台逐步加载剩余 9 个分片
 * 3. 每次新分片到达 → 通知 PersonStars 增量更新
 */
import type { Manifest, PersonIndex, PersonRecord, RelationEdge } from "./contract";
import { SAMPLE_MANIFEST, SAMPLE_INDEX, SAMPLE_RELATIONS, SAMPLE_DETAILS } from "./sample";

let _manifest: Manifest | null = null;
let _index: PersonIndex[] = [];
let _relations: RelationEdge[] = [];
const _details = new Map<string, PersonRecord>();
let _loading = false;
let _loaded = false;

// id → index 快速查找
let _byId: Map<string, PersonIndex> = new Map();
// 搜索索引: 前缀 → 匹配的 person id 集合
const _searchIdx: Map<string, Set<string>> = new Map();

// 增量更新回调（PersonStars 订阅）
let _onChunk: (() => void) | null = null;
export function onNewChunk(fn: () => void) { _onChunk = fn; }

function rebuildMaps() {
  _byId = new Map();
  for (const p of _index) _byId.set(p.id, p);
  // 构建搜索索引
  _searchIdx.clear();
  for (const p of _index) {
    const name = p.name;
    for (let len = 1; len <= name.length; len++) {
      const prefix = name.slice(0, len);
      if (!_searchIdx.has(prefix)) _searchIdx.set(prefix, new Set());
      _searchIdx.get(prefix)!.add(p.id);
    }
  }
}

function loadSampleData() {
  _manifest = SAMPLE_MANIFEST;
  _index = SAMPLE_INDEX;
  _relations = SAMPLE_RELATIONS;
  for (const [id, rec] of Object.entries(SAMPLE_DETAILS)) _details.set(id, rec);
  rebuildMaps();
}

// ── 公开 API ────────────────────────────────────────────────────
export function getManifest(): Manifest { return _manifest ?? SAMPLE_MANIFEST; }
export function getIndex(): PersonIndex[] { return _index.length > 0 ? _index : SAMPLE_INDEX; }
export function getRelations(): RelationEdge[] { return _relations.length > 0 ? _relations : SAMPLE_RELATIONS; }
export function getPersonById(id: string): PersonIndex | undefined { return _byId.get(id); }
export function getDetails(id: string): PersonRecord | undefined { return _details.get(id); }
export function isLoaded(): boolean { return _loaded; }
export function getPersonCount(): number { return _index.length; }

/** 快速搜索（前缀匹配，用预建索引） */
export function searchByName(q: string, limit = 20): PersonIndex[] {
  const trimmed = q.trim();
  if (!trimmed) return [];
  const ids = _searchIdx.get(trimmed);
  if (ids) {
    const out: PersonIndex[] = [];
    for (const id of ids) {
      const p = _byId.get(id);
      if (p) out.push(p);
      if (out.length >= limit) break;
    }
    return out;
  }
  // 回退到模糊搜索
  const lower = trimmed.toLowerCase();
  const results: PersonIndex[] = [];
  for (const p of _index) {
    if (p.name.includes(trimmed) || p.name.toLowerCase().includes(lower)) {
      results.push(p);
      if (results.length >= limit) break;
    }
  }
  return results;
}

export async function loadData(): Promise<void> {
  if (_loading || _loaded) return;
  _loading = true;

  try {
    const base = "/data/";
    let manifest: Manifest | null = null;
    try {
      const resp = await fetch(base + "manifest.json");
      if (resp.ok) manifest = await resp.json();
    } catch {}

    if (manifest && manifest.personCount > 0 && manifest.shardSize > 200) {
      // 新版分片格式：分 chunk 流式加载
      _manifest = manifest;
      const totalChunks = manifest.shardCount;

      // 1. 同步加载 chunk 0（首屏 — 必须完成才算 ready）
      try {
        const resp = await fetch(base + "persons/index_0.json");
        if (resp.ok) {
          const chunk: PersonIndex[] = await resp.json();
          _index = chunk;
          rebuildMaps();
          console.log(`Chunk 0 loaded: ${chunk.length} persons (first screen ready)`);
        }
      } catch (e) { console.warn("Chunk 0 failed:", e); }

      // 2. 首屏就绪，函数返回，关闭 loading（剩余数据后台加载）
      _loaded = true;

      // 3. 后台流式加载剩余 chunk（不阻塞首屏）
      (async () => {
        for (let i = 1; i < totalChunks; i++) {
          try {
            const resp = await fetch(`${base}persons/index_${i}.json`);
            if (resp.ok) {
              const chunk: PersonIndex[] = await resp.json();
              _index = [..._index, ...chunk];
              rebuildMaps();
              _onChunk?.();
              console.log(`Chunk ${i} loaded: ${chunk.length} persons (total: ${_index.length})`);
            }
          } catch (e) { console.warn(`Chunk ${i} failed:`, e); }
        }

        // 4. 后台加载关系
        try {
          const relResp = await fetch(base + "relations.json");
          if (relResp.ok) {
            _relations = await relResp.json();
            console.log(`Relations loaded: ${_relations.length}`);
          }
        } catch {}
      })();

    } else if (manifest && manifest.personCount > 0) {
      // 旧版格式：单文件
      try {
        const [index, relations] = await Promise.all([
          fetch(base + "persons.index.json").then(r => { if (!r.ok) throw Error(); return r.json(); }),
          fetch(base + "relations.json").then(r => { if (!r.ok) throw Error(); return r.json(); }),
        ]);
        _manifest = manifest;
        _index = index;
        _relations = relations;
        rebuildMaps();
        console.log(`Loaded: ${index.length} persons, ${relations.length} relations`);
      } catch {
        loadSampleData();
      }
    } else {
      loadSampleData();
    }

    if (_index.length === 0) loadSampleData();
    _loaded = true;
  } finally {
    _loading = false;
  }
}

export async function loadDetails(id: string): Promise<PersonRecord | null> {
  const cached = _details.get(id);
  if (cached) return cached;
  const bucket = (id.charCodeAt(1) || 0) % 256;
  const shard = bucket.toString(16).padStart(2, "0");
  try {
    const resp = await fetch(`/data/persons/${shard}.json`);
    if (!resp.ok) return null;
    const data: Record<string, PersonRecord> = await resp.json();
    for (const [k, v] of Object.entries(data)) _details.set(k, v);
    return data[id] ?? null;
  } catch { return null; }
}
