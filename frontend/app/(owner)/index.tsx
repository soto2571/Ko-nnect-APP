import { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee, Shift } from '@/types';
import { COLORS } from '@/constants';

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ShiftsScreen() {
  const { user, business, primaryColor } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignModal, setAssignModal] = useState<Shift | null>(null);

  // New shift form
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(''); // YYYY-MM-DD
  const [startHour, setStartHour] = useState('09:00');
  const [endHour, setEndHour] = useState('17:00');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      const [s, e] = await Promise.all([
        api.getShifts(business.businessId),
        api.getEmployees(business.businessId),
      ]);
      setShifts(s.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      setEmployees(e);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [business?.businessId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!title.trim() || !date.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setSaving(true);
    try {
      await api.createShift({
        businessId: business!.businessId,
        title: title.trim(),
        startTime: new Date(`${date}T${startHour}:00`).toISOString(),
        endTime: new Date(`${date}T${endHour}:00`).toISOString(),
      });
      setModalVisible(false);
      setTitle(''); setDate(''); setStartHour('09:00'); setEndHour('17:00');
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (shiftId: string) => {
    Alert.alert('Delete Shift', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteShift(shiftId);
            load();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleAssign = async (employeeId: string) => {
    if (!assignModal) return;
    try {
      await api.assignShift(assignModal.shiftId, { employeeId, status: 'assigned' });
      setAssignModal(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const employeeName = (employeeId?: string) => {
    if (!employeeId) return null;
    const e = employees.find((emp) => emp.userId === employeeId || emp.employeeId === employeeId);
    return e ? `${e.firstName} ${e.lastName}` : 'Assigned';
  };

  if (!business) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Set up your business in Settings first.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={primaryColor} />
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(item) => item.shiftId}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No shifts yet. Tap + to create one.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.shiftTitle}>{item.title}</Text>
                <Text style={styles.shiftDate}>{formatDate(item.startTime)}</Text>
                <Text style={styles.shiftTime}>
                  {formatTime(item.startTime)} – {formatTime(item.endTime)}
                </Text>
                {item.employeeId && (
                  <View style={[styles.badge, { backgroundColor: primaryColor + '20' }]}>
                    <Text style={[styles.badgeText, { color: primaryColor }]}>
                      {employeeName(item.employeeId)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => setAssignModal(item)} style={styles.iconBtn}>
                  <Ionicons name="person-add-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.shiftId)} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: primaryColor }]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Shift Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Shift</Text>
            <TextInput
              style={styles.input}
              placeholder="Shift title (e.g. Morning)"
              placeholderTextColor={COLORS.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={COLORS.textSecondary}
              value={date}
              onChangeText={setDate}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Start (HH:MM)"
                placeholderTextColor={COLORS.textSecondary}
                value={startHour}
                onChangeText={setStartHour}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="End (HH:MM)"
                placeholderTextColor={COLORS.textSecondary}
                value={endHour}
                onChangeText={setEndHour}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: primaryColor }]}
                onPress={handleCreate}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Modal */}
      <Modal visible={!!assignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Assign Employee</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {employees.length === 0 ? (
                <Text style={{ color: COLORS.textSecondary, textAlign: 'center', marginVertical: 20 }}>
                  No employees added yet.
                </Text>
              ) : (
                employees.map((emp) => (
                  <TouchableOpacity
                    key={emp.employeeId}
                    style={styles.empRow}
                    onPress={() => handleAssign(emp.userId || emp.employeeId)}
                  >
                    <View style={[styles.avatar, { backgroundColor: primaryColor }]}>
                      <Text style={styles.avatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                    </View>
                    <Text style={styles.empName}>{emp.firstName} {emp.lastName}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 10 }]} onPress={() => setAssignModal(null)}>
              <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Cancel</Text>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  shiftTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  shiftDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  shiftTime: { fontSize: 14, color: COLORS.text, marginTop: 2 },
  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginTop: 6 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardActions: { gap: 8 },
  iconBtn: { padding: 6 },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  cancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  empRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  empName: { fontSize: 15, fontWeight: '500', color: COLORS.text },
});
