'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';

// ── Nav icons (SVG inline, no emoji) ─────────────────────────────────────────

function IconCalendar({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}
function IconUsers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function IconClock({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2"/>
    </svg>
  );
}
function IconSettings({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function IconLogout({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
    </svg>
  );
}

const NAV = [
  { href: '/dashboard', label: 'Turnos',    Icon: IconCalendar },
  { href: '/employees', label: 'Empleados', Icon: IconUsers    },
  { href: '/timeclock', label: 'Reportes',  Icon: IconClock    },
  { href: '/settings',  label: 'Ajustes',   Icon: IconSettings },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, business, loading, logout } = useAuth();
  const color = business?.color ?? '#E11D48';

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (!business) { router.replace('/onboarding'); return; }
  }, [loading, user, business, router]);

  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : '';

  if (loading || !user || !business) {
    return (
      <div className="flex h-screen overflow-hidden items-center justify-center" style={{ backgroundColor: '#fff8f9' }}>
        <AnimatedBackground color={color} />
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${color}30`, borderTopColor: color, animation: 'spin 0.7s linear infinite', position: 'relative', zIndex: 1 }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }

        /* Mobile: FAB lives above bottom nav */
        @media (max-width: 767px) {
          .page-fab   { bottom: 84px !important; right: 16px !important; }
          .save-bar   { left: 0 !important; bottom: 64px !important; }
        }
      `}</style>

      <AnimatedBackground color={color} />

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside
        className="hidden md:flex w-60 shrink-0 flex-col z-10"
        style={{
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '4px 0 32px rgba(0,0,0,0.06)',
        }}
      >
        {/* Brand */}
        <div className="px-4 pt-4 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <Image src="/logo-small.png" alt="Ko-nnecta'" width={110} height={34} className="object-contain object-left" style={{ marginLeft: -4 }} />
          {business && (
            <div className="flex items-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <p className="text-xs font-semibold text-gray-600 truncate">{business.name}</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={active
                  ? { backgroundColor: color, color: '#fff', boxShadow: `0 4px 14px ${color}40` }
                  : { color: '#374151' }
                }
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ backgroundColor: color }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate leading-tight">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
          >
            <IconLogout size={14} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile top header (hidden on desktop) ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4"
        style={{
          height: 56,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Image src="/logo-small.png" alt="Ko-nnecta'" width={90} height={28} className="object-contain shrink-0" />
          {business && (
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <p className="text-xs font-semibold text-gray-500 truncate max-w-[120px]">{business.name}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-500"
            style={{ backgroundColor: '#FEF2F2' }}
          >
            <IconLogout size={13} />
            Salir
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto z-0 md:pt-0 pt-14 pb-16 md:pb-0">
        {children}
      </main>

      {/* ── Mobile bottom nav (hidden on desktop) ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex"
        style={{
          height: 64,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
              style={{ color: active ? color : '#9CA3AF' }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                style={{ backgroundColor: active ? `${color}15` : 'transparent' }}
              >
                <Icon size={20} />
              </div>
              <span className="text-[10px] font-semibold leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
