import { useStore } from "../state/store";
import { DynastyFilter } from "./DynastyFilter";
import { PathFinder } from "./PathFinder";

export function HUD() {
  const loaded = useStore(s => s.loaded);
  const selected = useStore(s => s.selected);
  const selectPerson = useStore(s => s.selectPerson);
  const quality = useStore(s => s.quality);
  const toggleQuality = useStore(s => s.toggleQuality);
  const toggleUI = useStore(s => s.toggleUI);
  const showRelations = useStore(s => s.showRelations);
  const toggleRelations = useStore(s => s.toggleRelations);
  const speed = useStore(s => s.speed);
  const pathResult = useStore(s => s.pathResult);

  if (!loaded) return null;

  return (
    <>
      <div className="hud-top">
        <div className="hud-title">
          <span className="title-main">史云</span>
          <span className="title-sub">中国历史人物星图</span>
        </div>
        <div className="hud-actions">
          <DynastyFilter />
          <span className="hud-info">⚡{Math.round(speed * 100)}%</span>
          <button className="hud-btn" onClick={toggleRelations} title="关系连线">
            {showRelations ? "🔗" : "🔗‍💬"}
          </button>
          <PathFinder />
          <button className="hud-btn" onClick={toggleQuality} title="画质切换">
            {quality === "high" ? "✨ 高" : "◐ 低"}
          </button>
          <button className="hud-btn" onClick={toggleUI} title="隐藏界面 (H)">
            👁
          </button>
          {selected && (
            <button className="hud-btn" onClick={() => selectPerson(null)} title="取消选中">
              ✕
            </button>
          )}
        </div>
      </div>

      {!selected && (
        <div className="hud-bottom">
          <span>🖱 拖拽旋转 · 滚轮变速 · WASD 飞行 · 点击选人 · H 隐藏界面</span>
        </div>
      )}
    </>
  );
}
