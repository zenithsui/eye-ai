import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { OrbCanvas } from "../components/OrbCanvas";
import { Waveform } from "../components/Waveform";
import { useApp } from "../context/AppContext";
import { callAIWithFallback } from "../lib/ai-providers";
import { loadHistory, saveHistory } from "../lib/storage";
import { BUILT_IN_KEYS, DEFAULT_VOICE_ID } from "../lib/built-in-keys";

// ─── ElevenLabs TTS (web only — native uses expo-speech) ─────────────────────

async function speakElevenLabs(text: string): Promise<boolean> {
  if (Platform.OS !== "web") return false;
  const key = BUILT_IN_KEYS.elevenlabs;
  if (!key) return false;
  try {
    const resp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICE_ID}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": key,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: text.slice(0, 2500),
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.85,
            style: 0.2,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!resp.ok) return false;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    return new Promise<boolean>((resolve) => {
      const audio = new Audio(url);
      audio.onended = () => { URL.revokeObjectURL(url); resolve(true); };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      audio.play().catch(() => { URL.revokeObjectURL(url); resolve(false); });
    });
  } catch {
    return false;
  }
}

async function speakText(text: string): Promise<void> {
  const usedEL = await speakElevenLabs(text);
  if (usedEL) return;
  await new Promise<void>((resolve) => {
    Speech.speak(text, {
      language: "en-IN",
      rate: 0.9,
      pitch: 1.0,
      onDone: resolve,
      onStopped: resolve,
      onError: () => resolve(),
    });
  });
}

// ─── Voice recognition (web Speech API) ─────────────────────────────────────

let _webRec: any = null;
let _webRecOn = false;

function startWebRecognition(
  onResult: (text: string) => void,
  onInterim: (text: string) => void,
  onError: (msg: string) => void
): boolean {
  if (Platform.OS !== "web") return false;
  const SR =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!SR) return false;
  if (_webRecOn) return true;
  _webRec = new SR();
  _webRec.lang = "en-IN";
  _webRec.interimResults = true;
  _webRec.continuous = false;
  _webRec.maxAlternatives = 3;
  _webRec.onstart = () => { _webRecOn = true; };
  _webRec.onresult = (e: any) => {
    let interim = "", final = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    if (interim) onInterim(interim);
    if (final) onResult(final);
  };
  _webRec.onerror = (e: any) => {
    _webRecOn = false;
    if (e.error === "not-allowed") onError("Mic permission chahiye 🎤");
    else if (e.error !== "aborted" && e.error !== "no-speech") onError("Voice error — retry karo");
  };
  _webRec.onend = () => { _webRecOn = false; };
  try { _webRec.start(); return true; } catch { return false; }
}

