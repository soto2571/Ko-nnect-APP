import Link from 'next/link';
import Image from 'next/image';
import { StickyPhones } from '@/components/StickyPhones';

const BRAND = '#E11D48';

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function DollarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
function ClockAlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}
function DevicesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  );
}
function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4 shrink-0">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: <DollarIcon />,
    title: 'Nómina exacta al instante',
    description: 'Ve exactamente cuántas horas trabajó cada empleado en el período. Sin calculadoras, sin errores. Imprime el reporte y sabe cuánto vas a pagar antes de abrir la billetera.',
    tag: 'Finanzas',
  },
  {
    icon: <UsersIcon />,
    title: '¿Quién está en turno ahora mismo?',
    description: 'De un vistazo sabes quién llegó, quién está en break y quién falta. Sin llamar, sin WhatsApp, sin adivinanzas.',
    tag: 'Tiempo Real',
  },
  {
    icon: <ClockAlertIcon />,
    title: 'Llegaron tarde — tú ya lo sabes',
    description: 'Cuando un empleado marca entrada con más de 5 minutos de retraso, te llega una notificación al momento. Te enteras aunque estés ocupado.',
    tag: 'Alertas',
  },
  {
    icon: <CalendarIcon />,
    title: 'Turnos en segundos, no en horas',
    description: 'Crea un turno, asígnalo, repítelo varios días con un toque. Detecta conflictos antes de publicar el horario. Edita y elimina cuando cambien los planes.',
    tag: 'Turnos',
  },
  {
    icon: <BuildingIcon />,
    title: 'Tu negocio, a tu imagen',
    description: 'Pon el nombre de tu negocio, elige tu color de marca y el app se adapta. Todos tus empleados lo ven con tu identidad.',
    tag: 'Personalización',
  },
  {
    icon: <DevicesIcon />,
    title: 'App móvil y dashboard web',
    description: 'Administra desde el celular con la app o desde la computadora con el dashboard web. Tus empleados usan la app móvil. Todo sincronizado.',
    tag: 'Multi-plataforma',
  },
  {
    icon: <PrintIcon />,
    title: 'Imprime la nómina lista para pagar',
    description: 'Exporta el reporte de horas del período con los totales por empleado. Listo para imprimir, firmar y pagar. Sin hojas de cálculo.',
    tag: 'Reportes',
  },
];


