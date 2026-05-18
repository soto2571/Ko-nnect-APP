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

const steps = [
  { num: '1', title: 'Crea tu cuenta', desc: 'Regístrate con tu email en menos de 2 minutos.' },
  { num: '2', title: 'Configura tu negocio', desc: 'Ponle nombre, elige tu color y configura el período de pago.' },
  { num: '3', title: 'Agrega tus empleados', desc: 'El app genera las credenciales automáticamente. Solo cópiaselas.' },
  { num: '4', title: 'Crea el primer turno', desc: 'Asígnalo, repítelo los días que necesites. Listo.' },
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
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: 'var(--font-geist)' }}>

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
            <a href="#funciones" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-black/5">Funciones</a>
            <a href="#geofence" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-black/5">Geofence</a>
            <a href="#comenzar" className="hidden sm:block text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-black/5">Cómo empezar</a>
            <a href="#precios" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-150 cursor-pointer px-3 py-1.5 rounded-xl hover:bg-black/5">Precios</a>
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

      {/* ── Features Storyline ── */}
      {/* padding-top clears the phone overflow (260px bottom + ~520px visible phone bottom portion) */}
      <section id="funciones" className="bg-white" style={{ paddingTop: 320, paddingBottom: 96, position: 'relative', zIndex: 0 }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para manejar tu equipo
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              De la nómina al horario, sin hojas de cálculo ni grupos de WhatsApp.
            </p>
          </div>

          {/* Timeline container */}
          <div className="relative">
            {/* Vertical dotted line — starts after first icon, ends before last */}
            <div
              className="absolute left-6 top-6 bottom-6 w-0"
              style={{ borderLeft: `2px dashed ${BRAND}35` }}
            />

            <div className="space-y-2">
              {features.map((f) => (
                <div key={f.title} className="relative flex gap-6 group">

                  {/* Icon node — sits on the dotted line */}
                  <div className="relative shrink-0 flex flex-col items-center" style={{ width: 48 }}>
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center z-10 transition-all duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: 'white',
                        border: `2px solid ${BRAND}30`,
                        color: BRAND,
                        boxShadow: `0 2px 12px ${BRAND}15`,
                      }}
                    >
                      {f.icon}
                    </div>
                  </div>

                  {/* Content card */}
                  <div
                    className="flex-1 mb-2 p-6 rounded-2xl transition-all duration-200 group-hover:shadow-md cursor-default"
                    style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${BRAND}10`, color: BRAND }}
                      >
                        {f.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 mb-1.5">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Geofence Section ── */}
      <section id="geofence" className="py-24" style={{ background: 'linear-gradient(160deg, #fff5f7 0%, #ffffff 60%)' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-12 items-center">

            {/* Map mockup */}
            <div className="w-full lg:w-1/2 flex justify-center">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80">
                {/* Map background */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl" style={{
                  background: 'linear-gradient(135deg, #e8f4e8 0%, #d4edda 30%, #c8e6c9 60%, #dcedc8 100%)',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}>
                  {/* Grid lines (streets) */}
                  <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 320 320">
                    {/* Horizontal roads */}
                    <line x1="0" y1="80"  x2="320" y2="80"  stroke="#999" strokeWidth="6" />
                    <line x1="0" y1="160" x2="320" y2="160" stroke="#999" strokeWidth="4" />
                    <line x1="0" y1="240" x2="320" y2="240" stroke="#999" strokeWidth="6" />
                    {/* Vertical roads */}
                    <line x1="80"  y1="0" x2="80"  y2="320" stroke="#999" strokeWidth="4" />
                    <line x1="160" y1="0" x2="160" y2="320" stroke="#999" strokeWidth="6" />
                    <line x1="240" y1="0" x2="240" y2="320" stroke="#999" strokeWidth="4" />
                    {/* Blocks */}
                    <rect x="90"  y="90"  width="60" height="60" rx="4" fill="#c8e6b0" opacity="0.6" />
                    <rect x="170" y="90"  width="60" height="60" rx="4" fill="#b2dfdb" opacity="0.6" />
                    <rect x="90"  y="170" width="60" height="60" rx="4" fill="#dcedc8" opacity="0.6" />
                    <rect x="170" y="170" width="60" height="60" rx="4" fill="#c8e6b0" opacity="0.6" />
                  </svg>

                  {/* Geofence circle */}
                  <div className="absolute" style={{
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 160, height: 160,
                    borderRadius: '50%',
                    border: `3px solid ${BRAND}`,
                    backgroundColor: `${BRAND}15`,
                    boxShadow: `0 0 0 8px ${BRAND}08`,
                  }} />

                  {/* Center pin */}
                  <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -100%)' }}>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: BRAND }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-2.083 3.218-4.688 3.218-7.327C19.5 6.157 16.035 2.25 12 2.25S4.5 6.157 4.5 10c0 2.64 1.274 5.244 3.218 7.327a19.58 19.58 0 0 0 2.683 2.282 16.975 16.975 0 0 0 1.14.742ZM12 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="w-2 h-2 rounded-full mt-0.5" style={{ backgroundColor: BRAND }} />
                    </div>
                  </div>

                  {/* Employee dots inside */}
                  <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#22c55e', top: '38%', left: '44%' }} />
                  <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#22c55e', top: '55%', left: '56%' }} />
                  {/* Employee dot outside */}
                  <div className="absolute w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: '#f59e0b', top: '20%', left: '70%' }} />
                </div>

                {/* Legend */}
                <div className="absolute -bottom-12 left-0 right-0 flex justify-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" /> Dentro del área
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" /> Fuera del área
                  </span>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="w-full lg:w-1/2 lg:pl-8 mt-14 lg:mt-0">
              <div
                className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider"
                style={{ backgroundColor: `${BRAND}12`, color: BRAND }}
              >
                <MapPinIcon />
                Geofence
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Tus empleados solo pueden marcar entrada desde tu negocio
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                Define un radio alrededor de tu negocio en el mapa. Cuando un empleado intenta marcar entrada, el app verifica que esté dentro del área. Si no está, no puede marcar.
              </p>
              <p className="text-gray-500 leading-relaxed mb-6">
                Si el empleado no tiene GPS disponible, puede usar el PIN de respaldo que tú configuras.
              </p>
              <ul className="space-y-3">
                {[
                  'Configuras el radio en el mapa, tú decides el tamaño del área',
                  'El app valida la ubicación en tiempo real',
                  'PIN de respaldo para casos sin señal',
                  'Logs de cada entrada con hora exacta',
                ].map(item => (
                  <li key={item} className="flex items-start gap-3 text-gray-700 text-sm">
                    <span className="mt-0.5" style={{ color: BRAND }}><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Getting Started ── */}
      <section id="comenzar" className="bg-white py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Estás listo en menos de 10 minutos
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Sin configuraciones complicadas. Sin necesitar un técnico.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-full w-full h-0.5 z-0" style={{ backgroundColor: `${BRAND}20`, transform: 'translateX(-50%)' }} />
                )}
                <div
                  className="relative z-10 p-6 rounded-2xl h-full"
                  style={{ background: '#fafafa', border: '1px solid #f0f0f0' }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-4"
                    style={{ backgroundColor: BRAND, boxShadow: `0 4px 14px ${BRAND}35` }}
                  >
                    {step.num}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center text-white font-semibold text-base px-10 py-4 rounded-xl cursor-pointer transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: BRAND, boxShadow: `0 4px 20px ${BRAND}40` }}
            >
              Crear mi cuenta gratis
            </Link>
            <p className="mt-3 text-sm text-gray-400">Sin tarjeta de crédito. Sin contratos.</p>
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
      <footer className="bg-white py-10" style={{ borderTop: '1px solid #f0f0f0' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center gap-4">
          <Image src="/logo.png" alt="Ko-nnecta'" width={180} height={56} className="object-contain opacity-90" />
          <p className="text-sm text-gray-400">Hecho en Puerto Rico 🇵🇷</p>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/login" className="text-gray-400 hover:text-gray-700 transition-colors duration-200 cursor-pointer">Iniciar sesión</Link>
            <span className="text-gray-200">|</span>
            <Link href="/signup" className="text-gray-400 hover:text-gray-700 transition-colors duration-200 cursor-pointer">Crear cuenta</Link>
          </div>
          <p className="text-xs text-gray-300">© 2025 Ko-nnecta&apos;. Todos los derechos reservados.</p>
          <p className="text-xs text-gray-300">App Store y Google Play — próximamente</p>
        </div>
      </footer>

    </div>
  );
}
