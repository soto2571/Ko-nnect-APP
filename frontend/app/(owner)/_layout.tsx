import { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import OwnerOnboarding from '@/components/OwnerOnboarding';

export default function OwnerLayout() {
  const { user, business, primaryColor } = useAuth();
  // If the user already has a businessId saved, they completed onboarding before.
  // Never show onboarding again just because the business failed to load (e.g. network error on startup).
  const [onboardingDone, setOnboardingDone] = useState(!!business || !!user?.businessId);

  useEffect(() => {
    if (business) setOnboardingDone(true);
  }, [business]);

  if (!onboardingDone && !business && !user?.businessId) {
    return <OwnerOnboarding onComplete={() => setOnboardingDone(true)} />;
  }

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
      <Tabs.Screen name="index" options={{ title: 'Turnos', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="employees" options={{ title: 'Empleados', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="timeclock" options={{ title: 'Reporte', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
