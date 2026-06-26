import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrbCanvas } from "../components/OrbCanvas";
import { useApp } from "../context/AppContext";

export function SplashScreen() {
  const { setUserName, setCurrentScreen } = useApp();
  const [name, setName] = useState("");
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleStart = async () => {
    const trimmed = name.trim() || "Dost";
    await setUserName(trimmed);
    setCurrentScreen("home");
  };

  return (
    <LinearGradient
      colors={["#e879f9", "#c084fc", "#7dd3fc", "#ede8ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
              paddingTop: insets.top + 40,
              paddingBottom: insets.bottom + 40,
            },
          ]}
        >
          <OrbCanvas size={160} />

          <Text style={styles.logo}>👁️ Eye AI</Text>
          <Text style={styles.tagline}>
            Aapka intelligent saathi — always listening
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Aapka naam kya hai?</Text>
            <TextInput
              style={styles.input}
              placeholder="Apna naam likho..."
              placeholderTextColor="rgba(61,48,102,0.5)"
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleStart}
              returnKeyType="go"
              autoFocus
              testID="input-name"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleStart}
            testID="btn-start"
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#7c6cf0", "#a89cf8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>Chalein! →</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footer}>Made with ❤️ by AMIT</Text>
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.5,
    textShadowColor: "rgba(124,108,240,0.4)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginBottom: 8,
  },
  inputSection: { width: "100%", gap: 10 },
  inputLabel: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: "#3d3066",
    textAlign: "center",
    width: "100%",
  },
  button: { width: "100%", borderRadius: 25, overflow: "hidden" },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 25,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  footer: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 16,
  },
});
