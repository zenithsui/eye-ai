import { getKey, getSetting } from './storage';

export type OrbStateUpdater = (state: 'idle' | 'listening' | 'processing' | 'speaking') => void;

let recognition: SpeechRecognition | null = null;
let isListening = false;

export function startListening(
  onResult: (text: string) => void,
  onInterim: (text: string) => void,
  onStateChange: OrbStateUpdater,
  onError: (msg: string) => void
) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('Yaar, aapka browser voice input support nahi karta. Chrome try karo!');
    return;
  }
  if (isListening) { stopListening(); return; }

  recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN';
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => { isListening = true; onStateChange('listening'); };
  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
    if (event.results[event.results.length - 1].isFinal) {
      onStateChange('processing');
      onResult(transcript);
    } else {
      onInterim(transcript);
    }
  };
  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    isListening = false;
    onStateChange('idle');
    if (event.error === 'not-allowed') onError('Mic access chahiye. Browser settings mein allow karo 🎤');
    else if (event.error === 'no-speech') onError('Kuch suna nahi. Dobara try karo!');
  };
  recognition.onend = () => { isListening = false; };
  recognition.start();
}

export function stopListening() {
  recognition?.stop();
  isListening = false;
}

export function getIsListening() { return isListening; }

export async function speakText(text: string, onStateChange: OrbStateUpdater) {
  const key = getKey('elevenlabs');
  if (key) {
    try {
      const voiceId = getSetting('elevenlabs_voice_id') || 'EXAVITQu4vr4xnSDxMaL';
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true }
        })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onplay = () => onStateChange('speaking');
        audio.onended = () => { onStateChange('idle'); URL.revokeObjectURL(url); };
        audio.play();
        return;
      }
    } catch { /* fall through */ }
  }
  speakWithBrowserTTS(text, onStateChange);
}

function speakWithBrowserTTS(text: string, onStateChange: OrbStateUpdater) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India') || v.name.includes('Rishi'));
  if (indianVoice) utterance.voice = indianVoice;
  const speed = getSetting('voice_speed');
  utterance.rate = speed ? parseFloat(speed) : 0.95;
  utterance.pitch = 1.0;
  utterance.onstart = () => onStateChange('speaking');
  utterance.onend = () => onStateChange('idle');
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  window.speechSynthesis.cancel();
}