import { useStore } from "../state/store";

export function SearchPanel() {
  const searchOpen = useStore(s => s.searchOpen);
  const searchQuery = useStore(s => s.searchQuery);
  const searchResults = useStore(s => s.searchResults);
  const setSearch = useStore(s => s.setSearch);
  const selectPerson = useStore(s => s.selectPerson);
  const toggleSearch = useStore(s => s.toggleSearch);

  if (!searchOpen) {
    return (
      <button className="hud-btn" onClick={toggleSearch} title="搜索人物">
        🔍
      </button>
    );
  }

  return (
    <div className="search-panel">
      <div className="search-header">
        <input
          autoFocus
          type="text"
          placeholder="搜索历史人物…"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <button className="hud-btn" onClick={toggleSearch}>✕</button>
      </div>
      {searchResults.length > 0 && (
        <ul className="search-results">
          {searchResults.map(p => (
            <li
              key={p.id}
              onClick={() => { selectPerson(p); toggleSearch(); }}
            >
              <span className="result-name">{p.name}</span>
              <span className="result-dynasty">{p.dynasty}</span>
              <span className="result-year">
                {p.birthYear ?? "?"}–{p.deathYear ?? "?"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {searchQuery.length > 0 && searchResults.length === 0 && (
        <div className="search-empty">未找到匹配人物</div>
      )}
    </div>
  );
}