function stopWebRecognition() {
  try { _webRec?.stop(); } catch {}
  _webRecOn = false;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function VoiceScreen() {
  const {
    setCurrentScreen,
    orbState,
    setOrbState,
    updateProviderStatus,
    showToast,
    addMessage,
    messages,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [statusText, setStatusText] = useState("Tap mic to speak");
  const [lastUserText, setLastUserText] = useState("");
  const [lastAIText, setLastAIText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      stopWebRecognition();
      Speech.stop();
    };
  }, []);

  const handleResult = useCallback(
    async (text: string) => {
      if (!isMounted.current) return;
      stopWebRecognition();
      setIsListening(false);
      setInterimText("");
      setLastUserText(text);
      setIsProcessing(true);
      setOrbState("processing");
      setStatusText("Thinking...");

      addMessage("user", text);

      try {
        const history = await loadHistory();
        const result = await callAIWithFallback(
          text,
          history,
          (p, s) => { updateProviderStatus(p, s); }
        );
        addMessage("assistant", result.text);
        await saveHistory([
          ...history,
          { role: "user", content: text },
          { role: "assistant", content: result.text },
        ]);

        if (!isMounted.current) return;
        setLastAIText(result.text);
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
        setOrbState("speaking");
        setStatusText("Speaking...");
        await speakText(result.text);
      } catch {
        if (isMounted.current) showToast("Yaar, kuch gadbad ho gayi. Retry karo!", "warning");
      } finally {
        if (isMounted.current) {
          setOrbState("idle");
          setStatusText("Tap mic to speak");
          setIsProcessing(false);
        }
      }
    },
    [addMessage, updateProviderStatus, showToast, setOrbState, textFadeAnim]
  );

  const handleMic = () => {
    if (isProcessing || orbState === "speaking") return;

    if (isListening) {
      stopWebRecognition();
      setIsListening(false);
      setOrbState("idle");
      setStatusText("Tap mic to speak");
      return;
    }

    if (Platform.OS === "web") {
      const started = startWebRecognition(
        handleResult,
        (t) => { if (isMounted.current) setInterimText(t); },
        (err) => { showToast(err, "warning"); setIsListening(false); setOrbState("idle"); setStatusText("Tap mic to speak"); }
      );
      if (started) {
        setIsListening(true);
        setOrbState("listening");
        setStatusText("Listening...");
      } else {
        showToast("Voice input is not supported here. Type in Chat!", "info");
        setCurrentScreen("chat");
      }
    } else {
      showToast("Voice input coming soon! Type in Chat now 🎤", "info");
      setCurrentScreen("chat");
    }
  };

  const handleStop = () => {
    Speech.stop();
    setOrbState("idle");
    setStatusText("Tap mic to speak");
  };

  return (
    <LinearGradient
      colors={
        orbState === "listening"
          ? ["#e879f9", "#c084fc", "#7dd3fc", "#ffffff"]
          : ["#ede8ff", "#d8d0ff", "#e8e4ff"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === "web" ? 67 : insets.top + 8 },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => { stopWebRecognition(); Speech.stop(); setCurrentScreen("home"); }}
          testID="btn-back"
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="rgba(61,48,102,0.8)" />
        </TouchableOpacity>
        <Text style={styles.title}>Voice Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {lastUserText ? (
          <Text style={styles.userQuote}>"{lastUserText}"</Text>
        ) : null}

        {interimText ? (
          <Text style={styles.interimText}>{interimText}</Text>
        ) : null}

        <Text
          style={[
            styles.statusText,
            orbState === "listening" && styles.statusListening,
            orbState === "speaking" && styles.statusSpeaking,
          ]}
        >
          {statusText}
        </Text>

        <OrbCanvas size={170} />

        <Text style={styles.subText}>
          {Platform.OS === "web"
            ? "Tap mic and speak in Hinglish"
            : "Powered by Eye AI"}
        </Text>

        <Waveform active={orbState === "listening" || orbState === "speaking"} />

        {lastAIText ? (
          <Animated.View style={[styles.aiResponse, { opacity: textFadeAnim }]}>
            <ScrollView style={styles.aiScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.aiText}>{lastAIText}</Text>
            </ScrollView>
          </Animated.View>
        ) : null}
      </View>

      <View
        style={[
          styles.controls,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
        ]}
      >
        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => { stopWebRecognition(); Speech.stop(); setCurrentScreen("chat"); }}
          testID="btn-to-chat"
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={22} color="rgba(61,48,102,0.7)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.micBtn,
            (orbState === "speaking" || isListening) && styles.micBtnActive,
          ]}
          onPress={orbState === "speaking" ? handleStop : handleMic}
          testID="btn-mic"
          activeOpacity={0.85}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={
              orbState === "speaking"
                ? ["#e879f9", "#7c6cf0"]
                : isListening
                ? ["#ef4444", "#dc2626"]
                : ["#7c6cf0", "#a89cf8"]
            }
            style={styles.micGradient}
          >
            <Feather
              name={orbState === "speaking" ? "volume-2" : isListening ? "mic" : "mic"}
              size={30}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlBtn}
          onPress={() => { stopWebRecognition(); Speech.stop(); setCurrentScreen("home"); }}
          testID="btn-close"
          activeOpacity={0.7}
        >
          <Feather name="x" size={22} color="rgba(61,48,102,0.7)" />
        </TouchableOpacity>
      </View>

      {isListening && (
        <Text style={styles.listeningHint}>Tap mic again to stop</Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#3d3066",
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  userQuote: {
    fontSize: 14,
    color: "rgba(61,48,102,0.6)",
    fontStyle: "italic",
    textAlign: "center",
    maxWidth: 280,
  },
  interimText: {
    fontSize: 13,
    color: "#7c6cf0",
    textAlign: "center",
    fontStyle: "italic",
    maxWidth: 280,
  },
  statusText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#3d3066",
    fontStyle: "italic",
  },
  statusListening: {
    color: "#7c6cf0",
    textShadowColor: "rgba(124,108,240,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  statusSpeaking: {
    color: "#e879f9",
    textShadowColor: "rgba(232,121,249,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subText: {
    fontSize: 13,
    color: "rgba(61,48,102,0.5)",
    textAlign: "center",
    lineHeight: 20,
  },
  aiResponse: {
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    padding: 14,
    maxHeight: 100,
    width: "100%",
  },
  aiScroll: { maxHeight: 80 },
  aiText: { fontSize: 14, color: "#3d3066", lineHeight: 20 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 32,
  },
  controlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  micBtn: {
    borderRadius: 40,
    overflow: "hidden",
    shadowColor: "#7c6cf0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  micBtnActive: {
    shadowColor: "#e879f9",
    shadowOpacity: 0.7,
  },
  micGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
  },
  listeningHint: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(61,48,102,0.45)",
    paddingBottom: 8,
  },
});
