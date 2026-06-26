import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useApp } from "../context/AppContext";

interface OrbProps {
  size?: "normal" | "large";
}

export function Orb({ size = "normal" }: OrbProps) {
  const { orbState } = useApp();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  const orbSize = size === "large" ? 180 : 140;
  const containerSize = size === "large" ? 220 : 180;

  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -12,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );
    rotateAnimation.start();

    return () => {
      floatAnimation.stop();
      rotateAnimation.stop();
    };
  }, []);

  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation;
    let glowAnimation: Animated.CompositeAnimation;

    if (orbState === "listening") {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
    } else if (orbState === "speaking") {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.97,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    } else if (orbState === "processing") {
      pulseAnimation = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      );
      glowAnimation = Animated.loop(
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
        })
      );
    } else {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
    }

    pulseAnimation.start();
    glowAnimation.start();

    return () => {
      pulseAnimation.stop();
      glowAnimation.stop();
    };
  }, [orbState]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const ringScale1 = orbState === "listening" ? 1.3 : 1;
  const ringScale2 = orbState === "listening" ? 1.5 : 1;

  return (
    <View style={[styles.wrapper, { height: containerSize + 40 }]}>
      <Animated.View
        style={[
          styles.container,
          { width: containerSize, height: containerSize },
          { transform: [{ translateY: floatAnim }] },
        ]}
      >
        {orbState === "listening" && (
          <>
            <View
              style={[
                styles.ring,
                {
                  width: orbSize + 30,
                  height: orbSize + 30,
                  top: (containerSize - orbSize - 30) / 2,
                  left: (containerSize - orbSize - 30) / 2,
                  transform: [{ scale: ringScale1 }],
                  opacity: 0.3,
                },
              ]}
            />
            <View
              style={[
                styles.ring,
                {
                  width: orbSize + 55,
                  height: orbSize + 55,
                  top: (containerSize - orbSize - 55) / 2,
                  left: (containerSize - orbSize - 55) / 2,
                  transform: [{ scale: ringScale2 }],
                  opacity: 0.15,
                },
              ]}
            />
          </>
        )}
        <Animated.View
          style={[
            styles.core,
            {
              width: orbSize,
              height: orbSize,
              borderRadius: orbSize / 2,
              top: (containerSize - orbSize) / 2,
              left: (containerSize - orbSize) / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.layer1,
              { borderRadius: orbSize / 2, transform: [{ rotate }] },
            ]}
          />
          <View style={[styles.layer2, { borderRadius: orbSize / 2 }]} />
          <View style={[styles.layer3, { borderRadius: orbSize / 2 }]} />
          <Animated.View
            style={[
              styles.glow,
              { borderRadius: orbSize / 2, opacity: glowAnim },
            ]}
          />
          <View style={styles.shimmer} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    position: "relative",
  },
  core: {
    position: "absolute",
    overflow: "hidden",
    shadowColor: "#7c6cf0",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  layer1: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
    backgroundImage: undefined,
    // Simulated with overlay
    opacity: 1,
  },
  layer2: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  layer3: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  glow: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  shimmer: {
    position: "absolute",
    width: "40%",
    height: "40%",
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.5)",
    top: "15%",
    left: "20%",
    opacity: 0.7,
  },
  ring: {
    position: "absolute",
    borderRadius: 200,
    borderWidth: 1.5,
    borderColor: "rgba(124,108,240,0.4)",
  },
});
