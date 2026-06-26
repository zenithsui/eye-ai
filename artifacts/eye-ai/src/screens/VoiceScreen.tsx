import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Mic, X, MessageSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Orb } from '../components/Orb';
import { Waveform } from '../components/Waveform';
import { startListening, stopListening, getIsListening, speakText, stopSpeaking } from '../lib/voice';
import { callAIWithFallback } from '../lib/ai-providers';
import { showToast } from '../components/Toast';

export function VoiceScreen() {
  const { setCurrentScreen, orbState, setOrbState, addMessage, messages, ensureConversation } = useApp();
  const [interimText, setInterimText] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopListening();
      stopSpeaking();
      setOrbState('idle');
    };
  }, [setOrbState]);

  const handleMicTap = () => {
    if (getIsListening()) {
      stopListening();
      setOrbState('idle');
      return;
    }

    stopSpeaking();
    setAiResponse('');
    setInterimText('');

    startListening(
      async (text) => {
        if (!isMounted.current) return;
        setLastQuestion(text);
        setInterimText('');
        ensureConversation(text, 'voice');
        addMessage('user', text);

        try {
          const history = messages.map(m => ({ role: m.role, content: m.content }));
          const result = await callAIWithFallback(text, history);
          if (!isMounted.current) return;
          addMessage('assistant', result.text);
          setAiResponse(result.text);
          speakText(result.text, (state) => {
            if (isMounted.current) setOrbState(state);
          });
        } catch (err: any) {
          if (!isMounted.current) return;
          setOrbState('idle');
          showToast('Thoda issue ho gaya, dobara try karo', 'warning');
        }
      },
      (interim) => { if (isMounted.current) setInterimText(interim); },
      (state) => { if (isMounted.current) setOrbState(state); },
      (err) => { if (isMounted.current) showToast(err, 'warning'); }
    );
  };

  const getStatusText = () => {
    if (orbState === 'listening') return interimText || 'Listening...';
    if (orbState === 'processing') return 'Processing...';
    if (orbState === 'speaking') return '';
    return 'Tap to speak...';
  };

  const BG = orbState === 'listening'
    ? 'linear-gradient(135deg, #1a1a1a 0%, #222 40%, #111 80%)'
    : 'linear-gradient(160deg, #0a0a0a 0%, #111 50%, #080808 100%)';

  return (
    <div className="screen screen-enter transition-colors duration-500" style={{ background: BG }}>
      <div className="screen-header">
        <button onClick={() => setCurrentScreen('home')} className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ArrowLeft size={20} />
        </button>
        <div className="text-white font-bold text-lg drop-shadow-md">Voice Chat</div>
        <div className="provider-badge">
          <div className="provider-dot active" />
          Eye AI
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {lastQuestion && orbState !== 'listening' && (
          <div className="absolute top-10 text-white/50 italic text-sm text-center max-w-[80%] line-clamp-2">
            "{lastQuestion}"
          </div>
        )}

        <Orb size="large" />

        <div className="mt-12 w-full flex flex-col items-center min-h-[100px] justify-center">
          {orbState === 'speaking' ? (
            <div className="text-white/80 font-medium text-center text-lg max-h-[120px] overflow-y-auto scroll-area px-4">
              {aiResponse}
            </div>
          ) : (
            <div className="status-text">{getStatusText()}</div>
          )}

          <div className="mt-6 opacity-60 h-10">
            <Waveform active={orbState === 'listening' || orbState === 'speaking'} />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center px-10 pb-12 pt-6">
        <button
          onClick={() => setCurrentScreen('chat')}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <MessageSquare size={20} />
        </button>

        <button
          data-testid="btn-mic"
          onClick={handleMicTap}
          className={`mic-btn ${orbState === 'listening' ? 'listening' : ''}`}
        >
          <Mic size={32} color="white" />
        </button>

        <button
          onClick={() => setCurrentScreen('home')}
          className="w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
