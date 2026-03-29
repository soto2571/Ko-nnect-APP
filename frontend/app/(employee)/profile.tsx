import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants';

export default function EmployeeProfileScreen() {
  const { user, business, logout, primaryColor } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
          <Text style={styles.avatarText}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </Text>
        </View>
        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {business && <Text style={styles.business}>{business.name}</Text>}
      </View>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Role: Employee</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, gap: 16 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 26 },
  name: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  email: { fontSize: 14, color: COLORS.textSecondary },
  business: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  section: { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: COLORS.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  logoutText: { color: COLORS.danger, fontWeight: '600', fontSize: 15 },
});
