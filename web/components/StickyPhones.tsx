'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const FILTER = 'drop-shadow(0 40px 80px rgba(225,29,72,0.22)) drop-shadow(0 12px 32px rgba(0,0,0,0.16))';

// Smoothing coefficient per 16.67ms frame (60fps baseline).
// Frame-rate independent: actual alpha = 1 - SMOOTH^(dt/16.67)
// so the feel is identical at 60Hz, 90Hz, 120Hz, 144Hz.
const SMOOTH = 0.88; // lower = snappier, higher = floatier (0.85–0.92 is the Apple range)

export function StickyPhones() {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let stopAt = Infinity;
    let target = 0;
    let current = 0;
    let lastTs = -1;
    let rafId: number;

    const measure = () => {
      const funciones = document.getElementById('funciones');
      if (funciones) {
        // Stop when the features section title scrolls into view
        stopAt = Math.max(0, funciones.offsetTop - window.innerHeight * 0.75);
      }
    };

    const onScroll = () => {
      target = Math.min(Math.max(0, window.scrollY), stopAt);
    };

    const tick = (ts: number) => {
      if (lastTs < 0) lastTs = ts;
      const dt = Math.min(ts - lastTs, 50); // cap at 50ms to survive tab switches
      lastTs = ts;

      // Frame-rate independent lerp
      const alpha = 1 - Math.pow(SMOOTH, dt / 16.67);
      current += (target - current) * alpha;
      if (Math.abs(target - current) < 0.05) current = target;

      // translate3d — guaranteed compositor layer, no layout recalc
      if (leftRef.current)  leftRef.current.style.transform  = `translate3d(-36%, ${current}px, 0)`;
      if (rightRef.current) rightRef.current.style.transform = `translate3d(36%,  ${current}px, 0)`;

      rafId = requestAnimationFrame(tick);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <>
      {/* Left phone */}
      <div
        ref={leftRef}
        className="absolute hidden lg:block"
        style={{
          left: 0,
          bottom: -260,
          zIndex: 20,
          transform: 'translate3d(-36%, 0px, 0)',
          filter: FILTER,
          willChange: 'transform',
        }}
      >
        <Image
          src="/hero-phone2.png"
          alt="Ko-nnecta' — pantalla de inicio"
          width={520}
          height={1002}
          priority
          className="object-contain"
          style={{ height: 1000, width: 'auto' }}
        />
      </div>

      {/* Right phone */}
      <div
        ref={rightRef}
        className="absolute hidden lg:block"
        style={{
          right: 0,
          bottom: -260,
          zIndex: 20,
          transform: 'translate3d(36%, 0px, 0)',
          filter: FILTER,
          willChange: 'transform',
        }}
      >
        <Image
          src="/hero-phone.png"
          alt="Ko-nnecta' — pantalla de turnos"
          width={524}
          height={1000}
          priority
          className="object-contain"
          style={{ height: 1035, width: 'auto' }}
        />
      </div>
    </>
  );
}
