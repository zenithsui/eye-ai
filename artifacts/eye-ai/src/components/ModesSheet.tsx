import { useEffect, useRef } from 'react';
import { Mic, MessageSquare, Search, Zap, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ChatMode } from '../context/AppContext';

interface ModesSheetProps {
  onClose: () => void;
}

const MODES: { icon: React.ReactNode; label: string; sub: string; mode?: ChatMode; screen?: string }[] = [
  { icon: <Mic size={22} />, label: 'Voice Chat AI', sub: 'Bol ke poochho', screen: 'voice' },
  { icon: <MessageSquare size={22} />, label: 'Chat with AI', sub: 'Type kar ke baat karo', mode: 'chat', screen: 'chat' },
  { icon: <Search size={22} />, label: 'Web Search', sub: 'Net pe dhundho', mode: 'websearch', screen: 'chat' },
  { icon: <Zap size={22} />, label: 'Deep Search', sub: 'Multiple sources, best answer', mode: 'deepsearch', screen: 'chat' },
];

export function ModesSheet({ onClose }: ModesSheetProps) {
  const { setCurrentScreen, setChatMode, startNewConversation } = useApp();
  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      overlayRef.current?.classList.add('opacity-100');
      sheetRef.current?.classList.add('translate-y-0');
    });
    return () => cancelAnimationFrame(t);
  }, []);

  const close = () => {
    overlayRef.current?.classList.remove('opacity-100');
    sheetRef.current?.classList.remove('translate-y-0');
    setTimeout(onClose, 280);
  };

  const handleMode = (item: typeof MODES[0]) => {
    close();
    setTimeout(() => {
      if (item.mode) { setChatMode(item.mode); startNewConversation(); }
      if (item.screen) setCurrentScreen(item.screen as any);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        ref={overlayRef}
        onClick={close}
        className="absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      />
      <div
        ref={sheetRef}
        className="relative w-full max-w-[430px] translate-y-full transition-transform duration-300 ease-out"
        style={{
          borderRadius: '24px 24px 0 0',
          background: 'rgba(12,12,12,0.97)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 32,
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1" style={{ background: 'rgba(255,255,255,0.2)' }} />
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex-1" />
          <h3 className="text-white font-bold text-lg flex-1 text-center">Modes</h3>
          <div className="flex-1 flex justify-end">
            <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:bg-white/10 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-4 flex flex-col gap-2">
          {MODES.map(item => (
            <button
              key={item.label}
              onClick={() => handleMode(item)}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl text-left transition-all hover:scale-[0.99] active:scale-[0.97]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #2a2a2a, #555)' }}>
                {item.icon}
              </div>
              <div>
                <div className="text-white/90 font-semibold text-[15px]">{item.label}</div>
                <div className="text-white/40 text-xs mt-0.5">{item.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
