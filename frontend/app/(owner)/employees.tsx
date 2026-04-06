import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Clipboard,
  Animated,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Employee } from '@/types';

export default function EmployeesScreen() {
  const { business, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const color = primaryColor;

  const [employees, setEmployees] = useState<Employee[]>([]);
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

  const load = useCallback(async () => {
    if (!business?.businessId) return;
    setLoading(true);
    try {
      setEmployees(await api.getEmployees(business.businessId));
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
    Alert.alert('Reset PIN', `Generate a new PIN for ${emp.firstName}?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Reset', onPress: async () => {
        setResetting(true);
        try {
          const creds = await api.resetEmployeePin(emp.employeeId);
          const updated = { ...emp, tempPassword: creds.password };
          setDetailEmp(updated);
          setEmployees(prev => prev.map(e => e.employeeId===emp.employeeId ? updated : e));
          Alert.alert('PIN Reset', `New credentials ready. Share them with ${emp.firstName}.`);
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
    Alert.alert('Remove Employee', `Remove ${emp.firstName} ${emp.lastName}?`, [
      { text:'Cancel', style:'cancel' },
      { text:'Remove', style:'destructive', onPress: async () => {
        await api.deleteEmployee(emp.employeeId);
        setDetailEmp(null); load();
      }},
    ]);
  };

  if (!business) {
    return (
      <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}>
        <AnimatedBackground primaryColor={color} />
        <Text style={{ color:'#374151', fontSize:15, textAlign:'center' }}>Set up your business in Settings first.</Text>
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
              <Text style={s.emptyText}>No employees yet.{'\n'}Tap + to add one.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.card} onPress={() => setDetailEmp(item)}>
              <View style={[s.avatar, { backgroundColor: color }]}>
                <Text style={s.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.firstName} {item.lastName}</Text>
                <Text style={s.emailHint}>{item.email}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
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
              <Text style={s.sheetTitle}>Add Employee</Text>
              <View style={{ width: 32 }} />
            </View>
            <Text style={s.sheetNote}>
              Ko-nnect will auto-generate login credentials. Tap the employee to view or share them.
            </Text>
            <View style={{ flexDirection:'row', gap:10 }}>
              <TextInput style={[s.input, { flex:1 }]} placeholder="First name"
                placeholderTextColor="#C4C4CE" value={firstName} onChangeText={setFirstName} />
              <TextInput style={[s.input, { flex:1 }]} placeholder="Last name"
                placeholderTextColor="#C4C4CE" value={lastName} onChangeText={setLastName} />
            </View>
            <TouchableOpacity style={[s.primaryBtn, { backgroundColor: color }]} onPress={handleAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Create Employee</Text>}
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
                  <Text style={s.sheetTitle}>Employee Details</Text>
                  <TouchableOpacity onPress={() => handleDelete(detailEmp)} style={s.deleteBtn}>
                    <Ionicons name="trash-outline" size={17} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {editMode ? (
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection:'row', gap:10 }}>
                      <TextInput style={[s.input, { flex:1 }]} placeholder="First name"
                        placeholderTextColor="#C4C4CE" value={editFirst} onChangeText={setEditFirst} />
                      <TextInput style={[s.input, { flex:1 }]} placeholder="Last name"
                        placeholderTextColor="#C4C4CE" value={editLast} onChangeText={setEditLast} />
                    </View>
                    <View style={{ flexDirection:'row', gap:10 }}>
                      <TouchableOpacity style={[s.primaryBtn, { flex:1, backgroundColor:'#F3F4F6' }]} onPress={() => setEditMode(false)}>
                        <Text style={[s.primaryBtnText, { color:'#374151' }]}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.primaryBtn, { flex:1, backgroundColor: color }]} onPress={handleUpdateName} disabled={editSaving}>
                        {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnText}>Save</Text>}
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
                      <Text style={s.detailSub}>Employee</Text>
                    </View>
                    <TouchableOpacity onPress={() => { setEditFirst(detailEmp.firstName); setEditLast(detailEmp.lastName); setEditMode(true); }}>
                      <Ionicons name="pencil-outline" size={18} color={color} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={s.credSection}>
                  <Text style={s.credTitle}>Login Credentials</Text>
                  <Text style={s.credSub}>Share these with the employee so they can log in.</Text>
                  <CredRow label="Email"    value={detailEmp.email}              color={color} />
                  <CredRow label="Password" value={detailEmp.tempPassword ?? '—'} color={color} />
                </View>

                <TouchableOpacity style={[s.outlineBtn, { borderColor: color }]}
                  onPress={() => handleResetPin(detailEmp)} disabled={resetting}>
                  {resetting
                    ? <ActivityIndicator color={color} />
                    : <><Ionicons name="refresh-outline" size={16} color={color} /><Text style={[s.outlineBtnText, { color }]}>Reset PIN</Text></>
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
    Alert.alert('Copied!', `${label} copied to clipboard.`);
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
  emailHint:  { fontSize:12, color:'#6B7280', marginTop:2 },

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
