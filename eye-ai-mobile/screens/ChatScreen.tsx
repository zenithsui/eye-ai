import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Animated,
  Clipboard,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Speech from "expo-speech";
import { useApp, Message } from "../context/AppContext";
import { callAIWithFallback } from "../lib/ai-providers";
import { saveHistory, clearHistory } from "../lib/storage";

function TypingIndicator() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const makeLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    const l1 = makeLoop(anim1, 0);
    const l2 = makeLoop(anim2, 150);
    const l3 = makeLoop(anim3, 300);
    l1.start();
    l2.start();
    l3.start();
    return () => {
      l1.stop();
      l2.stop();
      l3.stop();
    };
  }, []);

  return (
    <View style={typing.container}>
      <LinearGradient colors={["#7c6cf0", "#00d4b4"]} style={typing.avatar} />
      <View style={typing.bubble}>
        {([anim1, anim2, anim3] as Animated.Value[]).map((a, i) => (
          <Animated.View
            key={i}
            style={[typing.dot, { transform: [{ translateY: a }] }]}
          />
        ))}
      </View>
    </View>
  );
}

const typing = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#a89cf8" },
});

export function ChatScreen() {
  const {
    setCurrentScreen,
    activeProvider,
    updateProviderStatus,
    showToast,
    messages,
    setMessages,
    isTyping,
    setIsTyping,
    addMessage,
    pendingMessage,
    setPendingMessage,
  } = useApp();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (pendingMessage) {
      sendMessage(pendingMessage);
      setPendingMessage("");
    }
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;
      const trimmed = text.trim();
      addMessage("user", trimmed);
      setIsTyping(true);
      setInputText("");

      try {
        const history = messages.map((m) => ({
          role: m.role === "assistant" ? "assistant" : ("user" as const),
          content: m.content,
        }));
        const result = await callAIWithFallback(
          trimmed,
          history,
          (p, s) => { updateProviderStatus(p, s); }
        );
        addMessage("assistant", result.text);
        await saveHistory([
          ...history,
          { role: "user" as const, content: trimmed },
          { role: "assistant" as const, content: result.text },
        ]);
        Speech.speak(result.text, {
          language: "en-IN",
          rate: 0.9,
        });
      } catch {
        addMessage("assistant", "Yaar, kuch gadbad ho gayi. Phir try karo!");
      } finally {
        setIsTyping(false);
      }
    },
    [messages, isTyping]
  );

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(inputText.trim());
    }
  };

  const handleLongPress = (msg: Message) => {
    if (msg.role !== "assistant") return;
    if (Platform.OS === "web") {
      navigator.clipboard
        ?.writeText(msg.content)
        .then(() => showToast("Copied!", "success"));
    } else {
      Clipboard.setString(msg.content);
      showToast("Copied!", "success");
    }
  };

  const handleClearChat = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Clear all chat history?")) {
        setMessages([]);
        clearHistory();
        showToast("Chat cleared!", "success");
      }
    } else {
      Alert.alert("Clear Chat", "Sab messages delete ho jaayenge?", [
        { text: "Nahi", style: "cancel" },
        {
          text: "Haan, Clear Karo",
          style: "destructive",
          onPress: () => {
            setMessages([]);
            clearHistory();
            showToast("Chat cleared!", "success");
          },
        },
      ]);
    }
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.role === "user") {
      return (
        <View style={msgStyles.userWrapper}>
          <View style={msgStyles.userBubble}>
            <Text style={msgStyles.userText}>{item.content}</Text>
          </View>
          <Text style={msgStyles.time}>{formatTime(item.timestamp)}</Text>
        </View>
      );
    }
    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.85}
        testID="msg-ai"
      >
        <View style={msgStyles.aiWrapper}>
          <LinearGradient
            colors={["#7c6cf0", "#00d4b4"]}
            style={msgStyles.aiAvatar}
          />
          <View style={{ flex: 1 }}>
            <View style={msgStyles.aiBubble}>
              <Text style={msgStyles.aiText}>{item.content}</Text>
            </View>
            <Text style={[msgStyles.time, { marginLeft: 4 }]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={["#ede8ff", "#d8d0ff", "#e8e4ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top + 8,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setCurrentScreen("home")}
          testID="btn-back"
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color="rgba(61,48,102,0.8)" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Smart Chat</Text>
          <View style={styles.providerBadge}>
            <View style={styles.providerDot} />
            <Text style={styles.providerText}>{activeProvider}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={handleClearChat}
          testID="btn-menu"
          activeOpacity={0.7}
        >
          <Feather name="trash-2" size={20} color="rgba(61,48,102,0.6)" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.kvContainer}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          testID="chat-messages"
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <LinearGradient
                colors={["#7c6cf0", "#00d4b4"]}
                style={styles.emptyOrb}
              />
              <Text style={styles.emptyTitle}>Namaskar! Kya poochna hai?</Text>
              <Text style={styles.emptySub}>
                Kuch bhi poochho — main yahan hoon, dost!
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom:
                Platform.OS === "web" ? 34 : insets.bottom + 8,
            },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor="rgba(61,48,102,0.45)"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
            testID="input-message"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={styles.sendBtn}
            testID="btn-send"
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7c6cf0", "#e879f9"]}
              style={styles.sendGradient}
            >
              <Feather name="send" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 4 },
  title: { fontSize: 17, fontWeight: "700", color: "#3d3066" },
  providerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  providerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#00d4b4",
  },
  providerText: { fontSize: 10, color: "#3d3066", fontWeight: "500" },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  kvContainer: { flex: 1 },
  listContent: { padding: 16, gap: 12, flexGrow: 1 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 60,
  },
  emptyOrb: { width: 64, height: 64, borderRadius: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#3d3066" },
  emptySub: {
    fontSize: 14,
    color: "rgba(61,48,102,0.55)",
    textAlign: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
  },
  input: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#3d3066",
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  sendBtn: { borderRadius: 20, overflow: "hidden", marginBottom: 2 },
  sendGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
});

const msgStyles = StyleSheet.create({
  userWrapper: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
    maxWidth: "80%",
  },
  userBubble: {
    backgroundColor: "#1a1a2e",
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: { color: "#fff", fontSize: 14, lineHeight: 20 },
  aiWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: "86%",
  },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, flexShrink: 0 },
  aiBubble: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#7c6cf0",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  aiText: { color: "#3d3066", fontSize: 14, lineHeight: 20 },
  time: { fontSize: 10, color: "rgba(61,48,102,0.4)", marginTop: 3 },
});
