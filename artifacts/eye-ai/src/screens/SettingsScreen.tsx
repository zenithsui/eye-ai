import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getSetting, setSetting, getUserName, setUserName, deleteAllConversations, clearHistory } from '../lib/storage';
import { showToast } from '../components/Toast';
const eyeLogo = '/eye-logo.jpg';

const BG = 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)';

export function SettingsScreen() {
  const { setCurrentScreen, clearMessages, refreshConversations } = useApp();
  const [name, setName] = useState(getUserName() || '');
  const [speed, setSpeed] = useState(getSetting('voice_speed') || '0.95');

  const handleSaveName = () => {
    if (name.trim()) { setUserName(name.trim()); showToast('Name saved!', 'success'); }
  };

  const handleClearHistory = () => {
    if (confirm('Saari purani chats permanently delete ho jayengi. Continue?')) {
      clearHistory();
      deleteAllConversations();
      clearMessages();
      refreshConversations();
      showToast('History cleared', 'success');
    }
  };

  return (
    <div className="screen screen-enter scroll-area" style={{ background: BG }}>
      <div className="screen-header z-10 sticky top-0 border-b border-white/[0.06]"
        style={{ background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => setCurrentScreen('home')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-white font-bold text-lg drop-shadow-md">Settings</div>
        <div className="w-10"></div>
      </div>

      <div className="p-4 space-y-6">
        <div className="settings-section pt-4">
          <div className="settings-label">Profile</div>
          <div className="settings-item">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15">
              <img src={eyeLogo} alt="Eye AI" className="w-full h-full object-cover" />
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
              placeholder="Your Name"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">Voice Settings</div>
          <div className="settings-item flex-col items-start gap-4">
            <div className="w-full">
              <label className="text-xs text-white/40 block mb-2">Voice Speed ({speed}x)</label>
              <input
                type="range"
                min="0.5" max="2.0" step="0.1"
                value={speed}
                onChange={e => { setSpeed(e.target.value); setSetting('voice_speed', e.target.value); }}
                className="w-full accent-white/60"
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label">Eye AI Status</div>
          <div className="settings-item">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15 flex-shrink-0">
              <img src={eyeLogo} alt="Eye AI" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <div className="text-white font-medium text-sm">Eye AI is Active</div>
              <div className="text-white/40 text-xs mt-0.5">Full intelligence enabled</div>
            </div>
            <div className="ml-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-white/70 shadow-sm shadow-white/30"></div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <button
            onClick={handleClearHistory}
            className="w-full py-3 rounded-xl font-medium transition-colors text-sm"
            style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.25)', color: 'rgba(255,120,120,0.9)' }}
          >
            Clear All Chat History
          </button>
        </div>

        <div className="text-center text-white/25 text-xs pb-8 pt-4">
          <div className="font-bold mb-1">Eye AI v1.0</div>
          <div>Made with ❤️ by AMIT</div>
        </div>
      </div>
    </div>
  );
}
