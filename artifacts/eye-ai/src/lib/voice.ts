import { getKey, getSetting, setSetting } from './storage';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'interrupted' | 'error';
export type SimpleOrbState = 'idle' | 'listening' | 'processing' | 'speaking';
export type OrbStateUpdater = (state: SimpleOrbState) => void;

export interface VoiceCallbacks {
  onStateChange: (state: VoiceState) => void;
  onInterimText: (text: string) => void;
  onUserMessage: (text: string) => void;
  onAIMessage: (text: string) => void;
  onError: (msg: string) => void;
  onAmplitude?: (amp: number) => void;
}

// ─── VOICE ENGINE (ChatGPT-style full voice loop) ────────────────────────────

export class VoiceEngine {
  private _state: VoiceState = 'idle';
  private _active = false;
  private _muted = false;
  autoListenEnabled: boolean;
  interruptionEnabled: boolean;
  private _cb: VoiceCallbacks;
  private _getAI: (text: string, history: { role: string; content: string }[]) => Promise<string>;
  private _getHistory: () => { role: string; content: string }[];
  private _saveMemory: (user: string, ai: string) => void;

  // Audio / VAD
  private _audioCtx: AudioContext | null = null;
  private _analyser: AnalyserNode | null = null;
  private _mic: MediaStream | null = null;
  private _vadTimer: ReturnType<typeof setInterval> | null = null;
  private _silTimer: ReturnType<typeof setTimeout> | null = null;
  private _noiseFloor = 0;
  private _speechStart = 0;
  private _userTalking = false;

  // Speech recognition
  private _rec: any = null;
  private _recOn = false;
  private _final = '';

  // TTS
  private _audio: HTMLAudioElement | null = null;
  private _ttsAbort = false;

  constructor(
    cb: VoiceCallbacks,
    getAI: (text: string, history: { role: string; content: string }[]) => Promise<string>,
    getHistory: () => { role: string; content: string }[],
    saveMemory: (user: string, ai: string) => void
  ) {
    this._cb = cb;
    this._getAI = getAI;
    this._getHistory = getHistory;
    this._saveMemory = saveMemory;
    this.autoListenEnabled = getSetting('auto_listen') !== 'false';
    this.interruptionEnabled = getSetting('interruption_enabled') !== 'false';
  }

  get state() { return this._state; }

