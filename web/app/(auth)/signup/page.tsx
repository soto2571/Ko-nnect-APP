'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import * as api from '@/services/api';

const BRAND = '#E11D48';

// ── Icons ─────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
      <path d="M47.532 24.552c0-1.636-.132-3.233-.388-4.787H24.48v9.057h12.985c-.56 3.014-2.254 5.567-4.8 7.28v6.052h7.768c4.546-4.188 7.1-10.35 7.1-17.602z" fill="#4285F4"/>
      <path d="M24.48 48c6.516 0 11.98-2.16 15.973-5.846l-7.768-6.052c-2.16 1.448-4.922 2.304-8.205 2.304-6.31 0-11.654-4.26-13.565-9.986H2.9v6.245C6.877 42.79 15.097 48 24.48 48z" fill="#34A853"/>
      <path d="M10.915 28.42A14.46 14.46 0 0 1 10.17 24c0-1.536.263-3.03.745-4.42v-6.245H2.9A23.94 23.94 0 0 0 .48 24c0 3.87.925 7.53 2.42 10.665l8.015-6.245z" fill="#FBBC05"/>
      <path d="M24.48 9.594c3.556 0 6.746 1.222 9.256 3.624l6.942-6.942C36.455 2.39 30.993 0 24.48 0 15.097 0 6.877 5.21 2.9 13.335l8.015 6.245c1.91-5.726 7.255-9.986 13.565-9.986z" fill="#EA4335"/>
    </svg>
  );
}
function ArrowLeftIcon() { return <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>; }
function CheckIcon()  { return <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" d="M5 13l4 4L19 7"/></svg>; }
function ZapIcon()    { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>; }
function StarIcon()   { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>; }
function LockIcon()   { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>; }
function EyeIcon()    { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>; }
function EyeOffIcon() { return <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>; }

// ── Input ─────────────────────────────────────────────────────────────────────
function InputField({ id, label, type = 'text', placeholder, value, onChange, right }: {
  id: string; label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; right?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center',
        borderRadius: 12,
        border: `1.5px solid ${focused ? BRAND : 'rgba(225,29,72,0.18)'}`,
        backgroundColor: focused ? '#fff' : 'rgba(255,240,243,0.6)',
        height: 44, padding: '0 13px',
        transition: 'border-color 150ms, background-color 150ms',
        backdropFilter: 'blur(4px)',
      }}>
        <input
          id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={placeholder}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#111827', fontFamily: 'inherit' }}
        />
        {right}
      </div>
    </div>
  );
}

