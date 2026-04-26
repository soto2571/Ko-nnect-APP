'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/services/api';

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcoMinus()  { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M20 12H4"/></svg>; }
function IcoPlus()   { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 4v16m8-8H4"/></svg>; }
function IcoCheck()  { return <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>; }
function IcoMail()   { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>; }
function IcoShield() { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>; }
function IcoLogout() { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }
function IcoTrash()  { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>; }
function IcoWarn()   { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>; }
function IcoKey()    { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>; }
function IcoEye()    { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>; }
function IcoEyeOff() { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>; }
function IcoInfo()   { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }

// ── Constants ──────────────────────────────────────────────────────────────────
const PRESET_COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];
const DAYS = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

// ── Primitives ─────────────────────────────────────────────────────────────────

function Card({ children, danger = false, full = false }: {
  children: React.ReactNode; danger?: boolean; full?: boolean;
}) {
  return (
    <div style={{
      backgroundColor: danger ? '#FFF5F5' : '#fff',
      border: `1px solid ${danger ? '#FECACA' : '#E8EDF2'}`,
      borderRadius: 16,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      gridColumn: full ? '1 / -1' : undefined,
    }}>
      {children}
    </div>
  );
}

function CardHead({ title, subtitle, danger = false }: { title: string; subtitle?: string; danger?: boolean }) {
  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: `1px solid ${danger ? '#FEE2E2' : '#F1F5F9'}`,
      backgroundColor: danger ? '#FFF1F1' : '#FAFBFC',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {danger && <span style={{ color: '#B91C1C' }}><IcoWarn /></span>}
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: danger ? '#B91C1C' : '#111827', margin: 0 }}>{title}</p>
        {subtitle && <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

function CardBody({ children, cols }: { children: React.ReactNode; cols?: string }) {
  return (
    <div style={{
      padding: '18px 20px',
      display: cols ? 'grid' : 'flex',
      gridTemplateColumns: cols,
      flexDirection: cols ? undefined : 'column',
      gap: 16,
    }}>
      {children}
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </label>
      {children}
      {hint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#9CA3AF' }}>
          <IcoInfo />
          <span style={{ fontSize: 11, lineHeight: 1.4 }}>{hint}</span>
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ gridColumn: '1 / -1', height: 1, backgroundColor: '#F1F5F9', margin: '0 -20px' }} />;
}

function StyledInput({ value, onChange, placeholder, type = 'text', right }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      height: 38, borderRadius: 9,
      border: `1.5px solid ${focused ? '#6366F1' : '#E2E8F0'}`,
      backgroundColor: focused ? '#fff' : '#F8FAFC',
      padding: '0 11px', transition: 'border-color 150ms, background 150ms',
    }}>
      <input
        type={type} value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#111827', fontFamily: 'inherit' }}
      />
      {right}
    </div>
  );
}

function PwInput({ value, onChange, placeholder, show, onToggle }: {
  value: string; onChange: (v: string) => void;
  placeholder: string; show: boolean; onToggle: () => void;
}) {
  return (
    <StyledInput
      value={value} onChange={onChange}
      type={show ? 'text' : 'password'} placeholder={placeholder}
      right={
        <button type="button" onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
          {show ? <IcoEyeOff /> : <IcoEye />}
        </button>
      }
    />
  );
}

function Stepper({ value, onDec, onInc }: { value: string; onDec: () => void; onInc: () => void }) {
  const btn: React.CSSProperties = {
    width: 32, height: 32, border: 'none', cursor: 'pointer', background: '#F1F5F9',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151',
    flexShrink: 0,
  };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 9, overflow: 'hidden', alignSelf: 'flex-start' }}>
      <button onClick={onDec} style={{ ...btn, borderRight: '1px solid #E2E8F0' }}><IcoMinus /></button>
      <span style={{ padding: '0 14px', fontSize: 13, fontWeight: 700, color: '#111827', minWidth: 90, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {value}
      </span>
      <button onClick={onInc} style={{ ...btn, borderLeft: '1px solid #E2E8F0' }}><IcoPlus /></button>
    </div>
  );
}

function Toggle({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <button role="switch" aria-checked={value} onClick={() => onChange(!value)} style={{
      width: 42, height: 23, borderRadius: 12, border: 'none', cursor: 'pointer',
      backgroundColor: value ? color : '#D1D5DB',
      padding: 2, display: 'flex', alignItems: 'center',
      justifyContent: value ? 'flex-end' : 'flex-start',
      transition: 'background-color 200ms', flexShrink: 0,
    }}>
      <div style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
    </button>
  );
}

