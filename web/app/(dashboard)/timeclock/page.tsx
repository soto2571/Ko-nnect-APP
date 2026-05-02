'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/services/api';
import type { Employee, TimeLog, Business } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt12(iso: string) {
  const d = new Date(iso), h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtDateShort(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' });
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function completedBreakMs(log: TimeLog): number {
  const breaks = log.breaks ?? [];
  if (breaks.length > 0) {
    return breaks.filter(b => b.start && b.end)
      .reduce((sum, b) => sum + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0);
  }
  if (log.breakStart && log.breakEnd) {
    return new Date(log.breakEnd).getTime() - new Date(log.breakStart).getTime();
  }
  return 0;
}

function workedMinutes(log: TimeLog): number {
  if (!log.clockOut) return 0;
  const total = new Date(log.clockOut).getTime() - new Date(log.clockIn).getTime();
  const breakMs = completedBreakMs(log);
  return Math.max(0, Math.round((total - breakMs) / 60000));
}

function getPayPeriod(
  business: Business,
  offset = 0
): { start: Date; end: Date; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const type = business.payPeriodType ?? 'weekly';
  const startDay = business.payPeriodStartDay ?? 0;
  const fmtD = (d: Date) => d.toLocaleDateString('es', { month: 'short', day: 'numeric' });

  if (type === 'semi-monthly') {
    const d = today.getDate();
    let month = today.getMonth(), year = today.getFullYear();
    let half = d <= 15 ? 0 : 1;
    let totalHalf = month * 2 + half + offset;
    month = Math.floor(totalHalf / 2);
    year = today.getFullYear() + Math.floor(month / 12);
    month = ((month % 12) + 12) % 12;
    half = ((totalHalf % 2) + 2) % 2;
    const start = new Date(year, month, half === 0 ? 1 : 16);
    const end = new Date(year, month, half === 0 ? 15 : new Date(year, month + 1, 0).getDate());
    end.setHours(23, 59, 59);
    return { start, end, label: `${fmtD(start)} – ${fmtD(end)}` };
  }

  const periodDays = type === 'biweekly' ? 14 : 7;
  let currentStart: Date;
  if (type === 'biweekly' && business.payPeriodAnchorDate) {
    const anchor = new Date(business.payPeriodAnchorDate + 'T00:00:00');
    const daysSince = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
    const cycleDay = ((daysSince % 14) + 14) % 14;
    currentStart = new Date(today);
    currentStart.setDate(today.getDate() - cycleDay);
  } else {
    const diff = (today.getDay() - startDay + 7) % 7;
    currentStart = new Date(today);
    currentStart.setDate(today.getDate() - diff);
  }
  const start = new Date(currentStart);
  start.setDate(currentStart.getDate() + offset * periodDays);
  const end = new Date(start);
  end.setDate(start.getDate() + periodDays - 1);
  end.setHours(23, 59, 59);
  return { start, end, label: `${fmtD(start)} – ${fmtD(end)}` };
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconChevLeft()  { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>; }
function IconChevRight() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>; }
function IconEdit({ size = 14 }: { size?: number }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>; }
function IconTrash({ size = 14 }: { size?: number }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>; }
function IconCoffee()    { return <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/></svg>; }
function IconClose({ size = 18 }: { size?: number }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>; }
function IconClock({ size = 40 }: { size?: number }) { return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>; }
function IconPdf() { return <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>; }
function IconChevDown()  { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M19 9l-7 7-7-7"/></svg>; }
function IconChevUp()    { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 15l7-7 7 7"/></svg>; }

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner({ color = '#fff', size = 18 }: { color?: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid transparent`, borderTopColor: color,
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 500,
        backgroundColor: '#fff', borderRadius: 24, padding: 28,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Confirm ───────────────────────────────────────────────────────────────────

function Confirm({ open, title, message, onConfirm, onCancel, loading }: {
  open: boolean; title: string; message: string;
  onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', zIndex: 1, backgroundColor: '#fff', borderRadius: 20,
        padding: 28, maxWidth: 380, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, height: 44, borderRadius: 12, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', backgroundColor: '#EF4444', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loading ? <Spinner /> : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drum picker components ─────────────────────────────────────────────────────

const TC_HOURS   = [12,1,2,3,4,5,6,7,8,9,10,11];
const TC_MINUTES = Array.from({ length: 60 }, (_, i) => i);
const D_H = 44;

function TcDrumColumn({ options, value, onChange, color, fmt = (v: number) => String(v).padStart(2, '0') }: {
  options: number[]; value: number; onChange: (v: number) => void; color: string; fmt?: (v: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const idx = options.indexOf(value);
    if (idx >= 0 && ref.current) ref.current.scrollTo({ top: idx * D_H, behavior: 'smooth' });
  }, [value, options]);

  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / D_H);
      const clamped = Math.max(0, Math.min(idx, options.length - 1));
      onChange(options[clamped]);
    }, 120);
  };

  const selectItem = (v: number) => {
    onChange(v);
    const idx = options.indexOf(v);
    if (idx >= 0 && ref.current) ref.current.scrollTo({ top: idx * D_H, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative', width: 54, height: D_H * 3, overflow: 'hidden', borderRadius: 12 }}>
      {/* fade top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: D_H, background: 'linear-gradient(to bottom, rgba(248,250,252,0.97), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      {/* center highlight */}
      <div style={{ position: 'absolute', top: D_H, left: 0, right: 0, height: D_H, background: `${color}12`, borderRadius: 8, zIndex: 1, pointerEvents: 'none', border: `1.5px solid ${color}28` }} />
      {/* fade bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: D_H, background: 'linear-gradient(to top, rgba(248,250,252,0.97), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div
        ref={ref} onScroll={onScroll}
        className="drum-scroll"
        style={{ height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', paddingTop: D_H, paddingBottom: D_H, msOverflowStyle: 'none', scrollbarWidth: 'none' }}
      >
        {options.map(v => (
          <div key={v} onClick={() => selectItem(v)} style={{
            height: D_H, display: 'flex', alignItems: 'center', justifyContent: 'center',
            scrollSnapAlign: 'center', cursor: 'pointer',
            fontSize: 20, fontWeight: v === value ? 800 : 400,
            color: v === value ? color : '#6B7280', transition: 'all 120ms',
          }}>
            {fmt(v)}
          </div>
        ))}
      </div>
    </div>
  );
}

function TcAmPm({ value, onChange, color }: { value: 'AM'|'PM'; onChange: (v: 'AM'|'PM') => void; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'center' }}>
      {(['AM','PM'] as const).map(v => (
        <button key={v} onClick={() => onChange(v)} style={{
          width: 46, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer',
          backgroundColor: value === v ? color : '#F3F4F6',
          color: value === v ? '#fff' : '#9CA3AF',
          fontSize: 12, fontWeight: 800, transition: 'all 150ms',
        }}>{v}</button>
      ))}
    </div>
  );
}

function TimeDrum({ label, h, m, ap, onH, onM, onAP, color }: {
  label: string; h: number; m: number; ap: 'AM'|'PM';
  onH: (v: number) => void; onM: (v: number) => void; onAP: (v: 'AM'|'PM') => void; color: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 14, padding: '8px 10px', border: '1.5px solid #E5E7EB' }}>
        <TcDrumColumn options={TC_HOURS}   value={h}  onChange={onH}  color={color} fmt={v => String(v)} />
        <span style={{ fontSize: 22, fontWeight: 800, color: '#D1D5DB', lineHeight: 1 }}>:</span>
        <TcDrumColumn options={TC_MINUTES} value={m}  onChange={onM}  color={color} />
        <TcAmPm value={ap} onChange={onAP} color={color} />
      </div>
    </div>
  );
}

// ── Time input field (unused, kept for reference) ─────────────────────────────

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 44, borderRadius: 11, border: `1.5px solid ${focused ? '#6366F1' : '#E5E7EB'}`,
          backgroundColor: focused ? '#fff' : '#F9FAFB',
          padding: '0 12px', fontSize: 14, color: '#111827', outline: 'none',
          transition: 'border-color 0.2s, background-color 0.2s', fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

// ── Employee summary card ─────────────────────────────────────────────────────

function EmployeeCard({
  emp, logs, color, expanded, onToggle, onEdit, onDelete,
}: {
  emp: Employee; logs: TimeLog[]; color: string;
  expanded: boolean; onToggle: () => void;
  onEdit: (log: TimeLog) => void; onDelete: (log: TimeLog) => void;
}) {
  const initials = `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();
  const completedLogs = logs.filter(l => l.clockOut);
  const totalMin = completedLogs.reduce((s, l) => s + workedMinutes(l), 0);
  const isDeleted = !!emp.deletedAt;

  return (
    <div style={{
      backgroundColor: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderRadius: 20, border: '1px solid rgba(255,255,255,0.7)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.07)', overflow: 'hidden',
    }}>
      {/* Header row */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 20px',
          width: '100%', textAlign: 'left', background: 'none', border: 'none',
          cursor: 'pointer', transition: 'background-color 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.02)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        {/* Avatar */}
        <div style={{
          width: 48, height: 48, borderRadius: 16, flexShrink: 0,
          backgroundColor: isDeleted ? '#9CA3AF' : color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 17,
        }}>
          {initials}
        </div>

        {/* Name + logs count */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {emp.firstName} {emp.lastName}
            </p>
            {isDeleted && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', backgroundColor: '#F3F4F6', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                dado de baja
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
            {completedLogs.length} registro{completedLogs.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total hours */}
        <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 8 }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>
            {fmtHours(totalMin)}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, fontWeight: 500 }}>total</p>
        </div>

        {/* Chevron */}
        <div style={{ color: '#9CA3AF', flexShrink: 0 }}>
          {expanded ? <IconChevUp /> : <IconChevDown />}
        </div>
      </button>

      {/* Log rows */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {logs.length === 0 ? (
            <p style={{ padding: '16px 20px', fontSize: 13, color: '#9CA3AF', margin: 0 }}>Sin registros este período.</p>
          ) : (
            logs.map(log => {
              const mins = workedMinutes(log);
              const breakMs = completedBreakMs(log);
              const breakMin = Math.round(breakMs / 60000);
              const isActive = !log.clockOut;
              const breaks = log.breaks ?? (log.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : []);

              return (
                <div
                  key={log.logId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Date + times */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 3px' }}>
                      {fmtDateShort(log.date)}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 500 }}>
                        {fmt12(log.clockIn)} → {log.clockOut ? fmt12(log.clockOut) : <span style={{ color: '#10B981', fontWeight: 600 }}>En turno</span>}
                      </span>
                      {breakMin > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
                          <span style={{ color: '#D1D5DB' }}><IconCoffee /></span>
                          {breakMin}m
                        </span>
                      )}
                      {breaks.length > 1 && (
                        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{breaks.length} descansos</span>
                      )}
                    </div>
                  </div>

                  {/* Hours worked */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 52 }}>
                    {isActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
                        <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>Activo</span>
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>{fmtHours(mins)}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => onEdit(log)}
                      style={{
                        width: 32, height: 32, borderRadius: 9, border: '1px solid #E5E7EB',
                        backgroundColor: '#F9FAFB', color: color, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background-color 0.15s',
                      }}
                      title="Editar registro"
                    >
                      <IconEdit />
                    </button>
                    <button
                      onClick={() => onDelete(log)}
                      style={{
                        width: 32, height: 32, borderRadius: 9, border: '1px solid #FECACA',
                        backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background-color 0.15s',
                      }}
                      title="Eliminar registro"
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Edit Log Modal ─────────────────────────────────────────────────────────────

function EditLogModal({
  log, open, onClose, onSave, color,
}: {
  log: TimeLog | null; open: boolean; onClose: () => void;
  onSave: (logId: string, payload: { clockIn?: string; clockOut?: string; breaks?: { start: string; end?: string }[] }) => Promise<void>;
  color: string;
}) {
  const [inH,  setInH]  = useState(9);
  const [inM,  setInM]  = useState(0);
  const [inAP, setInAP] = useState<'AM'|'PM'>('AM');
  const [outH,  setOutH]  = useState(5);
  const [outM,  setOutM]  = useState(0);
  const [outAP, setOutAP] = useState<'AM'|'PM'>('PM');
  const [hasOut, setHasOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (log) {
      const cin = new Date(log.clockIn);
      setInH(cin.getHours() % 12 || 12);
      setInM(cin.getMinutes());
      setInAP(cin.getHours() >= 12 ? 'PM' : 'AM');
      if (log.clockOut) {
        const cout = new Date(log.clockOut);
        setOutH(cout.getHours() % 12 || 12);
        setOutM(cout.getMinutes());
        setOutAP(cout.getHours() >= 12 ? 'PM' : 'AM');
        setHasOut(true);
      } else {
        setHasOut(false);
      }
      setError('');
    }
  }, [log]);

  const drumToISO = (dateBase: string, h: number, m: number, ap: 'AM'|'PM') => {
    const h24 = ap === 'PM' ? (h === 12 ? 12 : h + 12) : (h === 12 ? 0 : h);
    return new Date(`${dateBase}T${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`).toISOString();
  };

  const handleSave = async () => {
    if (!log) return;
    setError('');
    const dateBase = log.date;
    const inISO = drumToISO(dateBase, inH, inM, inAP);
    let outISO: string | undefined;
    if (hasOut) {
      outISO = drumToISO(dateBase, outH, outM, outAP);
      if (new Date(outISO) <= new Date(inISO)) {
        const d = new Date(outISO); d.setDate(d.getDate() + 1); outISO = d.toISOString();
      }
    }
    setSaving(true);
    try {
      await onSave(log.logId, { clockIn: inISO, ...(outISO ? { clockOut: outISO } : {}) });
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Editar Registro</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
          <IconClose />
        </button>
      </div>

      {log && (
        <p style={{ fontSize: 13, color: '#9CA3AF', margin: '-8px 0 0', lineHeight: 1.5 }}>
          {fmtDateShort(log.date)}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <TimeDrum label="Entrada" h={inH} m={inM} ap={inAP} onH={setInH} onM={setInM} onAP={setInAP} color={color} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}>
            <input type="checkbox" checked={hasOut} onChange={e => setHasOut(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: color }} />
            Registrar salida
          </label>
        </div>

        {hasOut && (
          <TimeDrum label="Salida" h={outH} m={outM} ap={outAP} onH={setOutH} onM={setOutM} onAP={setOutAP} color={color} />
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 2, height: 46, borderRadius: 12, border: 'none',
            backgroundColor: color, fontSize: 14, fontWeight: 700, color: '#fff',
            cursor: 'pointer', opacity: saving ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 14px ${color}40`,
          }}
        >
          {saving ? <Spinner /> : 'Guardar Cambios'}
        </button>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TimeclockPage() {
  const { business, loading: authLoading } = useAuth();
  const color = business?.color ?? '#E11D48';

  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [logs, setLogs]             = useState<TimeLog[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [periodOffset, setPeriodOffset] = useState(0);
  const [expanded, setExpanded]     = useState<Record<string, boolean>>({});

  // Edit
  const [editLog, setEditLog]       = useState<TimeLog | null>(null);
  const [editOpen, setEditOpen]     = useState(false);

  // Delete
  const [deleteLog, setDeleteLog]   = useState<TimeLog | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const period = business ? getPayPeriod(business, periodOffset) : null;

  const isCurrentPeriod = periodOffset === 0;
  const periodLabel = periodOffset === 0 ? 'Período actual'
    : periodOffset === -1 ? 'Período anterior'
    : `Hace ${-periodOffset} períodos`;

  const load = useCallback(async () => {
    if (!business?.businessId || !period) return;
    setLoading(true);
    setError('');
    try {
      const [emps, tlogs] = await Promise.all([
        api.getEmployees(business.businessId, true), // includeDeleted so fired/left employees still show
        api.getTimeLogs(business.businessId, toDateStr(period.start), toDateStr(period.end)),
      ]);
      setEmployees(emps);
      setLogs(tlogs);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [business?.businessId, periodOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  // ── Build employee roster (includes orphaned logs) ───────────────────────────

  // Map known employees by employeeId and userId for fast lookup
  const empByEmpId = new Map(employees.map(e => [e.employeeId, e]));
  const empByUserId = new Map(employees.map(e => [e.userId, e]));

  function resolveEmp(employeeId: string): Employee | null {
    return empByEmpId.get(employeeId) ?? empByUserId.get(employeeId) ?? null;
  }

  // Unique employeeIds across all logs
  const allEmpIds = [...new Set(logs.map(l => l.employeeId))];

  const completedLogs = logs.filter(l => l.clockOut);
  const totalMin = completedLogs.reduce((s, l) => s + workedMinutes(l), 0);

  // ── PDF export ───────────────────────────────────────────────────────────────

  const handleExport = () => {
    if (!period || logs.length === 0) return;

    const generatedDate = new Date().toLocaleDateString('es', { month: 'long', day: 'numeric', year: 'numeric' });

    // Split period into calendar weeks
    const weeks: { label: string; start: Date; end: Date }[] = [];
    let cursor = new Date(period.start);
    let weekNum = 1;
    while (cursor <= period.end) {
      const wStart = new Date(cursor);
      const wEnd   = new Date(cursor);
      wEnd.setDate(wEnd.getDate() + 6);
      if (wEnd > period.end) wEnd.setTime(period.end.getTime());
      const fmt = (d: Date) => d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
      weeks.push({ start: wStart, end: wEnd, label: `Semana ${weekNum}: ${fmt(wStart)} – ${fmt(wEnd)}` });
      cursor.setDate(cursor.getDate() + 7);
      weekNum++;
    }

    const doneLogs = logs.filter(l => l.clockOut);

    // Week sections
    let weekSections = '';
    for (const week of weeks) {
      const weekLogs = doneLogs
        .filter(l => { const d = new Date(l.clockIn); return d >= week.start && d <= week.end; })
        .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());

      const weekTotal = weekLogs.reduce((s, l) => s + workedMinutes(l), 0);
      let shiftRows = '';
      if (weekLogs.length === 0) {
        shiftRows = '<tr><td colspan="6" class="empty">Sin turnos esta semana</td></tr>';
      } else {
        for (const l of weekLogs) {
          const emp = resolveEmp(l.employeeId);
          const empName = emp ? `${emp.firstName} ${emp.lastName}` : 'Empleado eliminado';
          const dateLabel = new Date(l.clockIn).toLocaleDateString('es', { weekday: 'short', month: 'short', day: 'numeric' });
          const breaks = (l.breaks && l.breaks.length > 0) ? l.breaks : (l.breakStart ? [{ start: l.breakStart, end: l.breakEnd }] : []);
          const breakHtml = breaks.length > 0
            ? breaks.map((b, i) => `<div class="break-item">${breaks.length > 1 ? `B${i+1}: ` : ''}${fmt12(b.start)} – ${b.end ? fmt12(b.end) : 'abierto'}</div>`).join('')
            : '<span class="no-break">—</span>';
          const flags = [
            l.overtimeDay ? '<span class="flag ot">OT</span>' : '',
            l.missedBreakPunch ? '<span class="flag missed">Marcaje perdido</span>' : '',
          ].filter(Boolean).join(' ');
          const mins = workedMinutes(l);
          const hoursStr = mins > 0 ? `${(mins / 60).toFixed(2)}h` : '--';
          shiftRows += `
            <tr class="shift-row">
              <td class="date-cell">${dateLabel}</td>
              <td class="emp-name">${empName} ${flags}</td>
              <td>${fmt12(l.clockIn)}</td>
              <td>${breakHtml}</td>
              <td>${fmt12(l.clockOut!)}</td>
              <td class="hours">${hoursStr}</td>
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

    // Summary rows per person (including orphans)
    let summaryRows = '';
    for (const empId of allEmpIds) {
      const emp = resolveEmp(empId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Empleado eliminado';
      const isDeleted = !emp || !!emp.deletedAt;
      let weekCells = '';
      let grandTotal = 0;
      for (const week of weeks) {
        const mins = doneLogs
          .filter(l => l.employeeId === empId && new Date(l.clockIn) >= week.start && new Date(l.clockIn) <= week.end)
          .reduce((s, l) => s + workedMinutes(l), 0);
        grandTotal += mins;
        weekCells += `<td class="${mins > 2400 ? 'ot-cell' : ''}">${mins > 0 ? `${(mins / 60).toFixed(2)}h` : '&ndash;'}</td>`;
      }
      if (grandTotal === 0) continue;
      summaryRows += `<tr${isDeleted ? ' style="color:#9CA3AF"' : ''}><td class="emp-name">${name}${isDeleted ? ' <span style="font-size:10px;font-weight:700;background:#F3F4F6;padding:1px 5px;border-radius:4px">dado de baja</span>' : ''}</td>${weekCells}<td class="total-cell">${(grandTotal / 60).toFixed(2)}h</td></tr>`;
    }

    const weekHeaders = weeks.map(w => `<th>${w.label}</th>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Helvetica, sans-serif; color: #111827; padding: 36px; font-size: 13px; }
    .header { margin-bottom: 28px; }
    .header h1 { font-size: 22px; font-weight: 800; color: ${color}; }
    .header .meta { color: #6B7280; font-size: 12px; margin-top: 4px; }
    .section-title { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #111827; margin: 28px 0 12px; border-bottom: 2px solid ${color}; padding-bottom: 6px; }
    .week-block { margin-bottom: 24px; }
    .week-header { display: flex; justify-content: space-between; align-items: center; background: ${color}18; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; }
    .week-header span { font-weight: 700; font-size: 13px; color: ${color}; }
    .week-header .week-total { font-size: 14px; font-weight: 800; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F9FAFB; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; color: #6B7280; border-bottom: 1px solid #E5E7EB; }
    td { padding: 7px 10px; border-bottom: 1px solid #F3F4F6; vertical-align: middle; }
    .date-cell { font-weight: 700; color: #374151; white-space: nowrap; }
    .emp-name { font-weight: 600; }
    .hours { font-weight: 700; text-align: right; }
    .total-cell { font-weight: 800; font-size: 14px; text-align: right; color: ${color}; }
    .ot-cell { color: #DC2626; font-weight: 700; }
    .break-item { display: block; font-size: 11px; color: #D97706; }
    .no-break { font-size: 12px; color: #6B7280; }
    .flag { font-size: 10px; font-weight: 700; border-radius: 4px; padding: 1px 5px; margin-left: 4px; }
    .flag.ot { background: #FEE2E2; color: #DC2626; }
    .flag.missed { background: #FEF3C7; color: #D97706; }
    .empty { color: #374151; font-weight: 600; font-style: italic; padding: 12px 10px; background: #F9FAFB; }
    .summary-table th, .summary-table td { text-align: center; }
    .summary-table td:first-child, .summary-table th:first-child { text-align: left; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Reporte de Nómina</h1>
    <div class="meta">Período de Pago: ${period.label} &bull; Generado: ${generatedDate}</div>
  </div>
  <div class="section-title">Turnos por Semana</div>
  ${weekSections}
  <div class="section-title">Resumen</div>
  <table class="summary-table">
    <thead><tr><th>Empleado</th>${weekHeaders}<th>Total</th></tr></thead>
    <tbody>${summaryRows || '<tr><td colspan="10" class="empty">Sin registros completados este período</td></tr>'}</tbody>
  </table>
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSaveEdit = async (logId: string, payload: { clockIn?: string; clockOut?: string }) => {
    await api.updateTimeLog(logId, payload);
    setLogs(prev => prev.map(l => l.logId === logId ? { ...l, ...payload } : l));
  };

  const handleDelete = async () => {
    if (!deleteLog) return;
    setDeleting(true);
    try {
      await api.deleteTimeLog(deleteLog.logId);
      setLogs(prev => prev.filter(l => l.logId !== deleteLog.logId));
      setDeleteLog(null);
    } catch (e: any) { setError(e.message); }
    finally { setDeleting(false); }
  };

  const toggleExpanded = (empId: string) => {
    setExpanded(prev => ({ ...prev, [empId]: !prev[empId] }));
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ padding: '32px 36px', maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div className="sk" style={{ width: 130, height: 26, borderRadius: 8 }} />
            <div className="sk" style={{ width: 210, height: 14, borderRadius: 6 }} />
          </div>
          <div className="sk" style={{ width: 130, height: 44, borderRadius: 14 }} />
        </div>
        {/* Period nav */}
        <div className="sk-card" style={{ height: 66, borderRadius: 16, marginBottom: 20 }} />
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
          {[0, 1].map(i => (
            <div key={i} className="sk-card" style={{ borderRadius: 16, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, animationDelay: `${i * 100}ms` }}>
              <div className="sk" style={{ width: '55%', height: 11 }} />
              <div className="sk" style={{ width: '40%', height: 26 }} />
              <div className="sk" style={{ width: '70%', height: 11 }} />
            </div>
          ))}
        </div>
        {/* Employee rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="sk-card" style={{
            borderRadius: 16, padding: '14px 18px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14,
            animationDelay: `${i * 80}ms`,
          }}>
            <div className="sk" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div className="sk" style={{ height: 13, width: '38%' }} />
              <div className="sk" style={{ height: 10, width: '22%' }} />
            </div>
            <div className="sk" style={{ width: 56, height: 28, borderRadius: 8 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .drum-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ padding: '32px 36px', maxWidth: 900, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Reportes</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Horas trabajadas por período</p>
          </div>
          <button
            onClick={handleExport}
            disabled={logs.length === 0 || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              height: 44, paddingLeft: 16, paddingRight: 18,
              borderRadius: 14, border: `1.5px solid ${color}`,
              backgroundColor: `${color}0D`, color,
              fontSize: 13, fontWeight: 700, cursor: logs.length === 0 || loading ? 'not-allowed' : 'pointer',
              opacity: logs.length === 0 || loading ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            <IconPdf />
            Exportar PDF
          </button>
        </div>

        {/* ── Period nav ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          padding: '14px 20px', marginBottom: 20,
        }}>
          <button
            onClick={() => setPeriodOffset(o => o - 1)}
            style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}
          >
            <IconChevLeft />
          </button>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: color, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{periodLabel}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
              {period?.label ?? '—'}
            </p>
          </div>

          <button
            onClick={() => setPeriodOffset(o => o + 1)}
            disabled={isCurrentPeriod}
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid #E5E7EB',
              backgroundColor: isCurrentPeriod ? '#F3F4F6' : '#F9FAFB',
              cursor: isCurrentPeriod ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isCurrentPeriod ? '#D1D5DB' : '#374151',
            }}
          >
            <IconChevRight />
          </button>
        </div>

        {/* ── Summary stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Horas totales', value: fmtHours(totalMin), sub: `${completedLogs.length} registro${completedLogs.length !== 1 ? 's' : ''} completados` },
            { label: 'Personas con registros', value: String(allEmpIds.length), sub: allEmpIds.length === 1 ? 'persona este período' : 'personas este período' },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              backgroundColor: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 16, border: '1px solid rgba(255,255,255,0.7)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
              padding: '16px 20px',
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 2px', letterSpacing: '-0.5px' }}>{value}</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ── Error ── */}
        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#DC2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="sk-card" style={{
                borderRadius: 16, padding: '14px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
                animationDelay: `${i * 80}ms`,
              }}>
                <div className="sk" style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div className="sk" style={{ height: 13, width: '38%' }} />
                  <div className="sk" style={{ height: 10, width: '22%' }} />
                </div>
                <div className="sk" style={{ width: 56, height: 28, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && logs.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 72, gap: 14 }}>
            <div style={{ color: '#D1D5DB' }}><IconClock /></div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Sin registros este período</p>
              <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Los empleados aún no han marcado entrada este período.</p>
            </div>
            {periodOffset < 0 && (
              <button
                onClick={() => setPeriodOffset(0)}
                style={{ height: 40, paddingLeft: 16, paddingRight: 16, borderRadius: 12, border: `1.5px solid ${color}`, backgroundColor: `${color}10`, color, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
              >
                Ver período actual
              </button>
            )}
          </div>
        )}

        {/* ── Employee cards ── */}
        {!loading && logs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allEmpIds
              .map(empId => {
                const emp = resolveEmp(empId);
                const empLogs = logs
                  .filter(l => l.employeeId === empId)
                  .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
                const totalMins = empLogs.filter(l => l.clockOut).reduce((s, l) => s + workedMinutes(l), 0);
                // Placeholder for hard-deleted employees
                const resolvedEmp: Employee = emp ?? {
                  employeeId: empId,
                  userId: empId,
                  businessId: '',
                  firstName: 'Empleado',
                  lastName: 'eliminado',
                  email: '',
                  deletedAt: 'deleted',
                  createdAt: '',
                } as Employee;
                return { resolvedEmp, empLogs, totalMins };
              })
              .sort((a, b) => b.totalMins - a.totalMins)
              .map(({ resolvedEmp, empLogs }) => {
                const isExpanded = expanded[resolvedEmp.employeeId] ?? false;
                return (
                  <EmployeeCard
                    key={resolvedEmp.employeeId}
                    emp={resolvedEmp}
                    logs={empLogs}
                    color={color}
                    expanded={isExpanded}
                    onToggle={() => toggleExpanded(resolvedEmp.employeeId)}
                    onEdit={log => { setEditLog(log); setEditOpen(true); }}
                    onDelete={log => setDeleteLog(log)}
                  />
                );
              })}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      <EditLogModal
        log={editLog}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveEdit}
        color={color}
      />

      {/* ── Delete Confirm ── */}
      <Confirm
        open={!!deleteLog}
        title="Eliminar Registro"
        message={deleteLog
          ? `¿Eliminar el registro del ${fmtDateShort(deleteLog.date)}? Esta acción no se puede deshacer.`
          : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteLog(null)}
        loading={deleting}
      />
    </>
  );
}
