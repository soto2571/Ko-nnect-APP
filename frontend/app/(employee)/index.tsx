import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import * as api from '@/services/api';
import type { Shift } from '@/types';
import { COLORS } from '@/constants';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

function isUpcoming(iso: string) {
  return new Date(iso) >= new Date();
}

export default function MyShiftsScreen() {
  const { user, business, primaryColor } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getMyShifts();
      setShifts(data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const upcoming = shifts.filter((s) => isUpcoming(s.startTime));
  const past = shifts.filter((s) => !isUpcoming(s.startTime));

  const renderShift = (item: Shift, dimmed = false) => (
    <View key={item.shiftId} style={[styles.card, dimmed && styles.cardDimmed]}>
      <View style={[styles.colorBar, { backgroundColor: primaryColor }]} />
      <View style={{ flex: 1, paddingLeft: 14 }}>
        <Text style={[styles.shiftTitle, dimmed && { color: COLORS.textSecondary }]}>{item.title}</Text>
        <Text style={styles.shiftDate}>{formatDate(item.startTime)}</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.shiftTime}>
            {formatTime(item.startTime)} – {formatTime(item.endTime)}
          </Text>
        </View>
      </View>
      {!dimmed && (
        <View style={[styles.upcomingBadge, { backgroundColor: primaryColor + '20' }]}>
          <Text style={[styles.upcomingText, { color: primaryColor }]}>Upcoming</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} color={primaryColor} />;
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={primaryColor} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi, {user?.firstName || 'there'} 👋</Text>
          {business && <Text style={styles.businessName}>{business.name}</Text>}
        </View>
      }
      data={[]}
      renderItem={null}
      ListEmptyComponent={
        <View>
          {upcoming.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Upcoming shifts</Text>
              {upcoming.map((s) => renderShift(s, false))}
            </>
          )}

          {past.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Past shifts</Text>
              {past.map((s) => renderShift(s, true))}
            </>
          )}

          {shifts.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={52} color={COLORS.border} />
              <Text style={styles.emptyText}>No shifts assigned yet.</Text>
              <Text style={styles.emptySubtext}>Your manager will assign your shifts here.</Text>
            </View>
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { marginBottom: 20 },
  greeting: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  businessName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    paddingVertical: 14,
    paddingRight: 14,
  },
  cardDimmed: { opacity: 0.6 },
  colorBar: { width: 4, height: '100%', borderRadius: 2 },
  shiftTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  shiftDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  shiftTime: { fontSize: 13, color: COLORS.textSecondary },
  upcomingBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  upcomingText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  emptySubtext: { fontSize: 13, color: COLORS.textSecondary },
});
