import { useApp } from '../context/AppContext';

export function Orb({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const { orbState } = useApp();
  const sizeClass = size === 'large' ? 'scale-125' : '';
  return (
    <div className={`orb-wrapper ${sizeClass}`}>
      <div className="orb-container" data-state={orbState}>
        <div className="orb-core">
          <div className="orb-layer orb-layer-1"></div>
          <div className="orb-layer orb-layer-2"></div>
          <div className="orb-layer orb-layer-3"></div>
          <div className="orb-glow"></div>
          <div className="orb-shimmer"></div>
        </div>
        <div className="orb-ring orb-ring-1"></div>
        <div className="orb-ring orb-ring-2"></div>
        <div className="orb-ring orb-ring-3"></div>
      </div>
    </div>
  );
}