function Pills<T extends string>({ options, value, onChange, color }: {
  options: { value: T; label: string }[];
  value: T; onChange: (v: T) => void; color: string;
}) {
  return (
    <div style={{ display: 'inline-flex', border: '1.5px solid #E2E8F0', borderRadius: 9, overflow: 'hidden' }}>
      {options.map((o, i) => {
        const active = value === o.value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} style={{
            padding: '7px 14px', border: 'none', cursor: 'pointer',
            backgroundColor: active ? color : '#F8FAFC',
            color: active ? '#fff' : '#374151',
            fontSize: 12, fontWeight: 600, transition: 'all 150ms',
            borderLeft: i > 0 ? '1px solid #E2E8F0' : 'none',
          }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function DayPills({ value, onChange, color }: { value: number; onChange: (i: number) => void; color: string }) {
  return (
    <div style={{ display: 'inline-flex', border: '1.5px solid #E2E8F0', borderRadius: 9, overflow: 'hidden' }}>
      {DAYS.map((d, i) => {
        const active = value === i;
        return (
          <button key={i} onClick={() => onChange(i)} style={{
            width: 36, padding: '7px 0', border: 'none', cursor: 'pointer',
            backgroundColor: active ? color : '#F8FAFC',
            color: active ? '#fff' : '#374151',
            fontSize: 11, fontWeight: 700, transition: 'all 150ms',
            borderLeft: i > 0 ? '1px solid #E2E8F0' : 'none',
          }}>
            {d}
          </button>
        );
      })}
    </div>
  );
}

function AlertMsg({ type, text }: { type: 'ok' | 'err'; text: string }) {
  return (
    <div style={{
      padding: '9px 13px', borderRadius: 9, fontSize: 13, fontWeight: 500,
      backgroundColor: type === 'ok' ? '#F0FDF4' : '#FEF2F2',
      color: type === 'ok' ? '#166534' : '#B91C1C',
      border: `1px solid ${type === 'ok' ? '#BBF7D0' : '#FECACA'}`,
      gridColumn: '1 / -1',
    }}>
      {text}
    </div>
  );
}

function ActionBtn({ onClick, disabled, label, icon, variant = 'primary', color }: {
  onClick: () => void; disabled?: boolean; label: string;
  icon?: React.ReactNode; variant?: 'primary' | 'ghost' | 'danger'; color?: string;
}) {
  const bg   = variant === 'primary' ? (color ?? '#6366F1') : variant === 'danger' ? '#FEF2F2' : '#F1F5F9';
  const fg   = variant === 'primary' ? '#fff' : variant === 'danger' ? '#B91C1C' : '#374151';
  const bd   = variant === 'danger' ? '1.5px solid #FECACA' : 'none';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 16px', borderRadius: 9, border: bd,
      backgroundColor: bg, color: fg,
      fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'opacity 150ms',
      boxShadow: variant === 'primary' ? `0 2px 8px ${color ?? '#6366F1'}44` : 'none',
    }}>
      {icon}{label}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { user, business, logout, refreshBusiness } = useAuth();
  const color = business?.color ?? '#E11D48';

  const [name,               setName]               = useState('');
  const [bColor,             setBColor]             = useState('#E11D48');
  const [payPeriodType,      setPayPeriodType]      = useState<'weekly'|'biweekly'|'semi-monthly'>('weekly');
  const [payPeriodStartDay,  setPayPeriodStartDay]  = useState(0);
  const [payPeriodAnchorDate,setPayPeriodAnchorDate]= useState('');
  const [maxHoursPerDay,     setMaxHoursPerDay]     = useState(0);
  const [schedulingWeeks,    setSchedulingWeeks]    = useState(6);
  const [autoClockOut,       setAutoClockOut]       = useState(false);
  const [autoClockOutMins,   setAutoClockOutMins]   = useState(30);

  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showPw,     setShowPw]     = useState({ cur: false, nw: false, con: false });

  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState<{ type:'ok'|'err'; text:string }|null>(null);
  const [changingPw,  setChangingPw]  = useState(false);
  const [pwMsg,       setPwMsg]       = useState<{ type:'ok'|'err'; text:string }|null>(null);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleteText,  setDeleteText]  = useState('');
  const [deletingBiz, setDeletingBiz] = useState(false);

  const isNew        = !business;
  const isGoogleUser = user?.provider === 'google';

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setBColor(business.color);
    setPayPeriodType(business.payPeriodType ?? 'weekly');
    setPayPeriodStartDay(business.payPeriodStartDay ?? 0);
    setPayPeriodAnchorDate(business.payPeriodAnchorDate ?? '');
    setMaxHoursPerDay(business.maxHoursPerDay ?? 0);
    setSchedulingWeeks(business.schedulingWeeks ?? 6);
    setAutoClockOut(business.autoClockOut ?? false);
    setAutoClockOutMins(business.autoClockOutMinutes ?? 30);
  }, [business]);

  const anchorOptions = (() => {
    const today = new Date(); today.setHours(0,0,0,0);
    const diff  = (today.getDay() - payPeriodStartDay + 7) % 7;
    const last  = new Date(today); last.setDate(today.getDate() - diff);
    const prev  = new Date(last);  prev.setDate(last.getDate() - 14);
    const fmt   = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lbl   = (d: Date) => d.toLocaleDateString('es-PR', { weekday:'short', month:'short', day:'numeric' });
    return [last, prev].map(d => ({ val: fmt(d), label: lbl(d) }));
  })();

  const handleSave = async () => {
    if (!name.trim()) { setSaveMsg({ type:'err', text:'El nombre del negocio es requerido.' }); return; }
    setSaving(true); setSaveMsg(null);
    try {
      const payload = {
        name: name.trim(), color: bColor, payPeriodType, payPeriodStartDay,
        payPeriodAnchorDate: payPeriodAnchorDate || undefined,
        maxHoursPerDay, autoClockOut,
        autoClockOutMinutes: autoClockOut ? autoClockOutMins : 30,
        schedulingWeeks,
      };
      if (isNew) await api.createBusiness(payload);
      else       await api.updateBusiness(business!.businessId, payload);
      await refreshBusiness();
      setSaveMsg({ type:'ok', text: isNew ? 'Negocio creado exitosamente.' : 'Cambios guardados correctamente.' });
    } catch (e: any) { setSaveMsg({ type:'err', text: e.message }); }
    finally { setSaving(false); }
  };

  const handleChangePw = async () => {
    if (!currentPw || !newPw || !confirmPw) { setPwMsg({ type:'err', text:'Por favor llena todos los campos.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type:'err', text:'Las contraseñas nuevas no coinciden.' }); return; }
    if (newPw.length < 6)   { setPwMsg({ type:'err', text:'Mínimo 6 caracteres.' }); return; }
    setChangingPw(true); setPwMsg(null);
    try {
      await api.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setPwMsg({ type:'ok', text:'Contraseña actualizada correctamente.' });
    } catch (e: any) { setPwMsg({ type:'err', text: e.message }); }
    finally { setChangingPw(false); }
  };

  const handleDelete = async () => {
    setDeletingBiz(true);
    try {
      await api.deleteBusiness(business!.businessId);
      setShowDelete(false);
      await logout();
    } catch (e: any) { alert(e.message); setDeletingBiz(false); }
  };

  return (
    <div style={{ padding: '32px 36px 100px', maxWidth: 960, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 3px', letterSpacing: -0.4 }}>
          Configuración
        </h1>
        <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>
          Gestiona tu negocio, período de pago y preferencias
        </p>
      </div>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* ─── Negocio (half) ─── */}
        <Card>
          <CardHead title="Negocio" subtitle="Información básica" />
          <CardBody>
            <FieldGroup label="Nombre del negocio">
              <StyledInput
                value={name} onChange={setName}
                placeholder="Nombre de tu negocio"
              />
            </FieldGroup>
          </CardBody>
        </Card>

        {/* ─── Color del Negocio (half) ─── */}
        <Card>
          <CardHead title="Color del Negocio" subtitle="Aparece en toda la interfaz y en el app móvil" />
          <CardBody>
            <FieldGroup label="Elige un color">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setBColor(c)} aria-label={c} style={{
                    width: 32, height: 32, borderRadius: 16, backgroundColor: c, border: 'none',
                    cursor: 'pointer', position: 'relative', flexShrink: 0,
                    boxShadow: bColor === c ? `0 0 0 2px #fff, 0 0 0 4px ${c}` : `0 1px 3px ${c}66`,
                    transition: 'box-shadow 150ms',
                  }}>
                    {bColor === c && (
                      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <IcoCheck />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </FieldGroup>
            <FieldGroup label="Vista previa">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: '5px 14px', borderRadius: 8, backgroundColor: bColor, color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  Botón activo
                </div>
                <code style={{ fontSize: 12, color: '#6B7280', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
                  {bColor}
                </code>
              </div>
            </FieldGroup>
          </CardBody>
        </Card>

        {/* ─── Período de Pago (full width) ─── */}
        <Card full>
          <CardHead title="Período de Pago" subtitle="Define cómo se calculan los períodos de nómina" />
          <CardBody cols={payPeriodType === 'biweekly' ? '1fr 1fr 1fr' : '1fr 1fr'}>

            <FieldGroup label="Tipo de período">
              <Pills
                options={[
                  { value: 'weekly',       label: 'Semanal'   },
                  { value: 'biweekly',     label: 'Bisemanal' },
                  { value: 'semi-monthly', label: 'Quincenal' },
                ]}
                value={payPeriodType}
                onChange={v => setPayPeriodType(v)}
                color={color}
              />
            </FieldGroup>

            {(payPeriodType === 'weekly' || payPeriodType === 'biweekly') && (
              <FieldGroup label="Inicio de semana" hint="Día en que comienza la semana laboral">
                <DayPills
                  value={payPeriodStartDay}
                  onChange={d => { setPayPeriodStartDay(d); setPayPeriodAnchorDate(''); }}
                  color={color}
                />
              </FieldGroup>
            )}

            {payPeriodType === 'biweekly' && (
              <FieldGroup label="¿Cuándo empezó tu período actual?" hint="Selecciona la fecha de inicio más reciente">
                <div style={{ display: 'flex', gap: 8 }}>
                  {anchorOptions.map(({ val, label }) => {
                    const active = payPeriodAnchorDate === val;
                    return (
                      <button key={val} onClick={() => setPayPeriodAnchorDate(val)} style={{
                        flex: 1, padding: '8px 10px', borderRadius: 9, cursor: 'pointer',
                        border: `1.5px solid ${active ? color : '#E2E8F0'}`,
                        backgroundColor: active ? color : '#F8FAFC',
                        color: active ? '#fff' : '#111827',
                        textAlign: 'center', transition: 'all 150ms',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{label}</div>
                        {active && <div style={{ fontSize: 10, color:'rgba(255,255,255,0.85)', marginTop: 2, fontWeight: 600 }}>Período actual</div>}
                      </button>
                    );
                  })}
                </div>
              </FieldGroup>
            )}

            {payPeriodType === 'semi-monthly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF', alignSelf: 'flex-end', paddingBottom: 4 }}>
                <IcoInfo />
                <span style={{ fontSize: 12 }}>Períodos fijos: 1–15 y 16–fin de mes</span>
              </div>
            )}

          </CardBody>
        </Card>

        {/* ─── Reglas de Horario (full width) ─── */}
        <Card full>
          <CardHead title="Reglas de Horario" subtitle="Controla límites y automatizaciones de turnos" />
          <CardBody cols={autoClockOut ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr'}>

            <FieldGroup label="Horas máx. por día" hint="0 = sin límite">
              <Stepper
                value={maxHoursPerDay === 0 ? 'Sin límite' : `${maxHoursPerDay}h`}
                onDec={() => setMaxHoursPerDay(Math.max(0, maxHoursPerDay - 1))}
                onInc={() => setMaxHoursPerDay(Math.min(24, maxHoursPerDay + 1))}
              />
            </FieldGroup>

            <FieldGroup label="Ventana de horario" hint="Semanas hacia adelante para programar">
              <Stepper
                value={`${schedulingWeeks} sem.`}
                onDec={() => setSchedulingWeeks(Math.max(1, schedulingWeeks - 1))}
                onInc={() => setSchedulingWeeks(Math.min(26, schedulingWeeks + 1))}
              />
            </FieldGroup>

            <FieldGroup label="Salida automática" hint="Marca salida tras fin del turno">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <Toggle value={autoClockOut} onChange={setAutoClockOut} color={color} />
                <span style={{ fontSize: 13, fontWeight: 600, color: autoClockOut ? '#111827' : '#9CA3AF' }}>
                  {autoClockOut ? 'Activada' : 'Desactivada'}
                </span>
              </div>
            </FieldGroup>

            {autoClockOut && (
              <FieldGroup label="Minutos de gracia" hint="Después del fin del turno">
                <Stepper
                  value={`${autoClockOutMins} min`}
                  onDec={() => setAutoClockOutMins(Math.max(5,  autoClockOutMins - 5))}
                  onInc={() => setAutoClockOutMins(Math.min(240, autoClockOutMins + 5))}
                />
              </FieldGroup>
            )}

          </CardBody>
        </Card>

        {/* ─── Cuenta (half) ─── */}
        <Card>
          <CardHead title="Cuenta" subtitle="Información de tu usuario" />
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ color: '#9CA3AF' }}><IcoMail /></span>
                <span style={{ fontSize: 14, color: '#374151' }}>{user?.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ color: '#9CA3AF' }}><IcoShield /></span>
                <span style={{ fontSize: 14, color: '#374151' }}>
                  {user?.role === 'owner' ? 'Dueño / Administrador' : user?.role}
                </span>
              </div>
              <div style={{ height: 1, backgroundColor: '#F1F5F9' }} />
              <ActionBtn
                onClick={logout} label="Cerrar sesión"
                icon={<IcoLogout />} variant="ghost"
              />
            </div>
          </CardBody>
        </Card>

        {/* ─── Contraseña (half, email only) ─── */}
        {!isGoogleUser && (
          <Card>
            <CardHead title="Cambiar Contraseña" subtitle="Solo cuentas con correo y contraseña" />
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <FieldGroup label="Contraseña actual">
                  <PwInput value={currentPw} onChange={setCurrentPw} placeholder="••••••••"
                    show={showPw.cur} onToggle={() => setShowPw(v => ({ ...v, cur: !v.cur }))} />
                </FieldGroup>
                <FieldGroup label="Nueva contraseña">
                  <PwInput value={newPw} onChange={setNewPw} placeholder="Mín. 6 caracteres"
                    show={showPw.nw} onToggle={() => setShowPw(v => ({ ...v, nw: !v.nw }))} />
                </FieldGroup>
                <FieldGroup label="Confirmar contraseña">
                  <PwInput value={confirmPw} onChange={setConfirmPw} placeholder="Repite la contraseña"
                    show={showPw.con} onToggle={() => setShowPw(v => ({ ...v, con: !v.con }))} />
                </FieldGroup>
                {pwMsg && <AlertMsg type={pwMsg.type} text={pwMsg.text} />}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                  <ActionBtn
                    onClick={handleChangePw} disabled={changingPw}
                    label={changingPw ? 'Actualizando…' : 'Actualizar'}
                    icon={<IcoKey />} variant="primary" color={color}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ─── Zona de Peligro (full width) ─── */}
        {business && (
          <Card full danger>
            <CardHead
              title="Zona de Peligro"
              subtitle="Borra permanentemente todos los datos: empleados, turnos e historial de tiempo. Esta acción no tiene vuelta atrás."
              danger
            />
            <CardBody cols="1fr auto">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6B7280' }}>
                <IcoWarn />
                <span style={{ fontSize: 13 }}>
                  <strong style={{ color: '#111827' }}>{business.name}</strong> y todos sus datos serán eliminados permanentemente.
                </span>
              </div>
              <ActionBtn
                onClick={() => { setDeleteText(''); setShowDelete(true); }}
                label="Eliminar negocio" icon={<IcoTrash />} variant="danger"
              />
            </CardBody>
          </Card>
        )}

      </div>

      {/* ── Fixed save bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 240, right: 0, zIndex: 20,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid #E8EDF2',
        padding: '11px 36px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {saveMsg && (
          <span style={{ fontSize: 13, fontWeight: 500, color: saveMsg.type === 'ok' ? '#166534' : '#B91C1C' }}>
            {saveMsg.text}
          </span>
        )}
        <button
          onClick={handleSave} disabled={saving}
          style={{
            marginLeft: 'auto', padding: '9px 24px', borderRadius: 10, border: 'none',
            backgroundColor: color, color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            boxShadow: `0 3px 10px ${color}44`, minWidth: 155,
          }}
        >
          {saving ? 'Guardando…' : isNew ? 'Crear Negocio' : 'Guardar Cambios'}
        </button>
      </div>

      {/* ── Delete confirmation modal ── */}
      {showDelete && (
        <div
          onClick={e => { if (e.target === e.currentTarget && !deletingBiz) setShowDelete(false); }}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: 24,
          }}
        >
          <div style={{
            backgroundColor: '#fff', borderRadius: 18, padding: 28,
            width: '100%', maxWidth: 420,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#B91C1C' }}><IcoWarn /></span>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Confirmación final</h3>
            </div>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
              Escribe <strong style={{ color: '#B91C1C' }}>BORRAR</strong> para confirmar que deseas eliminar el negocio permanentemente.
            </p>
            <StyledInput
              value={deleteText} onChange={setDeleteText}
              placeholder="Escribe BORRAR"
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowDelete(false)} disabled={deletingBiz}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10,
                  border: '1px solid #E5E7EB', backgroundColor: '#F8FAFC',
                  fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteText.toLowerCase() !== 'borrar' || deletingBiz}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
                  backgroundColor: '#B91C1C', fontSize: 14, fontWeight: 700, color: '#fff',
                  cursor: deleteText.toLowerCase() !== 'borrar' || deletingBiz ? 'not-allowed' : 'pointer',
                  opacity: deleteText.toLowerCase() !== 'borrar' || deletingBiz ? 0.35 : 1,
                  transition: 'opacity 150ms',
                }}
              >
                {deletingBiz ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
