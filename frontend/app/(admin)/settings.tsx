import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { PasswordField, passwordValid } from '@/components/PasswordField';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';

export default function AdminSettingsScreen() {
  const { user, business, primaryColor, logout, login } = useAuth();
  const insets = useSafeAreaInsets();
  const color = primaryColor;
  const isGoogleUser = user?.provider === 'google';

  const [showPw, setShowPw]         = useState(false);
  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [savingPw, setSavingPw]     = useState(false);

  const handleLogout = () => {
    Alert.alert('Cerrar Sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar Sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPw) {
      Alert.alert('Error', 'Ingresa tu contraseña actual.'); return;
    }
    if (!passwordValid(newPw)) {
      Alert.alert('Contraseña débil', 'Asegúrate de cumplir todos los requisitos.'); return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('No coinciden', 'Las contraseñas nuevas no son iguales.'); return;
    }
    setSavingPw(true);
    try {
      await api.changePassword({ currentPassword: currentPw, newPassword: newPw });
      await login(user!.email, newPw);
      Alert.alert('¡Listo!', 'Contraseña actualizada.');
      setCurrentPw(''); setNewPw(''); setConfirmPw(''); setShowPw(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingPw(false);
    }
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : '?';

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={color} />

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <View style={s.card}>
          <View style={[s.avatar, { backgroundColor: color }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
            <Text style={s.email}>{user?.email}</Text>
          </View>
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#7C3AED" />
            <Text style={s.adminBadgeText}>Admin</Text>
          </View>
        </View>

        {/* Business info */}
        {business && (
          <View style={s.infoRow}>
            <View style={[s.colorDot, { backgroundColor: business.color }]} />
            <Text style={s.infoText}>{business.name}</Text>
          </View>
        )}

        {/* Change password — hidden for Google users */}
        {!isGoogleUser && (
          <>
            <TouchableOpacity style={s.sectionBtn} onPress={() => setShowPw(v => !v)}>
              <Ionicons name="lock-closed-outline" size={18} color={color} />
              <Text style={[s.sectionBtnText, { color }]}>Cambiar Contraseña</Text>
              <Ionicons name={showPw ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {showPw && (
              <View style={s.card}>
                <PasswordField value={currentPw} onChange={setCurrentPw} placeholder="Contraseña actual" showRequirements={false} />
                <PasswordField value={newPw} onChange={setNewPw} placeholder="Nueva contraseña" />
                <PasswordField value={confirmPw} onChange={setConfirmPw} placeholder="Confirmar nueva contraseña" showRequirements={false} />
                <TouchableOpacity
                  style={[s.primaryBtn, { backgroundColor: color, opacity: (!currentPw || !passwordValid(newPw) || !confirmPw) ? 0.5 : 1 }]}
                  onPress={handleChangePassword}
                  disabled={savingPw || !currentPw || !passwordValid(newPw) || !confirmPw}
                >
                  {savingPw ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Guardar contraseña</Text>}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20, padding: 16, gap: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  name: { fontSize: 16, fontWeight: '700', color: '#111827' },
  email: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#7C3AED15', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#7C3AED30',
  },
  adminBadgeText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  infoText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  sectionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)',
  },
  sectionBtnText: { flex: 1, fontSize: 15, fontWeight: '600' },
  primaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
