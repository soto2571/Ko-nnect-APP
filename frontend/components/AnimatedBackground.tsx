import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';

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

// ─── Single blob — true radial gradient, fades to transparent ─────────────────

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

    const timer = setTimeout(() => { xa.start(); ya.start(); }, delay);
    return () => { clearTimeout(timer); xa.stop(); ya.stop(); };
  }, []);

  // Unique gradient ID per blob (color-based to avoid collisions)
  const gradId = `rg_${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: left - size / 2,
        top:  top  - size / 2,
        width: size,
        height: size,
        transform: [{ translateX: tx }, { translateY: ty }],
      }}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={gradId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%"   stopColor={color} stopOpacity="0.55" />
            <Stop offset="60%"  stopColor={color} stopOpacity="0.20" />
            <Stop offset="100%" stopColor={color} stopOpacity="0"    />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={size / 2} cy={size / 2}
          rx={size / 2} ry={size / 2}
          fill={`url(#${gradId})`}
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnimatedBackground({ primaryColor }: { primaryColor: string }) {
  const [r, g, b] = parseHex(primaryColor);

  const blob1 = `rgb(${r}, ${g}, ${b})`;                                       // brand color
  const blob2 = `rgb(${clamp(r - 20)}, ${clamp(g + 10)}, ${clamp(b + 30)})`;  // slight warm shift
  const blob3 = `rgb(${clamp(r + 40)}, ${clamp(g + 40)}, ${clamp(b + 40)})`;  // lighter tint

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
        size={340} dx={40} dy={30}
        color={blob1} duration={8000} delay={0}
      />

      {/* Blob 2 — right-center */}
      <Blob
        left={W - 60} top={H * 0.45}
        size={260} dx={-35} dy={45}
        color={blob2} duration={9500} delay={2000}
      />

      {/* Blob 3 — bottom-center */}
      <Blob
        left={W * 0.5} top={H - 60}
        size={300} dx={30} dy={-50}
        color={blob3} duration={11000} delay={4000}
      />
    </View>
  );
}
