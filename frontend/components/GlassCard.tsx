import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  padding?: number;
  radius?: number;
}

export function GlassCard({
  children,
  style,
  intensity = 60,
  padding = 20,
  radius = 20,
}: GlassCardProps) {
  return (
    <View style={[styles.shadow, { borderRadius: radius }, style]}>
      <BlurView
        intensity={intensity}
        tint="light"
        style={[styles.blur, { borderRadius: radius }]}
      >
        <View style={[styles.inner, { padding, borderRadius: radius }]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  blur: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  inner: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
