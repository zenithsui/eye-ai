import { getKey, getSetting } from './storage';

export type OrbStateUpdater = (state: 'idle' | 'listening' | 'processing' | 'speaking') => void;

let recognition: any = null;
let isListening = false;
let currentAudio: HTMLAudioElement | null = null;

// Cross-platform: detect device type (evaluated lazily to avoid SSR issues)
function getIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}
function getIsAndroid() {
  return /Android/.test(navigator.userAgent);
}

export function startListening(
  onResult: (text: string) => void,
  onInterim: (text: string) => void,
  onStateChange: OrbStateUpdater,
  onError: (msg: string) => void
) {
  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    onError('Voice input ke liye Chrome ya Edge browser use karo 🎤');
    return;
  }
  if (isListening) { stopListening(); return; }

  recognition = new SpeechRecognitionAPI();
  // en-IN supports Hinglish code-switching and works on Windows/Linux/Mac/Android/iOS
  // hi-IN is unreliable on Windows Chrome and many Linux browsers
  recognition.lang = 'en-IN';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 3;

  recognition.onstart = () => {
    isListening = true;
    onStateChange('listening');
  };

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    if (interimTranscript) onInterim(interimTranscript);
    if (finalTranscript) {
      onStateChange('processing');
      onResult(finalTranscript);
    }
  };

  recognition.onerror = (event: any) => {
    isListening = false;
    onStateChange('idle');
    switch (event.error) {
      case 'not-allowed':
      case 'permission-denied':
        onError('Mic permission chahiye. Browser settings mein mic allow karo 🎤');
        break;
      case 'no-speech':
        onError('Kuch suna nahi — dobara try karo!');
        break;
      case 'network':
        onError('Network issue — internet check karo');
        break;
      case 'aborted':
        break;
      default:
        onError('Voice issue — dobara try karo');
    }
  };

  recognition.onend = () => {
    isListening = false;
  };

  try {
    recognition.start();
  } catch {
    isListening = false;
    onError('Voice start nahi hua — dobara tap karo');
  }
}

export function stopListening() {
  try { recognition?.stop(); } catch {}
  isListening = false;
}

export function getIsListening() { return isListening; }

export async function speakText(text: string, onStateChange: OrbStateUpdater) {
  // Stop any ongoing speech first
  stopSpeaking();

  // Try ElevenLabs TTS first (best quality)
  const elevenKey = getKey('elevenlabs') || (import.meta.env.VITE_ELEVENLABS_KEY || '');
  if (elevenKey) {
    try {
      const voiceId = getSetting('elevenlabs_voice_id') || 'EsGA6YZzJKyddqvfyQ26';
      const speed = getSetting('voice_speed');
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 2500),
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85,
            style: 0.3,
            use_speaker_boost: true,
            speed: speed ? parseFloat(speed) : 1.0,
          },
        }),
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        currentAudio = new Audio(url);
        currentAudio.onplay = () => onStateChange('speaking');
        currentAudio.onended = () => {
          onStateChange('idle');
          URL.revokeObjectURL(url);
          currentAudio = null;
        };
        currentAudio.onerror = () => {
          onStateChange('idle');
          URL.revokeObjectURL(url);
          currentAudio = null;
          speakWithBrowserTTS(text, onStateChange);
        };
        // iOS requires user gesture before audio play — catch the error
        try {
          await currentAudio.play();
        } catch {
          currentAudio = null;
          speakWithBrowserTTS(text, onStateChange);
        }
        return;
      }
    } catch {
      // Fall through to browser TTS
    }
  }

  speakWithBrowserTTS(text, onStateChange);
}

function speakWithBrowserTTS(text: string, onStateChange: OrbStateUpdater) {
  if (!window.speechSynthesis) {
    onStateChange('idle');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const speed = getSetting('voice_speed');
  utterance.rate = speed ? parseFloat(speed) : 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    // Priority: Indian English > Hindi > any English > default
    const preferred =
      voices.find(v => v.lang === 'en-IN') ||
      voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.name.toLowerCase().includes('india')) ||
      voices.find(v => v.name.toLowerCase().includes('rishi')) ||
      voices.find(v => v.lang.startsWith('en')) ||
      null;
    if (preferred) utterance.voice = preferred;
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    pickVoice();
  } else {
    // Voices load async on some browsers/platforms
    window.speechSynthesis.onvoiceschanged = () => {
      pickVoice();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }

  utterance.onstart = () => onStateChange('speaking');
  utterance.onend = () => onStateChange('idle');
  utterance.onerror = () => onStateChange('idle');

  // iOS Safari bug: speechSynthesis stops mid-sentence on long text — chunk it
  if (getIsIOS() && text.length > 200) {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    let idx = 0;
    const speakNext = () => {
      if (idx >= sentences.length) { onStateChange('idle'); return; }
      const u = new SpeechSynthesisUtterance(sentences[idx++]);
      u.rate = utterance.rate;
      u.pitch = utterance.pitch;
      u.volume = utterance.volume;
      if (utterance.voice) u.voice = utterance.voice;
      if (idx === 1) u.onstart = () => onStateChange('speaking');
      u.onend = speakNext;
      u.onerror = () => onStateChange('idle');
      window.speechSynthesis.speak(u);
    };
    speakNext();
    return;
  }

  window.speechSynthesis.speak(utterance);

  // Android Chrome bug: speechSynthesis pauses after ~15s — keep it alive
  if (getIsAndroid()) {
    const keepAlive = setInterval(() => {
      if (!window.speechSynthesis.speaking) {
        clearInterval(keepAlive);
        return;
      }
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }, 10000);
    utterance.onend = () => { clearInterval(keepAlive); onStateChange('idle'); };
    utterance.onerror = () => { clearInterval(keepAlive); onStateChange('idle'); };
  }
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  try { window.speechSynthesis?.cancel(); } catch {}
}
