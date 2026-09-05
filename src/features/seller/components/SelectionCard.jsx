export default function SelectionCard({ label, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`selection-card${selected ? ' selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {selected ? <span className="selection-check" aria-hidden="true">✓</span> : null}
      <span className="selection-label">{label}</span>
    </button>
  );
}