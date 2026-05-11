import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Clipboard,
  Switch, ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { BusinessRole, Employee, TimeLog } from '@/types';

const ADMIN_COLOR = '#7C3AED';

// ── Live helpers ──────────────────────────────────────────────────────────────
function completedBreakMs(log: TimeLog): number {
  const breaks = log.breaks || [];
  if (breaks.length > 0)
    return breaks.filter(b => b.start && b.end)
      .reduce((s, b) => s + (new Date(b.end!).getTime() - new Date(b.start).getTime()), 0);
  if (log.breakStart && log.breakEnd)
    return new Date(log.breakEnd).getTime() - new Date(log.breakStart).getTime();
  return 0;
}
function shiftElapsedSeconds(log: TimeLog) {
  if (!log.clockIn) return 0;
  const breaks = log.breaks || [];
  const lastBreak = breaks[breaks.length - 1];
  const doneBreakMs = completedBreakMs(log);
  const shiftEnd = log.status === 'on_break' && lastBreak?.start
    ? new Date(lastBreak.start).getTime() : Date.now();
  return Math.max(0, Math.floor((shiftEnd - new Date(log.clockIn).getTime() - doneBreakMs) / 1000));
}
function breakElapsedSeconds(log: TimeLog) {
  if (log.status !== 'on_break') return 0;
  const breaks = log.breaks || [];
  const lastBreak = breaks[breaks.length - 1];
  const breakStart = lastBreak?.start ?? log.breakStart;
  if (!breakStart) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(breakStart).getTime()) / 1000));
}
function fmt12(iso: string) {
  const d = new Date(iso); const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function LiveBadge({ status }: { status: string }) {
  type Cfg = { label: string; bg: string; fg: string; icon?: React.ReactNode };
  const cfg: Record<string, Cfg> = {
    clocked_in:   { label: 'Activo',          bg: '#D1FAE5', fg: '#065F46', icon: <View style={[ls.dot, { backgroundColor: '#065F46' }]} /> },
    on_break:     { label: 'En Descanso',     bg: '#FEF3C7', fg: '#92400E', icon: <Ionicons name="cafe-outline" size={12} color="#92400E" /> },
    clocked_out:  { label: 'Terminó',         bg: '#F3F4F6', fg: '#6B7280', icon: <Ionicons name="checkmark" size={12} color="#6B7280" /> },
    missed_punch: { label: 'Marcaje Perdido', bg: '#FEE2E2', fg: '#991B1B', icon: <Ionicons name="warning-outline" size={12} color="#991B1B" /> },
  };
  const c = cfg[status] ?? { label: status, bg: '#F9FAFB', fg: '#6B7280' };
  return (
    <View style={[ls.badge, { backgroundColor: c.bg }]}>
      {c.icon}
      <Text style={[ls.badgeText, { color: c.fg }]}>{c.label}</Text>
    </View>
  );
}
const ls = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  dot:   { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

// ── Admin info box (shown inside modals as inline warning) ───────────────────
function GerenteInfoBox() {
  return (
    <View style={gi.box}>
      <View style={gi.header}>
        <Ionicons name="shield-checkmark" size={15} color={ADMIN_COLOR} />
        <Text style={gi.title}>¿Qué puede hacer un Administrador?</Text>
      </View>
      <View style={gi.body}>
        <Text style={gi.sectionLabel}>Puede:</Text>
        {['Crear y editar turnos','Ver todos los empleados','Ver los reportes de tiempo'].map(t => (
          <View key={t} style={gi.row}><Ionicons name="checkmark-circle" size={13} color="#10B981" /><Text style={gi.rowText}>{t}</Text></View>
        ))}
        <Text style={[gi.sectionLabel, { marginTop: 8 }]}>No tiene acceso a:</Text>
        {['Ajustes del negocio','Información de pago o zona de ponche','Eliminar el negocio'].map(t => (
          <View key={t} style={gi.row}><Ionicons name="close-circle" size={13} color="#EF4444" /><Text style={gi.rowText}>{t}</Text></View>
        ))}
      </View>
    </View>
  );
}
const gi = StyleSheet.create({
  box:    { borderRadius: 12, borderWidth: 1, borderColor: ADMIN_COLOR + '30', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, backgroundColor: ADMIN_COLOR + '10' },
  title:  { fontSize: 12, fontWeight: '800', color: ADMIN_COLOR },
  body:   { padding: 12, gap: 5 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  row:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowText: { fontSize: 13, color: '#374151', flex: 1 },
});

export default function EmployeesScreen() {
  const { business, primaryColor, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const color = primaryColor;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeLogs, setActiveLogs] = useState<TimeLog[]>([]);
  const [roles, setRoles]         = useState<BusinessRole[]>([]);
  const [tick, setTick] = useState(0);
  const [loading, setLoading]     = useState(true);

  // Add employee modal
  const [addModal, setAddModal]   = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [saving, setSaving]       = useState(false);

  // Employee detail modal
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
  const [resetting, setResetting] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast]   = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [roleChanging, setRoleChanging] = useState(false);

  // Roles management modal
  const [rolesModal, setRolesModal] = useState(false);
  // New role form
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleAdmin, setNewRoleAdmin] = useState(false);
  const [addingRole, setAddingRole]   = useState(false);
  const [createConfirm, setCreateConfirm] = useState(false); // inline gerente warning for create
  // Edit role form
  const [editRoleId, setEditRoleId]   = useState<string | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleAdmin, setEditRoleAdmin] = useState(false);
  const [savingRole, setSavingRole]   = useState(false);
  const [editConfirm, setEditConfirm] = useState(false);   // inline gerente warning for edit
  const [editRoleSelected, setEditRoleSelected] = useState<Set<string>>(new Set()); // employees assigned in edit form
  const [showAssignList, setShowAssignList] = useState(false); // toggle employee list in edit form

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      const [emps, active, roleList] = await Promise.all([
        api.getEmployees(business.businessId),
        api.getActiveEmployees(business.businessId),
        api.getRoles(business.businessId),
      ]);
      setEmployees(emps);
      setActiveLogs(active);
      setRoles(roleList);
    } catch(err: any) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }, [business?.businessId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Employee CRUD ─────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!firstName.trim() || !lastName.trim()) { Alert.alert('Error','Por favor ingresa nombre y apellido.'); return; }
    setSaving(true);
    try {
      const result = await api.addEmployee({
        businessId: business!.businessId, businessName: business!.name,
        firstName: firstName.trim(), lastName: lastName.trim(),
      });
      setAddModal(false); setFirstName(''); setLastName('');
      setDetailEmp(result.employee);
      load();
    } catch(err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleResetPin = async (emp: Employee) => {
    Alert.alert('Resetear Contraseña', `¿Generar una nueva contraseña para ${emp.firstName}?`, [
      { text:'Cancelar', style:'cancel' },
      { text:'Resetear', onPress: async () => {
        setResetting(true);
        try {
          const creds = await api.resetEmployeePin(emp.employeeId);
          const updated = { ...emp, tempPassword: creds.password };
          setDetailEmp(updated);
          setEmployees(prev => prev.map(e => e.employeeId===emp.employeeId ? updated : e));
          Alert.alert('Contraseña Reseteada', `Nuevas credenciales listas. Compártelas con ${emp.firstName}.`);
        } catch(err: any) { Alert.alert('Error', err.message); }
        finally { setResetting(false); }
      }},
    ]);
  };

  const handleUpdateName = async () => {
    if (!editFirst.trim() || !editLast.trim() || !detailEmp) return;
    setEditSaving(true);
    try {
      await api.updateEmployee(detailEmp.employeeId, { firstName: editFirst.trim(), lastName: editLast.trim() });
      setDetailEmp({ ...detailEmp, firstName: editFirst.trim(), lastName: editLast.trim() });
      setEditMode(false); load();
    } catch(err: any) { Alert.alert('Error', err.message); }
    finally { setEditSaving(false); }
  };

  const handleDelete = (emp: Employee) => {
    Alert.alert('Eliminar Empleado', `¿Eliminar a ${emp.firstName} ${emp.lastName}?`, [
      { text:'Cancelar', style:'cancel' },
      { text:'Eliminar', style:'destructive', onPress: async () => {
        await api.deleteEmployee(emp.employeeId);
        setDetailEmp(null); load();
      }},
    ]);
  };

  // ── Role assignment — Alert-based warning (avoids nested modal issue) ──────
  const doAssignRole = async (emp: Employee, roleId: string | null) => {
    setRoleChanging(true);
    try {
      await api.assignEmployeeRole(emp.employeeId, roleId);
      const role = roles.find(r => r.roleId === roleId) ?? null;
      const updated = { ...emp, roleId, roleName: role?.name ?? null, roleIsAdmin: role?.isAdmin ?? false };
      setDetailEmp(updated);
      setEmployees(prev => prev.map(e => e.employeeId === emp.employeeId ? updated : e));
    } catch(e: any) { Alert.alert('Error', e.message); }
    finally { setRoleChanging(false); }
  };

  const handleAssignRole = (emp: Employee, roleId: string | null) => {
    if (!roleId) { doAssignRole(emp, null); return; }
    const role = roles.find(r => r.roleId === roleId);
    if (!role?.isAdmin) { doAssignRole(emp, roleId); return; }
    // Admin role — show Alert (works over an open modal unlike a second Modal)
    Alert.alert(
      `Dar acceso de administrador a ${emp.firstName}`,
      `El rol "${role.name}" es de administrador.\n\n${emp.firstName} podrá gestionar turnos, empleados y reportes, pero NO tendrá acceso a los Ajustes del negocio.\n\nSus turnos anteriores se conservan para nómina.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, asignar', onPress: () => doAssignRole(emp, roleId) },
      ]
    );
  };

  // ── Role CRUD (inline confirmation for gerente, no nested Modal) ───────────
  const startEditRole = (role: BusinessRole) => {
    setEditRoleId(role.roleId);
    setEditRoleName(role.name);
    setEditRoleAdmin(role.isAdmin);
    setEditConfirm(false);
    setShowAssignList(false);
    setEditRoleSelected(new Set(
      employees.filter(e => !e.deletedAt && e.roleId === role.roleId).map(e => e.employeeId)
    ));
  };

  const doCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const r = await api.createRole({ businessId: business!.businessId, name: newRoleName.trim(), isAdmin: newRoleAdmin });
      setRoles(prev => [...prev, r]);
      setNewRoleName(''); setNewRoleAdmin(false); setCreateConfirm(false);
      // Switch to edit mode for the new role so user can assign employees immediately
      setEditRoleId(r.roleId);
      setEditRoleName(r.name);
      setEditRoleAdmin(r.isAdmin);
      setEditConfirm(false);
      setEditRoleSelected(new Set());
    } catch(e: any) { Alert.alert('Error', e.message); }
    finally { setAddingRole(false); }
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    if (newRoleAdmin && !createConfirm) { setCreateConfirm(true); }
    else { doCreateRole(); }
  };

  const doSaveRole = async () => {
    if (!editRoleId || !editRoleName.trim()) return;
    setSavingRole(true);
    try {
      const updated = await api.updateRole(editRoleId, { name: editRoleName.trim(), isAdmin: editRoleAdmin });
      setRoles(prev => prev.map(r => r.roleId === editRoleId ? updated : r));
      // Save employee assignments
      const activeEmps = employees.filter(e => !e.deletedAt);
      await Promise.all(activeEmps.map(emp => {
        const had  = emp.roleId === editRoleId;
        const want = editRoleSelected.has(emp.employeeId);
        if (want && !had)  return api.assignEmployeeRole(emp.employeeId, editRoleId);
        if (!want && had)  return api.assignEmployeeRole(emp.employeeId, null);
        return Promise.resolve();
      }));
      setEmployees(prev => prev.map(e => {
        if (e.deletedAt) return e;
        if (editRoleSelected.has(e.employeeId))
          return { ...e, roleId: editRoleId, roleName: updated.name, roleIsAdmin: updated.isAdmin };
        if (e.roleId === editRoleId)
          return { ...e, roleId: null, roleName: null, roleIsAdmin: false };
        return e;
      }));
      setEditRoleId(null); setEditConfirm(false); setShowAssignList(false);
    } catch(e: any) { Alert.alert('Error', e.message); }
    finally { setSavingRole(false); }
  };

  const handleSaveRole = () => {
    if (!editRoleId || !editRoleName.trim()) return;
    const prev = roles.find(r => r.roleId === editRoleId);
    if (editRoleAdmin && !prev?.isAdmin && !editConfirm) { setEditConfirm(true); }
    else { doSaveRole(); }
  };

  const handleDeleteRole = (role: BusinessRole) => {
    Alert.alert('Eliminar rol', `¿Eliminar el rol "${role.name}"?\n\nLos empleados con este rol quedarán sin rol asignado.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await api.deleteRole(role.roleId);
          setRoles(prev => prev.filter(r => r.roleId !== role.roleId));
          if (editRoleId === role.roleId) setEditRoleId(null);
        } catch(e: any) { Alert.alert('Error', e.message); }
      }},
    ]);
  };

  // ── Sort + group employees ────────────────────────────────────────────────
  const sortedEmployees = [...employees].sort((a, b) => {
    if (a.roleIsAdmin && !b.roleIsAdmin) return -1;
    if (!a.roleIsAdmin && b.roleIsAdmin) return 1;
    if (a.roleName && !b.roleName) return -1;
    if (!a.roleName && b.roleName) return 1;
    if (a.roleName && b.roleName && a.roleName !== b.roleName)
      return a.roleName.localeCompare(b.roleName);
    return (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName);
  });

  type ListRow = Employee | { _header: string };
  const listData: ListRow[] = [];
  const admins   = sortedEmployees.filter(e => e.roleIsAdmin);
  const regulars = sortedEmployees.filter(e => !e.roleIsAdmin);
  if (admins.length > 0)   { listData.push({ _header: 'Administradores' }); listData.push(...admins); }
  if (regulars.length > 0) { listData.push({ _header: admins.length > 0 ? 'Empleados' : '' }); listData.push(...regulars); }

  if (!business) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <AnimatedBackground primaryColor={color} />
        <Text style={{ color:'#374151', fontSize:15, textAlign:'center' }}>Configura tu negocio en Ajustes primero.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={color} />

      {loading ? (
        <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
          <ActivityIndicator color={color} />
        </View>
      ) : (
        <FlatList
          data={listData as any[]}
          keyExtractor={(item, idx) => ('_header' in item ? `hdr-${idx}` : item.employeeId)}
          contentContainerStyle={{ padding:16, gap:10, paddingBottom:100, paddingTop: insets.top + 12 }}
          showsVerticalScrollIndicator={false}

          ListHeaderComponent={
            <View style={{ gap: 10, marginBottom: 4 }}>
              {/* ── Roles card ─────────────────────────────────────── */}
              <View style={[s.rolesCard, { borderColor: color + '25' }]}>
                <View style={s.rolesCardHeader}>
                  <View style={[s.rolesIconWrap, { backgroundColor: color + '15' }]}>
                    <Ionicons name="briefcase-outline" size={18} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rolesCardTitle}>Roles del Negocio</Text>
                    <Text style={s.rolesCardSub}>
                      {roles.length === 0 ? 'Sin roles definidos aún' : `${roles.length} rol${roles.length !== 1 ? 'es' : ''} definido${roles.length !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[s.gestBtn, { backgroundColor: color }]}
                    onPress={() => { setCreateConfirm(false); setEditRoleId(null); setEditConfirm(false); setRolesModal(true); }}
                  >
                    <Ionicons name="settings-outline" size={14} color="#fff" />
                    <Text style={s.gestBtnText}>Gestionar</Text>
                  </TouchableOpacity>
                </View>

                {/* Role chips */}
                {roles.length > 0 && (
                  <View style={s.rolesChipRow}>
                    {roles.map(role => (
                      <View key={role.roleId} style={[s.roleChip, { backgroundColor: role.isAdmin ? ADMIN_COLOR + '12' : '#F3F4F6', borderColor: role.isAdmin ? ADMIN_COLOR + '40' : '#E5E7EB' }]}>
                        {role.isAdmin && <Ionicons name="shield-checkmark" size={11} color={ADMIN_COLOR} />}
                        <Text style={[s.roleChipText, { color: role.isAdmin ? ADMIN_COLOR : '#374151' }]}>{role.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Employee count */}
              <Text style={s.count}>{employees.length} empleado{employees.length !== 1 ? 's' : ''}</Text>
            </View>
          }

          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={44} color="#D1D5DB" />
              <Text style={s.emptyText}>Sin empleados aún.{'\n'}Toca + para agregar uno.</Text>
            </View>
          }

          renderItem={({ item }) => {
            if ('_header' in item) {
              if (!item._header) return null;
              return (
                <View style={s.sectionHeader}>
                  {item._header === 'Administradores' && <Ionicons name="shield-checkmark" size={13} color={ADMIN_COLOR} />}
                  <Text style={[s.sectionHeaderText, { color: item._header === 'Administradores' ? ADMIN_COLOR : '#9CA3AF' }]}>
                    {item._header}
                  </Text>
                </View>
              );
            }

            const emp = item as Employee;
            const empId = emp.userId || emp.employeeId;
            const localMidnight = new Date(); localMidnight.setHours(0, 0, 0, 0);
            const empLogs = activeLogs
              .filter(l => l.employeeId === empId && new Date(l.clockIn) >= localMidnight)
              .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
            const log = empLogs[0] ?? null;
            const status = log?.status ?? 'not_in';
            void tick;
            const rawSecs = !log || status === 'clocked_out' ? 0
              : status === 'on_break' ? breakElapsedSeconds(log) : shiftElapsedSeconds(log);
            const secs = isNaN(rawSecs) || rawSecs < 0 ? 0 : rawSecs;
            const hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60), ss = secs % 60;
            const timeStr = hh > 0
              ? `${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
              : `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
            const isActive = status === 'clocked_in' || status === 'on_break';
            const isGerente = emp.roleIsAdmin;
            const avatarBg = status === 'clocked_in' ? '#10B981' : status === 'on_break' ? '#D97706' : isGerente ? ADMIN_COLOR : color;

            return (
              <View style={[
                s.card,
                isActive && { borderColor: status === 'on_break' ? '#D97706' : '#10B981', borderWidth: 1.5 },
                isGerente && !isActive && { borderColor: ADMIN_COLOR + '50', borderWidth: 1.5 },
              ]}>
                <View style={{ position: 'relative' }}>
                  <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                    <Text style={s.avatarText}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                  </View>
                  {isGerente && (
                    <View style={s.gerenteBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </View>

                <View style={{ flex: 1, gap: 3 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={s.name}>{emp.firstName} {emp.lastName}</Text>
                    {emp.roleName && (
                      <View style={[s.rolePill, { backgroundColor: isGerente ? ADMIN_COLOR + '15' : '#F3F4F6', borderColor: isGerente ? ADMIN_COLOR + '40' : '#E5E7EB' }]}>
                        <Text style={[s.rolePillText, { color: isGerente ? ADMIN_COLOR : '#6B7280' }]}>{emp.roleName}</Text>
                      </View>
                    )}
                  </View>
                  {log ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <LiveBadge status={status} />
                        {isActive && <Text style={s.liveTimer}>{timeStr}</Text>}
                      </View>
                      {(() => {
                        const breaks = log.breaks && log.breaks.length > 0
                          ? log.breaks : (log.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : []);
                        const firstBreak = breaks.find(b => b.start && b.end);
                        return (
                          <View style={s.todayBlock}>
                            <Text style={s.todayLabel}>Hoy</Text>
                            <View style={s.todayRow}>
                              {log.clockIn && <Text style={s.todayTime}>{fmt12(log.clockIn)}</Text>}
                              <Text style={s.todayArrow}>→</Text>
                              <Text style={s.todayTime}>{log.clockOut ? fmt12(log.clockOut) : '…'}</Text>
                            </View>
                            {firstBreak && (
                              <View style={s.todayBreakRow}>
                                <Ionicons name="cafe-outline" size={11} color="#9CA3AF" />
                                <Text style={s.todayBreak} numberOfLines={1}>
                                  {fmt12(firstBreak.start)}{firstBreak.end ? ` – ${fmt12(firstBreak.end)}` : ''}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })()}
                    </>
                  ) : (
                    <Text style={s.emailHint}>{emp.email}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(owner)/timeclock', params: { expandEmp: empId } })}
                  style={s.reportBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="bar-chart-outline" size={18} color={color} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDetailEmp(emp)} style={s.editEmpBtn}>
                  <Ionicons name="person-outline" size={14} color="#6B7280" />
                  <Text style={s.editEmpText}>Perfil</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={[s.fab, { backgroundColor: color }]} onPress={() => setAddModal(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* ── Add Employee Modal ── */}
      <Modal visible={addModal} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <TouchableOpacity style={s.closeBtn} onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Agregar Empleado</Text>
              <View style={{ width: 32 }} />
            </View>
            <Text style={s.sheetNote}>
              Ko-nnecta' va a generar las credenciales automáticamente.
            </Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TextInput style={[s.input, { flex:1 }]} placeholder="Nombre"
                placeholderTextColor="#C4C4CE" value={firstName} onChangeText={setFirstName} />
              <TextInput style={[s.input, { flex:1 }]} placeholder="Apellido"
                placeholderTextColor="#C4C4CE" value={lastName} onChangeText={setLastName} />
            </View>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: color }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Crear Empleado</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Employee Detail Modal ── */}
      <Modal visible={!!detailEmp} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.sheet}>
            {detailEmp && (
              <>
                <View style={s.sheetHeader}>
                  <TouchableOpacity style={s.closeBtn} onPress={() => { setDetailEmp(null); setEditMode(false); }}>
                    <Ionicons name="close" size={20} color="#374151" />
                  </TouchableOpacity>
                  <Text style={s.sheetTitle}>Detalles del Empleado</Text>
                  <TouchableOpacity onPress={() => handleDelete(detailEmp)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {editMode ? (
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection:'row', gap:10 }}>
                      <TextInput style={[s.input, { flex:1 }]} placeholder="Nombre"
                        placeholderTextColor="#C4C4CE" value={editFirst} onChangeText={setEditFirst} />
                      <TextInput style={[s.input, { flex:1 }]} placeholder="Apellido"
                        placeholderTextColor="#C4C4CE" value={editLast} onChangeText={setEditLast} />
                    </View>
                    <View style={{ flexDirection:'row', gap:10 }}>
                      <TouchableOpacity style={[s.primaryBtn, { flex:1, backgroundColor:'#F3F4F6' }]} onPress={() => setEditMode(false)}>
                        <Text style={[s.primaryBtnText, { color:'#374151' }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.primaryBtn, { flex:1, backgroundColor: color }]} onPress={handleUpdateName} disabled={editSaving}>
                        {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Guardar</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={s.profileRow}>
                    <View style={{ position: 'relative' }}>
                      <View style={[s.detailAvatar, { backgroundColor: detailEmp.roleIsAdmin ? ADMIN_COLOR : color }]}>
                        <Text style={s.detailAvatarText}>{detailEmp.firstName[0]}{detailEmp.lastName[0]}</Text>
                      </View>
                      {detailEmp.roleIsAdmin && (
                        <View style={s.gerenteBadgeLg}>
                          <Ionicons name="shield-checkmark" size={13} color="#fff" />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailName}>{detailEmp.firstName} {detailEmp.lastName}</Text>
                      <Text style={[s.detailSub, detailEmp.roleIsAdmin && { color: ADMIN_COLOR, fontWeight: '700' }]}>
                        {detailEmp.roleName ?? 'Empleado'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => { setEditFirst(detailEmp.firstName); setEditLast(detailEmp.lastName); setEditMode(true); }}>
                      <Ionicons name="pencil-outline" size={18} color={color} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Role selector */}
                {roles.length > 0 && (
                  <View style={s.roleSection}>
                    <Text style={s.credTitle}>Rol</Text>
                    <View style={s.rolePillRow}>
                      <TouchableOpacity
                        onPress={() => !roleChanging && handleAssignRole(detailEmp, null)}
                        style={[s.rolePillBtn, !detailEmp.roleId && { borderColor: color, backgroundColor: color + '12' }]}
                        disabled={roleChanging}
                      >
                        <Text style={[s.rolePillBtnText, !detailEmp.roleId && { color }]}>Sin rol</Text>
                      </TouchableOpacity>
                      {roles.map(role => (
                        <TouchableOpacity
                          key={role.roleId}
                          onPress={() => !roleChanging && handleAssignRole(detailEmp, role.roleId)}
                          style={[
                            s.rolePillBtn,
                            detailEmp.roleId === role.roleId && {
                              borderColor: role.isAdmin ? ADMIN_COLOR : color,
                              backgroundColor: (role.isAdmin ? ADMIN_COLOR : color) + '12',
                            },
                          ]}
                          disabled={roleChanging}
                        >
                          {role.isAdmin && (
                            <Ionicons name="shield-checkmark" size={12} color={detailEmp.roleId === role.roleId ? ADMIN_COLOR : '#9CA3AF'} />
                          )}
                          <Text style={[
                            s.rolePillBtnText,
                            detailEmp.roleId === role.roleId && { color: role.isAdmin ? ADMIN_COLOR : color, fontWeight: '700' },
                          ]}>
                            {role.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {roleChanging && <ActivityIndicator size="small" color={color} />}
                    </View>
                  </View>
                )}

                <View style={s.credSection}>
                  <Text style={s.credTitle}>Credenciales de Acceso</Text>
                  <CredRow label="Email" value={detailEmp.email} color={color} />

                  {detailEmp.tempPassword ? (
                    <>
                      <Text style={s.credSub}>Contraseña temporal — compártela con el empleado. Deberá cambiarla al entrar por primera vez.</Text>
                      <CredRow label="Contraseña temporal" value={detailEmp.tempPassword} color={color} />
                      <TouchableOpacity style={[s.outlineBtn, { borderColor: color }]}
                        onPress={() => handleResetPin(detailEmp)} disabled={resetting}>
                        {resetting
                          ? <ActivityIndicator color={color} />
                          : <><Ionicons name="refresh-outline" size={16} color={color} /><Text style={[s.outlineBtnText, { color }]}>Generar nueva contraseña</Text></>
                        }
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={s.pwOwnRow}>
                        <Ionicons name="lock-closed-outline" size={15} color="#6B7280" />
                        <View style={{ flex: 1 }}>
                          <Text style={s.pwOwnText}>El empleado estableció su propia contraseña</Text>
                          <Text style={s.pwOwnSub}>Si la olvidó, puedes generar una nueva temporal abajo.</Text>
                        </View>
                      </View>
                      <TouchableOpacity style={[s.outlineBtn, { borderColor: color }]}
                        onPress={() => handleResetPin(detailEmp)} disabled={resetting}>
                        {resetting
                          ? <ActivityIndicator color={color} />
                          : <><Ionicons name="refresh-outline" size={16} color={color} /><Text style={[s.outlineBtnText, { color }]}>Restablecer contraseña</Text></>
                        }
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Roles Management Modal ── */}
      <Modal visible={rolesModal} animationType="slide" transparent>
        <View style={s.overlay}>
          {/* Header is OUTSIDE the ScrollView so the X is always tappable */}
          <View style={rm.sheetOuter}>
            <View style={[s.sheetHeader, { paddingHorizontal: 22, paddingTop: 22 }]}>
              <TouchableOpacity
                style={s.closeBtn}
                onPress={() => { setRolesModal(false); setEditRoleId(null); setCreateConfirm(false); setEditConfirm(false); }}
              >
                <Ionicons name="close" size={20} color="#374151" />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>Gestionar Roles</Text>
              <View style={{ width: 32 }} />
            </View>

            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 44, paddingTop: 16, gap: 16 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.sheetNote}>
                Los roles agrupan a tus empleados. Un rol con "Acceso de Administrador" permite gestionar turnos, empleados y reportes desde la app.
              </Text>

              {/* ── Edit form (shown when a role is selected for editing) ── */}
              {editRoleId && (() => {
                const role = roles.find(r => r.roleId === editRoleId)!;
                const myEmp = employees.find(e => e.userId === user?.userId && !e.deletedAt);
                // True when the logged-in admin employee IS assigned to this role AND it's currently admin
                const isSelfAdminRole = !!myEmp && myEmp.roleId === editRoleId && editRoleAdmin;
                return (
                  <View style={rm.editWrap}>
                    {/* Title row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={rm.editTitle}>Editando rol</Text>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity onPress={() => { setEditRoleId(null); setEditConfirm(false); setShowAssignList(false); }} style={rm.cancelBtn}>
                        <Ionicons name="close" size={16} color="#374151" />
                      </TouchableOpacity>
                    </View>

                    {/* Name input */}
                    <TextInput
                      style={s.input}
                      value={editRoleName}
                      onChangeText={v => { setEditRoleName(v); setEditConfirm(false); }}
                      autoFocus={!showAssignList}
                    />

                    {/* Admin toggle */}
                    <TouchableOpacity
                      onPress={() => {
                        if (isSelfAdminRole) {
                          Alert.alert('No permitido', 'No puedes quitarte tu propio acceso de administrador.');
                          return;
                        }
                        setEditRoleAdmin(v => !v); setEditConfirm(false);
                      }}
                      style={[rm.gerenteToggle, editRoleAdmin && { borderColor: ADMIN_COLOR, backgroundColor: ADMIN_COLOR + '08' }]}
                    >
                      <Ionicons name="shield-checkmark" size={16} color={editRoleAdmin ? ADMIN_COLOR : '#9CA3AF'} />
                      <View style={{ flex: 1 }}>
                        <Text style={[rm.gerenteLabel, editRoleAdmin && { color: ADMIN_COLOR }]}>Acceso de Administrador</Text>
                        <Text style={rm.gerenteSub}>
                          {isSelfAdminRole ? 'No puedes modificar tu propio rol de admin' : 'Puede gestionar turnos, empleados y reportes'}
                        </Text>
                      </View>
                      <Switch
                        value={editRoleAdmin}
                        onValueChange={v => {
                          if (isSelfAdminRole) return;
                          setEditRoleAdmin(v); setEditConfirm(false);
                        }}
                        disabled={isSelfAdminRole}
                        trackColor={{ false: '#E5E7EB', true: ADMIN_COLOR }}
                        thumbColor="#fff"
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                    </TouchableOpacity>

                    {editConfirm && (
                      <View style={rm.confirmWrap}>
                        <Text style={rm.confirmTitle}>Confirmar acceso de administrador para "{editRoleName}"</Text>
                        <GerenteInfoBox />
                      </View>
                    )}

                    {/* Employee assignment */}
                    {!editConfirm && (
                      showAssignList ? (
                        <View style={{ gap: 8 }}>
                          <Text style={rm.assignLabel}>Selecciona los empleados</Text>
                          {employees.filter(e => !e.deletedAt).sort((a, b) =>
                            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'es')
                          ).map(emp => {
                            const isSel    = editRoleSelected.has(emp.employeeId);
                            const hasOther = emp.roleId && emp.roleId !== editRoleId;
                            const otherRole = hasOther ? roles.find(r => r.roleId === emp.roleId) : null;
                            const isSelf   = emp.userId === user?.userId && isSelfAdminRole;
                            const toggle   = () => {
                              if (isSelf) {
                                Alert.alert('No permitido', 'No puedes quitarte de tu propio rol de administrador.');
                                return;
                              }
                              setEditRoleSelected(prev => {
                                const next = new Set(prev);
                                next.has(emp.employeeId) ? next.delete(emp.employeeId) : next.add(emp.employeeId);
                                return next;
                              });
                            };
                            return (
                              <TouchableOpacity key={emp.employeeId} onPress={toggle}
                                style={[rm.assignRow, isSel && { borderColor: color, backgroundColor: color + '0E' }, isSelf && { opacity: 0.6 }]}>
                                <View style={[s.avatar, { width: 36, height: 36, borderRadius: 18, backgroundColor: isSel ? color : '#E5E7EB' }]}>
                                  <Text style={[s.avatarText, { fontSize: 13 }]}>{emp.firstName[0]}{emp.lastName[0]}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: '600', color: isSel ? color : '#374151' }}>
                                    {emp.firstName} {emp.lastName}{isSelf ? ' (tú)' : ''}
                                  </Text>
                                  {isSelf
                                    ? <Text style={rm.assignWarn}>No puedes removerte de tu propio rol</Text>
                                    : otherRole
                                    ? <Text style={rm.assignWarn}>Tiene: {otherRole.name} → se reemplazará</Text>
                                    : <Text style={rm.assignSub}>{emp.roleName ?? emp.email}</Text>
                                  }
                                </View>
                                <View style={[rm.checkbox, isSel && { backgroundColor: color, borderColor: color }]}>
                                  {isSel && <Ionicons name="checkmark" size={11} color="#fff" />}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                          <TouchableOpacity
                            style={[s.primaryBtn, { backgroundColor: color }]}
                            onPress={() => setShowAssignList(false)}
                          >
                            <Text style={s.primaryBtnText}>
                              Listo{editRoleSelected.size > 0 ? ` · ${editRoleSelected.size} seleccionado${editRoleSelected.size !== 1 ? 's' : ''}` : ''}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => setShowAssignList(true)}
                          style={[rm.assignBtn, { borderColor: color + '40', backgroundColor: color + '08' }]}
                        >
                          <Ionicons name="people-outline" size={16} color={color} />
                          <Text style={[rm.assignBtnText, { color }]}>
                            Asignar empleados{editRoleSelected.size > 0 ? ` · ${editRoleSelected.size} seleccionado${editRoleSelected.size !== 1 ? 's' : ''}` : ''}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={color} />
                        </TouchableOpacity>
                      )
                    )}

                    {/* Delete */}
                    {!editConfirm && !showAssignList && (
                      <TouchableOpacity
                        onPress={() => handleDeleteRole(role)}
                        style={[s.primaryBtn, { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }]}
                      >
                        <Text style={[s.primaryBtnText, { color: '#EF4444' }]}>Eliminar rol</Text>
                      </TouchableOpacity>
                    )}

                    {/* Save / Cancel */}
                    {!showAssignList && (
                      editConfirm ? (
                        <View style={{ gap: 8 }}>
                          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: ADMIN_COLOR }]} onPress={handleSaveRole} disabled={savingRole}>
                            {savingRole ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Confirmar y guardar</Text>}
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setEditConfirm(false)}>
                            <Text style={[s.primaryBtnText, { color: '#374151' }]}>Atrás</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => { setEditRoleId(null); setEditConfirm(false); setShowAssignList(false); }}>
                            <Text style={[s.primaryBtnText, { color: '#374151' }]}>Cancelar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.primaryBtn, { flex: 1, backgroundColor: color }]} onPress={handleSaveRole} disabled={savingRole}>
                            {savingRole ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Guardar</Text>}
                          </TouchableOpacity>
                        </View>
                      )
                    )}
                  </View>
                );
              })()}

              {/* ── Roles pills grid (shown when not editing) ── */}
              {!editRoleId && (
                roles.length === 0 ? (
                  <Text style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 4 }}>
                    Sin roles aún. Crea el primero abajo.
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={rm.pillsHint}>Toca un rol para editar</Text>
                    <View style={rm.pillsWrap}>
                      {roles.map(role => {
                        const count = employees.filter(e => !e.deletedAt && e.roleId === role.roleId).length;
                        return (
                          <TouchableOpacity
                            key={role.roleId}
                            onPress={() => startEditRole(role)}
                            style={[rm.pill, {
                              backgroundColor: role.isAdmin ? ADMIN_COLOR + '12' : '#F9FAFB',
                              borderColor: role.isAdmin ? ADMIN_COLOR + '40' : '#E5E7EB',
                            }]}
                          >
                            {role.isAdmin && <Ionicons name="shield-checkmark" size={12} color={ADMIN_COLOR} />}
                            <Text style={[rm.pillText, { color: role.isAdmin ? ADMIN_COLOR : '#374151' }]}>{role.name}</Text>
                            {count > 0 && (
                              <Text style={[rm.pillCount, { color: role.isAdmin ? ADMIN_COLOR + '90' : '#9CA3AF' }]}>({count})</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )
              )}

              {/* ── New role form (shown when not editing) ── */}
              {!editRoleId && <View style={rm.newSection}>
                <Text style={rm.newSectionTitle}>Nuevo rol</Text>
                <TextInput
                  style={s.input}
                  placeholder="Nombre del rol (ej. Mesero, Cajero…)"
                  placeholderTextColor="#C4C4CE"
                  value={newRoleName}
                  onChangeText={v => { setNewRoleName(v); setCreateConfirm(false); }}
                />

                <TouchableOpacity
                  onPress={() => { setNewRoleAdmin(v => !v); setCreateConfirm(false); }}
                  style={[rm.gerenteToggle, newRoleAdmin && { borderColor: ADMIN_COLOR, backgroundColor: ADMIN_COLOR + '08' }]}
                >
                  <Ionicons name="shield-checkmark" size={16} color={newRoleAdmin ? ADMIN_COLOR : '#9CA3AF'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[rm.gerenteLabel, newRoleAdmin && { color: ADMIN_COLOR }]}>Acceso de Administrador</Text>
                    <Text style={rm.gerenteSub}>Puede gestionar turnos, empleados y reportes</Text>
                  </View>
                  <Switch
                    value={newRoleAdmin}
                    onValueChange={v => { setNewRoleAdmin(v); setCreateConfirm(false); }}
                    trackColor={{ false: '#E5E7EB', true: ADMIN_COLOR }}
                    thumbColor="#fff"
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </TouchableOpacity>

                {createConfirm && (
                  <View style={rm.confirmWrap}>
                    <Text style={rm.confirmTitle}>Confirmar acceso de administrador para "{newRoleName}"</Text>
                    <GerenteInfoBox />
                  </View>
                )}

                {/* Stacked buttons when in confirm mode */}
                {createConfirm ? (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      style={[s.primaryBtn, { backgroundColor: ADMIN_COLOR, opacity: !newRoleName.trim() ? 0.4 : 1 }]}
                      onPress={handleCreateRole}
                      disabled={addingRole || !newRoleName.trim()}
                    >
                      {addingRole ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Confirmar y crear rol</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.primaryBtn, { backgroundColor: '#F3F4F6' }]} onPress={() => setCreateConfirm(false)}>
                      <Text style={[s.primaryBtnText, { color: '#374151' }]}>Atrás</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.primaryBtn, { backgroundColor: color, opacity: !newRoleName.trim() ? 0.4 : 1 }]}
                    onPress={handleCreateRole}
                    disabled={addingRole || !newRoleName.trim()}
                  >
                    {addingRole ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Crear Rol</Text>}
                  </TouchableOpacity>
                )}
              </View>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CredRow({ label, value, color }: { label: string; value: string; color: string }) {
  const copy = () => {
    Clipboard.setString(value);
    Alert.alert('¡Copiado!', `${label} copiado al portapapeles.`);
  };
  return (
    <View style={cr.field}>
      <Text style={cr.label}>{label}</Text>
      <View style={cr.row}>
        <Text style={cr.value} selectable numberOfLines={1} ellipsizeMode="tail">{value}</Text>
        <TouchableOpacity onPress={copy} style={cr.copyBtn}>
          <Ionicons name="copy-outline" size={17} color={color} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  count:      { fontSize:13, fontWeight:'600', color:'#6B7280' },
  emptyState: { alignItems:'center', justifyContent:'center', paddingTop:60, gap:10 },
  emptyText:  { color:'#6B7280', fontSize:15, textAlign:'center', lineHeight:22 },

  // Roles card (header)
  rolesCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    borderWidth: 1.5, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 16, shadowOffset: { width:0, height:4 }, elevation: 3,
  },
  rolesCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rolesIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rolesCardTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  rolesCardSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  gestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  gestBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  rolesChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  roleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1,
  },
  roleChipText: { fontSize: 12, fontWeight: '700' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 2, paddingTop: 4,
  },
  sectionHeaderText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width:0, height:4 }, elevation: 2,
  },
  avatar:     { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  avatarText: { color:'#fff', fontWeight:'700', fontSize:15 },
  gerenteBadge: {
    position: 'absolute', bottom: -2, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: ADMIN_COLOR, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },
  gerenteBadgeLg: {
    position: 'absolute', bottom: -2, right: -2,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: ADMIN_COLOR, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name:       { fontSize:15, fontWeight:'600', color:'#111827' },
  emailHint:  { fontSize:12, color:'#6B7280' },
  liveTimer:  { fontSize:12, fontWeight:'700', color:'#374151' },
  reportBtn:  { padding: 4 },
  todayBlock: { gap: 2, marginTop: 2 },
  todayLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  todayRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  todayTime:  { fontSize: 12, fontWeight: '600', color: '#374151' },
  todayArrow: { fontSize: 11, color: '#D1D5DB' },
  todayBreakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  todayBreak: { fontSize: 11, color: '#9CA3AF' },
  editEmpBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F3F4F6', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  editEmpText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },

  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1,
  },
  rolePillText: { fontSize: 11, fontWeight: '700' },

  fab: {
    position:'absolute', bottom:28, right:24,
    width:56, height:56, borderRadius:28,
    alignItems:'center', justifyContent:'center',
    shadowColor:'#000', shadowOpacity:0.2, shadowRadius:12,
    shadowOffset:{ width:0, height:5 }, elevation:8,
  },

  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'flex-end' },
  sheet: {
    backgroundColor:'#FFFFFF',
    borderTopLeftRadius:28, borderTopRightRadius:28,
    padding:22, paddingBottom:44, gap:16,
    shadowColor:'#000', shadowOpacity:0.1, shadowRadius:20, shadowOffset:{ width:0, height:-6 },
  },
  sheetHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  closeBtn: {
    width:32, height:32, borderRadius:10,
    backgroundColor:'#F9FAFB', borderWidth:1, borderColor:'#F3F4F6',
    alignItems:'center', justifyContent:'center',
  },
  deleteBtn: {
    width:32, height:32, borderRadius:10,
    backgroundColor:'#FEF2F2', borderWidth:1, borderColor:'#FECACA',
    alignItems:'center', justifyContent:'center',
  },
  sheetTitle: { fontSize:17, fontWeight:'700', color:'#111827' },
  sheetNote:  { fontSize:13, color:'#9CA3AF', lineHeight:18 },

  input: {
    backgroundColor:'#F9FAFB', borderWidth:1.5, borderColor:'#F3F4F6',
    borderRadius:12, paddingHorizontal:14, paddingVertical:12,
    fontSize:15, color:'#111827',
  },
  primaryBtn: { borderRadius:14, paddingVertical:14, alignItems:'center' },
  primaryBtnText: { color:'#fff', fontSize:16, fontWeight:'700' },
  outlineBtn: {
    flexDirection:'row', alignItems:'center', justifyContent:'center',
    gap:6, borderWidth:1.5, borderRadius:14, paddingVertical:12,
  },
  outlineBtnText: { fontWeight:'600', fontSize:15 },

  profileRow: { flexDirection:'row', alignItems:'center', gap:14 },
  detailAvatar: { width:56, height:56, borderRadius:28, alignItems:'center', justifyContent:'center' },
  detailAvatarText: { color:'#fff', fontWeight:'800', fontSize:20 },
  detailName: { fontSize:18, fontWeight:'700', color:'#111827' },
  detailSub:  { fontSize:13, color:'#9CA3AF', marginTop:2 },

  roleSection: { gap: 8 },
  rolePillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  rolePillBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  rolePillBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },

  credSection: { gap:8 },
  credTitle: { fontSize:15, fontWeight:'700', color:'#111827' },
  credSub:   { fontSize:13, color:'#9CA3AF', lineHeight: 18 },
  pwOwnRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#E5E7EB' },
  pwOwnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pwOwnSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});

const cr = StyleSheet.create({
  field: { backgroundColor:'#F9FAFB', borderRadius:12, padding:14, gap:4, borderWidth:1, borderColor:'#F3F4F6' },
  label: { fontSize:11, fontWeight:'700', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.5 },
  row:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:8 },
  value: { fontSize:15, fontWeight:'600', color:'#111827', flex:1 },
  copyBtn: { padding:4 },
});

const rm = StyleSheet.create({
  sheetOuter: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '88%',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: -6 },
  },
  // Pills grid
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5,
  },
  pillsHint: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  pillText: { fontSize: 13, fontWeight: '700' },
  pillCount: { fontSize: 11, fontWeight: '600' },

  // Edit form
  editTitle: { fontSize: 14, fontWeight: '800', color: '#374151' },
  editWrap: { gap: 10, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 12 },

  // Assign button
  assignBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  assignBtnText: { flex: 1, fontSize: 14, fontWeight: '700' },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
    alignItems: 'center', justifyContent: 'center',
  },
  gerenteToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12,
  },
  gerenteLabel: { fontSize: 14, fontWeight: '700', color: '#374151' },
  gerenteSub:   { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  confirmWrap: {
    gap: 8, padding: 12, backgroundColor: ADMIN_COLOR + '06',
    borderRadius: 12, borderWidth: 1, borderColor: ADMIN_COLOR + '25',
  },
  confirmTitle: { fontSize: 13, fontWeight: '700', color: ADMIN_COLOR },
  newSection: {
    gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16,
  },
  newSectionTitle: { fontSize: 14, fontWeight: '800', color: '#374151' },

  // Assign employees (inline in edit form)
  assignLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  assignRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#F3F4F6',
    backgroundColor: '#FAFAFA',
  },
  assignSub:  { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  assignWarn: { fontSize: 12, color: '#D97706', fontWeight: '600', marginTop: 1 },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
});
