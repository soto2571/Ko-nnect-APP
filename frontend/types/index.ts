export type Role = 'owner' | 'employee';

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  businessId?: string;
}

export interface Business {
  businessId: string;
  name: string;
  color: string;
  logo?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  employeeId: string;
  businessId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
}

export interface Shift {
  shiftId: string;
  businessId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  status?: string;
  employeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
