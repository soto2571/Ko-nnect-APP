import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants';
import type { AuthResponse, Business, Employee, Shift, User } from '@/types';

const TOKEN_KEY = 'konnect_token';

// ─── Token helpers ───────────────────────────────────────────────────────────

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function removeToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// ─── Base fetch ──────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
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
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── Business ─────────────────────────────────────────────────────────────────

export async function createBusiness(payload: {
  name: string;
  color: string;
  logo?: string;
}): Promise<Business> {
  return request<Business>('/business', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getBusiness(businessId: string): Promise<Business> {
  return request<Business>(`/business/${businessId}`);
}

export async function updateBusiness(
  businessId: string,
  payload: { name?: string; color?: string; logo?: string }
): Promise<Business> {
  return request<Business>(`/business/${businessId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ─── Employees ───────────────────────────────────────────────────────────────

export async function addEmployee(payload: {
  businessId: string;
  firstName: string;
  lastName: string;
}): Promise<{ employee: Employee; credentials: { email: string; password: string } }> {
  return request<{ employee: Employee; credentials: { email: string; password: string } }>('/employees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getEmployees(businessId: string): Promise<Employee[]> {
  return request<Employee[]>(`/employees?businessId=${businessId}`);
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  return request<void>(`/employees/${employeeId}`, { method: 'DELETE' });
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function createShift(payload: {
  businessId: string;
  title: string;
  startTime: string;
  endTime: string;
}): Promise<Shift> {
  return request<Shift>('/shifts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getShifts(businessId: string): Promise<Shift[]> {
  return request<Shift[]>(`/shifts?businessId=${businessId}`);
}

export async function assignShift(
  shiftId: string,
  payload: { employeeId: string; status: string }
): Promise<Shift> {
  return request<Shift>(`/shifts/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteShift(shiftId: string): Promise<void> {
  return request<void>(`/shifts/${shiftId}`, { method: 'DELETE' });
}

export async function getMyShifts(): Promise<Shift[]> {
  return request<Shift[]>('/my-shifts');
}
