'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/services/api';
import type { Business } from '@/types';

// ── Constants ──────────────────────────────────────────────────────────────────
const BRAND = '#E11D48';
const PRESET_COLORS = ['#E11D48','#4F46E5','#0EA5E9','#10B981','#F59E0B','#8B5CF6','#EC4899','#14B8A6'];
const DAYS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
type PayType = 'weekly' | 'biweekly' | 'semi-monthly';
type Step = 1 | 2 | 3;

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcoCheck({ size = 12 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>;
}
function IcoPlus({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M12 5v14M5 12h14"/></svg>;
}
function IcoCopy({ size = 13 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>;
}
function IcoArrowRight({ size = 15 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M9 5l7 7-7 7"/></svg>;
}
function IcoArrowLeft({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M15 19l-7-7 7-7"/></svg>;
}

function Spinner({ color = '#fff' }: { color?: string }) {
  return <div style={{ width: 17, height: 17, borderRadius: 9, border: `2.5px solid ${color}40`, borderTopColor: color, animation: 'ob-spin .7s linear infinite', flexShrink: 0 }} />;
}

// ── Field ──────────────────────────────────────────────────────────────────────
function Field({ id, label, placeholder, value, onChange, autoFocus }: {
  id: string; label: string; placeholder: string;
  value: string; onChange: (v: string) => void; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <label htmlFor={id} style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</label>
      <input
        id={id} value={value} placeholder={placeholder} autoFocus={autoFocus}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          height: 48, borderRadius: 12, padding: '0 16px',
          border: `2px solid ${focused ? BRAND : '#E8ECF0'}`,
          backgroundColor: focused ? '#fff' : '#FAFBFC',
          fontSize: 15, color: '#111827', outline: 'none',
          fontFamily: 'inherit', transition: 'all 150ms',
          boxShadow: focused ? `0 0 0 4px ${BRAND}12` : 'none',
        }}
      />
    </div>
  );
}

// ── CopyRow ────────────────────────────────────────────────────────────────────
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', margin: '0 0 2px', letterSpacing: 0.6 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
      </div>
      <button onClick={copy} style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 8, border: 'none', backgroundColor: copied ? '#D1FAE5' : '#F0F2F5', color: copied ? '#059669' : '#9CA3AF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms' }}>
        {copied ? <IcoCheck size={13} /> : <IcoCopy />}
      </button>
    </div>
  );
}

