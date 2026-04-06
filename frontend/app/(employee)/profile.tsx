import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';

export default function EmployeeProfileScreen() {
  const { user, business, logout, primaryColor } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />

      <AnimatedBackground primaryColor={primaryColor} />

      <View style={[s.container, { paddingTop: insets.top + 12 }]}>
        {/* Avatar card */}
        <View style={s.card}>
          <View style={[s.avatar, { backgroundColor: primaryColor }]}>
            <Text style={s.avatarText}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text>
          </View>
          <Text style={s.name}>{user?.firstName} {user?.lastName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          {business && (
            <View style={[s.bizPill, { backgroundColor: primaryColor + '15' }]}>
              <Text style={[s.bizText, { color: primaryColor }]}>{business.name}</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="shield-outline" size={17} color="#9CA3AF" />
            </View>
            <Text style={s.infoText}>Role: Employee</Text>
          </View>
          <View style={s.divider} />
          <View style={s.infoRow}>
            <View style={s.infoIcon}>
              <Ionicons name="information-circle-outline" size={17} color="#9CA3AF" />
            </View>
            <Text style={s.infoText}>Contact your owner to reset your PIN.</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={17} color="#EF4444" />
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, padding:20, gap:14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24, padding: 28, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width:0, height:8 }, elevation: 4,
  },
  avatar: { width:76, height:76, borderRadius:38, alignItems:'center', justifyContent:'center', marginBottom:4 },
  avatarText: { color:'#fff', fontWeight:'800', fontSize:28 },
  name:  { fontSize:22, fontWeight:'800', color:'#111827', letterSpacing:-0.3 },
  email: { fontSize:14, color:'#9CA3AF' },
  bizPill: { borderRadius:20, paddingHorizontal:12, paddingVertical:5, marginTop:4 },
  bizText: { fontSize:13, fontWeight:'700' },

  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 20, shadowOffset: { width:0, height:4 }, elevation: 2,
    gap: 12,
  },
  infoRow: { flexDirection:'row', alignItems:'center', gap:10 },
  infoIcon: {
    width:32, height:32, borderRadius:10,
    backgroundColor:'#F9FAFB', alignItems:'center', justifyContent:'center',
  },
  infoText: { fontSize:14, color:'#374151', flex:1 },
  divider: { height:1, backgroundColor:'#F3F4F6' },

  logoutBtn: {
    flexDirection:'row', alignItems:'center', gap:10,
    padding:14, borderRadius:16,
    backgroundColor:'#FEF2F2',
    borderWidth:1, borderColor:'#FECACA',
    shadowColor:'#EF4444', shadowOpacity:0.08,
    shadowRadius:8, shadowOffset:{ width:0, height:3 },
  },
  logoutText: { color:'#EF4444', fontWeight:'600', fontSize:15 },
});
