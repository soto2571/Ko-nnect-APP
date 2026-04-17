import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable, Image,
} from 'react-native';
import { router } from 'expo-router';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleLogo } from '@/components/GoogleLogo';
import { supabase } from '@/lib/supabase';
import { checkEmailProvider } from '@/services/api';
import * as Linking from 'expo-linking';

const BRAND = '#E11D48';

export default function LoginScreen() {
  const { login, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Sign in state ──────────────────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused]       = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError]       = useState('');

  // ── Forgot password state ──────────────────────────────────────────────────
  const [forgotMode, setForgotMode]         = useState(false);
  const [resetEmail, setResetEmail]         = useState('');
  const [resetEmailFocused, setResetEmailFocused] = useState(false);
  const [resetLoading, setResetLoading]     = useState(false);
  const [resetMsg, setResetMsg]             = useState('');  // '' | 'sent' | error text
  const [resetIsError, setResetIsError]     = useState(false);

  // ── Animations ─────────────────────────────────────────────────────────────
  const logoAnim  = useRef(new Animated.Value(0)).current;
  const cardAnim  = useRef(new Animated.Value(0)).current;
  const btnScale  = useRef(new Animated.Value(1)).current;
  const gBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google.');
    } finally { setGoogleLoading(false); }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Por favor ingresa tu correo y contraseña.'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message || 'Credenciales incorrectas.');
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    setResetMsg('');
    setResetIsError(false);
    if (!resetEmail.trim()) { setResetMsg('Por favor ingresa tu correo.'); setResetIsError(true); return; }
    setResetLoading(true);
    try {
      const provider = await checkEmailProvider(resetEmail.trim().toLowerCase());
      if (provider === 'google') {
        setResetMsg('Tu cuenta fue creada con Google. Usa "Continuar con Google" para acceder o cambia tu contraseña desde tu cuenta de Google.');
        setResetIsError(true);
        return;
      }
      const redirectTo = Linking.createURL('/reset-password');
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim().toLowerCase(),
        { redirectTo },
      );
      if (resetErr) throw resetErr;
      setResetMsg('Revisa tu correo para el enlace de recuperación.');
      setResetIsError(false);
    } catch (err: any) {
      setResetMsg(err.message || 'Algo salió mal. Inténtalo de nuevo.');
      setResetIsError(true);
    } finally { setResetLoading(false); }
  };

  const enterForgot = () => {
    setError('');
    setResetEmail(email); // pre-fill if they already typed their email
    setResetMsg('');
    setResetIsError(false);
    setForgotMode(true);
  };

  const exitForgot = () => {
    setForgotMode(false);
    setResetMsg('');
    setResetEmail('');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={BRAND} />

      <View style={[s.outer, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>

        {/* Logo + tagline */}
        <Animated.View style={[s.logoBlock, {
          opacity: logoAnim,
          transform: [{ translateY: logoAnim.interpolate({ inputRange:[0,1], outputRange:[-24,0] }) }],
        }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={18} color={BRAND} />
          </TouchableOpacity>
          <Image source={require('@/assets/konnectaBigWhite.png')} style={s.logoImg} resizeMode="contain" />
        </Animated.View>

        {/* Card */}
        <Animated.View style={[s.card, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[32,0] }) }],
        }]}>

          {/* ── FORGOT PASSWORD MODE ── */}
          {forgotMode ? (
            <>
              {/* Back */}
              <TouchableOpacity onPress={exitForgot} style={s.backRow}>
                <Ionicons name="chevron-back" size={16} color={BRAND} />
                <Text style={s.backText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>

              <Text style={s.forgotTitle}>Recuperar contraseña</Text>
              <Text style={s.forgotSub}>
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </Text>

              {/* Reset email input */}
              <View style={[s.inputWrap, resetEmailFocused && s.inputFocused]}>
                <Ionicons name="mail-outline" size={17} color={resetEmailFocused ? BRAND : '#9CA3AF'} style={s.icon} />
                <TextInput
                  style={s.input} placeholder="Tu correo electrónico" placeholderTextColor="#B0B0BA"
                  value={resetEmail} onChangeText={t => { setResetEmail(t); setResetMsg(''); }}
                  autoCapitalize="none" keyboardType="email-address"
                  onFocus={() => setResetEmailFocused(true)} onBlur={() => setResetEmailFocused(false)}
                  autoFocus
                />
              </View>

              {/* Feedback message */}
              {resetMsg !== '' && (
                <View style={[s.feedbackBox, resetIsError ? s.feedbackError : s.feedbackSuccess]}>
                  <Ionicons
                    name={resetIsError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                    size={15}
                    color={resetIsError ? BRAND : '#16A34A'}
                  />
                  <Text style={[s.feedbackText, { color: resetIsError ? BRAND : '#16A34A' }]}>
                    {resetMsg}
                  </Text>
                </View>
              )}

              {/* Send reset link button */}
              {resetMsg !== 'Revisa tu correo para el enlace de recuperación.' && !resetMsg.startsWith('Tu cuenta fue creada con Google') && (
                <Pressable
                  onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
                  onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
                  onPress={handleForgotPassword} disabled={resetLoading}
                >
                  <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                    <View style={s.btn}>
                      {resetLoading
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.btnText}>Enviar Enlace</Text>
                      }
                    </View>
                  </Animated.View>
                </Pressable>
              )}

              {/* After success or Google account — back to sign in */}
              {(resetMsg === 'Revisa tu correo para el enlace de recuperación.' || resetMsg.startsWith('Tu cuenta fue creada con Google')) && (
                <TouchableOpacity onPress={exitForgot} style={s.secondaryBtn}>
                  <Text style={s.secondaryBtnText}>Volver al inicio de sesión</Text>
                </TouchableOpacity>
              )}
            </>

          ) : (
            /* ── NORMAL SIGN IN MODE ── */
            <>
              {error !== '' && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={BRAND} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {/* ── Google first ── */}
              <Pressable
                onPressIn={() => Animated.spring(gBtnScale, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(gBtnScale, { toValue: 1, useNativeDriver: true }).start()}
                onPress={handleGoogleSignIn} disabled={googleLoading || loading}
              >
                <Animated.View style={[s.googleBtn, { transform: [{ scale: gBtnScale }] }]}>
                  {googleLoading ? (
                    <ActivityIndicator color="#111827" />
                  ) : (
                    <>
                      <GoogleLogo size={22} />
                      <Text style={s.googleBtnText}>Continuar con Google</Text>
                    </>
                  )}
                </Animated.View>
              </Pressable>

              {/* ── Divider ── */}
              <View style={s.divider}>
                <View style={s.divLine} />
                <Text style={s.divText}>o inicia con correo</Text>
                <View style={s.divLine} />
              </View>

              {/* ── Email / password ── */}
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

              {/* Forgot password link */}
              <TouchableOpacity onPress={enterForgot} style={s.forgotLink} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.forgotLinkText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>

              {/* Sign In button */}
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

              {/* Create account */}
              <View style={s.divider}>
                <View style={s.divLine} />
                <Text style={s.divText}>¿Eres nuevo en Ko-nnecta'?</Text>
                <View style={s.divLine} />
              </View>

              <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={s.secondaryBtn}>
                <Text style={s.secondaryBtnText}>Crear una cuenta</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>

      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  outer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },

  logoBlock: {
    alignItems: 'center',
    paddingTop: 16,
    gap: 8,
  },
  backBtn: {
    alignSelf: 'flex-start',
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(225,29,72,0.08)',
    borderWidth: 1, borderColor: 'rgba(225,29,72,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  logoImg: {
    width: 380, height: 200,
    marginBottom: -30,
  },
  tagline: {
    fontSize: 15, color: '#6B7280',
    letterSpacing: 0.1,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 28, padding: 24, gap: 14,
    borderWidth: 1, borderColor: 'rgba(225,29,72,0.12)',
    shadowColor: BRAND, shadowOpacity: 0.10,
    shadowRadius: 32, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  // ── Google button — visually primary, no label needed ──────────────────────
  googleBtn: {
    height: 56, borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.10,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  googleBtnText: { color: '#111827', fontSize: 16, fontWeight: '700' },

  // ── Divider ─────────────────────────────────────────────────────────────────
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#D1D5DB' },
  divText: { color: '#9CA3AF', fontSize: 12, fontWeight: '500' },

  // ── Error box ───────────────────────────────────────────────────────────────
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF1F3', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  errorText: { fontSize: 13, color: BRAND, fontWeight: '500', flex: 1 },

  // ── Inputs ──────────────────────────────────────────────────────────────────
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14, height: 52,
  },
  inputFocused: {
    borderColor: BRAND,
    backgroundColor: '#fff',
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#111827', fontSize: 15, paddingVertical: 0 },

  // ── Forgot link ─────────────────────────────────────────────────────────────
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -6,
  },
  forgotLinkText: {
    fontSize: 13, color: BRAND, fontWeight: '600',
  },

  // ── Primary button ──────────────────────────────────────────────────────────
  btn: {
    height: 54, borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOpacity: 0.30,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  // ── Secondary button ────────────────────────────────────────────────────────
  secondaryBtn: {
    height: 50, borderRadius: 14,
    backgroundColor: 'rgba(225,29,72,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(225,29,72,0.20)',
  },
  secondaryBtnText: { color: BRAND, fontSize: 15, fontWeight: '600' },

  // ── Forgot password mode ────────────────────────────────────────────────────
  backRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginBottom: -4,
  },
  backText: { fontSize: 13, color: BRAND, fontWeight: '600' },
  forgotTitle: {
    fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.4,
  },
  forgotSub: {
    fontSize: 13, color: '#6B7280', lineHeight: 19,
  },
  feedbackBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1,
  },
  feedbackError: {
    backgroundColor: '#FFF1F3', borderColor: '#FECDD3',
  },
  feedbackSuccess: {
    backgroundColor: '#F0FDF4', borderColor: '#BBF7D0',
  },
  feedbackText: {
    fontSize: 13, fontWeight: '500', flex: 1,
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
  footer: { alignItems: 'center', paddingBottom: 8 },
  footerText: { fontSize: 12, color: '#9CA3AF', letterSpacing: 0.2 },
});
