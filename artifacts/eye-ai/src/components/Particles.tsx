import { useEffect, useRef } from 'react';
export function Particles({ count = 15 }: { count?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;animation-delay:${Math.random()*4}s;animation-duration:${3+Math.random()*4}s;opacity:${0.2+Math.random()*0.5};`;
      container.appendChild(p);
    }
  }, [count]);
  return <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none" />;
}