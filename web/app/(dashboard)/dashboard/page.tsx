'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/services/api';
import type { Employee, Shift, TimeLog } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAY_NAMES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const DAY_SHORT   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTH_UPPER = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

function getWeekDates(offset: number, startDay = 0): Date[] {
  const today = new Date();
  const diff  = (today.getDay() - startDay + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - diff + offset * 7);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function isToday(d: Date) { return isSameDay(d, new Date()); }
function isPast(d: Date)  { const t = new Date(); t.setHours(0,0,0,0); return d < t; }
function fmt12(iso: string) {
  const d = new Date(iso), h = d.getHours(), m = d.getMinutes();
  return `${h%12===0?12:h%12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`;
}
function buildISO(dateStr: string, timeStr: string) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}
function weekRangeStr(dates: Date[]) {
  const s = dates[0], e = dates[6];
  if (s.getMonth() === e.getMonth())
    return `${s.getDate()} – ${e.getDate()} de ${MONTH_NAMES[s.getMonth()]}`;
  return `${s.getDate()} ${MONTH_NAMES[s.getMonth()]} – ${e.getDate()} ${MONTH_NAMES[e.getMonth()]}`;
}
function monthRangeStr(first: Date, last: Date) {
  const sy = first.getFullYear(), ey = last.getFullYear();
  if (sy !== ey) return `${MONTH_UPPER[first.getMonth()]} ${sy} – ${MONTH_UPPER[last.getMonth()]} ${ey}`;
  if (first.getMonth() === last.getMonth())
    return `${MONTH_UPPER[first.getMonth()]} ${first.getDate()} – ${last.getDate()}, ${sy}`;
  return `${MONTH_UPPER[first.getMonth()]} ${first.getDate()} – ${MONTH_UPPER[last.getMonth()]} ${last.getDate()}, ${sy}`;
}
function relativeWeekLabel(offset: number) {
  if (offset === -2) return 'Hace 2 sem.';
  if (offset === -1) return 'Sem. pasada';
  if (offset ===  0) return 'Esta semana';
  if (offset ===  1) return 'Próx. semana';
  return offset > 0 ? `En ${offset} sem.` : `Hace ${-offset} sem.`;
}
function getMonthGrid(monthOffset: number, startDay = 0) {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = d.getFullYear(), month = d.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);
  const startDate    = new Date(firstOfMonth);
  const daysBack = (firstOfMonth.getDay() - startDay + 7) % 7;
  startDate.setDate(1 - daysBack);
  startDate.setHours(0, 0, 0, 0);
  const weeks: Date[][] = [];
  const cur = new Date(startDate);
  while (cur <= lastOfMonth || weeks.length < 5) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
    if (cur > lastOfMonth) break;
  }
  return { weeks, year, month };
}
function getPayPeriodStartDates(allDates: Date[], payPeriodType?: string, payPeriodStartDay = 0, anchorDate?: string): Set<string> {
  const starts = new Set<string>();
  if (!payPeriodType) return starts;
  if (payPeriodType === 'weekly') {
    allDates.forEach(d => { if (d.getDay() === payPeriodStartDay) starts.add(toDateStr(d)); });
  } else if (payPeriodType === 'biweekly' && anchorDate) {
    const anchor = new Date(anchorDate + 'T12:00:00');
    const MS_DAY = 86400000;
    allDates.forEach(d => {
      const diff = Math.round((d.getTime() - anchor.getTime()) / MS_DAY);
      if (diff % 14 === 0) starts.add(toDateStr(d));
    });
  } else if (payPeriodType === 'semi-monthly') {
    allDates.forEach(d => { if (d.getDate() === 1 || d.getDate() === 16) starts.add(toDateStr(d)); });
  }
  return starts;
}

