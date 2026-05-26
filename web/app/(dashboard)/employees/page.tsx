'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import * as api from '@/services/api';
import type { BusinessRole, Employee } from '@/types';

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

// ── Admin Info Box ────────────────────────────────────────────────────────────
function AdminInfoBox() {
  const CAN    = ['Crear y editar turnos', 'Ver todos los empleados', 'Ver los reportes de tiempo'];
  const CANNOT = ['Ajustes del negocio', 'Información de pago', 'Eliminar el negocio'];
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${ADMIN_COLOR}30`, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', backgroundColor: `${ADMIN_COLOR}10` }}>
        <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke={ADMIN_COLOR} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        <span style={{ fontSize: 12, fontWeight: 800, color: ADMIN_COLOR }}>¿Qué puede hacer un Administrador?</span>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 2 }}>Puede:</span>
        {CAN.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            <span style={{ fontSize: 13, color: '#374151' }}>{t}</span>
          </div>
        ))}
        <span style={{ fontSize: 10, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 6, marginBottom: 2 }}>No tiene acceso a:</span>
        {CANNOT.map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            <span style={{ fontSize: 13, color: '#374151' }}>{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
const ADMIN_COLOR = '#7C3AED';

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

// ── Role Name Input (larger, for the create-role form) ────────────────────────

function RoleNameInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder="Nombre del rol (ej. Mesero, Cajero…)"
      disabled={disabled}
      style={{
        width: '100%', height: 56, borderRadius: 14,
        border: `1.5px solid ${focused ? '#6366F1' : '#E5E7EB'}`,
        backgroundColor: focused ? '#fff' : '#F9FAFB',
        padding: '0 16px', fontSize: 16, color: '#111827', outline: 'none',
        transition: 'border-color 0.2s, background-color 0.2s',
        opacity: disabled ? 0.5 : 1, boxSizing: 'border-box',
      }}
    />
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
          maxHeight: '90vh', overflowY: 'auto',
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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
  const [roles, setRoles]           = useState<BusinessRole[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [roleChanging, setRoleChanging] = useState(false);

  // Roles management
  const [newRoleName,    setNewRoleName]    = useState('');
  const [newRoleIsAdmin, setNewRoleIsAdmin] = useState(false);
  const [roleAdding,     setRoleAdding]     = useState(false);
  const [roleError,      setRoleError]      = useState('');
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const [adminWarnRole,  setAdminWarnRole]  = useState<{ roleId: string; roleName: string } | null>(null);
  const [editingRoleId,      setEditingRoleId]      = useState<string | null>(null);
  const [editingRoleName,    setEditingRoleName]    = useState('');
  const [editingRoleIsAdmin, setEditingRoleIsAdmin] = useState(false);
  const [savingRoleId,       setSavingRoleId]       = useState<string | null>(null);
  const [createAdminConfirm, setCreateAdminConfirm] = useState(false);
  const [editAdminConfirm,   setEditAdminConfirm]   = useState(false);
  const [deleteRoleTarget,   setDeleteRoleTarget]   = useState<BusinessRole | null>(null);
  // Role assignment modal
  const [assigningRole,    setAssigningRole]    = useState<BusinessRole | null>(null);
  const [assignSelected,   setAssignSelected]   = useState<Set<string>>(new Set());
  const [assignSaving,     setAssignSaving]     = useState(false);

  const [rolesModal, setRolesModal] = useState(false);

  const [panel, setPanel]           = useState<Panel>(null);
  const [detailEmp, setDetailEmp]   = useState<DetailEmp | null>(null);
  const [roleExpanded, setRoleExpanded] = useState(false);
  // '__none__' = Sin rol pending; any other string = roleId pending; null = nothing pending
  const [pendingRoleId, setPendingRoleId] = useState<string | null>(null);
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
      const [emps, bizRoles] = await Promise.all([
        api.getEmployees(business.businessId),
        api.getRoles(business.businessId).catch(() => [] as BusinessRole[]),
      ]);
      setEmployees(emps);
      setRoles(bizRoles);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [business?.businessId]);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  const openDetail = (emp: Employee) => {
    setDetailEmp(emp);
    setEditMode(false);
    setEditError('');
    setRoleExpanded(false);
    setPendingRoleId(null);
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

  // ── Assign Role ──────────────────────────────────────────────────────────────

  const handleAssignRole = async (emp: Employee, roleId: string | null) => {
    setRoleChanging(true);
    try {
      await api.assignEmployeeRole(emp.employeeId, roleId);
      const role = roles.find(r => r.roleId === roleId) ?? null;
      const updated = { ...emp, roleId, roleName: role?.name ?? null, roleIsAdmin: role?.isAdmin ?? false };
      setDetailEmp(updated);
      setEmployees(prev => prev.map(e => e.employeeId === emp.employeeId ? updated : e));
    } catch (e: any) { setEditError(e.message); }
    finally { setRoleChanging(false); }
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

  // ── Role management ─────────────────────────────────────────────────────────

  const doCreateRole = async () => {
    if (!newRoleName.trim() || !business) return;
    setRoleAdding(true); setRoleError('');
    try {
      const r = await api.createRole({ businessId: business.businessId, name: newRoleName.trim(), isAdmin: newRoleIsAdmin });
      setRoles(prev => [...prev, r]);
      setNewRoleName(''); setNewRoleIsAdmin(false); setCreateAdminConfirm(false);
      openAssignModal(r);
    } catch (e: any) { setRoleError(e.message); }
    finally { setRoleAdding(false); }
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    if (newRoleIsAdmin && !createAdminConfirm) { setCreateAdminConfirm(true); return; }
    doCreateRole();
  };

  const startEditRole = (r: BusinessRole) => {
    setEditingRoleId(r.roleId);
    setEditingRoleName(r.name);
    setEditingRoleIsAdmin(r.isAdmin);
    setRoleError('');
  };

  const doUpdateRole = async () => {
    if (!editingRoleId || !editingRoleName.trim()) return;
    setSavingRoleId(editingRoleId); setRoleError('');
    try {
      const updated = await api.updateRole(editingRoleId, { name: editingRoleName.trim(), isAdmin: editingRoleIsAdmin });
      setRoles(prev => prev.map(r => r.roleId === editingRoleId ? updated : r));
      setEmployees(prev => prev.map(e => e.roleId === editingRoleId ? { ...e, roleName: updated.name, roleIsAdmin: updated.isAdmin } : e));
      setEditingRoleId(null); setEditAdminConfirm(false);
    } catch (e: any) { setRoleError(e.message); }
    finally { setSavingRoleId(null); }
  };

  const handleUpdateRole = () => {
    if (!editingRoleId || !editingRoleName.trim()) return;
    const prev = roles.find(r => r.roleId === editingRoleId);
    if (editingRoleIsAdmin && !prev?.isAdmin && !editAdminConfirm) { setEditAdminConfirm(true); return; }
    doUpdateRole();
  };

  const doDeleteRole = async (roleId: string) => {
    setDeletingRoleId(roleId);
    try {
      await api.deleteRole(roleId);
      setRoles(prev => prev.filter(r => r.roleId !== roleId));
      setEmployees(prev => prev.map(e => e.roleId === roleId ? { ...e, roleId: null, roleName: null, roleIsAdmin: false } : e));
      setDeleteRoleTarget(null);
    } catch (e: any) { setRoleError(e.message); }
    finally { setDeletingRoleId(null); }
  };

  const confirmAssignAdminRole = (emp: Employee, roleId: string, roleName: string) => {
    setAdminWarnRole({ roleId, roleName });
  };

  const openAssignModal = (role: BusinessRole) => {
    const preSelected = new Set(
      employees.filter(e => !e.deletedAt && e.roleId === role.roleId).map(e => e.employeeId)
    );
    setAssignSelected(preSelected);
    setAssigningRole(role);
  };

  const handleSaveRoleAssignment = async () => {
    if (!assigningRole) return;
    setAssignSaving(true);
    try {
      const activeEmps = employees.filter(e => !e.deletedAt);
      await Promise.all(activeEmps.map(emp => {
        const had  = emp.roleId === assigningRole.roleId;
        const want = assignSelected.has(emp.employeeId);
        if (want && !had)  return api.assignEmployeeRole(emp.employeeId, assigningRole.roleId);
        if (!want && had)  return api.assignEmployeeRole(emp.employeeId, null);
        return Promise.resolve();
      }));
      setEmployees(prev => prev.map(e => {
        if (e.deletedAt) return e;
        if (assignSelected.has(e.employeeId))
          return { ...e, roleId: assigningRole.roleId, roleName: assigningRole.name, roleIsAdmin: assigningRole.isAdmin };
        if (e.roleId === assigningRole.roleId)
          return { ...e, roleId: null, roleName: null, roleIsAdmin: false };
        return e;
      }));
      setAssigningRole(null);
    } catch (e: any) { setRoleError(e.message); }
    finally { setAssignSaving(false); }
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
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 767px) { .page-content { padding: 16px 16px 32px !important; } }
      `}</style>

      <div className="page-content" style={{ padding: '32px 36px', maxWidth: 900, margin: '0 auto' }}>

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

        {/* ── Roles del Negocio Card ── */}
        <div style={{ marginBottom: 32, borderRadius: 20, border: `1.5px solid ${color}30`, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={20} height={20} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: 0 }}>Roles del Negocio</p>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>
                {roles.length === 0 ? 'Sin roles creados' : `${roles.length} rol${roles.length !== 1 ? 'es' : ''} definido${roles.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button
              onClick={() => setRolesModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, paddingLeft: 14, paddingRight: 14, borderRadius: 12, border: 'none', backgroundColor: color, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0, boxShadow: `0 3px 10px ${color}35` }}
            >
              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Gestionar
            </button>
          </div>

          {/* Role pills */}
          {roles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
              {roles.map(r => (
                <div key={r.roleId} style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 10, paddingRight: 10, height: 28, borderRadius: 14, backgroundColor: r.isAdmin ? `${ADMIN_COLOR}12` : '#F3F4F6', border: `1px solid ${r.isAdmin ? `${ADMIN_COLOR}40` : '#E5E7EB'}` }}>
                  {r.isAdmin && <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke={ADMIN_COLOR} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>}
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.isAdmin ? ADMIN_COLOR : '#374151' }}>{r.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Employees ── */}
        {/* Employee grid */}
        {!loading && employees.length > 0 && (() => {
          const sort = (arr: Employee[]) => [...arr].sort((a, b) =>
            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es')
          );
          const admins  = sort(employees.filter(e => e.roleIsAdmin  && !e.deletedAt));
          const regulars = sort(employees.filter(e => !e.roleIsAdmin && !e.deletedAt));

          const EmpCard = (emp: Employee) => {
            const isAdmin = !!emp.roleIsAdmin;
            const avatarBg = isAdmin ? ADMIN_COLOR : color;
            const initials = `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();
            return (
              <div
                key={emp.employeeId}
                onClick={() => openDetail(emp)}
                style={{
                  backgroundColor: isAdmin ? `${ADMIN_COLOR}08` : 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 20,
                  border: isAdmin ? `1.5px solid ${ADMIN_COLOR}30` : '1px solid rgba(255,255,255,0.7)',
                  boxShadow: isAdmin ? `0 4px 24px ${ADMIN_COLOR}18` : '0 4px 24px rgba(0,0,0,0.07)',
                  padding: 20, display: 'flex', alignItems: 'center', gap: 14,
                  cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.13)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = isAdmin ? `0 4px 24px ${ADMIN_COLOR}18` : '0 4px 24px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {emp.firstName} {emp.lastName}
                  </p>
                  {emp.roleName ? (
                    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '2px 8px', backgroundColor: isAdmin ? `${ADMIN_COLOR}18` : '#F3F4F6', color: isAdmin ? ADMIN_COLOR : '#6B7280', border: `1px solid ${isAdmin ? `${ADMIN_COLOR}40` : '#E5E7EB'}` }}>
                      {emp.roleName}
                    </span>
                  ) : (
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</p>
                  )}
                </div>
                <div style={{ color: '#D1D5DB', flexShrink: 0 }}>
                  <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            );
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {admins.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: ADMIN_COLOR, textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width={13} height={13} fill="none" viewBox="0 0 24 24" stroke={ADMIN_COLOR} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    Administradores
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {admins.map(EmpCard)}
                  </div>
                </div>
              )}
              {regulars.length > 0 && (
                <div>
                  {admins.length > 0 && (
                    <p style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 10px' }}>Empleados</p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                    {regulars.map(EmpCard)}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
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
                  backgroundColor: detailEmp.roleIsAdmin ? ADMIN_COLOR : color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 900, fontSize: 22,
                }}>
                  {`${detailEmp.firstName[0] ?? ''}${detailEmp.lastName[0] ?? ''}`.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 2px' }}>
                    {detailEmp.firstName} {detailEmp.lastName}
                  </p>
                  {detailEmp.roleName ? (
                    <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '2px 10px', backgroundColor: detailEmp.roleIsAdmin ? `${ADMIN_COLOR}18` : '#F3F4F6', color: detailEmp.roleIsAdmin ? ADMIN_COLOR : '#6B7280', border: `1px solid ${detailEmp.roleIsAdmin ? `${ADMIN_COLOR}40` : '#E5E7EB'}` }}>
                      {detailEmp.roleName}
                    </span>
                  ) : (
                    <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Sin rol asignado</p>
                  )}
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
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>Credenciales de Acceso</p>
              <CredRow label="Email" value={detailEmp.email} color={color} />

              {detailEmp.tempPassword ? (
                <CredRow label="Contraseña" value={detailEmp.tempPassword} color={color} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, backgroundColor: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
                  <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>Contraseña propia</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '2px 0 0' }}>El empleado cambió su contraseña. Puedes generar una nueva abajo si la olvidó.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Reset password */}
            <button
              onClick={handleReset}
              disabled={resetting}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                height: 44, borderRadius: 12, border: `1.5px solid ${color}`,
                backgroundColor: `${color}0D`, color: color,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                opacity: resetting ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              {resetting ? <Spinner color={color} /> : (
                <>
                  <IconRefresh size={14} />
                  {detailEmp.tempPassword ? 'Generar nueva contraseña' : 'Restablecer contraseña'}
                </>
              )}
            </button>

            {/* Role — collapsible */}
            {roles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid #F3F4F6', paddingTop: 16 }}>
                {/* Toggle header */}
                <button
                  onClick={() => { setRoleExpanded(v => !v); setPendingRoleId(null); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Rol actual</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: detailEmp.roleIsAdmin ? ADMIN_COLOR : (detailEmp.roleName ? color : '#9CA3AF') }}>
                      {detailEmp.roleName ?? 'Sin rol asignado'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, paddingInline: 12, borderRadius: 10, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>Cambiar rol</span>
                    <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke="#6B7280" strokeWidth={2.5} style={{ transition: 'transform 0.2s', transform: roleExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expandable list */}
                {roleExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>

                    {/* Sin rol row */}
                    {(() => {
                      const isCurrent = !detailEmp.roleId;
                      const isPending = pendingRoleId === '__none__';
                      const isActive  = isCurrent || isPending;
                      return (
                        <>
                          <button
                            onClick={() => setPendingRoleId(isPending ? null : '__none__')}
                            disabled={roleChanging || isCurrent}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${isActive ? color : '#E5E7EB'}`, backgroundColor: isActive ? color + '0C' : '#F9FAFB', cursor: isCurrent ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                          >
                            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isActive ? color + '20' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke={isActive ? color : '#9CA3AF'} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? color : '#374151', margin: 0 }}>Sin rol</p>
                              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>Acceso básico de empleado</p>
                            </div>
                            {isCurrent && <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                          </button>
                          {isPending && (
                            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', backgroundColor: '#F9FAFB', borderRadius: 12, border: '1.5px solid #E5E7EB' }}>
                              <button onClick={() => setPendingRoleId(null)}
                                style={{ flex: 1, height: 36, borderRadius: 10, border: '1.5px solid #E5E7EB', backgroundColor: '#fff', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                                Cancelar
                              </button>
                              <button
                                onClick={() => { handleAssignRole(detailEmp, null); setPendingRoleId(null); setRoleExpanded(false); }}
                                disabled={roleChanging}
                                style={{ flex: 2, height: 36, borderRadius: 10, border: 'none', backgroundColor: color, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: roleChanging ? 0.6 : 1 }}>
                                {roleChanging ? '…' : 'Confirmar'}
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Role rows */}
                    {roles.map(r => {
                      const isCurrent = detailEmp.roleId === r.roleId;
                      const isPending = pendingRoleId === r.roleId;
                      const isActive  = isCurrent || isPending;
                      const rowColor  = r.isAdmin ? ADMIN_COLOR : color;
                      return (
                        <div key={r.roleId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button
                            onClick={() => setPendingRoleId(isPending ? null : r.roleId)}
                            disabled={roleChanging || isCurrent}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${isActive ? rowColor : '#E5E7EB'}`, backgroundColor: isActive ? rowColor + '0C' : r.isAdmin ? `${ADMIN_COLOR}04` : '#F9FAFB', cursor: isCurrent ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                          >
                            <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isActive ? rowColor + '20' : r.isAdmin ? `${ADMIN_COLOR}12` : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {r.isAdmin
                                ? <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={isActive ? ADMIN_COLOR : `${ADMIN_COLOR}80`} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                : <svg width={14} height={14} fill="none" viewBox="0 0 24 24" stroke={isActive ? color : '#9CA3AF'} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                              }
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: isActive ? rowColor : '#374151', margin: 0 }}>{r.name}</p>
                              <p style={{ fontSize: 11, color: r.isAdmin ? (isActive ? ADMIN_COLOR : `${ADMIN_COLOR}90`) : '#9CA3AF', margin: '1px 0 0', fontWeight: r.isAdmin ? 600 : 400 }}>
                                {r.isAdmin ? 'Puede gestionar turnos, empleados y reportes' : 'Acceso estándar de empleado'}
                              </p>
                            </div>
                            {isCurrent && <svg width={16} height={16} fill="none" viewBox="0 0 24 24" stroke={rowColor} strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                          </button>

                          {/* Inline confirmation — appears directly below the selected row */}
                          {isPending && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', backgroundColor: r.isAdmin ? `${ADMIN_COLOR}06` : '#F9FAFB', borderRadius: 12, border: `1.5px solid ${r.isAdmin ? `${ADMIN_COLOR}30` : '#E5E7EB'}` }}>
                              {r.isAdmin && (
                                <>
                                  <p style={{ fontSize: 12, fontWeight: 700, color: ADMIN_COLOR, margin: 0 }}>
                                    Este rol tiene permisos de administrador
                                  </p>
                                  <AdminInfoBox />
                                </>
                              )}
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setPendingRoleId(null)}
                                  style={{ flex: 1, height: 36, borderRadius: 10, border: `1.5px solid ${r.isAdmin ? `${ADMIN_COLOR}40` : '#E5E7EB'}`, backgroundColor: '#fff', fontSize: 13, fontWeight: 700, color: r.isAdmin ? ADMIN_COLOR : '#374151', cursor: 'pointer' }}>
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => { handleAssignRole(detailEmp, r.roleId); setPendingRoleId(null); setRoleExpanded(false); }}
                                  disabled={roleChanging}
                                  style={{ flex: 2, height: 36, borderRadius: 10, border: 'none', backgroundColor: rowColor, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: roleChanging ? 0.6 : 1 }}>
                                  {roleChanging ? '…' : r.isAdmin ? 'Sí, asignar' : 'Confirmar'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {roleChanging && <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Guardando...</p>}
                  </div>
                )}
              </div>
            )}
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

      {/* ── Assign Role Modal ── */}
      {assigningRole && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setAssigningRole(null); }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, backgroundColor: '#fff', borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '88vh', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Asignar "{assigningRole.name}"</h2>
                <p style={{ fontSize: 12, color: '#9CA3AF', margin: '3px 0 0' }}>
                  Elige los empleados que tendrán este rol · {assignSelected.size} seleccionado{assignSelected.size !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setAssigningRole(null)}
                style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #F0F0F0', backgroundColor: '#F9FAFB', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                ×
              </button>
            </div>

            {/* Employee list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {employees.filter(e => !e.deletedAt).sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es')).map(emp => {
                const isSel     = assignSelected.has(emp.employeeId);
                const hasOther  = emp.roleId && emp.roleId !== assigningRole!.roleId;
                const otherRole = hasOther ? roles.find(r => r.roleId === emp.roleId) : null;
                const initials  = `${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase();
                const toggle    = () => setAssignSelected(prev => {
                  const next = new Set(prev);
                  next.has(emp.employeeId) ? next.delete(emp.employeeId) : next.add(emp.employeeId);
                  return next;
                });
                return (
                  <button key={emp.employeeId} onClick={toggle} type="button"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 14, border: `1.5px solid ${isSel ? color : 'transparent'}`, backgroundColor: isSel ? `${color}0E` : '#F9FAFB', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, backgroundColor: isSel ? color : '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSel ? '#fff' : '#9CA3AF', fontWeight: 800, fontSize: 13, transition: 'all 0.15s' }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: isSel ? color : '#374151', margin: 0, lineHeight: 1.3 }}>{emp.firstName} {emp.lastName}</p>
                      {otherRole
                        ? <p style={{ fontSize: 11, color: '#F59E0B', margin: '1px 0 0', fontWeight: 600 }}>Tiene rol: {otherRole.name} → se reemplazará</p>
                        : <p style={{ fontSize: 11, color: '#9CA3AF', margin: '1px 0 0' }}>{emp.email}</p>
                      }
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: 11, flexShrink: 0, border: `2px solid ${isSel ? color : '#D1D5DB'}`, backgroundColor: isSel ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                      {isSel && <svg width={11} height={11} fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 24px 20px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 10 }}>
              <button onClick={() => setAssigningRole(null)}
                style={{ flex: 1, height: 48, borderRadius: 14, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 14, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSaveRoleAssignment} disabled={assignSaving}
                style={{ flex: 2, height: 48, borderRadius: 14, border: 'none', backgroundColor: color, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: assignSaving ? 0.6 : 1, boxShadow: `0 4px 14px ${color}40` }}>
                {assignSaving ? '…' : `Guardar asignación`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Role Confirm ── */}
      <Confirm
        open={!!deleteRoleTarget}
        title="Eliminar rol"
        message={deleteRoleTarget ? `¿Eliminar el rol "${deleteRoleTarget.name}"?\n\nLos empleados con este rol quedarán sin rol asignado.` : ''}
        confirmLabel="Eliminar rol"
        danger
        onConfirm={() => deleteRoleTarget && doDeleteRole(deleteRoleTarget.roleId)}
        onCancel={() => setDeleteRoleTarget(null)}
        loading={!!deletingRoleId}
      />

      {/* ── Gestionar Roles Modal ── */}
      {rolesModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) { setRolesModal(false); setEditingRoleId(null); setEditAdminConfirm(false); setCreateAdminConfirm(false); } }}>
          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 720, backgroundColor: '#fff', borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Roles del Negocio</h2>
                <p style={{ fontSize: 13, color: '#9CA3AF', margin: '3px 0 0' }}>Crea, edita y asigna los roles de tu equipo</p>
              </div>
              <button
                onClick={() => { setRolesModal(false); setEditingRoleId(null); setEditAdminConfirm(false); setCreateAdminConfirm(false); }}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid #F0F0F0', backgroundColor: '#F9FAFB', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <IconClose size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 28px' }}>

              {roleError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', marginBottom: 16, color: '#DC2626', fontSize: 13 }}>
                  {roleError}
                </div>
              )}

              {/* Role cards grid */}
              {roles.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
                  {roles.map(r => {
                    const isEditing  = editingRoleId  === r.roleId;
                    const isSaving   = savingRoleId   === r.roleId;
                    const isDeleting = deletingRoleId === r.roleId;
                    const isAdminRole = isEditing ? editingRoleIsAdmin : r.isAdmin;
                    const empCount = employees.filter(e => !e.deletedAt && e.roleId === r.roleId).length;
                    const cardColor = isAdminRole ? ADMIN_COLOR : color;
                    return (
                      <div key={r.roleId} style={{
                        backgroundColor: 'rgba(255,255,255,0.88)',
                        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                        borderRadius: 18,
                        border: `1.5px solid ${isAdminRole ? `${ADMIN_COLOR}35` : `${color}30`}`,
                        boxShadow: `0 4px 20px ${cardColor}10`,
                        padding: 16,
                        display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        {isEditing ? (
                          <>
                            <input
                              value={editingRoleName}
                              onChange={e => { setEditingRoleName(e.target.value); setEditAdminConfirm(false); }}
                              onKeyDown={e => { if (e.key === 'Enter') handleUpdateRole(); if (e.key === 'Escape') { setEditingRoleId(null); setEditAdminConfirm(false); } }}
                              autoFocus
                              style={{ height: 36, borderRadius: 10, border: '1.5px solid #6366F1', padding: '0 10px', fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none', backgroundColor: '#fff' }}
                            />
                            <button
                              type="button"
                              onClick={() => { setEditingRoleIsAdmin(v => !v); setEditAdminConfirm(false); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, textAlign: 'left', width: '100%', border: `1.5px solid ${editingRoleIsAdmin ? ADMIN_COLOR : '#E5E7EB'}`, backgroundColor: editingRoleIsAdmin ? `${ADMIN_COLOR}08` : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                            >
                              <svg width={15} height={15} fill="none" viewBox="0 0 24 24" stroke={editingRoleIsAdmin ? ADMIN_COLOR : '#9CA3AF'} strokeWidth={2.5} style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: editingRoleIsAdmin ? ADMIN_COLOR : '#374151', margin: 0 }}>Administrador</p>
                              </div>
                              <div style={{ width: 34, height: 18, borderRadius: 9, flexShrink: 0, backgroundColor: editingRoleIsAdmin ? ADMIN_COLOR : '#E5E7EB', position: 'relative', transition: 'background-color 0.2s' }}>
                                <div style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', position: 'absolute', top: 3, left: editingRoleIsAdmin ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                              </div>
                            </button>
                            {editAdminConfirm ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, backgroundColor: `${ADMIN_COLOR}06`, borderRadius: 10, border: `1px solid ${ADMIN_COLOR}25` }}>
                                <p style={{ fontSize: 12, fontWeight: 700, color: ADMIN_COLOR, margin: 0 }}>Confirmar administrador para "{editingRoleName}"</p>
                                <AdminInfoBox />
                                <button onClick={doUpdateRole} disabled={isSaving}
                                  style={{ height: 34, borderRadius: 9, border: 'none', backgroundColor: ADMIN_COLOR, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: isSaving ? 0.6 : 1 }}>
                                  {isSaving ? '…' : 'Confirmar y guardar'}
                                </button>
                                <button onClick={() => setEditAdminConfirm(false)}
                                  style={{ height: 34, borderRadius: 9, border: 'none', backgroundColor: '#F3F4F6', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                                  Atrás
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { setEditingRoleId(null); setEditAdminConfirm(false); }}
                                  style={{ flex: 1, height: 34, borderRadius: 9, border: '1.5px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                                  Cancelar
                                </button>
                                <button onClick={handleUpdateRole} disabled={isSaving || !editingRoleName.trim()}
                                  style={{ flex: 2, height: 34, borderRadius: 9, border: 'none', backgroundColor: color, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: isSaving || !editingRoleName.trim() ? 0.5 : 1 }}>
                                  {isSaving ? '…' : 'Guardar'}
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0, backgroundColor: `${cardColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {isAdminRole
                                  ? <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke={cardColor} strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                  : <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke={cardColor} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                }
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                                <p style={{ fontSize: 11, margin: 0, color: '#9CA3AF' }}>
                                  {empCount === 0 ? 'Sin asignar' : `${empCount} empleado${empCount !== 1 ? 's' : ''}`}
                                </p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => openAssignModal(r)}
                                style={{ flex: 1, height: 32, borderRadius: 9, border: `1.5px solid ${cardColor}40`, backgroundColor: `${cardColor}0C`, color: cardColor, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <IconUsers size={12} />
                                Asignar
                              </button>
                              <button onClick={() => startEditRole(r)}
                                style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.color = color; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; (e.currentTarget as HTMLElement).style.color = '#6B7280'; }}>
                                <IconEdit size={13} />
                              </button>
                              <button onClick={() => setDeleteRoleTarget(r)} disabled={isDeleting}
                                style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid #FECACA', backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDeleting ? 0.5 : 1 }}>
                                <IconTrash size={13} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create new role */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: roles.length > 0 ? '1px solid #F3F4F6' : 'none', paddingTop: roles.length > 0 ? 20 : 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#374151', margin: 0 }}>Nuevo rol</p>

                <RoleNameInput
                  value={newRoleName}
                  onChange={v => { setNewRoleName(v); setRoleError(''); setCreateAdminConfirm(false); }}
                  disabled={roleAdding}
                />

                <button
                  type="button"
                  onClick={() => { setNewRoleIsAdmin(v => !v); setCreateAdminConfirm(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, textAlign: 'left', width: '100%', border: `1.5px solid ${newRoleIsAdmin ? ADMIN_COLOR : '#E5E7EB'}`, backgroundColor: newRoleIsAdmin ? `${ADMIN_COLOR}08` : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                >
                  <svg width={18} height={18} fill="none" viewBox="0 0 24 24" stroke={newRoleIsAdmin ? ADMIN_COLOR : '#9CA3AF'} strokeWidth={2.5} style={{ flexShrink: 0, transition: 'stroke 0.15s' }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: newRoleIsAdmin ? ADMIN_COLOR : '#374151', margin: 0, transition: 'color 0.15s' }}>Acceso de Administrador</p>
                    <p style={{ fontSize: 12, color: '#9CA3AF', margin: '1px 0 0' }}>Puede gestionar turnos, empleados y reportes</p>
                  </div>
                  <div style={{ width: 42, height: 24, borderRadius: 12, flexShrink: 0, backgroundColor: newRoleIsAdmin ? ADMIN_COLOR : '#E5E7EB', position: 'relative', transition: 'background-color 0.2s' }}>
                    <div style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', position: 'absolute', top: 3, left: newRoleIsAdmin ? 21 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </button>

                {createAdminConfirm ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, backgroundColor: `${ADMIN_COLOR}06`, borderRadius: 12, border: `1px solid ${ADMIN_COLOR}25` }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ADMIN_COLOR, margin: 0 }}>
                      Confirmar acceso de administrador para "{newRoleName}"
                    </p>
                    <AdminInfoBox />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <button onClick={doCreateRole} disabled={roleAdding || !newRoleName.trim()}
                        style={{ height: 44, borderRadius: 12, border: 'none', backgroundColor: ADMIN_COLOR, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', opacity: roleAdding || !newRoleName.trim() ? 0.5 : 1 }}>
                        {roleAdding ? '…' : 'Confirmar y crear rol'}
                      </button>
                      <button onClick={() => setCreateAdminConfirm(false)}
                        style={{ height: 44, borderRadius: 12, border: 'none', backgroundColor: '#F3F4F6', fontSize: 14, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>
                        Atrás
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleCreateRole}
                    disabled={roleAdding || !newRoleName.trim()}
                    style={{ height: 48, borderRadius: 12, border: 'none', backgroundColor: color, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: roleAdding || !newRoleName.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 14px ${color}40` }}
                  >
                    <IconPlus size={14} />
                    Crear Rol
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
