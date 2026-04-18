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
  return new Date(iso).toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getPayPeriodDates(
  business: { payPeriodType?: string; payPeriodStartDay?: number; payPeriodAnchorDate?: string },
  offset = 0  // 0 = current, -1 = previous, -2 = two back, etc.
): { start: Date; end: Date; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const type = business.payPeriodType ?? 'weekly';
  const startDay = business.payPeriodStartDay ?? 0;
  const fmt = (d: Date) => d.toLocaleDateString('es', { month: 'short', day: 'numeric' });

  if (type === 'semi-monthly') {
    // Find current half-month, then apply offset
    const d = today.getDate();
    let month = today.getMonth();
    let year  = today.getFullYear();
    // Current half: 0 = first half (1–15), 1 = second half (16–end)
    let half = d <= 15 ? 0 : 1;
    // Apply offset (each offset = one half-month)
    let totalHalf = month * 2 + half + offset;
    // Normalize
    month = Math.floor(totalHalf / 2);
    year  = today.getFullYear() + Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;
    half  = ((totalHalf % 2) + 2) % 2;
    const start = new Date(year, month, half === 0 ? 1 : 16);
    const end   = new Date(year, month, half === 0 ? 15 : new Date(year, month + 1, 0).getDate());
    end.setHours(23, 59, 59);
    return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
  }

  // For weekly and biweekly, find the current period start then shift by offset periods
  const periodDays = type === 'biweekly' ? 14 : 7;

  let currentStart: Date;
  if (type === 'biweekly' && business.payPeriodAnchorDate) {
    const anchor = new Date(business.payPeriodAnchorDate + 'T00:00:00');
    const daysSinceAnchor = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
    const cycleDay = ((daysSinceAnchor % 14) + 14) % 14;
    currentStart = new Date(today);
    currentStart.setDate(today.getDate() - cycleDay);
  } else {
    const diff = (today.getDay() - startDay + 7) % 7;
    currentStart = new Date(today);
    currentStart.setDate(today.getDate() - diff);
  }

  // Apply offset
  const start = new Date(currentStart);
  start.setDate(currentStart.getDate() + offset * periodDays);
  const end = new Date(start);
  end.setDate(start.getDate() + periodDays - 1);
  end.setHours(23, 59, 59);

  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
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
    clocked_in:   { label: '● Activo',          bg: '#D1FAE5', fg: '#065F46' },
    on_break:     { label: '☕ En Descanso',     bg: '#FEF3C7', fg: '#92400E' },
    clocked_out:  { label: '✓ Terminó',          bg: '#F3F4F6', fg: '#6B7280' },
    missed_punch: { label: '⚠ Marcaje Perdido', bg: '#FEE2E2', fg: '#991B1B' },
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
            <Text style={s.pickerConfirmText}>Aplicar {label}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

type TabKey = 'live' | 'report';

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
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, -1 = previous, etc.
  const [expandedEmps, setExpandedEmps] = useState<Set<string>>(new Set());

  // Live timer tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const period = business ? getPayPeriodDates(business, periodOffset) : null;
  // Key changes whenever the visible period window changes
  const periodKey = period ? `${toDateStr(period.start)}|${toDateStr(period.end)}` : '';

  const load = useCallback(async () => {
    if (!business?.businessId || !periodKey) return;
    const p = business ? getPayPeriodDates(business, periodOffset) : null;
    try {
      const [emps, active] = await Promise.all([
        api.getEmployees(business.businessId),
        api.getActiveEmployees(business.businessId),
      ]);
      setEmployees(emps);
      setActiveLogs(active);

      if (p) {
        const logs = await api.getTimeLogs(
          business.businessId,
          toDateStr(p.start),
          toDateStr(p.end)
        );
        setPeriodLogs(logs);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [business?.businessId, periodKey]);

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
      const fmt = (d: Date) => d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
      weeks.push({ start: wStart, end: wEnd, label: `Semana ${weekNum}: ${fmt(wStart)} – ${fmt(wEnd)}` });
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
      if (periodLogs.length === 0) { Alert.alert('Sin datos', 'No hay registros de tiempo en este período.'); return; }
      if (!period) return;

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('No disponible', 'El compartir no está disponible en este dispositivo.'); return; }

      const weeks = getPeriodWeeks(period);
      const generatedDate = new Date().toLocaleDateString('es', { month: 'long', day: 'numeric', year: 'numeric' });

      // Build week sections HTML
      let weekSections = '';
      for (const week of weeks) {
        const weekLogs = periodLogs
          .filter(l => { const d = new Date(l.clockIn); return l.status === 'clocked_out' && d >= week.start && d <= week.end; })
          .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

        // Group by date
        const byDate = new Map<string, typeof weekLogs>();
        for (const l of weekLogs) {
          const key = new Date(l.clockIn).toLocaleDateString('es', { weekday: 'long', month: 'long', day: 'numeric' });
          if (!byDate.has(key)) byDate.set(key, []);
          byDate.get(key)!.push(l);
        }

        const weekTotal = weekLogs.filter(l => l.status === 'clocked_out').reduce((s, l) => s + (l.totalMinutes ?? 0), 0);

        let shiftRows = '';
        if (weekLogs.length === 0) {
          shiftRows = '<tr><td colspan="6" class="empty">Sin turnos esta semana</td></tr>';
        } else {
          for (const l of weekLogs) {
            const dateLabel = new Date(l.clockIn).toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' });
            const breaks = l.breaks && l.breaks.length > 0
              ? l.breaks
              : (l.breakStart ? [{ start: l.breakStart, end: l.breakEnd }] : []);
            const breakHtml = breaks.length > 0
              ? breaks.map((b, i) => `<div class="break-item">${breaks.length > 1 ? `B${i+1}: ` : ''}${fmt12(b.start)} &ndash; ${b.end ? fmt12(b.end) : 'open'}</div>`).join('')
              : '<span class="no-break">—</span>';
            const flags = [
              l.overtimeDay ? '<span class="flag ot">OT</span>' : '',
              l.missedBreakPunch ? '<span class="flag missed">Marcaje perdido</span>' : '',
            ].filter(Boolean).join(' ');
            const hours = l.totalMinutes != null ? `${(l.totalMinutes / 60).toFixed(2)}h` : '--';
            shiftRows += `
              <tr class="shift-row">
                <td class="date-cell">${dateLabel}</td>
                <td class="emp-name">${empName(l.employeeId)} ${flags}</td>
                <td>${l.clockIn ? fmt12(l.clockIn) : '--'}</td>
                <td>${breakHtml}</td>
                <td>${l.clockOut ? fmt12(l.clockOut) : '<span class="active">activo</span>'}</td>
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
              <thead><tr><th>Fecha</th><th>Empleado</th><th>Entrada</th><th>Descanso</th><th>Salida</th><th>Horas</th></tr></thead>
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
            <h1>Reporte de Nómina</h1>
            <div class="meta">Período de Pago: ${period.label} &nbsp;&bull;&nbsp; Generado: ${generatedDate}</div>
          </div>

          <div class="section-title">Turnos por Semana</div>
          ${weekSections}

          <div class="section-title">Resumen</div>
          <table class="summary-table">
            <thead><tr><th>Empleado</th>${weekHeaders}<th>Total</th></tr></thead>
            <tbody>${summaryRows}</tbody>
          </table>
        </body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      // Copy to a human-readable filename: "Payroll Report Mar 28 - Apr 10.pdf"
      const friendlyName = `Reporte de Nómina ${period.label}.pdf`;
      const namedUri = `${FileSystem.cacheDirectory}${friendlyName}`;
      await FileSystem.copyAsync({ from: uri, to: namedUri });
      await Sharing.shareAsync(namedUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Exportar Reporte de Nómina' });
    } catch (err: any) {
      Alert.alert('Error al exportar', err.message);
    }
  };

  // ── Edit log save ─────────────────────────────────────────────────────────

  const handleSaveEdit = async () => {
    if (!editLog) return;
    setEditSaving(true);
    try {
      // Convert legacy breakStart/breakEnd fields into the breaks array the API expects
      let breaks = editLog.breaks && editLog.breaks.length > 0 ? [...editLog.breaks] : [];
      if (breaks.length === 0 && editLog.breakStart) {
        breaks = [{ start: editLog.breakStart, end: editLog.breakEnd }];
      } else if (breaks.length === 1) {
        // Keep the array but update from the edit fields if they changed
        if (editLog.breakStart) breaks[0] = { start: editLog.breakStart, end: editLog.breakEnd };
      }

      const updated = await api.updateTimeLog(editLog.logId, {
        clockIn: editLog.clockIn,
        clockOut: editLog.clockOut,
        breaks,
      });
      setPeriodLogs(prev => prev.map(l => l.logId === updated.logId ? updated : l));
      setEditLog(null);
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setEditSaving(false); }
  };

  if (!business) return (
    <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
      <AnimatedBackground primaryColor={primaryColor} />
      <Text style={{ color:'#374151', fontSize:14, textAlign:'center' }}>Configura tu negocio en Ajustes primero.</Text>
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
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={primaryColor} />

      {/* Tabs */}
      <View style={[s.tabBar, { paddingTop: insets.top }]}>
        {([['live','En Vivo'],['report','Reporte']] as [TabKey,string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[s.tab, tab === key && { borderBottomColor: primaryColor, borderBottomWidth: 2 }]}
            onPress={() => { setTab(key as TabKey); if (key === 'live') setPeriodOffset(0); }}>
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
            <Text style={s.periodLabel}>Hoy · {new Date().toLocaleDateString('es', { weekday:'long', month:'long', day:'numeric' })}</Text>

            {employees.length === 0 ? (
              <View style={s.emptyCard}><Text style={s.emptyText}>Sin empleados aún.</Text></View>
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
                            <Text style={s.missedText}>Marcaje de descanso perdido</Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={s.notClockedText}>No ha marcado entrada</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ── REPORTE TAB (Reporte + Registros unificados) ── */}
        {tab === 'report' && (() => {
          const toggleEmp = (id: string) => setExpandedEmps(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
          });

          // All employees — show even those without logs this period
          const empRows = employees.map(emp => {
            const empId = emp.userId || emp.employeeId;
            const empLogs = periodLogs.filter(l => l.employeeId === empId && l.status === 'clocked_out');
            const totalMin = empLogs.reduce((s, l) => s + (l.totalMinutes ?? 0), 0);
            const weeks = periodWeeks.map(week => {
              const wLogs = empLogs.filter(l => {
                const d = new Date(l.clockIn);
                return d >= week.start && d <= week.end;
              });
              return { label: week.label, totalMin: wLogs.reduce((s, l) => s + (l.totalMinutes ?? 0), 0), overtimeDays: wLogs.filter(l => l.overtimeDay).length };
            }).filter(w => w.totalMin > 0);
            const overtimeWeek = weeks.some(w => w.totalMin > 2400);
            const missed = periodLogs.filter(l => l.employeeId === empId && l.missedBreakPunch).length;
            // All logs (any status) sorted by date, for the expanded view
            const allEmpLogs = periodLogs.filter(l => l.employeeId === empId)
              .slice().sort((a, b) => a.clockIn.localeCompare(b.clockIn));
            return { emp, empId, empLogs, allEmpLogs, totalMin, weeks, overtimeWeek, missed };
          });

          return (
            <>
              {/* Period navigation */}
              <View style={s.periodNavWrapper}>
                {/* Header row: label + volver button */}
                <View style={s.periodNavHeader}>
                  <Text style={[s.periodNavTitle, periodOffset === 0 && { color: primaryColor }]}>
                    {periodOffset === 0 ? 'Período actual' : 'Período anterior'}
                  </Text>
                  {periodOffset < 0 && (
                    <TouchableOpacity onPress={() => setPeriodOffset(0)} style={[s.periodVolverBtn, { borderColor: primaryColor }]}>
                      <Ionicons name="arrow-forward-outline" size={12} color={primaryColor} />
                      <Text style={[s.periodVolverText, { color: primaryColor }]}>Volver al actual</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {/* Arrows + date + PDF */}
                <View style={[s.periodNav, periodOffset === 0 && { borderColor: primaryColor, borderWidth: 1.5 }]}>
                  <TouchableOpacity onPress={() => setPeriodOffset(o => o - 1)} style={s.periodNavBtn}>
                    <Ionicons name="chevron-back" size={18} color="#374151" />
                  </TouchableOpacity>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.periodLabel}>{period?.label}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => { if (periodOffset < 0) setPeriodOffset(o => o + 1); }}
                      style={[s.periodNavBtn, periodOffset === 0 && { opacity: 0.25 }]}
                      disabled={periodOffset === 0}
                    >
                      <Ionicons name="chevron-forward" size={18} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleExport} style={s.exportBtn}>
                      <Ionicons name="download-outline" size={14} color="#374151" />
                      <Text style={s.exportText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {empRows.length === 0 ? (
                <View style={s.emptyCard}><Text style={s.emptyText}>Sin empleados.</Text></View>
              ) : empRows.map(({ emp, empId, allEmpLogs, totalMin, weeks, overtimeWeek, missed }) => {
                const isExpanded = expandedEmps.has(empId);
                const hasData = totalMin > 0 || allEmpLogs.length > 0;

                return (
                  <View key={emp.employeeId} style={s.reportCard}>
                    {/* Header: avatar + name + total */}
                    <View style={s.reportHeader}>
                      <View style={[s.liveAvatar, { backgroundColor: hasData ? primaryColor : '#E5E7EB' }]}>
                        <Text style={s.liveAvatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.liveName}>{emp.firstName} {emp.lastName}</Text>
                        {hasData ? (
                          <>
                            <Text style={[s.reportTotal, { fontSize: 16 }]}>{fmtHours(totalMin)}</Text>
                            <Text style={s.hoursCaption}>horas trabajadas</Text>
                          </>
                        ) : (
                          <Text style={[s.logDate, { color: '#9CA3AF' }]}>Sin registros este período</Text>
                        )}
                      </View>
                      {hasData && (
                        <TouchableOpacity onPress={() => toggleEmp(empId)} style={s.expandIconBtn}>
                          <Text style={[s.expandIconLabel, { color: isExpanded ? primaryColor : '#9CA3AF' }]}>
                            {isExpanded ? 'Ver menos' : 'Ver más'}
                          </Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                            size={24}
                            color={isExpanded ? primaryColor : '#D1D5DB'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Week breakdown — always visible when has data */}
                    {hasData && weeks.length > 0 && (
                      <View style={s.reportWeeks}>
                        {weeks.map((w, i) => (
                          <View key={i} style={s.reportWeekRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.reportWeekLabel}>{w.label}</Text>
                              {w.overtimeDays > 0 && <Text style={s.reportWeekOt}>{w.overtimeDays} día OT</Text>}
                            </View>
                            <Text style={[s.reportWeekHours, w.totalMin > 2400 && { color: '#EF4444' }]}>
                              {fmtHours(w.totalMin)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Flags */}
                    {(overtimeWeek || missed > 0) && (
                      <View style={s.reportFlags}>
                        {overtimeWeek && (
                          <View style={s.flagBadge}>
                            <Ionicons name="warning-outline" size={12} color="#EF4444" />
                            <Text style={[s.flagText, { color: '#EF4444' }]}>OT Semanal (&gt;40h)</Text>
                          </View>
                        )}
                        {missed > 0 && (
                          <View style={[s.flagBadge, { backgroundColor: '#FEE2E2' }]}>
                            <Ionicons name="cafe-outline" size={12} color="#991B1B" />
                            <Text style={[s.flagText, { color: '#991B1B' }]}>{missed} marcaje{missed > 1 ? 's' : ''} perdido{missed > 1 ? 's' : ''}</Text>
                          </View>
                        )}
                      </View>
                    )}

                    {/* Expanded: day-by-day logs */}
                    {isExpanded && (
                      <View style={s.expandedLogs}>
                        {allEmpLogs.length === 0 ? (
                          <Text style={[s.emptyText, { fontSize: 13 }]}>Sin registros.</Text>
                        ) : allEmpLogs.map(log => {
                          const dateKey = log.date ?? new Date(log.clockIn).toISOString().slice(0, 10);
                          const dayLabel = new Date(dateKey + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' });
                          const breaks = log.breaks && log.breaks.length > 0
                            ? log.breaks
                            : (log.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : []);
                          const breakDurMin = breaks.filter(b => b.start && b.end)
                            .reduce((s, b) => s + Math.round((new Date(b.end!).getTime() - new Date(b.start).getTime()) / 60000), 0);
                          const isMissed = log.status === 'missed_punch';
                          return (
                            <View key={log.logId} style={[s.expandedLogRow, isMissed && { borderColor: '#FCA5A5' }]}>
                              {/* Top row: date + total + edit */}
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={s.expandedLogDate}>{dayLabel}</Text>
                                {isMissed && <StatusBadge status={log.status} />}
                                <View style={{ flex: 1 }} />
                                {log.totalMinutes != null && (
                                  <Text style={[s.logTotal, { fontSize: 13, marginRight: 8 }, log.overtimeDay && { color: '#EF4444' }]}>
                                    {fmtHours(log.totalMinutes)}{log.overtimeDay ? ' OT' : ''}
                                  </Text>
                                )}
                                <TouchableOpacity onPress={() => setEditLog({ ...log })} style={s.editBtn}>
                                  <Ionicons name="create-outline" size={15} color="#9CA3AF" />
                                </TouchableOpacity>
                              </View>
                              {/* Bottom row: time chips */}
                              <View style={s.logTimeChips}>
                                <View style={s.logTimeChip}>
                                  <Text style={s.logTimeChipLabel}>Entrada</Text>
                                  <Text style={s.logTimeChipValue}>{log.clockIn ? fmt12(log.clockIn) : '—'}</Text>
                                </View>
                                {breaks.length > 0 && (
                                  <View style={s.logTimeChip}>
                                    <Text style={s.logTimeChipLabel}>Descanso</Text>
                                    <Text style={s.logTimeChipValue}>{breakDurMin > 0 ? fmtHours(breakDurMin) : (breaks[0].start ? fmt12(breaks[0].start) : '—')}</Text>
                                  </View>
                                )}
                                <View style={s.logTimeChip}>
                                  <Text style={s.logTimeChipLabel}>Salida</Text>
                                  <Text style={s.logTimeChipValue}>{log.clockOut ? fmt12(log.clockOut) : '—'}</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Edit log panel */}
              {editLog && (
                <View style={[s.editCard, { borderColor: primaryColor }]}>
                  <Text style={[s.editTitle, { color: primaryColor }]}>Editar Registro</Text>
                  <Text style={s.editEmpName}>{empName(editLog.employeeId)} · {fmtDate(editLog.clockIn)}</Text>
                  <View style={s.editGrid}>
                    <InlineTimePicker label="Entrada"          value={editLog.clockIn}    color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, clockIn: v }    : l)} />
                    <InlineTimePicker label="Inicio Descanso" value={editLog.breakStart} color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, breakStart: v } : l)} />
                    <InlineTimePicker label="Fin Descanso"    value={editLog.breakEnd}   color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, breakEnd: v }   : l)} />
                    <InlineTimePicker label="Salida"           value={editLog.clockOut}   color={primaryColor} onChange={v => setEditLog(l => l ? { ...l, clockOut: v }   : l)} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity style={s.editCancelBtn} onPress={() => setEditLog(null)}>
                      <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.editSaveBtn, { backgroundColor: primaryColor }]}
                      onPress={handleSaveEdit} disabled={editSaving}>
                      {editSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          );
        })()}

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  emptyText: { color: '#374151', fontSize: 14, textAlign: 'center' },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  periodLabel: { fontSize: 12, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F9FAFB' },
  exportText: { fontSize: 12, fontWeight: '700', color: '#374151' },

  // Live card
  liveCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
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
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
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
    backgroundColor: '#fff', borderRadius: 16, padding: 14, gap: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 2,
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

  // Employee filter chips
  empChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  empChipDot: { width: 7, height: 7, borderRadius: 4 },
  empChipText: { fontSize: 13, fontWeight: '600', color: '#374151' },

  // Period navigation
  periodNavWrapper: { gap: 6 },
  periodNavHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  periodNavTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  periodVolverBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  periodVolverText: { fontSize: 12, fontWeight: '700' },
  periodNav: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', borderRadius: 14, padding: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
  },
  periodNavBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  periodPastLabel: {
    fontSize: 10, color: '#9CA3AF', fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 1,
  },
  periodCurrentBadge: {
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  periodCurrentText: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.2,
  },
  periodGoCurrentBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  periodGoCurrentText: {
    fontSize: 11, fontWeight: '700',
  },

  // Expandable employee rows
  expandIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 2 },
  expandIconLabel: { fontSize: 11, fontWeight: '700' },
  hoursCaption: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 1 },
  expandedLogs: { gap: 8, paddingTop: 4 },
  expandedLogRow: {
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#F9FAFB', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  expandedLogDate: { fontSize: 13, fontWeight: '700', color: '#374151', marginRight: 8 },
  expandedLogTimes: { flex: 1, fontSize: 12, color: '#6B7280' },
  logTimeChips: { flexDirection: 'row', gap: 8 },
  logTimeChip: {
    flex: 1, backgroundColor: '#fff', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  logTimeChipLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  logTimeChipValue: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 2 },

  // Day grouping header
  dayHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4, paddingTop: 8, paddingBottom: 4,
  },
  dayHeaderLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.90)' },
  dayHeaderTotal: { fontSize: 13, fontWeight: '800' },
});
