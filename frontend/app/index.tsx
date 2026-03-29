import { Redirect } from 'expo-router';

// This file just redirects — actual routing logic is in _layout.tsx
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
