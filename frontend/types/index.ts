export type Role = 'owner' | 'employee';

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  businessId?: string;
  provider?: 'email' | 'google';
}

export interface Business {
  businessId: string;
  name: string;
  color: string;
  logo?: string | null;
  ownerId: string;
  payPeriodType?: 'weekly' | 'biweekly' | 'semi-monthly';
  payPeriodStartDay?: number;    // 0=Sun … 6=Sat (for weekly/biweekly)
  payPeriodAnchorDate?: string;  // YYYY-MM-DD — a known real start date (biweekly only)
  openDays?: number[];           // 0=Sun … 6=Sat, days the business is open
  maxHoursPerDay?: number;       // 0 = no limit
  autoClockOut?: boolean;
  autoClockOutMinutes?: number;
  schedulingWeeks?: number;      // how many weeks ahead (and back) to show/allow scheduling, default 6
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
  tempPassword?: string;
  createdAt: string;
}

export interface Shift {
  shiftId: string;
  businessId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  breakDuration?: number; // minutes (0 = no break)
  breakTime?: string;     // ISO string (scheduled break start)
  status?: string;
  employeeId?: string;
  createdAt: string;
  updatedAt: string;
}

export type TimeLogStatus = 'clocked_in' | 'on_break' | 'clocked_out' | 'missed_punch';

export interface BreakEntry {
  start: string;   // ISO
  end?: string;    // ISO
}

export interface TimeLog {
  logId: string;
  businessId: string;
  employeeId: string;
  shiftId: string;
  date: string;           // YYYY-MM-DD
  clockIn: string;        // ISO
  clockOut?: string;      // ISO
  breaks?: BreakEntry[];  // all breaks (new format)
  // Legacy single-break fields kept for backward compat with existing records
  breakStart?: string;
  breakEnd?: string;
  scheduledBreakDuration: number; // minutes
  scheduledBreakTime?: string;    // ISO
  totalMinutes?: number;
  status: TimeLogStatus;
  overtimeDay?: boolean;
  missedBreakPunch?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

export interface Availability {
  availabilityId: string;
  employeeId: string;
  businessId: string;
  type: 'vacation' | 'unavailable' | 'recurring_days' | 'recurring_hours';
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  startTime?: string;
  endTime?: string;
  note?: string;
  createdAt: string;
}

export interface PTO {
  ptoId: string;
  employeeId: string;
  businessId: string;
  date: string;
  hours: number;
  type: 'sick' | 'vacation' | 'holiday' | 'other';
  note?: string;
  createdAt: string;
}
