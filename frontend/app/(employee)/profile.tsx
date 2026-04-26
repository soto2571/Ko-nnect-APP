import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { TimeLog } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EmployeeProfileScreen() {
  const { user, business, logout, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const color  = primaryColor;

  const [periodOffset, setPeriodOffset] = useState(0);
  const [periodLogs, setPeriodLogs]     = useState<TimeLog[]>([]);
  const [logsLoading, setLogsLoading]   = useState(false);

  const loadPeriodLogs = useCallback(async (offset: number) => {
    if (!business) return;
    const p = getPayPeriodDates(business, offset);
    setLogsLoading(true);
    try {
      const logs = await api.getMyTimeLogs(toDateStr(p.start), toDateStr(p.end));
      setPeriodLogs(logs);
    } catch { setPeriodLogs([]); }
    finally { setLogsLoading(false); }
  }, [business]);

  useEffect(() => {
    loadPeriodLogs(periodOffset);
  }, [periodOffset, loadPeriodLogs]);

  const period    = business ? getPayPeriodDates(business, periodOffset) : null;
  const totalMin  = periodLogs.reduce((s, l) => s + (l.totalMinutes ?? 0), 0);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={color} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.container, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <View style={s.card}>
          <View style={[s.avatar, { backgroundColor: color }]}>
            <Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
          </View>
          <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          {business && (
            <View style={[s.bizPill, { backgroundColor: color + '15' }]}>
              <Text style={[s.bizText, { color }]}>{business.name}</Text>
            </View>
          )}
        </View>

        {/* ── Mis Horas ── */}
        {business && period && (
          <View style={s.hoursCard}>
            {/* Card header */}
            <View style={s.hoursHeader}>
              <View style={[s.hoursIconWrap, { backgroundColor: color + '15' }]}>
                <Ionicons name="time-outline" size={18} color={color} />
              </View>
              <Text style={s.hoursTitle}>Mis horas</Text>
            </View>

            {/* Period navigator */}
            <View style={s.periodNav}>
              <TouchableOpacity onPress={() => setPeriodOffset(o => o - 1)} style={s.navBtn}>
                <Ionicons name="chevron-back" size={18} color="#374151" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text style={s.periodLabel}>{period.label}</Text>
                {periodOffset === 0 && (
                  <Text style={[s.currentTag, { color }]}>Período actual</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setPeriodOffset(o => o + 1)}
                style={[s.navBtn, periodOffset >= 0 && { opacity: 0.3 }]}
                disabled={periodOffset >= 0}
              >
                <Ionicons name="chevron-forward" size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Total row */}
            <View style={[s.totalRow, { backgroundColor: color + '12', borderColor: color + '25' }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={color} />
              <Text style={[s.totalLabel, { color }]}>Total período</Text>
              <Text style={[s.totalHours, { color }]}>{fmtHours(totalMin)}</Text>
            </View>

            {/* Log list */}
            {logsLoading ? (
              <ActivityIndicator color={color} style={{ marginVertical: 24 }} />
            ) : periodLogs.length === 0 ? (
              <Text style={s.emptyText}>Sin registros este período</Text>
            ) : (
              periodLogs.map(log => {
                const dateLabel = new Date(log.clockIn).toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' });
                const breaks = log.breaks && log.breaks.length > 0
                  ? log.breaks : (log.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : []);
                const breakMin = breaks.filter((b: any) => b.start && b.end)
                  .reduce((sum: number, b: any) => sum + Math.round((new Date(b.end).getTime() - new Date(b.start).getTime()) / 60000), 0);
                return (
                  <View key={log.logId} style={s.logRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.logDate}>{dateLabel}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <Text style={s.logTime}>{fmt12(log.clockIn)}</Text>
                        <Text style={{ color: '#9CA3AF' }}>→</Text>
                        <Text style={s.logTime}>{log.clockOut ? fmt12(log.clockOut) : '…'}</Text>
                        {breakMin > 0 && (
                          <View style={s.breakPill}>
                            <Ionicons name="cafe-outline" size={10} color="#9CA3AF" />
                            <Text style={s.breakPillText}>{breakMin >= 60 ? `${Math.round(breakMin/60)}h` : `${breakMin}m`}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {log.totalMinutes != null && (
                      <Text style={[s.logTotal, log.overtimeDay && { color: '#EF4444' }]}>
                        {fmtHours(log.totalMinutes)}{log.overtimeDay ? ' OT' : ''}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Info */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="shield-outline" size={17} color="#9CA3AF" />
            </View>
            <Text style={s.infoText}>Rol: Empleado</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="information-circle-outline" size={17} color="#9CA3AF" />
            </View>
            <Text style={s.infoText}>Contacta a tu patrono para resetear tu contraseña.</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={17} color="#EF4444" />
          <Text style={s.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20, gap: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24, padding: 28, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  avatar:     { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 28 },
  name:       { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  email:      { fontSize: 14, color: '#9CA3AF' },
  bizPill:    { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  bizText:    { fontSize: 13, fontWeight: '700' },

  // Mis horas card
  hoursCard: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 3,
    gap: 14,
  },
  hoursHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hoursIconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  hoursTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },

  periodNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F9FAFB',
    borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  periodLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  currentTag:  { fontSize: 11, fontWeight: '700', marginTop: 2 },

  totalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  totalLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  totalHours: { fontSize: 18, fontWeight: '800' },

  emptyText: { color: '#9CA3AF', textAlign: 'center', paddingVertical: 16, fontSize: 14 },

  logRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  logDate:  { fontSize: 13, fontWeight: '700', color: '#111827' },
  logTime:  { fontSize: 13, color: '#374151', fontWeight: '500' },
  logTotal: { fontSize: 14, fontWeight: '800', color: '#111827' },
  breakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F9FAFB', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  breakPillText: { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  // Info + logout
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
    gap: 12,
  },
  infoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center',
  },
  infoText: { fontSize: 14, color: '#374151', flex: 1 },
  divider:  { height: 1, backgroundColor: '#F3F4F6' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16,
    backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
    shadowColor: '#EF4444', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },
});
