import { useStore } from "../state/store";
import { DYNASTIES } from "../data/dynasties";

export function DynastyFilter() {
  const open = useStore(s => s.dynastyFilterOpen);
  const hidden = useStore(s => s.hiddenDynasties);
  const toggle = useStore(s => s.toggleDynasty);
  const showAll = useStore(s => s.showAllDynasties);
  const toggleOpen = useStore(s => s.toggleDynastyFilter);

  if (!open) {
    return (
      <button className="hud-btn" onClick={toggleOpen} title="朝代筛选">
        🏷️
      </button>
    );
  }

  return (
    <div className="dynasty-filter">
      <div className="filter-header">
        <span>朝代筛选</span>
        <button className="hud-btn" onClick={toggleOpen}>✕</button>
      </div>
      <div className="filter-body">
        {DYNASTIES.map(d => {
          const isHidden = hidden.has(d.key);
          return (
            <button
              key={d.key}
              className={`filter-chip ${isHidden ? "off" : "on"}`}
              style={{ borderColor: d.color }}
              onClick={() => toggle(d.key)}
            >
              <span className="chip-dot" style={{ background: isHidden ? "#555" : d.color }} />
              {d.name}
            </button>
          );
        })}
      </div>
      <button className="filter-reset" onClick={showAll}>
        显示全部朝代
      </button>
    </div>
  );
}
