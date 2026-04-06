import * as SecureStore from 'expo-secure-store';
import { SUPABASE_FUNCTIONS_URL } from '@/constants';
import { supabase } from '@/lib/supabase';
import type { AuthResponse, Availability, Business, Employee, PTO, Shift, TimeLog, User } from '@/types';

const TOKEN_KEY   = 'konnect_token';
const REFRESH_KEY = 'konnect_refresh';
const USER_KEY    = 'konnect_user';

// ─── Token + Session helpers ──────────────────────────────────────────────────

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function removeRefreshToken() {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function saveUser(user: User) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getSavedUser(): Promise<User | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as User; } catch { return null; }
}

export async function removeUser() {
  await SecureStore.deleteItemAsync(USER_KEY);
}

// ─── Token resolution (handles expiry + session restore) ─────────────────────

async function getValidToken(): Promise<string | null> {
  // 1. Check in-memory session (kept fresh by autoRefreshToken)
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  // 2. Session not in memory (hot-reload / cold start) — restore from SecureStore.
  //    setSession() will auto-refresh the access_token if it's expired,
  //    as long as the refresh_token is still valid.
  const storedToken   = await getToken();
  const storedRefresh = await getRefreshToken();
  if (storedToken && storedRefresh) {
    try {
      const { data } = await supabase.auth.setSession({
        access_token:  storedToken,
        refresh_token: storedRefresh,
      });
      if (data.session?.access_token) {
        // Persist any newly issued tokens
        await saveToken(data.session.access_token);
        if (data.session.refresh_token) await saveRefreshToken(data.session.refresh_token);
        return data.session.access_token;
      }
    } catch {}
  }

  // 3. Last resort: return whatever is stored (may be expired, caller will get 401)
  return storedToken;
}

// ─── Base fetch ──────────────────────────────────────────────────────────────

