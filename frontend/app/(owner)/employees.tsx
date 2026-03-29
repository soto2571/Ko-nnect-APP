import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Clipboard,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee } from '@/types';
import { COLORS } from '@/constants';

interface Credentials { email: string; password: string; name: string; }

export default function EmployeesScreen() {
  const { business, primaryColor } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      setEmployees(await api.getEmployees(business.businessId));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [business?.businessId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please enter first and last name.');
      return;
    }
    setSaving(true);
    try {
      const result = await api.addEmployee({
        businessId: business!.businessId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setAddModal(false);
      setFirstName(''); setLastName('');
      setCredentials({
        name: `${result.employee.firstName} ${result.employee.lastName}`,
        email: result.credentials.email,
        password: result.credentials.password,
      });
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (employeeId: string, name: string) => {
    Alert.alert('Remove Employee', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await api.deleteEmployee(employeeId); load(); } },
    ]);
  };

  if (!business) {
    return <View style={styles.centered}><Text style={styles.emptyText}>Set up your business in Settings first.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={primaryColor} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.employeeId}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ListHeaderComponent={
            <Text style={styles.count}>{employees.length} employee{employees.length !== 1 ? 's' : ''}</Text>
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="people-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No employees yet.{'\n'}Tap + to add one.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
                <Text style={styles.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
                <Text style={styles.loginHint}>Login: {item.email}</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(item.employeeId, `${item.firstName} ${item.lastName}`)}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: primaryColor }]} onPress={() => setAddModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Employee Modal */}
      <Modal visible={addModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>Add Employee</Text>
              <View style={{ width: 22 }} />
            </View>

            <Text style={styles.sheetNote}>
              Ko-nnect will auto-generate login credentials for the employee. Share them so they can log in.
            </Text>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="First name"
                  placeholderTextColor={COLORS.textSecondary}
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Last name"
                  placeholderTextColor={COLORS.textSecondary}
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: primaryColor }]}
                onPress={handleAdd}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.addBtnText}>Create Employee</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Credentials Modal */}
      <Modal visible={!!credentials} animationType="fade" transparent>
        <View style={styles.credOverlay}>
          <View style={styles.credBox}>
            <View style={[styles.credIconWrap, { backgroundColor: primaryColor + '20' }]}>
              <Ionicons name="key-outline" size={28} color={primaryColor} />
            </View>
            <Text style={styles.credTitle}>Employee Created!</Text>
            <Text style={styles.credSubtitle}>
              Share these login credentials with{' '}
              <Text style={{ fontWeight: '700' }}>{credentials?.name}</Text>.
              {'\n'}They won't be shown again.
            </Text>

            <View style={styles.credField}>
              <Text style={styles.credLabel}>Login Email</Text>
              <View style={styles.credRow}>
                <Text style={styles.credValue} selectable>{credentials?.email}</Text>
                <TouchableOpacity onPress={() => { Clipboard.setString(credentials?.email ?? ''); Alert.alert('Copied!', 'Email copied to clipboard.'); }}>
                  <Ionicons name="copy-outline" size={18} color={primaryColor} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.credField}>
              <Text style={styles.credLabel}>Password</Text>
              <View style={styles.credRow}>
                <Text style={styles.credValue} selectable>{credentials?.password}</Text>
                <TouchableOpacity onPress={() => { Clipboard.setString(credentials?.password ?? ''); Alert.alert('Copied!', 'Password copied to clipboard.'); }}>
                  <Ionicons name="copy-outline" size={18} color={primaryColor} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.credWarning}>
              The employee can change their password after logging in.
            </Text>

            <TouchableOpacity
              style={[styles.credBtn, { backgroundColor: primaryColor }]}
              onPress={() => setCredentials(null)}
            >
              <Text style={styles.credBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  count: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  card: {
    backgroundColor: COLORS.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  loginHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 6 },
  fab: {
    position: 'absolute', bottom: 28, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sheetNote: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
  },
  addBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Credentials modal
  credOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  credBox: { backgroundColor: COLORS.white, borderRadius: 20, padding: 24, width: '100%', gap: 14, alignItems: 'center' },
  credIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  credTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  credSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  credField: { width: '100%', backgroundColor: COLORS.background, borderRadius: 12, padding: 14, gap: 4 },
  credLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  credRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  credValue: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  credWarning: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  credBtn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40, alignItems: 'center' },
  credBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