const pricingFeatures = [
  'Hasta 15 empleados',
  'Turnos ilimitados',
  'Timeclock con geofence',
  'Notificaciones push',
  'Reportes de nómina',
  'Dashboard web incluido',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: 'var(--font-geist)', overflowX: 'hidden' }}>

      {/* ── Floating Glassmorphism Navbar ── */}
      <nav className="fixed z-50" style={{
        top: 16, left: 20, right: 20,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: 20,
        boxShadow: '0 4px 32px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.9) inset',
      }}>
        <div className="px-5 h-14 flex items-center justify-between gap-4">
          {/* Section links */}
          <div className="flex items-center gap-0.5">
            <a href="#funciones" className="text-sm font-semibold transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-red-50" style={{ color: BRAND }}>Funciones</a>
            <a href="#geofence" className="text-sm font-semibold transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-red-50" style={{ color: BRAND }}>Geofence</a>
            <a href="#comenzar" className="hidden sm:block text-sm font-semibold transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-red-50" style={{ color: BRAND }}>Cómo empezar</a>
            <a href="#precios" className="text-sm font-semibold transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-red-50" style={{ color: BRAND }}>Precios</a>
          </div>
          {/* Auth CTAs */}
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-black/5">
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-white px-4 py-1.5 rounded-xl cursor-pointer transition-all duration-150 hover:opacity-90"
              style={{ backgroundColor: BRAND, boxShadow: `0 3px 12px ${BRAND}45` }}
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      {/* overflow: visible so phones bleed into the next section */}
      <section id="hero" className="relative" style={{ minHeight: '100vh', overflow: 'visible' }}>

        {/* Background + blobs — clipped to hero only via inner overflow:hidden */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(160deg, #ffffff 0%, #fff5f7 55%, #ffe4eb 100%)',
          }} />
          <div className="absolute" style={{
            left: -60, top: -60, width: 500, height: 500, borderRadius: '50%',
            background: `radial-gradient(circle, ${BRAND}88 0%, ${BRAND}33 55%, transparent 100%)`,
            filter: 'blur(8px)', animation: 'blob1 8s ease-in-out infinite',
          }} />
          <div className="absolute" style={{
            right: -40, top: '40%', width: 400, height: 400, borderRadius: '50%',
            background: `radial-gradient(circle, #c4174455 0%, #c4174415 55%, transparent 100%)`,
            filter: 'blur(14px)', animation: 'blob2 9.5s ease-in-out infinite 2s',
          }} />
          <div className="absolute" style={{
            left: '30%', bottom: -60, width: 420, height: 420, borderRadius: '50%',
            background: `radial-gradient(circle, #e43d6544 0%, #e43d6512 55%, transparent 100%)`,
            filter: 'blur(12px)', animation: 'blob3 11s ease-in-out infinite 4s',
          }} />
        </div>

        <style>{`
          @keyframes blob1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,30px)} }
          @keyframes blob2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,40px)} }
          @keyframes blob3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-50px)} }
        `}</style>

        {/* ── Center text — sits in the hero, above phones z-wise ── */}
        <div
          className="relative flex flex-col items-center justify-center text-center px-6"
          style={{ minHeight: '100vh', paddingTop: 96, paddingBottom: 80, zIndex: 10 }}
        >
          <div className="mb-6">
            <Image src="/logo.png" alt="Ko-nnecta'" width={180} height={56} className="object-contain" />
          </div>
          <div
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider"
            style={{ backgroundColor: `${BRAND}15`, color: BRAND }}
          >
            Beta gratuita — Puerto Rico
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-[1.15] mb-5 max-w-xl">
            Deja los horarios<br />en papel y WhatsApp.
            <br />
            <span style={{ color: BRAND }}>Ko-nnecta&apos; a tu equipo.</span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-md">
            Crea turnos, controla entradas y salidas, y mantén a tu equipo al día
            — todo desde el celular o tu computadora.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center text-white font-semibold text-base px-8 py-3.5 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: BRAND, boxShadow: `0 4px 18px ${BRAND}45` }}
            >
              Empezar gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center font-semibold text-base px-8 py-3.5 rounded-xl cursor-pointer transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                color: '#374151',
              }}
            >
              Iniciar sesión
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">Sin tarjeta de crédito. Sin contratos.</p>
        </div>

        {/* ── Phones — scroll-driven, client component ── */}
        <StickyPhones />

        {/* Mobile: phones side by side below text */}
        <div className="lg:hidden flex justify-center gap-4 px-4 pb-14">
          <Image src="/hero-phone2.png" alt="Ko-nnecta' inicio" width={160} height={320} className="object-contain" />
          <Image src="/hero-phone.png" alt="Ko-nnecta' turnos" width={160} height={320} className="object-contain" />
        </div>

      </section>

      {/* ── Features Bento Grid ── */}
      {/* Background matches the web app's AnimatedBackground gradient */}
      <section id="funciones" className="relative bg-white" style={{ paddingTop: 320, paddingBottom: 96, zIndex: 0 }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ color: '#111827', letterSpacing: '-0.5px' }}>
              Todo lo que necesitas para manejar tu equipo
            </h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: '#6B7280' }}>
              De la nómina al horario, sin hojas de cálculo ni grupos de WhatsApp.
            </p>
          </div>

          {/* Bento Grid — 4 cols desktop, 2 tablet, 1 mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Card 1 — Nómina (featured, 2×2) — brand color, matches web app FAB/primary button */}
            <div
              className="sm:col-span-2 lg:col-span-2 lg:row-span-2 p-7 flex flex-col justify-between cursor-default"
              style={{
                backgroundColor: BRAND,
                borderRadius: 20,
                boxShadow: `0 8px 28px ${BRAND}55`,
                minHeight: 260,
                transition: 'all 0.15s',
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Finanzas</span>
                <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <DollarIcon />
                </div>
              </div>
              {/* Mini payroll rows — exact style of web app's employee rows */}
              <div className="my-4 space-y-2">
                {[['Ana García', '42h', '$672'], ['Luis Pérez', '38h', '$608'], ['María Rosa', '40h', '$640']].map(([name, hrs, pay]) => (
                  <div key={name} className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12 }}>
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 500 }}>{hrs}</span>
                    <span style={{ color: 'white', fontSize: 13, fontWeight: 800 }}>{pay}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ color: 'white', fontSize: 20, fontWeight: 800, letterSpacing: '-0.3px', marginBottom: 4 }}>Nómina exacta al instante</h3>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.6 }}>Horas por empleado, sin calculadoras. Listo para imprimir y pagar.</p>
              </div>
            </div>

            {/* Card 2 — Tiempo Real — glassmorphism white, exact web app card style */}
            <div
              className="p-5 flex flex-col justify-between cursor-default hover:-translate-y-0.5"
              style={{
                backgroundColor: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                minHeight: 200,
                transition: 'all 0.15s',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: 10, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiempo Real</span>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 6px #10B98180' }} />
              </div>
              <div className="space-y-2 flex-1">
                {[['DO', 'En turno', true], ['AG', 'En break', false]].map(([init, status, active]) => (
                  <div key={String(init)} className="flex items-center gap-2 px-2 py-1.5" style={{ backgroundColor: '#F9FAFB', borderRadius: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: active ? BRAND : '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{init}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{status}</span>
                    <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', backgroundColor: active ? '#10B981' : '#F59E0B' }} />
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>¿Quién está en turno?</h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>De un vistazo, sin llamar.</p>
              </div>
            </div>

            {/* Card 3 — Alertas — brand tint, matches web app warning/alert style */}
            <div
              className="p-5 flex flex-col justify-between cursor-default hover:-translate-y-0.5"
              style={{
                backgroundColor: `${BRAND}08`,
                borderRadius: 20,
                border: `1px solid ${BRAND}25`,
                boxShadow: `0 4px 24px ${BRAND}10`,
                minHeight: 200,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${BRAND}14`, color: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClockAlertIcon />
              </div>
              <div>
                {/* Alert badge — exact web app notification style */}
                <div className="px-3 py-2 mb-3" style={{ backgroundColor: `${BRAND}12`, borderRadius: 10, border: `1px solid ${BRAND}20` }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: BRAND }}>Luis llegó 12 min tarde</p>
                  <p style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>Hoy, 9:12 AM</p>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Alertas de tardanza</h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Te notificamos al instante.</p>
              </div>
            </div>

            {/* Card 4 — Turnos (2×1 wide) — glassmorphism */}
            <div
              className="sm:col-span-2 lg:col-span-2 p-5 flex flex-col justify-between cursor-default hover:-translate-y-0.5"
              style={{
                backgroundColor: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                minHeight: 180,
                transition: 'all 0.15s',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${BRAND}14`, color: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarIcon />
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Turnos</span>
              </div>
              {/* Mini week strip — exact web app day header style */}
              <div className="flex gap-2 mb-3">
                {[['Lu', true], ['Ma', true], ['Mi', true], ['Ju', false], ['Vi', false]].map(([d, active]) => (
                  <div key={String(d)} className="flex-1 py-2 text-center" style={{
                    borderRadius: 14,
                    backgroundColor: active ? `${BRAND}12` : 'rgba(0,0,0,0.04)',
                    border: active ? `1px solid ${BRAND}30` : '1px solid rgba(0,0,0,0.06)',
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: active ? BRAND : '#9CA3AF' }}>{d}</p>
                    <p style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{active ? '6P' : '—'}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Turnos en segundos</h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Crea, asigna y repite. Detecta conflictos antes de publicar.</p>
              </div>
            </div>

            {/* Card 5 — Personalización — glassmorphism */}
            <div
              className="p-5 flex flex-col justify-between cursor-default hover:-translate-y-0.5"
              style={{
                backgroundColor: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.7)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                minHeight: 180,
                transition: 'all 0.15s',
              }}
            >
              <div className="flex gap-1.5 mb-3">
                {[BRAND, '#6366f1', '#0ea5e9', '#22c55e', '#f59e0b'].map(c => (
                  <div key={c} style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: c, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                ))}
              </div>
              <div>
                <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${BRAND}14`, color: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <BuildingIcon />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Tu color de marca</h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>El app se adapta a tu negocio.</p>
              </div>
            </div>

            {/* Card 6 — Multi-platform — dark card matches web app modal/overlay style */}
            <div
              className="p-5 flex flex-col justify-between cursor-default hover:-translate-y-0.5"
              style={{
                backgroundColor: '#111827',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                minHeight: 180,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <DevicesIcon />
              </div>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'white' }}>App + Web</h3>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Celular y computadora, todo sincronizado.</p>
              </div>
            </div>

            {/* Card 7 — Reportes (2×1 wide) — dark */}
            <div
              className="sm:col-span-2 lg:col-span-2 p-5 flex items-center gap-5 cursor-default hover:-translate-y-0.5"
              style={{
                backgroundColor: '#111827',
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                minHeight: 100,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: `${BRAND}25`, color: BRAND, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PrintIcon />
              </div>
              <div className="flex-1">
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 4 }}>Imprime la nómina lista para pagar</h3>
                <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>Totales por empleado, por período. Sin hojas de cálculo.</p>
              </div>
              {/* Mini bar chart — exact web app stat style */}
              <div className="hidden sm:flex items-end gap-1 shrink-0">
                {[50, 70, 38, 90, 60, 45, 75].map((h, i) => (
                  <div key={i} style={{ width: 10, height: h * 0.55, borderRadius: '3px 3px 0 0', backgroundColor: i === 3 ? BRAND : 'rgba(255,255,255,0.12)' }} />
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Geofence Section ── */}
      <section id="geofence" className="relative overflow-hidden" style={{ minHeight: 560 }}>

        {/* Full-bleed map background */}
        <div className="absolute inset-0" style={{ background: '#0f172a' }}>
          <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMid slice">
            {/* Street grid */}
            <line x1="0" y1="100" x2="1200" y2="100" stroke="#334155" strokeWidth="18" />
            <line x1="0" y1="220" x2="1200" y2="220" stroke="#334155" strokeWidth="10" />
            <line x1="0" y1="340" x2="1200" y2="340" stroke="#334155" strokeWidth="18" />
            <line x1="0" y1="460" x2="1200" y2="460" stroke="#334155" strokeWidth="10" />
            <line x1="150" y1="0" x2="150" y2="560" stroke="#334155" strokeWidth="10" />
            <line x1="350" y1="0" x2="350" y2="560" stroke="#334155" strokeWidth="18" />
            <line x1="580" y1="0" x2="580" y2="560" stroke="#334155" strokeWidth="10" />
            <line x1="780" y1="0" x2="780" y2="560" stroke="#334155" strokeWidth="18" />
            <line x1="980" y1="0" x2="980" y2="560" stroke="#334155" strokeWidth="10" />
            <line x1="1100" y1="0" x2="1100" y2="560" stroke="#334155" strokeWidth="10" />
            {/* Blocks */}
            <rect x="160" y="110" width="180" height="100" rx="6" fill="#1e293b" />
            <rect x="160" y="230" width="80" height="100" rx="6" fill="#1e293b" />
            <rect x="260" y="230" width="80" height="100" rx="6" fill="#1e293b" />
            <rect x="360" y="110" width="200" height="100" rx="6" fill="#1e293b" />
            <rect x="360" y="230" width="90" height="100" rx="6" fill="#1e293b" />
            <rect x="590" y="110" width="80" height="100" rx="6" fill="#1e293b" />
            <rect x="590" y="230" width="180" height="100" rx="6" fill="#1e293b" />
            <rect x="790" y="110" width="80" height="100" rx="6" fill="#1e293b" />
            <rect x="790" y="230" width="180" height="100" rx="6" fill="#1e293b" />
            <rect x="990" y="110" width="100" height="220" rx="6" fill="#1e293b" />
            <rect x="160" y="350" width="180" height="100" rx="6" fill="#1e293b" />
            <rect x="360" y="350" width="200" height="100" rx="6" fill="#1e293b" />
            <rect x="590" y="350" width="80" height="100" rx="6" fill="#1e293b" />
            <rect x="790" y="350" width="180" height="100" rx="6" fill="#1e293b" />
          </svg>

          {/* Geofence glow — centered left of text */}
          <div className="absolute" style={{
            top: '50%', left: '28%',
            transform: 'translate(-50%, -50%)',
            width: 260, height: 260,
            borderRadius: '50%',
            border: `2px solid ${BRAND}`,
            background: `radial-gradient(circle, ${BRAND}22 0%, transparent 70%)`,
            boxShadow: `0 0 0 20px ${BRAND}08, 0 0 80px ${BRAND}30`,
          }} />

          {/* Business pin */}
          <div className="absolute flex flex-col items-center" style={{ top: 'calc(50% - 24px)', left: 'calc(28% - 8px)', transform: 'translate(-50%, -100%)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xl" style={{ background: BRAND, boxShadow: `0 0 20px ${BRAND}80` }}>
              <MapPinIcon />
            </div>
            <div className="w-2 h-2 rounded-full mt-0.5" style={{ background: BRAND }} />
          </div>

          {/* Employee dots */}
          <div className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style={{ background: '#22c55e', top: '42%', left: '24%', boxShadow: '0 0 10px #22c55e88' }} />
          <div className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg" style={{ background: '#22c55e', top: '56%', left: '31%', boxShadow: '0 0 10px #22c55e88' }} />
          <div className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg" style={{ background: '#22c55e', top: '48%', left: '26%', boxShadow: '0 0 10px #22c55e88' }} />
          <div className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg" style={{ background: '#f59e0b', top: '30%', left: '48%', boxShadow: '0 0 10px #f59e0b88' }} />

          {/* Dark overlay on right half for text readability */}
          <div className="absolute inset-y-0 right-0 w-full lg:w-1/2" style={{ background: 'linear-gradient(to right, transparent, #0f172a 40%)' }} />
        </div>

        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-6 py-24 flex justify-end">
          <div className="w-full lg:w-1/2 lg:pl-12">
            <div
              className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-5 uppercase tracking-wider"
              style={{ backgroundColor: `${BRAND}25`, color: BRAND, border: `1px solid ${BRAND}40` }}
            >
              <MapPinIcon />
              Geofence
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Solo pueden marcar entrada desde tu negocio
            </h2>
            <p className="text-slate-400 leading-relaxed mb-6">
              Define el radio en el mapa. Cuando un empleado marca entrada, el app verifica su ubicación en tiempo real. Si está fuera del área, no puede marcar.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Tú defines el radio — chico o grande, como quieras',
                'Validación GPS en tiempo real, al momento de marcar',
                'PIN de respaldo para casos sin señal',
                'Log de cada entrada con hora exacta',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="mt-0.5 shrink-0" style={{ color: BRAND }}><CheckIcon /></span>
                  {item}
                </li>
              ))}
            </ul>
            {/* Legend */}
            <div className="flex gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" /> Dentro del área</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Fuera del área</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Getting Started ── */}
      <section id="comenzar" className="bg-white py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider" style={{ backgroundColor: `${BRAND}10`, color: BRAND }}>
              Setup
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Estás listo en menos de 10 minutos
            </h2>
            <p className="text-gray-500 text-lg max-w-lg mx-auto">
              Sin técnicos. Sin configuraciones raras. Tú solo.
            </p>
          </div>

          {/* Vertical timeline */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-7 top-8 bottom-8 w-0.5" style={{ background: `linear-gradient(to bottom, ${BRAND}, ${BRAND}20)` }} />

            <div className="space-y-6">
              {[
                {
                  num: '1', title: 'Crea tu cuenta', time: '2 min',
                  desc: 'Regístrate con tu email. No necesitas tarjeta de crédito, no hay contratos. Empiezas gratis desde el primer día.',
                  detail: 'Recibes acceso inmediato al dashboard web y puedes descargar la app móvil.',
                },
                {
                  num: '2', title: 'Configura tu negocio', time: '3 min',
                  desc: 'Ponle el nombre de tu negocio, elige tu color de marca y configura el período de pago (semanal o quincenal).',
                  detail: 'También defines el radio de geofence en el mapa — cuántos metros alrededor de tu local.',
                },
                {
                  num: '3', title: 'Agrega tus empleados', time: '2 min',
                  desc: 'Escribe nombre y apellido. El app genera el email y contraseña automáticamente — tú solo cópiaselos.',
                  detail: 'No tienes que crear cuentas de Google ni nada por el estilo. Todo pasa dentro de Ko-nnecta\'.',
                },
                {
                  num: '4', title: 'Primer turno creado', time: '1 min',
                  desc: 'Crea el turno, asígnalo al empleado, repítelo los días que necesites. Tu equipo ve sus turnos en la app al instante.',
                  detail: 'Cuando lleguen a trabajar marcan entrada desde el celular — con GPS o con PIN si no hay señal.',
                },
              ].map((step, i) => (
                <div key={step.num} className="relative flex gap-6">
                  {/* Step bubble */}
                  <div className="relative shrink-0 flex flex-col items-center" style={{ width: 56 }}>
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black z-10 shadow-lg"
                      style={{ background: BRAND, boxShadow: `0 4px 20px ${BRAND}40` }}
                    >
                      {step.num}
                    </div>
                  </div>
                  {/* Card */}
                  <div className="flex-1 pb-2">
                    <div className="p-6 rounded-2xl" style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900 text-base">{step.title}</h3>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${BRAND}10`, color: BRAND }}>~{step.time}</span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed mb-2">{step.desc}</p>
                      <p className="text-gray-400 text-xs leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center text-white font-semibold text-base px-10 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: BRAND, boxShadow: `0 4px 20px ${BRAND}40` }}
            >
              Crear mi cuenta gratis
            </Link>
            <p className="mt-3 text-sm text-gray-400">Sin tarjeta de crédito · Sin contratos · Gratis durante el beta</p>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="precios" className="py-24" style={{ background: '#fafafa' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple y transparente</h2>
            <p className="text-gray-500 text-lg">Un solo plan. Todo incluido. Gratis durante el beta.</p>
          </div>

          <div className="max-w-sm mx-auto">
            <div
              className="p-8 rounded-2xl text-center"
              style={{
                background: 'white',
                border: `2px solid ${BRAND}`,
                boxShadow: `0 8px 40px ${BRAND}18`,
              }}
            >
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-5 text-white" style={{ backgroundColor: BRAND }}>
                Todo incluido
              </span>
              <div className="mb-1">
                <span className="text-4xl font-bold text-gray-900">Gratis</span>
              </div>
              <p className="text-gray-400 text-sm mb-2">durante el beta</p>
              <p className="text-gray-500 text-sm mb-7">Sin tarjeta de crédito. Sin contratos.</p>
              <ul className="space-y-3 text-left mb-8">
                {pricingFeatures.map(item => (
                  <li key={item} className="flex items-center gap-3 text-gray-700 text-sm">
                    <span style={{ color: BRAND }}><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="block w-full text-white font-semibold text-base py-3.5 rounded-xl cursor-pointer text-center transition-all duration-200 hover:opacity-90"
                style={{ backgroundColor: BRAND, boxShadow: `0 4px 14px ${BRAND}40` }}
              >
                Crear cuenta gratis
              </Link>
            </div>
            <p className="text-center mt-5 text-sm text-gray-400">
              Precio de lanzamiento próximamente. Los usuarios beta mantienen condiciones especiales.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ backgroundColor: '#0a0205', borderTop: `1px solid ${BRAND}30` }}>
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-8">
          {/* Top row */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-10 mb-10">

            {/* Brand */}
            <div className="flex flex-col items-center lg:items-start gap-3">
              <Image src="/konnectaBigBlack.png" alt="Ko-nnecta'" width={200} height={62} className="object-contain" />
              <p style={{ fontSize: 13, color: '#6B7280' }}>La app de turnos para tu equipo.</p>
              <p style={{ fontSize: 13, color: '#4B5563' }}>Hecho en Puerto Rico 🇵🇷</p>
            </div>

            {/* Links */}
            <div className="flex gap-12">
              <div className="flex flex-col gap-3">
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Producto</p>
                <a href="#funciones" style={{ fontSize: 13, color: '#6B7280' }} className="hover:text-white transition-colors duration-150 cursor-pointer">Funciones</a>
                <a href="#geofence" style={{ fontSize: 13, color: '#6B7280' }} className="hover:text-white transition-colors duration-150 cursor-pointer">Geofence</a>
                <a href="#precios" style={{ fontSize: 13, color: '#6B7280' }} className="hover:text-white transition-colors duration-150 cursor-pointer">Precios</a>
              </div>
              <div className="flex flex-col gap-3">
                <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cuenta</p>
                <Link href="/login" style={{ fontSize: 13, color: '#6B7280' }} className="hover:text-white transition-colors duration-150 cursor-pointer">Iniciar sesión</Link>
                <Link href="/signup" style={{ fontSize: 13, color: '#6B7280' }} className="hover:text-white transition-colors duration-150 cursor-pointer">Crear cuenta</Link>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center lg:items-end gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center text-white font-bold text-sm px-6 py-3 rounded-xl cursor-pointer transition-all duration-150 hover:opacity-90"
                style={{ backgroundColor: BRAND, boxShadow: `0 4px 14px ${BRAND}40`, fontSize: 14, fontWeight: 700 }}
              >
                Empezar gratis →
              </Link>
              <p style={{ fontSize: 11, color: '#4B5563' }}>Sin tarjeta · Sin contratos</p>
              <p style={{ fontSize: 11, color: '#4B5563' }}>App Store &amp; Google Play — próximamente</p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginBottom: 20 }} />

          {/* Bottom row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p style={{ fontSize: 12, color: '#4B5563' }}>© 2025 Ko-nnecta&apos;. Todos los derechos reservados.</p>
            <p style={{ fontSize: 12, color: BRAND, fontWeight: 600 }}>Beta gratuita — Puerto Rico</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
