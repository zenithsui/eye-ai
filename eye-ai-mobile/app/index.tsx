import React from "react";
import { View, StyleSheet } from "react-native";

import { useApp } from "@/context/AppContext";
import { SplashScreen } from "@/screens/SplashScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { VoiceScreen } from "@/screens/VoiceScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { ToastContainer } from "@/components/ToastContainer";

function AppContent() {
  const { currentScreen } = useApp();
  return (
    <View style={styles.container}>
      {currentScreen === "splash" && <SplashScreen />}
      {currentScreen === "home" && <HomeScreen />}
      {currentScreen === "voice" && <VoiceScreen />}
      {currentScreen === "chat" && <ChatScreen />}
      <ToastContainer />
    </View>
  );
}

export default function AppIndex() {
  return <AppContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
