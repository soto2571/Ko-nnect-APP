import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DEFAULT_PRIMARY_COLOR } from '@/constants';

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOwnerGroup = segments[0] === '(owner)';
    const inEmployeeGroup = segments[0] === '(employee)';

    if (!user) {
      // Not logged in → send to login
      if (!inAuthGroup) {
        router.replace('/(auth)/login');
      }
    } else if (user.role === 'owner') {
      if (!inOwnerGroup) {
        router.replace('/(owner)');
      }
    } else if (user.role === 'employee') {
      if (!inEmployeeGroup) {
        router.replace('/(employee)');
      }
    }
  }, [user, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <ActivityIndicator size="large" color={DEFAULT_PRIMARY_COLOR} />
      </View>
    );
  }

  // While a redirect is pending, render nothing to avoid wrong-route hooks firing
  const inAuthGroup     = segments[0] === '(auth)';
  const inOwnerGroup    = segments[0] === '(owner)';
  const inEmployeeGroup = segments[0] === '(employee)';
  const redirectPending =
    (!user && !inAuthGroup) ||
    (user?.role === 'owner'    && !inOwnerGroup) ||
    (user?.role === 'employee' && !inEmployeeGroup);

  if (redirectPending) return null;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
