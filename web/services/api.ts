import { getToken } from '@/lib/token-store';
import type { AuthResponse, Business, Employee, Shift, TimeLog } from '@/types';

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;

// ─── Base fetch ───────────────────────────────────────────────────────────────

async function request<T>(
  functionName: string,
  options: RequestInit & { query?: Record<string, string> } = {}
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let url = `${FUNCTIONS_URL}/${functionName}`;
  if (options.query) {
    const qs = new URLSearchParams(options.query).toString();
    if (qs) url += `?${qs}`;
  }

  const { query: _q, ...fetchOptions } = options;
  const res = await fetch(url, { ...fetchOptions, headers });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch {
    throw new Error(res.ok ? 'Respuesta inesperada del servidor.' : `Error del servidor (${res.status}).`);
  }

  if (!res.ok || json.success === false) {
    throw new Error(json.message || `La solicitud falló (${res.status}).`);
  }

  return json.data ?? json;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  return request<AuthResponse>('auth-login', { method: 'POST', body: JSON.stringify(payload) });
}

export async function signup(payload: {
  email: string; password: string;
  firstName: string; lastName: string;
  role: 'owner' | 'employee';
}): Promise<AuthResponse> {
  return request<AuthResponse>('auth-signup', { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Business ─────────────────────────────────────────────────────────────────

export async function createBusiness(payload: {
  name: string; color: string;
  payPeriodType?: 'weekly' | 'biweekly' | 'semi-monthly';
  payPeriodStartDay?: number;
  payPeriodAnchorDate?: string;
}): Promise<Business> {
  return request<Business>('business-create', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getBusiness(businessId: string): Promise<Business> {
  return request<Business>(`business-get/${businessId}`);
}

export async function updateBusiness(businessId: string, payload: Partial<Business>): Promise<Business> {
  return request<Business>(`business-update/${businessId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteBusiness(businessId: string): Promise<void> {
  return request<void>(`business-delete/${businessId}`, { method: 'DELETE' });
}

// ─── Employees ────────────────────────────────────────────────────────────────

export async function getEmployees(businessId: string, includeDeleted = false): Promise<Employee[]> {
  const query: Record<string, string> = { businessId };
  if (includeDeleted) query.includeDeleted = 'true';
  return request<Employee[]>('employees-list', { query });
}

export async function addEmployee(payload: {
  businessId: string; businessName: string;
  firstName: string; lastName: string;
}): Promise<{ employee: Employee; credentials: { email: string; password: string } }> {
  return request('employees-add', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateEmployee(employeeId: string, payload: { firstName?: string; lastName?: string }): Promise<Employee> {
  return request<Employee>(`employees-update/${employeeId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteEmployee(employeeId: string): Promise<void> {
  return request<void>(`employees-delete/${employeeId}`, { method: 'DELETE' });
}

export async function resetEmployeePin(employeeId: string): Promise<{ email: string; password: string }> {
  return request(`employees-reset-pin/${employeeId}`, { method: 'POST' });
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  return request<void>('auth-change-password', { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function getShifts(businessId: string, startDate?: string, endDate?: string): Promise<Shift[]> {
  const query: Record<string, string> = { businessId };
  if (startDate) query.startDate = startDate;
  if (endDate)   query.endDate   = endDate;
  return request<Shift[]>('shifts-get', { query });
}

export async function createShift(payload: {
  businessId: string; title: string;
  startTime: string; endTime: string;
  breakDuration?: number; breakTime?: string;
}): Promise<Shift> {
  return request<Shift>('shifts-create', { method: 'POST', body: JSON.stringify(payload) });
}

export async function assignShift(shiftId: string, payload: {
  employeeId: string; status: string;
  startTime?: string; endTime?: string;
  breakDuration?: number; breakTime?: string;
}): Promise<Shift> {
  return request<Shift>(`shifts-assign/${shiftId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteShift(shiftId: string): Promise<void> {
  return request<void>(`shifts-delete/${shiftId}`, { method: 'DELETE' });
}

// ─── Timelog ──────────────────────────────────────────────────────────────────

export async function getTimeLogs(businessId: string, startDate: string, endDate: string): Promise<TimeLog[]> {
  return request<TimeLog[]>('timelog-list', { query: { businessId, startDate, endDate } });
}

export async function updateTimeLog(logId: string, payload: {
  clockIn?: string; clockOut?: string;
  breaks?: { start: string; end?: string }[];
}): Promise<TimeLog> {
  return request<TimeLog>(`timelog-update/${logId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteTimeLog(logId: string): Promise<void> {
  return request<void>(`timelog-delete/${logId}`, { method: 'DELETE' });
}

export async function getActiveEmployees(businessId: string): Promise<TimeLog[]> {
  return request<TimeLog[]>('timelog-active', { query: { businessId } });
}
