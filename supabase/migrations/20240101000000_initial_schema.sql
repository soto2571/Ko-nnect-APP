-- ============================================================
-- Ko-nnect Initial Schema
-- ============================================================

-- Enable UUID extension

-- ============================================================
-- BUSINESSES
-- ============================================================
create table public.businesses (
  "businessId"          uuid primary key default gen_random_uuid(),
  name                  text not null,
  "ownerId"             uuid not null,
  color                 text default '#E11D48',
  "payPeriodType"       text default 'weekly',
  "payPeriodStartDay"   integer default 0,
  "payPeriodAnchorDate" text,
  "createdAt"           timestamptz default now(),
  "updatedAt"           timestamptz default now()
);

-- ============================================================
-- USERS (mirrors Supabase auth.users, stores app-level fields)
-- ============================================================
create table public.users (
  "userId"     uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  "firstName"  text not null,
  "lastName"   text not null,
  role         text not null check (role in ('owner', 'employee')),
  "businessId" uuid references public.businesses("businessId") on delete set null,
  "createdAt"  timestamptz default now(),
  "updatedAt"  timestamptz default now()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
create table public.employees (
  "employeeId"   uuid primary key default gen_random_uuid(),
  "businessId"   uuid not null references public.businesses("businessId") on delete cascade,
  "userId"       uuid references public.users("userId") on delete set null,
  "firstName"    text not null,
  "lastName"     text not null,
  email          text not null,
  "tempPassword" text,
  "joinDate"     timestamptz default now(),
  status         text default 'active'
);

-- ============================================================
-- SHIFTS
-- ============================================================
create table public.shifts (
  "shiftId"         uuid primary key default gen_random_uuid(),
  "businessId"      uuid not null references public.businesses("businessId") on delete cascade,
  title             text not null,
  "startTime"       timestamptz not null,
  "endTime"         timestamptz not null,
  "breakDuration"   integer default 0,
  "breakTime"       timestamptz,
  status            text default 'open',
  "employeeId"      uuid,
  "createdBy"       uuid,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now()
);

-- ============================================================
-- TIMELOGS
-- ============================================================
create table public.timelogs (
  "logId"                   uuid primary key default gen_random_uuid(),
  "businessId"              uuid not null references public.businesses("businessId") on delete cascade,
  "employeeId"              uuid not null,
  "shiftId"                 uuid references public.shifts("shiftId") on delete set null,
  date                      text not null,
  "clockIn"                 timestamptz,
  "clockOut"                timestamptz,
  breaks                    jsonb default '[]',
  "breakStart"              timestamptz,
  "breakEnd"                timestamptz,
  "scheduledBreakDuration"  integer default 0,
  "scheduledBreakTime"      timestamptz,
  "totalMinutes"            integer,
  "overtimeDay"             boolean default false,
  "missedBreakPunch"        boolean default false,
  status                    text default 'clocked_in',
  "createdAt"               timestamptz default now(),
  "updatedAt"               timestamptz default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index on public.users (email);
create index on public.users ("businessId");
create index on public.employees ("businessId");
create index on public.employees (email);
create index on public.shifts ("businessId");
create index on public.shifts ("employeeId");
create index on public.shifts ("startTime");
create index on public.timelogs ("businessId", date);
create index on public.timelogs ("employeeId", date);
create index on public.timelogs ("shiftId");

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.businesses enable row level security;
alter table public.users enable row level security;
alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.timelogs enable row level security;

-- Users can read/update their own profile
create policy "users: own row" on public.users
  for all using (auth.uid() = "userId");

-- Owners can read their business
create policy "businesses: owner access" on public.businesses
  for all using (auth.uid() = "ownerId");

-- Employees can read their own business info
create policy "businesses: employee read" on public.businesses
  for select using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
    )
  );

-- Business members can read employees
create policy "employees: business members" on public.employees
  for select using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
    )
  );

-- Owners can manage employees
create policy "employees: owner manage" on public.employees
  for all using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
        and u.role = 'owner'
    )
  );

-- Shifts: business members can read
create policy "shifts: business members read" on public.shifts
  for select using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
    )
  );

-- Shifts: owners can manage
create policy "shifts: owner manage" on public.shifts
  for all using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
        and u.role = 'owner'
    )
  );

-- Timelogs: employees can read/write their own
create policy "timelogs: own" on public.timelogs
  for all using (
    "employeeId" = auth.uid()
  );

-- Timelogs: owners can read/manage their business
create policy "timelogs: owner manage" on public.timelogs
  for all using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
        and u.role = 'owner'
    )
  );
