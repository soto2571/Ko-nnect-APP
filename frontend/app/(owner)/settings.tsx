import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import { COLORS, DEFAULT_PRIMARY_COLOR } from '@/constants';

const PRESET_COLORS = ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function SettingsScreen() {
  const { user, business, logout, setBusiness, primaryColor } = useAuth();
  const [name, setName] = useState(business?.name ?? '');
  const [color, setColor] = useState(business?.color ?? DEFAULT_PRIMARY_COLOR);
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(!business);

  useEffect(() => {
    if (business) {
      setName(business.name);
      setColor(business.color);
      setIsNew(false);
    }
  }, [business]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Business name is required.');
      return;
    }
    setSaving(true);
    try {
      let updated;
      if (isNew) {
        updated = await api.createBusiness({ name: name.trim(), color });
      } else {
        updated = await api.updateBusiness(business!.businessId, { name: name.trim(), color });
      }
      setBusiness(updated);
      setIsNew(false);
      Alert.alert('Saved', 'Business profile updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, gap: 20 }}>
      {/* Business Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Profile</Text>

        <Text style={styles.label}>Business Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your business name"
          placeholderTextColor={COLORS.textSecondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Brand Color</Text>
        <View style={styles.colorRow}>
          {PRESET_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSelected]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: color }]}>
          <Text style={styles.previewText}>Ko-nnect — {name || 'Your Business'}</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: color }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{isNew ? 'Create Business' : 'Save Changes'}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{user?.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="shield-outline" size={18} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>Role: {user?.role}</Text>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSelected: { borderWidth: 3, borderColor: '#111827' },
  preview: { borderRadius: 12, padding: 14, alignItems: 'center' },
  previewText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 14, color: COLORS.text },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  logoutText: { color: COLORS.danger, fontWeight: '600', fontSize: 15 },
});
