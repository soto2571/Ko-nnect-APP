import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND   = '#E11D48';
const BRAND_L = '#FF6B8A';

export default function LoginScreen() {
  const { login, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused]       = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError]       = useState('');

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally { setGoogleLoading(false); }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      {/* Full-screen brand gradient — stays colored throughout, no white fade */}
      <LinearGradient
        colors={['#7A0020', '#C4002B', '#E11D48', '#FF6B8A', '#FFB3C6']}
        locations={[0, 0.2, 0.5, 0.78, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Subtle diagonal overlay for depth */}
      <LinearGradient
        colors={['rgba(0,0,0,0.18)', 'transparent', 'rgba(0,0,0,0.10)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={[s.outer, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>

        {/* Top section — logo + tagline */}
        <Animated.View style={[s.logoBlock, {
          opacity: logoAnim,
          transform: [{ translateY: logoAnim.interpolate({ inputRange:[0,1], outputRange:[-24,0] }) }],
        }]}>
          <Text style={s.logoText}>Ko-nnect</Text>
          <Text style={s.tagline}>Your team, always in sync.</Text>
        </Animated.View>

        {/* Middle section — glass card */}
        <Animated.View style={[s.card, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[32,0] }) }],
        }]}>
          {error !== '' && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={BRAND} />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <View style={[s.inputWrap, emailFocused && s.inputFocused]}>
            <Ionicons name="mail-outline" size={17} color={emailFocused ? BRAND : '#9CA3AF'} style={s.icon} />
            <TextInput
              style={s.input} placeholder="Email address" placeholderTextColor="#B0B0BA"
              value={email} onChangeText={t => { setEmail(t); setError(''); }}
              autoCapitalize="none" keyboardType="email-address"
              onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
            />
          </View>

          <View style={[s.inputWrap, passwordFocused && s.inputFocused]}>
            <Ionicons name="lock-closed-outline" size={17} color={passwordFocused ? BRAND : '#9CA3AF'} style={s.icon} />
            <TextInput
              style={[s.input, { flex: 1 }]} placeholder="Password" placeholderTextColor="#B0B0BA"
              value={password} onChangeText={t => { setPassword(t); setError(''); }}
              secureTextEntry={!showPw}
              onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)}
            />
            <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Pressable
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start()}
            onPress={handleLogin} disabled={loading}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <View style={s.btn}>
                {loading ? <ActivityIndicator color="#E11D48" /> : <Text style={s.btnText}>Sign In</Text>}
              </View>
            </Animated.View>
          </Pressable>

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
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divText}>New to Ko-nnect?</Text>
            <View style={s.divLine} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} style={s.secondaryBtn}>
            <Text style={s.secondaryBtnText}>Create an account</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom section — version / breathing room */}
        <Animated.View style={[s.footer, { opacity: cardAnim }]}>
          <Text style={s.footerText}>Ko-nnect · Shift scheduling, simplified</Text>
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
    paddingTop: 32,
    gap: 8,
  },
  logoText: {
    fontSize: 48, fontWeight: '800', color: '#fff',
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 15, color: 'rgba(255,255,255,0.82)',
    letterSpacing: 0.1,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 28, padding: 24, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000', shadowOpacity: 0.20,
    shadowRadius: 32, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.90)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,100,100,0.30)',
  },
  errorText: { fontSize: 13, color: BRAND, fontWeight: '500', flex: 1 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.60)',
    paddingHorizontal: 14, height: 52,
  },
  inputFocused: {
    borderColor: BRAND,
    backgroundColor: '#fff',
  },
  icon: { marginRight: 10 },
  input: {
    flex: 1, color: '#111827',
    fontSize: 15, paddingVertical: 0,
  },

  // White solid button — brand text, pops on the glass card
  btn: {
    height: 54, borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  btnText: { color: BRAND, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  googleBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    shadowColor: '#000', shadowOpacity: 0.10,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  googleIcon: {
    fontSize: 18, fontWeight: '800', color: '#4285F4',
  },
  googleBtnText: { color: '#111827', fontSize: 15, fontWeight: '600' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.30)' },
  divText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '500' },

  secondaryBtn: {
    height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)',
  },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  footer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  footerText: {
    fontSize: 12, color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.2,
  },
});
