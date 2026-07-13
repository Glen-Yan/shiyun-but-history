/**
 * 共享拾取句柄 — FlyControls 通过它做 GPU 拾取
 * 从诗云移植简化版（只要人物星点，不需要行星）
 */
import type { PersonIndex } from "../data/contract";

export interface PickResult {
  kind: "person";
  person: PersonIndex;
}

export const pickTargets: {
  persons: PersonIndex[];
  pick: ((cssX: number, cssY: number) => PickResult | null) | null;
} = { persons: [], pick: null };
