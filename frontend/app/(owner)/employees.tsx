import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Clipboard,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee, TimeLog } from '@/types';

// ── Live helpers (mirrored from timeclock) ────────────────────────────────────
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

export default function EmployeesScreen() {
  const { business, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const color = primaryColor;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeLogs, setActiveLogs] = useState<TimeLog[]>([]);
  const [tick, setTick] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [addModal, setAddModal]   = useState(false);
  const [detailEmp, setDetailEmp] = useState<Employee | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [resetting, setResetting] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Live timer tick
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      const [emps, active] = await Promise.all([
        api.getEmployees(business.businessId),
        api.getActiveEmployees(business.businessId),
      ]);
      setEmployees(emps);
      setActiveLogs(active);
    } catch(err: any) { Alert.alert('Error', err.message); }
    finally { setLoading(false); }
  }, [business?.businessId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!firstName.trim() || !lastName.trim()) { Alert.alert('Error','Please enter first and last name.'); return; }
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
          data={employees}
          keyExtractor={item => item.employeeId}
          contentContainerStyle={{ padding:16, gap:10, paddingBottom:100, paddingTop: insets.top + 12 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={s.count}>{employees.length} employee{employees.length!==1?'s':''}</Text>
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Ionicons name="people-outline" size={44} color="#D1D5DB" />
              <Text style={s.emptyText}>Sin empleados aún.{'\n'}Toca + para agregar uno.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const empId = item.userId || item.employeeId;
            const empLogs = activeLogs
              .filter(l => l.employeeId === empId)
              .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
            const log = empLogs[0] ?? null;
            const status = log?.status ?? 'not_in';
            void tick; // re-render for live timer
            const rawSecs = !log || status === 'clocked_out' ? 0
              : status === 'on_break' ? breakElapsedSeconds(log)
              : shiftElapsedSeconds(log);
            const secs = isNaN(rawSecs) || rawSecs < 0 ? 0 : rawSecs;
            const hh = Math.floor(secs / 3600), mm = Math.floor((secs % 3600) / 60), ss = secs % 60;
            const timeStr = hh > 0
              ? `${hh}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
              : `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
            const isActive = status === 'clocked_in' || status === 'on_break';
            const avatarBg = status === 'clocked_in' ? '#10B981' : status === 'on_break' ? '#D97706' : color;

            return (
              <View
                style={[s.card, isActive && { borderColor: status === 'on_break' ? '#D97706' : '#10B981', borderWidth: 1.5 }]}
              >
                <View style={[s.avatar, { backgroundColor: avatarBg }]}>
                  <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={s.name}>{item.firstName} {item.lastName}</Text>
                  {log ? (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <LiveBadge status={status} />
                        {isActive && <Text style={s.liveTimer}>{timeStr}</Text>}
                      </View>
                      {(() => {
                        const breaks = log.breaks && log.breaks.length > 0
                          ? log.breaks : (log.breakStart ? [{ start: log.breakStart, end: log.breakEnd }] : []);
                        const bMin = breaks.filter(b => b.start && b.end)
                          .reduce((s, b) => s + Math.round((new Date(b.end!).getTime() - new Date(b.start).getTime()) / 60000), 0);
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
                    <Text style={s.emailHint}>{item.email}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: '/(owner)/timeclock', params: { expandEmp: empId } })}
                  style={s.reportBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="bar-chart-outline" size={18} color={color} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDetailEmp(item)} style={s.editEmpBtn}>
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
              Ko-nnecta' va a generar las credenciales automáticamente. Toca el empleado para verlas o compartirlas.
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
                    <View style={[s.detailAvatar, { backgroundColor: color }]}>
                      <Text style={s.detailAvatarText}>{detailEmp.firstName[0]}{detailEmp.lastName[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailName}>{detailEmp.firstName} {detailEmp.lastName}</Text>
                      <Text style={s.detailSub}>Empleado</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setEditFirst(detailEmp.firstName); setEditLast(detailEmp.lastName); setEditMode(true); }}>
                      <Ionicons name="pencil-outline" size={18} color={color} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={s.credSection}>
                  <Text style={s.credTitle}>Credenciales de Acceso</Text>
                  <Text style={s.credSub}>Comparte estas credenciales con el empleado para que pueda entrar.</Text>
                  <CredRow label="Email"    value={detailEmp.email}              color={color} />
                  <CredRow label="Password" value={detailEmp.tempPassword ?? '—'} color={color} />
                </View>

                <TouchableOpacity style={[s.outlineBtn, { borderColor: color }]}
                  onPress={() => handleResetPin(detailEmp)} disabled={resetting}>
                  {resetting
                    ? <ActivityIndicator color={color} />
                    : <><Ionicons name="refresh-outline" size={16} color={color} /><Text style={[s.outlineBtnText, { color }]}>Resetear Contraseña</Text></>
                  }
                </TouchableOpacity>
              </>
            )}
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
  count:      { fontSize:13, fontWeight:'600', color:'#6B7280', marginBottom:4 },
  emptyState: { alignItems:'center', justifyContent:'center', paddingTop:60, gap:10 },
  emptyText:  { color:'#6B7280', fontSize:15, textAlign:'center', lineHeight:22 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width:0, height:4 }, elevation: 2,
  },
  avatar:     { width:44, height:44, borderRadius:22, alignItems:'center', justifyContent:'center' },
  avatarText: { color:'#fff', fontWeight:'700', fontSize:15 },
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

  credSection: { gap:8 },
  credTitle: { fontSize:15, fontWeight:'700', color:'#111827' },
  credSub:   { fontSize:13, color:'#9CA3AF' },
});

const cr = StyleSheet.create({
  field: { backgroundColor:'#F9FAFB', borderRadius:12, padding:14, gap:4, borderWidth:1, borderColor:'#F3F4F6' },
  label: { fontSize:11, fontWeight:'700', color:'#9CA3AF', textTransform:'uppercase', letterSpacing:0.5 },
  row:   { flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:8 },
  value: { fontSize:15, fontWeight:'600', color:'#111827', flex:1 },
  copyBtn: { padding:4 },
});
