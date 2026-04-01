import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee, TimeLog } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPayPeriodDates(business: { payPeriodType?: string; payPeriodStartDay?: number; payPeriodAnchorDate?: string }): { start: Date; end: Date; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const type = business.payPeriodType ?? 'weekly';
  const startDay = business.payPeriodStartDay ?? 0;

  if (type === 'semi-monthly') {
    const d = today.getDate();
    const start = new Date(today.getFullYear(), today.getMonth(), d <= 15 ? 1 : 16);
    const end   = new Date(today.getFullYear(), today.getMonth(), d <= 15 ? 15 : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
    end.setHours(23, 59, 59);
    return { start, end, label: `${start.toLocaleDateString([],{month:'short',day:'numeric'})} – ${end.toLocaleDateString([],{month:'short',day:'numeric'})}` };
  }

  if (type === 'biweekly' && business.payPeriodAnchorDate) {
    // Use the anchor: find the most recent period start <= today by counting 14-day cycles
    const anchor = new Date(business.payPeriodAnchorDate + 'T00:00:00');
    const daysSinceAnchor = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
    const cycleDay = ((daysSinceAnchor % 14) + 14) % 14; // days into current cycle
    const start = new Date(today); start.setDate(today.getDate() - cycleDay);
    const end   = new Date(start); end.setDate(start.getDate() + 13); end.setHours(23, 59, 59);
    return { start, end, label: `${start.toLocaleDateString([],{month:'short',day:'numeric'})} – ${end.toLocaleDateString([],{month:'short',day:'numeric'})}` };
  }

  // Weekly (or biweekly without anchor — fall back to day-of-week alignment)
  const days = type === 'biweekly' ? 14 : 7;
  const diff = (today.getDay() - startDay + 7) % 7;
  const start = new Date(today); start.setDate(today.getDate() - diff);
  const end   = new Date(start); end.setDate(start.getDate() + days - 1); end.setHours(23, 59, 59);
  return { start, end, label: `${start.toLocaleDateString([],{month:'short',day:'numeric'})} – ${end.toLocaleDateString([],{month:'short',day:'numeric'})}` };
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Sum of all fully completed breaks in ms (supports both new breaks[] and legacy fields)
function completedBreakMs(log: TimeLog): number {
  const breaks = log.breaks || [];
  if (breaks.length > 0) {
    return breaks
      .filter(b => b.start && b.end)
      .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0);
  }
  // Legacy single-break fallback
  if (log.breakStart && log.breakEnd) {
    return new Date(log.breakEnd).getTime() - new Date(log.breakStart).getTime();
  }
  return 0;
}

// Shift elapsed: stops accumulating once a break starts (until break ends)
function shiftElapsedSeconds(log: TimeLog) {
  if (!log.clockIn) return 0;
  const breaks = log.breaks || [];
  const lastBreak = breaks[breaks.length - 1];
  const doneBreakMs = completedBreakMs(log);
  // Freeze at the moment the current break started
  const shiftEnd = log.status === 'on_break' && lastBreak?.start
    ? new Date(lastBreak.start).getTime()
    : Date.now();
  return Math.max(0, Math.floor((shiftEnd - new Date(log.clockIn).getTime() - doneBreakMs) / 1000));
}

// Break elapsed: time since current (last) break started, resets each break
function breakElapsedSeconds(log: TimeLog) {
  if (log.status !== 'on_break') return 0;
  const breaks = log.breaks || [];
  const lastBreak = breaks[breaks.length - 1];
  const breakStart = lastBreak?.start ?? log.breakStart; // legacy fallback
  if (!breakStart) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(breakStart).getTime()) / 1000));
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; fg: string }> = {
    clocked_in:   { label: '● Clocked In',  bg: '#D1FAE5', fg: '#065F46' },
    on_break:     { label: '☕ On Break',    bg: '#FEF3C7', fg: '#92400E' },
    clocked_out:  { label: '✓ Clocked Out', bg: '#F3F4F6', fg: '#6B7280' },
    missed_punch: { label: '⚠ Missed Punch',bg: '#FEE2E2', fg: '#991B1B' },
  };
  const c = cfg[status] ?? { label: status, bg: '#F9FAFB', fg: '#6B7280' };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}

// ── Inline time picker ────────────────────────────────────────────────────────

const HOURS = [12,1,2,3,4,5,6,7,8,9,10,11];
const MINS  = [0,5,10,15,20,25,30,35,40,45,50,55];

