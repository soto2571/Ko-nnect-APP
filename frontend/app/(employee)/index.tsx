import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Animated, Pressable,
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
const BORDER_COLOR = 'rgba(0,0,0,0.08)';

function fmt12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isToday(d: Date) { return isSameDay(d, new Date()); }
function isPastDay(d: Date) { const t = new Date(); t.setHours(0,0,0,0); return d < t; }
function toDateStr(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }

function getWeekDates(offset: number, startDay = 0): Date[] {
  const today = new Date();
  const diff = (today.getDay() - startDay + 7) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - diff + offset * 7);
  weekStart.setHours(0,0,0,0);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate()+i); return d; });
}
function weekLabel(dates: Date[]) {
  const s = dates[0], e = dates[6];
  return s.getMonth() === e.getMonth()
    ? `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${e.getDate()}`
    : `${MONTH_SHORT[s.getMonth()]} ${s.getDate()} – ${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
}
function greeting(firstName: string) {
  const h = new Date().getHours();
  return `${h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'}, ${firstName}`;
}
function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
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
    .map(([key, dayShifts]) => ({
      key,
      label: new Date(dayShifts[0].startTime).toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' }),
      shifts: dayShifts.sort((a,b) => new Date(a.startTime).getTime()-new Date(b.startTime).getTime()),
    }));
}

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getPayPeriodDates(
  business: { payPeriodType?: string; payPeriodStartDay?: number; payPeriodAnchorDate?: string },
  offset = 0
): { start: Date; end: Date; label: string } {
  const today = new Date(); today.setHours(0,0,0,0);
  const type     = business.payPeriodType ?? 'weekly';
  const startDay = business.payPeriodStartDay ?? 0;
  const fmt = (d: Date) => d.toLocaleDateString('es', { month: 'short', day: 'numeric' });

  if (type === 'semi-monthly') {
    const d = today.getDate();
    let month = today.getMonth(), year = today.getFullYear();
    let half = d <= 15 ? 0 : 1;
    let totalHalf = month * 2 + half + offset;
    month = Math.floor(totalHalf / 2);
    year  = today.getFullYear() + Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;
    half  = ((totalHalf % 2) + 2) % 2;
    const start = new Date(year, month, half === 0 ? 1 : 16);
    const end   = new Date(year, month, half === 0 ? 15 : new Date(year, month + 1, 0).getDate());
    end.setHours(23, 59, 59);
    return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
  }

  const periodDays = type === 'biweekly' ? 14 : 7;
  let currentStart: Date;
  if (type === 'biweekly' && business.payPeriodAnchorDate) {
    const anchor = new Date(business.payPeriodAnchorDate + 'T00:00:00');
    const daysSince = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
    const cycleDay  = ((daysSince % 14) + 14) % 14;
    currentStart = new Date(today); currentStart.setDate(today.getDate() - cycleDay);
  } else {
    const diff = (today.getDay() - startDay + 7) % 7;
    currentStart = new Date(today); currentStart.setDate(today.getDate() - diff);
  }
  const start = new Date(currentStart); start.setDate(currentStart.getDate() + offset * periodDays);
  const end   = new Date(start);        end.setDate(start.getDate() + periodDays - 1);
  end.setHours(23, 59, 59);
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w, h, r = 8, style }: { w?: number | string; h: number; r?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.85, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.3,  duration: 750, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return <Animated.View style={[{ backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: r, height: h, width: w ?? '100%', opacity }, style]} />;
}

function ShiftListSkeleton() {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 14, gap: 10 }}>
      {[0,1,2].map(i => (
        <View key={i} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: BORDER_COLOR }}>
          <Skel w="58%" h={16} r={6} />
          <Skel w="33%" h={12} r={6} />
        </View>
      ))}
    </View>
  );
}

// ── Weekly Calendar ───────────────────────────────────────────────────────────

