import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W, height: H } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length < 6) return [79, 70, 229];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function clamp(v: number) { return Math.max(0, Math.min(255, v)); }

// ─── Single blob (3-layer glow to approximate CSS blur) ───────────────────────

function Blob({
  left, top, size, color, duration, dx, dy, delay = 0,
}: {
  left: number; top: number; size: number;
  color: string; duration: number; dx: number; dy: number; delay?: number;
}) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ease = Easing.inOut(Easing.ease);

    const xa = Animated.loop(Animated.sequence([
      Animated.timing(tx, { toValue: dx, duration, useNativeDriver: true, easing: ease }),
      Animated.timing(tx, { toValue: 0,  duration, useNativeDriver: true, easing: ease }),
    ]));
    const ya = Animated.loop(Animated.sequence([
      Animated.timing(ty, { toValue: dy, duration: Math.round(duration * 1.25), useNativeDriver: true, easing: ease }),
      Animated.timing(ty, { toValue: 0,  duration: Math.round(duration * 1.25), useNativeDriver: true, easing: ease }),
    ]));

    // Stagger start to simulate framer-motion delay
    const timer = setTimeout(() => { xa.start(); ya.start(); }, delay);
    return () => { clearTimeout(timer); xa.stop(); ya.stop(); };
  }, []);

  // Three concentric circles at decreasing opacity to fake blur
  const outerSize = size * 1.8;
  const midSize   = size * 1.25;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: left - outerSize / 2,
        top:  top  - outerSize / 2,
        width: outerSize,
        height: outerSize,
        transform: [{ translateX: tx }, { translateY: ty }],
      }}
    >
      {/* Outermost glow — very faint */}
      <View style={{
        position: 'absolute',
        width: outerSize, height: outerSize,
        borderRadius: outerSize / 2,
        backgroundColor: color,
        opacity: 0.18,
      }} />
      {/* Mid glow */}
      <View style={{
        position: 'absolute',
        left: (outerSize - midSize) / 2, top: (outerSize - midSize) / 2,
        width: midSize, height: midSize,
        borderRadius: midSize / 2,
        backgroundColor: color,
        opacity: 0.30,
      }} />
      {/* Core */}
      <View style={{
        position: 'absolute',
        left: (outerSize - size) / 2, top: (outerSize - size) / 2,
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.45,
      }} />
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnimatedBackground({ primaryColor }: { primaryColor: string }) {
  const [r, g, b] = parseHex(primaryColor);

  // Blob colors — use the actual brand color with subtle variations
  const blob1 = `rgb(${r}, ${g}, ${b})`;                                         // brand color
  const blob2 = `rgb(${clamp(r - 20)}, ${clamp(g + 10)}, ${clamp(b + 30)})`;    // slight warm shift
  const blob3 = `rgb(${clamp(r + 40)}, ${clamp(g + 40)}, ${clamp(b + 40)})`;    // lighter tint

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' } as any]}>
      {/* White base fading to a soft blush at the bottom */}
      <LinearGradient
        colors={['#FFFFFF', '#FFF5F7', '#FFE4EB']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Blob 1 — top-left */}
      <Blob
        left={-20} top={-20}
        size={300} dx={40} dy={30}
        color={blob1} duration={8000} delay={0}
      />

      {/* Blob 2 — right-center */}
      <Blob
        left={W - 60} top={H * 0.45}
        size={220} dx={-35} dy={45}
        color={blob2} duration={9500} delay={2000}
      />

      {/* Blob 3 — bottom-center */}
      <Blob
        left={W * 0.5} top={H - 60}
        size={260} dx={30} dy={-50}
        color={blob3} duration={11000} delay={4000}
      />
    </View>
  );
}