function parseIso(iso?: string): { h: number; m: number; ap: 'AM'|'PM' } {
  if (!iso) return { h: 12, m: 0, ap: 'AM' };
  const d = new Date(iso);
  const hr = d.getHours();
  return { h: hr % 12 === 0 ? 12 : hr % 12, m: d.getMinutes(), ap: hr >= 12 ? 'PM' : 'AM' };
}

function applyTime(baseIso: string | undefined, h: number, m: number, ap: 'AM'|'PM'): string {
  const base = baseIso ? new Date(baseIso) : new Date();
  const h24 = ap === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  base.setHours(h24, m, 0, 0);
  return base.toISOString();
}

function InlineTimePicker({
  label, value, color, onChange,
}: { label: string; value?: string; color: string; onChange: (iso: string) => void }) {
  const [open, setOpen] = useState(false);
  const init = parseIso(value);
  const [h, setH] = useState(init.h);
  const [m, setM] = useState(init.m);
  const [ap, setAp] = useState<'AM'|'PM'>(init.ap);

  const confirm = () => {
    onChange(applyTime(value, h, m, ap));
    setOpen(false);
  };

  return (
    <View>
      <TouchableOpacity onPress={() => { const p = parseIso(value); setH(p.h); setM(p.m); setAp(p.ap); setOpen(o => !o); }} style={s.timeField}>
        <Text style={s.timeFieldLabel}>{label}</Text>
        <Text style={[s.timeFieldValue, !value && { color: '#6B7280' }]}>
          {value ? fmt12(value) : 'Tap to set'}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#374151" />
      </TouchableOpacity>
      {open && (
        <View style={s.pickerPanel}>
          <View style={s.pickerRow}>
            {/* Hours */}
            <ScrollView style={s.pickerCol} showsVerticalScrollIndicator={false}>
              {HOURS.map(hv => (
                <TouchableOpacity key={hv} style={[s.pickerItem, h === hv && { backgroundColor: color, borderRadius: 8 }]} onPress={() => setH(hv)}>
                  <Text style={[s.pickerItemText, h === hv && { color: '#fff', fontWeight: '700' }]}>{hv}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.pickerColon}>:</Text>
            {/* Minutes */}
            <ScrollView style={s.pickerCol} showsVerticalScrollIndicator={false}>
              {MINS.map(mv => (
                <TouchableOpacity key={mv} style={[s.pickerItem, m === mv && { backgroundColor: color, borderRadius: 8 }]} onPress={() => setM(mv)}>
                  <Text style={[s.pickerItemText, m === mv && { color: '#fff', fontWeight: '700' }]}>{String(mv).padStart(2,'0')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* AM/PM */}
            <View style={s.pickerAmpm}>
              {(['AM','PM'] as const).map(a => (
                <TouchableOpacity key={a} style={[s.pickerAmpmBtn, ap === a && { backgroundColor: color, borderRadius: 8 }]} onPress={() => setAp(a)}>
                  <Text style={[s.pickerItemText, ap === a && { color: '#fff', fontWeight: '700' }]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={[s.pickerConfirm, { backgroundColor: color }]} onPress={confirm}>
            <Text style={s.pickerConfirmText}>Set {label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type TabKey = 'live' | 'logs' | 'report';

export default function TimeclockScreen() {
  const { business, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('live');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeLogs, setActiveLogs] = useState<TimeLog[]>([]);
  const [periodLogs, setPeriodLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editLog, setEditLog] = useState<TimeLog | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [tick, setTick] = useState(0);

  // Live timer tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const period = business ? getPayPeriodDates(business) : null;

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    try {
      const [emps, active] = await Promise.all([
        api.getEmployees(business.businessId),
        api.getActiveEmployees(business.businessId),
      ]);
      setEmployees(emps);
      setActiveLogs(active);

      if (period) {
        const logs = await api.getTimeLogs(
          business.businessId,
          toDateStr(period.start),
          toDateStr(period.end)
        );
        setPeriodLogs(logs);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [business?.businessId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const empName = (employeeId: string) => {
    const e = employees.find(e => e.userId === employeeId || e.employeeId === employeeId);
    return e ? `${e.firstName} ${e.lastName}` : 'Unknown';
  };

  // ── Report: aggregate per employee, broken into 7-day weeks within the period ──

  // Split the pay period into weekly buckets (7 days each)
  function getPeriodWeeks(p: { start: Date; end: Date }): { start: Date; end: Date; label: string }[] {
    const weeks: { start: Date; end: Date; label: string }[] = [];
    const cursor = new Date(p.start);
    let weekNum = 1;
    while (cursor <= p.end) {
      const wStart = new Date(cursor);
      const wEnd = new Date(cursor);
      wEnd.setDate(wEnd.getDate() + 6);
      if (wEnd > p.end) wEnd.setTime(p.end.getTime());
      wEnd.setHours(23, 59, 59);
      const fmt = (d: Date) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      weeks.push({ start: wStart, end: wEnd, label: `Week ${weekNum}: ${fmt(wStart)} – ${fmt(wEnd)}` });
      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }
    return weeks;
  }

  const periodWeeks = period ? getPeriodWeeks(period) : [];

  const reportByEmployee = employees.map(emp => {
    const empId = emp.userId || emp.employeeId;
    const empLogs = periodLogs.filter(l => l.employeeId === empId && l.status === 'clocked_out');
    if (empLogs.length === 0) return null;

    const weeks = periodWeeks.map(week => {
      const wLogs = empLogs.filter(l => {
        const d = new Date(l.clockIn);
        return d >= week.start && d <= week.end;
      });
      const totalMin = wLogs.reduce((s, l) => s + (l.totalMinutes ?? 0), 0);
      const overtimeDays = wLogs.filter(l => l.overtimeDay).length;
      return { label: week.label, totalMin, overtimeDays };
    }).filter(w => w.totalMin > 0);

    const totalMin = empLogs.reduce((s, l) => s + (l.totalMinutes ?? 0), 0);
    const overtimeWeek = weeks.some(w => w.totalMin > 2400); // any week > 40h
    const missed = periodLogs.filter(l => l.employeeId === empId && l.missedBreakPunch).length;
    return { emp, weeks, totalMin, overtimeWeek, missed };
  }).filter(Boolean) as { emp: Employee; weeks: { label: string; totalMin: number; overtimeDays: number }[]; totalMin: number; overtimeWeek: boolean; missed: number }[];

  // ── PDF export ────────────────────────────────────────────────────────────

  const handleExport = async () => {
    try {
      if (periodLogs.length === 0) { Alert.alert('No data', 'No time records for this period.'); return; }
      if (!period) return;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Not supported', 'Sharing is not available on this device.'); return; }

      const weeks = getPeriodWeeks(period);
      const generatedDate = new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

      // Build week sections HTML
      let weekSections = '';
      for (const week of weeks) {
        const weekLogs = periodLogs
          .filter(l => { const d = new Date(l.clockIn); return l.status === 'clocked_out' && d >= week.start && d <= week.end; })
          .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

        // Group by date
        const byDate = new Map<string, typeof weekLogs>();
        for (const l of weekLogs) {
          const key = new Date(l.clockIn).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
          if (!byDate.has(key)) byDate.set(key, []);
          byDate.get(key)!.push(l);
        }

        const weekTotal = weekLogs.filter(l => l.status === 'clocked_out').reduce((s, l) => s + (l.totalMinutes ?? 0), 0);

        let shiftRows = '';
        if (weekLogs.length === 0) {
          shiftRows = '<tr><td colspan="6" class="empty">No shifts this week</td></tr>';
        } else {
          for (const l of weekLogs) {
            const dateLabel = new Date(l.clockIn).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            const breaks = l.breaks && l.breaks.length > 0
              ? l.breaks
              : (l.breakStart ? [{ start: l.breakStart, end: l.breakEnd }] : []);
            const breakHtml = breaks.length > 0
              ? breaks.map((b, i) => `<div class="break-item">${breaks.length > 1 ? `B${i+1}: ` : ''}${fmt12(b.start)} &ndash; ${b.end ? fmt12(b.end) : 'open'}</div>`).join('')
              : '<span class="no-break">—</span>';
            const flags = [
              l.overtimeDay ? '<span class="flag ot">OT</span>' : '',
              l.missedBreakPunch ? '<span class="flag missed">Missed break</span>' : '',
            ].filter(Boolean).join(' ');
            const hours = l.totalMinutes != null ? `${(l.totalMinutes / 60).toFixed(2)}h` : '--';
            shiftRows += `
              <tr class="shift-row">
                <td class="date-cell">${dateLabel}</td>
                <td class="emp-name">${empName(l.employeeId)} ${flags}</td>
                <td>${l.clockIn ? fmt12(l.clockIn) : '--'}</td>
                <td>${breakHtml}</td>
                <td>${l.clockOut ? fmt12(l.clockOut) : '<span class="active">active</span>'}</td>
                <td class="hours">${hours}</td>
              </tr>`;
          }
        }

        weekSections += `
          <div class="week-block">
            <div class="week-header">
              <span>${week.label}</span>
              <span class="week-total">${(weekTotal / 60).toFixed(2)}h total</span>
            </div>
            <table>
              <thead><tr><th>Date</th><th>Employee</th><th>Clock In</th><th>Break</th><th>Clock Out</th><th>Hours</th></tr></thead>
              <tbody>${shiftRows}</tbody>
            </table>
          </div>`;
      }

      // Build summary section HTML
      const summaryEmployees = employees.filter(emp =>
        periodLogs.some(l => l.employeeId === (emp.userId || emp.employeeId) && l.status === 'clocked_out')
      );

      let summaryRows = '';
      for (const emp of summaryEmployees) {
        const empId = emp.userId || emp.employeeId;
        let weekCells = '';
        let grandTotal = 0;
        for (const week of weeks) {
          const mins = periodLogs
            .filter(l => { const d = new Date(l.clockIn); return l.employeeId === empId && l.status === 'clocked_out' && d >= week.start && d <= week.end; })
            .reduce((s, l) => s + (l.totalMinutes ?? 0), 0);
          grandTotal += mins;
          weekCells += `<td class="${mins > 2400 ? 'ot-cell' : ''}">${mins > 0 ? `${(mins / 60).toFixed(2)}h` : '&ndash;'}</td>`;
        }
        summaryRows += `<tr><td class="emp-name">${emp.firstName} ${emp.lastName}</td>${weekCells}<td class="total-cell">${(grandTotal / 60).toFixed(2)}h</td></tr>`;
      }

      const weekHeaders = weeks.map(w => `<th>${w.label}</th>`).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8"/>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, Helvetica, sans-serif; color: #111827; padding: 36px; font-size: 13px; }
            .header { margin-bottom: 28px; }
            .header h1 { font-size: 22px; font-weight: 800; color: ${primaryColor}; }
            .header .meta { color: #6B7280; font-size: 12px; margin-top: 4px; }
            .section-title { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; margin: 28px 0 12px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 6px; }
            .week-block { margin-bottom: 24px; }
            .week-header { display: flex; justify-content: space-between; align-items: center; background: ${primaryColor}18; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; }
            .week-header span { font-weight: 700; font-size: 13px; color: ${primaryColor}; }
            .week-header .week-total { font-size: 14px; font-weight: 800; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #F9FAFB; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
            td { padding: 7px 10px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
            .day-label { font-weight: 700; font-size: 12px; color: #374151; background: #F9FAFB; padding: 6px 10px; }
            .date-cell { font-weight: 700; color: #374151; white-space: nowrap; }
            .emp-name { font-weight: 600; }
            .hours { font-weight: 700; text-align: right; }
            .total-cell { font-weight: 800; font-size: 14px; text-align: right; color: ${primaryColor}; }
            .ot-cell { color: #DC2626; font-weight: 700; }
            .break-item { display: block; font-size: 11px; color: #D97706; }
            .no-break { font-size: 12px; color: #6B7280; }
            .active { color: #10B981; font-weight: 600; }
            .flag { font-size: 10px; font-weight: 700; border-radius: 4px; padding: 1px 5px; margin-left: 4px; }
            .flag.ot { background: #FEE2E2; color: #DC2626; }
            .flag.missed { background: #FEF3C7; color: #D97706; }
            .empty { color: #374151; font-weight: 600; font-style: italic; padding: 12px 10px; background: #F9FAFB; }
            .summary-table th, .summary-table td { text-align: center; }
            .summary-table td:first-child, .summary-table th:first-child { text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Payroll Report</h1>
            <div class="meta">Pay Period: ${period.label} &nbsp;&bull;&nbsp; Generated: ${generatedDate}</div>
          </div>

          <div class="section-title">Shifts by Week</div>
          ${weekSections}

          <div class="section-title">Summary</div>
          <table class="summary-table">
            <thead><tr><th>Employee</th>${weekHeaders}<th>Total</th></tr></thead>
            <tbody>${summaryRows}</tbody>
          </table>
        </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      // Copy to a human-readable filename: "Payroll Report Mar 28 - Apr 10.pdf"
      const friendlyName = `Payroll Report ${period.label}.pdf`;
      const namedUri = `${FileSystem.cacheDirectory}${friendlyName}`;
      await FileSystem.copyAsync({ from: uri, to: namedUri });
      await Sharing.shareAsync(namedUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Export Payroll Report' });
    } catch (err: any) {
      Alert.alert('Export failed', err.message);
    }
  };

  // ── Edit log save ─────────────────────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!editLog) return;
    setEditSaving(true);
    try {
      const updated = await api.updateTimeLog(editLog.logId, {
        clockIn: editLog.clockIn,
        clockOut: editLog.clockOut,
        breakStart: editLog.breakStart,
        breakEnd: editLog.breakEnd,
      });
      setPeriodLogs(prev => prev.map(l => l.logId === updated.logId ? updated : l));
      setEditLog(null);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setEditSaving(false); }
  };

  if (!business) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
      <AnimatedBackground primaryColor={primaryColor} />
      <Text style={{ color:'rgba(255,255,255,0.85)', fontSize:14, textAlign:'center' }}>Set up your business in Settings first.</Text>
    </View>
  );

  if (loading) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
      <AnimatedBackground primaryColor={primaryColor} />
      <ActivityIndicator color={primaryColor} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AnimatedBackground primaryColor={primaryColor} />

      {/* Tabs */}
      <View style={[s.tabBar, { paddingTop: insets.top }]}>
        {([['live','Live'],['logs','Time Logs'],['report','Report']] as [TabKey,string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
            onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && { color: primaryColor, fontWeight: '700' }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        alwaysBounceVertical
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={primaryColor} />}
      >

        {/* ── LIVE TAB ── */}
        {tab === 'live' && (
          <>
            <Text style={s.periodLabel}>Today · {new Date().toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' })}</Text>

            {employees.length === 0 ? (
              <View style={s.emptyCard}><Text style={s.emptyText}>No employees yet.</Text></View>
            ) : employees.map(emp => {
              const empId = emp.userId || emp.employeeId;
              // Among all logs for this employee, pick the most recent by clockIn time.
              // This handles timezone edge cases where a previous evening shift may share
              // the same UTC date as today's shift.
              const empLogs = activeLogs
                .filter(l => l.employeeId === empId)
                .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
              const log = empLogs[0] ?? null;
              const status = log?.status ?? 'not_in';
              void tick; // force re-render for timer
              // Show break clock when on break, shift clock otherwise
              const rawSecs = !log || status === 'clocked_out' ? 0
                : status === 'on_break' ? breakElapsedSeconds(log)
                : shiftElapsedSeconds(log);
              const secs = isNaN(rawSecs) || rawSecs < 0 ? 0 : rawSecs;
              const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), sec = secs % 60;
              const timeStr = h > 0
                ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
                : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;

              const liveColor = status === 'on_break' ? '#D97706' : '#10B981';
              const isActive  = status === 'clocked_in' || status === 'on_break';

              return (
                <View key={emp.employeeId} style={[
                  s.liveCard,
                  isActive && { borderColor: liveColor, borderWidth: 1.5 },
                ]}>
                  <View style={[s.liveAvatar, {
                    backgroundColor: status === 'clocked_in' ? '#10B981' : status === 'on_break' ? '#D97706' : '#E5E7EB',
                  }]}>
                    <Text style={s.liveAvatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.liveName}>{emp.firstName} {emp.lastName}</Text>
                    {log ? (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <StatusBadge status={status} />
                          {status !== 'clocked_out' && (
                            <Text style={[s.liveTimer, { color: '#fff' }]}>{timeStr}</Text>
                          )}
                        </View>
                        {log.clockIn && (
                          <Text style={s.liveDetail}>
                            In: {fmt12(log.clockIn)}{log.clockOut ? `  ·  Out: ${fmt12(log.clockOut)}` : ''}
                          </Text>
                        )}
                        {log.missedBreakPunch && (
                          <View style={s.missedRow}>
                            <Ionicons name="warning-outline" size={12} color="#991B1B" />
                            <Text style={s.missedText}>Missed break punch</Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={s.notClockedText}>Not clocked in</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── LOGS TAB ── */}
        {tab === 'logs' && (
          <>
            <Text style={s.periodLabel}>Pay period: {period?.label}</Text>

            {periodLogs.length === 0 ? (
              <View style={s.emptyCard}><Text style={s.emptyText}>No records for this period.</Text></View>
            ) : periodLogs.sort((a,b) => a.date.localeCompare(b.date)).map(log => (
              <View key={log.logId} style={s.logCard}>
                <View style={s.logHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.logName}>{empName(log.employeeId)}</Text>
                    <Text style={s.logDate}>{fmtDate(log.clockIn)}</Text>
                  </View>
                  <StatusBadge status={log.status} />
                  <TouchableOpacity onPress={() => setEditLog({ ...log })} style={s.editBtn}>
                    <Ionicons name="create-outline" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                {/* 3-column: In | Breaks | Out */}
                <View style={s.logTimes}>
                  <View style={s.logTimeItem}>
                    <Text style={s.logTimeLabel}>In</Text>
                    <Text style={s.logTimeValue}>{log.clockIn ? fmt12(log.clockIn) : '—'}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={12} color="#E5E7EB" />
                  {/* Middle column: all breaks stacked vertically */}
                  <View style={s.logBreaksCol}>
                    {(log.breaks && log.breaks.length > 0 ? log.breaks : (
                      log.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : []
                    )).length > 0 ? (
                      (log.breaks && log.breaks.length > 0 ? log.breaks : [{ start: log.breakStart!, end: log.breakEnd }])
                        .map((b, i) => {
                          const multi = (log.breaks?.length ?? 0) > 1;
                          return (
                            <View key={i} style={s.logTimeItem}>
                              <Text style={s.logTimeLabel}>{multi ? `Break ${i + 1}` : 'Break'}</Text>
                              <Text style={s.logTimeValue}>{fmt12(b.start)}{b.end ? ` – ${fmt12(b.end)}` : ' …'}</Text>
                            </View>
                          );
                        })
                    ) : (
                      <View style={s.logTimeItem}>
                        <Text style={s.logTimeLabel}>Break</Text>
                        <Text style={[s.logTimeValue, { color: '#6B7280' }]}>—</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="arrow-forward" size={12} color="#E5E7EB" />
                  <View style={s.logTimeItem}>
                    <Text style={s.logTimeLabel}>Out</Text>
                    <Text style={s.logTimeValue}>{log.clockOut ? fmt12(log.clockOut) : '—'}</Text>
                  </View>
                </View>
                <View style={s.logFooter}>
                  {log.totalMinutes != null && (
                    <Text style={[s.logTotal, log.overtimeDay && { color: '#EF4444' }]}>
                      {fmtHours(log.totalMinutes)}{log.overtimeDay ? ' ⚠ OT' : ''}
                    </Text>
                  )}
                  {log.missedBreakPunch && (
                    <View style={s.missedRow}>
                      <Ionicons name="warning-outline" size={12} color="#991B1B" />
                      <Text style={s.missedText}>Missed break punch</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}

            {/* Edit log inline */}
            {editLog && (
              <View style={[s.editCard, { borderColor: primaryColor }]}>
                <Text style={[s.editTitle, { color: primaryColor }]}>Edit Time Record</Text>
                <Text style={s.editEmpName}>{empName(editLog.employeeId)} · {fmtDate(editLog.clockIn)}</Text>
                <View style={s.editGrid}>
                  <InlineTimePicker label="Clock In"    value={editLog.clockIn}    color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, clockIn: v }    : l)} />
                  <InlineTimePicker label="Break Start" value={editLog.breakStart} color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, breakStart: v } : l)} />
                  <InlineTimePicker label="Break End"   value={editLog.breakEnd}   color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, breakEnd: v }   : l)} />
                  <InlineTimePicker label="Clock Out"   value={editLog.clockOut}   color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, clockOut: v }   : l)} />
                </View>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity style={s.editCancelBtn} onPress={() => setEditLog(null)}>
                    <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.editSaveBtn, { backgroundColor: primaryColor }]}
                    onPress={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── REPORT TAB ── */}
        {tab === 'report' && (
          <>
            <View style={s.periodRow}>
              <Text style={s.periodLabel}>Pay period: {period?.label}</Text>
              <TouchableOpacity onPress={handleExport} style={s.exportBtn}>
                <Ionicons name="download-outline" size={14} color="#fff" />
                <Text style={s.exportText}>PDF</Text>
              </TouchableOpacity>
            </View>

            {reportByEmployee.length === 0 ? (
              <View style={s.emptyCard}><Text style={s.emptyText}>No completed shifts this period.</Text></View>
            ) : reportByEmployee.map(({ emp, weeks, totalMin, overtimeWeek, missed }) => (
              <View key={emp.employeeId} style={s.reportCard}>
                {/* Employee header */}
                <View style={s.reportHeader}>
                  <View style={[s.liveAvatar, { backgroundColor: primaryColor }]}>
                    <Text style={s.liveAvatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.liveName}>{emp.firstName} {emp.lastName}</Text>
                    <Text style={s.logDate}>{emp.email}</Text>
                  </View>
                </View>

                {/* Week-by-week breakdown */}
                <View style={s.reportWeeks}>
                  {weeks.map((w, i) => (
                    <View key={i} style={s.reportWeekRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.reportWeekLabel}>{w.label}</Text>
                        {w.overtimeDays > 0 && (
                          <Text style={s.reportWeekOt}>{w.overtimeDays} day OT (&gt;8h)</Text>
                        )}
                      </View>
                      <Text style={[s.reportWeekHours, w.totalMin > 2400 && { color: '#EF4444' }]}>
                        {fmtHours(w.totalMin)}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Total + flags */}
                <View style={s.reportTotalRow}>
                  <Text style={s.reportTotalLabel}>Total</Text>
                  <Text style={[s.reportTotal, overtimeWeek && { color: '#EF4444' }]}>
                    {fmtHours(totalMin)}
                  </Text>
                </View>

                {(overtimeWeek || missed > 0) && (
                  <View style={s.reportFlags}>
                    {overtimeWeek && (
                      <View style={s.flagBadge}>
                        <Ionicons name="warning-outline" size={12} color="#EF4444" />
                        <Text style={[s.flagText, { color: '#EF4444' }]}>Weekly OT (&gt;40h)</Text>
                      </View>
                    )}
                    {missed > 0 && (
                      <View style={[s.flagBadge, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="cafe-outline" size={12} color="#991B1B" />
                        <Text style={[s.flagText, { color: '#991B1B' }]}>{missed} missed punch{missed > 1 ? 'es' : ''}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  emptyText: { color: '#374151', fontSize: 14, textAlign: 'center' },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.60)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.15)' },
  exportText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  // Live card
  liveCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  liveAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  liveAvatarText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  liveName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  liveTimer: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  liveDetail: { fontSize: 12, color: '#6B7280' },
  notClockedText: { fontSize: 13, color: '#6B7280' },

  missedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  missedText: { fontSize: 11, color: '#991B1B', fontWeight: '600' },

  badge: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  // Log card
  logCard: {
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  logHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  logName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  logDate: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  editBtn: { padding: 4 },
  logTimes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logTimeItem: { alignItems: 'center', gap: 2 },
  logBreaksCol: { alignItems: 'center', gap: 6 },
  logTimeLabel: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  logTimeValue: { fontSize: 13, fontWeight: '600', color: '#111827' },
  logFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  logTotal: { fontSize: 14, fontWeight: '800', color: '#111827' },

  // Edit card
  editCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 12,
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  editTitle: { fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  editEmpName: { fontSize: 13, color: '#6B7280' },
  editGrid: { gap: 8 },
  timeField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  timeFieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  timeFieldValue: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1, marginLeft: 8 },
  pickerPanel: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10, marginTop: 4, gap: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pickerCol: { flex: 1, maxHeight: 140 },
  pickerColon: { fontSize: 18, fontWeight: '700', color: '#374151', paddingHorizontal: 2 },
  pickerAmpm: { gap: 6, justifyContent: 'center' },
  pickerAmpmBtn: { paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  pickerItem: { paddingVertical: 8, alignItems: 'center' },
  pickerItemText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  pickerConfirm: { borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  pickerConfirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  editCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  editSaveBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },

  // Report card
  reportCard: {
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 14, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)',
    shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportWeeks: { gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  reportWeekRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportWeekLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  reportWeekOt: { fontSize: 11, color: '#D97706', fontWeight: '600', marginTop: 1 },
  reportWeekHours: { fontSize: 15, fontWeight: '800', color: '#111827' },
  reportTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  reportTotalLabel: { fontSize: 13, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 },
  reportTotal: { fontSize: 20, fontWeight: '800', color: '#111827' },
  reportFlags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  flagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  flagText: { fontSize: 11, fontWeight: '700' },
});
