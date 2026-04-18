import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, ScrollView, Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee, Shift, TimeLog } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_ABBR    = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTH_LONG  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MINUTES     = [0, 15, 30, 45];

function getWeekDates(offset: number, startDay = 0): Date[] {
  const today = new Date();
  const diff = (today.getDay() - startDay + 7) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - diff + offset * 7);
  weekStart.setHours(0,0,0,0);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function isToday(d: Date) { return isSameDay(d, new Date()); }
function isPastDay(d: Date) { const t = new Date(); t.setHours(0,0,0,0); return d < t; }
function fmt12(iso: string) {
  const d = new Date(iso); const h = d.getHours(), m = d.getMinutes();
  return `${h%12===0?12:h%12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function to24(h: number, ap: 'AM'|'PM') {
  if (ap==='AM') return h===12 ? 0 : h;
  return h===12 ? 12 : h+12;
}
function fmtDisplay(h: number, m: number, ap: 'AM'|'PM') {
  return `${h}:${String(m).padStart(2,'0')} ${ap}`;
}
function weekLabel(dates: Date[]) {
  const s=dates[0], e=dates[6];
  return s.getMonth()===e.getMonth()
    ? `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`
    : `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
}
function groupByDay(shifts: Shift[]) {
  const map = new Map<string, Shift[]>();
  for (const s of shifts) {
    const d = new Date(s.startTime);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([key, dayShifts]) => {
      const d = new Date(dayShifts[0].startTime);
      return {
        key,
        label: d.toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' }),
        shifts: dayShifts.sort((a,b) => new Date(a.startTime).getTime()-new Date(b.startTime).getTime()),
      };
    });
}

// ─── Pulsing live dot ─────────────────────────────────────────────────────────

function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.6, duration: 700, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,   duration: 700, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{
        position: 'absolute', width: 10, height: 10, borderRadius: 5,
        backgroundColor: color, opacity: 0.35, transform: [{ scale }],
      }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

// ─── Time Picker ──────────────────────────────────────────────────────────────