// ── Step Bar ───────────────────────────────────────────────────────────────────
function StepBar({ step, color }: { step: Step; color: string }) {
  const steps = ['Negocio', 'Equipo', '¡Listo!'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0 }}>
      {steps.map((label, i) => {
        const n = i + 1 as Step;
        const done = step > n, active = step === n;
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: done || active ? color : '#F0F2F5',
                color: done || active ? '#fff' : '#9CA3AF',
                fontWeight: 800, fontSize: 13,
                transition: 'all 0.25s ease',
                boxShadow: active ? `0 6px 16px ${color}45` : done ? `0 2px 8px ${color}30` : 'none',
              }}>
                {done ? <IcoCheck size={13} /> : n}
              </div>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? color : done ? '#374151' : '#B0B8C4', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < 2 && (
              <div style={{ width: 56, height: 2, margin: '0 8px', marginBottom: 18, background: step > n ? `linear-gradient(90deg, ${color}, ${color}80)` : '#E8ECF0', borderRadius: 2, transition: 'background 0.35s ease' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const { user, business, loading, refreshUser, logout } = useAuth();

  const [step, setStep]           = useState<Step>(1);
  const [bizName, setBizName]     = useState('');
  const [color, setColor]         = useState(BRAND);
  const [payType, setPayType]     = useState<PayType>('weekly');
  const [startDay, setStartDay]   = useState(1);
  const [anchorDate, setAnchorDate] = useState('');
  const [savingBiz, setSavingBiz] = useState(false);
  const [bizError, setBizError]   = useState('');
  const [createdBiz, setCreatedBiz] = useState<Business | null>(null);

  type EmpRecord = { name: string; email: string; password: string };
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [addingEmp, setAddingEmp] = useState(false);
  const [empError, setEmpError]   = useState('');
  const [employees, setEmployees] = useState<EmpRecord[]>([]);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (business) { router.replace('/dashboard'); return; }
  }, [loading, user, business, router]);

  const anchorOptions = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff  = (today.getDay() - startDay + 7) % 7;
    const last  = new Date(today); last.setDate(today.getDate() - diff);
    const prev  = new Date(last);  prev.setDate(last.getDate() - 14);
    const fmt   = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const lbl   = (d: Date) => d.toLocaleDateString('es-PR', { weekday: 'short', month: 'short', day: 'numeric' });
    return [last, prev].map(d => ({ val: fmt(d), label: lbl(d) }));
  })();

  useEffect(() => {
    if (payType === 'biweekly') setAnchorDate(anchorOptions[0]?.val ?? '');
  }, [payType, startDay]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !user || business) return null;

  const handleBack = () => {
    if (step === 1) logout();
    else setStep(s => (s - 1) as Step);
  };

  const handleCreateBusiness = async () => {
    if (!bizName.trim()) { setBizError('El nombre del negocio es requerido.'); return; }
    setSavingBiz(true); setBizError('');
    try {
      const biz = await api.createBusiness({
        name: bizName.trim(), color,
        payPeriodType: payType,
        payPeriodStartDay: startDay,
        payPeriodAnchorDate: payType === 'biweekly' ? anchorDate : undefined,
      });
      setCreatedBiz(biz);
      setStep(2);
    } catch (e: any) { setBizError(e.message ?? 'Error al crear el negocio.'); }
    finally { setSavingBiz(false); }
  };

  const handleAddEmployee = async () => {
    if (!firstName.trim() || !lastName.trim()) { setEmpError('Nombre y apellido son requeridos.'); return; }
    if (!createdBiz) return;
    setAddingEmp(true); setEmpError('');
    try {
      const res = await api.addEmployee({
        businessId: createdBiz.businessId,
        businessName: createdBiz.name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      setEmployees(prev => [...prev, {
        name: `${res.employee.firstName} ${res.employee.lastName}`,
        email: res.credentials.email,
        password: res.credentials.password,
      }]);
      setFirstName(''); setLastName('');
    } catch (e: any) { setEmpError(e.message ?? 'Error al agregar el empleado.'); }
    finally { setAddingEmp(false); }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try { await refreshUser(); } catch { /* continue */ }
    router.replace('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", backgroundColor: '#FFF5F7' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes ob-spin  { to { transform: rotate(360deg); } }
        @keyframes ob-b1    { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(80px,60px) scale(1.08)} }
        @keyframes ob-b2    { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(-65px,-70px) scale(1.05)} }
        @keyframes ob-b3    { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(55px,-65px) scale(1.06)} }
        @keyframes ob-b4    { 0%,100%{transform:translate(0,0) scale(1)}   50%{transform:translate(-45px,55px) scale(1.04)} }
        @keyframes ob-in    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ob-fadein{ from{opacity:0} to{opacity:1} }
        .ob-card  { animation: ob-fadein 0.4s ease both; }
        .ob-step  { animation: ob-in 0.32s cubic-bezier(.22,.68,0,1.2) both; }
        .ob-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--btn-shadow-hover) !important; }
        .ob-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .ob-btn-ghost:hover { border-color: #D1D5DB !important; background-color: #F9FAFB !important; color: #374151 !important; }
        @media (max-width: 640px) {
          .ob-card-wrap { padding: 20px 16px 40px !important; }
          .ob-card      { padding: 28px 20px 32px !important; }
        }
      `}</style>

      {/* ── Animated background blobs ── */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: '-12%', top: '-10%', width: 560, height: 560, borderRadius: '50%', background: `radial-gradient(circle, ${color}45 0%, ${color}14 50%, transparent 75%)`, filter: 'blur(10px)', animation: 'ob-b1 12s ease-in-out infinite', transition: 'background 0.7s ease' }} />
        <div style={{ position: 'absolute', right: '-8%', top: '15%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${color}35 0%, ${color}10 55%, transparent 80%)`, filter: 'blur(12px)', animation: 'ob-b2 15s ease-in-out infinite 1.5s', transition: 'background 0.7s ease' }} />
        <div style={{ position: 'absolute', left: '25%', bottom: '-8%', width: 420, height: 420, borderRadius: '50%', background: `radial-gradient(circle, #fb718548 0%, #fb718514 55%, transparent 80%)`, filter: 'blur(14px)', animation: 'ob-b3 13s ease-in-out infinite 3s' }} />
        <div style={{ position: 'absolute', right: '20%', bottom: '18%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`, filter: 'blur(18px)', animation: 'ob-b4 17s ease-in-out infinite 5s', transition: 'background 0.7s ease' }} />
      </div>

      {/* ── Scrollable wrapper ── */}
      <div className="ob-card-wrap" style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px 48px' }}>

        {/* Logo above card */}
        <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Image src="/logo.png" alt="Ko-nnecta'" width={150} height={48} style={{ objectFit: 'contain' }} priority />
        </div>

        {/* ── Glass card ── */}
        <div className="ob-card" style={{
          width: '100%', maxWidth: 580,
          background: 'rgba(255,255,255,0.90)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 28,
          border: '1px solid rgba(255,255,255,0.75)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
          padding: '40px 44px 44px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle inner glow */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

          {/* ── Card header: back + stepbar ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36, position: 'relative', zIndex: 1 }}>
            <button
              onClick={handleBack}
              aria-label={step === 1 ? 'Salir' : 'Volver'}
              style={{ width: 38, height: 38, borderRadius: 11, border: '1.5px solid #E8ECF0', backgroundColor: 'rgba(255,255,255,0.8)', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', transition: 'all 150ms' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#D1D5DB'; el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.10)'; el.style.color = '#374151'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#E8ECF0'; el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; el.style.color = '#6B7280'; }}
            >
              <IcoArrowLeft />
            </button>

            <StepBar step={step} color={color} />

            <div style={{ width: 38 }} /> {/* balance */}
          </div>

          {/* ── Step content ── */}
          <div className="ob-step" key={step} style={{ position: 'relative', zIndex: 1 }}>

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Paso 1 de 3</p>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: -0.6, lineHeight: 1.2 }}>Configura tu negocio</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>Esta información se puede editar después en Ajustes.</p>
                </div>

                <div style={{ height: 1, backgroundColor: '#F0F2F5' }} />

                <Field id="bizName" label="Nombre del negocio" placeholder="Ej: Café Central" value={bizName} onChange={v => { setBizName(v); setBizError(''); }} autoFocus />

                {/* Color */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3, textTransform: 'uppercase' }}>Color de marca</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setColor(c)} style={{
                        width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
                        backgroundColor: c,
                        boxShadow: color === c ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : '0 2px 6px rgba(0,0,0,0.16)',
                        transform: color === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'all 0.18s ease',
                      }} />
                    ))}
                  </div>
                </div>

                {/* Pay period type */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3, textTransform: 'uppercase' }}>Período de pago</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {([['weekly','Semanal'],['biweekly','Bisemanal'],['semi-monthly','Quincenal']] as [PayType,string][]).map(([v, lbl]) => (
                      <button key={v} onClick={() => setPayType(v)} style={{
                        height: 42, borderRadius: 10,
                        border: `2px solid ${payType === v ? color : '#E8ECF0'}`,
                        backgroundColor: payType === v ? color : '#FAFBFC',
                        color: payType === v ? '#fff' : '#374151',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s ease',
                        boxShadow: payType === v ? `0 4px 12px ${color}40` : 'none',
                      }}>{lbl}</button>
                    ))}
                  </div>
                </div>

                {/* Start day */}
                {(payType === 'weekly' || payType === 'biweekly') && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3, textTransform: 'uppercase' }}>Inicia la semana el</label>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {DAYS.map((d, i) => (
                        <button key={i} onClick={() => setStartDay(i)} style={{
                          flex: 1, height: 38, borderRadius: 9,
                          border: `2px solid ${startDay === i ? color : '#E8ECF0'}`,
                          backgroundColor: startDay === i ? color : '#FAFBFC',
                          color: startDay === i ? '#fff' : '#374151',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.18s ease',
                        }}>{d}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anchor date */}
                {payType === 'biweekly' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 700, color: '#6B7280', letterSpacing: 0.3, textTransform: 'uppercase' }}>Inicio del período de referencia</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {anchorOptions.map(({ val, label }) => (
                        <button key={val} onClick={() => setAnchorDate(val)} style={{
                          flex: 1, height: 42, borderRadius: 10,
                          border: `2px solid ${anchorDate === val ? color : '#E8ECF0'}`,
                          backgroundColor: anchorDate === val ? color : '#FAFBFC',
                          color: anchorDate === val ? '#fff' : '#374151',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s ease',
                        }}>{label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {payType === 'semi-monthly' && (
                  <div style={{ backgroundColor: `${color}0A`, border: `1.5px solid ${color}22`, borderRadius: 12, padding: '12px 16px' }}>
                    <p style={{ fontSize: 13, color: '#4B5563', margin: 0, lineHeight: 1.6 }}>
                      Períodos del <strong>1 al 15</strong> y del <strong>16 al fin de mes</strong>.
                    </p>
                  </div>
                )}

                {bizError && (
                  <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#B91C1C', fontWeight: 500 }}>{bizError}</div>
                )}

                <button
                  className="ob-btn-primary"
                  onClick={handleCreateBusiness}
                  disabled={savingBiz}
                  style={{
                    height: 50, borderRadius: 14, border: 'none', marginTop: 4,
                    backgroundColor: color, color: '#fff',
                    fontSize: 15, fontWeight: 800, cursor: savingBiz ? 'not-allowed' : 'pointer',
                    opacity: savingBiz ? 0.72 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: `0 6px 20px ${color}45`,
                    transition: 'transform 150ms ease, box-shadow 150ms ease, opacity 150ms',
                    ['--btn-shadow-hover' as string]: `0 10px 28px ${color}55`,
                  } as React.CSSProperties}
                >
                  {savingBiz ? <Spinner /> : <><span>Continuar</span><IcoArrowRight /></>}
                </button>
              </div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Paso 2 de 3</p>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: -0.6, lineHeight: 1.2 }}>Agrega tu equipo</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>Puedes saltarte esto y agregar empleados después.</p>
                </div>

                <div style={{ height: 1, backgroundColor: '#F0F2F5' }} />

                {/* Add form */}
                <div style={{ backgroundColor: '#F7F9FB', borderRadius: 14, padding: '16px', border: '1.5px solid #E8ECF0' }}>
                  <div style={{ display: 'flex', gap: 12, marginBottom: empError ? 10 : 12 }}>
                    <div style={{ flex: 1 }}><Field id="empFirst" label="Nombre" placeholder="Juan" value={firstName} onChange={v => { setFirstName(v); setEmpError(''); }} /></div>
                    <div style={{ flex: 1 }}><Field id="empLast" label="Apellido" placeholder="García" value={lastName} onChange={v => { setLastName(v); setEmpError(''); }} /></div>
                  </div>
                  {empError && <p style={{ fontSize: 13, color: '#B91C1C', margin: '0 0 10px', fontWeight: 500 }}>{empError}</p>}
                  <button onClick={handleAddEmployee} disabled={addingEmp} style={{
                    width: '100%', height: 44, borderRadius: 11,
                    border: `2px solid ${color}`,
                    backgroundColor: `${color}0E`, color,
                    fontSize: 14, fontWeight: 700, cursor: addingEmp ? 'not-allowed' : 'pointer',
                    opacity: addingEmp ? 0.7 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all 150ms',
                  }}>
                    {addingEmp ? <Spinner color={color} /> : <><IcoPlus size={14} /><span>Agregar empleado</span></>}
                  </button>
                </div>

                {/* Added employees */}
                {employees.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
                    {employees.map((emp, i) => {
                      const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                      return (
                        <div key={i} style={{ backgroundColor: '#fff', border: '1.5px solid #E8ECF0', borderRadius: 14, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{initials}</div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827', flex: 1 }}>{emp.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', backgroundColor: '#D1FAE5', borderRadius: 20, padding: '3px 9px', letterSpacing: 0.3 }}>Listo</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CopyRow label="Correo" value={emp.email} />
                            <CopyRow label="Contraseña" value={emp.password} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button
                    className="ob-btn-ghost"
                    onClick={() => setStep(3)}
                    style={{
                      height: 50, borderRadius: 14, padding: '0 22px',
                      border: '1.5px solid #E8ECF0', backgroundColor: 'transparent',
                      color: '#6B7280', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 150ms',
                      flex: employees.length === 0 ? 1 : 0,
                    }}>
                    {employees.length === 0 ? 'Saltar por ahora' : 'Agregar después'}
                  </button>
                  {employees.length > 0 && (
                    <button
                      className="ob-btn-primary"
                      onClick={() => setStep(3)}
                      style={{
                        flex: 1, height: 50, borderRadius: 14, border: 'none',
                        backgroundColor: color, color: '#fff',
                        fontSize: 15, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: `0 6px 20px ${color}45`,
                        transition: 'transform 150ms ease, box-shadow 150ms ease',
                        ['--btn-shadow-hover' as string]: `0 10px 28px ${color}55`,
                      } as React.CSSProperties}
                    >
                      Continuar <IcoArrowRight />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 8px' }}>Paso 3 de 3</p>
                  <h2 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', letterSpacing: -0.6, lineHeight: 1.2 }}>¡Todo listo!</h2>
                  <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                    Negocio <strong style={{ color: '#374151' }}>{createdBiz?.name}</strong> creado
                    {employees.length > 0 && <> · <strong style={{ color: '#374151' }}>{employees.length} empleado{employees.length !== 1 ? 's' : ''}</strong> agregado{employees.length !== 1 ? 's' : ''}</>}.
                  </p>
                </div>

                <div style={{ height: 1, backgroundColor: '#F0F2F5' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Negocio configurado', done: true },
                    { label: `${employees.length} empleado${employees.length !== 1 ? 's' : ''} ${employees.length === 0 ? '(puedes agregar después)' : 'agregado' + (employees.length !== 1 ? 's' : '')}`, done: employees.length > 0 },
                    { label: 'Listo para crear turnos', done: true },
                  ].map(({ label, done }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 18px',
                      backgroundColor: done ? `${color}07` : '#F9FAFB',
                      border: `1.5px solid ${done ? color + '22' : '#E8ECF0'}`,
                      borderRadius: 12,
                    }}>
                      <div style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: done ? color : '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <IcoCheck size={12} />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: done ? '#1E293B' : '#9CA3AF' }}>{label}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="ob-btn-primary"
                  onClick={handleFinish}
                  disabled={finishing}
                  style={{
                    height: 52, borderRadius: 14, border: 'none', marginTop: 4,
                    backgroundColor: color, color: '#fff',
                    fontSize: 15, fontWeight: 800, cursor: finishing ? 'not-allowed' : 'pointer',
                    opacity: finishing ? 0.72 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: `0 8px 24px ${color}50`,
                    transition: 'transform 150ms ease, box-shadow 150ms ease, opacity 150ms',
                    ['--btn-shadow-hover' as string]: `0 12px 32px ${color}60`,
                  } as React.CSSProperties}
                >
                  {finishing ? <Spinner /> : <><span>Entrar al dashboard</span><IcoArrowRight /></>}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
