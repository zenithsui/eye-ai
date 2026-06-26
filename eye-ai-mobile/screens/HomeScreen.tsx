import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { OrbCanvas } from "../components/OrbCanvas";
import { useApp } from "../context/AppContext";

const FEATURE_CARDS = [
  { icon: "mic", label: "Voice Chat AI", screen: "voice" as const },
  { icon: "message-circle", label: "Chat with AI", screen: "chat" as const },
  { icon: "search", label: "Web Search", screen: "chat" as const },
  { icon: "zap", label: "Deep Search", screen: "chat" as const },
];

const SUGGESTIONS = [
  "Stock market aaj kaisa hai?",
  "Ek joke sunao!",
  "Coding mein help chahiye",
];

export function HomeScreen() {
  const {
    userName,
    setCurrentScreen,
    orbState,
    activeProvider,
    setPendingMessage,
  } = useApp();
  const [inputText, setInputText] = useState("");
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const initials = userName
    ? userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AI";

  const handleSend = () => {
    if (!inputText.trim()) return;
    setPendingMessage(inputText.trim());
    setCurrentScreen("chat");
    setInputText("");
  };

  const handleSuggestion = (text: string) => {
    setPendingMessage(text);
    setCurrentScreen("chat");
  };

  return (
    <LinearGradient
      colors={["#ede8ff", "#d8d0ff", "#e8e4ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View
          style={[
            styles.header,
            {
              paddingTop:
                Platform.OS === "web" ? 67 : insets.top + 8,
            },
          ]}
        >
          <LinearGradient
            colors={["#7c6cf0", "#a89cf8"]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.headerCenter}>
            <Text style={styles.greeting}>Hi {userName || "Dost"},</Text>
            <Text style={styles.subGreeting}>Always listening ✨</Text>
          </View>
          <TouchableOpacity
            style={styles.bellBtn}
            testID="btn-bell"
            activeOpacity={0.7}
          >
            <Feather name="bell" size={22} color="rgba(61,48,102,0.7)" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heroTitle}>
            Ask any questions{"\n"}you have
          </Text>
          <Text style={styles.heroSub}>
            Your AI voice chatbot is always listening
          </Text>

          <OrbCanvas size={130} />

          <View style={styles.providerBadge}>
            <View style={styles.providerDot} />
            <Text style={styles.providerText}>{activeProvider} • Active</Text>
          </View>

          <View style={styles.grid}>
            {FEATURE_CARDS.map((card) => (
              <TouchableOpacity
                key={card.label}
                style={styles.card}
                onPress={() => setCurrentScreen(card.screen)}
                testID={`btn-feature-${card.label.replace(/\s/g, "").toLowerCase()}`}
                activeOpacity={0.75}
              >
                <View style={styles.cardIcon}>
                  <Feather name={card.icon as any} size={26} color="#7c6cf0" />
                </View>
                <Text style={styles.cardLabel}>{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.pillsRow}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.pill}
                onPress={() => handleSuggestion(s)}
                testID={`btn-suggestion`}
                activeOpacity={0.75}
              >
                <Text style={styles.pillText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              marginBottom:
                Platform.OS === "web"
                  ? 34
                  : insets.bottom + 12,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Ask anything..."
            placeholderTextColor="rgba(61,48,102,0.45)"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            testID="input-ask"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={styles.sendBtn}
            testID="btn-send"
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7c6cf0", "#e879f9"]}
              style={styles.sendBtnGradient}
            >
              <Feather name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  headerCenter: { flex: 1 },
  greeting: { fontSize: 18, fontWeight: "700", color: "#3d3066" },
  subGreeting: { fontSize: 12, color: "rgba(61,48,102,0.5)", marginTop: 1 },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 8 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#3d3066",
    lineHeight: 34,
  },
  heroSub: { fontSize: 14, color: "rgba(61,48,102,0.6)", marginBottom: 4 },
  providerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    marginTop: 4,
    marginBottom: 20,
  },
  providerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00d4b4",
    shadowColor: "#00d4b4",
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  providerText: { fontSize: 12, color: "#3d3066", fontWeight: "500" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  card: {
    width: "47%",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    padding: 18,
    gap: 10,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(124,108,240,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3d3066",
    lineHeight: 18,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: { fontSize: 12, color: "#3d3066", fontWeight: "500" },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#3d3066",
    paddingVertical: 6,
  },
  sendBtn: { borderRadius: 22, overflow: "hidden" },
  sendBtnGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});
