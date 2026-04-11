import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Animated,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Shift, TimeLog } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────


const DAY_ABBR    = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmt12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}
function isToday(d: Date) { return isSameDay(d, new Date()); }
function isPast(d: Date)  { return d < new Date() && !isToday(d); }

function getWeekDates(offset: number, startDay = 0): Date[] {
  const today = new Date();
  const diff = (today.getDay() - startDay + 7) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - diff + offset * 7);
  weekStart.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  });
}
function weekLabel(dates: Date[]) {
  const s = dates[0], e = dates[6];
  return s.getMonth() === e.getMonth()
    ? `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`
    : `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
}
function greeting(firstName: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
  return `${time}, ${firstName}`;
}
function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}


// ── Clock card ────────────────────────────────────────────────────────────────

function TodayClockCard({
  shift, log, onClockIn, onBreakStart, onBreakEnd, onClockOut, loading, color,
}: {
  shift: Shift; log: TimeLog | null;
  onClockIn: () => void; onBreakStart: () => void;
  onBreakEnd: () => void; onClockOut: () => void;
  loading: boolean; color: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!log || log.status === 'clocked_out' || log.status === 'missed_punch') {
      setElapsed(0);
      return;
    }
    const ref = setInterval(() => {
      const breaks = log.breaks || [];
      const lastBreak = breaks[breaks.length - 1];
      const completedBreakMs = breaks
        .filter(b => b.start && b.end)
        .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0);
      if (log.status === 'on_break' && lastBreak?.start) {
        const raw = Math.floor((Date.now() - new Date(lastBreak.start).getTime()) / 1000);
        setElapsed(isNaN(raw) || raw < 0 ? 0 : raw);
      } else {
        const raw = Math.floor((Date.now() - new Date(log.clockIn).getTime() - completedBreakMs) / 1000);
        setElapsed(isNaN(raw) || raw < 0 ? 0 : raw);
      }
    }, 1000);
    return () => clearInterval(ref);
  }, [log]);

  const status  = log?.status ?? null;
  const missed  = log?.missedBreakPunch;
  const onBreak = status === 'on_break';
  const active  = status === 'clocked_in';
  const done    = status === 'clocked_out' || status === 'missed_punch';

  // Pulsing dot for active/break
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active && !onBreak) return;
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.5, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 800, useNativeDriver: true }),
    ])).start();
    return () => pulse.stopAnimation();
  }, [active, onBreak]);

  const accentColor = onBreak ? '#D97706' : color;

  return (
    <View style={cc.card}>
      {/* Top: shift info + status */}
      <View style={cc.header}>
        <View style={[cc.iconWrap, { backgroundColor: accentColor + '18' }]}>
          <Ionicons name="today-outline" size={20} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[cc.shiftLabel, { color: accentColor }]}>Tu turno de hoy</Text>
          <Text style={cc.shiftTime}>{fmt12(shift.startTime)} – {fmt12(shift.endTime)}</Text>
          {(shift.breakDuration ?? 0) > 0 && (
            <Text style={cc.breakMeta}>
              <Ionicons name="cafe-outline" size={11} color="#6B7280" /> {shift.breakDuration}min descanso
            </Text>
          )}
        </View>
        {status && !done && (
          <View style={[cc.statusPill, { backgroundColor: accentColor + '18' }]}>
            {(active || onBreak) && (
              <Animated.View style={[cc.pulseDot, { backgroundColor: accentColor, transform: [{ scale: pulse }] }]} />
            )}
            <Text style={[cc.statusText, { color: accentColor }]}>
              {onBreak ? 'En descanso' : 'Activo'}
            </Text>
          </View>
        )}
        {done && (
          <View style={[cc.statusPill, { backgroundColor: '#F3F4F6' }]}>
            <Text style={[cc.statusText, { color: '#6B7280' }]}>Completado</Text>
          </View>
        )}
      </View>

      {/* Big timer */}
      {status && !done && (
        <View style={cc.timerBlock}>
          <Text style={[cc.timer, { color: accentColor }]}>{fmtElapsed(elapsed)}</Text>
          <Text style={cc.timerSub}>{onBreak ? 'tiempo en descanso' : 'tiempo trabajado'}</Text>
        </View>
      )}

      {/* Done summary */}
      {done && (
        <View style={cc.doneSummary}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={cc.doneText}>
            Turno completado{log?.totalMinutes ? ` · ${Math.floor(log.totalMinutes/60)}h ${log.totalMinutes%60}m trabajado` : ''}
          </Text>
        </View>
      )}

      {/* Timeline */}
      {status && (
        <View style={cc.timeline}>
          {log?.clockIn && (
            <TimelineRow dot={color} label="Entrada" time={fmt12(log.clockIn)} />
          )}
          {(log?.breaks && log.breaks.length > 0
            ? log.breaks
            : (log?.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : [])
          ).map((b, i) => {
            const lbl = (log?.breaks?.length ?? 0) > 1 ? `Descanso ${i + 1}` : 'Descanso';
            return (
              <View key={i}>
                <TimelineRow dot="#D97706" label={`${lbl} inicio`} time={fmt12(b.start)} />
                {b.end && <TimelineRow dot={color} label={`${lbl} fin`} time={fmt12(b.end)} />}
              </View>
            );
          })}
          {log?.clockOut && (
            <TimelineRow dot="#10B981" label="Salida" time={fmt12(log.clockOut)} />
          )}
        </View>
      )}

      {/* Missed punch warning */}
      {missed && (
        <View style={cc.warnBanner}>
          <Ionicons name="warning-outline" size={14} color="#92400E" />
          <Text style={cc.warnText}>Marcaje de descanso perdido — tu gerente ha sido notificado</Text>
        </View>
      )}

      {/* Actions */}
      {loading ? (
        <ActivityIndicator color={color} style={{ marginTop: 8 }} />
      ) : !status ? (
        new Date() > new Date(shift.endTime) ? (
          <View style={cc.closedRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={cc.closedText}>Ventana de entrada cerrada</Text>
          </View>
        ) : (
          <Pressable
            onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start()}
            onPress={onClockIn}
          >
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <LinearGradient colors={[color + 'DD', color]} start={{x:0,y:0}} end={{x:1,y:1}} style={cc.primaryBtn}>
                <Ionicons name="log-in-outline" size={18} color="#fff" />
                <Text style={cc.primaryBtnText}>Marcar Entrada</Text>
              </LinearGradient>
            </Animated.View>
          </Pressable>
        )
      ) : active ? (
        <View style={cc.btnRow}>
          <TouchableOpacity onPress={onBreakStart} style={[cc.outlineBtn, { borderColor: '#D97706' }]}>
            <Ionicons name="cafe-outline" size={15} color="#D97706" />
            <Text style={[cc.outlineBtnText, { color: '#D97706' }]}>Descanso</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClockOut} style={[cc.outlineBtn, { borderColor: '#EF4444' }]}>
            <Ionicons name="log-out-outline" size={15} color="#EF4444" />
            <Text style={[cc.outlineBtnText, { color: '#EF4444' }]}>Marcar Salida</Text>
          </TouchableOpacity>
        </View>
      ) : onBreak ? (
        <Pressable
          onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start()}
          onPress={onBreakEnd}
        >
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <LinearGradient colors={['#F59E0B', '#D97706']} start={{x:0,y:0}} end={{x:1,y:1}} style={cc.primaryBtn}>
              <Ionicons name="play-outline" size={18} color="#fff" />
              <Text style={cc.primaryBtnText}>Terminar Descanso</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      ) : null}
    </View>
  );
}

function TimelineRow({ dot, label, time }: { dot: string; label: string; time: string }) {
  return (
    <View style={cc.tlRow}>
      <View style={[cc.tlDot, { backgroundColor: dot }]} />
      <Text style={cc.tlLabel}>{label} <Text style={cc.tlTime}>{time}</Text></Text>
    </View>
  );
}

function groupShiftsByDay(shifts: Shift[]) {
  const map = new Map<string, { label: string; shifts: Shift[] }>();
  for (const s of shifts) {
    const d = new Date(s.startTime);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!map.has(key)) map.set(key, {
      label: d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
      shifts: [],
    });
    map.get(key)!.shifts.push(s);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, g]) => g);
}

// ── Week strip ────────────────────────────────────────────────────────────────

function WeekStrip({ dates, shifts, color }: { dates: Date[]; shifts: Shift[]; color: string }) {
  const shiftsForDay = (d: Date) => shifts.filter(s => isSameDay(new Date(s.startTime), d));
  return (
    <View style={wk.container}>
      <View style={wk.row}>
        {dates.map((date, i) => {
          const dayShifts = shiftsForDay(date);
          const today = isToday(date);
          const past  = isPast(date);
          const hasShift = dayShifts.length > 0;
          return (
            <View key={i} style={[wk.col, past && { opacity: 0.4 }]}>
              <Text style={[wk.abbr, today && { color }]}>{DAY_ABBR[date.getDay()]}</Text>
              <View style={[wk.numWrap, today && { backgroundColor: color }]}>
                <Text style={[wk.num, today && { color: '#fff' }]}>{date.getDate()}</Text>
              </View>
              {hasShift
                ? <View style={[wk.dot, { backgroundColor: today ? color : color + '80' }]} />
                : <View style={wk.dotEmpty} />
              }
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Shift card ────────────────────────────────────────────────────────────────

function ShiftCard({ shift, color, dimmed = false, showDate = false }: { shift: Shift; color: string; dimmed?: boolean; showDate?: boolean }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fadeAnim, { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }).start();
  }, []);
  const d = new Date(shift.startTime);
  const dateStr = d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange:[0,1], outputRange:[8,0] }) }] }}>
      <View style={[sc.card, dimmed && sc.dimmed]}>
        <View style={[sc.bar, { backgroundColor: dimmed ? '#E5E7EB' : color }]} />
        <View style={{ flex: 1, paddingLeft: 14 }}>
          <Text style={[sc.title, dimmed && { color: '#9CA3AF' }]}>{shift.title}</Text>
          {showDate && <Text style={sc.date}>{dateStr}</Text>}
          <View style={sc.timeRow}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={sc.time}>{fmt12(shift.startTime)} – {fmt12(shift.endTime)}</Text>
          </View>
        </View>
        {!dimmed && (
          <View style={[sc.badge, { backgroundColor: color + '15' }]}>
            <Text style={[sc.badgeText, { color }]}>Próximo</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MyShiftsScreen() {
  const { user, business, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const color = primaryColor;

  const [shifts, setShifts]             = useState<Shift[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [weekOffset, setWeekOffset]     = useState(0);
  const [timeLog, setTimeLog]           = useState<TimeLog | null>(null);
  const [clockLoading, setClockLoading] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(headerAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(cardAnim,   { toValue: 1, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.getMyShifts();
      setShifts(data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadTimeLog = useCallback(async (shiftId: string) => {
    try { setTimeLog(await api.getMyTimeLog(shiftId)); } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayShiftRef = useRef<Shift | null>(null);
  useEffect(() => {
    const todayS = shifts.find(s => isSameDay(new Date(s.startTime), new Date()));
    if (todayS && todayS.shiftId !== todayShiftRef.current?.shiftId) {
      todayShiftRef.current = todayS;
      loadTimeLog(todayS.shiftId);
    }
  }, [shifts, loadTimeLog]);

  const handleClockIn = async (shift: Shift) => {
    setClockLoading(true);
    try {
      setTimeLog(await api.clockIn({
        shiftId: shift.shiftId, businessId: shift.businessId,
        scheduledBreakDuration: shift.breakDuration, breakTime: shift.breakTime,
      }));
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setClockLoading(false); }
  };
  const handleBreakStart = async () => {
    if (!timeLog) return;
    setClockLoading(true);
    try { setTimeLog(await api.breakStart(timeLog.logId)); }
    catch (err: any) { Alert.alert('Error', err.message); }
    finally { setClockLoading(false); }
  };
  const handleBreakEnd = async () => {
    if (!timeLog) return;
    setClockLoading(true);
    try { setTimeLog(await api.breakEnd(timeLog.logId)); }
    catch (err: any) { Alert.alert('Error', err.message); }
    finally { setClockLoading(false); }
  };
  const handleClockOut = async () => {
    if (!timeLog) return;
    Alert.alert('Marcar Salida', '¿Estás seguro de que quieres marcar salida?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Marcar Salida', style: 'destructive', onPress: async () => {
        setClockLoading(true);
        try { setTimeLog(await api.clockOut(timeLog.logId)); }
        catch (err: any) { Alert.alert('Error', err.message); }
        finally { setClockLoading(false); }
      }},
    ]);
  };

  const now = new Date();
  const todayStart    = new Date(now); todayStart.setHours(0,0,0,0);
  const todayShift    = shifts.find(s => isSameDay(new Date(s.startTime), now));
  const nextShift     = shifts.find(s => { const d = new Date(s.startTime); return d > now && !isSameDay(d, now); });
  const weekDates     = getWeekDates(weekOffset, business?.payPeriodStartDay ?? 0);
  const weekStart     = weekDates[0];
  const weekEnd       = new Date(weekDates[6]); weekEnd.setHours(23,59,59);
  // For current week start from today; for other weeks show all shifts in that week
  const weekShifts    = shifts.filter(s => {
    const d = new Date(s.startTime);
    return d >= weekStart && d <= weekEnd && (weekOffset > 0 || d >= todayStart);
  });
  const pastShifts    = shifts.filter(s => new Date(s.startTime) < todayStart);
  const tomorrow      = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const tomorrowShift = shifts.find(s => isSameDay(new Date(s.startTime), tomorrow));

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <AnimatedBackground primaryColor={color} />
        <ActivityIndicator color={color} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <AnimatedBackground primaryColor={color} />

      {/* ── Fixed header: greeting + week calendar ── */}
      <Animated.View style={[st.fixedHeader, {
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange:[0,1], outputRange:[-16,0] }) }],
      }]}>
        {/* Greeting */}
        <View style={[st.greetSection, { paddingTop: insets.top + 12 }]}>
          <Text style={st.greeting}>{greeting(user?.firstName || 'there')}</Text>
          {business && <Text style={st.bizName}>{business.name}</Text>}
        </View>

        {/* Week strip with nav */}
        <View style={st.calendarSection}>
          <View style={st.sectionHeader}>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => Math.max(0, o - 1))}
              style={[st.navBtn, weekOffset === 0 && { opacity: 0.3 }]}
              disabled={weekOffset === 0}
            >
              <Ionicons name="chevron-back" size={16} color="#374151" />
            </TouchableOpacity>
            <Text style={st.sectionTitle}>{weekLabel(weekDates)}</Text>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => Math.min(3, o + 1))}
              style={[st.navBtn, weekOffset >= 3 && { opacity: 0.3 }]}
              disabled={weekOffset >= 3}
            >
              <Ionicons name="chevron-forward" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
          <WeekStrip dates={weekDates} shifts={shifts} color={color} />
        </View>
      </Animated.View>

      {/* ── Scrollable shift content ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 50 }}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        refreshControl={
          <RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={color} />
        }
      >
        {/* ── Today's shift / clock card ── */}
        <Animated.View style={[st.section, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[20,0] }) }],
        }]}>
          {todayShift ? (
            <TodayClockCard
              shift={todayShift} log={timeLog}
              onClockIn={() => handleClockIn(todayShift)}
              onBreakStart={handleBreakStart}
              onBreakEnd={handleBreakEnd}
              onClockOut={handleClockOut}
              loading={clockLoading} color={color}
            />
          ) : (
            <View style={st.noTodayCard}>
              <View style={[st.noTodayIcon, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="moon-outline" size={20} color="#6B7280" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.noTodayLabel}>Sin turno hoy</Text>
                <Text style={st.noTodayNext}>
                  {nextShift
                    ? `Próximo: ${new Date(nextShift.startTime).toLocaleDateString('es', { weekday:'long', month:'short', day:'numeric' })} · ${fmt12(nextShift.startTime)}`
                    : 'No tienes turnos próximos'}
                </Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* ── Tomorrow chip ── */}
        <Animated.View style={[{ paddingHorizontal: 20, marginTop: 10 }, {
          opacity: cardAnim,
          transform: [{ translateY: cardAnim.interpolate({ inputRange:[0,1], outputRange:[16,0] }) }],
        }]}>
          {tomorrowShift ? (
            <View style={[st.tomorrowChip, { borderColor: 'rgba(0,0,0,0.08)', backgroundColor: '#fff' }]}>
              <Ionicons name="sunny-outline" size={15} color={color} />
              <Text style={[st.tomorrowLabel, { color }]}>Mañana</Text>
              <Text style={[st.tomorrowTitle, { color: '#111827' }]}>{tomorrowShift.title}</Text>
              <Text style={[st.tomorrowTime, { color }]}>{fmt12(tomorrowShift.startTime)}</Text>
            </View>
          ) : (
            <View style={[st.tomorrowChip, { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}>
              <Ionicons name="moon-outline" size={15} color="#6B7280" />
              <Text style={[st.tomorrowLabel, { color: '#374151' }]}>Mañana</Text>
              <Text style={[st.tomorrowTitle, { color: '#374151' }]}>Sin turno programado</Text>
            </View>
          )}
        </Animated.View>

        {/* ── Week shifts list (starts from today) ── */}
        <View style={st.section}>
          <View style={st.listLabelRow}>
            <Text style={st.listLabel}>
              {weekOffset === 0 ? 'Esta semana' : `Semana del ${weekDates[0].getDate()} de ${MONTH_SHORT[weekDates[0].getMonth()]}`}
              {weekShifts.length > 0 ? `  ·  ${weekShifts.length} shift${weekShifts.length !== 1 ? 's' : ''}` : ''}
            </Text>
            {weekOffset === 0 ? (
              <View style={[st.currentWeekBadge, { backgroundColor: color }]}>
                <View style={[st.currentWeekDot, { backgroundColor: '#fff' }]} />
                <Text style={st.currentWeekText}>Semana actual</Text>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setWeekOffset(0)} style={[st.backTodayBtn, { borderColor: color }]}>
                <Ionicons name="return-up-back-outline" size={13} color={color} />
                <Text style={[st.backTodayText, { color }]}>Volver a hoy</Text>
              </TouchableOpacity>
            )}
          </View>
          {weekShifts.length > 0 ? (
            groupShiftsByDay(weekShifts).map((group, gi) => (
              <View key={gi}>
                <View style={st.dayHeaderRow}>
                  <View style={st.dayHeaderPill}>
                    <Text style={st.dayHeaderText}>{group.label}</Text>
                  </View>
                </View>
                {group.shifts.map(s => <ShiftCard key={s.shiftId} shift={s} color={color} />)}
              </View>
            ))
          ) : (
            <View style={st.emptyState}>
              <Ionicons name="calendar-outline" size={30} color="#D1D5DB" />
              <Text style={st.emptyText}>Sin turnos esta semana</Text>
            </View>
          )}

          {/* Pagination dots */}
          <View style={st.dotsRow}>
            {[0,1,2,3].map(i => (
              <TouchableOpacity key={i} onPress={() => setWeekOffset(i)}>
                <View style={[st.dot, weekOffset === i && { backgroundColor: color, width: 20 }]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Past shifts ── */}
        {pastShifts.length > 0 && (
          <View style={st.section}>
            <Text style={st.listLabel}>Turnos anteriores</Text>
            {pastShifts.slice(-5).reverse().map(s =>
              <ShiftCard key={s.shiftId} shift={s} color={color} dimmed showDate />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  fixedHeader: {
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  greetSection: { paddingHorizontal: 24, paddingBottom: 4 },
  calendarSection: { paddingHorizontal: 20, marginTop: 12, marginBottom: 4 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  bizName:  { fontSize: 14, color: '#6B7280', marginTop: 3 },

  section: { paddingHorizontal: 20, marginTop: 20 },

  noTodayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff',
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  noTodayIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noTodayLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  noTodayNext:  { fontSize: 13, color: '#6B7280', marginTop: 3 },

  tomorrowChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  tomorrowLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  tomorrowTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  tomorrowTime:  { fontSize: 13, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: '#111827' },
  navBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1, borderColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  listLabel: {
    fontSize: 12, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyText:  { fontSize: 14, color: '#6B7280' },

  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 16 },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },

  dayHeaderRow:  { paddingTop: 14, paddingBottom: 6 },
  dayHeaderPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: 'rgba(0,0,0,0.06)' },
  dayHeaderText: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },

  listLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  currentWeekBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  currentWeekDot:   { width: 6, height: 6, borderRadius: 3 },
  currentWeekText:  { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }, // white on colored badge — intentional
  backTodayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.90)', borderWidth: 1.5 },
  backTodayText: { fontSize: 11, fontWeight: '700' },
});

const wk = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  row: { flexDirection: 'row' },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  abbr: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  numWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  num:     { fontSize: 13, fontWeight: '600', color: '#374151' },
  dot:     { width: 6, height: 6, borderRadius: 3 },
  dotEmpty:{ width: 6, height: 6 },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16, flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  dimmed: { opacity: 0.5 },
  bar:  { width: 4, alignSelf: 'stretch' },
  title: { fontSize: 15, fontWeight: '700', color: '#111827' },
  date:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  time:    { fontSize: 12, color: '#6B7280' },
  badge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

const cc = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24, padding: 20, gap: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shiftLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  shiftTime:  { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 2 },
  breakMeta:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  pulseDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  timerBlock: { alignItems: 'center', paddingVertical: 6 },
  timer:    { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  timerSub: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '500' },

  doneSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 6 },
  doneText:    { fontSize: 14, color: '#10B981', fontWeight: '600' },

  timeline: { gap: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  tlRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tlDot:  { width: 7, height: 7, borderRadius: 4 },
  tlLabel:{ fontSize: 13, color: '#6B7280' },
  tlTime: { fontWeight: '700', color: '#374151' },

  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warnText: { flex: 1, fontSize: 12, color: '#92400E' },

  btnRow: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 15,
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 14, paddingVertical: 12,
    borderWidth: 1.5, backgroundColor: '#fff',
  },
  outlineBtnText: { fontWeight: '700', fontSize: 14 },
  closedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 6 },
  closedText: { fontSize: 13, color: '#374151', fontWeight: '500' },
});