function Spinner({ white }: { white?: boolean }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: 9, border: `2px solid ${white ? 'rgba(255,255,255,0.3)' : '#E5E7EB'}`, borderTopColor: white ? '#fff' : '#9CA3AF', animation: 'spin .7s linear infinite', margin: '0 auto' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.'); return;
    }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }
    setLoading(true);
    try {
      await api.signup({ email: email.trim().toLowerCase(), password, firstName: firstName.trim(), lastName: lastName.trim(), role: 'owner' });
      await createClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      router.push('/dashboard');
    } catch (e: any) { setError(e.message ?? 'Algo salió mal. Inténtalo de nuevo.'); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(''); setGoogleLoading(true);
    try {
      const { data, error: err } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
      if (err) throw err;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) { setError(e.message ?? 'Error al conectar con Google.'); setGoogleLoading(false); }
  };

  return (
    <div className="auth-root" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <style>{`
        @keyframes lb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(50px,40px)} }
        @keyframes lb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-40px,-55px)} }
        @keyframes lb3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(35px,-45px)} }
        @keyframes rb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,30px)} }
        @keyframes rb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(25px,-40px)} }
        .auth-brand { flex: 0 0 52%; position: relative; overflow: hidden; }
        .auth-form  { flex: 1; overflow-y: auto; display: flex; flex-direction: column; justify-content: center; padding: 40px 56px; }
        @media (max-width: 767px) {
          .auth-brand { flex: none; width: 100%; padding: 24px 20px 20px !important; }
          .auth-brand-hero, .auth-brand-badge { display: none !important; }
          .auth-form { padding: 24px 20px 40px !important; justify-content: flex-start; }
          .auth-root { flex-direction: column; height: auto; min-height: 100svh; overflow: visible; }
          .auth-name-row { flex-direction: column !important; }
        }
      `}</style>

      {/* ── Left brand panel ── */}
      <div className="auth-brand" style={{ background: 'linear-gradient(150deg, #ffffff 0%, #fff1f4 45%, #ffd6df 100%)', display: 'flex', flexDirection: 'column', padding: '48px 52px' }}>
        <div style={{ position: 'absolute', left: -80, top: -80, width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND}55 0%, ${BRAND}22 55%, transparent 100%)`, filter: 'blur(8px)', animation: 'lb1 9s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: -60, bottom: '20%', width: 360, height: 360, borderRadius: '50%', background: `radial-gradient(circle, #ff688877 0%, #ff688822 55%, transparent 100%)`, filter: 'blur(10px)', animation: 'lb2 11s ease-in-out infinite 2s', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: '35%', bottom: -60, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, #fb7185aa 0%, #fb718533 55%, transparent 100%)`, filter: 'blur(12px)', animation: 'lb3 13s ease-in-out infinite 4s', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Image src="/logo.png" alt="Ko-nnecta'" width={200} height={80} style={{ objectFit: 'contain', objectPosition: 'left' }} priority />

          <div className="auth-brand-hero" style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: 36 }}>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: '#111827', lineHeight: 1.15, letterSpacing: -1, margin: '0 0 10px' }}>
              Tu negocio,<br /><span style={{ color: BRAND }}>organizado.</span>
            </h1>
            <p style={{ fontSize: 15, color: '#6B7280', margin: '0 0 36px', lineHeight: 1.6, maxWidth: 340 }}>
              Únete a los dueños que simplificaron sus horarios. Configura tu negocio en minutos, sin complicaciones.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: <ZapIcon />,  text: 'Configuración en menos de 5 minutos' },
                { icon: <LockIcon />, text: 'Sin tarjeta de crédito para comenzar' },
                { icon: <StarIcon />, text: 'Diseñado para negocios en Puerto Rico' },
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

          <div className="auth-brand-badge" style={{ marginTop: 44 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: 50, padding: '7px 14px' }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: BRAND, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Solo para dueños · Los empleados usan el app móvil</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel — frosted warm ── */}
      <div className="auth-form" style={{ position: 'relative', background: 'linear-gradient(160deg, #fff5f7 0%, #fff8f9 30%, #ffffff 70%)' }}>
        {/* Subtle blobs */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND}18 0%, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none', animation: 'rb1 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: -20, bottom: 60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND}10 0%, transparent 70%)`, filter: 'blur(16px)', pointerEvents: 'none', animation: 'rb2 14s ease-in-out infinite 3s' }} />

        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Back to login */}
            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: BRAND, textDecoration: 'none' }}>
              <ArrowLeftIcon /> Volver a iniciar sesión
            </Link>

            {/* Header */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: `${BRAND}12`, border: `1px solid ${BRAND}25`, borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: BRAND, letterSpacing: 0.3 }}>CREAR CUENTA</span>
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 5px', letterSpacing: -0.5 }}>
                Empieza hoy, gratis
              </h2>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Sin tarjeta de crédito, sin compromisos.</p>
            </div>

            {/* Google */}
            <button onClick={handleGoogle} disabled={googleLoading || loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(225,29,72,0.2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', opacity: (googleLoading || loading) ? 0.6 : 1 }}>
              {googleLoading ? <Spinner /> : <><GoogleIcon /><span>Registrarse con Google</span></>}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(225,29,72,0.15))' }} />
              <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>o con correo</span>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(225,29,72,0.15))' }} />
            </div>

            {/* Form */}
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="auth-name-row" style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <InputField id="firstName" label="Nombre" placeholder="Juan" value={firstName} onChange={v => { setFirstName(v); setError(''); }} />
                </div>
                <div style={{ flex: 1 }}>
                  <InputField id="lastName" label="Apellido" placeholder="García" value={lastName} onChange={v => { setLastName(v); setError(''); }} />
                </div>
              </div>
              <InputField id="email" label="Correo electrónico" type="email" placeholder="tu@correo.com" value={email} onChange={v => { setEmail(v); setError(''); }} />
              <InputField id="password" label="Contraseña" type={showPw ? 'text' : 'password'} placeholder="Mín. 6 caracteres" value={password} onChange={v => { setPassword(v); setError(''); }}
                right={
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: '0 0 0 8px' }}>
                    {showPw ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
              />
              {error && (
                <div style={{ padding: '10px 13px', borderRadius: 10, fontSize: 13, fontWeight: 500, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} style={{ height: 44, marginTop: 4, borderRadius: 12, border: 'none', backgroundColor: BRAND, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${BRAND}55` }}>
                {loading ? <Spinner white /> : 'Crear Cuenta'}
              </button>
            </form>

            {/* Trust signals */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {['Prueba gratis', 'Cancela cuando quieras'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6B7280' }}>
                  <span style={{ color: BRAND }}><CheckIcon /></span>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" style={{ color: BRAND, fontWeight: 700, textDecoration: 'none' }}>Iniciar sesión</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
