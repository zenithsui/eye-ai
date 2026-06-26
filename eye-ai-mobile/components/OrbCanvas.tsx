import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../context/AppContext";

interface OrbCanvasProps {
  size?: number;
}

export function OrbCanvas({ size = 160 }: OrbCanvasProps) {
  const { orbState } = useApp();
  const pulse = useRef(new Animated.Value(1)).current;
  const float = useRef(new Animated.Value(0)).current;
  const rotate1 = useRef(new Animated.Value(0)).current;
  const rotate2 = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -10, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(float, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    );
    const r1Loop = Animated.loop(
      Animated.timing(rotate1, { toValue: 1, duration: 8000, useNativeDriver: true, easing: Easing.linear })
    );
    const r2Loop = Animated.loop(
      Animated.timing(rotate2, { toValue: -1, duration: 6000, useNativeDriver: true, easing: Easing.linear })
    );
    floatLoop.start();
    r1Loop.start();
    r2Loop.start();
    return () => { floatLoop.stop(); r1Loop.stop(); r2Loop.stop(); };
  }, []);

  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation;
    let glowLoop: Animated.CompositeAnimation;
    if (orbState === "listening") {
      pulseLoop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]));
      glowLoop = Animated.loop(Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.5, duration: 400, useNativeDriver: true }),
      ]));
    } else if (orbState === "speaking") {
      pulseLoop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 250, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.97, duration: 250, useNativeDriver: true }),
      ]));
      glowLoop = Animated.loop(Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 250, useNativeDriver: true }),
      ]));
    } else {
      pulseLoop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.03, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]));
      glowLoop = Animated.loop(Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.9, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.5, duration: 1800, useNativeDriver: true }),
      ]));
    }
    pulseLoop.start();
    glowLoop.start();
    return () => { pulseLoop.stop(); glowLoop.stop(); };
  }, [orbState]);

  const r1 = rotate1.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const r2 = rotate2.interpolate({ inputRange: [-1, 0], outputRange: ["-360deg", "0deg"] });
  const s = size;
  const c = s + 60;

  return (
    <View style={[styles.wrapper, { height: c + 20, width: c }]}>
      <Animated.View style={{ transform: [{ translateY: float }] }}>
        {orbState === "listening" && (
          <>
            <View style={[styles.ring, { width: s + 30, height: s + 30, borderRadius: (s + 30) / 2, top: (c - s - 30) / 2, left: (c - s - 30) / 2 }]} />
            <View style={[styles.ring, { width: s + 56, height: s + 56, borderRadius: (s + 56) / 2, top: (c - s - 56) / 2, left: (c - s - 56) / 2, opacity: 0.15 }]} />
          </>
        )}
        <Animated.View style={[styles.orbOuter, { width: c, height: c, transform: [{ scale: pulse }] }]}>
          <Animated.View style={[styles.orbShadow, { width: s, height: s, borderRadius: s / 2 }]}>
            <LinearGradient
              colors={["#00d4b4", "#7c6cf0", "#e879f9", "#9f79f0"]}
              start={{ x: 0.3, y: 0.4 }}
              end={{ x: 0.7, y: 0.6 }}
              style={[StyleSheet.absoluteFill, { borderRadius: s / 2 }]}
            />
            <Animated.View style={[styles.orbLayer, { borderRadius: s / 2, transform: [{ rotate: r1 }] }]}>
              <LinearGradient
                colors={["#00d4b4", "#7c6cf0", "transparent"]}
                start={{ x: 0.3, y: 0.4 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: s / 2 }]}
              />
            </Animated.View>
            <Animated.View style={[styles.orbLayer, { borderRadius: s / 2, opacity: 0.75, transform: [{ rotate: r2 }] }]}>
              <LinearGradient
                colors={["#e879f9", "#00d4b4", "transparent"]}
                start={{ x: 0.7, y: 0.3 }}
                end={{ x: 0, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: s / 2 }]}
              />
            </Animated.View>
            <View style={[styles.orbLayer, { borderRadius: s / 2, opacity: 0.55 }]}>
              <LinearGradient
                colors={["#f0c040", "#e879b0", "transparent"]}
                start={{ x: 0.5, y: 0.7 }}
                end={{ x: 0.5, y: 0 }}
                style={[StyleSheet.absoluteFill, { borderRadius: s / 2 }]}
              />
            </View>
            <Animated.View style={[styles.orbLayer, { borderRadius: s / 2, opacity: glowOpacity }]}>
              <LinearGradient
                colors={["rgba(255,255,255,0.4)", "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: s / 2 }]}
              />
            </Animated.View>
            <View style={styles.shimmer} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { justifyContent: "center", alignItems: "center" },
  orbOuter: { justifyContent: "center", alignItems: "center" },
  orbShadow: {
    overflow: "hidden",
    shadowColor: "#7c6cf0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 28,
    elevation: 20,
  },
  orbLayer: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  shimmer: {
    position: "absolute",
    width: "38%", height: "38%",
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.55)",
    top: "14%", left: "18%",
    shadowColor: "#fff",
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  ring: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: "rgba(124,108,240,0.35)",
    opacity: 0.25,
  },
});
