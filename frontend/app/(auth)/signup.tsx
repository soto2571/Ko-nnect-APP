import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, ScrollView, Pressable, Image,
} from 'react-native';
import { router } from 'expo-router';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleLogo } from '@/components/GoogleLogo';
import { supabase } from '@/lib/supabase';
import { setPendingSignup } from '@/lib/pending-signup';
import * as api from '@/services/api';

const BRAND = '#E11D48';

function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  const reqs = [
    { label: 'Mín. 8 caracteres', met: password.length >= 8 },
    { label: 'Una mayúscula (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Una minúscula (a-z)', met: /[a-z]/.test(password) },
    { label: 'Un número (0-9)', met: /\d/.test(password) },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6 }}>
      {reqs.map(({ label, met }) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, width: '47%' }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: met ? '#DCFCE7' : '#F3F4F6', borderWidth: 1, borderColor: met ? '#86EFAC' : '#E5E7EB' }}>
            <Ionicons name={met ? 'checkmark' : 'close'} size={10} color={met ? '#16A34A' : '#D1D5DB'} />
          </View>
          <Text style={{ fontSize: 11, color: met ? '#16A34A' : '#9CA3AF', fontWeight: '500' }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Field({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, rightElement, style }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[f.wrap, focused && f.wrapFocused, style]}>
      <Ionicons name={icon} size={17}
        color={focused ? BRAND : '#9CA3AF'} style={f.icon} />
      <TextInput
        style={f.input}
        placeholder={placeholder}
        placeholderTextColor="#C4C4CE"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {rightElement}
    </View>
  );
}

const f = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.60)',
    paddingHorizontal: 14, height: 52,
  },
  wrapFocused: { borderColor: BRAND, backgroundColor: '#fff' },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#111827', fontSize: 15, paddingVertical: 0 },
});

export default function SignupScreen() {
  const { signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]         = useState('');

  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim   = useRef(new Animated.Value(0)).current;
  const btnScale   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(formAnim,   { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google.');
    } finally { setGoogleLoading(false); }
  };

  const handleSignup = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }
    const pwOk = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
    if (!pwOk) {
      setError('La contraseña no cumple con todos los requisitos.');
      return;
    }
    setLoading(true);
    try {
      const provider = await api.checkEmailProvider(email.trim().toLowerCase());
      if (provider === 'google') {
        setError('Este correo ya tiene una cuenta con Google. Usa el botón de Google para entrar.');
        return;
      }
      if (provider === 'email') {
        setError('Ya existe una cuenta con este correo. Ve a iniciar sesión.');
        return;
      }

      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (otpErr) {
        setError(otpErr.message);
        return;
      }
      setPendingSignup({ password, firstName: firstName.trim(), lastName: lastName.trim() });
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: email.trim().toLowerCase() },
      });
    } catch (err: any) {
      setError(err.message || 'Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="dark" />

      <AnimatedBackground primaryColor={BRAND} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Animated.View style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange:[0,1], outputRange:[-16,0] }) }],
          paddingHorizontal: 24, marginBottom: 8,
        }}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={BRAND} />
          </TouchableOpacity>
        </Animated.View>

        <View style={s.inner}>

          {/* Header */}
          <Animated.View style={[s.header, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange:[0,1], outputRange:[-20,0] }) }],
          }]}>
            <Image source={require('@/assets/konnectaBigWhite.png')} style={s.logoImg} resizeMode="contain" />
            <Text style={s.title}>Crear Cuenta</Text>
            <Text style={s.sub}>Organiza tu negocio y maneja tu equipo.</Text>
          </Animated.View>

          {/* Form card */}
          <Animated.View style={[s.card, {
            opacity: formAnim,
            transform: [{ translateY: formAnim.interpolate({ inputRange:[0,1], outputRange:[28,0] }) }],
          }]}>

            {error !== '' && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={BRAND} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Field icon="person-outline" placeholder="Nombre"
                value={firstName} onChangeText={(t: string) => { setFirstName(t); setError(''); }}
                style={{ flex: 1 }} />
              <Field icon="person-outline" placeholder="Apellido"
                value={lastName} onChangeText={(t: string) => { setLastName(t); setError(''); }}
                style={{ flex: 1 }} />
            </View>

            <Field icon="mail-outline" placeholder="Correo electrónico"
              value={email} onChangeText={(t: string) => { setEmail(t); setError(''); }}
              keyboardType="email-address" autoCapitalize="none" />

            <Field icon="lock-closed-outline" placeholder="Contraseña (mín. 8 caracteres)"
              value={password} onChangeText={(t: string) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPw} autoCapitalize="none"
              rightElement={
                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color="#9CA3AF" />
                </TouchableOpacity>
              }
            />
            <PasswordRequirements password={password} />

            <Pressable
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
              onPress={handleSignup}
              disabled={loading}
            >
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <View style={s.btn}>
                  {loading
                    ? <ActivityIndicator color={BRAND} />
                    : <Text style={s.btnText}>Crear Cuenta</Text>
                  }
                </View>
              </Animated.View>
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>o</Text>
              <View style={s.divLine} />
            </View>

            {/* Google sign-in */}
            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={googleLoading || loading}
              style={s.googleBtn}
            >
              {googleLoading ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <>
                  <GoogleLogo size={22} />
                  <Text style={s.googleBtnText}>Continuar con Google</Text>
                </>
              )}
            </TouchableOpacity>

          </Animated.View>

          <Animated.View style={{ opacity: formAnim, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.loginText}>
                ¿Ya tienes cuenta?{'  '}
                <Text style={s.loginLink}>Inicia sesión</Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1 },
  inner: { paddingHorizontal: 24, paddingBottom: 40, gap: 24 },

  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(225,29,72,0.08)',
    borderWidth: 1, borderColor: 'rgba(225,29,72,0.20)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  header: { alignItems: 'center', gap: 8 },
  logoImg: {
    width: 260, height: 110,
  },
  title: {
    fontSize: 22, fontWeight: '700',
    color: '#111827', letterSpacing: -0.3,
  },
  sub: {
    fontSize: 13, color: '#6B7280',
    textAlign: 'center', lineHeight: 18,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 28, padding: 22, gap: 14,
    borderWidth: 1, borderColor: 'rgba(225,29,72,0.12)',
    shadowColor: BRAND, shadowOpacity: 0.10,
    shadowRadius: 32, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF1F3', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  errorText: { fontSize: 13, color: BRAND, fontWeight: '500', flex: 1 },

  btn: {
    height: 54, borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  divText: { color: '#9CA3AF', fontSize: 12, fontWeight: '500' },

  googleBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    shadowColor: '#000', shadowOpacity: 0.10,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  googleBtnText: { color: '#111827', fontSize: 15, fontWeight: '600' },

  loginText: { fontSize: 14, color: '#6B7280' },
  loginLink: { color: BRAND, fontWeight: '700' },
});
