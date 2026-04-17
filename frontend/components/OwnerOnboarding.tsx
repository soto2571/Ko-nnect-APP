import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import { DEFAULT_PRIMARY_COLOR } from '@/constants';

const PRESET_COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

type Step = 'business' | 'employees' | 'done';

interface AddedEmployee {
  name: string;
  email: string;
  password: string;
}

interface Props {
  onComplete: () => void;
}

export default function OwnerOnboarding({ onComplete }: Props) {
  const { user, setBusiness, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('business');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Business fields
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_PRIMARY_COLOR);
  const [payPeriodType, setPayPeriodType] = useState<'weekly'|'biweekly'|'semi-monthly'>('weekly');
  const [payPeriodStartDay, setPayPeriodStartDay] = useState(0);
  const [saving, setSaving] = useState(false);

  // Employee fields
  const [empFirst, setEmpFirst] = useState('');
  const [empLast, setEmpLast] = useState('');
  const [addingEmp, setAddingEmp] = useState(false);
  const [addedEmployees, setAddedEmployees] = useState<AddedEmployee[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [businessName, setBusinessName] = useState('');

  const animateTransition = (next: Step) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const handleCreateBusiness = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Escribe el nombre de tu negocio.'); return; }
    setSaving(true);
    try {
      const biz = await api.createBusiness({
        name: name.trim(), color, payPeriodType, payPeriodStartDay,
      });
      setBusinessId(biz.businessId);
      setBusinessName(biz.name);
      setBusiness(biz);
      animateTransition('employees');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleAddEmployee = async () => {
    if (!empFirst.trim() || !empLast.trim()) { Alert.alert('Error', 'Escribe nombre y apellido del empleado.'); return; }
    setAddingEmp(true);
    try {
      const { credentials } = await api.addEmployee({
        businessId, businessName,
        firstName: empFirst.trim(), lastName: empLast.trim(),
      });
      setAddedEmployees(prev => [...prev, {
        name: `${empFirst.trim()} ${empLast.trim()}`,
        email: credentials.email,
        password: credentials.password,
      }]);
      setEmpFirst(''); setEmpLast('');
    } catch (err: any) { Alert.alert('Error', err.message); }
    finally { setAddingEmp(false); }
  };

  const handleFinish = () => {
    animateTransition('done');
  };

  const stepNumber = step === 'business' ? 1 : step === 'employees' ? 2 : 3;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <AnimatedBackground primaryColor={color} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar: progress + logout */}
        <View style={s.topBar}>
          <View style={s.progressRow}>
            {[1, 2, 3].map(n => (
              <View key={n} style={[s.progressDot, n <= stepNumber && { backgroundColor: color }]} />
            ))}
          </View>
          <TouchableOpacity onPress={() => Alert.alert(
            'Cerrar Sesión',
            'Tu cuenta ya fue creada. Puedes volver a entrar cuando quieras para completar la configuración.',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Salir', style: 'destructive', onPress: logout },
            ]
          )} style={s.logoutBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="log-out-outline" size={15} color="#9CA3AF" />
            <Text style={s.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>

          {/* ─── STEP 1: Business ─── */}
          {step === 'business' && (
            <View style={s.stepContainer}>
              <View style={s.header}>
                <Text style={s.welcome}>Bienvenido{user?.firstName ? `, ${user.firstName}` : ''}</Text>
                <Text style={s.title}>Configura tu negocio</Text>
                <Text style={s.subtitle}>Empecemos con lo basico para que puedas organizar tu equipo.</Text>
              </View>

              <View style={s.card}>
                <Text style={s.cardLabel}>Nombre del Negocio</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ej: Panadería Don Luis"
                  placeholderTextColor="#C4C4CE"
                  value={name}
                  onChangeText={setName}
                  autoFocus
                />

                <Text style={[s.cardLabel, { marginTop: 16 }]}>Color de tu marca</Text>
                <View style={s.colorRow}>
                  {PRESET_COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[s.swatch, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: '#111827' }]}
                      onPress={() => setColor(c)}
                    />
                  ))}
                </View>

                <Text style={[s.cardLabel, { marginTop: 16 }]}>Período de Pago</Text>
                <View style={s.segRow}>
                  {(['weekly','biweekly','semi-monthly'] as const).map(t => (
                    <TouchableOpacity key={t}
                      style={[s.seg, payPeriodType === t && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setPayPeriodType(t)}>
                      <Text style={[s.segText, payPeriodType === t && { color: '#fff' }]}>
                        {t === 'semi-monthly' ? 'Quincenal' : t === 'weekly' ? 'Semanal' : 'Bisemanal'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {(payPeriodType === 'weekly' || payPeriodType === 'biweekly') && (
                  <>
                    <Text style={[s.cardLabel, { marginTop: 16 }]}>La semana empieza el</Text>
                    <View style={s.segRow}>
                      {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map((d, i) => (
                        <TouchableOpacity key={i}
                          style={[s.dayBtn, payPeriodStartDay === i && { backgroundColor: color, borderColor: color }]}
                          onPress={() => setPayPeriodStartDay(i)}>
                          <Text style={[s.dayBtnText, payPeriodStartDay === i && { color: '#fff' }]}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: color }]} onPress={handleCreateBusiness} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={s.primaryBtnText}>Continuar</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ─── STEP 2: Employees ─── */}
          {step === 'employees' && (
            <View style={s.stepContainer}>
              <View style={s.header}>
                <Text style={s.title}>Agrega tu equipo</Text>
                <Text style={s.subtitle}>Agrega a tus empleados para que puedan ver sus turnos. Puedes agregar mas despues.</Text>
              </View>

              {/* Add employee form */}
              <View style={s.card}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardLabel}>Nombre</Text>
                    <TextInput
                      style={s.input}
                      placeholder="Juan"
                      placeholderTextColor="#C4C4CE"
                      value={empFirst}
                      onChangeText={setEmpFirst}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardLabel}>Apellido</Text>
                    <TextInput
                      style={s.input}
                      placeholder="Pérez"
                      placeholderTextColor="#C4C4CE"
                      value={empLast}
                      onChangeText={setEmpLast}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.addEmpBtn, { borderColor: color }]}
                  onPress={handleAddEmployee}
                  disabled={addingEmp}
                >
                  {addingEmp
                    ? <ActivityIndicator color={color} size="small" />
                    : <><Ionicons name="person-add-outline" size={16} color={color} /><Text style={[s.addEmpBtnText, { color }]}>Agregar Empleado</Text></>
                  }
                </TouchableOpacity>
              </View>

              {/* Added employees list */}
              {addedEmployees.length > 0 && (
                <View style={s.card}>
                  <Text style={s.cardLabel}>Empleados agregados</Text>
                  {addedEmployees.map((emp, i) => (
                    <View key={i} style={s.empRow}>
                      <View style={[s.empAvatar, { backgroundColor: color + '20' }]}>
                        <Ionicons name="person" size={16} color={color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.empName}>{emp.name}</Text>
                        <Text style={s.empCredential}>{emp.email}</Text>
                        <Text style={s.empCredential}>Contraseña: {emp.password}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={s.hintRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
                    <Text style={s.hintText}>Comparte estas credenciales con tus empleados para que puedan iniciar sesión.</Text>
                  </View>
                </View>
              )}

              <View style={{ gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={[s.primaryBtn, { backgroundColor: color }]} onPress={handleFinish}>
                  <Text style={s.primaryBtnText}>
                    {addedEmployees.length > 0 ? 'Continuar' : 'Saltar por ahora'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ─── STEP 3: Done ─── */}
          {step === 'done' && (
            <View style={s.stepContainer}>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                <View style={[s.doneIcon, { backgroundColor: color + '15' }]}>
                  <Ionicons name="checkmark-circle" size={64} color={color} />
                </View>
                <Text style={s.doneTitle}>¡Todo listo!</Text>
                <Text style={s.doneSubtitle}>
                  Tu negocio esta configurado{addedEmployees.length > 0
                    ? ` y tienes ${addedEmployees.length} empleado${addedEmployees.length > 1 ? 's' : ''} agregado${addedEmployees.length > 1 ? 's' : ''}`
                    : ''}. Ya puedes empezar a crear turnos.
                </Text>
                <Text style={s.doneTip}>Puedes ajustar todo desde Ajustes en cualquier momento.</Text>
              </View>

              <TouchableOpacity style={[s.primaryBtn, { backgroundColor: color }]} onPress={onComplete}>
                <Text style={s.primaryBtnText}>Ir al Calendario</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28,
  },
  progressRow: {
    flexDirection: 'row', gap: 8,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  logoutText: {
    fontSize: 13, color: '#9CA3AF', fontWeight: '500',
  },
  progressDot: {
    width: 32, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },

  stepContainer: { flex: 1, gap: 20 },

  header: { gap: 6 },
  welcome: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18, gap: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  cardLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },

  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#F3F4F6',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  swatch: { width: 38, height: 38, borderRadius: 19 },

  segRow: { flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  segText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  dayBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  dayBtnText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  addEmpBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 12,
    borderWidth: 1.5, backgroundColor: '#fff',
  },
  addEmpBtnText: { fontSize: 14, fontWeight: '600' },

  empRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  empAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  empName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  empCredential: { fontSize: 12, color: '#6B7280' },

  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 },
  hintText: { flex: 1, fontSize: 12, color: '#9CA3AF', lineHeight: 16 },

  doneIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  doneTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  doneSubtitle: { fontSize: 15, color: '#374151', textAlign: 'center', lineHeight: 22, marginTop: 8 },
  doneTip: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },
});
