-- business_roles: custom roles per business (e.g. "Mesero", "Gerente")
create table if not exists public.business_roles (
  "roleId"     uuid        default gen_random_uuid() primary key,
  "businessId" uuid        not null references public.businesses("businessId") on delete cascade,
  "name"       text        not null,
  "isAdmin"    boolean     not null default false,
  "createdAt"  timestamptz default now() not null,
  "updatedAt"  timestamptz default now() not null,
  unique("businessId", "name")
);

-- roleId on employees (nullable — existing employees have no role)
alter table public.employees
  add column if not exists "roleId" uuid references public.business_roles("roleId") on delete set null;

-- RLS
alter table public.business_roles enable row level security;

-- Only the business owner can create/update/delete roles
create policy "business_roles: owner manage"
  on public.business_roles for all
  using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
        and u.role = 'owner'
    )
  );

-- Any member of the business can read roles
create policy "business_roles: members read"
  on public.business_roles for select
  using (
    exists (
      select 1 from public.users u
      where u."userId" = auth.uid()
        and u."businessId" = "businessId"
    )
  );
