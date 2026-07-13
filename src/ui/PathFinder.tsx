/**
 * 关系路径查找器 — "六度分隔"
 * 选两个人物 → BFS 找最短路径 → 显示路径链 + 高亮连线
 */
import { useState } from "react";
import { useStore } from "../state/store";
import { searchByName, getPersonById } from "../data/load";
import { findShortestPath, edgeLabel } from "../data/graph";
import { RELATION_LABELS, type RelationType } from "../data/contract";

export function PathFinder() {
  const pathStart = useStore(s => s.pathStart);
  const pathEnd = useStore(s => s.pathEnd);
  const pathResult = useStore(s => s.pathResult);
  const setPathStart = useStore(s => s.setPathStart);
  const setPathEnd = useStore(s => s.setPathEnd);
  const setPathResult = useStore(s => s.setPathResult);
  const [open, setOpen] = useState(false);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [r1, setR1] = useState<{ id: string; name: string }[]>([]);
  const [r2, setR2] = useState<{ id: string; name: string }[]>([]);
  const [searched, setSearched] = useState(false); // 是否已搜索过

  const startPerson = pathStart ? getPersonById(pathStart) : null;
  const endPerson = pathEnd ? getPersonById(pathEnd) : null;

  return (
    <>
      {/* 触发按钮 — 突出显示 */}
      <button
        className="hud-btn"
        onClick={() => setOpen(!open)}
        title="关系寻路 · 六度分隔"
        style={{
          background: open || pathResult ? "rgba(79, 195, 247, 0.18)" : undefined,
          border: open || pathResult ? "1px solid rgba(79, 195, 247, 0.35)" : undefined,
          fontWeight: pathResult ? 600 : undefined,
        }}
      >
        🔗 关系寻路{pathResult ? ` · ${pathResult.path.length - 1}步` : ""}
      </button>

      {open && (
        <div className="search-panel" style={{ top: 52 }}>
          <div className="search-header">
            <span style={{ fontSize: 13, fontWeight: 600 }}>关系寻路 · 六度分隔</span>
            <button className="hud-btn" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div style={{ padding: "8px 12px" }}>
            {/* 起点 */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#4fc3f7", marginBottom: 4 }}>
                {startPerson ? `🏁 ${startPerson.name}` : "选择起点人物"}
              </div>
              {!startPerson && (
                <>
                  <input
                    className="search-input"
                    placeholder="搜索…"
                    value={q1}
                    onChange={e => {
                      setQ1(e.target.value);
                      setR1(searchByName(e.target.value, 8).map(p => ({ id: p.id, name: p.name })));
                    }}
                  />
                  {r1.length > 0 && (
                    <div style={{ maxHeight: 120, overflow: "auto", marginTop: 4 }}>
                      {r1.map(p => (
                        <div key={p.id} className="relation-item" style={{ borderLeftColor: "#4fc3f7", padding: 4 }}
                          onClick={() => { setPathStart(p.id); setQ1(""); setR1([]); }}>
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {startPerson && (
                <button className="hud-btn" style={{ fontSize: 11 }} onClick={() => { setPathStart(null); setPathResult(null); setSearched(false); }}>
                  清除
                </button>
              )}
            </div>

            {/* 终点 */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#ff8a65", marginBottom: 4 }}>
                {endPerson ? `🏁 ${endPerson.name}` : "选择终点人物"}
              </div>
              {!endPerson && (
                <>
                  <input
                    className="search-input"
                    placeholder="搜索…"
                    value={q2}
                    onChange={e => {
                      setQ2(e.target.value);
                      setR2(searchByName(e.target.value, 8).map(p => ({ id: p.id, name: p.name })));
                    }}
                  />
                  {r2.length > 0 && (
                    <div style={{ maxHeight: 120, overflow: "auto", marginTop: 4 }}>
                      {r2.map(p => (
                        <div key={p.id} className="relation-item" style={{ borderLeftColor: "#ff8a65", padding: 4 }}
                          onClick={() => { setPathEnd(p.id); setQ2(""); setR2([]); }}>
                          {p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {endPerson && (
                <button className="hud-btn" style={{ fontSize: 11 }} onClick={() => { setPathEnd(null); setPathResult(null); setSearched(false); }}>
                  清除
                </button>
              )}
            </div>

            {/* 查找按钮 */}
            {startPerson && endPerson && (
              <button
                className="hud-btn"
                style={{ width: "100%", background: "rgba(255,255,255,0.12)", padding: 8, marginTop: 4 }}
                onClick={() => {
                  const result = findShortestPath(pathStart!, pathEnd!);
                  setPathResult(result);
                  setSearched(true);
                }}
              >
                查找最短关系路径
              </button>
            )}

            {/* 结果 */}
            {searched && pathResult === null && (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(255,138,101,0.08)", borderRadius: 8 }}>
                <div style={{ color: "#ff8a65", fontSize: 13 }}>
                  ❌ 无关系 — 这两位人物在数据库中无直接或间接关系
                </div>
              </div>
            )}
            {pathResult !== null && (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
                {/* 同一个人 */}
                {pathResult.path.length === 1 && pathResult.edges.length === 0 ? (
                  <div style={{ color: "#4fc3f7", fontSize: 13 }}>
                    🎯 同一个人！距离 = 0
                  </div>
                ) : (
                  <>
                    <div style={{ color: "#4fc3f7", fontSize: 13, marginBottom: 8 }}>
                      ✅ 通过 {pathResult.length} 步产生关系（{pathResult.length} 度分隔）
                    </div>

                    {/* 逐步显示：每一步列出人物 + 关系 */}
                    {pathResult.edges.map((pe, i) => {
                      const fromPerson = getPersonById(pathResult.path[i]);
                      const toPerson = getPersonById(pathResult.path[i + 1]);
                      const relType = pe.edge.type;
                      const relInfo = RELATION_LABELS[relType] || RELATION_LABELS.other;
                      const label = edgeLabel(pe);

                      return (
                        <div key={i} style={{
                          marginBottom: i < pathResult.edges.length - 1 ? 6 : 0,
                          padding: "6px 8px",
                          background: "rgba(255,255,255,0.03)",
                          borderRadius: 6,
                          borderLeft: `3px solid ${relInfo.color}`,
                        }}>
                          {/* 第 N 步 */}
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>
                            第 {i + 1} 步 · <span style={{ color: relInfo.color }}>{relInfo.label}</span>
                          </div>

                          {/* 起点 */}
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0" }}>
                            {fromPerson?.name ?? pathResult.path[i]}
                            {fromPerson?.birthYear && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
                              ({fromPerson.birthYear}{fromPerson.deathYear ? `–${fromPerson.deathYear}` : ''})
                            </span>}
                          </div>

                          {/* 关系箭头 */}
                          <div style={{
                            margin: "3px 0 3px 8px",
                            fontSize: 12,
                            color: relInfo.color,
                            fontWeight: 500,
                          }}>
                            └─ [{label}] → {toPerson?.name ?? pathResult.path[i + 1]}
                            {!pe.forward && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>(反向)</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* 终点 */}
                    {pathResult.path.length > 1 && (() => {
                      const lastPerson = getPersonById(pathResult.path[pathResult.path.length - 1]);
                      return (
                        <div style={{
                          marginTop: 4,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#ff8a65",
                          padding: "4px 8px",
                          background: "rgba(255,138,101,0.08)",
                          borderRadius: 4,
                        }}>
                          🏁 {lastPerson?.name ?? pathResult.path[pathResult.path.length - 1]}
                          {lastPerson?.birthYear && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: 4 }}>
                            ({lastPerson.birthYear}{lastPerson.deathYear ? `–${lastPerson.deathYear}` : ''})
                          </span>}
                        </div>
                      );
                    })()}

                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