  private _set(s: VoiceState) {
    this._state = s;
    this._cb.onStateChange(s);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async start() {
    this._active = true;
    this._set('idle');
    const greeting = this._greet();
    await this._speak(greeting);
  }

  stop() {
    this._active = false;
    this._stopRec();
    this._stopTTS();
    this._stopMic();
    this._set('idle');
  }

  handleMicTap() {
    switch (this._state) {
      case 'idle':        this._listen(); break;
      case 'listening':   this._manualStop(); break;
      case 'speaking':    this._interrupt(); break;
      case 'interrupted': this._listen(); break;
      case 'processing':  break; // ignore during AI call
      default:            this._listen();
    }
  }

  toggleAutoListen(): boolean {
    this.autoListenEnabled = !this.autoListenEnabled;
    setSetting('auto_listen', this.autoListenEnabled ? 'true' : 'false');
    return this.autoListenEnabled;
  }

  get isMuted() { return this._muted; }

  mute() {
    if (this._muted) return;
    this._muted = true;
    this._stopRec();
    if (this._vadTimer) { clearInterval(this._vadTimer); this._vadTimer = null; }
    this._set('idle');
  }

  unmute() {
    if (!this._muted) return;
    this._muted = false;
    if (this._active) this._listen();
  }

  // ── Greeting ──────────────────────────────────────────────────────────────

  private _greet(): string {
    const h = new Date().getHours();
    const t = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return `${t} yaar! Main Eye AI hoon. Kuch poochna hai?`;
  }

  // ── Audio / VAD ───────────────────────────────────────────────────────────

  private async _initAudio(): Promise<boolean> {
    try {
      this._mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      this._audioCtx = new AudioContext();
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyser.smoothingTimeConstant = 0.8;
      this._audioCtx.createMediaStreamSource(this._mic).connect(this._analyser);
      await this._calibrate();
      return true;
    } catch {
      this._cb.onError('Mic access nahi mila. Browser settings mein allow karo 🎤');
      return false;
    }
  }

  private _calibrate(): Promise<void> {
    return new Promise(res => {
      const data = new Uint8Array(this._analyser!.frequencyBinCount);
      const samples: number[] = [];
      const iv = setInterval(() => {
        this._analyser!.getByteFrequencyData(data);
        samples.push(data.reduce((s, v) => s + v, 0) / data.length / 255);
        if (samples.length >= 10) {
          clearInterval(iv);
          this._noiseFloor = (samples.reduce((s, v) => s + v, 0) / samples.length) * 1.5;
          res();
        }
      }, 50);
    });
  }

  private _stopMic() {
    this._mic?.getTracks().forEach(t => t.stop());
    this._mic = null;
    if (this._vadTimer) { clearInterval(this._vadTimer); this._vadTimer = null; }
    if (this._silTimer) { clearTimeout(this._silTimer); this._silTimer = null; }
    this._userTalking = false;
  }

  private _startVAD() {
    if (!this._analyser) return;
    const data = new Uint8Array(this._analyser.frequencyBinCount);
    this._userTalking = false;

    this._vadTimer = setInterval(() => {
      if (!this._analyser) return;
      this._analyser.getByteFrequencyData(data);
      const amp = data.reduce((s, v) => s + v, 0) / data.length / 255;
      this._cb.onAmplitude?.(amp);
      const isSpeech = amp > Math.max(0.012, this._noiseFloor);

      if (isSpeech && !this._userTalking) {
        this._userTalking = true;
        this._speechStart = Date.now();
        if (this._silTimer) { clearTimeout(this._silTimer); this._silTimer = null; }
        // Interruption: if AI is speaking and user starts talking
        if (this._state === 'speaking' && this.interruptionEnabled) {
          this._interrupt();
        }
      } else if (!isSpeech && this._userTalking && !this._silTimer) {
        this._silTimer = setTimeout(() => {
          const dur = Date.now() - this._speechStart;
          this._userTalking = false;
          this._silTimer = null;
          if (dur >= 400) this._onSpeechEnd();
          // else too short, keep listening
        }, 1500);
      }
    }, 30);
  }

  private _onSpeechEnd() {
    const text = this._final.trim();
    this._final = '';
    this._cb.onInterimText('');
    this._stopRec();
    if (this._vadTimer) { clearInterval(this._vadTimer); this._vadTimer = null; }
    if (!text || text.length < 2) {
      if (this._active) this._listen();
      return;
    }
    this._handleMessage(text);
  }

  // ── Speech Recognition ────────────────────────────────────────────────────

  private _initRec(): boolean {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { this._cb.onError('Voice ke liye Chrome use karo 🎤'); return false; }
    this._rec = new SR();
    this._rec.lang = getSetting('voice_language') || 'en-IN';
    this._rec.interimResults = true;
    this._rec.continuous = true;
    this._rec.maxAlternatives = 1;

    this._rec.onstart = () => { this._recOn = true; this._final = ''; };
    this._rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) this._final += t + ' ';
        else interim += t;
      }
      this._cb.onInterimText((this._final + interim).trim());
    };
    this._rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed') { this._cb.onError('Mic permission chahiye 🎤'); }
    };
    this._rec.onend = () => {
      this._recOn = false;
      if (this._state === 'listening' && this._active) {
        setTimeout(() => this._startRec(), 100);
      }
    };
    return true;
  }

  private _startRec() {
    if (!this._rec && !this._initRec()) return;
    if (this._recOn) return;
    try { this._rec.start(); } catch {}
  }

  private _stopRec() {
    if (this._rec && this._recOn) {
      try { this._rec.stop(); } catch {}
      this._recOn = false;
    }
  }

  // ── Conversation flow ─────────────────────────────────────────────────────

  private async _listen() {
    if (!this._active || this._muted) return;
    if (!this._mic) {
      const ok = await this._initAudio();
      if (!ok) return;
    }
    this._set('listening');
    this._startRec();
    this._startVAD();
  }

  private _manualStop() {
    this._stopRec();
    if (this._vadTimer) { clearInterval(this._vadTimer); this._vadTimer = null; }
    const text = this._final.trim();
    this._final = '';
    this._cb.onInterimText('');
    if (text.length > 2) this._handleMessage(text);
    else this._set('idle');
  }

  private async _handleMessage(text: string) {
    this._set('processing');
    this._cb.onUserMessage(text);
    try {
      const history = this._getHistory();
      const aiText = await this._getAI(text, history);
      this._cb.onAIMessage(aiText);
      this._saveMemory(text, aiText);
      await this._speak(aiText);
    } catch {
      this._set('error');
      await this._speak('Yaar, kuch gadbad ho gayi. Dobara bol do!');
      setTimeout(() => { if (this._active) this._listen(); }, 500);
    }
  }

  private _interrupt() {
    if (this._state !== 'speaking') return;
    this._stopTTS();
    this._set('interrupted');
    setTimeout(() => { if (this._active) this._listen(); }, 300);
  }

  // ── TTS (sentence-by-sentence) ────────────────────────────────────────────

  private _splitSentences(text: string): string[] {
    const clean = text
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`{1,3}[^`\n]*`{1,3}/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s*[-*+]\s/gm, '')
      .replace(/^\s*\d+\.\s/gm, '');
    return clean.split(/(?<=[।.!?])\s+/).map(s => s.trim()).filter(s => s.length > 5);
  }

  private async _speak(text: string) {
    this._ttsAbort = false;
    const sentences = this._splitSentences(text);
    if (!sentences.length) {
      if (this.autoListenEnabled && this._active) setTimeout(() => this._listen(), 400);
      else this._set('idle');
      return;
    }
    this._set('speaking');
    for (const sentence of sentences) {
      if (this._ttsAbort) break;
      await this._playSentence(sentence);
    }
    if (!this._ttsAbort) {
      if (this.autoListenEnabled && this._active) setTimeout(() => this._listen(), 400);
      else this._set('idle');
    }
  }

  private async _playSentence(sentence: string): Promise<void> {
    if (this._ttsAbort) return;
    const elevenKey = getKey('elevenlabs') || ((import.meta as any).env?.VITE_ELEVENLABS_KEY || '');
    if (elevenKey) {
      try {
        const voiceId = getSetting('elevenlabs_voice_id') || 'EXAVITQu4vr4xnSDxMaL';
        const resp = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
          {
            method: 'POST',
            headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
            body: JSON.stringify({
              text: sentence,
              model_id: 'eleven_flash_v2_5',
              voice_settings: { stability: 0.55, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true },
              optimize_streaming_latency: 3,
            }),
          }
        );
        if (resp.ok) {
          const blob = await resp.blob();
          await this._playURL(URL.createObjectURL(blob));
          return;
        }
      } catch {}
    }
    await this._browserTTS(sentence);
  }

  private _playURL(url: string): Promise<void> {
    return new Promise(res => {
      if (this._ttsAbort) { URL.revokeObjectURL(url); res(); return; }
      const audio = new Audio(url);
      this._audio = audio;
      const spd = getSetting('voice_speed');
      if (spd) audio.playbackRate = parseFloat(spd);
      audio.onended = () => { URL.revokeObjectURL(url); this._audio = null; res(); };
      audio.onerror = () => { URL.revokeObjectURL(url); this._audio = null; res(); };
      audio.play().catch(() => { this._audio = null; res(); });
    });
  }

  private _browserTTS(text: string): Promise<void> {
    return new Promise(res => {
      if (this._ttsAbort || !window.speechSynthesis) { res(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const spd = getSetting('voice_speed');
      u.rate = spd ? parseFloat(spd) : 0.95;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang.startsWith('en')) || null;
      if (v) u.voice = v;
      u.onend = () => res();
      u.onerror = () => res();
      window.speechSynthesis.speak(u);
    });
  }

  private _stopTTS() {
    this._ttsAbort = true;
    if (this._audio) { this._audio.pause(); this._audio.src = ''; this._audio = null; }
    try { window.speechSynthesis?.cancel(); } catch {}
  }
}

// ─── LEGACY EXPORTS (used by ChatScreen mic-to-text input) ───────────────────

let _recognition: any = null;
let _isListening = false;
let _currentAudio: HTMLAudioElement | null = null;

function getIsIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream; }
function getIsAndroid() { return /Android/.test(navigator.userAgent); }

export function startListening(
  onResult: (text: string) => void,
  onInterim: (text: string) => void,
  onStateChange: OrbStateUpdater,
  onError: (msg: string) => void
) {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition || (window as any).msSpeechRecognition;
  if (!SR) { onError('Voice ke liye Chrome ya Edge use karo 🎤'); return; }
  if (_isListening) { stopListening(); return; }

  _recognition = new SR();
  _recognition.lang = 'en-IN';
  _recognition.interimResults = true;
  _recognition.continuous = false;
  _recognition.maxAlternatives = 3;

  _recognition.onstart = () => { _isListening = true; onStateChange('listening'); };
  _recognition.onresult = (event: any) => {
    let interim = '', final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t;
      else interim += t;
    }
    if (interim) onInterim(interim);
    if (final) { onStateChange('processing'); onResult(final); }
  };
  _recognition.onerror = (event: any) => {
    _isListening = false;
    onStateChange('idle');
    if (event.error === 'not-allowed') onError('Mic permission chahiye. Browser settings mein mic allow karo 🎤');
    else if (event.error === 'no-speech') onError('Kuch suna nahi — dobara try karo!');
    else if (event.error !== 'aborted') onError('Voice issue — dobara try karo');
  };
  _recognition.onend = () => { _isListening = false; };
  try { _recognition.start(); } catch { _isListening = false; onError('Voice start nahi hua — dobara tap karo'); }
}

export function stopListening() { try { _recognition?.stop(); } catch {} _isListening = false; }
export function getIsListening() { return _isListening; }

export async function speakText(text: string, onStateChange: OrbStateUpdater) {
  stopSpeaking();
  const elevenKey = getKey('elevenlabs') || ((import.meta as any).env?.VITE_ELEVENLABS_KEY || '');
  if (elevenKey) {
    try {
      const voiceId = getSetting('elevenlabs_voice_id') || 'EsGA6YZzJKyddqvfyQ26';
      const speed = getSetting('voice_speed');
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 2500), model_id: 'eleven_flash_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true, speed: speed ? parseFloat(speed) : 1.0 },
        }),
      });
      if (response.ok) {
        const url = URL.createObjectURL(await response.blob());
        _currentAudio = new Audio(url);
        _currentAudio.onplay = () => onStateChange('speaking');
        _currentAudio.onended = () => { onStateChange('idle'); URL.revokeObjectURL(url); _currentAudio = null; };
        _currentAudio.onerror = () => { onStateChange('idle'); URL.revokeObjectURL(url); _currentAudio = null; _browserTTS(text, onStateChange); };
        try { await _currentAudio.play(); return; } catch { _currentAudio = null; }
      }
    } catch {}
  }
  _browserTTS(text, onStateChange);
}

function _browserTTS(text: string, onStateChange: OrbStateUpdater) {
  if (!window.speechSynthesis) { onStateChange('idle'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const speed = getSetting('voice_speed');
  u.rate = speed ? parseFloat(speed) : 0.95;
  u.pitch = 1.0; u.volume = 1.0;
  const pickVoice = () => {
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.name.toLowerCase().includes('india')) || voices.find(v => v.lang.startsWith('en')) || null;
    if (v) u.voice = v;
  };
  window.speechSynthesis.getVoices().length > 0 ? pickVoice() : (window.speechSynthesis.onvoiceschanged = () => { pickVoice(); window.speechSynthesis.onvoiceschanged = null; });
  u.onstart = () => onStateChange('speaking');
  u.onend = () => onStateChange('idle');
  u.onerror = () => onStateChange('idle');
  if (getIsIOS() && text.length > 200) {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    let idx = 0;
    const next = () => {
      if (idx >= sentences.length) { onStateChange('idle'); return; }
      const uu = new SpeechSynthesisUtterance(sentences[idx++]);
      uu.rate = u.rate; uu.pitch = u.pitch; uu.volume = u.volume;
      if (u.voice) uu.voice = u.voice;
      if (idx === 1) uu.onstart = () => onStateChange('speaking');
      uu.onend = next; uu.onerror = () => onStateChange('idle');
      window.speechSynthesis.speak(uu);
    };
    next(); return;
  }
  window.speechSynthesis.speak(u);
  if (getIsAndroid()) {
    const ka = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(ka); return; }
      window.speechSynthesis.pause(); window.speechSynthesis.resume();
    }, 10000);
    u.onend = () => { clearInterval(ka); onStateChange('idle'); };
    u.onerror = () => { clearInterval(ka); onStateChange('idle'); };
  }
}

export function stopSpeaking() {
  if (_currentAudio) { _currentAudio.pause(); _currentAudio.src = ''; _currentAudio = null; }
  try { window.speechSynthesis?.cancel(); } catch {}
}