function TimePicker({ label, hour, minute, ampm, onHour, onMinute, onAmpm, color, dimmed }: {
  label: string; hour: number; minute: number; ampm: 'AM'|'PM';
  onHour:(h:number)=>void; onMinute:(m:number)=>void; onAmpm:(a:'AM'|'PM')=>void;
  color: string; dimmed?: boolean;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i+1);
  return (
    <View style={tp.wrap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
        <Text style={tp.label}>{label}</Text>
        {dimmed && (
          <View style={{ backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>Selecciona</Text>
          </View>
        )}
      </View>
      <View style={[tp.row, dimmed && { opacity: 0.45 }]}>
        <ScrollView style={tp.scroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
          {hours.map(h => (
            <TouchableOpacity key={h} style={[tp.item, !dimmed && hour===h && { backgroundColor: color, borderRadius: 8 }]} onPress={() => onHour(h)}>
              <Text style={[tp.itemText, !dimmed && hour===h && { color:'#fff', fontWeight:'700' }]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={tp.colon}>:</Text>
        <View style={tp.minCol}>
          {MINUTES.map(m => (
            <TouchableOpacity key={m} style={[tp.minItem, !dimmed && minute===m && { backgroundColor: color, borderRadius: 8 }]} onPress={() => onMinute(m)}>
              <Text style={[tp.itemText, !dimmed && minute===m && { color:'#fff', fontWeight:'700' }]}>{String(m).padStart(2,'0')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={tp.ampmCol}>
          {(['AM','PM'] as const).map(a => (
            <TouchableOpacity key={a} style={[tp.ampmBtn, !dimmed && ampm===a && { backgroundColor: color, borderRadius: 8 }]} onPress={() => onAmpm(a)}>
              <Text style={[tp.ampmText, !dimmed && ampm===a && { color:'#fff', fontWeight:'700' }]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ selected, onToggle, color, startDay = 0 }: {
  selected: Set<string>; onToggle:(k:string)=>void; color:string; startDay?: number;
}) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const dim   = new Date(year, month+1, 0).getDate();
  const first = (new Date(year, month, 1).getDay() - startDay + 7) % 7;
  const cells: (number|null)[] = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i+1)];
  const orderedDays = [...DAY_ABBR.slice(startDay), ...DAY_ABBR.slice(0, startDay)];
  const toKey = (d: number) => `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const prevM = () => month===0 ? (setMonth(11), setYear(y => y-1)) : setMonth(m => m-1);
  const nextM = () => month===11 ? (setMonth(0), setYear(y => y+1)) : setMonth(m => m+1);
  return (
    <View>
      <View style={cal.header}>
        <TouchableOpacity onPress={prevM} style={cal.navBtn}><Ionicons name="chevron-back" size={18} color="#374151"/></TouchableOpacity>
        <Text style={cal.month}>{MONTH_LONG[month]} {year}</Text>
        <TouchableOpacity onPress={nextM} style={cal.navBtn}><Ionicons name="chevron-forward" size={18} color="#374151"/></TouchableOpacity>
      </View>
      <View style={cal.dayRow}>{orderedDays.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}</View>
      {Array.from({ length: Math.ceil(cells.length / 7) }, (_, rowIdx) => {
        const row = cells.slice(rowIdx * 7, rowIdx * 7 + 7);
        while (row.length < 7) row.push(null);
        return (
          <View key={rowIdx} style={cal.row}>
            {row.map((day, i) => {
              if (!day) return <View key={`e${rowIdx}-${i}`} style={cal.cell}/>;
              const k    = toKey(day);
              const sel  = selected.has(k);
              const past = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              return (
                <TouchableOpacity key={k}
                  style={[cal.cell, sel && { backgroundColor: color, borderRadius: 20 }, past && { opacity: 0.25 }]}
                  onPress={() => !past && onToggle(k)} disabled={past}>
                  <Text style={[cal.dayText, sel && { color:'#fff', fontWeight:'700' }]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

// ─── Weekly Calendar strip ────────────────────────────────────────────────────

function WeeklyCalendar({ offset, shifts, employees, color, startDay = 0 }: {
  offset:number; shifts:Shift[]; employees:Employee[]; color:string; startDay?: number;
}) {
  const dates = getWeekDates(offset, startDay);
  const empById = (id?: string) => id ? employees.find(e => e.userId===id||e.employeeId===id) : undefined;
  const shiftsForDay = (d: Date) => shifts.filter(s => isSameDay(new Date(s.startTime), d));

  return (
    <View style={wk.container}>
      <View style={wk.grid}>
        {dates.map((date, i) => {
          const dayShifts = shiftsForDay(date);
          const today = isToday(date);
          const past  = isPastDay(date);
          return (
            <View key={i} style={[wk.col, past && { opacity: 0.38 }]}>
              <Text style={[wk.abbr, today && { color }]}>{DAY_ABBR[date.getDay()]}</Text>
              <View style={[wk.numWrap, today && { backgroundColor: color }]}>
                <Text style={[wk.num, today && { color: '#fff' }]}>{date.getDate()}</Text>
              </View>
              <View style={wk.dots}>
                {dayShifts.slice(0,3).map(s => {
                  const emp = empById(s.employeeId);
                  return (
                    <View key={s.shiftId} style={[wk.dot, { backgroundColor: past ? '#9CA3AF' : color }]}>
                      <Text style={wk.dotText}>{emp ? `${emp.firstName[0]}${emp.lastName[0]}` : '?'}</Text>
                    </View>
                  );
                })}
                {dayShifts.length > 3 && <Text style={[wk.more, { color }]}>+{dayShifts.length-3}</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ModalMode = 'create' | 'edit';

export default function ShiftsScreen() {
  const { business, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const color = primaryColor;

  const [shifts, setShifts]         = useState<Shift[]>([]);
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [activeLogs, setActiveLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const headerAnim   = useRef(new Animated.Value(0)).current;
  const flatListRef  = useRef<any>(null);
  const hasScrolled  = useRef(false);

  useEffect(() => {
    Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
  }, []);

  const [activeFilter, setActiveFilter] = useState<'all'|'clocked_in'|'today'|'late'>('all');

  const [modalMode, setModalMode]       = useState<ModalMode>('create');
  const [modalVisible, setModalVisible] = useState(false);
  const [editShift, setEditShift]       = useState<Shift|null>(null);
  const [step, setStep]                 = useState<'calendar'|'time'|'employee'>('calendar');

  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [startH, setStartH] = useState(9);  const [startM, setStartM] = useState(0);  const [startAp, setStartAp] = useState<'AM'|'PM'>('AM');
  const [endH,   setEndH]   = useState(5);  const [endM,   setEndM]   = useState(0);  const [endAp,   setEndAp]   = useState<'AM'|'PM'>('PM');
  const [startPicked, setStartPicked] = useState(false);
  const [endPicked,   setEndPicked]   = useState(false);
  const [selEmp, setSelEmp] = useState<Employee|null>(null);
  const [breakDuration, setBreakDuration] = useState(0);
  const [saving, setSaving] = useState(false);

  // Derived: if end time < start time the shift crosses midnight (overnight)
  const startMins   = to24(startH, startAp) * 60 + startM;
  const endMins     = to24(endH, endAp) * 60 + endM;
  const isOvernight = endMins <= startMins;
  const shiftDurH   = Math.round(((isOvernight ? endMins + 1440 : endMins) - startMins) / 60 * 10) / 10;

  // Conflict detection: returns conflicting shift if employee already has overlapping shift
  const checkConflict = (empId: string, newStartISO: string, newEndISO: string, excludeShiftId?: string): Shift | null => {
    const newStart = new Date(newStartISO).getTime();
    const newEnd   = new Date(newEndISO).getTime();
    return shifts.find(s => {
      if (s.shiftId === excludeShiftId) return false;
      if ((s.employeeId ?? '') !== empId) return false;
      const sStart = new Date(s.startTime).getTime();
      const sEnd   = new Date(s.endTime).getTime();
      return newStart < sEnd && sStart < newEnd;
    }) ?? null;
  };

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      const [s, e, active] = await Promise.all([
        api.getShifts(business.businessId),
        api.getEmployees(business.businessId),
        api.getActiveEmployees(business.businessId),
      ]);
      setShifts(s.sort((a,b) => new Date(a.startTime).getTime()-new Date(b.startTime).getTime()));
      setEmployees(e);
      setActiveLogs(active);
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }, [business?.businessId]);

  useFocusEffect(useCallback(() => {
    hasScrolled.current = false;
    load();
  }, [load]));

  // Week strip uses the selected week offset (for the calendar header)
  const weekDates  = getWeekDates(weekOffset, business?.payPeriodStartDay ?? 0);
  const weekStart  = weekDates[0];
  const weekEnd    = new Date(weekDates[6]); weekEnd.setHours(23,59,59);
  const weekShifts = shifts.filter(s => { const d=new Date(s.startTime); return d>=weekStart && d<=weekEnd; });

  const empById = (id?: string) => id ? employees.find(e => e.userId===id||e.employeeId===id) : undefined;

  // Quick filter counts (always based on today's data regardless of week offset)
  const todayShifts = shifts.filter(s => isSameDay(new Date(s.startTime), new Date()));
  const clockedInCount = activeLogs.filter(l => l.status === 'clocked_in' || l.status === 'on_break').length;
  const scheduledTodayCount = todayShifts.length;
  const lateShifts = todayShifts.filter(s => {
    const started = new Date(s.startTime) < new Date();
    const hasLog  = activeLogs.some(l => l.shiftId === s.shiftId && (l.status === 'clocked_in' || l.status === 'on_break'));
    const hasClockedOut = activeLogs.some(l => l.shiftId === s.shiftId && l.status === 'clocked_out');
    return started && !hasLog && !hasClockedOut;
  });
  const lateCount = lateShifts.length;

  // Apply active filter to shift list
  const filteredShifts = (() => {
    if (activeFilter === 'clocked_in') {
      const activeShiftIds = new Set(activeLogs.filter(l => l.status === 'clocked_in' || l.status === 'on_break').map(l => l.shiftId));
      return weekShifts.filter(s => activeShiftIds.has(s.shiftId));
    }
    if (activeFilter === 'today') return todayShifts;
    if (activeFilter === 'late') return lateShifts;
    return weekShifts;
  })();

  // The flat list shows only the selected week's shifts (filtered)
  const allGrouped = groupByDay(filteredShifts);

  // Approximate item heights for scroll-to-today calculation
  const HEADER_H = 54;  // day header pill row
  const CARD_H   = 90;  // shift card + marginBottom

  const openCreate = () => {
    if (employees.length===0) { Alert.alert('Sin Empleados','Agrega empleados primero.'); return; }
    setModalMode('create');
    setSelectedDates(new Set()); setStartH(9); setStartM(0); setStartAp('AM');
    setEndH(5); setEndM(0); setEndAp('PM');
    setStartPicked(false); setEndPicked(false);
    setSelEmp(null); setBreakDuration(0); setStep('calendar');
    setModalVisible(true);
  };

  const openEdit = (shift: Shift) => {
    const d   = new Date(shift.startTime);
    const h   = d.getHours(), m = d.getMinutes();
    const ap: 'AM'|'PM' = h>=12?'PM':'AM'; const h12 = h%12===0?12:h%12;
    const ed  = new Date(shift.endTime);
    const eh  = ed.getHours(), em = ed.getMinutes();
    const eap: 'AM'|'PM' = eh>=12?'PM':'AM'; const eh12 = eh%12===0?12:eh%12;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    setModalMode('edit'); setEditShift(shift);
    setSelectedDates(new Set([dateStr]));
    setStartH(h12); setStartM(m); setStartAp(ap);
    setEndH(eh12); setEndM(em); setEndAp(eap);
    setSelEmp(empById(shift.employeeId) ?? null);
    setBreakDuration(shift.breakDuration ?? 0);
    setStep('time');
    setModalVisible(true);
  };

  const buildEndISO = (dateStr: string, s24: number, e24: number) => {
    const endDate = new Date(`${dateStr}T${String(e24).padStart(2,'0')}:${String(endM).padStart(2,'0')}:00`);
    if (isOvernight) endDate.setDate(endDate.getDate() + 1); // crosses midnight
    return endDate.toISOString();
  };

  const handleCreate = async () => {
    if (!selEmp) return;
    if (shiftDurH > 16) {
      Alert.alert('Turno muy largo', `Este turno dura ${shiftDurH} horas. ¿Estás seguro?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Crear de todas formas', onPress: () => doCreate() },
      ]);
      return;
    }
    doCreate();
  };

  const doCreate = async () => {
    if (!selEmp) return;
    const s24 = to24(startH, startAp), e24 = to24(endH, endAp);
    const empId = selEmp.userId || selEmp.employeeId;

    // Check for conflicts across all selected dates
    const conflictingDates: string[] = [];
    for (const dateStr of Array.from(selectedDates)) {
      const startISO = new Date(`${dateStr}T${String(s24).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`).toISOString();
      const endISO   = buildEndISO(dateStr, s24, e24);
      if (checkConflict(empId, startISO, endISO)) conflictingDates.push(dateStr);
    }

    if (conflictingDates.length > 0) {
      const names = conflictingDates.map(d => {
        const dt = new Date(d + 'T12:00:00');
        return dt.toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' });
      }).join(', ');
      const conflictShift = checkConflict(
        empId,
        new Date(`${conflictingDates[0]}T${String(s24).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`).toISOString(),
        buildEndISO(conflictingDates[0], s24, e24),
      )!;
      Alert.alert(
        'Conflicto de horario',
        `${selEmp.firstName} ya tiene un turno de ${fmt12(conflictShift.startTime)} a ${fmt12(conflictShift.endTime)} que se superpone con el nuevo turno en: ${names}.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Crear de todas formas', onPress: () => doCreateForced() },
        ]
      );
      return;
    }

    doCreateForced();
  };

  const doCreateForced = async () => {
    if (!selEmp) return;
    const s24 = to24(startH, startAp), e24 = to24(endH, endAp);
    setSaving(true);
    try {
      await Promise.all(Array.from(selectedDates).map(dateStr => {
        const startISO     = new Date(`${dateStr}T${String(s24).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`).toISOString();
        const endISO       = buildEndISO(dateStr, s24, e24);
        const breakTimeISO = breakDuration > 0
          ? new Date((new Date(startISO).getTime() + new Date(endISO).getTime()) / 2).toISOString()
          : undefined;
        return api.createShift({
          businessId: business!.businessId,
          title: `${selEmp.firstName}'s Shift`,
          startTime: startISO, endTime: endISO,
          breakDuration, breakTime: breakTimeISO,
        }).then(shift => api.assignShift(shift.shiftId, { employeeId: selEmp.userId||selEmp.employeeId, status: 'assigned' }));
      }));
      setModalVisible(false); await load();
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    if (!editShift) return;
    const dateStr  = Array.from(selectedDates)[0];
    const s24 = to24(startH, startAp), e24 = to24(endH, endAp);
    const newStart = new Date(`${dateStr}T${String(s24).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`).toISOString();
    const newEnd   = buildEndISO(dateStr, s24, e24);
    const empId    = selEmp ? (selEmp.userId || selEmp.employeeId) : (editShift.employeeId ?? '');

    // Check for schedule conflict (exclude the shift being edited)
    const conflict = checkConflict(empId, newStart, newEnd, editShift.shiftId);
    if (conflict) {
      const empName = selEmp ? `${selEmp.firstName} ${selEmp.lastName}` : 'Este empleado';
      Alert.alert(
        'Conflicto de horario',
        `${empName} ya tiene un turno de ${fmt12(conflict.startTime)} a ${fmt12(conflict.endTime)} que se superpone con los cambios.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar de todas formas', onPress: () => doSaveEdit(newStart, newEnd, empId) },
        ]
      );
      return;
    }
    doSaveEdit(newStart, newEnd, empId);
  };

  const doSaveEdit = async (newStart: string, newEnd: string, empId: string) => {
    if (!editShift) return;
    setSaving(true);
    try {
      const breakTimeISO = breakDuration > 0
        ? new Date((new Date(newStart).getTime() + new Date(newEnd).getTime()) / 2).toISOString()
        : undefined;
      await api.assignShift(editShift.shiftId, {
        employeeId: empId, status: empId ? 'assigned' : 'open',
        startTime: newStart, endTime: newEnd, breakDuration, breakTime: breakTimeISO,
      });
      setModalVisible(false); await load();
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = (shiftId: string) => {
    Alert.alert('Eliminar Turno','¿Estás seguro?',[
      { text:'Cancelar', style:'cancel' },
      { text:'Eliminar', style:'destructive', onPress: async () => { await api.deleteShift(shiftId); load(); }},
    ]);
  };

  if (!business) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center', paddingHorizontal:24 }}>
        <AnimatedBackground primaryColor={color} />
        <Text style={{ fontSize:15, color:'#374151', textAlign:'center' }}>Configura tu negocio en Ajustes primero.</Text>
      </View>
    );
  }

  type ListItem =
    | { type:'header'; label:string; key:string; past:boolean }
    | { type:'shift';  shift:Shift;  key:string; past:boolean };
  const listItems: ListItem[] = [];
  for (const group of allGrouped) {
    const [gy, gm, gd] = group.key.split('-').map(Number);
    const groupPast = isPastDay(new Date(gy, gm, gd));
    listItems.push({ type:'header', label:group.label, key:`h-${group.key}`, past:groupPast });
    for (const shift of group.shifts) {
      listItems.push({ type:'shift', shift, key:shift.shiftId, past:groupPast });
    }
  }

  // Find the index of today's header (or first future day) and compute scroll offset
  const todayOrNextIdx = listItems.findIndex(item => {
    if (item.type !== 'header') return false;
    const keyPart = item.key.replace('h-', '');
    const [gy, gm, gd] = keyPart.split('-').map(Number);
    const d = new Date(gy, gm, gd);
    return isToday(d) || !isPastDay(d);
  });
  const itemsOffset = listItems
    .slice(0, Math.max(0, todayOrNextIdx))
    .reduce((sum, item) => sum + (item.type === 'header' ? HEADER_H : CARD_H), 0);

  const scrollToToday = useCallback(() => {
    setTimeout(() => {
      if (itemsOffset > 0) {
        flatListRef.current?.scrollToOffset({ offset: itemsOffset, animated: true });
      } else {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }
    }, 80);
  }, [itemsOffset]);

  // Scroll to top when week changes to another week; scroll to today when returning to current week
  useEffect(() => {
    if (weekOffset === 0) {
      scrollToToday();
    } else {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [weekOffset]);

  // Scroll to today on initial load
  useEffect(() => {
    if (!loading && listItems.length > 0 && !hasScrolled.current) {
      hasScrolled.current = true;
      scrollToToday();
    }
  }, [loading, listItems.length]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {/* Animated background */}
      <AnimatedBackground primaryColor={color} />

      {/* Fixed header: greeting + calendar */}
      <Animated.View style={[s.fixedHeader, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange:[0,1], outputRange:[-16,0] }) }],
      }]}>
        {/* Greeting */}
        <View style={[s.greetSection, { paddingTop: insets.top + 12 }]}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>
              {new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'}
            </Text>
            {business && <Text style={s.bizName}>{business.name}</Text>}
          </View>
          {activeLogs.filter(l => l.status === 'clocked_in' || l.status === 'on_break').length > 0 && (
            <View style={[s.activePill, { backgroundColor: color + '15' }]}>
              <View style={[s.activeDot, { backgroundColor: color }]} />
              <Text style={[s.activeCount, { color }]}>
                {activeLogs.filter(l => l.status === 'clocked_in' || l.status === 'on_break').length} en turno
              </Text>
            </View>
          )}
        </View>

        {/* Quick filters */}
        <View style={s.filterRow}>
          {([
            { key: 'clocked_in', label: 'Activos', count: clockedInCount, icon: 'pulse-outline', activeColor: '#10B981' },
            { key: 'today',      label: 'Hoy',     count: scheduledTodayCount, icon: 'today-outline',  activeColor: color },
            { key: 'late',       label: 'Tarde',   count: lateCount,       icon: 'alert-circle-outline', activeColor: '#EF4444' },
          ] as const).map(f => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[s.filterChip, isActive && { backgroundColor: f.activeColor }]}
                onPress={() => setActiveFilter(isActive ? 'all' : f.key)}
              >
                <Ionicons name={f.icon} size={13} color={isActive ? '#fff' : '#6B7280'} />
                <Text style={[s.filterChipText, isActive && { color: '#fff' }]}>{f.label}</Text>
                <View style={[s.filterBadge, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                  <Text style={[s.filterBadgeText, isActive && { color: '#fff' }]}>{f.count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Weekly calendar */}
        <View style={s.calendarSection}>
          <View style={s.calSectionHeader}>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => o - 1)}
              style={[s.calNavBtn, weekOffset <= -(business?.schedulingWeeks ?? 6) && { opacity: 0.3 }]}
              disabled={weekOffset <= -(business?.schedulingWeeks ?? 6)}
            >
              <Ionicons name="chevron-back" size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={s.calSectionTitle}>{weekLabel(weekDates)}</Text>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => o + 1)}
              style={[s.calNavBtn, weekOffset >= (business?.schedulingWeeks ?? 6) && { opacity: 0.3 }]}
              disabled={weekOffset >= (business?.schedulingWeeks ?? 6)}
            >
              <Ionicons name="chevron-forward" size={18} color="#374151" />
            </TouchableOpacity>
          </View>
          <WeeklyCalendar
            offset={weekOffset}
            shifts={shifts} employees={employees} color={color}
            startDay={business?.payPeriodStartDay ?? 0}
          />
        </View>

        <View style={s.listHeader}>
          <Text style={s.listHeaderText}>
            {weekShifts.length} turno{weekShifts.length!==1?'s':''}{weekOffset === 0 ? ' esta semana' : ' esa semana'}
          </Text>
          {weekOffset === 0 ? (
            <View style={[s.currentWeekBadge, { backgroundColor: color }]}>
              <View style={[s.currentWeekDot, { backgroundColor: '#fff' }]} />
              <Text style={s.currentWeekText}>Semana actual</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setWeekOffset(0)} style={[s.backTodayBtn, { borderColor: color }]}>
              <Ionicons name="return-up-back-outline" size={13} color={color} />
              <Text style={[s.backTodayText, { color }]}>Volver a hoy</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator color={color} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={item => item.key}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWeek}>
              <Ionicons name="calendar-outline" size={36} color="#D1D5DB"/>
              <Text style={s.emptyText}>Sin turnos programados aún</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={s.dayHeader}>
                  <View style={[s.dayHeaderPill,
                    item.past
                      ? { backgroundColor: 'rgba(0,0,0,0.05)' }
                      : { backgroundColor: 'rgba(0,0,0,0.07)' }
                  ]}>
                    <Text style={[s.dayHeaderText,
                      item.past ? { color: '#9CA3AF' } : { color: '#374151' }
                    ]}>{item.label}</Text>
                  </View>
                </View>
              );
            }
            const shift    = item.shift;
            const emp      = empById(shift.employeeId);
            const todayStr = toDateStr(new Date());
            const liveLog  = activeLogs.find(
              l => l.shiftId === shift.shiftId &&
                   (l.status === 'clocked_in' || l.status === 'on_break') &&
                   l.date === todayStr
            );
            const liveColor = liveLog?.status === 'on_break' ? '#D97706' : '#10B981';
            const durMs  = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
            const durH   = Math.round(durMs / 360000) / 10;
            return (
              <View style={[
                s.card,
                item.past && { opacity: 0.45 },
                liveLog && { borderColor: liveColor, borderWidth: 1.5 },
              ]}>
                <View style={[s.colorBar, { backgroundColor: liveLog ? liveColor : color }]} />
                <View style={{ flex:1, paddingLeft: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.cardTime}>{fmt12(shift.startTime)} – {fmt12(shift.endTime)}</Text>
                    <View style={[s.durPill, { backgroundColor: color + '15' }]}>
                      <Text style={[s.durPillText, { color }]}>{durH}h</Text>
                    </View>
                  </View>
                  <View style={s.cardMeta}>
                    {emp && (
                      <TouchableOpacity
                        style={[s.empBadge, { backgroundColor: color + '15' }]}
                        onPress={() => router.push({ pathname: '/(owner)/timeclock', params: { expandEmp: emp.userId || emp.employeeId } })}
                      >
                        <View style={[s.empBadgeAvatar, { backgroundColor: color }]}>
                          <Text style={s.empBadgeInitials}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                        </View>
                        <Text style={[s.empBadgeName, { color }]}>{emp.firstName} {emp.lastName}</Text>
                        <Ionicons name="bar-chart-outline" size={11} color={color} />
                      </TouchableOpacity>
                    )}
                    {(shift.breakDuration ?? 0) > 0 && (
                      <View style={s.breakPill}>
                        <Ionicons name="cafe-outline" size={11} color="#9CA3AF"/>
                        <Text style={s.breakPillText}>
                          {(shift.breakDuration ?? 0) >= 60
                            ? `${(shift.breakDuration ?? 0) / 60}h descanso`
                            : `${shift.breakDuration}m descanso`}
                        </Text>
                      </View>
                    )}
                    {liveLog && (
                      <View style={[s.liveBadge, { backgroundColor: liveLog.status === 'on_break' ? '#FEF3C7' : '#D1FAE5' }]}>
                        <PulseDot color={liveColor} />
                        <Text style={[s.liveBadgeText, { color: liveLog.status === 'on_break' ? '#92400E' : '#065F46' }]}>
                          {liveLog.status === 'on_break' ? 'En Descanso' : 'Activo'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={s.cardActions}>
                  <TouchableOpacity onPress={() => openEdit(shift)} style={s.iconBtn}>
                    <Ionicons name="pencil-outline" size={17} color={color}/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(shift.shiftId)} style={s.iconBtn}>
                    <Ionicons name="trash-outline" size={17} color="#EF4444"/>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[s.fab, { backgroundColor: color }]} onPress={openCreate}>
        <Ionicons name="add" size={28} color="#fff"/>
      </TouchableOpacity>

      {/* ── Shift Modal ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={s.sheetClose}>
                <Ionicons name="close" size={20} color="#374151"/>
              </TouchableOpacity>
              <Text style={s.sheetTitle}>{modalMode==='edit' ? 'Editar Turno' : 'Nuevo Turno'}</Text>
              <View style={{ width: 32 }}/>
            </View>

            {modalMode === 'create' && (
              <View style={s.stepRow}>
                {(['calendar','time','employee'] as const).map((st, i) => {
                  const done   = (step==='time' && i===0) || (step==='employee' && i<=1);
                  const active = step === st;
                  return (
                    <View key={st} style={{ flexDirection:'row', alignItems:'center' }}>
                      <View style={[s.stepDot, (active||done) && { backgroundColor: color }]}>
                        {done
                          ? <Ionicons name="checkmark" size={12} color="#fff"/>
                          : <Text style={s.stepDotText}>{i+1}</Text>
                        }
                      </View>
                      {i < 2 && <View style={[s.stepLine, done && { backgroundColor: color }]}/>}
                    </View>
                  );
                })}
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
              {step==='calendar' && modalMode==='create' && (
                <View style={{ gap: 6 }}>
                  <Text style={s.stepTitle}>Selecciona fecha(s)</Text>
                  <Text style={s.stepSub}>Toca varios días para crear turnos en lote</Text>
                  <MiniCalendar
                    selected={selectedDates}
                    onToggle={k => setSelectedDates(prev => { const n=new Set(prev); n.has(k)?n.delete(k):n.add(k); return n; })}
                    color={color} startDay={business?.payPeriodStartDay ?? 0}
                  />
                  {selectedDates.size > 0 && (
                    <Text style={[s.selCount, { color }]}>{selectedDates.size} día{selectedDates.size>1?'s':''} seleccionado{selectedDates.size>1?'s':''}</Text>
                  )}
                </View>
              )}

              {step==='time' && (
                <View style={{ gap: 16 }}>
                  <Text style={s.stepTitle}>Horas del turno</Text>
                  <TimePicker label="Hora inicio" hour={startH} minute={startM} ampm={startAp}
                    onHour={h => { setStartH(h); setStartPicked(true); }}
                    onMinute={m => { setStartM(m); setStartPicked(true); }}
                    onAmpm={a => { setStartAp(a); setStartPicked(true); }}
                    color={color} dimmed={modalMode === 'create' && !startPicked}/>
                  <TimePicker label="Hora fin" hour={endH} minute={endM} ampm={endAp}
                    onHour={h => { setEndH(h); setEndPicked(true); }}
                    onMinute={m => { setEndM(m); setEndPicked(true); }}
                    onAmpm={a => { setEndAp(a); setEndPicked(true); }}
                    color={color} dimmed={modalMode === 'create' && !endPicked}/>
                  <View style={[s.timeSummary, { borderColor: color+'40', backgroundColor: color+'10' }]}>
                    <Ionicons name="time-outline" size={15} color={color}/>
                    {(modalMode === 'create' && (!startPicked || !endPicked)) ? (
                      <Text style={[s.timeSummaryText, { color: '#9CA3AF' }]}>
                        {startPicked ? fmtDisplay(startH, startM, startAp) : '– : –'}
                        {'  →  '}
                        {endPicked   ? fmtDisplay(endH,   endM,   endAp)   : '– : –'}
                      </Text>
                    ) : (
                      <Text style={[s.timeSummaryText, { color }]}>
                        {fmtDisplay(startH, startM, startAp)} – {fmtDisplay(endH, endM, endAp)}
                        {isOvernight ? '  (+1 día)' : `  · ${shiftDurH}h`}
                      </Text>
                    )}
                  </View>
                  {isOvernight && (
                    <View style={s.overnightBadge}>
                      <Ionicons name="moon-outline" size={13} color="#6366F1"/>
                      <Text style={s.overnightText}>Turno nocturno — termina el día siguiente</Text>
                    </View>
                  )}
                  <View style={{ gap: 8 }}>
                    <Text style={s.stepTitle}>Descanso / Almuerzo</Text>
                    <View style={{ flexDirection:'row', gap:6 }}>
                      {[0,15,30,45,60].map(min => (
                        <TouchableOpacity key={min}
                          style={[s.breakChip, breakDuration===min && { backgroundColor: color, borderColor: color }]}
                          onPress={() => setBreakDuration(min)}>
                          <Text style={[s.breakChipText, breakDuration===min && { color:'#fff' }]}>
                            {min===0?'Ninguno':min===60?'1 hr':`${min}m`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {breakDuration > 0 && (
                      <View style={s.breakHint}>
                        <Ionicons name="cafe-outline" size={13} color="#9CA3AF"/>
                        <Text style={s.breakHintText}>
                          Descanso sugerido alrededor de {(() => {
                            const s24 = to24(startH, startAp), e24 = to24(endH, endAp);
                            const midH24 = Math.floor((s24+e24)/2);
                            const midAp: 'AM'|'PM' = midH24>=12?'PM':'AM';
                            const midH12 = midH24%12===0?12:midH24%12;
                            return `${midH12}:00 ${midAp}`;
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {step==='employee' && (
                <View style={{ gap: 8 }}>
                  <Text style={s.stepTitle}>Asignar a empleado</Text>
                  {employees.map(emp => (
                    <TouchableOpacity key={emp.employeeId}
                      style={[s.empRow, selEmp?.employeeId===emp.employeeId && { borderColor: color, backgroundColor: color+'08' }]}
                      onPress={() => setSelEmp(emp)}>
                      <View style={[s.avatar, { backgroundColor: selEmp?.employeeId===emp.employeeId ? color : '#E5E7EB' }]}>
                        <Text style={s.avatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.empName}>{emp.firstName} {emp.lastName}</Text>
                        <Text style={s.empEmail}>{emp.email}</Text>
                      </View>
                      {selEmp?.employeeId===emp.employeeId && <Ionicons name="checkmark-circle" size={22} color={color}/>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={s.footer}>
              {modalMode==='create' && step!=='calendar' && (
                <TouchableOpacity style={s.backBtn} onPress={() => setStep(step==='employee'?'time':'calendar')}>
                  <Text style={{ color:'#6B7280', fontWeight:'600' }}>Atrás</Text>
                </TouchableOpacity>
              )}
              {modalMode==='edit' ? (
                <TouchableOpacity style={[s.nextBtn, { backgroundColor: color }, saving && { opacity:0.4 }]}
                  onPress={handleSaveEdit} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff"/>
                    : <><Ionicons name="checkmark" size={15} color="#fff"/><Text style={{ color:'#fff', fontWeight:'700' }}>Guardar Cambios</Text></>
                  }
                </TouchableOpacity>
              ) : step!=='employee' ? (
                <TouchableOpacity
                  style={[s.nextBtn, { backgroundColor: color },
                    (selectedDates.size===0 && step==='calendar') && { opacity:0.4 },
                    (step==='time' && modalMode==='create' && (!startPicked || !endPicked)) && { opacity:0.4 },
                  ]}
                  onPress={() => setStep(step==='calendar'?'time':'employee')}
                  disabled={(selectedDates.size===0 && step==='calendar') || (step==='time' && modalMode==='create' && (!startPicked || !endPicked))}>
                  <Text style={{ color:'#fff', fontWeight:'700' }}>Siguiente</Text>
                  <Ionicons name="arrow-forward" size={15} color="#fff"/>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[s.nextBtn, { backgroundColor: color }, (!selEmp||saving) && { opacity:0.4 }]}
                  onPress={handleCreate} disabled={!selEmp||saving}>
                  {saving
                    ? <ActivityIndicator color="#fff"/>
                    : <><Ionicons name="checkmark" size={15} color="#fff"/>
                       <Text style={{ color:'#fff', fontWeight:'700' }}>Crear {selectedDates.size>1?`${selectedDates.size} Turnos`:'Turno'}</Text></>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  emptyText: { color:'#6B7280', fontSize:15, marginTop:8, textAlign:'center' },
  emptyWeek: { alignItems:'center', paddingTop:40, gap:8 },

  fixedHeader: {
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  greetSection: {
    flexDirection:'row', alignItems:'center',
    paddingHorizontal:20, paddingBottom:16,
  },
  greeting: { fontSize:28, fontWeight:'800', color:'#111827', letterSpacing:-0.5 },
  bizName:  { fontSize:14, color:'#6B7280', marginTop:2 },
  activePill: {
    flexDirection:'row', alignItems:'center', gap:6,
    borderRadius:20, paddingHorizontal:12, paddingVertical:7,
    marginLeft:12, backgroundColor:'rgba(0,0,0,0.05)',
    borderWidth:1, borderColor:'rgba(0,0,0,0.08)',
  },
  activeDot: { width:7, height:7, borderRadius:4 },
  activeCount: { fontSize:13, fontWeight:'700' },

  calendarSection: { paddingHorizontal: 20, marginTop: 8, marginBottom: 4 },
  calSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calSectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  calNavBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.80)',
    borderWidth: 1, borderColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },

  listHeader: { paddingHorizontal:20, paddingTop:12, paddingBottom:6, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  listHeaderText: { fontSize:12, fontWeight:'700', color:'#6B7280', textTransform:'uppercase', letterSpacing:0.6 },
  currentWeekBadge: { flexDirection:'row', alignItems:'center', gap:5, borderRadius:20, paddingHorizontal:12, paddingVertical:6 },
  currentWeekDot: { width:6, height:6, borderRadius:3 },
  currentWeekText: { fontSize:11, fontWeight:'800', color:'#fff', letterSpacing:0.3 },
  backTodayBtn: { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:10, paddingVertical:6, borderRadius:20, backgroundColor:'rgba(255,255,255,0.90)', borderWidth:1.5 },
  backTodayText: { fontSize:11, fontWeight:'700' },

  dayHeader: { paddingHorizontal:16, paddingTop:18, paddingBottom:6 },
  dayHeaderPill: { alignSelf:'flex-start', borderRadius:20, paddingHorizontal:12, paddingVertical:5 },
  dayHeaderText: { fontSize:12, fontWeight:'700', textTransform:'uppercase', letterSpacing:0.5 },

  card: {
    backgroundColor: '#fff',
    flexDirection:'row', alignItems:'center',
    marginHorizontal:16, marginBottom:8, borderRadius:16, overflow:'hidden',
    paddingVertical:14, paddingRight:8,
    borderWidth:1, borderColor:'rgba(0,0,0,0.06)',
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:4 }, elevation:3,
  },
  colorBar: { width:5, alignSelf:'stretch' },
  cardTime: { fontSize:16, fontWeight:'800', color:'#111827', letterSpacing:-0.3 },
  cardMeta: { flexDirection:'row', alignItems:'center', flexWrap:'wrap', gap:6 },
  empBadge: { flexDirection:'row', alignItems:'center', gap:5, alignSelf:'flex-start', borderRadius:20, paddingRight:8, paddingVertical:2, marginTop:4 },
  empBadgeAvatar: { width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center' },
  empBadgeInitials: { color:'#fff', fontSize:9, fontWeight:'800' },
  empBadgeName: { fontSize:12, fontWeight:'600' },
  cardActions: { flexDirection:'column', gap:4, paddingRight:4 },
  iconBtn: { padding:7 },
  durPill: { borderRadius:10, paddingHorizontal:7, paddingVertical:2 },
  durPillText: { fontSize:12, fontWeight:'700' },
  breakPill: { flexDirection:'row', alignItems:'center', gap:3, backgroundColor:'#F9FAFB', borderRadius:20, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:'#F3F4F6' },
  breakPillText: { fontSize:11, fontWeight:'600', color:'#6B7280' },
  liveBadge: { flexDirection:'row', alignItems:'center', gap:4, borderRadius:20, paddingHorizontal:8, paddingVertical:3 },
  liveBadgeText: { fontSize:11, fontWeight:'700' },

  fab: {
    position:'absolute', bottom:28, right:24,
    width:56, height:56, borderRadius:28,
    alignItems:'center', justifyContent:'center',
    shadowColor:'#000', shadowOpacity:0.2, shadowRadius:12,
    shadowOffset:{ width:0, height:5 }, elevation:8,
  },

  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheet: {
    backgroundColor:'#FFFFFF', borderTopLeftRadius:28, borderTopRightRadius:28,
    padding:22, paddingBottom:36, maxHeight:'93%',
    shadowColor:'#000', shadowOpacity:0.12, shadowRadius:24, shadowOffset:{ width:0, height:-8 },
  },
  sheetHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:18 },
  sheetClose: {
    width:32, height:32, borderRadius:10,
    backgroundColor:'#F9FAFB', borderWidth:1, borderColor:'#F3F4F6',
    alignItems:'center', justifyContent:'center',
  },
  sheetTitle: { fontSize:17, fontWeight:'700', color:'#111827' },

  stepRow: { flexDirection:'row', alignItems:'center', justifyContent:'center', marginBottom:18 },
  stepDot: { width:26, height:26, borderRadius:13, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center' },
  stepDotText: { color:'#fff', fontSize:12, fontWeight:'700' },
  stepLine: { width:36, height:2, backgroundColor:'#E5E7EB', marginHorizontal:4 },

  stepTitle: { fontSize:16, fontWeight:'700', color:'#111827', marginBottom:2 },
  stepSub:   { fontSize:13, color:'#6B7280', marginBottom:8 },
  selCount:  { textAlign:'center', fontWeight:'600', fontSize:13, marginTop:4 },

  timeSummary: { flexDirection:'row', alignItems:'center', gap:8, borderWidth:1, borderRadius:12, padding:12 },
  timeSummaryText: { fontWeight:'600', fontSize:14 },

  empRow: {
    flexDirection:'row', alignItems:'center', gap:12,
    padding:12, borderRadius:14, borderWidth:1.5, borderColor:'#F3F4F6',
    backgroundColor:'#FAFAFA',
  },
  avatar: { width:40, height:40, borderRadius:20, alignItems:'center', justifyContent:'center' },
  avatarText: { color:'#fff', fontWeight:'700', fontSize:14 },
  empName:  { fontSize:15, fontWeight:'600', color:'#111827' },
  empEmail: { fontSize:12, color:'#9CA3AF' },

  footer: { flexDirection:'row', gap:10, marginTop:18 },
  backBtn: {
    paddingVertical:13, paddingHorizontal:20, borderRadius:14,
    borderWidth:1, borderColor:'#F3F4F6',
    alignItems:'center', justifyContent:'center',
  },
  nextBtn: {
    flex:1, flexDirection:'row', gap:6, borderRadius:14,
    paddingVertical:14, alignItems:'center', justifyContent:'center',
    shadowColor:'#000', shadowOpacity:0.15, shadowRadius:8, shadowOffset:{ width:0, height:3 },
  },

  breakChip: {
    flex:1, paddingVertical:9, borderRadius:10,
    alignItems:'center', borderWidth:1, borderColor:'#F3F4F6', backgroundColor:'#F9FAFB',
  },
  breakChipText: { fontSize:12, fontWeight:'600', color:'#374151' },
  breakHint: { flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:4 },
  breakHintText: { fontSize:12, color:'#9CA3AF' },
  overnightBadge: { flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#EEF2FF', borderRadius:10, padding:10, borderWidth:1, borderColor:'#C7D2FE' },
  overnightText: { fontSize:12, fontWeight:'600', color:'#4338CA', flex:1 },
  filterRow: { flexDirection:'row', gap:8, paddingHorizontal:16, paddingBottom:10 },
  filterChip: {
    flexDirection:'row', alignItems:'center', gap:5,
    backgroundColor:'#F3F4F6', borderRadius:20,
    paddingHorizontal:10, paddingVertical:6,
    borderWidth:1, borderColor:'#E5E7EB',
  },
  filterChipText: { fontSize:12, fontWeight:'600', color:'#374151' },
  filterBadge: {
    backgroundColor:'rgba(0,0,0,0.08)', borderRadius:10,
    minWidth:18, height:18, alignItems:'center', justifyContent:'center', paddingHorizontal:4,
  },
  filterBadgeText: { fontSize:11, fontWeight:'700', color:'#374151' },
});

const wk = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  grid:  { flexDirection:'row' },
  col:   { flex:1, alignItems:'center', gap:4 },
  abbr:  { fontSize:11, fontWeight:'600', color:'#6B7280' },
  numWrap: { width:28, height:28, borderRadius:14, alignItems:'center', justifyContent:'center' },
  num:   { fontSize:13, fontWeight:'600', color:'#374151' },
  dots:  { gap:2, alignItems:'center', minHeight:60 },
  dot:   { width:26, height:26, borderRadius:13, alignItems:'center', justifyContent:'center' },
  dotText: { color:'#fff', fontSize:9, fontWeight:'800' },
  more:  { fontSize:10, fontWeight:'700' },
});

const cal = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  navBtn: { padding:6 },
  month:  { fontSize:15, fontWeight:'700', color:'#111827' },
  dayRow: { flexDirection:'row', marginBottom:4 },
  dayName: { flex:1, textAlign:'center', fontSize:12, fontWeight:'600', color:'#9CA3AF' },
  row:    { flexDirection:'row' },
  cell:   { flex:1, aspectRatio:1, alignItems:'center', justifyContent:'center' },
  dayText: { fontSize:14, color:'#374151' },
});

const tp = StyleSheet.create({
  wrap:  { gap:8 },
  label: { fontSize:13, fontWeight:'600', color:'#9CA3AF' },
  row:   { flexDirection:'row', alignItems:'center', gap:6, height:130 },
  scroll:  { width:60, backgroundColor:'#F9FAFB', borderRadius:10 },
  item:    { paddingVertical:9, alignItems:'center' },
  itemText:{ fontSize:16, color:'#374151' },
  colon:   { fontSize:20, fontWeight:'700', color:'#374151' },
  minCol:  { justifyContent:'space-around', height:130, backgroundColor:'#F9FAFB', borderRadius:10, paddingVertical:4 },
  minItem: { paddingVertical:8, paddingHorizontal:12, alignItems:'center' },
  ampmCol: { justifyContent:'space-around', height:130 },
  ampmBtn: { paddingVertical:12, paddingHorizontal:10, alignItems:'center' },
  ampmText:{ fontSize:14, fontWeight:'600', color:'#9CA3AF' },
});
