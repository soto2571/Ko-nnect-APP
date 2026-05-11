import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

// Admin employees (isAdmin=true) see shifts + employees + timeclock — no settings
export default function AdminLayout() {
  const { primaryColor } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: primaryColor,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Turnos',    tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline"   size={size} color={color} /> }} />
      <Tabs.Screen name="employees" options={{ title: 'Empleados', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline"     size={size} color={color} /> }} />
      <Tabs.Screen name="timeclock" options={{ title: 'Reporte',   tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline"  size={size} color={color} /> }} />
      <Tabs.Screen name="settings"  options={{ title: 'Perfil',    tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
