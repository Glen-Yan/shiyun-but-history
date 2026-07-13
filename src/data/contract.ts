// ============================================================================
// DATA CONTRACT — 历史人物星图的类型定义
// 管线输出 JSON，前端用这些接口消费数据
// ============================================================================

/** 入口 manifest — 启动时最先加载 */
export interface Manifest {
  version: number;
  personCount: number;
  relationCount: number;
  dynastyKeys: string[];
  shardSize: number;
  shardCount: number;
}

/** 朝代定义 */
export interface DynastyDef {
  key: string;        // 内部 ID: "tang" "song" 等
  name: string;       // 中文名: "唐" "宋"
  startYear: number;
  endYear: number;
  color: string;      // 主题色 hex
}

/** 人物索引条目 — persons.index.json，启动时全量加载 */
export interface PersonIndex {
  id: string;          // 短 hash ID
  name: string;        // 中文名
  dynasty: string;     // 朝代 key
  indexYear: number;   // 活跃年份（用于排序/定位）
  birthYear: number | null;
  deathYear: number | null;
  importance: number;  // 重要性评分
  clusterSize: number; // 星点大小
}

/** 人物详情 — persons/{xx}.json，点击时按需加载 */
export interface PersonRecord {
  id: string;
  name: string;
  dynasty: string;
  birthYear: number | null;
  deathYear: number | null;
  indexYear: number;
  gender: number;
  nativePlace: string | null;
  offices: PersonOffice[];
  statuses: string[];
  works: string[];
}

export interface PersonOffice {
  title: string;
  place: string;
  startYear: number;
  endYear: number | null;
}

/** 关系边 */
export interface RelationEdge {
  from: string;
  to: string;
  type: RelationType;
  label: string;
  source: string | null;
}

export type RelationType = "teacher_student" | "kinship" | "friend" | "political" | "academic" | "other";

/** 关系类型的中文标签和颜色 */
export const RELATION_LABELS: Record<RelationType, { label: string; color: string }> = {
  teacher_student: { label: "师生", color: "#ff9248" },
  kinship:         { label: "亲属", color: "#ff6d92" },
  friend:          { label: "交往", color: "#48c9b0" },
  political:       { label: "同僚", color: "#85c1e9" },
  academic:        { label: "学术", color: "#af7ac5" },
  other:           { label: "其他", color: "#bdc3c7" },
};
