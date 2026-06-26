import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Trash2, Plus, MessageSquare, Mic, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getAllConversations, deleteConversation, deleteAllConversations, Conversation } from '../lib/storage';
import { showToast } from '../components/Toast';

function relativeTime(ts: number): string {
  const diffMin = Math.floor((Date.now() - ts) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

function modeIcon(mode: string) {
  if (mode === 'voice') return <Mic size={16} />;
  if (mode === 'deepsearch') return <Zap size={16} />;
  if (mode === 'websearch') return <Search size={16} />;
  return <MessageSquare size={16} />;
}

function modeLabel(mode: string): string {
  if (mode === 'voice') return 'Voice';
  if (mode === 'deepsearch') return 'Deep';
  if (mode === 'websearch') return 'Search';
  return 'Chat';
}

function groupConversations(convs: Conversation[]) {
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - 7 * 86400000;

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older', items: [] },
  ];

  convs.forEach(c => {
    if (c.updatedAt >= startOfToday) groups[0].items.push(c);
    else if (c.updatedAt >= startOfYesterday) groups[1].items.push(c);
    else if (c.updatedAt >= startOfWeek) groups[2].items.push(c);
    else groups[3].items.push(c);
  });

  return groups.filter(g => g.items.length > 0);
}

const BG = 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)';

export function HistoryScreen() {
  const { setCurrentScreen, setMessages, setActiveConversationId, setChatMode, startNewConversation, conversations, refreshConversations } = useApp();
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const allConvs = conversations;
  const filtered = search
    ? allConvs.filter(c =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.messages.some(m => m.content.toLowerCase().includes(search.toLowerCase()))
      )
    : allConvs;

  const groups = groupConversations(filtered);

  const resumeConversation = (conv: Conversation) => {
    setActiveConversationId(conv.id);
    setChatMode(conv.mode);
    setMessages(conv.messages.map((m, i) => ({
      id: `hist_${conv.id}_${i}`,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })));
    setCurrentScreen('chat');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Ye conversation delete karo?')) {
      deleteConversation(id);
      refreshConversations();
      showToast('Chat delete ho gayi', 'success');
    }
  };

  const handleClearAll = () => {
    if (confirm('Saari chats delete karo? Ye undo nahi hoga.')) {
      deleteAllConversations();
      refreshConversations();
      showToast('Saari history clear ho gayi', 'success');
    }
  };

  const handleNewChat = () => {
    startNewConversation();
    setChatMode('chat');
    setCurrentScreen('chat');
  };

  return (
    <div className="screen screen-enter flex flex-col" style={{ background: BG }}>
      <div className="screen-header z-10 border-b border-white/[0.06]"
        style={{ background: 'rgba(10,10,10,0.88)', backdropFilter: 'blur(20px)' }}>
        <button onClick={() => setCurrentScreen('home')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-white font-bold text-lg">Chat History</div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch(s => !s)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:bg-white/10 transition-colors"
          >
            <Search size={18} />
          </button>
          {allConvs.length > 0 && (
            <button
              onClick={handleClearAll}
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
              style={{ color: 'rgba(255,100,100,0.7)' }}
              title="Clear all history"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {showSearch && (
        <div className="px-4 py-2 border-b border-white/[0.06]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search chats..."
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full rounded-xl px-4 py-2 text-white text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.85)' }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-area px-4 py-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pt-20">
            <div className="text-5xl opacity-20">👁️</div>
            <p className="text-white/50 font-medium">
              {search ? 'Koi chat nahi mili' : 'Abhi koi purani chat nahi hai'}
            </p>
            <p className="text-white/25 text-sm">
              {search ? 'Kuch aur search karo' : 'Naya sawaal poochho, main yaad rakhungi!'}
            </p>
          </div>
        ) : (
          groups.map(group => (
            <div key={group.label} className="mb-2">
              <div className="text-white/30 text-[11px] font-semibold tracking-wider uppercase px-1 mb-2 mt-4">
                {group.label}
              </div>
              {group.items.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => resumeConversation(conv)}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl mb-2 cursor-pointer transition-all hover:scale-[0.99] active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 text-sm"
                    style={{ background: 'linear-gradient(135deg, #2a2a2a, #555)' }}>
                    {modeIcon(conv.mode)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/85 font-semibold text-[13px] truncate">{conv.title}</div>
                    <div className="text-white/35 text-[11px] truncate mt-0.5">
                      {conv.messages[conv.messages.length - 1]?.content.slice(0, 50) || ''}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-white/30 text-[10px]">{relativeTime(conv.updatedAt)}</span>
                    <span className="text-white/20 text-[10px]">{modeLabel(conv.mode)}</span>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="text-white/20 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-white/[0.06]">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white font-semibold text-sm transition-all hover:scale-[0.99] active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #2a2a2a, #555)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Plus size={18} />
          New Chat
        </button>
      </div>
    </div>
  );
}
