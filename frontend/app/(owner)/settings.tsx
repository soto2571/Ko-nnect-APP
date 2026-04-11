import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import { DEFAULT_PRIMARY_COLOR } from '@/constants';

const PRESET_COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'];

export default function SettingsScreen() {
  const { user, business, logout, setBusiness, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();
  const [name, setName]       = useState(business?.name ?? '');
  const [color, setColor]     = useState(business?.color ?? DEFAULT_PRIMARY_COLOR);
  const [payPeriodType, setPayPeriodType]           = useState<'weekly'|'biweekly'|'semi-monthly'>(business?.payPeriodType ?? 'weekly');
  const [payPeriodStartDay, setPayPeriodStartDay]   = useState(business?.payPeriodStartDay ?? 0);
  const [payPeriodAnchorDate, setPayPeriodAnchorDate] = useState(business?.payPeriodAnchorDate ?? '');
  const [openDays, setOpenDays]                   = useState<number[]>(business?.openDays ?? [0,1,2,3,4,5,6]);
  const [maxHoursPerDay, setMaxHoursPerDay]       = useState(business?.maxHoursPerDay ?? 0);
  const [autoClockOut, setAutoClockOut]           = useState(business?.autoClockOut ?? false);
  const [autoClockOutMinutes, setAutoClockOutMinutes] = useState(business?.autoClockOutMinutes ?? 30);
  const [schedulingWeeks, setSchedulingWeeks]     = useState(business?.schedulingWeeks ?? 6);
  const [saving, setSaving]   = useState(false);
  const [isNew, setIsNew]     = useState(!business);
  const isGoogleUser = user?.provider === 'google';

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setColor(business.color);
      setPayPeriodType(business.payPeriodType ?? 'weekly');
      setPayPeriodStartDay(business.payPeriodStartDay ?? 0);
      setPayPeriodAnchorDate(business.payPeriodAnchorDate ?? '');
      setOpenDays(business.openDays ?? [0,1,2,3,4,5,6]);
      setMaxHoursPerDay(business.maxHoursPerDay ?? 0);
      setAutoClockOut(business.autoClockOut ?? false);
      setAutoClockOutMinutes(business.autoClockOutMinutes ?? 30);
      setSchedulingWeeks(business.schedulingWeeks ?? 6);
      setIsNew(false);
    }
  }, [business]);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Error','El nombre del negocio es requerido.'); return; }
    setSaving(true);
    try {
      let updated;
      const payload = {
        name: name.trim(), color, payPeriodType, payPeriodStartDay,
        payPeriodAnchorDate: payPeriodAnchorDate || undefined,
        openDays, maxHoursPerDay,
        autoClockOut, autoClockOutMinutes: autoClockOut ? autoClockOutMinutes : 30,
        schedulingWeeks,
      };
      if (isNew) {
        updated = await api.createBusiness(payload);
      } else {
        updated = await api.updateBusiness(business!.businessId, payload);
      }
      setBusiness(updated); setIsNew(false);
      Alert.alert('Guardado','Perfil del negocio actualizado.');
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) { Alert.alert('Error','Por favor llena todos los campos de contraseña.'); return; }
    if (newPw !== confirmPw) { Alert.alert('Error','Las contraseñas nuevas no coinciden.'); return; }
    if (newPw.length < 6) { Alert.alert('Error','La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    setChangingPw(true);
    try {
      await api.changePassword({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      Alert.alert('Éxito','Contraseña actualizada correctamente.');
    } catch(err:any) { Alert.alert('Error', err.message); }
    finally { setChangingPw(false); }
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <AnimatedBackground primaryColor={primaryColor} />

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 50, paddingTop: insets.top + 12 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Business Profile */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Perfil del Negocio</Text>

          <Text style={s.label}>Nombre del Negocio</Text>
          <TextInput
            style={s.input}
            placeholder="Nombre de tu negocio"
            placeholderTextColor="#C4C4CE"
            value={name}
            onChangeText={setName}
          />

          <Text style={s.label}>Color del Negocio</Text>
          <View style={s.colorRow}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[s.swatch, { backgroundColor: c }, color===c && s.swatchSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <View style={[s.preview, { backgroundColor: color }]}>
            <Text style={s.previewText}>Ko-nnecta' — {name || 'Tu Negocio'}</Text>
          </View>

          <Text style={s.label}>Período de Pago</Text>
          <View style={s.segRow}>
            {(['weekly','biweekly','semi-monthly'] as const).map(t => (
              <TouchableOpacity key={t}
                style={[s.seg, payPeriodType===t && { backgroundColor: color, borderColor: color }]}
                onPress={() => setPayPeriodType(t)}>
                <Text style={[s.segText, payPeriodType===t && { color:'#fff' }]}>
                  {t==='semi-monthly' ? 'Quincenal' : t==='weekly' ? 'Semanal' : 'Bisemanal'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {(payPeriodType==='weekly' || payPeriodType==='biweekly') && (
            <>
              <Text style={s.label}>La semana empieza el</Text>
              <View style={s.segRow}>
                {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map((d,i) => (
                  <TouchableOpacity key={i}
                    style={[s.dayBtn, payPeriodStartDay===i && { backgroundColor: color, borderColor: color }]}
                    onPress={() => setPayPeriodStartDay(i)}>
                    <Text style={[s.dayBtnText, payPeriodStartDay===i && { color:'#fff' }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {payPeriodType==='biweekly' && (() => {
            const today = new Date(); today.setHours(0,0,0,0);
            const diff  = (today.getDay() - payPeriodStartDay + 7) % 7;
            const last  = new Date(today); last.setDate(today.getDate() - diff);
            const prev  = new Date(last);  prev.setDate(last.getDate() - 14);
            const fmt      = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const fmtLabel = (d: Date) => d.toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
            return (
              <>
                <Text style={s.label}>¿Cuándo comenzó tu período actual?</Text>
                <View style={s.anchorRow}>
                  {[last, prev].map(d => {
                    const val = fmt(d);
                    return (
                      <TouchableOpacity key={val}
                        style={[s.anchorBtn, payPeriodAnchorDate===val && { backgroundColor: color, borderColor: color }]}
                        onPress={() => setPayPeriodAnchorDate(val)}>
                        <Text style={[s.anchorBtnText, payPeriodAnchorDate===val && { color:'#fff' }]}>{fmtLabel(d)}</Text>
                        {payPeriodAnchorDate===val && <Text style={[s.anchorBtnSub, { color:'rgba(255,255,255,0.9)' }]}>Período actual</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={s.hintRow}>
                  <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
                  <Text style={s.hintText}>Selecciona el día en que realmente comenzó tu período de pago más reciente.</Text>
                </View>
              </>
            );
          })()}

          {payPeriodType==='semi-monthly' && (
            <View style={s.hintRow}>
              <Ionicons name="information-circle-outline" size={14} color="#9CA3AF" />
              <Text style={s.hintText}>Períodos de pago: 1–15 y 16–fin de mes</Text>
            </View>
          )}

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: color }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff"/>
              : <Text style={s.saveBtnText}>{isNew ? 'Crear Negocio' : 'Guardar Cambios'}</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Scheduling Rules */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Reglas de Horario</Text>

          <Text style={s.label}>Días Laborables</Text>
          <View style={s.segRow}>
            {['Do','Lu','Ma','Mi','Ju','Vi','Sa'].map((d, i) => {
              const on = openDays.includes(i);
              return (
                <TouchableOpacity key={i}
                  style={[s.dayBtn, on && { backgroundColor: color, borderColor: color }]}
                  onPress={() => setOpenDays(on ? openDays.filter(x => x !== i) : [...openDays, i].sort())}>
                  <Text style={[s.dayBtnText, on && { color: '#fff' }]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.label}>Horas Máx. por Día <Text style={{ color:'#C4C4CE' }}>(0 = sin límite)</Text></Text>
          <View style={s.stepperRow}>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setMaxHoursPerDay(Math.max(0, maxHoursPerDay - 1))}>
              <Ionicons name="remove" size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={s.stepperVal}>{maxHoursPerDay === 0 ? 'Sin límite' : `${maxHoursPerDay}h`}</Text>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setMaxHoursPerDay(Math.min(24, maxHoursPerDay + 1))}>
              <Ionicons name="add" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <Text style={s.label}>Ventana de Horario <Text style={{ color:'#C4C4CE' }}>(semanas hacia adelante que puedes programar)</Text></Text>
          <View style={s.stepperRow}>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setSchedulingWeeks(Math.max(1, schedulingWeeks - 1))}>
              <Ionicons name="remove" size={18} color="#374151" />
            </TouchableOpacity>
            <Text style={s.stepperVal}>{schedulingWeeks} {schedulingWeeks === 1 ? 'semana' : 'semanas'}</Text>
            <TouchableOpacity style={s.stepperBtn} onPress={() => setSchedulingWeeks(Math.min(26, schedulingWeeks + 1))}>
              <Ionicons name="add" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Salida Automática</Text>
              <Text style={s.switchSub}>Marca salida automáticamente a los empleados después de un tiempo</Text>
            </View>
            <Switch
              value={autoClockOut}
              onValueChange={setAutoClockOut}
              trackColor={{ false: '#E5E7EB', true: color }}
              thumbColor="#fff"
            />
          </View>

          {autoClockOut && (
            <>
              <Text style={s.label}>Marcar Salida Después de (minutos tras fin del turno)</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity style={s.stepperBtn} onPress={() => setAutoClockOutMinutes(Math.max(5, autoClockOutMinutes - 5))}>
                  <Ionicons name="remove" size={18} color="#374151" />
                </TouchableOpacity>
                <Text style={s.stepperVal}>{autoClockOutMinutes} min</Text>
                <TouchableOpacity style={s.stepperBtn} onPress={() => setAutoClockOutMinutes(Math.min(240, autoClockOutMinutes + 5))}>
                  <Ionicons name="add" size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </>
          )}

          <TouchableOpacity style={[s.saveBtn, { backgroundColor: color }]} onPress={handleSave} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff"/>
              : <Text style={s.saveBtnText}>Guardar Cambios</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Account */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Cuenta</Text>
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={17} color="#9CA3AF" />
            <Text style={s.infoText}>{user?.email}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="shield-outline" size={17} color="#9CA3AF" />
            <Text style={s.infoText}>Rol: {user?.role}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={17} color="#EF4444" />
            <Text style={s.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Change Password — hidden for Google sign-in users */}
        {!isGoogleUser && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Cambiar Contraseña</Text>
            <TextInput style={s.input} placeholder="Contraseña actual" placeholderTextColor="#C4C4CE"
              value={currentPw} onChangeText={setCurrentPw} secureTextEntry />
            <TextInput style={s.input} placeholder="Nueva contraseña (mín. 6 caracteres)" placeholderTextColor="#C4C4CE"
              value={newPw} onChangeText={setNewPw} secureTextEntry />
            <TextInput style={s.input} placeholder="Confirmar nueva contraseña" placeholderTextColor="#C4C4CE"
              value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
            <TouchableOpacity style={[s.saveBtn, { backgroundColor: primaryColor }]} onPress={handleChangePassword} disabled={changingPw}>
              {changingPw
                ? <ActivityIndicator color="#fff"/>
                : <Text style={s.saveBtnText}>Actualizar Contraseña</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 24, padding: 20, gap: 12,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width:0, height:8 }, elevation: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 2 },

  label: { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5, borderColor: '#F3F4F6',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#111827',
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch:   { width: 34, height: 34, borderRadius: 17 },
  swatchSelected: { borderWidth: 3, borderColor: '#111827' },

  preview: { borderRadius: 14, padding: 14, alignItems: 'center' },
  previewText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  segRow: { flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  segText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  dayBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6',
  },
  dayBtnText: { fontSize: 11, fontWeight: '600', color: '#374151' },

  anchorRow: { flexDirection: 'row', gap: 10 },
  anchorBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#F3F4F6', gap: 2,
  },
  anchorBtnText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  anchorBtnSub:  { fontSize: 11, fontWeight: '600' },

  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hintText: { flex: 1, fontSize: 12, color: '#9CA3AF', lineHeight: 16 },

  saveBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: '#374151' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4,
    padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2',
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { color: '#EF4444', fontWeight: '600', fontSize: 15 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  stepperVal: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#111827' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  switchSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
});