async function request<T>(
  functionName: string,
  options: RequestInit & { query?: Record<string, string> } = {}
): Promise<T> {
  const token = await getValidToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let url = `${SUPABASE_FUNCTIONS_URL}/${functionName}`;
  if (options.query) {
    const qs = new URLSearchParams(options.query).toString();
    if (qs) url += `?${qs}`;
  }

  const { query: _q, ...fetchOptions } = options;
  const res = await fetch(url, { ...fetchOptions, headers });
  const json = await res.json();

  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
  }

  return json.data ?? json;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function signup(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'owner' | 'employee';
}): Promise<AuthResponse> {
  return request<AuthResponse>('auth-signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('auth-login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  return request<void>('auth-change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Business ─────────────────────────────────────────────────────────────────

export async function createBusiness(payload: {
  name: string;
  color: string;
  logo?: string;
  payPeriodType?: 'weekly' | 'biweekly' | 'semi-monthly';
  payPeriodStartDay?: number;
  payPeriodAnchorDate?: string;
}): Promise<Business> {
  return request<Business>('business-create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getBusiness(businessId: string): Promise<Business> {
  return request<Business>(`business-get/${businessId}`);
}

export async function updateBusiness(
  businessId: string,
  payload: {
    name?: string;
    color?: string;
    logo?: string;
    payPeriodType?: 'weekly' | 'biweekly' | 'semi-monthly';
    payPeriodStartDay?: number;
    payPeriodAnchorDate?: string;
  }
): Promise<Business> {
  return request<Business>(`business-update/${businessId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ─── Employees ───────────────────────────────────────────────────────────────

export async function addEmployee(payload: {
  businessId: string;
  businessName: string;
  firstName: string;
  lastName: string;
}): Promise<{ employee: Employee; credentials: { email: string; password: string } }> {
  return request<{ employee: Employee; credentials: { email: string; password: string } }>('employees-add', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEmployees(businessId: string): Promise<Employee[]> {
  return request<Employee[]>('employees-list', {
    query: { businessId },
  });
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  return request<void>(`employees-delete/${employeeId}`, { method: 'DELETE' });
}

export async function resetEmployeePin(employeeId: string): Promise<{ email: string; password: string }> {
  return request<{ email: string; password: string }>(`employees-reset-pin/${employeeId}`, {
    method: 'POST',
  });
}

export async function updateEmployee(
  employeeId: string,
  payload: { firstName?: string; lastName?: string }
): Promise<Employee> {
  return request<Employee>(`employees-update/${employeeId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function createShift(payload: {
  businessId: string;
  title: string;
  startTime: string;
  endTime: string;
  breakDuration?: number;
  breakTime?: string;
}): Promise<Shift> {
  return request<Shift>('shifts-create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getShifts(businessId: string): Promise<Shift[]> {
  return request<Shift[]>('shifts-get', {
    query: { businessId },
  });
}

export async function assignShift(
  shiftId: string,
  payload: {
    employeeId: string;
    status: string;
    startTime?: string;
    endTime?: string;
    breakDuration?: number;
    breakTime?: string;
  }
): Promise<Shift> {
  return request<Shift>(`shifts-assign/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteShift(shiftId: string): Promise<void> {
  return request<void>(`shifts-delete/${shiftId}`, { method: 'DELETE' });
}

export async function getMyShifts(): Promise<Shift[]> {
  return request<Shift[]>('shifts-my');
}

// ─── Timelog ──────────────────────────────────────────────────────────────────

export async function clockIn(payload: {
  shiftId: string;
  businessId: string;
  scheduledBreakDuration?: number;
  breakTime?: string;
}): Promise<TimeLog> {
  return request<TimeLog>('timelog-clock-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function breakStart(logId: string): Promise<TimeLog> {
  return request<TimeLog>('timelog-break-start', {
    method: 'POST',
    body: JSON.stringify({ logId }),
  });
}

export async function breakEnd(logId: string): Promise<TimeLog> {
  return request<TimeLog>('timelog-break-end', {
    method: 'POST',
    body: JSON.stringify({ logId }),
  });
}

export async function clockOut(logId: string): Promise<TimeLog> {
  return request<TimeLog>('timelog-clock-out', {
    method: 'POST',
    body: JSON.stringify({ logId }),
  });
}

export async function getMyTimeLog(shiftId?: string): Promise<TimeLog | null> {
  return request<TimeLog | null>('timelog-my', {
    query: shiftId ? { shiftId } : undefined,
  });
}

export async function getActiveEmployees(businessId: string): Promise<TimeLog[]> {
  return request<TimeLog[]>('timelog-active', {
    query: { businessId },
  });
}

export async function getTimeLogs(
  businessId: string,
  startDate: string,
  endDate: string
): Promise<TimeLog[]> {
  return request<TimeLog[]>('timelog-list', {
    query: { businessId, startDate, endDate },
  });
}

export async function updateTimeLog(
  logId: string,
  payload: { clockIn?: string; clockOut?: string; breaks?: { start: string; end?: string }[] }
): Promise<TimeLog> {
  return request<TimeLog>(`timelog-update/${logId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function getAvailability(businessId: string, employeeId?: string): Promise<Availability[]> {
  return request<Availability[]>('availability-get', {
    query: employeeId ? { businessId, employeeId } : { businessId },
  });
}

export async function setAvailability(payload: {
  employeeId: string;
  businessId: string;
  type: 'vacation' | 'unavailable' | 'recurring_days' | 'recurring_hours';
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  note?: string;
}): Promise<Availability> {
  return request<Availability>('availability-set', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteAvailability(availabilityId: string, employeeId: string, businessId: string): Promise<void> {
  return request<void>('availability-set', {
    method: 'DELETE',
    body: JSON.stringify({ availabilityId, employeeId, businessId, type: 'vacation' }),
  });
}

// ─── PTO ──────────────────────────────────────────────────────────────────────

export async function getPTOList(businessId: string, startDate: string, endDate: string, employeeId?: string): Promise<PTO[]> {
  return request<PTO[]>('pto-list', {
    query: employeeId
      ? { businessId, startDate, endDate, employeeId }
      : { businessId, startDate, endDate },
  });
}

export async function addPTO(payload: {
  employeeId: string;
  businessId: string;
  date: string;
  hours: number;
  type: 'sick' | 'vacation' | 'holiday' | 'other';
  note?: string;
}): Promise<PTO> {
  return request<PTO>('pto-add', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
