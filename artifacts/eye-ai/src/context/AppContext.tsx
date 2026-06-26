import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserName, saveAllConversations, getAllConversations, createConversation, appendMessageToConversation } from '../lib/storage';
import type { ChatMode, Conversation } from '../lib/storage';

export type { ChatMode };

type Screen = 'splash' | 'home' | 'voice' | 'chat' | 'settings' | 'history';
type OrbState = 'idle' | 'listening' | 'processing' | 'speaking';
type Message = { id: string; role: 'user' | 'assistant'; content: string; timestamp: number };

interface AppContextType {
  userName: string | null;
  setUserName: (name: string) => void;
  currentScreen: Screen;
  setCurrentScreen: (s: Screen) => void;
  orbState: OrbState;
  setOrbState: (s: OrbState) => void;
  isTyping: boolean;
  setIsTyping: (t: boolean) => void;
  chatInput: string;
  setChatInput: (t: string) => void;
  chatMode: ChatMode;
  setChatMode: (m: ChatMode) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearMessages: () => void;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  startNewConversation: () => void;
  ensureConversation: (firstMsg: string, mode: ChatMode) => string;
  conversations: Conversation[];
  refreshConversations: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [isTyping, setIsTyping] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const name = getUserName();
    if (name) {
      setUserNameState(name);
      setCurrentScreen('home');
    }
    setConversations(getAllConversations());
  }, []);

  const setUserName = (name: string) => {
    try { localStorage.setItem('eyeai_name', name); } catch {}
    setUserNameState(name);
  };

  const refreshConversations = () => {
    setConversations(getAllConversations());
  };

  const ensureConversation = (firstMsg: string, mode: ChatMode): string => {
    if (activeConversationId) return activeConversationId;
    const conv = createConversation(firstMsg, mode);
    setActiveConversationId(conv.id);
    setConversations(getAllConversations());
    return conv.id;
  };

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    const msg: Message = {
      id: Math.random().toString(36).substring(7),
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    if (activeConversationId) {
      appendMessageToConversation(activeConversationId, role, content);
      setConversations(getAllConversations());
    }
  };

  const clearMessages = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  const startNewConversation = () => {
    setMessages([]);
    setActiveConversationId(null);
  };

  return (
    <AppContext.Provider value={{
      userName, setUserName,
      currentScreen, setCurrentScreen,
      orbState, setOrbState,
      isTyping, setIsTyping,
      chatInput, setChatInput,
      chatMode, setChatMode,
      messages, setMessages, addMessage, clearMessages,
      activeConversationId, setActiveConversationId,
      startNewConversation, ensureConversation,
      conversations, refreshConversations,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
