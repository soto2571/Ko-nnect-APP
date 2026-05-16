import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { getPendingSignup, clearPendingSignup } from '@/lib/pending-signup';

const BRAND = '#E11D48';

export default function VerifyEmailScreen() {
  const { completeSignup } = useAuth();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [otp, setOtp]       = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);

  const inputs = useRef<(TextInput | null)[]>([]);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
    startResendCooldown();
  }, []);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const id = setInterval(() => {
      setResendCooldown(v => { if (v <= 1) { clearInterval(id); return 0; } return v - 1; });
    }, 1000);
  };

  const handleDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError('');
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) { setError('Ingresa el código completo de 6 dígitos.'); return; }
    setLoading(true);
    setError('');
    try {
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email!,
        token: code,
        type: 'email',
      });
      if (verifyErr || !data.session) {
        setError('Código incorrecto o expirado. Revisa tu correo.');
        return;
      }
      const pending = getPendingSignup();
      if (!pending) { setError('Datos de registro perdidos. Vuelve a intentarlo.'); return; }

      // Set password on the newly verified account
      await supabase.auth.updateUser({ password: pending.password });
      clearPendingSignup();

      await completeSignup(data.session, { firstName: pending.firstName, lastName: pending.lastName });
    } catch (e: any) {
      setError(e.message ?? 'Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await supabase.auth.signInWithOtp({ email: email!, options: { shouldCreateUser: false } });
      startResendCooldown();
    } catch {
      setError('No se pudo reenviar el código.');
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
        {/* Back */}
        <Animated.View style={{
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[-16,0] }) }],
          paddingHorizontal: 24, marginBottom: 8,
        }}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={BRAND} />
          </TouchableOpacity>
        </Animated.View>

        <View style={s.inner}>
          {/* Header */}
          <Animated.View style={[s.header, {
            opacity: cardAnim,
            transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[-20,0] }) }],
          }]}>
            <View style={s.iconBox}>
              <Ionicons name="mail-outline" size={28} color={BRAND} />
            </View>
            <Text style={s.title}>Verifica tu correo</Text>
            <Text style={s.sub}>
              Enviamos un código de 6 dígitos a{'\n'}
              <Text style={{ fontWeight: '700', color: '#374151' }}>{email}</Text>
            </Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={[s.card, {
            opacity: cardAnim,
            transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[28,0] }) }],
          }]}>
            {error !== '' && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={BRAND} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* OTP boxes */}
            <View style={s.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={el => { inputs.current[i] = el; }}
                  style={[s.otpBox, digit ? s.otpBoxFilled : null]}
                  value={digit}
                  onChangeText={v => handleDigit(i, v)}
                  onKeyPress={({ nativeEvent }) => handleKeyDown(i, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading || otp.join('').length < 6}
              style={[s.btn, (loading || otp.join('').length < 6) && { opacity: 0.6 }]}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Verificar y continuar</Text>
              }
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: cardAnim, alignItems: 'center' }}>
            <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
              <Text style={[s.resendText, resendCooldown > 0 && { color: '#9CA3AF' }]}>
                {resendCooldown > 0
                  ? `¿No recibiste el código? Reenviar en ${resendCooldown}s`
                  : '¿No recibiste el código? Reenviar'
                }
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

  header: { alignItems: 'center', gap: 10 },
  iconBox: {
    width: 68, height: 68, borderRadius: 22,
    backgroundColor: 'rgba(225,29,72,0.08)',
    borderWidth: 1, borderColor: 'rgba(225,29,72,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', letterSpacing: -0.3 },
  sub: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 28, padding: 22, gap: 18,
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

  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  otpBox: {
    width: 46, height: 58, borderRadius: 14,
    textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#111827',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5, borderColor: 'rgba(225,29,72,0.2)',
  },
  otpBoxFilled: {
    borderColor: BRAND,
    backgroundColor: 'rgba(225,29,72,0.05)',
  },

  btn: {
    height: 54, borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  resendText: { fontSize: 13, color: BRAND, fontWeight: '600', textAlign: 'center' },
});
