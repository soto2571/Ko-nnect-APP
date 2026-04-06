-- ============================================================
-- Ko-nnect Features v2
-- ============================================================

-- ── 1. Business settings additions ───────────────────────────
alter table public.businesses
  add column if not exists "openDays"             integer[]  default '{0,1,2,3,4,5,6}',
  add column if not exists "maxHoursPerDay"        integer    default 0,
  add column if not exists "autoClockOut"          boolean    default false,
  add column if not exists "autoClockOutMinutes"   integer    default 30;

-- ── 2. Manager role ──────────────────────────────────────────
-- Allow 'manager' in users.role
alter table public.users
  drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check check (role in ('owner', 'manager', 'employee'));

-- ── 3. Employee availability ─────────────────────────────────
create table if not exists public.employee_availability (
  "availabilityId"  uuid primary key default gen_random_uuid(),
  "employeeId"      uuid not null references public.employees("employeeId") on delete cascade,
  "businessId"      uuid not null references public.businesses("businessId") on delete cascade,
  type              text not null check (type in ('vacation', 'unavailable', 'recurring_days', 'recurring_hours')),
  "startDate"       text,
  "endDate"         text,
  "daysOfWeek"      integer[],
  "startTime"       text,
  "endTime"         text,
  note              text,
  "createdAt"       timestamptz default now()
);

create index if not exists ea_business_idx on public.employee_availability ("businessId");
create index if not exists ea_employee_idx on public.employee_availability ("employeeId");

alter table public.employee_availability enable row level security;

create policy "availability: owner manage" on public.employee_availability
  for all using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
        and u.role in ('owner', 'manager')
    )
  );

create policy "availability: employee read own" on public.employee_availability
  for select using (
    exists (
      select 1 from public.employees e
      where e."employeeId" = "employeeId"
        and e."userId" = auth.uid()
    )
  );

-- ── 4. Paid time off (PTO) ───────────────────────────────────
create table if not exists public.paid_time_off (
  "ptoId"       uuid primary key default gen_random_uuid(),
  "employeeId"  uuid not null references public.employees("employeeId") on delete cascade,
  "businessId"  uuid not null references public.businesses("businessId") on delete cascade,
  date          text not null,
  hours         numeric(5,2) not null default 0,
  type          text not null check (type in ('sick', 'vacation', 'holiday', 'other')),
  note          text,
  "createdAt"   timestamptz default now()
);

create index if not exists pto_business_idx on public.paid_time_off ("businessId", date);
create index if not exists pto_employee_idx on public.paid_time_off ("employeeId");

alter table public.paid_time_off enable row level security;

create policy "pto: owner manage" on public.paid_time_off
  for all using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
        and u.role in ('owner', 'manager')
    )
  );

create policy "pto: employee read own" on public.paid_time_off
  for select using (
    exists (
      select 1 from public.employees e
      where e."employeeId" = "employeeId"
        and e."userId" = auth.uid()
    )
  );
