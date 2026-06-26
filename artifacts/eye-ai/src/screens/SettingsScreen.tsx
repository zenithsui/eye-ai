import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getKey, saveKey, getSetting, setSetting, getUserName, setUserName, deleteAllConversations, clearHistory } from '../lib/storage';
import { showToast } from '../components/Toast';
const eyeLogo = '/eye-logo.jpg';

const PROVIDERS = [
  { id: 'groq', label: 'Engine 1', url: 'https://console.groq.com', placeholder: 'gsk_...' },
  { id: 'gemini', label: 'Engine 2', url: 'https://aistudio.google.com', placeholder: 'AIza...' },
  { id: 'openrouter', label: 'Engine 3', url: 'https://openrouter.ai', placeholder: 'sk-or-...' },
  { id: 'cerebras', label: 'Engine 4', url: 'https://cloud.cerebras.ai', placeholder: 'csk-...' },
  { id: 'mistral', label: 'Engine 5', url: 'https://console.mistral.ai', placeholder: '...' },
  { id: 'elevenlabs', label: 'ElevenLabs TTS', url: 'https://elevenlabs.io', placeholder: 'xi_...' },
];

const BG = 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)';

export function SettingsScreen() {
  const { setCurrentScreen, clearMessages, refreshConversations } = useApp();
  const [name, setName] = useState(getUserName() || '');
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [speed, setSpeed] = useState(getSetting('voice_speed') || '0.95');
  const [voiceId, setVoiceId] = useState(getSetting('elevenlabs_voice_id') || 'EXAVITQu4vr4xnSDxMaL');

  useEffect(() => {
    const loadedKeys: Record<string, string> = {};
    PROVIDERS.forEach(p => { loadedKeys[p.id] = getKey(p.id) ? '********' : ''; });
    setKeys(loadedKeys);
  }, []);

  const handleSaveName = () => {
    if (name.trim()) setUserName(name.trim());
  };

  const handleSaveKey = (providerId: string, val: string) => {
    if (val && val !== '********') {
      saveKey(providerId, val);
      setKeys(prev => ({ ...prev, [providerId]: '********' }));
      showToast('Key saved!', 'success');
    }
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
              <label className="text-xs text-white/40 block mb-2">TTS Speed ({speed}x)</label>
              <input
                type="range"
                min="0.5" max="2.0" step="0.1"
                value={speed}
                onChange={e => { setSpeed(e.target.value); setSetting('voice_speed', e.target.value); }}
                className="w-full accent-white/60"
              />
            </div>
            <div className="w-full border-t border-white/[0.06] pt-4">
              <label className="text-xs text-white/40 block mb-2">ElevenLabs Voice ID</label>
              <input
                type="text"
                value={voiceId}
                onChange={e => { setVoiceId(e.target.value); setSetting('elevenlabs_voice_id', e.target.value); }}
                placeholder="Voice ID"
                className="w-full rounded-lg px-3 py-2 text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-label flex justify-between items-center pr-2">
            AI Engine Keys
            <span className="text-[10px] text-white/30">Stored locally only</span>
          </div>
          <p className="text-white/25 text-xs px-1 mb-3">Add free keys to unlock Eye AI's full intelligence</p>

          <div className="space-y-3">
            {PROVIDERS.map(p => (
              <div key={p.id} className="settings-item flex-col items-stretch gap-2 !p-3">
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-2 text-white/80 font-medium text-sm">
                    <div className={`w-2 h-2 rounded-full ${getKey(p.id) ? 'bg-white/70' : 'bg-white/20'}`}></div>
                    {p.label}
                  </div>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-white/40 hover:text-white/70 transition-colors">
                    Get Free Key →
                  </a>
                </div>
                <div className="flex gap-2 w-full">
                  <input
                    type="password"
                    value={keys[p.id] || ''}
                    onChange={e => setKeys(prev => ({ ...prev, [p.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveKey(p.id, keys[p.id]); }}
                    placeholder={keys[p.id] === '********' ? '✓ Key saved' : p.placeholder}
                    className="flex-1 rounded-lg px-3 py-2 text-white text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                  />
                  <button
                    onClick={() => handleSaveKey(p.id, keys[p.id])}
                    className="text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
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
