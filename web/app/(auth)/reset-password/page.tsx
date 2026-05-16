'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

const BRAND = '#E11D48';

function EyeIcon()    { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>; }
function EyeOffIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>; }
function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  const reqs = [
    { label: 'Mín. 8 caracteres', met: password.length >= 8 },
    { label: 'Una mayúscula (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Una minúscula (a-z)', met: /[a-z]/.test(password) },
    { label: 'Un número (0-9)', met: /\d/.test(password) },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 8px', marginTop: -4 }}>
      {reqs.map(({ label, met }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, flexShrink: 0, backgroundColor: met ? '#DCFCE7' : '#F3F4F6', border: `1px solid ${met ? '#86EFAC' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 200ms' }}>
            {met
              ? <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={3.5}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>
              : <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#D1D5DB" strokeWidth={3.5}><path strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/></svg>
            }
          </div>
          <span style={{ fontSize: 11, color: met ? '#16A34A' : '#9CA3AF', fontWeight: 500, transition: 'color 200ms' }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ShieldIcon()  { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>; }
function LockIcon()    { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>; }
function KeyIcon()     { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>; }

function Spinner({ white }: { white?: boolean }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${white ? 'rgba(255,255,255,0.3)' : '#E5E7EB'}`, borderTopColor: white ? '#fff' : '#9CA3AF', animation: 'spin .7s linear infinite', margin: '0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const [pwFocused, setPwFocused] = useState(false);
  const [cfFocused, setCfFocused] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setError('Enlace de recuperación inválido o expirado. Solicita uno nuevo.');
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!newPw || !confirmPw) { setError('Por favor llena ambos campos.'); return; }
    const pwOk = newPw.length >= 8 && /[A-Z]/.test(newPw) && /[a-z]/.test(newPw) && /\d/.test(newPw);
    if (!pwOk) { setError('La contraseña no cumple con todos los requisitos.'); return; }
    if (newPw !== confirmPw)  { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: upErr } = await supabase.auth.updateUser({ password: newPw });
      if (upErr) throw upErr;
      await supabase.auth.signOut();
      setSuccess(true);
    } catch (e: any) {
      setError(e.message ?? 'Algo salió mal. Inténtalo de nuevo.');
    } finally { setLoading(false); }
  };

  const inputStyle = (focused: boolean) => ({
    display: 'flex', alignItems: 'center',
    borderRadius: 12,
    border: `1.5px solid ${focused ? BRAND : 'rgba(225,29,72,0.18)'}`,
    backgroundColor: focused ? '#fff' : 'rgba(255,240,243,0.6)',
    height: 44, padding: '0 13px',
    transition: 'border-color 150ms, background-color 150ms',
  });

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes lb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,40px)} }
        @keyframes lb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,-55px)} }
        @keyframes lb3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(35px,-45px)} }
        @keyframes spin { to { transform: rotate(360deg) } }
        .rp-brand { flex: 0 0 52%; position: relative; overflow: hidden; }
        .rp-form  { flex: 1; overflow-y: auto; display: flex; flex-direction: column; justify-content: center; padding: 40px 56px; }
        @media (max-width: 767px) {
          .rp-brand { display: none !important; }
          .rp-form  { padding: 32px 24px !important; }
        }
      `}</style>

      {/* ── Left brand panel ── */}
      <div className="rp-brand" style={{ background: 'linear-gradient(150deg, #ffffff 0%, #fff1f4 45%, #ffd6df 100%)', display: 'flex', flexDirection: 'column', padding: '48px 52px' }}>
        <div style={{ position: 'absolute', left: -80, top: -80, width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND}55 0%, ${BRAND}22 55%, transparent 100%)`, filter: 'blur(8px)', animation: 'lb1 9s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: -60, bottom: '20%', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, #ff688877 0%, #ff688822 55%, transparent 100%)`, filter: 'blur(10px)', animation: 'lb2 11s ease-in-out infinite 2s', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '35%', bottom: -60, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, #fb7185aa 0%, #fb718533 55%, transparent 100%)`, filter: 'blur(12px)', animation: 'lb3 13s ease-in-out infinite 4s', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Image src="/logo.png" alt="Ko-nnecta'" width={200} height={80} style={{ objectFit: 'contain', objectPosition: 'left' }} priority />

          <div style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: 36 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#111827', lineHeight: 1.15, letterSpacing: -1, margin: '0 0 10px' }}>
              Tu cuenta,<br /><span style={{ color: BRAND }}>protegida.</span>
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 36px', lineHeight: 1.6, maxWidth: 340 }}>
              Crea una contraseña segura para mantener tu negocio y tu equipo a salvo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: <ShieldIcon />, text: 'Enlace de recuperación de un solo uso' },
                { icon: <LockIcon />,  text: 'Tu contraseña está cifrada y segura' },
                { icon: <KeyIcon />,   text: 'Acceso restaurado en menos de un minuto' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, backgroundColor: `${BRAND}15`, border: `1px solid ${BRAND}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 44 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 50, padding: '7px 14px' }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Proceso seguro · Cifrado de extremo a extremo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="rp-form" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 56px', position: 'relative', background: 'linear-gradient(160deg, #fff5f7 0%, #fff8f9 30%, #ffffff 70%)' }}>

        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto' }}>

          {success ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={2.5}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: -0.5 }}>¡Contraseña actualizada!</h2>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                Ya puedes iniciar sesión con tu nueva contraseña.
              </p>
              <Link href="/login" style={{ display: 'block', width: '100%', height: 44, borderRadius: 12, backgroundColor: BRAND, color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none', lineHeight: '44px', textAlign: 'center', marginTop: 8, boxShadow: `0 4px 16px ${BRAND}55` }}>
                Ir a Iniciar Sesión
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: `${BRAND}12`, border: `1px solid ${BRAND}25`, borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: BRAND, letterSpacing: 0.3 }}>NUEVA CONTRASEÑA</span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 5px', letterSpacing: -0.5 }}>
                  Crea una nueva contraseña
                </h2>
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
                  Ingresa y confirma tu nueva contraseña.
                </p>
              </div>

              {!sessionReady && !error ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
                  <Spinner />
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Verificando enlace...</p>
                </div>
              ) : !sessionReady && error ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#FEF2F2', border: '1.5px solid #FECACA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#B91C1C" strokeWidth={2}><path strokeLinecap="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  </div>
                  <p style={{ fontSize: 14, color: '#B91C1C', margin: 0, fontWeight: 500 }}>{error}</p>
                  <Link href="/login" style={{ fontSize: 13, color: BRAND, fontWeight: 700, textDecoration: 'none' }}>Solicitar nuevo enlace</Link>
                </div>
              ) : (
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Nueva contraseña</label>
                    <div style={inputStyle(pwFocused)}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={newPw}
                        onChange={e => { setNewPw(e.target.value); setError(''); }}
                        onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                        placeholder="Mín. 8 caracteres"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#111827', fontFamily: 'inherit' }}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: '0 0 0 8px' }}>
                        {showPw ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <PasswordRequirements password={newPw} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Confirmar contraseña</label>
                    <div style={inputStyle(cfFocused)}>
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={confirmPw}
                        onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                        onFocus={() => setCfFocused(true)} onBlur={() => setCfFocused(false)}
                        placeholder="Repite la contraseña"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#111827', fontFamily: 'inherit' }}
                      />
                    </div>
                  </div>

                  {error && (
                    <div style={{ padding: '10px 13px', borderRadius: 10, fontSize: 13, fontWeight: 500, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} style={{ height: 44, marginTop: 4, borderRadius: 12, border: 'none', backgroundColor: BRAND, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${BRAND}55` }}>
                    {loading ? <Spinner white /> : 'Actualizar contraseña'}
                  </button>
                </form>
              )}

              <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                <Link href="/login" style={{ color: BRAND, fontWeight: 700, textDecoration: 'none' }}>Volver a iniciar sesión</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
