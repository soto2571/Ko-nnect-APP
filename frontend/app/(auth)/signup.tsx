import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, ScrollView, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = '#E11D48';

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
  const { signup, signInWithGoogle } = useAuth();
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
      setError(err.message || 'Google sign-in failed.');
    } finally { setGoogleLoading(false); }
  };

  const handleSignup = async () => {
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: 'owner',
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />

      {/* Same full-brand gradient as login — no white fade */}
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
            <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </Animated.View>

        <View style={s.inner}>

          {/* Header */}
          <Animated.View style={[s.header, {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange:[0,1], outputRange:[-20,0] }) }],
          }]}>
            <Text style={s.logoText}>Ko-nnect</Text>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.sub}>Set up your business and manage your team.</Text>
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
              <Field icon="person-outline" placeholder="First name"
                value={firstName} onChangeText={(t: string) => { setFirstName(t); setError(''); }}
                style={{ flex: 1 }} />
              <Field icon="person-outline" placeholder="Last name"
                value={lastName} onChangeText={(t: string) => { setLastName(t); setError(''); }}
                style={{ flex: 1 }} />
            </View>

            <Field icon="mail-outline" placeholder="Email address"
              value={email} onChangeText={(t: string) => { setEmail(t); setError(''); }}
              keyboardType="email-address" autoCapitalize="none" />

            <Field icon="lock-closed-outline" placeholder="Password (min 6 characters)"
              value={password} onChangeText={(t: string) => { setPassword(t); setError(''); }}
              secureTextEntry={!showPw} autoCapitalize="none"
              rightElement={
                <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color="#9CA3AF" />
                </TouchableOpacity>
              }
            />

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
                    : <Text style={s.btnText}>Create Account</Text>
                  }
                </View>
              </Animated.View>
            </Pressable>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>or</Text>
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
                  <Text style={s.googleIcon}>G</Text>
                  <Text style={s.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

          </Animated.View>

          <Animated.View style={{ opacity: formAnim, alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.loginText}>
                Already have an account?{'  '}
                <Text style={s.loginLink}>Sign in</Text>
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
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-start',
  },

  header: { alignItems: 'center', gap: 8 },
  logoText: {
    fontSize: 38, fontWeight: '800', color: '#fff',
    letterSpacing: -1.5,
  },
  title: {
    fontSize: 22, fontWeight: '700',
    color: 'rgba(255,255,255,0.90)', letterSpacing: -0.3,
  },
  sub: {
    fontSize: 13, color: 'rgba(255,255,255,0.72)',
    textAlign: 'center', lineHeight: 18,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 28, padding: 22, gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#000', shadowOpacity: 0.20,
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
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  btnText: { color: BRAND, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.30)' },
  divText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '500' },

  googleBtn: {
    height: 52, borderRadius: 14,
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    shadowColor: '#000', shadowOpacity: 0.10,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleBtnText: { color: '#111827', fontSize: 15, fontWeight: '600' },

  loginText: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  loginLink: { color: '#fff', fontWeight: '700' },
});
