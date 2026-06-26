export function Waveform({ active }: { active: boolean }) {
  return (
    <div className={`waveform ${active ? 'active' : ''}`}>
      {[...Array(7)].map((_, i) => (
        <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}