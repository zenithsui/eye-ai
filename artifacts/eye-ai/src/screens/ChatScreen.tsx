import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MoreVertical, Mic, Send, History, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { callAIWithFallback, deepSearch } from '../lib/ai-providers';
import { startListening, stopListening, getIsListening } from '../lib/voice';
import { showToast } from '../components/Toast';
const eyeLogo = '/eye-logo.jpg';

export function ChatScreen() {
  const {
    setCurrentScreen, messages, addMessage, clearMessages,
    chatInput, setChatInput, isTyping, setIsTyping,
    chatMode, ensureConversation, startNewConversation,
  } = useApp();
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [deepSearchStatus, setDeepSearchStatus] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatInput) {
      handleSend(chatInput);
      setChatInput('');
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textToSend: string = input) => {
    const text = textToSend.trim();
    if (!text || isTyping) return;
    setInput('');
    setDeepSearchStatus('');

    ensureConversation(text, chatMode);
    addMessage('user', text);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      let result;
      if (chatMode === 'deepsearch') {
        setDeepSearchStatus('Deep Search active — combining multiple sources...');
        result = await deepSearch(text, history);
        setDeepSearchStatus('');
      } else {
        result = await callAIWithFallback(text, history);
      }
      addMessage('assistant', result.text);
    } catch (err: any) {
      showToast('Thoda issue ho gaya, dobara try karo', 'error');
    } finally {
      setIsTyping(false);
      setDeepSearchStatus('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMic = () => {
    if (getIsListening()) {
      stopListening();
    } else {
      startListening(
        (text) => setInput(prev => prev ? `${prev} ${text}` : text),
        () => {},
        () => {},
        (err) => showToast(err, 'warning')
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Copied!', 'success');
  };

  const BG = 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)';

  return (
    <div className="screen screen-enter" style={{ background: BG }}>
      <div className="screen-header border-b border-white/[0.06]"
        style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => setCurrentScreen('home')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <div className="text-white font-bold text-lg drop-shadow-md">
            {chatMode === 'deepsearch' ? '⚡ Deep Search' : chatMode === 'websearch' ? '🔍 Web Search' : 'Smart Chat'}
          </div>
          <div className="provider-badge scale-90">
            <div className="provider-dot active" />
            Eye AI
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentScreen('history')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
            title="Chat History"
          >
            <History size={18} />
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
              <MoreVertical size={20} />
            </button>
            {showMenu && (
              <div className="absolute top-12 right-0 border border-white/10 rounded-xl shadow-2xl py-2 w-44 z-50"
                style={{ background: 'rgba(20,20,20,0.96)', backdropFilter: 'blur(20px)' }}>
                <button
                  onClick={() => { clearMessages(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-white/80 text-sm hover:bg-white/10"
                >
                  Clear Chat
                </button>
                <button
                  onClick={() => { startNewConversation(); setShowMenu(false); }}
                  className="w-full text-left px-4 py-2 text-white/80 text-sm hover:bg-white/10"
                >
                  New Conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {deepSearchStatus && (
        <div className="px-4 py-2 border-b border-white/[0.06]"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-white/50 text-xs text-center animate-pulse">{deepSearchStatus}</p>
        </div>
      )}

      <div className="chat-messages" ref={scrollRef} onClick={() => setShowMenu(false)}>
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center opacity-30 text-white flex-col gap-4">
            {chatMode === 'deepsearch' ? <Zap size={48} /> : null}
            <p>{chatMode === 'deepsearch' ? 'Deep Search ready — ask anything!' : chatMode === 'websearch' ? 'Web Search ready' : 'Start a conversation...'}</p>
          </div>
        )}

        {messages.map((m) =>
          m.role === 'user' ? (
            <div key={m.id} className="msg-user">
              {m.content}
              <div className="msg-time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ) : (
            <div key={m.id} className="msg-ai-wrapper" onContextMenu={(e) => { e.preventDefault(); copyToClipboard(m.content); }}>
              <div className="ai-avatar flex items-center justify-center overflow-hidden">
                <img src={eyeLogo} alt="E" className="w-full h-full object-cover" />
              </div>
              <div className="msg-ai">
                {m.content}
                <div className="msg-time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )
        )}

        {isTyping && (
          <div className="msg-ai-wrapper">
            <div className="ai-avatar flex items-center justify-center overflow-hidden">
              <img src={eyeLogo} alt="E" className="w-full h-full object-cover" />
            </div>
            <div className="msg-ai flex items-center justify-center !p-2 !w-16">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/[0.06]"
        style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-3xl flex items-center px-4 py-2"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <input
              ref={inputRef}
              data-testid="input-message"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatMode === 'deepsearch' ? 'Ask for deep search...' : chatMode === 'websearch' ? 'Search the web...' : 'Type your message...'}
              className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30 text-sm font-sans"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button type="button" onClick={handleMic} className="text-white/40 hover:text-white/70 shrink-0 ml-2">
              <Mic size={20} />
            </button>
          </div>

          <button
            data-testid="btn-send"
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className={`send-btn ${(!input.trim() || isTyping) ? 'opacity-30' : ''}`}
          >
            <Send size={18} color="white" className="ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
