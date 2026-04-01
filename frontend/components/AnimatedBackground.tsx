import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function AnimatedBackground({ primaryColor }: { primaryColor: string }) {
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' } as any]}>
      <LinearGradient
        colors={[
          primaryColor,           // solid brand color at top
          primaryColor,           // hold solid through 28%
          primaryColor + 'BB',    // 73% — still rich
          primaryColor + '55',    // 33% — softer mid
          primaryColor + '1A',    // 10% — very faint tint at bottom
        ]}
        locations={[0, 0.28, 0.55, 0.78, 1]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