function WeeklyCalendar({ offset, shifts, color, startDay = 0 }: {
  offset: number; shifts: Shift[]; color: string; startDay?: number;
}) {
  const shiftsForDay = (d: Date) => shifts.filter(s => isSameDay(new Date(s.startTime), d));
  const dates = getWeekDates(offset, startDay);
  return (
    <View style={wk.container}>
      <View style={wk.grid}>
        {dates.map((date, i) => {
          const count = shiftsForDay(date).length;
          const today = isToday(date);
          const past  = isPastDay(date);
          return (
            <View key={i} style={[wk.col, past && { opacity: 0.38 }]}>
              <Text style={[wk.abbr, today && { color }]}>{DAY_ABBR[date.getDay()]}</Text>
              <View style={[wk.numWrap, today && { backgroundColor: color }]}>
                <Text style={[wk.num, today && { color: '#fff' }]}>{date.getDate()}</Text>
              </View>
              <View style={wk.dotWrap}>
                {count > 0
                  ? <View style={[wk.dotSimple, { backgroundColor: past ? '#D1D5DB' : color }]} />
                  : <View style={wk.dotEmpty} />
                }
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
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
      setElapsed(0); return;
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
  const hasCompletedBreak = !!(
    (log?.breaks || []).some(b => b.start && b.end) ||
    (log?.breakStart && log?.breakEnd)
  );

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
  const canCollapse = done;
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when clocking in, lock expanded while active
  useEffect(() => {
    if (active || onBreak) setExpanded(true);
  }, [active, onBreak]);

  return (
    <View style={cc.card}>
      {/* Top: shift info + status + expand toggle */}
      <TouchableOpacity activeOpacity={canCollapse ? 0.8 : 1} onPress={() => canCollapse && setExpanded(v => !v)}>
        <View style={cc.header}>
          <View style={[cc.iconWrap, { backgroundColor: accentColor + '18' }]}>
            <Ionicons name="today-outline" size={20} color={accentColor} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={[cc.shiftLabel, { color: accentColor }]}>Tu turno de hoy</Text>
              <View style={[sc.durPill, { backgroundColor: accentColor + '15' }]}>
                <Text style={[sc.durPillText, { color: accentColor }]}>
                  {Math.round((((new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime()) / 3600000) - (shift.breakDuration ?? 0) / 60) * 10) / 10}h
                </Text>
              </View>
            </View>
            <Text style={cc.shiftTime}>{fmt12(shift.startTime)} – {fmt12(shift.endTime)}</Text>
            {(shift.breakDuration ?? 0) > 0 && (
              <Text style={cc.breakMeta}>
                <Ionicons name="cafe-outline" size={11} color="#6B7280" /> {(shift.breakDuration ?? 0) >= 60 ? `${(shift.breakDuration!) / 60}h` : `${shift.breakDuration}m`}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            {status && !done && (
              <View style={[cc.statusPill, { backgroundColor: accentColor + '18' }]}>
                {(active || onBreak) && (
                  <Animated.View style={[cc.pulseDot, { backgroundColor: accentColor, transform: [{ scale: pulse }] }]} />
                )}
                <Text style={[cc.statusText, { color: accentColor }]}>
                  {onBreak ? 'Descanso' : 'Activo'}
                </Text>
              </View>
            )}
            {done && (
              <View style={[cc.statusPill, { backgroundColor: '#F3F4F6' }]}>
                <Text style={[cc.statusText, { color: '#6B7280' }]}>Completado</Text>
              </View>
            )}
            {canCollapse && (
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" />
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded: timer + timeline + missed punch */}
      {expanded && (
        <>
          {status && !done && (
            <View style={cc.timerBlock}>
              <Text style={[cc.timer, { color: accentColor }]}>{fmtElapsed(elapsed)}</Text>
              <Text style={cc.timerSub}>{onBreak ? 'tiempo en descanso' : 'tiempo trabajado'}</Text>
            </View>
          )}

          {done && (
            <View style={cc.doneSummary}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={cc.doneText}>
                Turno completado{log?.totalMinutes ? ` · ${Math.floor(log.totalMinutes/60)}h ${log.totalMinutes%60}m trabajado` : ''}
              </Text>
            </View>
          )}

          {status && (() => {
            const tlItems: { dot: string; icon: string; label: string; time: string }[] = [];
            if (log?.clockIn) tlItems.push({ dot: color, icon: 'log-in-outline', label: 'Entrada', time: fmt12(log.clockIn) });
            (log?.breaks && log.breaks.length > 0
              ? log.breaks
              : (log?.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : [])
            ).forEach((b, i) => {
              tlItems.push({
                dot: '#D97706', icon: 'cafe-outline',
                label: (log?.breaks?.length ?? 0) > 1 ? `Descanso ${i+1}` : 'Descanso',
                time: b.end ? `${fmt12(b.start)} – ${fmt12(b.end)}` : fmt12(b.start),
              });
            });
            if (log?.clockOut) tlItems.push({ dot: '#10B981', icon: 'log-out-outline', label: 'Salida', time: fmt12(log.clockOut) });

            return (
              <View style={[cc.timeline, { justifyContent: tlItems.length === 1 ? 'center' : 'space-between' }]}>
                {tlItems.map((item, i) => (
                  <TimelineCol key={i} dot={item.dot} icon={item.icon} label={item.label} time={item.time} />
                ))}
              </View>
            );
          })()}

          {missed && (
            <View style={cc.warnBanner}>
              <Ionicons name="warning-outline" size={14} color="#92400E" />
              <Text style={cc.warnText}>Marcaje de descanso perdido — tu gerente ha sido notificado</Text>
            </View>
          )}
        </>
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
        hasCompletedBreak ? (
          <TouchableOpacity onPress={onClockOut} style={[cc.outlineBtn, { borderColor: '#EF4444' }]}>
            <Ionicons name="log-out-outline" size={15} color="#EF4444" />
            <Text style={[cc.outlineBtnText, { color: '#EF4444' }]}>Marcar Salida</Text>
          </TouchableOpacity>
        ) : (
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
        )
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

function TimelineRow({ dot, icon, time }: { dot: string; label: string; icon: string; time: string }) {
  return (
    <View style={cc.tlRow}>
      <Ionicons name={icon as any} size={14} color={dot} />
      <Text style={cc.tlTime}>{time}</Text>
    </View>
  );
}

function TimelineCol({ dot, icon, label, time }: { dot: string; icon: string; label: string; time: string }) {
  return (
    <View style={cc.tlCol}>
      <View style={[cc.tlIconWrap, { backgroundColor: dot + '18' }]}>
        <Ionicons name={icon as any} size={15} color={dot} />
      </View>
      <Text style={[cc.tlColLabel, { color: dot }]}>{label}</Text>
      <Text style={cc.tlColTime}>{time}</Text>
    </View>
  );
}

// ── Shift card ────────────────────────────────────────────────────────────────

function ShiftCard({ shift, color, past = false }: { shift: Shift; color: string; past?: boolean }) {
  const durMs = new Date(shift.endTime).getTime() - new Date(shift.startTime).getTime();
  const durH  = Math.round((durMs / 3600000 - (shift.breakDuration ?? 0) / 60) * 10) / 10;
  return (
    <View style={[sc.card, past && { opacity: 0.55 }]}>
      <View style={[sc.colorBar, { backgroundColor: color }]} />
      <View style={{ flex: 1, paddingLeft: 12, gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={sc.cardTime}>{fmt12(shift.startTime)} – {fmt12(shift.endTime)}</Text>
          <View style={[sc.durPill, { backgroundColor: color + '15' }]}>
            <Text style={[sc.durPillText, { color }]}>{durH}h</Text>
          </View>
        </View>
        {(shift.breakDuration ?? 0) > 0 && (
          <View style={sc.breakPill}>
            <Ionicons name="cafe-outline" size={11} color="#9CA3AF" />
            <Text style={sc.breakPillText}>
              {(shift.breakDuration ?? 0) >= 60 ? `${(shift.breakDuration!) / 60}h` : `${shift.breakDuration}m`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Upcoming shift card (tomorrow or next) ────────────────────────────────────

function UpcomingShiftCard({ shift, nextShift, color }: {
  shift: Shift | null; nextShift: Shift | null; color: string;
}) {
  const displayShift = shift ?? nextShift ?? null;
  if (!displayShift) {
    return (
      <View style={[st.noTodayCard, { marginTop: 10, borderColor: color + '40', backgroundColor: 'rgba(255,255,255,0.75)' }]}>
        <Ionicons name="moon-outline" size={18} color={color} />
        <Text style={[st.noTodayText, { color }]}>NO TIENES TURNO MAÑANA</Text>
      </View>
    );
  }

  const isNext = !shift && !!nextShift;
  const dateStr = isNext
    ? new Date(displayShift.startTime).toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;
  const durH = Math.round((((new Date(displayShift.endTime).getTime() - new Date(displayShift.startTime).getTime()) / 3600000) - (displayShift.breakDuration ?? 0) / 60) * 10) / 10;

  return (
    <View style={[st.tomorrowCard, { borderLeftColor: color, marginTop: 10 }]}>
      <View style={[cc.header, { alignItems: 'center' }]}>
        <View style={[cc.iconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={isNext ? 'calendar-outline' : 'sunny-outline'} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[cc.shiftLabel, { color }]}>
            {isNext ? 'Tu próximo turno es' : 'Tu turno de mañana'}
          </Text>
          {dateStr && (
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 2, textTransform: 'capitalize' }}>{dateStr}</Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Text style={cc.shiftTime}>{fmt12(displayShift.startTime)} – {fmt12(displayShift.endTime)}</Text>
            <View style={[sc.durPill, { backgroundColor: color + '15' }]}>
              <Text style={[sc.durPillText, { color }]}>{durH}h</Text>
            </View>
          </View>
          {(displayShift.breakDuration ?? 0) > 0 && (
            <Text style={cc.breakMeta}>
              <Ionicons name="cafe-outline" size={11} color="#6B7280" /> {(displayShift.breakDuration ?? 0) >= 60 ? `${displayShift.breakDuration! / 60}h` : `${displayShift.breakDuration}m`}
            </Text>
          )}
        </View>
      </View>
    </View>
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
  const [pastExpanded, setPastExpanded]   = useState(false);

  const flatListRef = useRef<any>(null);

  const startDay = business?.payPeriodStartDay ?? 0;

  const rangeStart = useMemo(() => toDateStr(getWeekDates(weekOffset, startDay)[0]), [weekOffset, startDay]);
  const rangeEnd   = useMemo(() => toDateStr(getWeekDates(weekOffset, startDay)[6]), [weekOffset, startDay]);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await api.getMyShifts(rangeStart, rangeEnd);
      setShifts(data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rangeStart, rangeEnd]);

  const loadTimeLog = useCallback(async (shiftId: string) => {
    try { setTimeLog(await api.getMyTimeLog(shiftId)); } catch {}
  }, []);

useEffect(() => { load(); }, [load]);

  useFocusEffect(useCallback(() => { setWeekOffset(0); }, []));

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

  // ── List items ───────────────────────────────────────────────────────────

  const allGrouped = useMemo(() => groupByDay(shifts), [shifts]);

  type ListItem =
    | { type: 'header';    label: string; key: string; today: boolean }
    | { type: 'shift';     shift: Shift;  key: string; today: boolean }
    | { type: 'empty-day'; key: string;                today: boolean };

  const listItems = useMemo<ListItem[]>(() => {
    const shiftMap = new Map<string, Shift[]>();
    for (const group of allGrouped) shiftMap.set(group.key, group.shifts);

    const weekDays = getWeekDates(weekOffset, startDay);
    const isCurrentWeek = weekOffset === 0;

    // On current week: start from today so all remaining days are shown
    // On other weeks: show all 7 days
    const startFromDate = isCurrentWeek
      ? (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })()
      : weekDays[0];

    const items: ListItem[] = [];
    for (const date of weekDays) {
      if (date < startFromDate) continue;
      const key      = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const label    = date.toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' });
      const dayToday = isToday(date);
      items.push({ type: 'header', label, key: `h-${key}`, today: dayToday });
      const dayShifts = shiftMap.get(key) ?? [];
      if (dayShifts.length > 0) {
        for (const s of dayShifts) items.push({ type: 'shift', shift: s, key: s.shiftId, today: dayToday });
      } else {
        items.push({ type: 'empty-day', key: `e-${key}`, today: dayToday });
      }
    }
    return items;
  }, [allGrouped, weekOffset, startDay]);

  // Past shifts shown at the very bottom
  const pastShifts = useMemo(
    () => shifts.filter(s => isPastDay(new Date(s.startTime))),
    [shifts]
  );

  // Today's shift for the clock card
  const todayShift = useMemo(
    () => shifts.find(s => isSameDay(new Date(s.startTime), new Date())),
    [shifts]
  );

  // Tomorrow's shift for the preview card
  const tomorrowShift = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return shifts.find(s => isSameDay(new Date(s.startTime), tomorrow)) ?? null;
  }, [shifts]);

  const nextUpcomingShift = useMemo(() => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23,59,59,999);
    return shifts.find(s => new Date(s.startTime) > tomorrow) ?? null;
  }, [shifts]);

  const HEADER_H = 58;
  const CARD_H   = 90;

  const getItemLayout = useCallback((_: any, index: number) => {
    const length = listItems[index]?.type === 'header' ? HEADER_H : CARD_H;
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += listItems[i]?.type === 'header' ? HEADER_H : CARD_H;
    }
    return { length, offset, index };
  }, [listItems]);


  // ── Derived ───────────────────────────────────────────────────────────────

  const weekDates  = getWeekDates(weekOffset, startDay);
  const weekEnd    = new Date(weekDates[6]); weekEnd.setHours(23,59,59);
  const weekShifts = shifts.filter(s => {
    const d = new Date(s.startTime);
    return d >= weekDates[0] && d <= weekEnd;
  });

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={color} />

      {/* ── Fixed header ── */}
      <View style={st.fixedHeader}>
        <View style={[st.greetSection, { paddingTop: insets.top + 12 }]}>
          <Text style={st.greeting}>{greeting(user?.firstName || 'there')}</Text>
          {business && <Text style={st.bizName}>{business.name}</Text>}
        </View>

        <View style={st.calendarSection}>
          <View style={st.sectionHeader}>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => o - 1)}
              style={[st.navBtn, weekOffset <= -(business?.schedulingWeeks ?? 4) && { opacity: 0.3 }]}
              disabled={weekOffset <= -(business?.schedulingWeeks ?? 4)}
            >
              <Ionicons name="chevron-back" size={16} color="#374151" />
            </TouchableOpacity>
            <Text style={st.sectionTitle}>{weekLabel(weekDates)}</Text>
            <TouchableOpacity
              onPress={() => setWeekOffset(o => o + 1)}
              style={[st.navBtn, weekOffset >= (business?.schedulingWeeks ?? 4) && { opacity: 0.3 }]}
              disabled={weekOffset >= (business?.schedulingWeeks ?? 4)}
            >
              <Ionicons name="chevron-forward" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
          <WeeklyCalendar
            offset={weekOffset}
            shifts={shifts}
            color={color}
            startDay={startDay}
          />
        </View>

        <View style={st.listLabelRow}>
          <Text style={st.listLabel}>
            {weekOffset === 0
              ? 'Esta semana'
              : `Semana del ${weekDates[0].getDate()} de ${MONTH_SHORT[weekDates[0].getMonth()]}`}
            {weekShifts.length > 0 ? `  ·  ${weekShifts.length} turno${weekShifts.length !== 1 ? 's' : ''}` : ''}
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
      </View>

      {/* ── Shift list ── */}
      {loading ? (
        <ShiftListSkeleton />
      ) : (
        <FlatList
          ref={flatListRef}
          data={listItems}
          keyExtractor={item => item.key}
          getItemLayout={getItemLayout}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={color}
            />
          }
          ListHeaderComponent={
            weekOffset === 0 ? (
              <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
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
                  <>
                    <View style={[st.dayHeader, { paddingHorizontal: 0 }]}>
                      <View style={st.dayHeaderPill}>
                        <Text style={st.dayHeaderText}>{new Date().toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                      </View>
                    </View>
                    <View style={[st.noTodayCard, { borderColor: color + '40', backgroundColor: 'rgba(255,255,255,0.75)' }]}>
                      <Ionicons name="moon-outline" size={18} color={color} />
                      <Text style={[st.noTodayText, { color }]}>SIN TURNO HOY</Text>
                    </View>
                  </>
                )}
                <UpcomingShiftCard shift={tomorrowShift} nextShift={!todayShift ? nextUpcomingShift : null} color={color} />
                <View style={[st.pastDivider, { marginTop: 18, marginBottom: 0 }]}>
                  <View style={[st.pastDividerLine, { backgroundColor: '#6B7280' }]} />
                  <Text style={[st.pastDividerLabel, { color: '#374151', fontWeight: '700' }]}>Turnos</Text>
                  <View style={[st.pastDividerLine, { backgroundColor: '#6B7280' }]} />
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={weekOffset === 0 && pastShifts.length > 0 ? (
            <View style={{ marginTop: 16, paddingBottom: 8 }}>
              <TouchableOpacity
                style={st.pastDivider}
                onPress={() => setPastExpanded(v => !v)}
                activeOpacity={0.7}
              >
                <View style={st.pastDividerLine} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Text style={st.pastDividerLabel}>Turnos anteriores</Text>
                  <Ionicons
                    name={pastExpanded ? 'chevron-up' : 'chevron-down'}
                    size={11}
                    color="#C4C4C4"
                  />
                </View>
                <View style={st.pastDividerLine} />
              </TouchableOpacity>
              {pastExpanded && groupByDay(pastShifts).reverse().map(group => (
                <View key={group.key}>
                  <View style={st.dayHeader}>
                    <View style={[st.dayHeaderPill, { backgroundColor: 'transparent' }]}>
                      <Text style={[st.dayHeaderText, { color: '#C4C4C4', fontWeight: '500' }]}>{group.label}</Text>
                    </View>
                  </View>
                  {group.shifts.map(s => (
                    <View key={s.shiftId} style={{ paddingHorizontal: 20 }}>
                      <ShiftCard shift={s} color={color} past />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={st.emptyState}>
              <Ionicons name="calendar-outline" size={30} color="#D1D5DB" />
              <Text style={st.emptyText}>Sin turnos próximos</Text>
            </View>
          }
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return (
                <View style={[st.dayHeader, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <View style={[st.dayHeaderPill, item.today && { backgroundColor: color + '20' }]}>
                    <Text style={[st.dayHeaderText, item.today && { color }]}>{item.label}</Text>
                  </View>
                  {item.today && (
                    <View style={[st.todayBadge, { backgroundColor: color + '20' }]}>
                      <View style={[st.todayBadgeDot, { backgroundColor: color }]} />
                      <Text style={[st.todayBadgeText, { color }]}>HOY</Text>
                    </View>
                  )}
                </View>
              );
            }
            if (item.type === 'empty-day') {
              return (
                <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
                  <View style={st.emptyDayRow}>
                    <Ionicons name="moon-outline" size={13} color="#9CA3AF" />
                    <Text style={st.emptyDayText}>Sin turno</Text>
                  </View>
                </View>
              );
            }
            return (
              <View style={{ paddingHorizontal: 20 }}>
                <ShiftCard shift={item.shift} color={color} />
              </View>
            );
          }}
        />
      )}

    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  fixedHeader: { zIndex: 10, backgroundColor: 'transparent' },
  greetSection: { paddingHorizontal: 24, paddingBottom: 4 },
  greeting: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  bizName:  { fontSize: 14, color: '#6B7280', marginTop: 3 },

  calendarSection: { paddingHorizontal: 20, marginTop: 12, marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  navBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1, borderColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },

  listLabelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6,
  },
  listLabel: {
    fontSize: 12, fontWeight: '700', color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  currentWeekBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  currentWeekDot:   { width: 6, height: 6, borderRadius: 3 },
  currentWeekText:  { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  backTodayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.90)', borderWidth: 1.5,
  },
  backTodayText: { fontSize: 11, fontWeight: '700' },

  dayHeader:     { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6 },
  dayHeaderPill: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
  dayHeaderText: {
    fontSize: 12, fontWeight: '700', color: '#374151',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText:  { fontSize: 14, color: '#6B7280' },

  emptyDayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed',
  },
  emptyDayText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },

  todayBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  todayBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  todayBadgeText:{ fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  pastDivider:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 10, marginBottom: 4 },
  pastDividerLine:  { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  pastDividerLabel: { fontSize: 11, fontWeight: '600', color: '#C4C4C4', textTransform: 'uppercase', letterSpacing: 0.6 },

  noTodayCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  noTodayText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },

  tomorrowCard: {
    backgroundColor: '#fff', borderRadius: 16, marginTop: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER_COLOR,
    borderLeftWidth: 4,
  },

});

const wk = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderBottomWidth: 0, borderColor: BORDER_COLOR,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  grid:     { flexDirection: 'row' },
  col:      { flex: 1, alignItems: 'center', gap: 4 },
  abbr:     { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  numWrap:  { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  num:      { fontSize: 13, fontWeight: '600', color: '#374151' },
  dotWrap:     { alignItems: 'center', height: 14 },
  dotSimple:   { width: 6, height: 6, borderRadius: 3 },
  dotEmpty:    { width: 6, height: 6 },
  weekDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 6 },
  expandWrap:  { alignItems: 'center' },
  expandBump:  {
    width: 40, height: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    backgroundColor: '#fff',
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderTopWidth: 0,
    borderColor: BORDER_COLOR,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
});

const sc = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 10, borderRadius: 16, overflow: 'hidden',
    paddingVertical: 14, paddingRight: 14,
    borderWidth: 1, borderColor: BORDER_COLOR,
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  colorBar:   { width: 5, alignSelf: 'stretch' },
  cardTime:   { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  durPill:    { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  durPillText:{ fontSize: 12, fontWeight: '700' },
  breakPill:  {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F9FAFB', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  breakPillText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
});

const cc = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24, padding: 20, gap: 14,
    borderWidth: 1, borderColor: BORDER_COLOR,
    shadowColor: '#000', shadowOpacity: 0.07,
    shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  header:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap:   { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  shiftLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  shiftTime:  { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  breakMeta:  { fontSize: 12, color: '#6B7280', marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  pulseDot:   { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },

  timerBlock: { alignItems: 'center', paddingVertical: 6 },
  timer:    { fontSize: 48, fontWeight: '800', letterSpacing: -1 },
  timerSub: { fontSize: 12, color: '#6B7280', marginTop: 2, fontWeight: '500' },

  doneSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 6 },
  doneText:    { fontSize: 14, color: '#10B981', fontWeight: '600' },

  timeline:     { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 8 },
  tlCol:        { alignItems: 'center', gap: 4, minWidth: 72 },
  tlIconWrap:   { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tlColLabel:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  tlColTime:    { fontSize: 11, fontWeight: '700', color: '#111827', textAlign: 'center' },
  tlSep:        { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  tlRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tlDot:        { width: 7, height: 7, borderRadius: 4 },
  tlLabel:      { fontSize: 13, color: '#6B7280' },
  tlTime:       { fontWeight: '700', color: '#374151' },

  warnBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  warnText: { flex: 1, fontSize: 12, color: '#92400E' },

  btnRow:     { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 16, paddingVertical: 15,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  outlineBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 14, paddingVertical: 12,
    borderWidth: 1.5, backgroundColor: '#fff',
  },
  outlineBtnText: { fontWeight: '700', fontSize: 14 },
  closedRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 6 },
  closedText: { fontSize: 13, color: '#374151', fontWeight: '500' },
});
