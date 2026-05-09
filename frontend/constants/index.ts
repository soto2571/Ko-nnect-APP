import Constants from 'expo-constants';

export const SUPABASE_FUNCTIONS_URL =
  (Constants.expoConfig?.extra?.supabaseFunctionsUrl as string) ?? '';

export const DEFAULT_PRIMARY_COLOR = '#E11D48';

export const COLORS = {
  background: '#F9FAFB',
  white: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  cardBackground: '#FFFFFF',
};
