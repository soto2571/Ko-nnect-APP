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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee, Shift } from '@/types';
import { COLORS } from '@/constants';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDisplayTime(hour: number, minute: number) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 === 0 ? 12 : hour % 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

function formatShiftTime(iso: string) {
  const d = new Date(iso);
  return formatDisplayTime(d.getHours(), d.getMinutes());
}

function formatShiftDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1–12
const MINUTES = [0, 15, 30, 45];

// ─── Mini Calendar ───────────────────────────────────────────────────────────

function MiniCalendar({
  selectedDates,
  onToggleDate,
  primaryColor,
}: {
  selectedDates: Set<string>;
  onToggleDate: (dateStr: string) => void;
  primaryColor: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const toKey = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <View style={cal.container}>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <View style={cal.dayNames}>
        {DAY_NAMES.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}
      </View>

      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e-${i}`} style={cal.cell} />;
          const key = toKey(day);
          const isSelected = selectedDates.has(key);
          const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <TouchableOpacity
              key={key}
              style={[cal.cell, isSelected && { backgroundColor: primaryColor, borderRadius: 20 }, isPast && cal.pastCell]}
              onPress={() => !isPast && onToggleDate(key)}
              disabled={isPast}
            >
              <Text style={[cal.dayText, isSelected && { color: '#fff', fontWeight: '700' }, isPast && { color: COLORS.border }]}>
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Time Picker ─────────────────────────────────────────────────────────────

function TimePicker({
  label,
  hour,
  minute,
  ampm,
  onHourChange,
  onMinuteChange,
  onAmpmChange,
  primaryColor,
}: {
  label: string;
  hour: number;
  minute: number;
  ampm: 'AM' | 'PM';
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onAmpmChange: (a: 'AM' | 'PM') => void;
  primaryColor: string;
}) {
  return (
    <View style={tp.container}>
      <Text style={tp.label}>{label}</Text>
      <View style={tp.row}>
        {/* Hour */}
        <ScrollView style={tp.scroll} showsVerticalScrollIndicator={false}>
          {HOURS.map(h => (
            <TouchableOpacity key={h} style={[tp.item, hour === h && { backgroundColor: primaryColor, borderRadius: 8 }]} onPress={() => onHourChange(h)}>
              <Text style={[tp.itemText, hour === h && { color: '#fff', fontWeight: '700' }]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={tp.colon}>:</Text>
        {/* Minute */}
        <ScrollView style={tp.scroll} showsVerticalScrollIndicator={false}>
          {MINUTES.map(m => (
            <TouchableOpacity key={m} style={[tp.item, minute === m && { backgroundColor: primaryColor, borderRadius: 8 }]} onPress={() => onMinuteChange(m)}>
              <Text style={[tp.itemText, minute === m && { color: '#fff', fontWeight: '700' }]}>{String(m).padStart(2, '0')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* AM/PM */}
        <View style={tp.ampmCol}>
          {(['AM', 'PM'] as const).map(a => (
            <TouchableOpacity key={a} style={[tp.ampmBtn, ampm === a && { backgroundColor: primaryColor, borderRadius: 8 }]} onPress={() => onAmpmChange(a)}>
              <Text style={[tp.ampmText, ampm === a && { color: '#fff', fontWeight: '700' }]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ShiftsScreen() {
  const { business, primaryColor } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'calendar' | 'time' | 'employee'>('calendar');

  // Form state
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [startAmpm, setStartAmpm] = useState<'AM' | 'PM'>('AM');
  const [endHour, setEndHour] = useState(5);
  const [endMinute, setEndMinute] = useState(0);
  const [endAmpm, setEndAmpm] = useState<'AM' | 'PM'>('PM');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
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

  const to24Hour = (h: number, ampm: 'AM' | 'PM') => {
    if (ampm === 'AM') return h === 12 ? 0 : h;
    return h === 12 ? 12 : h + 12;
  };

  const resetForm = () => {
    setSelectedDates(new Set());
    setStartHour(9); setStartMinute(0); setStartAmpm('AM');
    setEndHour(5); setEndMinute(0); setEndAmpm('PM');
    setSelectedEmployee(null);
    setStep('calendar');
  };

  const openModal = () => {
    if (employees.length === 0) {
      Alert.alert('No Employees', 'Add employees first before creating shifts.');
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (selectedDates.size === 0) { Alert.alert('Error', 'Select at least one date.'); return; }
    if (!selectedEmployee) { Alert.alert('Error', 'Select an employee.'); return; }

    const start24 = to24Hour(startHour, startAmpm);
    const end24 = to24Hour(endHour, endAmpm);

    setSaving(true);
    try {
      const promises = Array.from(selectedDates).map(dateStr =>
        api.createShift({
          businessId: business!.businessId,
          title: `${selectedEmployee.firstName}'s Shift`,
          startTime: new Date(`${dateStr}T${String(start24).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00`).toISOString(),
          endTime: new Date(`${dateStr}T${String(end24).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`).toISOString(),
        }).then(shift =>
          api.assignShift(shift.shiftId, { employeeId: selectedEmployee.userId || selectedEmployee.employeeId, status: 'assigned' })
        )
      );
      await Promise.all(promises);
      setModalVisible(false);
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
      { text: 'Delete', style: 'destructive', onPress: async () => { await api.deleteShift(shiftId); load(); } },
    ]);
  };

  const employeeName = (employeeId?: string) => {
    if (!employeeId) return null;
    const e = employees.find(emp => emp.userId === employeeId || emp.employeeId === employeeId);
    return e ? `${e.firstName} ${e.lastName}` : null;
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
          keyExtractor={item => item.shiftId}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyText}>No shifts yet. Tap + to create one.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const name = employeeName(item.employeeId);
            return (
              <View style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: primaryColor }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.shiftTitle}>{item.title}</Text>
                  <Text style={styles.shiftDate}>{formatShiftDate(item.startTime)}</Text>
                  <Text style={styles.shiftTime}>
                    {formatShiftTime(item.startTime)} – {formatShiftTime(item.endTime)}
                  </Text>
                  {name && (
                    <View style={[styles.badge, { backgroundColor: primaryColor + '20' }]}>
                      <Ionicons name="person-outline" size={11} color={primaryColor} />
                      <Text style={[styles.badgeText, { color: primaryColor }]}>{name}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.shiftId)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: primaryColor }]} onPress={openModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Shift Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setModalVisible(false); }}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Shift</Text>
              <View style={{ width: 22 }} />
            </View>

            {/* Step indicators */}
            <View style={styles.steps}>
              {(['calendar', 'time', 'employee'] as const).map((s, i) => (
                <View key={s} style={styles.stepRow}>
                  <View style={[styles.stepDot, (step === s || (i === 0 && step !== 'calendar') || (i === 1 && step === 'employee')) && { backgroundColor: primaryColor }]}>
                    <Text style={styles.stepDotText}>{i + 1}</Text>
                  </View>
                  {i < 2 && <View style={[styles.stepLine, (i === 0 && step !== 'calendar') || (i === 1 && step === 'employee') ? { backgroundColor: primaryColor } : {}]} />}
                </View>
              ))}
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>

              {/* Step 1: Calendar */}
              {step === 'calendar' && (
                <View>
                  <Text style={styles.stepTitle}>Select date(s)</Text>
                  <Text style={styles.stepSubtitle}>Tap multiple days to create shifts for all at once</Text>
                  <MiniCalendar
                    selectedDates={selectedDates}
                    onToggleDate={dateStr => {
                      setSelectedDates(prev => {
                        const next = new Set(prev);
                        next.has(dateStr) ? next.delete(dateStr) : next.add(dateStr);
                        return next;
                      });
                    }}
                    primaryColor={primaryColor}
                  />
                  {selectedDates.size > 0 && (
                    <Text style={[styles.selectedCount, { color: primaryColor }]}>
                      {selectedDates.size} day{selectedDates.size > 1 ? 's' : ''} selected
                    </Text>
                  )}
                </View>
              )}

              {/* Step 2: Time */}
              {step === 'time' && (
                <View style={{ gap: 16 }}>
                  <Text style={styles.stepTitle}>Set shift hours</Text>
                  <TimePicker
                    label="Start time"
                    hour={startHour} minute={startMinute} ampm={startAmpm}
                    onHourChange={setStartHour} onMinuteChange={setStartMinute} onAmpmChange={setStartAmpm}
                    primaryColor={primaryColor}
                  />
                  <TimePicker
                    label="End time"
                    hour={endHour} minute={endMinute} ampm={endAmpm}
                    onHourChange={setEndHour} onMinuteChange={setEndMinute} onAmpmChange={setEndAmpm}
                    primaryColor={primaryColor}
                  />
                  <View style={[styles.timeSummary, { borderColor: primaryColor + '40', backgroundColor: primaryColor + '10' }]}>
                    <Ionicons name="time-outline" size={16} color={primaryColor} />
                    <Text style={[styles.timeSummaryText, { color: primaryColor }]}>
                      {formatDisplayTime(startHour, startMinute)} – {formatDisplayTime(endHour, endMinute)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Step 3: Employee */}
              {step === 'employee' && (
                <View>
                  <Text style={styles.stepTitle}>Assign to employee</Text>
                  <Text style={styles.stepSubtitle}>Who is working this shift?</Text>
                  <View style={{ gap: 8, marginTop: 8 }}>
                    {employees.map(emp => (
                      <TouchableOpacity
                        key={emp.employeeId}
                        style={[styles.empRow, selectedEmployee?.employeeId === emp.employeeId && { borderColor: primaryColor, backgroundColor: primaryColor + '08' }]}
                        onPress={() => setSelectedEmployee(emp)}
                      >
                        <View style={[styles.avatar, { backgroundColor: selectedEmployee?.employeeId === emp.employeeId ? primaryColor : COLORS.border }]}>
                          <Text style={styles.avatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.empName}>{emp.firstName} {emp.lastName}</Text>
                          <Text style={styles.empEmail}>{emp.email}</Text>
                        </View>
                        {selectedEmployee?.employeeId === emp.employeeId && (
                          <Ionicons name="checkmark-circle" size={22} color={primaryColor} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Navigation buttons */}
            <View style={styles.modalFooter}>
              {step !== 'calendar' && (
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => setStep(step === 'employee' ? 'time' : 'calendar')}
                >
                  <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Back</Text>
                </TouchableOpacity>
              )}
              {step !== 'employee' ? (
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: primaryColor }, selectedDates.size === 0 && step === 'calendar' && { opacity: 0.4 }]}
                  onPress={() => setStep(step === 'calendar' ? 'time' : 'employee')}
                  disabled={selectedDates.size === 0 && step === 'calendar'}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Next</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: primaryColor }, (!selectedEmployee || saving) && { opacity: 0.4 }]}
                  onPress={handleCreate}
                  disabled={!selectedEmployee || saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700' }}>
                        Create {selectedDates.size > 1 ? `${selectedDates.size} Shifts` : 'Shift'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
  card: {
    backgroundColor: COLORS.white, borderRadius: 14, flexDirection: 'row',
    alignItems: 'center', overflow: 'hidden', paddingVertical: 14, paddingRight: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  colorBar: { width: 4, height: '100%' },
  shiftTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  shiftDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  shiftTime: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 5 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  fab: {
    position: 'absolute', bottom: 28, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  steps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepLine: { width: 40, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
  stepTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  stepSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  selectedCount: { textAlign: 'center', fontWeight: '600', marginTop: 8, fontSize: 14 },
  timeSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  timeSummaryText: { fontWeight: '600', fontSize: 15 },
  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  empEmail: { fontSize: 12, color: COLORS.textSecondary },
  modalFooter: { flexDirection: 'row', gap: 10, marginTop: 16 },
  backBtn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
});

const cal = StyleSheet.create({
  container: { marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dayNames: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  pastCell: { opacity: 0.35 },
  dayText: { fontSize: 14, color: COLORS.text },
});

const tp = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 120 },
  scroll: { flex: 1, backgroundColor: COLORS.background, borderRadius: 10 },
  colon: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  item: { paddingVertical: 8, alignItems: 'center' },
  itemText: { fontSize: 16, color: COLORS.text },
  ampmCol: { gap: 6, justifyContent: 'center' },
  ampmBtn: { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  ampmText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
});
