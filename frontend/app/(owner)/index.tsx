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
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee, Shift } from '@/types';
import { COLORS } from '@/constants';

// ─── Date helpers ────────────────────────────────────────────────────────────

const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  sunday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function isToday(d: Date) { return isSameDay(d, new Date()); }
function isPast(d: Date) {
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}

function fmt12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2,'0')} ${ampm}`;
}

function weekLabel(dates: Date[]) {
  const s = dates[0], e = dates[6];
  if (s.getMonth() === e.getMonth()) {
    return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`;
  }
  return `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
}

// ─── Time Picker helpers ─────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = [0, 15, 30, 45];

function to24(h: number, ampm: 'AM' | 'PM') {
  if (ampm === 'AM') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function fmtDisplay(h: number, m: number, ampm: 'AM' | 'PM') {
  return `${h}:${String(m).padStart(2,'0')} ${ampm}`;
}

// ─── Mini Calendar (create shift) ────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function MiniCalendar({ selectedDates, onToggle, primaryColor }: {
  selectedDates: Set<string>;
  onToggle: (k: string) => void;
  primaryColor: string;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const toKey = (d: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y+1)) : setMonth(m => m+1);

  return (
    <View>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}><Ionicons name="chevron-back" size={18} color={COLORS.text} /></TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}><Ionicons name="chevron-forward" size={18} color={COLORS.text} /></TouchableOpacity>
      </View>
      <View style={cal.dayNames}>
        {DAY_ABBR.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}
      </View>
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`e${i}`} style={cal.cell} />;
          const key = toKey(day);
          const selected = selectedDates.has(key);
          const past = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          return (
            <TouchableOpacity
              key={key}
              style={[cal.cell, selected && { backgroundColor: primaryColor, borderRadius: 20 }, past && { opacity: 0.3 }]}
              onPress={() => !past && onToggle(key)}
              disabled={past}
            >
              <Text style={[cal.dayText, selected && { color: '#fff', fontWeight: '700' }]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Time Picker ─────────────────────────────────────────────────────────────

function TimePicker({ label, hour, minute, ampm, onHour, onMinute, onAmpm, primaryColor }: {
  label: string; hour: number; minute: number; ampm: 'AM'|'PM';
  onHour: (h: number) => void; onMinute: (m: number) => void; onAmpm: (a: 'AM'|'PM') => void;
  primaryColor: string;
}) {
  return (
    <View style={tp.wrap}>
      <Text style={tp.label}>{label}</Text>
      <View style={tp.row}>
        <ScrollView style={tp.scroll} showsVerticalScrollIndicator={false}>
          {HOURS.map(h => (
            <TouchableOpacity key={h} style={[tp.item, hour===h && {backgroundColor: primaryColor, borderRadius: 8}]} onPress={() => onHour(h)}>
              <Text style={[tp.itemText, hour===h && {color:'#fff', fontWeight:'700'}]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={tp.colon}>:</Text>
        <ScrollView style={tp.scroll} showsVerticalScrollIndicator={false}>
          {MINUTES.map(m => (
            <TouchableOpacity key={m} style={[tp.item, minute===m && {backgroundColor: primaryColor, borderRadius: 8}]} onPress={() => onMinute(m)}>
              <Text style={[tp.itemText, minute===m && {color:'#fff', fontWeight:'700'}]}>{String(m).padStart(2,'0')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={tp.ampmCol}>
          {(['AM','PM'] as const).map(a => (
            <TouchableOpacity key={a} style={[tp.ampmBtn, ampm===a && {backgroundColor: primaryColor, borderRadius: 8}]} onPress={() => onAmpm(a)}>
              <Text style={[tp.ampmText, ampm===a && {color:'#fff', fontWeight:'700'}]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Weekly Calendar Dashboard ───────────────────────────────────────────────

function WeeklyCalendar({ weekOffset, onPrev, onNext, maxNext, shifts, employees, primaryColor }: {
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
  maxNext: boolean;
  shifts: Shift[];
  employees: Employee[];
  primaryColor: string;
}) {
  const dates = getWeekDates(weekOffset);

  const shiftsForDay = (date: Date) =>
    shifts.filter(s => isSameDay(new Date(s.startTime), date));

  const empById = (id?: string) =>
    id ? employees.find(e => e.userId === id || e.employeeId === id) : undefined;

  return (
    <View style={wk.container}>
      {/* Week navigation */}
      <View style={wk.nav}>
        <TouchableOpacity onPress={onPrev} style={wk.navBtn}>
          <Ionicons name="chevron-back" size={18} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={wk.weekLabel}>{weekLabel(dates)}</Text>
        <TouchableOpacity onPress={onNext} style={wk.navBtn} disabled={maxNext}>
          <Ionicons name="chevron-forward" size={18} color={maxNext ? COLORS.border : COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Day columns */}
      <View style={wk.grid}>
        {dates.map((date, i) => {
          const dayShifts = shiftsForDay(date);
          const today = isToday(date);
          const past = isPast(date);

          return (
            <View key={i} style={wk.dayCol}>
              {/* Day header */}
              <Text style={[wk.dayAbbr, past && { opacity: 0.4 }]}>{DAY_ABBR[i]}</Text>
              <View style={[wk.dayNumWrap, today && { backgroundColor: primaryColor }]}>
                <Text style={[wk.dayNum, today && { color: '#fff' }, past && { opacity: 0.4 }]}>
                  {date.getDate()}
                </Text>
              </View>

              {/* Shift dots */}
              <View style={wk.dotsCol}>
                {dayShifts.slice(0, 3).map(shift => {
                  const emp = empById(shift.employeeId);
                  return (
                    <View
                      key={shift.shiftId}
                      style={[wk.dot, { backgroundColor: past ? COLORS.border : primaryColor }]}
                    >
                      <Text style={wk.dotText}>
                        {emp ? `${emp.firstName[0]}${emp.lastName[0]}` : '?'}
                      </Text>
                    </View>
                  );
                })}
                {dayShifts.length > 3 && (
                  <Text style={[wk.moreDots, { color: primaryColor }]}>+{dayShifts.length - 3}</Text>
                )}
              </View>
            </View>
          );
        })}
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [step, setStep] = useState<'calendar'|'time'|'employee'>('calendar');

  // Form state
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [startHour, setStartHour] = useState(9);
  const [startMin, setStartMin] = useState(0);
  const [startAmpm, setStartAmpm] = useState<'AM'|'PM'>('AM');
  const [endHour, setEndHour] = useState(5);
  const [endMin, setEndMin] = useState(0);
  const [endAmpm, setEndAmpm] = useState<'AM'|'PM'>('PM');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
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

  // Reload every time this tab comes into focus — fixes stale employee list
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Shifts visible in current week view
  const weekDates = getWeekDates(weekOffset);
  const weekStart = weekDates[0];
  const weekEnd = new Date(weekDates[6]); weekEnd.setHours(23, 59, 59);
  const weekShifts = shifts.filter(s => {
    const d = new Date(s.startTime);
    return d >= weekStart && d <= weekEnd;
  });

  const empById = (id?: string) =>
    id ? employees.find(e => e.userId === id || e.employeeId === id) : undefined;

  const resetForm = () => {
    setSelectedDates(new Set());
    setStartHour(9); setStartMin(0); setStartAmpm('AM');
    setEndHour(5); setEndMin(0); setEndAmpm('PM');
    setSelectedEmp(null); setStep('calendar');
  };

  const openModal = () => {
    if (employees.length === 0) {
      Alert.alert('No Employees', 'Add employees in the Employees tab first.');
      return;
    }
    resetForm();
    setModalVisible(true);
  };

  const handleCreate = async () => {
    if (!selectedEmp) return;
    const s24 = to24(startHour, startAmpm);
    const e24 = to24(endHour, endAmpm);
    setSaving(true);
    try {
      await Promise.all(Array.from(selectedDates).map(dateStr =>
        api.createShift({
          businessId: business!.businessId,
          title: `${selectedEmp.firstName}'s Shift`,
          startTime: new Date(`${dateStr}T${String(s24).padStart(2,'0')}:${String(startMin).padStart(2,'0')}:00`).toISOString(),
          endTime:   new Date(`${dateStr}T${String(e24).padStart(2,'0')}:${String(endMin).padStart(2,'0')}:00`).toISOString(),
        }).then(shift =>
          api.assignShift(shift.shiftId, { employeeId: selectedEmp.userId || selectedEmp.employeeId, status: 'assigned' })
        )
      ));
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

  if (!business) {
    return <View style={styles.centered}><Text style={styles.emptyText}>Set up your business in Settings first.</Text></View>;
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={primaryColor} />
      ) : (
        <FlatList
          data={weekShifts}
          keyExtractor={item => item.shiftId}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              {/* Weekly calendar dashboard */}
              <WeeklyCalendar
                weekOffset={weekOffset}
                onPrev={() => setWeekOffset(o => o - 1)}
                onNext={() => setWeekOffset(o => o + 1)}
                maxNext={weekOffset >= 3}
                shifts={shifts}
                employees={employees}
                primaryColor={primaryColor}
              />

              {/* Week shift list header */}
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {weekShifts.length} shift{weekShifts.length !== 1 ? 's' : ''} this week
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWeek}>
              <Ionicons name="calendar-outline" size={36} color={COLORS.border} />
              <Text style={styles.emptyText}>No shifts this week</Text>
            </View>
          }
          renderItem={({ item }) => {
            const emp = empById(item.employeeId);
            return (
              <View style={styles.card}>
                <View style={[styles.colorBar, { backgroundColor: item.employeeId ? primaryColor : COLORS.border }]} />
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDate}>
                    {new Date(item.startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={styles.cardTime}>{fmt12(item.startTime)} – {fmt12(item.endTime)}</Text>
                  {emp && (
                    <View style={[styles.empBadge, { backgroundColor: primaryColor + '18' }]}>
                      <View style={[styles.empBadgeAvatar, { backgroundColor: primaryColor }]}>
                        <Text style={styles.empBadgeInitials}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                      </View>
                      <Text style={[styles.empBadgeName, { color: primaryColor }]}>{emp.firstName} {emp.lastName}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.shiftId)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: primaryColor }]} onPress={openModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Create Shift Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.sheetTitle}>New Shift</Text>
              <View style={{ width: 22 }} />
            </View>

            {/* Step dots */}
            <View style={styles.stepRow}>
              {(['calendar','time','employee'] as const).map((s, i) => {
                const done = (step === 'time' && i === 0) || (step === 'employee' && i <= 1);
                const active = step === s;
                return (
                  <View key={s} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.stepDot, (active || done) && { backgroundColor: primaryColor }]}>
                      {done
                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                        : <Text style={styles.stepDotText}>{i+1}</Text>}
                    </View>
                    {i < 2 && <View style={[styles.stepLine, done && { backgroundColor: primaryColor }]} />}
                  </View>
                );
              })}
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {step === 'calendar' && (
                <View style={{ gap: 6 }}>
                  <Text style={styles.stepTitle}>Select date(s)</Text>
                  <Text style={styles.stepSub}>Tap multiple days to batch-create shifts</Text>
                  <MiniCalendar
                    selectedDates={selectedDates}
                    onToggle={k => setSelectedDates(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; })}
                    primaryColor={primaryColor}
                  />
                  {selectedDates.size > 0 && (
                    <Text style={[styles.selectedCount, { color: primaryColor }]}>
                      {selectedDates.size} day{selectedDates.size > 1 ? 's' : ''} selected
                    </Text>
                  )}
                </View>
              )}

              {step === 'time' && (
                <View style={{ gap: 18 }}>
                  <Text style={styles.stepTitle}>Set shift hours</Text>
                  <TimePicker label="Start time"
                    hour={startHour} minute={startMin} ampm={startAmpm}
                    onHour={setStartHour} onMinute={setStartMin} onAmpm={setStartAmpm}
                    primaryColor={primaryColor} />
                  <TimePicker label="End time"
                    hour={endHour} minute={endMin} ampm={endAmpm}
                    onHour={setEndHour} onMinute={setEndMin} onAmpm={setEndAmpm}
                    primaryColor={primaryColor} />
                  <View style={[styles.timeSummary, { borderColor: primaryColor + '40', backgroundColor: primaryColor + '10' }]}>
                    <Ionicons name="time-outline" size={15} color={primaryColor} />
                    <Text style={[styles.timeSummaryText, { color: primaryColor }]}>
                      {fmtDisplay(startHour, startMin, startAmpm)} – {fmtDisplay(endHour, endMin, endAmpm)}
                    </Text>
                  </View>
                </View>
              )}

              {step === 'employee' && (
                <View style={{ gap: 8 }}>
                  <Text style={styles.stepTitle}>Assign to employee</Text>
                  <Text style={styles.stepSub}>Who is working this shift?</Text>
                  {employees.map(emp => (
                    <TouchableOpacity
                      key={emp.employeeId}
                      style={[styles.empRow, selectedEmp?.employeeId === emp.employeeId && { borderColor: primaryColor, backgroundColor: primaryColor + '08' }]}
                      onPress={() => setSelectedEmp(emp)}
                    >
                      <View style={[styles.avatar, { backgroundColor: selectedEmp?.employeeId === emp.employeeId ? primaryColor : COLORS.border }]}>
                        <Text style={styles.avatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.empName}>{emp.firstName} {emp.lastName}</Text>
                        <Text style={styles.empEmail}>{emp.email}</Text>
                      </View>
                      {selectedEmp?.employeeId === emp.employeeId && (
                        <Ionicons name="checkmark-circle" size={22} color={primaryColor} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              {step !== 'calendar' && (
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step === 'employee' ? 'time' : 'calendar')}>
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
                  <Ionicons name="arrow-forward" size={15} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: primaryColor }, (!selectedEmp || saving) && { opacity: 0.4 }]}
                  onPress={handleCreate}
                  disabled={!selectedEmp || saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="checkmark" size={15} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700' }}>
                          Create {selectedDates.size > 1 ? `${selectedDates.size} Shifts` : 'Shift'}
                        </Text>
                      </>}
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
  emptyText: { color: COLORS.textSecondary, fontSize: 15, marginTop: 8, textAlign: 'center' },
  emptyWeek: { alignItems: 'center', paddingTop: 30, gap: 8 },
  listHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  listHeaderText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: {
    backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10, borderRadius: 14, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  colorBar: { width: 4, height: '100%' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardDate: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  cardTime: { fontSize: 13, color: COLORS.text, marginTop: 1 },
  empBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 20, paddingRight: 8, paddingVertical: 2, marginTop: 5 },
  empBadgeAvatar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  empBadgeInitials: { color: '#fff', fontSize: 9, fontWeight: '800' },
  empBadgeName: { fontSize: 12, fontWeight: '600' },
  deleteBtn: { padding: 8 },
  fab: {
    position: 'absolute', bottom: 28, right: 24, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '93%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepLine: { width: 36, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
  stepTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  stepSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  selectedCount: { textAlign: 'center', fontWeight: '600', fontSize: 13, marginTop: 4 },
  timeSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 11 },
  timeSummaryText: { fontWeight: '600', fontSize: 14 },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  empEmail: { fontSize: 12, color: COLORS.textSecondary },
  footer: { flexDirection: 'row', gap: 10, marginTop: 16 },
  backBtn: { paddingVertical: 13, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: 12, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
});

const wk = StyleSheet.create({
  container: { backgroundColor: COLORS.white, marginBottom: 4, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingHorizontal: 4 },
  navBtn: { padding: 6 },
  weekLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  grid: { flexDirection: 'row' },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  dayAbbr: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  dayNumWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  dotsCol: { gap: 2, alignItems: 'center', minHeight: 60 },
  dot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  moreDots: { fontSize: 10, fontWeight: '700' },
});

const cal = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  navBtn: { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  dayNames: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, color: COLORS.text },
});

const tp = StyleSheet.create({
  wrap: { gap: 6 },
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
