import { useState } from 'react';
import { LayoutGrid, Mic, MessageSquare, Search, Settings, History, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Orb } from '../components/Orb';
import { Particles } from '../components/Particles';
import { ModesSheet } from '../components/ModesSheet';
const eyeLogo = '/eye-logo.jpg';

export function HomeScreen() {
  const { userName, setCurrentScreen, setChatMode, setChatInput, startNewConversation } = useApp();
  const [input, setInput] = useState('');
  const [showModes, setShowModes] = useState(false);

  const initials = userName ? userName.substring(0, 2).toUpperCase() : 'ME';

  const handleSuggestion = (text: string) => {
    setChatMode('chat');
    setChatInput(text);
    setCurrentScreen('chat');
  };

  const handleWebSearch = () => {
    setChatMode('websearch');
    startNewConversation();
    setCurrentScreen('chat');
  };

  const handleDeepSearch = () => {
    setChatMode('deepsearch');
    startNewConversation();
    setCurrentScreen('chat');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setChatMode('chat');
      setChatInput(input.trim());
      setCurrentScreen('chat');
      setInput('');
    }
  };

  return (
    <div className="screen screen-enter" style={{ background: 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)' }}>
      <Particles count={15} />

      <div className="screen-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15 shadow-lg">
            <img src={eyeLogo} alt="Eye AI" className="w-full h-full object-cover" />
          </div>
          <div className="text-white font-semibold text-lg drop-shadow-md">Hi {userName},</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentScreen('settings')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <Settings size={17} />
          </button>
          <button
            onClick={() => setCurrentScreen('history')}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
            title="Chat History"
          >
            <History size={17} />
          </button>
          <button
            onClick={() => setShowModes(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
            title="Modes"
          >
            <LayoutGrid size={17} />
          </button>
        </div>
      </div>

      <div className="px-6 mb-2">
        <p className="text-white/30 font-medium text-sm">Ask any questions you have — Eye AI is ready to help.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-4 flex-shrink-0">
        <Orb />
        <div className="provider-badge mt-2">
          <div className="provider-dot active" />
          Eye AI
        </div>
      </div>

      <div className="scroll-area flex flex-col gap-6 pb-4">
        <div className="feature-grid">
          <div data-testid="card-voice" className="feature-card" onClick={() => setCurrentScreen('voice')}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #2a2a2a, #555)' }}>
              <Mic size={20} />
            </div>
            <div className="feature-card-label">Voice Chat AI</div>
          </div>
          <div data-testid="card-chat" className="feature-card" onClick={() => { setChatMode('chat'); startNewConversation(); setCurrentScreen('chat'); }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #2a2a2a, #555)' }}>
              <MessageSquare size={20} />
            </div>
            <div className="feature-card-label">Chat with AI</div>
          </div>
          <div data-testid="card-search" className="feature-card" onClick={handleWebSearch}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #2a2a2a, #555)' }}>
              <Search size={20} />
            </div>
            <div className="feature-card-label">Web Search</div>
          </div>
          <div data-testid="card-deepsearch" className="feature-card" onClick={handleDeepSearch}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
              style={{ background: 'linear-gradient(135deg, #2a2a2a, #555)' }}>
              <Zap size={20} />
            </div>
            <div className="feature-card-label">Deep Search</div>
          </div>
        </div>

        <div className="suggestion-pills">
          <button className="suggestion-pill" onClick={() => handleSuggestion('Stock market aaj kaisa hai? 📈')}>Stock market aaj kaisa hai? 📈</button>
          <button className="suggestion-pill" onClick={() => handleSuggestion('Ek joke sunao! 😄')}>Ek joke sunao! 😄</button>
          <button className="suggestion-pill" onClick={() => handleSuggestion('Coding mein help chahiye 💻')}>Coding mein help chahiye 💻</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="input-bar mt-auto">
        <input
          data-testid="input-home-ask"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask anything..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button type="submit" data-testid="btn-home-send" className="send-btn" style={{ width: 36, height: 36 }}>
          <span className="text-white text-lg leading-none mt-[-2px]">✨</span>
        </button>
      </form>

      {showModes && <ModesSheet onClose={() => setShowModes(false)} />}
    </div>
  );
}
