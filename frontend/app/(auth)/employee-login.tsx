import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable, Image, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#3B82F6'; // Blue for employee — distinct from owner red

export default function EmployeeLoginScreen() {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [emailFocused, setEmailFocused]     = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError]       = useState('');


  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(cardAnim,   { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Por favor ingresa tu correo y contraseña.'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas. Verifica con tu patrono.');
    } finally { setLoading(false); }
  };


  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={BRAND} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
      <View style={[s.outer, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>

        {/* Header */}
        <Animated.View style={[s.logoBlock, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-24, 0] }) }],
        }]}>
          {/* Back to role select */}
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={18} color={BRAND} />
          </TouchableOpacity>

          <Image source={require('@/assets/konnectaBigWhite.png')} style={s.logoImg} resizeMode="contain" />
          <Text style={s.logoText}>Acceso Empleado</Text>
          <Text style={s.tagline}>Usa las credenciales que te envió tu patrono.</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[s.card, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange: [0,1], outputRange: [32, 0] }) }],
        }]}>

            <>
              {error !== '' && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color="#EF4444" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* Hint box */}
              <View style={s.hintBox}>
                <Ionicons name="information-circle-outline" size={15} color="#3B82F6" />
                <Text style={s.hintText}>
                  Tu correo es algo como{' '}
                  <Text style={s.hintCode}>nombre.apellido@negocio.app</Text>
                </Text>
              </View>

              <View style={[s.inputWrap, emailFocused && s.inputFocused]}>
                <Ionicons name="mail-outline" size={17} color={emailFocused ? BRAND : '#9CA3AF'} style={s.icon} />
                <TextInput
                  style={s.input} placeholder="Correo electrónico" placeholderTextColor="#B0B0BA"
                  value={email} onChangeText={t => { setEmail(t); setError(''); }}
                  autoCapitalize="none" keyboardType="email-address"
                  onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                />
              </View>

              <View style={[s.inputWrap, passwordFocused && s.inputFocused]}>
                <Ionicons name="lock-closed-outline" size={17} color={passwordFocused ? BRAND : '#9CA3AF'} style={s.icon} />
                <TextInput
                  style={[s.input, { flex: 1 }]} placeholder="Contraseña" placeholderTextColor="#B0B0BA"
                  value={password} onChangeText={t => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPw}
                  onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={s.forgotHint}>¿Olvidaste tu contraseña? Contacta a tu patrono.</Text>

              <Pressable
                onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
                onPress={handleLogin} disabled={loading}
              >
                <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                  <View style={s.btn}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Iniciar Sesión</Text>}
                  </View>
                </Animated.View>
              </Pressable>
            </>
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[s.footer, { opacity: cardAnim }]}>
          <Text style={s.footerText}>Ko-nnecta' · Mantén a tu equipo siempre connecta'o.</Text>
        </Animated.View>

      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1, paddingHorizontal: 24, justifyContent: 'space-between',
  },

  logoBlock: {
    alignItems: 'center', paddingTop: 16, gap: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  logoImg: {
    width: 380, height: 200,
    marginBottom: -30,
  },
  logoText: {
    fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 28, padding: 22, gap: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000', shadowOpacity: 0.08,
    shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  hintBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(59,130,246,0.06)',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.15)',
  },
  hintText: { fontSize: 12, color: '#374151', flex: 1, lineHeight: 17 },
  hintCode: { fontWeight: '600', color: '#3B82F6' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { fontSize: 13, color: '#EF4444', fontWeight: '500', flex: 1 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, height: 52,
  },
  inputFocused: { borderColor: BRAND, backgroundColor: '#fff' },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#111827', fontSize: 15, paddingVertical: 0 },

  forgotHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: -6 },

  btn: {
    height: 54, borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOpacity: 0.30,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },


  footer: { alignItems: 'center', paddingBottom: 8 },
  footerText: { fontSize: 12, color: '#9CA3AF', letterSpacing: 0.2 },
});
