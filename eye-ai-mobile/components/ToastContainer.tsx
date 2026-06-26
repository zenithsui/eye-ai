import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { useApp } from "../context/AppContext";

export function ToastContainer() {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {toasts.map((toast) => (
        <View
          key={toast.id}
          style={[
            styles.toast,
            toast.type === "success" && styles.toastSuccess,
            toast.type === "warning" && styles.toastWarning,
            toast.type === "switch" && styles.toastSwitch,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
    zIndex: 999,
  },
  toast: {
    backgroundColor: "rgba(30,20,60,0.92)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    maxWidth: 300,
  },
  toastText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
    fontFamily: Platform.OS === "ios" ? "Inter_400Regular" : undefined,
  },
  toastSuccess: { borderColor: "#00d4b4" },
  toastWarning: { borderColor: "#f0c040" },
  toastSwitch: { borderColor: "#7c6cf0" },
});
