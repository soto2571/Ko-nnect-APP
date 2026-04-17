import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

const BRAND = '#E11D48';

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ access_token?: string; refresh_token?: string }>();

  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const [sessionReady, setSessionReady] = useState(false);

  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }).start();
  }, []);

  // On mount, parse tokens from the deep link URL and set the Supabase session
  useEffect(() => {
    (async () => {
      let accessToken = params.access_token;
      let refreshToken = params.refresh_token;

      // Tokens may come in the URL fragment (#access_token=...) rather than query
      if (!accessToken) {
        const url = await Linking.getInitialURL();
        if (url) {
          const fragment = url.includes('#') ? url.split('#')[1] : '';
          const sp = new URLSearchParams(fragment);
          accessToken = sp.get('access_token') ?? undefined;
          refreshToken = sp.get('refresh_token') ?? undefined;
        }
      }

      if (!accessToken) {
        setError('Enlace de recuperación inválido o expirado.');
        return;
      }

      const { error: sErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken ?? '',
      });
      if (sErr) {
        setError('No se pudo validar el enlace. Solicita uno nuevo.');
        return;
      }
      setSessionReady(true);
    })();
  }, []);

  const handleReset = async () => {
    setError('');
    if (!newPw || !confirmPw) { setError('Por favor llena ambos campos.'); return; }
    if (newPw.length < 6)     { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPw !== confirmPw)  { setError('Las contraseñas no coinciden.'); return; }

    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: newPw });
      if (upErr) throw upErr;
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? 'Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={BRAND} />

      <View style={[s.outer, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>

        <View style={s.logoBlock}>
          <Image source={require('@/assets/konnectaBigWhite.png')} style={s.logoImg} resizeMode="contain" />
        </View>

        <Animated.View style={[s.card, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[32,0] }) }],
        }]}>

          {success ? (
            <>
              <View style={s.successIcon}>
                <Ionicons name="checkmark-circle" size={56} color="#16A34A" />
              </View>
              <Text style={s.title}>¡Contraseña actualizada!</Text>
              <Text style={s.subtitle}>
                Ya puedes iniciar sesión con tu nueva contraseña.
              </Text>
              <TouchableOpacity style={s.btn} onPress={() => router.replace('/(auth)/login')}>
                <Text style={s.btnText}>Ir a Iniciar Sesión</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={s.title}>Nueva contraseña</Text>
              <Text style={s.subtitle}>Ingresa y confirma tu nueva contraseña.</Text>

              {error !== '' && (
                <View style={s.errorBox}>
                  <Ionicons name="alert-circle-outline" size={15} color={BRAND} />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}

              {!sessionReady && !error ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                  <ActivityIndicator color={BRAND} />
                </View>
              ) : (
                <>
                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={17} color="#9CA3AF" style={s.icon} />
                    <TextInput
                      style={s.input}
                      placeholder="Nueva contraseña (mín. 6 caracteres)"
                      placeholderTextColor="#B0B0BA"
                      value={newPw}
                      onChangeText={t => { setNewPw(t); setError(''); }}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPw(v => !v)} style={{ padding: 4 }}>
                      <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <View style={s.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={17} color="#9CA3AF" style={s.icon} />
                    <TextInput
                      style={s.input}
                      placeholder="Confirmar nueva contraseña"
                      placeholderTextColor="#B0B0BA"
                      value={confirmPw}
                      onChangeText={t => { setConfirmPw(t); setError(''); }}
                      secureTextEntry={!showPw}
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity style={s.btn} onPress={handleReset} disabled={loading || !sessionReady}>
                    {loading
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={s.btnText}>Actualizar Contraseña</Text>
                    }
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={s.backLink}>
                <Text style={s.backLinkText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            </>
          )}

        </Animated.View>

      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },

  logoBlock: { alignItems: 'center' },
  logoImg: { width: 260, height: 120 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 28, padding: 24, gap: 14,
    borderWidth: 1, borderColor: 'rgba(225,29,72,0.12)',
    shadowColor: BRAND, shadowOpacity: 0.10,
    shadowRadius: 32, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },

  title: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  successIcon: { alignItems: 'center', paddingVertical: 8 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF1F3', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#FECDD3',
  },
  errorText: { fontSize: 13, color: BRAND, fontWeight: '500', flex: 1 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB',
    paddingHorizontal: 14, height: 52,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, color: '#111827', fontSize: 15, paddingVertical: 0 },

  btn: {
    height: 54, borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: BRAND, shadowOpacity: 0.30,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    marginTop: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  backLink: { alignSelf: 'center', paddingVertical: 6 },
  backLinkText: { fontSize: 13, color: BRAND, fontWeight: '600' },
});
