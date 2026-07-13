import { useEffect } from "react";
import { useStore } from "../state/store";
import { loadDetails, getRelations, getPersonById } from "../data/load";
import { DYNASTY_BY_KEY } from "../data/dynasties";
import { RELATION_LABELS } from "../data/contract";

export function PersonPanel() {
  const selected = useStore(s => s.selected);
  const details = useStore(s => s.selectedDetails);
  const panelOpen = useStore(s => s.panelOpen);
  const showRelations = useStore(s => s.showRelations);
  const selectPerson = useStore(s => s.selectPerson);
  const setDetails = useStore(s => s.setDetails);
  const togglePanel = useStore(s => s.togglePanel);
  const toggleRelations = useStore(s => s.toggleRelations);

  // 选中人物后懒加载详情
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    loadDetails(selected.id).then(rec => {
      if (!cancelled && rec) setDetails(rec);
    });
    return () => { cancelled = true; };
  }, [selected?.id]);

  // 获取关系边
  const relations = (() => {
    if (!selected) return [];
    const all = getRelations();
    return all.filter(e => e.from === selected.id || e.to === selected.id);
  })();

  if (!selected || !panelOpen) return null;

  const dyn = DYNASTY_BY_KEY[selected.dynasty];

  return (
    <div className="person-panel">
      <div className="panel-header">
        <h2 style={{ color: dyn?.color ?? "#fff" }}>{selected.name}</h2>
        <button className="hud-btn" onClick={togglePanel}>✕</button>
      </div>

      <div className="panel-body">
        {/* 基本信息 */}
        <div className="info-row">
          <span className="label">朝代</span>
          <span className="value" style={{ color: dyn?.color }}>{dyn?.name ?? selected.dynasty}</span>
        </div>
        <div className="info-row">
          <span className="label">生卒</span>
          <span className="value">
            {selected.birthYear != null ? (selected.birthYear < 0 ? `前${-selected.birthYear}` : `${selected.birthYear}`) : "?"}
            {" – "}
            {selected.deathYear != null ? (selected.deathYear < 0 ? `前${-selected.deathYear}` : `${selected.deathYear}`) : "?"}
          </span>
        </div>

        {/* 详情（懒加载后显示） */}
        {details && (
          <>
            {details.nativePlace && (
              <div className="info-row">
                <span className="label">籍贯</span>
                <span className="value">{details.nativePlace}</span>
              </div>
            )}
            {details.statuses.length > 0 && (
              <div className="info-row">
                <span className="label">身份</span>
                <span className="value">{details.statuses.join(" · ")}</span>
              </div>
            )}
            {details.works.length > 0 && (
              <div className="info-row">
                <span className="label">著作</span>
                <span className="value">{details.works.slice(0, 5).join(" / ")}</span>
              </div>
            )}
            {details.offices.length > 0 && (
              <div className="info-row">
                <span className="label">官职</span>
                <div className="office-list">
                  {details.offices.slice(0, 5).map((o, i) => (
                    <div key={i} className="office-item">
                      {o.title} · {o.place} ({o.startYear}{o.endYear ? `–${o.endYear}` : ""})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 关系网络 */}
        {relations.length > 0 && (
          <div className="relation-section">
            <div className="relation-header" onClick={toggleRelations} style={{ cursor: "pointer" }}>
              <span className="label">关系网络</span>
              <span className="relation-count">{relations.length} 条</span>
              <span style={{ fontSize: 10, opacity: 0.5 }}>{showRelations ? "隐藏连线" : "显示连线"}</span>
            </div>
            <div className="relation-list">
              {relations.map((e, i) => {
                const otherId = e.from === selected.id ? e.to : e.from;
                const relInfo = RELATION_LABELS[e.type];
                const other = getPersonById(otherId);
                return (
                  <div
                    key={i}
                    className="relation-item"
                    onClick={() => {
                      const idx = getPersonById(otherId);
                      if (idx) selectPerson(idx);
                    }}
                    style={{ borderLeftColor: relInfo.color }}
                  >
                    <span className="rel-type" style={{ color: relInfo.color }}>{relInfo.label}</span>
                    <span className="rel-person">
                      {e.from === selected.id ? "→ " : "← "}
                      {other?.name ?? otherId}
                    </span>
                    {e.source && <span className="rel-source">{e.source}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
