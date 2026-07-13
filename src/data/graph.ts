/**
 * 关系图 — BFS 最短路径查找
 * "六度分隔"：两个人物的最短关系链
 * 每一步都标注具体关系类型（方向感知）
 */
import { getRelations, getPersonById } from "./load";
import type { RelationEdge } from "./contract";

type AdjList = Map<string, string[]>; // personId → 邻居 personId 列表

let _adj: AdjList | null = null;
let _built = false;

/** 构建邻接表 */
export function buildGraph(): AdjList {
  if (_built && _adj) return _adj;
  const rels = getRelations();
  _adj = new Map();
  for (const r of rels) {
    addEdge(_adj, r.from, r.to);
  }
  _built = true;
  return _adj;
}

function addEdge(g: AdjList, a: string, b: string) {
  if (!g.has(a)) g.set(a, []);
  if (!g.has(b)) g.set(b, []);
  g.get(a)!.push(b);
  g.get(b)!.push(a);
}

/** 重建（数据更新时调用） */
export function resetGraph() {
  _adj = null;
  _built = false;
}

/** 路径上一条边的方向感知信息 */
export interface PathEdge {
  /** 这条 relation 的原始数据 */
  edge: RelationEdge;
  /** true = 路径方向与 edge.from→edge.to 一致 */
  forward: boolean;
}

/** BFS 最短路径结果 */
export interface PathResult {
  /** 路径上的 personId 列表（含起点和终点） */
  path: string[];
  /** 路径上每条边的 relation 信息（含方向） */
  edges: PathEdge[];
  /** 路径长度（边数） */
  length: number;
}

/**
 * 获取关系标签（根据遍历方向调整）
 * - forward=true:  "A 是 B 的恩主" → 直接显示原始标签
 * - forward=false: "A 是 B 的恩主" → 标注为"反向"以便理解
 */
export function edgeLabel(pe: PathEdge): string {
  return pe.edge.label || pe.edge.type;
}

/**
 * BFS 查找从 startId 到 endId 的最短关系路径
 * 返回 null 表示无关系
 */
export function findShortestPath(startId: string, endId: string): PathResult | null {
  if (startId === endId) return { path: [startId], edges: [], length: 0 };

  const graph = buildGraph();
  const startNode = graph.get(startId);
  if (!startNode) return null;

  // BFS
  const visited = new Set<string>([startId]);
  const parent = new Map<string, string>();
  const queue: string[] = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = graph.get(current) || [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor)) continue;
      visited.add(neighbor);
      parent.set(neighbor, current);

      if (neighbor === endId) {
        // 回溯路径
        const path: string[] = [];
        let node = endId;
        while (node) {
          path.unshift(node);
          node = parent.get(node)!;
        }

        // 找路径上每条边的 relation，记录方向
        const edges: PathEdge[] = [];
        const allRels = getRelations();
        for (let i = 0; i < path.length - 1; i++) {
          const a = path[i], b = path[i + 1];
          const rel = allRels.find(
            r => (r.from === a && r.to === b) || (r.from === b && r.to === a)
          );
          if (rel) {
            edges.push({
              edge: rel,
              forward: rel.from === a, // 路径方向与关系数据方向一致
            });
          }
        }
        return { path, edges, length: path.length - 1 };
      }

      queue.push(neighbor);
    }
  }

  return null;
}

/**
 * 格式化路径为人类可读文本（含关系标注）
 */
export function formatPath(result: PathResult | null): string {
  if (!result) return "无关系";
  if (result.length === 0) return "同一个人";

  const parts: string[] = [];
  for (let i = 0; i < result.path.length; i++) {
    const p = getPersonById(result.path[i]);
    parts.push(p?.name ?? result.path[i]);
    if (i < result.edges.length) {
      const e = result.edges[i];
      parts.push(` —[${edgeLabel(e)}]→ `);
    }
  }
  return parts.join("");
}
