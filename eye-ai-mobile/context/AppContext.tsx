import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { getUserName, setUserName as storeUserName, loadHistory, saveHistory } from "../lib/storage";

export type Screen = "splash" | "home" | "voice" | "chat";
export type OrbState = "idle" | "listening" | "processing" | "speaking";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AppContextType {
  userName: string;
  setUserName: (name: string) => Promise<void>;
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  orbState: OrbState;
  setOrbState: (state: OrbState) => void;
  activeProvider: string;
  setActiveProvider: (p: string) => void;
  providerStatus: Record<string, string>;
  setProviderStatus: (status: Record<string, string>) => void;
  updateProviderStatus: (provider: string, status: string) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isTyping: boolean;
  setIsTyping: (v: boolean) => void;
  addMessage: (role: "user" | "assistant", content: string) => Message;
  chatInput: string;
  setChatInput: (v: string) => void;
  pendingMessage: string;
  setPendingMessage: (v: string) => void;
  toasts: Array<{ id: number; message: string; type: string }>;
  showToast: (message: string, type?: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserNameState] = useState<string>("");
  const [currentScreen, setCurrentScreen] = useState<Screen>("splash");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [activeProvider, setActiveProvider] = useState<string>("Groq");
  const [providerStatus, setProviderStatus] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>("");
  const [pendingMessage, setPendingMessage] = useState<string>("");
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: string }>>([]);

  useEffect(() => {
    (async () => {
      const name = await getUserName();
      if (name) {
        setUserNameState(name);
        setCurrentScreen("home");
      }
      const history = await loadHistory();
      if (history.length > 0) {
        const msgs: Message[] = history.map((h, i) => ({
          id: `${i}`,
          role: h.role as "user" | "assistant",
          content: h.content,
          timestamp: Date.now() - (history.length - i) * 60000,
        }));
        setMessages(msgs);
      }
    })();
  }, []);

  const setUserName = useCallback(async (name: string) => {
    await storeUserName(name);
    setUserNameState(name);
  }, []);

  const updateProviderStatus = useCallback(
    (provider: string, status: string) => {
      setProviderStatus((prev) => ({ ...prev, [provider]: status }));
      if (status === "active") setActiveProvider(provider.charAt(0).toUpperCase() + provider.slice(1));
    },
    []
  );

  const addMessage = useCallback(
    (role: "user" | "assistant", content: string): Message => {
      const msg: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        role,
        content,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const next = [...prev, msg];
        const history = next.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
        saveHistory(history);
        return next;
      });
      return msg;
    },
    []
  );

  const showToast = useCallback((message: string, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <AppContext.Provider
      value={{
        userName,
        setUserName,
        currentScreen,
        setCurrentScreen,
        orbState,
        setOrbState,
        activeProvider,
        setActiveProvider,
        providerStatus,
        setProviderStatus,
        updateProviderStatus,
        messages,
        setMessages,
        isTyping,
        setIsTyping,
        addMessage,
        chatInput,
        setChatInput,
        pendingMessage,
        setPendingMessage,
        toasts,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
