import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

interface WaveformProps {
  active: boolean;
  bars?: number;
}

export function Waveform({ active, bars = 7 }: WaveformProps) {
  const anims = useRef(
    Array.from({ length: bars }, () => new Animated.Value(6))
  ).current;

  useEffect(() => {
    if (active) {
      const animations = anims.map((anim, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 6 + Math.random() * 26,
              duration: 300 + Math.random() * 300,
              delay: i * 80,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 6,
              duration: 300 + Math.random() * 300,
              useNativeDriver: false,
            }),
          ])
        )
      );
      animations.forEach((a) => a.start());
      return () => animations.forEach((a) => a.stop());
    } else {
      anims.forEach((anim) =>
        Animated.timing(anim, {
          toValue: 6,
          duration: 200,
          useNativeDriver: false,
        }).start()
      );
    }
  }, [active]);

  return (
    <View style={styles.container}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[styles.bar, { height: anim }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 44,
  },
  bar: {
    width: 4,
    backgroundColor: "#a89cf8",
    borderRadius: 4,
  },
});