function shiftDurH(s: Shift) {
  const ms = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
  return Math.round((ms - (s.breakDuration ?? 0) * 60000) / 360000) / 10;
}
function friendlyDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconChevronLeft({ size=16 }: { size?: number }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>; }
function IconChevronRight({ size=16 }: { size?: number }){ return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>; }
function IconPlus({ size=18 }: { size?: number })       { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>; }
function IconCoffee()                                   { return <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>; }
function IconCheck({ size=12 }: { size?: number })      { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>; }
function IconChevronUp({ size=14 }: { size?: number })  { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 15l7-7 7 7"/></svg>; }
function IconChevronDown({ size=14 }: { size?: number }){ return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M19 9l-7 7-7-7"/></svg>; }
function IconUser({ size=14 }: { size?: number })       { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>; }
function IconLock({ size=11 }: { size?: number })       { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>; }
function IconCalendarToday({ size=13 }: { size?: number }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><rect x="3" y="4" width="18" height="18" rx="3"/><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none"/></svg>; }

// ── Shift status helper ───────────────────────────────────────────────────────
function shiftStatus(shift: Shift, activeLogs: TimeLog[], color: string) {
  const log  = activeLogs.find(l => l.shiftId === shift.shiftId);
  const live = log?.status === 'clocked_in' || log?.status === 'on_break';
  const done = log?.status === 'clocked_out';
  const late = !log && new Date(shift.startTime) < new Date() && !done;
  const sc   = live ? '#10B981' : done ? '#9CA3AF' : late ? '#F59E0B' : color;
  const label= live ? (log?.status === 'on_break' ? 'Descanso' : 'En Turno') : done ? 'Completado' : late ? 'Tarde' : 'Pendiente';
  return { live, done, late, sc, label, log };
}

// ── Conflict detection ────────────────────────────────────────────────────────
function checkConflict(empId: string, startISO: string, endISO: string, allShifts: Shift[], excludeId?: string): Shift | null {
  if (!empId) return null;
  const ns = new Date(startISO).getTime(), ne = new Date(endISO).getTime();
  return allShifts.find(s => {
    if (excludeId && s.shiftId === excludeId) return false;
    if ((s.employeeId ?? '') !== empId) return false;
    const ss = new Date(s.startTime).getTime(), se = new Date(s.endTime).getTime();
    return ns < se && ss < ne;
  }) ?? null;
}

// ── ShiftCard (week view — vertical) ─────────────────────────────────────────
function ShiftCard({ shift, employees, activeLogs, color, onClick }: {
  shift: Shift; employees: Employee[]; activeLogs: TimeLog[]; color: string; onClick: () => void;
}) {
  const emp = employees.find(e => e.userId === shift.employeeId || e.employeeId === shift.employeeId);
  const { live, done, sc } = shiftStatus(shift, activeLogs, color);
  const brk = shift.breakDuration ?? 0;
  const brkLabel = brk >= 60 ? `${brk / 60}h` : `${brk}m`;
  return (
    <button
      onClick={done ? undefined : onClick}
      style={{
        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
        padding: '8px 10px', borderRadius: 12, textAlign: 'left',
        borderLeft: `4px solid ${sc}`,
        backgroundColor: '#fff',
        boxShadow: '0 1px 6px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)',
        cursor: done ? 'default' : 'pointer', opacity: done ? 0.7 : 1,
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => { if (!done) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.04)'; }}}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.04)'; }}
    >
      {/* Name row with live dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', minWidth: 0 }}>
        {live && <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: sc, flexShrink: 0, animation: 'pulse 2s infinite' }} />}
        <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
          {emp ? `${emp.firstName} ${emp.lastName}` : <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontWeight: 400 }}>Sin asignar</span>}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: sc, backgroundColor: sc+'14', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>
          {shiftDurH(shift)}h
        </span>
      </div>

      {/* Time row */}
      <span style={{ fontSize: 11, fontWeight: 600, color: '#4B5563' }}>
        {fmt12(shift.startTime)} – {fmt12(shift.endTime)}
      </span>

      {/* Break row */}
      {brk > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#9CA3AF' }}>
          <IconCoffee />
          <span style={{ fontSize: 10, fontWeight: 600 }}>{brkLabel} descanso</span>
        </span>
      )}
    </button>
  );
}

// ── ShiftCardMini (month view — vertical compact) ─────────────────────────────
function ShiftCardMini({ shift, employees, activeLogs, color, onClick }: {
  shift: Shift; employees: Employee[]; activeLogs: TimeLog[]; color: string; onClick: () => void;
}) {
  const emp = employees.find(e => e.userId === shift.employeeId || e.employeeId === shift.employeeId);
  const { done, sc } = shiftStatus(shift, activeLogs, color);
  const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Sin asignar';
  const brk = shift.breakDuration ?? 0;
  return (
    <button
      onClick={done ? undefined : onClick}
      style={{
        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1,
        padding: '4px 6px', borderRadius: 7,
        borderLeft: `3px solid ${sc}`,
        backgroundColor: sc + '12',
        cursor: done ? 'default' : 'pointer', opacity: done ? 0.65 : 1,
        textAlign: 'left',
      }}
    >
      {/* Name */}
      <span style={{ fontSize: 10, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{name}</span>

      {/* Times */}
      <span style={{ fontSize: 9.5, fontWeight: 600, color: '#4B5563', whiteSpace: 'nowrap' }}>
        {fmt12(shift.startTime)} – {fmt12(shift.endTime)}
      </span>

      {/* Break */}
      {brk > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#9CA3AF' }}>
          <IconCoffee />
          <span style={{ fontSize: 9, fontWeight: 600 }}>{brk >= 60 ? `${brk/60}h` : `${brk}m`} desc.</span>
        </span>
      )}
    </button>
  );
}

// ── Modal sub-components ──────────────────────────────────────────────────────
function EmpRow({ emp, selected, onClick, color }: { emp: Employee | null; selected: boolean; onClick: () => void; color: string }) {
  const initials = emp ? `${emp.firstName[0]??''}${emp.lastName[0]??''}`.toUpperCase() : '';
  return (
    <button type="button" onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:14, width:'100%', textAlign:'left', border:`1.5px solid ${selected?color:'transparent'}`, backgroundColor:selected?color+'0E':'#F9FAFB', cursor:'pointer', transition:'all 0.15s' }}>
      {emp ? (
        <div style={{ width:36, height:36, borderRadius:12, flexShrink:0, backgroundColor:selected?color:'#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', color:selected?'#fff':'#9CA3AF', fontWeight:800, fontSize:13, transition:'all 0.15s' }}>{initials}</div>
      ) : (
        <div style={{ width:36, height:36, borderRadius:12, flexShrink:0, backgroundColor:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px dashed #D1D5DB', color:'#9CA3AF' }}><IconUser size={14} /></div>
      )}
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:14, fontWeight:600, color:selected?color:'#374151', margin:0, lineHeight:1.3 }}>{emp?`${emp.firstName} ${emp.lastName}`:'Sin asignar'}</p>
        {emp && <p style={{ fontSize:11, color:'#9CA3AF', margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{emp.email}</p>}
      </div>
      {selected && <div style={{ width:22, height:22, borderRadius:11, flexShrink:0, backgroundColor:color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}><IconCheck size={12} /></div>}
    </button>
  );
}

// ── Shift wizard ──────────────────────────────────────────────────────────────
type ModalState = { mode: 'create'; date: string } | { mode: 'edit'; shift: Shift };

const BREAK_OPTIONS = [
  { label: 'Sin descanso', value: 0 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hora', value: 60 },
];

const HOURS_LIST   = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;
const MINUTES_LIST = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55] as const;
const CAL_DAYS     = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'] as const;
type WizStep = 'calendar' | 'time' | 'employee';
const STEPS: WizStep[] = ['calendar', 'time', 'employee'];

// ── CalendarPicker ─────────────────────────────────────────────────────────────

function CalendarPicker({ selected, onChange, color }: {
  selected: Set<string>; onChange: (s: Set<string>) => void; color: string;
}) {
  const [view, setView] = useState(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(1); return d;
  });
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const y = view.getFullYear(), mo = view.getMonth();
  const firstOffset = new Date(y, mo, 1).getDay();
  const days = new Date(y, mo + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array<null>(firstOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => new Date(y, mo, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const toggle = (d: Date) => {
    const key = toDateStr(d);
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange(next);
  };

  const monthLabel = view.toLocaleDateString('es', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setView(new Date(y, mo - 1, 1))}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
          <IconChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#111827', textTransform: 'capitalize' }}>{monthLabel}</span>
        <button onClick={() => setView(new Date(y, mo + 1, 1))}
          style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
          <IconChevronRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {CAL_DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', padding: '2px 0 8px' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((date, i) => {
          if (!date) return <div key={`e${i}`} style={{ aspectRatio: '1' }} />;
          const key = toDateStr(date);
          const isPast = date < today;
          const isToday_ = date.getTime() === today.getTime();
          const isSel = selected.has(key);
          return (
            <button key={key} onClick={() => !isPast && toggle(date)}
              style={{
                aspectRatio: '1', borderRadius: 10, border: 'none',
                cursor: isPast ? 'default' : 'pointer',
                backgroundColor: isSel ? color : 'transparent',
                color: isSel ? '#fff' : isPast ? '#D1D5DB' : '#111827',
                fontWeight: isSel ? 800 : isToday_ ? 700 : 400,
                fontSize: 13, transition: 'all 0.15s',
                boxShadow: isToday_ && !isSel ? `inset 0 0 0 1.5px ${color}` : 'none',
              }}
              onMouseEnter={e => { if (!isPast && !isSel) (e.currentTarget as HTMLElement).style.backgroundColor = `${color}18`; }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {selected.size > 0 && (
        <p style={{ fontSize: 12, color, fontWeight: 700, marginTop: 14, textAlign: 'center' }}>
          {selected.size} día{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

// ── DrumColumn ────────────────────────────────────────────────────────────────

const D_H = 52;

function DrumColumn({ options, value, onChange, color, fmt }: {
  options: readonly number[];
  value: number;
  onChange: (v: number) => void;
  color: string;
  fmt?: (v: number) => string;
}) {
  const ref   = useRef<HTMLDivElement>(null);
  const busy  = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (busy.current || !ref.current) return;
    const idx = options.indexOf(value);
    if (idx >= 0) ref.current.scrollTop = idx * D_H;
  }, [value, options]);

  const onScroll = () => {
    busy.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / D_H);
      const c = Math.max(0, Math.min(options.length - 1, idx));
      ref.current.scrollTop = c * D_H;
      onChange(options[c]);
      busy.current = false;
    }, 150);
  };

  const pick = (i: number) => {
    ref.current?.scrollTo({ top: i * D_H, behavior: 'smooth' });
    onChange(options[i]);
  };

  const step = (dir: 1 | -1) => {
    const i = options.indexOf(value);
    pick(((i + dir) + options.length) % options.length);
  };

  const arrowBtn: React.CSSProperties = {
    width: 60, height: 28, border: 'none', background: 'transparent', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#9CA3AF', borderRadius: 8, flexShrink: 0, transition: 'background 120ms, color 120ms',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <button style={arrowBtn} onClick={() => step(-1)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}>
        <IconChevronUp size={14} />
      </button>

      <div
        style={{ position: 'relative', width: 60, height: D_H * 3, overflow: 'hidden', flexShrink: 0 }}
      >
        <div style={{ position: 'absolute', top: D_H, left: 3, right: 3, height: D_H, backgroundColor: `${color}10`, border: `1.5px solid ${color}25`, borderRadius: 12, pointerEvents: 'none', zIndex: 1 }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: D_H, background: 'linear-gradient(to bottom, white 40%, transparent)', pointerEvents: 'none', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: D_H, background: 'linear-gradient(to top, white 40%, transparent)', pointerEvents: 'none', zIndex: 2 }} />
        <div ref={ref} onScroll={onScroll}
          style={{ height: D_H * 3, overflowY: 'scroll', scrollbarWidth: 'none' } as React.CSSProperties}>
          <div style={{ height: D_H }} />
          {options.map((opt, i) => {
            const sel = opt === value;
            return (
              <div key={opt} onClick={() => pick(i)}
                style={{
                  height: D_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', userSelect: 'none',
                  fontSize: sel ? 26 : 16, fontWeight: sel ? 900 : 400,
                  color: sel ? color : '#C4C9D4', transition: 'font-size 0.1s, color 0.1s',
                }}>
                {fmt ? fmt(opt) : String(opt)}
              </div>
            );
          })}
          <div style={{ height: D_H }} />
        </div>
      </div>

      <button style={arrowBtn} onClick={() => step(1)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}>
        <IconChevronDown size={14} />
      </button>
    </div>
  );
}

function AmPmToggle({ value, onChange, color }: { value: 'AM' | 'PM'; onChange: (v: 'AM' | 'PM') => void; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', height: D_H * 3, paddingTop: 4 }}>
      {(['AM', 'PM'] as const).map(ap => (
        <button key={ap} onClick={() => onChange(ap)}
          style={{
            width: 46, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            backgroundColor: value === ap ? color : '#F3F4F6',
            color: value === ap ? '#fff' : '#6B7280',
            fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
          }}>
          {ap}
        </button>
      ))}
    </div>
  );
}

// ── ShiftModal (wizard for create, single form for edit) ──────────────────────

function ShiftModal({ state, employees, shifts: allShifts, color, businessId, onClose, onSaved, onDeleted }: {
  state: ModalState; employees: Employee[]; shifts: Shift[]; color: string;
  businessId: string; onClose: () => void; onSaved: () => void; onDeleted: () => void;
}) {
  const isEdit = state.mode === 'edit';
  const s      = isEdit ? state.shift : null;

  // Wizard step (create only)
  const [step, setStep] = useState<WizStep>(isEdit ? 'time' : 'calendar');

  // Dates
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => {
    if (isEdit) return new Set([toDateStr(new Date(s!.startTime))]);
    return state.date ? new Set([state.date]) : new Set();
  });

  // Time
  const parseTime = (iso: string) => {
    const d = new Date(iso), h24 = d.getHours(), m = d.getMinutes();
    const ap: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
    return { h: h24 % 12 === 0 ? 12 : h24 % 12, m, ap };
  };
  const st = s ? parseTime(s.startTime) : { h: 9,  m: 0, ap: 'AM' as const };
  const et = s ? parseTime(s.endTime)   : { h: 5,  m: 0, ap: 'PM' as const };

  const [startH,  setStartH]  = useState(st.h);
  const [startM,  setStartM]  = useState(st.m);
  const [startAp, setStartAp] = useState<'AM' | 'PM'>(st.ap);
  const [endH,    setEndH]    = useState(et.h);
  const [endM,    setEndM]    = useState(et.m);
  const [endAp,   setEndAp]   = useState<'AM' | 'PM'>(et.ap);
  const [brk,     setBrk]     = useState(s?.breakDuration ?? 0);
  const [empId,   setEmpId]   = useState(s?.employeeId ?? '');
  const [saving,   setSaving]   = useState(false);
  const [delConf,  setDelConf]  = useState(false);
  const [error,    setError]    = useState('');
  const [conflict, setConflict] = useState<{ msg: string; onForce: () => void } | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Derived
  const to24 = (h: number, ap: 'AM' | 'PM') => ap === 'AM' ? (h === 12 ? 0 : h) : (h === 12 ? 12 : h + 12);
  const sMins = to24(startH, startAp) * 60 + startM;
  const eMins = to24(endH, endAp) * 60 + endM;
  const overnight = eMins <= sMins;
  const totalH    = Math.round(((overnight ? eMins + 1440 : eMins) - sMins) / 60 * 10) / 10;
  const netH      = Math.round((totalH - brk / 60) * 10) / 10;
  const fmtDur    = (h: number) => h === Math.floor(h) ? `${h}h` : `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;

  const buildISOs = (dateStr: string) => {
    const h24s = to24(startH, startAp), h24e = to24(endH, endAp);
    const startISO = new Date(`${dateStr}T${String(h24s).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`).toISOString();
    const endDate  = new Date(`${dateStr}T${String(h24e).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`);
    if (overnight) endDate.setDate(endDate.getDate() + 1);
    return { startISO, endISO: endDate.toISOString() };
  };

  const doCreate = async () => {
    setSaving(true); setError('');
    try {
      for (const dateStr of [...selectedDates].sort()) {
        const { startISO, endISO } = buildISOs(dateStr);
        const created = await api.createShift({ businessId, title: 'Turno', startTime: startISO, endTime: endISO, breakDuration: brk });
        if (empId) await api.assignShift(created.shiftId, { employeeId: empId, status: 'scheduled' });
      }
      onSaved();
    } catch (e: any) { setError(e.message ?? 'Error al crear.'); }
    finally { setSaving(false); }
  };

  const handleCreate = () => {
    setConflict(null); setError('');
    // Long shift guard (> 16h): require explicit override
    if (totalH > 16) {
      setConflict({
        msg: `Este turno dura ${fmtDur(totalH)}, lo que excede una jornada completa. Verifica que el horario sea correcto.`,
        onForce: () => { setConflict(null); checkAndCreate(); },
      });
      return;
    }
    checkAndCreate();
  };

  const checkAndCreate = () => {
    if (empId) {
      const conflictDates: string[] = [];
      let firstConflict: Shift | null = null;
      for (const dateStr of [...selectedDates]) {
        const { startISO, endISO } = buildISOs(dateStr);
        const c = checkConflict(empId, startISO, endISO, allShifts);
        if (c) { firstConflict = firstConflict ?? c; conflictDates.push(dateStr); }
      }
      if (firstConflict) {
        const emp = employees.find(e => e.employeeId === empId || e.userId === empId);
        const name = emp ? emp.firstName : 'Este empleado';
        const dates = conflictDates.map(d => new Date(d + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' })).join(', ');
        setConflict({
          msg: `${name} ya tiene un turno de ${fmt12(firstConflict.startTime)} a ${fmt12(firstConflict.endTime)} que se superpone con el nuevo turno en: ${dates}.`,
          onForce: () => { setConflict(null); doCreate(); },
        });
        return;
      }
    }
    doCreate();
  };

  const doEdit = async () => {
    if (!s) return;
    setSaving(true); setError('');
    try {
      const { startISO, endISO } = buildISOs(toDateStr(new Date(s.startTime)));
      await api.assignShift(s.shiftId, { employeeId: empId || '', status: empId ? 'scheduled' : 'open', startTime: startISO, endTime: endISO, breakDuration: brk });
      onSaved();
    } catch (e: any) { setError(e.message ?? 'Error al guardar.'); }
    finally { setSaving(false); }
  };

  const handleEdit = () => {
    if (!s) return;
    setConflict(null); setError('');
    if (totalH > 16) {
      setConflict({
        msg: `Este turno dura ${fmtDur(totalH)}, lo que excede una jornada completa. Verifica que el horario sea correcto.`,
        onForce: () => { setConflict(null); checkAndEdit(); },
      });
      return;
    }
    checkAndEdit();
  };

  const checkAndEdit = () => {
    if (!s) return;
    if (empId) {
      const { startISO, endISO } = buildISOs(toDateStr(new Date(s.startTime)));
      const c = checkConflict(empId, startISO, endISO, allShifts, s.shiftId);
      if (c) {
        const emp = employees.find(e => e.employeeId === empId || e.userId === empId);
        const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Este empleado';
        setConflict({
          msg: `${name} ya tiene un turno de ${fmt12(c.startTime)} a ${fmt12(c.endTime)} que se superpone con los cambios.`,
          onForce: () => { setConflict(null); doEdit(); },
        });
        return;
      }
    }
    doEdit();
  };

  const handleDelete = async () => {
    if (!delConf) { setDelConf(true); return; }
    setSaving(true);
    try { await api.deleteShift(s!.shiftId); onDeleted(); }
    catch (e: any) { setError(e.message ?? 'Error al eliminar.'); setSaving(false); setDelConf(false); }
  };

  const stepIdx = STEPS.indexOf(step);
  const canNext = step === 'calendar' ? selectedDates.size > 0 : true;
  const isLast  = isEdit || step === 'employee';

  // ── Time + break panel (shared between step 2 and edit view) ─────────────────
  const TimePanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>Horario</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'flex-start' }}>
          {/* Start */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Entrada</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DrumColumn options={HOURS_LIST} value={startH} onChange={setStartH} color={color} />
              <span style={{ fontSize: 22, fontWeight: 900, color: '#D1D5DB', paddingBottom: 2 }}>:</span>
              <DrumColumn options={MINUTES_LIST} value={startM} onChange={setStartM} color={color} fmt={v => String(v).padStart(2, '0')} />
              <AmPmToggle value={startAp} onChange={setStartAp} color={color} />
            </div>
          </div>
          {/* Divider */}
          <div style={{ width: 1, backgroundColor: '#F3F4F6', alignSelf: 'stretch', margin: '28px 4px' }} />
          {/* End */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Salida</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DrumColumn options={HOURS_LIST} value={endH} onChange={setEndH} color={color} />
              <span style={{ fontSize: 22, fontWeight: 900, color: '#D1D5DB', paddingBottom: 2 }}>:</span>
              <DrumColumn options={MINUTES_LIST} value={endM} onChange={setEndM} color={color} fmt={v => String(v).padStart(2, '0')} />
              <AmPmToggle value={endAp} onChange={setEndAp} color={color} />
            </div>
          </div>
        </div>
        {totalH > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <p style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500, margin: 0 }}>
              {fmtDur(totalH)} total{brk > 0 ? ` · ${fmtDur(netH)} neto` : ''}
            </p>
            {overnight && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#EEF2FF', borderRadius: 20, padding: '4px 12px' }}>
                <span style={{ fontSize: 12 }}>🌙</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6366F1' }}>Turno nocturno — termina el día siguiente</span>
              </div>
            )}
            {totalH > 8 && totalH <= 16 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#FFFBEB', borderRadius: 20, padding: '4px 12px' }}>
                <span style={{ fontSize: 11 }}>⚠️</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#92400E' }}>Turno largo — supera las 8 horas estándar</span>
              </div>
            )}
            {totalH > 16 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#FEF2F2', borderRadius: 20, padding: '4px 12px' }}>
                <span style={{ fontSize: 11 }}>🚨</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626' }}>Turno de {fmtDur(totalH)} — excede una jornada completa</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Descanso</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {BREAK_OPTIONS.map(opt => {
            const sel = brk === opt.value;
            return (
              <button key={opt.value} onClick={() => setBrk(opt.value)}
                style={{ padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: `1.5px solid ${sel ? color : '#E5E7EB'}`, backgroundColor: sel ? color : '#F9FAFB', color: sel ? '#fff' : '#6B7280', cursor: 'pointer', transition: 'all 0.15s' }}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Employee inline (edit mode only) */}
      {isEdit && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Empleado</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            <EmpRow emp={null} selected={empId === ''} onClick={() => setEmpId('')} color={color} />
            {employees.map(emp => (
              <EmpRow key={emp.employeeId} emp={emp} selected={empId === (emp.userId || emp.employeeId)} onClick={() => setEmpId(emp.userId || emp.employeeId)} color={color} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }} />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, backgroundColor: '#fff', borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '92vh', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>
              {isEdit ? 'Editar turno' : 'Nuevo turno'}
            </h2>
            {!isEdit && (
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '3px 0 0' }}>
                Paso {stepIdx + 1} de 3 · {step === 'calendar' ? 'Elige fechas' : step === 'time' ? 'Horario' : 'Empleado'}
              </p>
            )}
          </div>
          <button onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #F0F0F0', backgroundColor: '#F9FAFB', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
            ×
          </button>
        </div>

        {/* Progress dots */}
        {!isEdit && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 24px 0' }}>
            {STEPS.map((s, i) => (
              <div key={s} style={{ width: i === stepIdx ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i <= stepIdx ? color : '#E5E7EB', transition: 'all 0.2s' }} />
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 'calendar' && !isEdit && (
            <CalendarPicker selected={selectedDates} onChange={setSelectedDates} color={color} />
          )}
          {(step === 'time' || isEdit) && TimePanel}
          {step === 'employee' && !isEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Asignar empleado</p>
              <EmpRow emp={null} selected={empId === ''} onClick={() => setEmpId('')} color={color} />
              {employees.map(emp => (
                <EmpRow key={emp.employeeId} emp={emp} selected={empId === (emp.userId || emp.employeeId)} onClick={() => setEmpId(emp.userId || emp.employeeId)} color={color} />
              ))}
            </div>
          )}
          {conflict && (
            <div style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, padding: '12px 16px', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                <p style={{ fontSize: 13, color: '#92400E', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>{conflict.msg}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setConflict(null)}
                  style={{ flex: 1, height: 36, borderRadius: 10, border: '1.5px solid #FDE68A', backgroundColor: 'transparent', fontSize: 13, fontWeight: 700, color: '#92400E', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={conflict.onForce}
                  style={{ flex: 2, height: 36, borderRadius: 10, border: 'none', backgroundColor: '#F59E0B', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
                  {isEdit ? 'Guardar de todas formas' : 'Crear de todas formas'}
                </button>
              </div>
            </div>
          )}
          {error && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', color: '#DC2626', fontSize: 13, fontWeight: 500, marginTop: 16 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10 }}>
          {isEdit && (
            <button onClick={handleDelete} disabled={saving}
              style={{ padding: '0 16px', height: 48, borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, backgroundColor: delConf ? '#EF4444' : '#FEF2F2', color: delConf ? '#fff' : '#EF4444', opacity: saving ? 0.6 : 1 }}>
              {delConf ? 'Confirmar' : 'Eliminar'}
            </button>
          )}
          {!isEdit && stepIdx > 0 && (
            <button onClick={() => setStep(STEPS[stepIdx - 1])}
              style={{ padding: '0 16px', height: 48, borderRadius: 14, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 14, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
              Atrás
            </button>
          )}
          <button onClick={onClose}
            style={{ flex: 1, height: 48, borderRadius: 14, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 14, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button
            onClick={isEdit ? handleEdit : isLast ? handleCreate : () => { setError(''); setConflict(null); setStep(STEPS[stepIdx + 1]); }}
            disabled={saving || (!canNext)}
            style={{
              flex: 2, height: 48, borderRadius: 14, border: 'none',
              backgroundColor: canNext ? color : '#E5E7EB',
              color: canNext ? '#fff' : '#9CA3AF',
              fontSize: 14, fontWeight: 800,
              cursor: saving || !canNext ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              boxShadow: canNext ? `0 4px 14px ${color}40` : 'none',
            }}>
            {saving ? '…' : isEdit ? 'Guardar cambios' : isLast ? (selectedDates.size > 1 ? `Crear ${selectedDates.size} turnos` : 'Crear turno') : 'Continuar →'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Week view grid ────────────────────────────────────────────────────────────
function WeekGrid({ dates, shifts, employees, activeLogs, color, setModal }: {
  dates: Date[]; shifts: Shift[]; employees: Employee[]; activeLogs: TimeLog[];
  color: string; setModal: (s: ModalState) => void;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, minWidth: 700 }}>
      {dates.map(date => {
        const today     = isToday(date);
        const past      = isPast(date);
        const dayShifts = shifts.filter(s => isSameDay(new Date(s.startTime), date));
        const dateStr   = toDateStr(date);

        return (
          <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Day header */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 4px', borderRadius: 18, textAlign: 'center',
              ...(today
                ? { backgroundColor: color, boxShadow: `0 4px 16px ${color}50` }
                : past
                  ? { backgroundColor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }
                  : { backgroundColor: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.09)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }
              ),
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: today ? 'rgba(255,255,255,0.75)' : past ? '#9CA3AF' : '#6B7280', lineHeight: 1.2 }}>
                {DAY_NAMES[date.getDay()]}
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15, marginTop: 2, color: today ? '#fff' : past ? '#D1D5DB' : '#111827' }}>
                {date.getDate()}
              </span>
            </div>

            {/* Shifts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dayShifts.map(shift => (
                <ShiftCard key={shift.shiftId} shift={shift} employees={employees} activeLogs={activeLogs} color={color}
                  onClick={() => setModal({ mode: 'edit', shift })} />
              ))}
              {dayShifts.length === 0 && !past && (
                <button onClick={() => setModal({ mode: 'create', date: dateStr })}
                  style={{ width: '100%', height: 36, borderRadius: 12, border: '1.5px dashed rgba(0,0,0,0.1)', backgroundColor: 'transparent', color: '#CBD5E1', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconPlus size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────
const MONTH_MAX = 2;

function MonthView({ weeks, month, startDay, shifts, employees, activeLogs, color, setModal }: {
  weeks: Date[][]; month: number; startDay: number;
  shifts: Shift[]; employees: Employee[]; activeLogs: TimeLog[];
  color: string; setModal: (s: ModalState) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleDay = (key: string) => setExpanded(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next;
  });

  const todayWeekIdx = weeks.findIndex(w => w.some(d => isToday(d)));
  const orderedDays = Array.from({ length: 7 }, (_, i) => DAY_SHORT[(startDay + i) % 7]);

  return (
    <div style={{ minWidth: 680 }}>
      {/* Day-name header — ordered by business startDay */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5, marginBottom: 5 }}>
        {orderedDays.map((d, i) => (
          <div key={i} style={{ textAlign: 'right', fontSize: 11, fontWeight: 800, color: '#4B5563', textTransform: 'uppercase', letterSpacing: 0.8, padding: '3px 8px 3px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {weeks.map((dates, wi) => {
          const isCurrentWeek = wi === todayWeekIdx;
          return (
            <div key={wi} style={{
              display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5,
              padding: isCurrentWeek ? '4px' : '0',
              borderRadius: isCurrentWeek ? 14 : 0,
              backgroundColor: isCurrentWeek ? `${color}07` : 'transparent',
              border: isCurrentWeek ? `2px solid ${color}22` : '2px solid transparent',
            }}>
              {dates.map(date => {
                const inMonth   = date.getMonth() === month;
                const today     = isToday(date);
                const past      = isPast(date);
                const dateStr   = toDateStr(date);
                const dayShifts = shifts.filter(s => isSameDay(new Date(s.startTime), date));
                const isExp     = expanded.has(dateStr);
                const visible   = isExp ? dayShifts : dayShifts.slice(0, MONTH_MAX);
                const hidden    = dayShifts.length - MONTH_MAX;

                return (
                  <div key={dateStr} style={{
                    backgroundColor: today
                      ? `${color}12`
                      : !inMonth ? '#F4F5F7' : past ? '#F9FAFB' : '#FFFFFF',
                    border: today
                      ? `2px solid ${color}45`
                      : `1.5px solid ${!inMonth ? '#DDE0E6' : '#D1D5DB'}`,
                    borderRadius: 12, padding: '6px 5px',
                    display: 'flex', flexDirection: 'column',
                    minHeight: 120,
                    boxShadow: today
                      ? `0 3px 14px ${color}22`
                      : inMonth && !past ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                  }}>
                    {/* Date number — right-aligned */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 3, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 800, lineHeight: 1,
                        color: today ? '#fff' : !inMonth ? '#A0A8B4' : past ? '#BEC5CF' : '#1F2937',
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: today ? color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Shifts — capped at MONTH_MAX, always visible */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, opacity: !inMonth ? 0.65 : 1 }}>
                      {visible.map(shift => (
                        <ShiftCardMini key={shift.shiftId} shift={shift} employees={employees} activeLogs={activeLogs} color={color}
                          onClick={() => setModal({ mode: 'edit', shift })} />
                      ))}
                    </div>

                    {/* +N más / Menos — always rendered after the list, never clipped */}
                    {!isExp && hidden > 0 && (
                      <button onClick={() => toggleDay(dateStr)} style={{ fontSize: 9, fontWeight: 700, color: inMonth ? color : '#9CA3AF', background: inMonth ? `${color}12` : '#F3F4F6', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', alignSelf: 'flex-start', marginTop: 3, flexShrink: 0 }}>
                        +{hidden} más
                      </button>
                    )}
                    {isExp && dayShifts.length > MONTH_MAX && (
                      <button onClick={() => toggleDay(dateStr)} style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', background: '#F3F4F6', border: 'none', borderRadius: 5, padding: '2px 5px', cursor: 'pointer', alignSelf: 'flex-start', marginTop: 3, flexShrink: 0 }}>
                        Menos
                      </button>
                    )}

                    {/* Add button — in-month future empty days only */}
                    {inMonth && dayShifts.length === 0 && !past && (
                      <button onClick={() => setModal({ mode: 'create', date: dateStr })}
                        style={{ flex: 1, minHeight: 20, border: '1.5px dashed #D1D5DB', backgroundColor: 'transparent', color: '#C4C9D4', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, transition: 'border-color 150ms, color 150ms' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color+'60'; (e.currentTarget as HTMLElement).style.color = color; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D1D5DB'; (e.currentTarget as HTMLElement).style.color = '#C4C9D4'; }}
                      >
                        <IconPlus size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
type ViewMode = 'week' | 'month';

export default function DashboardPage() {
  const { business, loading: authLoading } = useAuth();
  const color    = business?.color ?? '#E11D48';
  const startDay = business?.payPeriodStartDay ?? 0;
  const maxWeeks = business?.schedulingWeeks ?? 6;

  const [viewMode,     setViewMode]     = useState<ViewMode>('week');
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [monthOffset,  setMonthOffset]  = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'late'>('all');
  const [empFilter,    setEmpFilter]    = useState<string | null>(null);
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [shifts,       setShifts]       = useState<Shift[]>([]);
  const [employees,    setEmployees]    = useState<Employee[]>([]);
  const [activeLogs,   setActiveLogs]   = useState<TimeLog[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [modal,        setModal]        = useState<ModalState | null>(null);

  const weekGroups4 = useMemo(() =>
    [-2, -1, 0, 1].map(delta => getWeekDates(weekOffset + delta, startDay))
  , [weekOffset, startDay]);
  const currentWeekDates = weekGroups4[2];

  const monthGrid = useMemo(() => getMonthGrid(monthOffset, startDay), [monthOffset, startDay]);

  const rangeStart = viewMode === 'week'
    ? toDateStr(weekGroups4[0][0])
    : toDateStr(monthGrid.weeks[0][0]);
  const rangeEnd = viewMode === 'week'
    ? toDateStr(weekGroups4[3][6])
    : toDateStr(monthGrid.weeks[monthGrid.weeks.length - 1][6]);

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      const [s, e, active] = await Promise.all([
        api.getShifts(business.businessId, rangeStart, rangeEnd),
        api.getEmployees(business.businessId),
        api.getActiveEmployees(business.businessId),
      ]);
      setShifts(s.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
      setEmployees(e);
      setActiveLogs(active);
    } catch (e) { console.error('[Dashboard] load error:', e); }
    finally { setLoading(false); }
  }, [business?.businessId, rangeStart, rangeEnd]);

  useEffect(() => { load(); }, [load]);

  const clockedIn = activeLogs.filter(l => l.status === 'clocked_in' || l.status === 'on_break').length;
  const todayStr  = toDateStr(new Date());

  const weekShiftCount = useMemo(() => {
    const weekDateStrs = new Set(currentWeekDates.map(toDateStr));
    return shifts.filter(s => weekDateStrs.has(toDateStr(new Date(s.startTime)))).length;
  }, [shifts, currentWeekDates]);

  const monthShiftCount = useMemo(() => {
    return shifts.filter(s => {
      const d = new Date(s.startTime);
      return d.getFullYear() === monthGrid.year && d.getMonth() === monthGrid.month;
    }).length;
  }, [shifts, monthGrid]);

  const navLabel = viewMode === 'week'
    ? weekRangeStr(currentWeekDates)
    : `${MONTH_UPPER[monthGrid.month]} ${monthGrid.year}`;

  const filteredShifts = useMemo(() => {
    let s = shifts;
    if (statusFilter === 'live') s = s.filter(sh => activeLogs.some(l => l.shiftId === sh.shiftId && (l.status === 'clocked_in' || l.status === 'on_break')));
    else if (statusFilter === 'late') s = s.filter(sh => {
      const log = activeLogs.find(l => l.shiftId === sh.shiftId);
      return !log && new Date(sh.startTime) < new Date();
    });
    if (empFilter) {
      const emp = employees.find(e => e.employeeId === empFilter || e.userId === empFilter);
      s = s.filter(sh => sh.employeeId === (emp?.employeeId ?? empFilter) || sh.employeeId === (emp?.userId ?? empFilter));
    }
    return s;
  }, [shifts, statusFilter, empFilter, activeLogs, employees]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Top bar ── */}
      <div style={{
        flexShrink: 0, padding: '10px 24px',
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
      }}>

        {/* Left — back to current */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          {(viewMode === 'week' ? weekOffset !== 0 : monthOffset !== 0) && (
            <button
              onClick={() => viewMode === 'week' ? setWeekOffset(0) : setMonthOffset(0)}
              style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 9, border: `1.5px solid ${color}40`, backgroundColor: color+'10', color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <IconCalendarToday size={13} />
              Ir a hoy
            </button>
          )}
        </div>

        {/* Center — toggle + nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', border: '1.5px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
            {(['week', 'month'] as const).map((mode, i) => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{
                padding: '6px 18px', border: 'none',
                borderLeft: i > 0 ? '1.5px solid #E5E7EB' : 'none',
                backgroundColor: viewMode === mode ? color : 'transparent',
                color: viewMode === mode ? '#fff' : '#374151',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
              }}>
                {mode === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3 }}>
            <button
              onClick={() => viewMode === 'week' ? setWeekOffset(o => o - 1) : setMonthOffset(o => o - 1)}
              disabled={viewMode === 'week' && weekOffset - 1 <= -(maxWeeks + 1)}
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', backgroundColor: 'transparent', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: viewMode === 'week' && weekOffset - 1 <= -(maxWeeks + 1) ? 0.3 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            ><IconChevronLeft /></button>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#111827', padding: '0 12px', whiteSpace: 'nowrap', minWidth: 170, textAlign: 'center' }}>
              {navLabel}
            </span>
            <button
              onClick={() => viewMode === 'week' ? setWeekOffset(o => o + 1) : setMonthOffset(o => o + 1)}
              disabled={viewMode === 'week' && weekOffset + 1 >= maxWeeks}
              style={{ width: 32, height: 32, borderRadius: 9, border: 'none', backgroundColor: 'transparent', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: viewMode === 'week' && weekOffset + 1 >= maxWeeks ? 0.3 : 1 }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            ><IconChevronRight /></button>
          </div>
        </div>

        {/* Right — stats */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          {clockedIn > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, backgroundColor: '#10B98115', color: '#10B981', border: '1px solid #10B98128' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {clockedIn} en turno
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', backgroundColor: '#F3F4F6', padding: '5px 12px', borderRadius: 20 }}>
            {viewMode === 'week'
              ? `${weekShiftCount} turno${weekShiftCount !== 1 ? 's' : ''}`
              : `${monthShiftCount} turno${monthShiftCount !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      {employees.length > 0 && (
        <div style={{
          flexShrink: 0, padding: '7px 24px', display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}>
          {/* Status chips */}
          {(['all', 'live', 'late'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={{
              padding: '4px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
              backgroundColor: statusFilter === f ? (f === 'live' ? '#10B981' : f === 'late' ? '#F59E0B' : color) : '#F3F4F6',
              color: statusFilter === f ? '#fff' : '#6B7280', transition: 'all 150ms',
            }}>
              {f === 'all' ? 'Todos' : f === 'live' ? 'En Turno' : 'Tarde'}
            </button>
          ))}

          {/* Divider */}
          <div style={{ width: 1, height: 20, backgroundColor: '#E5E7EB', flexShrink: 0 }} />

          {/* Employee pill → opens modal */}
          <button onClick={() => setEmpModalOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            border: empFilter ? `1.5px solid ${color}` : '1.5px solid #E5E7EB',
            backgroundColor: empFilter ? color+'12' : 'transparent',
            color: empFilter ? color : '#6B7280', transition: 'all 150ms',
          }}>
            <IconUser size={13} />
            {empFilter
              ? (employees.find(e => e.employeeId === empFilter)?.firstName + ' ' + employees.find(e => e.employeeId === empFilter)?.lastName)
              : 'Empleado'}
          </button>

          {/* Reset */}
          {(statusFilter !== 'all' || empFilter !== null) && (
            <button onClick={() => { setStatusFilter('all'); setEmpFilter(null); }} style={{
              padding: '4px 12px', borderRadius: 20, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              backgroundColor: '#FEE2E2', color: '#DC2626', flexShrink: 0, transition: 'all 150ms',
            }}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div style={{
        flex: 1, minHeight: 0,
        overflowY: 'auto',
        overflowX: 'auto',
        padding: '20px 24px 100px',
      }}>
        {(authLoading || loading) ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, minWidth: 700 }}>
            {Array.from({ length: 7 }).map((_, col) => (
              <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Day header */}
                <div className="sk-card" style={{ height: 80, borderRadius: 18, animationDelay: `${col * 80}ms` }} />
                {/* Shift cards */}
                {Array.from({ length: col % 3 === 0 ? 3 : col % 3 === 1 ? 2 : 1 }).map((_, j) => (
                  <div key={j} className="sk-card" style={{
                    borderRadius: 14, padding: '10px 12px',
                    display: 'flex', flexDirection: 'column', gap: 7,
                    borderLeft: '4px solid rgba(0,0,0,0.08)',
                    animationDelay: `${col * 80 + j * 120}ms`,
                  }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div className="sk" style={{ flex: 1, height: 12 }} />
                      <div className="sk" style={{ width: 28, height: 12 }} />
                    </div>
                    <div className="sk" style={{ width: '75%', height: 10 }} />
                    <div className="sk" style={{ width: '45%', height: 9 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : !business ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, color: '#9CA3AF', fontSize: 14 }}>
            No se encontró el negocio. Recarga la página.
          </div>
        ) : viewMode === 'week' ? (
          <WeekGrid dates={currentWeekDates} shifts={filteredShifts} employees={employees} activeLogs={activeLogs} color={color} setModal={setModal} />
        ) : (
          <MonthView weeks={monthGrid.weeks} month={monthGrid.month} startDay={startDay} shifts={filteredShifts} employees={employees} activeLogs={activeLogs} color={color} setModal={setModal} />
        )}
      </div>

      {/* ── FAB ── */}
      {business && (
        <button
          onClick={() => setModal({ mode: 'create', date: todayStr })}
          style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 40, display: 'flex', alignItems: 'center', gap: 10, padding: '14px 22px', borderRadius: 20, border: 'none', backgroundColor: color, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: `0 8px 28px ${color}55`, transition: 'transform 0.15s, box-shadow 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 36px ${color}70`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${color}55`; }}
        >
          <IconPlus size={18} />
          Nuevo turno
        </button>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .drum-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {modal && business && (
        <ShiftModal state={modal} employees={employees} shifts={shifts} color={color} businessId={business.businessId}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} onDeleted={() => { setModal(null); load(); }} />
      )}

      {/* ── Employee filter modal ── */}
      {empModalOpen && (
        <div
          onClick={() => setEmpModalOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            backgroundColor: '#fff', borderRadius: 20, padding: '20px 0', minWidth: 280, maxWidth: 360,
            maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          }}>
            <div style={{ padding: '0 20px 12px', borderBottom: '1px solid #F3F4F6' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Filtrar por empleado</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', gap: 2 }}>
              <button
                onClick={() => { setEmpFilter(null); setEmpModalOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                  backgroundColor: empFilter === null ? color+'12' : 'transparent',
                  color: empFilter === null ? color : '#374151', fontWeight: empFilter === null ? 700 : 500, fontSize: 14,
                  transition: 'background 120ms',
                }}
              >
                <span style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: empFilter === null ? color+'20' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconUser size={15} />
                </span>
                Todos los empleados
              </button>
              {employees.filter(e => !e.deletedAt).map(emp => (
                <button
                  key={emp.employeeId}
                  onClick={() => { setEmpFilter(emp.employeeId); setEmpModalOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer', textAlign: 'left',
                    backgroundColor: empFilter === emp.employeeId ? color+'12' : 'transparent',
                    color: empFilter === emp.employeeId ? color : '#374151', fontWeight: empFilter === emp.employeeId ? 700 : 500, fontSize: 14,
                    transition: 'background 120ms',
                  }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: 16, flexShrink: 0,
                    backgroundColor: empFilter === emp.employeeId ? color+'20' : '#F3F4F6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: empFilter === emp.employeeId ? color : '#6B7280',
                  }}>
                    {emp.firstName[0]}{emp.lastName[0]}
                  </span>
                  {emp.firstName} {emp.lastName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
