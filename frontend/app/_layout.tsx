import { useEffect, useRef } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, Animated, StyleSheet, Image } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { DEFAULT_PRIMARY_COLOR } from '@/constants';

// ── Skeleton pulse block ──────────────────────────────────────────────────────

function Skel({ w, h, r = 10, style }: { w?: number | string; h: number; r?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.85, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3,  duration: 750, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={[{ backgroundColor: 'rgba(0,0,0,0.10)', borderRadius: r, height: h, width: w ?? '100%', opacity }, style]} />
  );
}

// ── Splash skeleton screen ────────────────────────────────────────────────────

function SplashSkeleton() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <AnimatedBackground primaryColor={DEFAULT_PRIMARY_COLOR} />

      {/* Greeting area */}
      <View style={[sk.greet, { paddingTop: insets.top + 20 }]}>
        <View style={{ gap: 8, flex: 1 }}>
          <Skel w={160} h={32} r={10} />
          <Skel w={110} h={16} r={8} />
        </View>
        <Skel w={80} h={28} r={20} />
      </View>

      {/* Calendar card */}
      <View style={[sk.card, { marginHorizontal: 20, marginTop: 16 }]}>
        <View style={sk.calRow}>
          {[0,1,2,3,4,5,6].map(i => (
            <View key={i} style={sk.calCol}>
              <Skel w={18} h={10} r={4} />
              <Skel w={28} h={28} r={14} />
              <Skel w={18} h={18} r={9} />
            </View>
          ))}
        </View>
      </View>

      {/* Pills row */}
      <View style={sk.pillRow}>
        <Skel w={90} h={32} r={20} />
        <Skel w={70} h={32} r={20} />
        <Skel w={80} h={32} r={20} />
      </View>

      {/* Shift cards */}
      <View style={{ paddingHorizontal: 20, gap: 10, marginTop: 8 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={sk.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Skel w={5} h={56} r={3} style={{ alignSelf: 'stretch' }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skel w="55%" h={16} r={8} />
                <Skel w="40%" h={12} r={6} />
              </View>
              <View style={{ gap: 6 }}>
                <Skel w={28} h={28} r={8} />
                <Skel w={28} h={28} r={8} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup     = segments[0] === '(auth)';
    const inOwnerGroup    = segments[0] === '(owner)';
    const inEmployeeGroup = segments[0] === '(employee)';

    if (!user) {
      if (!inAuthGroup) router.replace('/(auth)/role-select');
    } else if (user.role === 'owner') {
      if (!inOwnerGroup) router.replace('/(owner)');
    } else if (user.role === 'employee') {
      if (!inEmployeeGroup) router.replace('/(employee)');
    }
  }, [user, isLoading, segments]);

  if (isLoading) return <SplashSkeleton />;

  const inAuthGroup     = segments[0] === '(auth)';
  const inOwnerGroup    = segments[0] === '(owner)';
  const inEmployeeGroup = segments[0] === '(employee)';
  const redirectPending =
    (!user && !inAuthGroup) ||
    (user?.role === 'owner'    && !inOwnerGroup) ||
    (user?.role === 'employee' && !inEmployeeGroup);

  if (redirectPending) return null;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const sk = StyleSheet.create({
  greet: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 4, gap: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  calRow: { flexDirection: 'row', justifyContent: 'space-between' },
  calCol: { alignItems: 'center', gap: 6, flex: 1 },
  pillRow: {
    flexDirection: 'row', gap: 8, justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
});
