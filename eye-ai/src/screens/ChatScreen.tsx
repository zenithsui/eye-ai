import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Mic, Send, History, SquarePen, StopCircle, ChevronDown, Copy, RefreshCw, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { callAIWithFallback, deepSearch, webSearch } from '../lib/ai-providers';
import { startListening, stopListening, getIsListening } from '../lib/voice';
import { showToast } from '../components/Toast';
import { MarkdownMessage } from '../components/MarkdownMessage';
import { extractAndSaveMemory } from '../lib/memory';
const eyeLogo = '/eye-logo.jpg';

const EMPTY_SUGGESTIONS = [
  '📈 Stock market tips kya hain?',
  '💻 React kaise seekhoon?',
  '😄 Ek funny joke sunao',
  '🌍 Today\'s top news kya hai?',
];

type LocalMessage = { id: string; role: 'user' | 'assistant'; content: string; timestamp: number };

export function ChatScreen() {
  const {
    setCurrentScreen, messages, setMessages, addMessage, clearMessages,
    chatInput, setChatInput, isTyping, setIsTyping,
    chatMode, ensureConversation, startNewConversation,
  } = useApp();

  const [input, setInput] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [deepSearchStatus, setDeepSearchStatus] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; content: string; role: string; x: number; y: number } | null>(null);

  const streamAbortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (chatInput) { handleSend(chatInput); setChatInput(''); }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, streamingText]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollFab(!nearBottom);
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  // ── Streaming ──────────────────────────────────────────────────────────────
  const streamResponse = async (text: string): Promise<boolean> => {
    setIsStreaming(true);
    setStreamingText('');
    streamAbortRef.current = false;
    const words = text.split(' ');
    let accumulated = '';
    for (let i = 0; i < words.length; i++) {
      if (streamAbortRef.current || !isMounted.current) break;
      accumulated += (i > 0 ? ' ' : '') + words[i];
      setStreamingText(accumulated);
      await new Promise(r => setTimeout(r, 18));
    }
    const completed = !streamAbortRef.current;
    if (isMounted.current) { setIsStreaming(false); setStreamingText(''); }
    return completed;
  };

  const stopStreaming = () => {
    streamAbortRef.current = true;
  };

  // ── Follow-up suggestions ──────────────────────────────────────────────────
  const generateFollowUps = async (userMsg: string, aiMsg: string) => {
    try {
      const prompt = `Based on this conversation:\nUser: "${userMsg.slice(0, 120)}"\nAI: "${aiMsg.slice(0, 200)}"\n\nGenerate exactly 3 short follow-up questions in Hinglish (max 8 words each). Reply ONLY as a JSON array:\n["question1","question2","question3"]`;
      const result = await callAIWithFallback(prompt, [], 'chat');
      const raw = result.text.trim().replace(/```json|```/g, '').trim();
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return;
      const suggestions = JSON.parse(match[0]) as string[];
      if (Array.isArray(suggestions) && suggestions.length > 0 && isMounted.current) {
        setFollowUps(suggestions.slice(0, 3));
      }
    } catch { /* silent */ }
  };

  // ── Core send ──────────────────────────────────────────────────────────────
  const handleSend = async (textToSend: string = input, historyOverride?: { role: string; content: string }[]) => {
    const text = textToSend.trim();
    if (!text || isTyping || isStreaming) return;
    setInput('');
    setDeepSearchStatus('');
    setFollowUps([]);
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    ensureConversation(text, chatMode);
    if (!historyOverride) addMessage('user', text);
    setIsTyping(true);

    try {
      const history = historyOverride ?? messages.map(m => ({ role: m.role, content: m.content }));
      let result;
      if (chatMode === 'deepsearch') {
        setDeepSearchStatus('Eye AI is thinking deeply...');
        result = await deepSearch(text, history);
        setDeepSearchStatus('');
      } else if (chatMode === 'websearch') {
        setDeepSearchStatus('Searching the web...');
        result = await webSearch(text, history);
        setDeepSearchStatus('');
      } else {
        result = await callAIWithFallback(text, history, 'chat');
      }

      setIsTyping(false);
      const completed = await streamResponse(result.text);
      if (isMounted.current && completed) {
        addMessage('assistant', result.text);
        extractAndSaveMemory(text, result.text);
        generateFollowUps(text, result.text);
      }
    } catch {
      showToast('Thoda issue ho gaya, dobara try karo', 'error');
      if (isMounted.current) {
        setIsTyping(false); setIsStreaming(false);
        setStreamingText(''); setDeepSearchStatus('');
      }
    }
  };

  // ── Regenerate ─────────────────────────────────────────────────────────────
  const handleRegenerate = async (messageId: string) => {
    if (isTyping || isStreaming) return;
    const idx = messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    const before = messages.slice(0, idx) as LocalMessage[];
    const lastUser = [...before].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setMessages(before as any);
    setFollowUps([]);
    const history = before.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
    await handleSend(lastUser.content, history);
  };

  // ── Edit user message ──────────────────────────────────────────────────────
  const startEdit = (id: string, content: string) => {
    setEditingId(id); setEditText(content); setContextMenu(null);
  };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };
  const submitEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const idx = messages.findIndex(m => m.id === editingId);
    if (idx === -1) return;
    const before = messages.slice(0, idx) as LocalMessage[];
    const history = before.map(m => ({ role: m.role, content: m.content }));
    setMessages(before as any);
    setEditingId(null);
    setFollowUps([]);
    await handleSend(editText.trim(), history);
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const copyMsg = (content: string) => {
    navigator.clipboard.writeText(content).then(() => showToast('Copied! 📋', 'success'));
    setContextMenu(null);
  };

  // ── Context menu ───────────────────────────────────────────────────────────
  const showCtx = (e: React.MouseEvent, id: string, content: string, role: string) => {
    e.preventDefault();
    setContextMenu({ id, content, role, x: e.clientX, y: e.clientY });
  };

  // ── Voice mic for text input ───────────────────────────────────────────────
  const handleMic = () => {
    if (getIsListening()) {
      stopListening();
    } else {
      startListening(
        (text) => setInput(prev => prev ? `${prev} ${text}` : text),
        () => {}, () => {},
        (err) => showToast(err, 'warning')
      );
    }
  };

  const modeBadgeLabel = chatMode === 'deepsearch' ? '⚡ Deep Search' : chatMode === 'websearch' ? '🔍 Web Search' : '💬 Chat';
  const BG = 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)';
  const isEmpty = messages.length === 0 && !isStreaming && !isTyping;

  return (
    <div className="screen screen-enter" style={{ background: BG }} onClick={() => { setShowMenu(false); setContextMenu(null); }}>

      {/* Header */}
      <div className="screen-header border-b border-white/[0.06]"
        style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => setCurrentScreen('home')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <div className="text-white font-bold text-lg drop-shadow-md">
            {chatMode === 'deepsearch' ? '⚡ Deep Search' : chatMode === 'websearch' ? '🔍 Web Search' : 'Smart Chat'}
          </div>
          <div className="chat-mode-badge">{modeBadgeLabel}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCurrentScreen('history')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors" title="History">
            <History size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          >
            <SquarePen size={18} />
          </button>
          {showMenu && (
            <div className="absolute top-16 right-4 border border-white/10 rounded-xl shadow-2xl py-2 w-44 z-50"
              style={{ background: 'rgba(20,20,20,0.97)', backdropFilter: 'blur(20px)' }}
              onClick={e => e.stopPropagation()}>
              <button onClick={() => { clearMessages(); setFollowUps([]); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-white/80 text-sm hover:bg-white/10">Clear Chat</button>
              <button onClick={() => { startNewConversation(); setFollowUps([]); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-white/80 text-sm hover:bg-white/10">New Conversation</button>
            </div>
          )}
        </div>
      </div>

      {deepSearchStatus && (
        <div className="px-4 py-2 border-b border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-white/50 text-xs text-center animate-pulse">{deepSearchStatus}</p>
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef} onScroll={handleScroll}>

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center flex-1 px-6 py-8 gap-5">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/10 shadow-lg"
              style={{ boxShadow: '0 0 30px rgba(255,255,255,0.08)' }}>
              <img src={eyeLogo} alt="Eye AI" className="w-full h-full object-cover" />
            </div>
            <div className="text-center">
              <div className="text-white font-bold text-xl mb-1">Main Eye AI hoon 👁️</div>
              <div className="text-white/50 text-sm">Kuch bhi poocho — main yahan hoon!</div>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {(chatMode === 'chat' ? EMPTY_SUGGESTIONS : chatMode === 'websearch' ? ['🌍 Latest news', '🔍 Aaj ka weather', '💹 Bitcoin price', '🏏 Cricket score'] : ['⚡ Explain quantum computing', '🧬 How does DNA work?', '🌌 Black holes explain karo', '🤖 AI ka future kya hai?']).map((s, i) => (
                <button key={i} onClick={() => { handleSend(s); }} className="suggestion-pill">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages list */}
        {messages.map((m) => (
          <div key={m.id}>
            {m.role === 'user' ? (
              /* User message */
              editingId === m.id ? (
                <div className="chat-edit-row">
                  <textarea
                    className="chat-edit-textarea"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(); } if (e.key === 'Escape') cancelEdit(); }}
                    autoFocus
                    rows={3}
                  />
                  <div className="chat-edit-actions">
                    <button className="chat-edit-cancel" onClick={cancelEdit}>Cancel</button>
                    <button className="chat-edit-send" onClick={submitEdit}>Send ↑</button>
                  </div>
                </div>
              ) : (
                <div className="user-msg-wrapper" onContextMenu={e => showCtx(e, m.id, m.content, m.role)}>
                  <div className="msg-user">
                    {m.content}
                    <div className="msg-time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="msg-action-row user-actions">
                    <button className="msg-action-btn" onClick={() => copyMsg(m.content)} title="Copy"><Copy size={11} /></button>
                    <button className="msg-action-btn" onClick={() => startEdit(m.id, m.content)} title="Edit"><SquarePen size={11} /></button>
                  </div>
                </div>
              )
            ) : (
              /* AI message */
              <div className="msg-ai-wrapper" onContextMenu={e => showCtx(e, m.id, m.content, m.role)}>
                <div className="ai-avatar flex items-center justify-center overflow-hidden">
                  <img src={eyeLogo} alt="E" className="w-full h-full object-cover" />
                </div>
                <div className="ai-msg-col">
                  <div className="msg-ai msg-ai-markdown">
                    <MarkdownMessage content={m.content} />
                    <div className="msg-time">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="msg-action-row ai-actions">
                    <button className="msg-action-btn" onClick={() => copyMsg(m.content)} title="Copy"><Copy size={11} /><span>Copy</span></button>
                    <button className="msg-action-btn" onClick={() => handleRegenerate(m.id)} title="Regenerate"><RefreshCw size={11} /><span>Redo</span></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Streaming bubble */}
        {isStreaming && streamingText && (
          <div className="msg-ai-wrapper">
            <div className="ai-avatar flex items-center justify-center overflow-hidden">
              <img src={eyeLogo} alt="E" className="w-full h-full object-cover" />
            </div>
            <div className="msg-ai msg-ai-markdown streaming-bubble">
              <MarkdownMessage content={streamingText} />
              <span className="streaming-cursor" />
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !isStreaming && (
          <div className="msg-ai-wrapper">
            <div className="ai-avatar flex items-center justify-center overflow-hidden">
              <img src={eyeLogo} alt="E" className="w-full h-full object-cover" />
            </div>
            <div className="msg-ai flex items-center !p-3 !w-16">
              <div className="typing-indicator">
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          </div>
        )}

        {/* Follow-up suggestions */}
        {followUps.length > 0 && !isTyping && !isStreaming && (
          <div className="followup-row">
            {followUps.map((q, i) => (
              <button key={i} className="followup-pill" onClick={() => { setFollowUps([]); handleSend(q); }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Scroll FAB */}
      {showScrollFab && (
        <button className="scroll-fab" onClick={scrollToBottom}>
          <ChevronDown size={20} />
        </button>
      )}

      {/* Stop generation button */}
      {isStreaming && (
        <button className="stop-gen-btn" onClick={stopStreaming}>
          <StopCircle size={14} />
          <span>Stop</span>
        </button>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ top: Math.min(contextMenu.y, window.innerHeight - 160), left: Math.min(contextMenu.x, window.innerWidth - 160) }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => copyMsg(contextMenu.content)}><Copy size={13} /> Copy</button>
          {contextMenu.role === 'user' && (
            <button onClick={() => { startEdit(contextMenu.id, contextMenu.content); setContextMenu(null); }}>
              <SquarePen size={13} /> Edit
            </button>
          )}
          {contextMenu.role === 'assistant' && (
            <button onClick={() => { handleRegenerate(contextMenu.id); setContextMenu(null); }}>
              <RefreshCw size={13} /> Regenerate
            </button>
          )}
        </div>
      )}

      {/* Input bar */}
      <div className="chat-input-bar border-t border-white/[0.06]"
        style={{ background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(20px)' }}>
        {chatMode === 'deepsearch' && <div className="flex items-center gap-1 text-yellow-400/70 text-xs mb-2"><Zap size={12} />Deep Search mode</div>}
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl flex flex-col px-3 py-2 gap-1"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                data-testid="input-message"
                rows={1}
                value={input}
                onChange={e => { setInput(e.target.value); setCharCount(e.target.value.length); autoResize(e.target); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={chatMode === 'deepsearch' ? 'Deep search...' : chatMode === 'websearch' ? 'Search the web...' : 'Kuch bhi poocho...'}
                className="flex-1 bg-transparent text-white outline-none placeholder:text-white/30 text-sm font-sans resize-none leading-relaxed"
                style={{ maxHeight: '140px', overflowY: 'auto' }}
                autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
              />
              <button type="button" onClick={handleMic} className="text-white/40 hover:text-white/70 shrink-0 mb-0.5">
                <Mic size={19} />
              </button>
            </div>
            {/* Char counter — appears when > 3500 chars */}
            {charCount > 3500 && (
              <div className="char-counter" style={{ color: charCount > 3800 ? '#fca5a5' : 'rgba(255,255,255,0.4)' }}>
                {charCount}/4000
              </div>
            )}
          </div>

          <button
            data-testid="btn-send"
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping || isStreaming}
            className={`send-btn flex-shrink-0 ${(!input.trim() || isTyping || isStreaming) ? 'opacity-30' : ''}`}
          >
            <Send size={18} color="white" className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
