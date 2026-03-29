import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Clipboard,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee } from '@/types';
import { COLORS } from '@/constants';

export default function EmployeesScreen() {
  const { business, primaryColor } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
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
      // Show credentials immediately after creation
      setDetailEmp(result.employee);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (emp: Employee) => {
    Alert.alert('Remove Employee', `Remove ${emp.firstName} ${emp.lastName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await api.deleteEmployee(emp.employeeId);
          setDetailEmp(null);
          load();
        },
      },
    ]);
  };

  if (!business) {
    return <View style={s.centered}><Text style={s.emptyText}>Set up your business in Settings first.</Text></View>;
  }

  return (
    <View style={s.container}>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={primaryColor} />
      ) : (
        <FlatList
          data={employees}
          keyExtractor={item => item.employeeId}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ListHeaderComponent={
            <Text style={s.count}>{employees.length} employee{employees.length !== 1 ? 's' : ''}</Text>
          }
          ListEmptyComponent={
            <View style={s.centered}>
              <Ionicons name="people-outline" size={48} color={COLORS.border} />
              <Text style={s.emptyText}>No employees yet.{'\n'}Tap + to add one.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => setDetailEmp(item)}>
              <View style={[s.avatar, { backgroundColor: primaryColor }]}>
                <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.firstName} {item.lastName}</Text>
                <Text style={s.emailHint}>{item.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.border} />
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={[s.fab, { backgroundColor: primaryColor }]} onPress={() => setAddModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Add Employee Modal ── */}
      <Modal visible={addModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Add Employee</Text>
              <View style={{ width: 22 }} />
            </View>
            <Text style={s.sheetNote}>
              Ko-nnect will auto-generate login credentials. You can always view them by tapping the employee.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[s.input, { flex: 1 }]} placeholder="First name"
                placeholderTextColor={COLORS.textSecondary} value={firstName} onChangeText={setFirstName} />
              <TextInput style={[s.input, { flex: 1 }]} placeholder="Last name"
                placeholderTextColor={COLORS.textSecondary} value={lastName} onChangeText={setLastName} />
            </View>
            <TouchableOpacity style={[s.addBtn, { backgroundColor: primaryColor }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.addBtnText}>Create Employee</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Employee Detail / Credentials Modal ── */}
      <Modal visible={!!detailEmp} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            {detailEmp && (
              <>
                <View style={s.sheetHeader}>
                  <TouchableOpacity onPress={() => setDetailEmp(null)}>
                    <Ionicons name="close" size={22} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <Text style={s.sheetTitle}>Employee Details</Text>
                  <TouchableOpacity onPress={() => handleDelete(detailEmp)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>

                {/* Profile */}
                <View style={s.profileRow}>
                  <View style={[s.detailAvatar, { backgroundColor: primaryColor }]}>
                    <Text style={s.detailAvatarText}>{detailEmp.firstName[0]}{detailEmp.lastName[0]}</Text>
                  </View>
                  <View>
                    <Text style={s.detailName}>{detailEmp.firstName} {detailEmp.lastName}</Text>
                    <Text style={s.detailSub}>Employee</Text>
                  </View>
                </View>

                {/* Credentials */}
                <View style={s.credSection}>
                  <Text style={s.credSectionTitle}>Login Credentials</Text>
                  <Text style={s.credSectionSub}>Share these with the employee so they can log in.</Text>

                  <CredRow label="Email" value={detailEmp.email} primaryColor={primaryColor} />
                  <CredRow
                    label="Password"
                    value={detailEmp.tempPassword ?? '(set before this update — recreate employee to get new credentials)'}
                    primaryColor={primaryColor}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CredRow({ label, value, primaryColor }: { label: string; value: string; primaryColor: string }) {
  const copy = () => {
    Clipboard.setString(value);
    Alert.alert('Copied!', `${label} copied to clipboard.`);
  };
  return (
    <View style={cr.field}>
      <Text style={cr.label}>{label}</Text>
      <View style={cr.row}>
        <Text style={cr.value} selectable numberOfLines={1} ellipsizeMode="tail">{value}</Text>
        <TouchableOpacity onPress={copy} style={cr.copyBtn}>
          <Ionicons name="copy-outline" size={18} color={primaryColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
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
  emailHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 28, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 44, gap: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  sheetNote: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  input: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.text,
  },
  addBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  detailAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  detailAvatarText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  detailName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  detailSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  credSection: { gap: 8 },
  credSectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  credSectionSub: { fontSize: 13, color: COLORS.textSecondary },
});

const cr = StyleSheet.create({
  field: { backgroundColor: COLORS.background, borderRadius: 12, padding: 14, gap: 4 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { fontSize: 15, fontWeight: '600', color: COLORS.text, flex: 1 },
  copyBtn: { padding: 4 },
});
