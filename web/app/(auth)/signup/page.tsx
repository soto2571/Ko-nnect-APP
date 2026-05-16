'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { setToken } from '@/lib/token-store';
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
function MailIcon()   { return <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>; }

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

export function pwValid(pw: string) {
  return pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw);
}

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

// ── OTP digit inputs ──────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handleChange = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1);
    const next = digits.slice();
    next[i] = d;
    const joined = next.join('');
    onChange(joined);
    if (d && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) { onChange(pasted); refs.current[Math.min(pasted.length, 5)]?.focus(); }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {[0,1,2,3,4,5].map(i => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: 46, height: 56, textAlign: 'center', fontSize: 22, fontWeight: 700,
            borderRadius: 12, border: `1.5px solid ${digits[i] ? BRAND : 'rgba(225,29,72,0.2)'}`,
            backgroundColor: digits[i] ? `${BRAND}08` : 'rgba(255,240,243,0.6)',
            color: '#111827', outline: 'none', fontFamily: 'inherit',
            transition: 'border-color 150ms, background-color 150ms',
          }}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]         = useState<'form' | 'verify'>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [otp,       setOtp]       = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Step 1 — Register and send OTP
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.'); return;
    }
    if (!pwValid(password)) { setError('La contraseña no cumple con todos los requisitos.'); return; }
    setLoading(true);
    try {
      const provider = await api.checkEmailProvider(email.trim().toLowerCase());
      if (provider === 'google') {
        setError('Este correo ya tiene una cuenta con Google. Usa el botón de Google para entrar.');
        return;
      }
      if (provider === 'email') {
        setError('Ya existe una cuenta con este correo. Ve a iniciar sesión.');
        return;
      }

      const supabase = createClient();
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { shouldCreateUser: true },
      });
      if (otpErr) { setError(otpErr.message); return; }
      setStep('verify');
      startResendCooldown();
    } catch { setError('Algo salió mal. Inténtalo de nuevo.'); }
    finally { setLoading(false); }
  };

  // Step 2 — Verify OTP and create profile
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length < 6) { setError('Ingresa el código completo de 6 dígitos.'); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otp,
        type: 'email',
      });
      if (verifyErr || !data.session) {
        setError('Código incorrecto o expirado. Revisa tu correo e inténtalo de nuevo.');
        return;
      }

      const { access_token } = data.session;
      setToken(access_token);

      // Set password on the newly verified account
      await supabase.auth.updateUser({ password });

      await api.createProfile(
        { firstName: firstName.trim(), lastName: lastName.trim(), role: 'owner' },
        access_token,
      );

      router.push('/dashboard');
    } catch (e: any) { setError(e.message ?? 'Algo salió mal. Inténtalo de nuevo.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      const supabase = createClient();
      await createClient().auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false } });
      startResendCooldown();
    } catch { setError('No se pudo reenviar el código. Inténtalo de nuevo.'); }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(v => { if (v <= 1) { clearInterval(interval); return 0; } return v - 1; });
    }, 1000);
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

      {/* ── Right form panel ── */}
      <div className="auth-form" style={{ position: 'relative', background: 'linear-gradient(160deg, #fff5f7 0%, #fff8f9 30%, #ffffff 70%)' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND}18 0%, transparent 70%)`, filter: 'blur(20px)', pointerEvents: 'none', animation: 'rb1 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', left: -20, bottom: 60, width: 200, height: 200, borderRadius: '50%', background: `radial-gradient(circle, ${BRAND}10 0%, transparent 70%)`, filter: 'blur(16px)', pointerEvents: 'none', animation: 'rb2 14s ease-in-out infinite 3s' }} />

        <div style={{ maxWidth: 380, width: '100%', margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {step === 'form' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: BRAND, textDecoration: 'none' }}>
                <ArrowLeftIcon /> Volver a iniciar sesión
              </Link>

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

              <button onClick={handleGoogle} disabled={googleLoading || loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.85)', border: '1.5px solid rgba(225,29,72,0.2)', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#374151', backdropFilter: 'blur(8px)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', opacity: (googleLoading || loading) ? 0.6 : 1 }}>
                {googleLoading ? <Spinner /> : <><GoogleIcon /><span>Registrarse con Google</span></>}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, rgba(225,29,72,0.15))' }} />
                <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>o con correo</span>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, rgba(225,29,72,0.15))' }} />
              </div>

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
                <InputField id="password" label="Contraseña" type={showPw ? 'text' : 'password'} placeholder="Mín. 8 caracteres" value={password} onChange={v => { setPassword(v); setError(''); }}
                  right={
                    <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: '0 0 0 8px' }}>
                      {showPw ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  }
                />
                <PasswordRequirements password={password} />
                {error && (
                  <div style={{ padding: '10px 13px', borderRadius: 10, fontSize: 13, fontWeight: 500, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{ height: 44, marginTop: 4, borderRadius: 12, border: 'none', backgroundColor: BRAND, color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: `0 4px 16px ${BRAND}55` }}>
                  {loading ? <Spinner white /> : 'Crear Cuenta'}
                </button>
              </form>

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
          ) : (
            /* ── Step 2: OTP verification ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <button onClick={() => { setStep('form'); setOtp(''); setError(''); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: BRAND, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <ArrowLeftIcon /> Volver
              </button>

              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: `${BRAND}12`, border: `1px solid ${BRAND}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: BRAND }}>
                  <MailIcon />
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: `${BRAND}12`, border: `1px solid ${BRAND}25`, borderRadius: 20, padding: '4px 12px', marginBottom: 12 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BRAND }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: BRAND, letterSpacing: 0.3 }}>VERIFICAR CORREO</span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '0 0 8px', letterSpacing: -0.5 }}>
                  Revisa tu correo
                </h2>
                <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
                  Enviamos un código de 6 dígitos a<br />
                  <span style={{ fontWeight: 700, color: '#374151' }}>{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} />

                {error && (
                  <div style={{ padding: '10px 13px', borderRadius: 10, fontSize: 13, fontWeight: 500, backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', textAlign: 'center' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || otp.length < 6} style={{ height: 44, borderRadius: 12, border: 'none', backgroundColor: BRAND, color: '#fff', fontSize: 15, fontWeight: 700, cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer', opacity: (loading || otp.length < 6) ? 0.7 : 1, boxShadow: `0 4px 16px ${BRAND}55` }}>
                  {loading ? <Spinner white /> : 'Verificar y continuar'}
                </button>
              </form>

              <p style={{ textAlign: 'center', fontSize: 13, color: '#9CA3AF', margin: 0 }}>
                ¿No recibiste el código?{' '}
                <button onClick={handleResend} disabled={resendCooldown > 0} style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', color: resendCooldown > 0 ? '#9CA3AF' : BRAND, fontWeight: 700, fontSize: 13, padding: 0 }}>
                  {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : 'Reenviar código'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
