export type ChatMode = 'chat' | 'voice' | 'websearch' | 'deepsearch';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  messages: ConversationMessage[];
  createdAt: number;
  updatedAt: number;
}

const HISTORY_KEY = 'eyeai_conversations';
const MAX_CONVERSATIONS = 50;

let _memoryFallback: Conversation[] = [];
let _useMemory = false;

function tryStorage() {
  try {
    localStorage.setItem('__eyeai_test__', '1');
    localStorage.removeItem('__eyeai_test__');
    return true;
  } catch {
    _useMemory = true;
    return false;
  }
}
tryStorage();

export function getAllConversations(): Conversation[] {
  if (_useMemory) return [..._memoryFallback];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAllConversations(conversations: Conversation[]): void {
  const trimmed = conversations
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CONVERSATIONS);
  if (_useMemory) { _memoryFallback = trimmed; return; }
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    _memoryFallback = trimmed;
  }
}

export function getConversation(id: string): Conversation | null {
  return getAllConversations().find(c => c.id === id) || null;
}

export function deleteConversation(id: string): void {
  saveAllConversations(getAllConversations().filter(c => c.id !== id));
}

export function deleteAllConversations(): void {
  if (_useMemory) { _memoryFallback = []; return; }
  try { localStorage.removeItem(HISTORY_KEY); } catch {}
}

export function generateTitle(firstUserMessage: string): string {
  const words = firstUserMessage.trim().split(/\s+/).slice(0, 6).join(' ');
  return words.length
    ? words + (firstUserMessage.split(/\s+/).length > 6 ? '...' : '')
    : 'New Chat';
}

export function createConversation(firstMessage: string, mode: ChatMode): Conversation {
  const conv: Conversation = {
    id: 'conv_' + Date.now(),
    title: generateTitle(firstMessage),
    mode,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const all = getAllConversations();
  all.push(conv);
  saveAllConversations(all);
  return conv;
}

export function appendMessageToConversation(
  id: string,
  role: 'user' | 'assistant',
  content: string
): void {
  const all = getAllConversations();
  const conv = all.find(c => c.id === id);
  if (!conv) return;
  conv.messages.push({ role, content, timestamp: Date.now() });
  conv.updatedAt = Date.now();
  saveAllConversations(all);
}

export function saveKey(provider: string, key: string) {
  try { localStorage.setItem(`eyeai_key_${provider}`, btoa(key)); } catch {}
}
export function getKey(provider: string): string | null {
  try {
    const stored = localStorage.getItem(`eyeai_key_${provider}`);
    return stored ? atob(stored) : null;
  } catch { return null; }
}
export function getSetting(key: string): string | null {
  try { return localStorage.getItem(`eyeai_setting_${key}`); } catch { return null; }
}
export function setSetting(key: string, value: string) {
  try { localStorage.setItem(`eyeai_setting_${key}`, value); } catch {}
}
export function getUserName(): string | null {
  try { return localStorage.getItem('eyeai_name'); } catch { return null; }
}
export function setUserName(name: string) {
  try { localStorage.setItem('eyeai_name', name); } catch {}
}
export function hasAnyKey(): boolean {
  return ['groq', 'gemini', 'openrouter', 'cerebras', 'mistral']
    .some(p => getKey(p) !== null);
}
export function clearHistory() {
  try { localStorage.removeItem('eyeai_conversations'); } catch {}
}
