'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/services/api';
import type { Employee } from '@/types';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
function IconClose({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}
function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}
function IconRefresh({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
function IconCopy({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
function IconCheck({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function IconUsers({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}

// ── Cred Row with copy ────────────────────────────────────────────────────────

function CredRow({ label, value, color }: { label: string; value: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: 12, padding: '12px 14px' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', wordBreak: 'break-all', flex: 1 }}>{value}</span>
        <button
          onClick={copy}
          style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: 4,
            color: copied ? '#10B981' : color, transition: 'color 0.2s', flexShrink: 0,
          }}
          title="Copiar"
        >
          {copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
        </button>
      </div>
    </div>
  );
}

// ── Input Field ───────────────────────────────────────────────────────────────

function InputField({
  placeholder, value, onChange, disabled,
}: { placeholder: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        flex: 1, height: 48, borderRadius: 12, border: `1.5px solid ${focused ? '#6366F1' : '#E5E7EB'}`,
        backgroundColor: focused ? '#fff' : '#F9FAFB',
        padding: '0 14px', fontSize: 14, color: '#111827', outline: 'none',
        transition: 'border-color 0.2s, background-color 0.2s',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
      <div
        style={{
          position: 'relative', zIndex: 1, width: '100%', maxWidth: 480,
          backgroundColor: '#fff', borderRadius: 24,
          padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

function Confirm({
  open, title, message, confirmLabel = 'Confirmar', danger,
  onConfirm, onCancel, loading,
}: {
  open: boolean; title: string; message: string; confirmLabel?: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void; loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'relative', zIndex: 1, backgroundColor: '#fff', borderRadius: 20,
        padding: 28, maxWidth: 400, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 44, borderRadius: 12, border: '1.5px solid #E5E7EB',
              backgroundColor: '#F9FAFB', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 44, borderRadius: 12, border: 'none',
              backgroundColor: danger ? '#EF4444' : '#111827',
              fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ color = '#fff', size = 18 }: { color?: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `2px solid transparent`, borderTopColor: color,
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Panel = null | 'add' | 'detail';
type DetailEmp = Employee & { tempPassword?: string };

export default function EmployeesPage() {
  const { business, loading: authLoading } = useAuth();
  const color = business?.color ?? '#E11D48';

  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const [panel, setPanel]           = useState<Panel>(null);
  const [detailEmp, setDetailEmp]   = useState<DetailEmp | null>(null);
  const [editMode, setEditMode]     = useState(false);

  // Add form
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [addSaving, setAddSaving]   = useState(false);
  const [addError, setAddError]     = useState('');

  // Edit form
  const [editFirst, setEditFirst]   = useState('');
  const [editLast, setEditLast]     = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState('');

  // Reset/delete
  const [resetting, setResetting]   = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting]     = useState(false);

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      const emps = await api.getEmployees(business.businessId);
      setEmployees(emps);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [business?.businessId]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const openDetail = (emp: Employee) => {
    setDetailEmp(emp);
    setEditMode(false);
    setEditError('');
    setPanel('detail');
  };

  const closePanel = () => {
    setPanel(null);
    setDetailEmp(null);
    setEditMode(false);
    setAddError('');
    setEditError('');
    setFirstName('');
    setLastName('');
  };

  // ── Add ──────────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!firstName.trim() || !lastName.trim()) { setAddError('Ingresa nombre y apellido.'); return; }
    if (!business) return;
    setAddSaving(true);
    setAddError('');
    try {
      const result = await api.addEmployee({
        businessId: business.businessId,
        businessName: business.name,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      const emp: DetailEmp = { ...result.employee, tempPassword: result.credentials.password };
      setEmployees(prev => [...prev, result.employee]);
      setFirstName('');
      setLastName('');
      setPanel('detail');
      setDetailEmp(emp);
      setEditMode(false);
    } catch (e: any) { setAddError(e.message); }
    finally { setAddSaving(false); }
  };

  // ── Edit name ────────────────────────────────────────────────────────────────

  const startEdit = () => {
    if (!detailEmp) return;
    setEditFirst(detailEmp.firstName);
    setEditLast(detailEmp.lastName);
    setEditError('');
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!editFirst.trim() || !editLast.trim() || !detailEmp) return;
    setEditSaving(true);
    setEditError('');
    try {
      await api.updateEmployee(detailEmp.employeeId, { firstName: editFirst.trim(), lastName: editLast.trim() });
      const updated = { ...detailEmp, firstName: editFirst.trim(), lastName: editLast.trim() };
      setDetailEmp(updated);
      setEmployees(prev => prev.map(e => e.employeeId === detailEmp.employeeId ? { ...e, firstName: editFirst.trim(), lastName: editLast.trim() } : e));
      setEditMode(false);
    } catch (e: any) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  // ── Reset PIN ────────────────────────────────────────────────────────────────

  const handleReset = async () => {
    if (!detailEmp) return;
    setResetting(true);
    try {
      const creds = await api.resetEmployeePin(detailEmp.employeeId);
      setDetailEmp(prev => prev ? { ...prev, tempPassword: creds.password } : null);
    } catch (e: any) { setEditError(e.message); }
    finally { setResetting(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!detailEmp) return;
    setDeleting(true);
    try {
      await api.deleteEmployee(detailEmp.employeeId);
      setEmployees(prev => prev.filter(e => e.employeeId !== detailEmp.employeeId));
      setDeleteConfirm(false);
      closePanel();
    } catch (e: any) { setEditError(e.message); }
    finally { setDeleting(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spinner color={color} />
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: '32px 36px', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>Empleados</h1>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '4px 0 0' }}>
              {loading ? 'Cargando...' : `${employees.length} empleado${employees.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => { setPanel('add'); setAddError(''); setFirstName(''); setLastName(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 44, paddingLeft: 18, paddingRight: 18,
              borderRadius: 14, border: 'none',
              backgroundColor: color, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: `0 4px 14px ${color}40`,
            }}
          >
            <IconPlus size={16} />
            Agregar Empleado
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#DC2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="sk-card" style={{
                borderRadius: 20, padding: 20,
                display: 'flex', alignItems: 'center', gap: 14,
                animationDelay: `${i * 70}ms`,
              }}>
                <div className="sk" style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="sk" style={{ height: 14, width: '60%' }} />
                  <div className="sk" style={{ height: 11, width: '85%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && employees.length === 0 && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            paddingTop: 80, gap: 16,
          }}>
            <div style={{ color: '#D1D5DB' }}>
              <IconUsers size={56} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 6px' }}>Sin empleados aún</p>
              <p style={{ fontSize: 14, color: '#9CA3AF', margin: 0 }}>Agrega tu primer empleado para comenzar.</p>
            </div>
            <button
              onClick={() => { setPanel('add'); setAddError(''); setFirstName(''); setLastName(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                height: 44, paddingLeft: 18, paddingRight: 18,
                borderRadius: 14, border: `2px solid ${color}`,
                backgroundColor: `${color}10`, color: color,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <IconPlus size={16} />
              Agregar Empleado
            </button>
          </div>
        )}

        {/* Employee grid */}
        {!loading && employees.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {employees.map(emp => {
              const initials = `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();
              return (
                <div
                  key={emp.employeeId}
                  onClick={() => openDetail(emp)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.7)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                    padding: 20,
                    display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s, transform 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.13)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.07)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 800, fontSize: 17, flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {emp.email}
                    </p>
                  </div>
                  <div style={{ color: '#D1D5DB', flexShrink: 0 }}>
                    <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Modal ── */}
      <Modal open={panel === 'add'} onClose={closePanel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Agregar Empleado</h2>
          <button onClick={closePanel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: 4 }}>
            <IconClose size={20} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0, lineHeight: 1.5 }}>
          Ko-nnecta' va a generar las credenciales automáticamente. Podrás verlas y compartirlas en el perfil del empleado.
        </p>

        {addError && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 13 }}>
            {addError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <InputField placeholder="Nombre" value={firstName} onChange={v => { setFirstName(v); setAddError(''); }} disabled={addSaving} />
          <InputField placeholder="Apellido" value={lastName} onChange={v => { setLastName(v); setAddError(''); }} disabled={addSaving} />
        </div>

        <button
          onClick={handleAdd}
          disabled={addSaving}
          style={{
            height: 50, borderRadius: 14, border: 'none',
            backgroundColor: color, color: '#fff',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            opacity: addSaving ? 0.7 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 4px 14px ${color}40`,
          }}
        >
          {addSaving ? <Spinner /> : 'Crear Empleado'}
        </button>
      </Modal>

      {/* ── Detail Modal ── */}
      <Modal open={panel === 'detail' && !!detailEmp} onClose={closePanel}>
        {detailEmp && (
          <>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Perfil del Empleado</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Eliminar empleado"
                >
                  <IconTrash size={16} />
                </button>
                <button
                  onClick={closePanel}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: '1px solid #F3F4F6',
                    backgroundColor: '#F9FAFB', color: '#6B7280', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <IconClose size={18} />
                </button>
              </div>
            </div>

            {/* Avatar + name */}
            {editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <InputField placeholder="Nombre" value={editFirst} onChange={v => { setEditFirst(v); setEditError(''); }} disabled={editSaving} />
                  <InputField placeholder="Apellido" value={editLast} onChange={v => { setEditLast(v); setEditError(''); }} disabled={editSaving} />
                </div>
                {editError && (
                  <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', color: '#DC2626', fontSize: 13 }}>
                    {editError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setEditMode(false)}
                    style={{ flex: 1, height: 46, borderRadius: 12, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    style={{
                      flex: 1, height: 46, borderRadius: 12, border: 'none',
                      backgroundColor: color, fontSize: 14, fontWeight: 700, color: '#fff',
                      cursor: 'pointer', opacity: editSaving ? 0.6 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {editSaving ? <Spinner /> : 'Guardar'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 20, flexShrink: 0,
                  backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: 22,
                }}>
                  {`${detailEmp.firstName[0] ?? ''}${detailEmp.lastName[0] ?? ''}`.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>
                    {detailEmp.firstName} {detailEmp.lastName}
                  </p>
                  <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Empleado</p>
                </div>
                <button
                  onClick={startEdit}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: color, padding: 6 }}
                  title="Editar nombre"
                >
                  <IconEdit size={18} />
                </button>
              </div>
            )}

            {/* Credentials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Credenciales de Acceso</p>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Comparte estas credenciales con el empleado para que pueda entrar al app.</p>
              </div>
              <CredRow label="Email" value={detailEmp.email} color={color} />
              <CredRow label="Contraseña" value={detailEmp.tempPassword ?? '—'} color={color} />
            </div>

            {/* Reset PIN */}
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                height: 48, borderRadius: 14, border: `1.5px solid ${color}`,
                backgroundColor: `${color}0D`, color: color,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                opacity: resetting ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {resetting ? <Spinner color={color} /> : (
                <>
                  <IconRefresh size={16} />
                  Resetear Contraseña
                </>
              )}
            </button>
          </>
        )}
      </Modal>

      {/* ── Delete Confirm ── */}
      <Confirm
        open={deleteConfirm}
        title="Eliminar Empleado"
        message={detailEmp ? `¿Eliminar a ${detailEmp.firstName} ${detailEmp.lastName}? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
        loading={deleting}
      />
    </>
  );
}
