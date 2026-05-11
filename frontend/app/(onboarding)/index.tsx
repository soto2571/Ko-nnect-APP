import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { PasswordField, passwordValid } from '@/components/PasswordField';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';

const BRAND = '#E11D48';

const FEATURES = [
  {
    icon: 'calendar-outline' as const,
    title: 'Tus turnos',
    desc: 'Ve todos tus turnos asignados con horarios, fechas y detalles en un solo lugar.',
  },
  {
    icon: 'time-outline' as const,
    title: 'Marca tu entrada y salida',
    desc: 'Usa el reloj de ponche para registrar tu hora de entrada, descanso y salida.',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Tus horas',
    desc: 'Consulta cuántas horas trabajaste en cada período de pago directamente desde tu perfil.',
  },
];

export default function OnboardingScreen() {
  const { user, primaryColor, clearMustChangePassword, login } = useAuth();
  const insets = useSafeAreaInsets();
  const color = primaryColor === '#4F46E5' ? BRAND : primaryColor;

  const [step, setStep] = useState<'welcome' | 'password'>('welcome');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving]       = useState(false);

  const handleChangePassword = async () => {
    if (!passwordValid(newPw)) {
      Alert.alert('Contraseña débil', 'Asegúrate de cumplir todos los requisitos.'); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('No coinciden', 'Las contraseñas no son iguales.'); return;
    }
    setSaving(true);
    try {
      await api.changePassword({ newPassword: newPw });
      // Re-login with the new password to get fresh tokens —
      // the old JWT is invalidated by Supabase the moment the password changes.
      // login() also returns mustChangePassword: false (tempPassword is now null),
      // so the router will navigate to the correct home screen automatically.
      await login(user!.email, newPw);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={color} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'welcome' ? (
            <>
              {/* Header */}
              <View style={s.header}>
                <View style={[s.logoWrap, { backgroundColor: color + '18' }]}>
                  <Ionicons name="flash" size={32} color={color} />
                </View>
                <Text style={s.greeting}>¡Bienvenido{user?.firstName ? `, ${user.firstName}` : ''}!</Text>
                <Text style={s.sub}>Aquí te explicamos cómo funciona Ko-nnecta' para que empieces con el pie derecho.</Text>
              </View>

              {/* Feature cards */}
              <View style={s.featureList}>
                {FEATURES.map((f, i) => (
                  <View key={i} style={s.featureCard}>
                    <View style={[s.featureIcon, { backgroundColor: color + '15' }]}>
                      <Ionicons name={f.icon} size={22} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.featureTitle}>{f.title}</Text>
                      <Text style={s.featureDesc}>{f.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Next */}
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: color }]}
                onPress={() => setStep('password')}
              >
                <Text style={s.primaryBtnText}>Continuar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Header */}
              <View style={s.header}>
                <View style={[s.logoWrap, { backgroundColor: color + '18' }]}>
                  <Ionicons name="lock-closed" size={28} color={color} />
                </View>
                <Text style={s.greeting}>Crea tu contraseña</Text>
                <Text style={s.sub}>Tu cuenta llegó con una contraseña temporal. Crea una personal y segura antes de continuar.</Text>
              </View>

              {/* Form */}
              <View style={s.form}>
                <PasswordField value={newPw} onChange={setNewPw} placeholder="Nueva contraseña" autoFocus />
                <PasswordField value={confirmPw} onChange={setConfirmPw} placeholder="Confirmar contraseña" showRequirements={false} />

                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: color, opacity: (!passwordValid(newPw) || !confirmPw) ? 0.5 : 1 }]}
                  onPress={handleChangePassword}
                  disabled={saving || !passwordValid(newPw) || !confirmPw}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <><Text style={s.primaryBtnText}>Guardar y entrar</Text><Ionicons name="checkmark" size={18} color="#fff" /></>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={s.backBtn} onPress={() => setStep('welcome')}>
                  <Ionicons name="arrow-back" size={16} color="#9CA3AF" />
                  <Text style={s.backBtnText}>Atrás</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.skipBtn} onPress={clearMustChangePassword}>
                  <Text style={s.skipText}>Saltar por ahora</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 24 },

  header: { alignItems: 'center', gap: 12 },
  logoWrap: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#111827', textAlign: 'center', letterSpacing: -0.5 },
  sub: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },

  featureList: { gap: 12 },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 18,
    padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  featureIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 3 },
  featureDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19 },

  form: { gap: 14 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  backBtnText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  skipBtn: { alignItems: 'center', paddingVertical: 4 },
  skipText: { fontSize: 13, color: '#9CA3AF' },
});
