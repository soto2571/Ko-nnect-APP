'use client';

const BRAND = '#E11D48';

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function clamp(v: number) { return Math.max(0, Math.min(255, v)); }

export function AnimatedBackground({ color = BRAND }: { color?: string }) {
  const [r, g, b] = parseHex(color);
  const c1 = `rgb(${r},${g},${b})`;
  const c2 = `rgb(${clamp(r-20)},${clamp(g+10)},${clamp(b+30)})`;
  const c3 = `rgb(${clamp(r+40)},${clamp(g+40)},${clamp(b+40)})`;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient — white to soft blush */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(160deg, #ffffff 0%, #fff5f7 55%, #ffe4eb 100%)',
      }} />

      {/* Blob 1 — top-left */}
      <div style={{
        position: 'absolute', left: '-60px', top: '-60px',
        width: 420, height: 420, borderRadius: '50%',
        background: `radial-gradient(circle, ${c1}88 0%, ${c1}33 55%, transparent 100%)`,
        filter: 'blur(8px)',
        animation: 'blob1 8s ease-in-out infinite',
      }} />

      {/* Blob 2 — right center */}
      <div style={{
        position: 'absolute', right: '-80px', top: '40%',
        width: 340, height: 340, borderRadius: '50%',
        background: `radial-gradient(circle, ${c2}77 0%, ${c2}22 55%, transparent 100%)`,
        filter: 'blur(10px)',
        animation: 'blob2 9.5s ease-in-out infinite 2s',
      }} />

      {/* Blob 3 — bottom center */}
      <div style={{
        position: 'absolute', left: '40%', bottom: '-80px',
        width: 380, height: 380, borderRadius: '50%',
        background: `radial-gradient(circle, ${c3}66 0%, ${c3}22 55%, transparent 100%)`,
        filter: 'blur(12px)',
        animation: 'blob3 11s ease-in-out infinite 4s',
      }} />

      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(40px, 30px); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(-35px, 45px); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(30px, -50px); }
        }
      `}</style>
    </div>
  );
}
