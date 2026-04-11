import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Image,
  Animated, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#E11D48';

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const card1Anim  = useRef(new Animated.Value(0)).current;
  const card2Anim  = useRef(new Animated.Value(0)).current;
  const ctaAnim    = useRef(new Animated.Value(0)).current;
  const ownerScale = useRef(new Animated.Value(1)).current;
  const empScale   = useRef(new Animated.Value(1)).current;
  const ctaScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, tension: 55, friction: 10, useNativeDriver: true }),
      Animated.spring(card1Anim,  { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(card2Anim,  { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(ctaAnim,    { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const press = (anim: Animated.Value, toVal: number) =>
    Animated.spring(anim, { toValue: toVal, useNativeDriver: true, tension: 300, friction: 10 }).start();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={BRAND} />

      <View style={[s.outer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>

        {/* Header */}
        <Animated.View style={[s.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-24, 0] }) }],
        }]}>
          <Image source={require('@/assets/konnectaBigWhite.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.sub}>¿Cómo vas a entrar hoy?</Text>
        </Animated.View>

        {/* Cards + CTA */}
        <View style={s.cards}>

          {/* Owner card — full brand weight */}
          <Animated.View style={{
            opacity: card1Anim,
            transform: [
              { translateY: card1Anim.interpolate({ inputRange: [0,1], outputRange: [32, 0] }) },
              { scale: ownerScale },
            ],
          }}>
            <Pressable
              onPressIn={() => press(ownerScale, 0.97)}
              onPressOut={() => press(ownerScale, 1)}
              onPress={() => router.push('/(auth)/login')}
              style={s.roleCard}
            >
              <View style={[s.iconCircle, { backgroundColor: 'rgba(225,29,72,0.08)', borderColor: 'rgba(225,29,72,0.18)' }]}>
                <Ionicons name="business-outline" size={30} color={BRAND} />
              </View>
              <View style={s.cardText}>
                <Text style={s.cardTitle}>Dueño de Negocio</Text>
                <Text style={s.cardSub}>Maneja turnos, empleados{'\n'}y tu negocio</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </Pressable>
          </Animated.View>

          {/* Employee card — soft brand tint, same family */}
          <Animated.View style={{
            opacity: card2Anim,
            transform: [
              { translateY: card2Anim.interpolate({ inputRange: [0,1], outputRange: [32, 0] }) },
              { scale: empScale },
            ],
          }}>
            <Pressable
              onPressIn={() => press(empScale, 0.97)}
              onPressOut={() => press(empScale, 1)}
              onPress={() => router.push('/(auth)/employee-login')}
              style={s.roleCard}
            >
              <View style={[s.iconCircle, { backgroundColor: 'rgba(225,29,72,0.08)', borderColor: 'rgba(225,29,72,0.18)' }]}>
                <Ionicons name="person-outline" size={30} color={BRAND} />
              </View>
              <View style={s.cardText}>
                <Text style={s.cardTitle}>Empleado</Text>
                <Text style={s.cardSub}>Ve tus turnos y marca{'\n'}entrada / salida</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </Pressable>
          </Animated.View>

          {/* CTA button */}
          <Animated.View style={{
            opacity: ctaAnim,
            transform: [{ translateY: ctaAnim.interpolate({ inputRange: [0,1], outputRange: [16, 0] }) }],
          }}>
            <Pressable
              onPressIn={() => press(ctaScale, 0.97)}
              onPressOut={() => press(ctaScale, 1)}
              onPress={() => router.push('/(auth)/signup')}
            >
              <Animated.View style={[s.ctaBtn, { transform: [{ scale: ctaScale }] }]}>
                <Ionicons name="rocket-outline" size={18} color={BRAND} />
                <Text style={s.ctaBtnText}>Empieza a organizar tu negocio</Text>
              </Animated.View>
            </Pressable>
          </Animated.View>

        </View>

      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 40,
  },

  header: {
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    width: 380, height: 260,
    marginBottom: -40,
    marginTop: -80,
  },
  sub: {
    fontSize: 15, color: '#6B7280',
  },

  cards: {
    gap: 16,
  },

  // Both cards — same style, icon differentiates
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 24, padding: 20, gap: 16,
    borderWidth: 1.5, borderColor: 'rgba(225,29,72,0.15)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  iconCircle: {
    width: 60, height: 60, borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: {
    flex: 1, gap: 3,
  },
  cardTitle: {
    fontSize: 17, fontWeight: '700', color: '#111827',
  },
  cardSub: {
    fontSize: 13, color: '#6B7280', lineHeight: 18,
  },

  ctaBtn: {
    height: 54, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.82)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5, borderColor: 'rgba(225,29,72,0.22)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  ctaBtnText: {
    fontSize: 15, fontWeight: '700', color: BRAND,
  },
});
