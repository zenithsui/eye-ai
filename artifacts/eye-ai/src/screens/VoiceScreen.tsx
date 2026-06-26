import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Mic, X, MessageSquare, RefreshCw, MicOff, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Orb } from '../components/Orb';
import { VoiceEngine, VoiceState } from '../lib/voice';
import { callAIWithFallback } from '../lib/ai-providers';
import { showToast } from '../components/Toast';
import { extractAndSaveMemory } from '../lib/memory';

interface VoiceMessage { role: 'user' | 'ai'; text: string }

const STATE_LABELS: Record<VoiceState, { main: string; sub: string }> = {
  idle:        { main: 'Tap to speak',       sub: 'Main sun ne ke liye ready hoon' },
  listening:   { main: 'Listening...',        sub: 'Bol do, main sun rahi hoon' },
  processing:  { main: 'Soch rahi hoon...',  sub: 'Ek second, answer dhoond rahi hoon' },
  speaking:    { main: 'Speaking...',         sub: 'Tap to interrupt' },
  interrupted: { main: 'Ruk gayi...',        sub: 'Bol do tumhara sawaal' },
  error:       { main: 'Kuch gadbad ho gayi', sub: 'Dobara try karo' },
};

export function VoiceScreen() {
  const { setCurrentScreen, addMessage, messages, ensureConversation, setOrbState } = useApp();

  const [voiceState, setVoiceStateLocal] = useState<VoiceState>('idle');
  const [interimText, setInterimText] = useState('');
  const [transcript, setTranscript] = useState<VoiceMessage[]>([]);
  const [autoListen, setAutoListen] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [orbScale, setOrbScale] = useState(1);

  const engineRef = useRef<VoiceEngine | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);
  const animFrameRef = useRef<number | null>(null);

  const orbMap: Record<VoiceState, 'idle' | 'listening' | 'processing' | 'speaking'> = {
    idle: 'idle', listening: 'listening', processing: 'processing',
    speaking: 'speaking', interrupted: 'listening', error: 'idle',
  };

  const handleState = useCallback((s: VoiceState) => {
    if (!isMounted.current) return;
    setVoiceStateLocal(s);
    setOrbState(orbMap[s]);
  }, [setOrbState]);

  const handleInterim = useCallback((t: string) => {
    if (isMounted.current) setInterimText(t);
  }, []);

  const handleUserMessage = useCallback((text: string) => {
    if (!isMounted.current) return;
    ensureConversation(text, 'voice');
    addMessage('user', text);
    setTranscript(prev => [...prev, { role: 'user', text }]);
    setInterimText('');
  }, [addMessage, ensureConversation]);

  const handleAIMessage = useCallback((text: string) => {
    if (!isMounted.current) return;
    addMessage('assistant', text);
    setTranscript(prev => [...prev, { role: 'ai', text }]);
  }, [addMessage]);

  const handleError = useCallback((msg: string) => {
    if (isMounted.current) showToast(msg, 'warning');
  }, []);

  const handleAmplitude = useCallback((amp: number) => {
    if (!isMounted.current) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      setOrbScale(1 + amp * 0.35);
    });
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const engine = new VoiceEngine(
      {
        onStateChange: handleState,
        onInterimText: handleInterim,
        onUserMessage: handleUserMessage,
        onAIMessage: handleAIMessage,
        onError: handleError,
        onAmplitude: handleAmplitude,
      },
      async (text, history) => {
        const result = await callAIWithFallback(text, history, 'voice');
        extractAndSaveMemory(text, result.text);
        return result.text;
      },
      () => messages.map(m => ({ role: m.role, content: m.content })),
      (u, a) => extractAndSaveMemory(u, a)
    );

    engineRef.current = engine;
    setAutoListen(engine.autoListenEnabled);
    setIsMuted(engine.isMuted);
    engine.start();

    return () => {
      isMounted.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      engineRef.current?.stop();
      engineRef.current = null;
      setOrbState('idle');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleMicTap = () => engineRef.current?.handleMicTap();

  const handleToggleAutoListen = () => {
    if (!engineRef.current) return;
    const next = engineRef.current.toggleAutoListen();
    setAutoListen(next);
    showToast(next ? 'Auto-listen ON — hands-free mode 🎤' : 'Auto-listen OFF — tap to speak', 'success');
  };

  const handleToggleMute = () => {
    if (!engineRef.current) return;
    if (isMuted) {
      engineRef.current.unmute();
      setIsMuted(false);
      showToast('Unmuted 🎤', 'success');
    } else {
      engineRef.current.mute();
      setIsMuted(true);
      showToast('Muted 🔇', 'switch');
    }
  };

  const handleClose = () => {
    engineRef.current?.stop();
    setCurrentScreen('home');
  };

  const label = STATE_LABELS[voiceState];
  const isListeningState = voiceState === 'listening' || voiceState === 'interrupted';
  const isSpeakingState = voiceState === 'speaking';
  const BG = isListeningState
    ? 'linear-gradient(135deg, #0d0d1a 0%, #1a1230 40%, #0d0d1a 100%)'
    : 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)';

  return (
    <div className="screen screen-enter transition-colors duration-500" style={{ background: BG }}>

      {/* Header */}
      <div className="screen-header">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <div className="text-white font-bold text-lg">Voice Chat</div>
          <div className={`voice-state-badge ${voiceState}`}>{isMuted ? 'muted' : voiceState}</div>
        </div>
        <div className="flex items-center gap-1">
          {/* Mute button */}
          <button
            onClick={handleToggleMute}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
            style={{
              background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)',
              border: isMuted ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {isMuted
              ? <MicOff size={16} color="#fca5a5" />
              : <Volume2 size={16} color="rgba(255,255,255,0.5)" />
            }
          </button>
          {/* Auto-listen button */}
          <button
            onClick={handleToggleAutoListen}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: autoListen ? 'rgba(124,108,240,0.25)' : 'rgba(255,255,255,0.06)',
              border: autoListen ? '1px solid rgba(124,108,240,0.5)' : '1px solid rgba(255,255,255,0.08)',
            }}
            title={`Auto-listen: ${autoListen ? 'ON' : 'OFF'}`}
          >
            <RefreshCw size={16} color={autoListen ? '#b8aeff' : 'rgba(255,255,255,0.5)'} />
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="voice-transcript">
        {transcript.length === 0 && (
          <div className="flex items-center justify-center h-full opacity-25 text-white text-sm text-center px-8">
            Your conversation will appear here...
          </div>
        )}
        {transcript.map((m, i) => (
          <div key={i} className={`voice-bubble-row ${m.role === 'user' ? 'user' : 'ai'}`}>
            <div className={m.role === 'user' ? 'voice-user-bubble' : 'voice-ai-bubble'}>
              {m.role === 'user' ? '🗣️ ' : '👁️ '}
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Orb + Status */}
      <div className="voice-orb-area">
        <div className="text-white/80 font-semibold text-base text-center mb-1">{label.main}</div>

        <div className="relative flex items-center justify-center my-2">
          <div
            style={{
              transform: `scale(${isListeningState || isSpeakingState ? orbScale : 1})`,
              transition: 'transform 0.06s ease-out',
            }}
          >
            <Orb size="large" />
          </div>
          <div className={`orb-waveform-ring ${isListeningState ? 'listening' : isSpeakingState ? 'speaking' : ''}`} />
        </div>

        <div className="voice-interim-text" style={{ opacity: interimText ? 1 : 0 }}>
          {interimText || '​'}
        </div>
        <div className="text-white/35 text-xs text-center mt-1">{label.sub}</div>
      </div>

      {/* Controls */}
      <div className="voice-controls">
        <button
          onClick={() => { engineRef.current?.stop(); setCurrentScreen('chat'); }}
          className="voice-ctrl-btn"
          title="Switch to Chat"
        >
          <MessageSquare size={20} />
        </button>

        {/* Mic button with ripple rings */}
        <button
          onClick={handleMicTap}
          className={`mic-btn ${isListeningState ? 'listening' : ''} ${isMuted ? 'muted' : ''}`}
          data-testid="btn-mic"
          style={{ position: 'relative' }}
        >
          <Mic size={32} color="white" />
          {isListeningState && (
            <>
              <span className="mic-ripple r1" />
              <span className="mic-ripple r2" />
            </>
          )}
        </button>

        <button
          onClick={handleClose}
          className="voice-ctrl-btn"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="text-center text-xs pb-4 cursor-pointer select-none"
        style={{ color: autoListen ? '#b8aeff' : 'rgba(255,255,255,0.25)' }}
        onClick={handleToggleAutoListen}
      >
        {isMuted ? '🔇 Muted — tap mic to unmute' : `Auto-listen: ${autoListen ? 'ON' : 'OFF'}`}
      </div>
    </div>
  );
}
