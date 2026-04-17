import { FUNCTIONS_URL, SUPABASE_URL, SERVICE_ROLE_KEY } from './config';

// ─── Colores para la terminal ────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const BOLD   = '\x1b[1m';
const RESET  = '\x1b[0m';

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  expected?: string;
  actual?: string;
}

export interface SuiteResult {
  name: string;
  tests: TestResult[];
}

// ─── API helpers ─────────────────────────────────────────────────────────────

/** Hace un POST/GET/PUT/DELETE a una edge function */
export async function api(
  fn: string,
  opts: {
    method?: string;
    body?: Record<string, unknown>;
    token?: string;
    query?: Record<string, string>;
  } = {}
): Promise<{ status: number; data: any; raw: any }> {
  const { method = 'POST', body, token, query } = opts;

  let url = `${FUNCTIONS_URL}/${fn}`;
  if (query) {
    const qs = new URLSearchParams(query).toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let raw: any;
  const text = await res.text();
  try {
    raw = JSON.parse(text);
  } catch {
    raw = { _raw: text };
  }

  return {
    status: res.status,
    data: raw?.data ?? null,
    raw,
  };
}

/** Login y retorna el token */
export async function login(email: string, password: string): Promise<string> {
  const r = await api('auth-login', { body: { email, password } });
  if (!r.data?.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(r.raw)}`);
  return r.data.token;
}

/** Signup y retorna { token, user } */
export async function signup(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
}): Promise<{ token: string; user: any }> {
  const r = await api('auth-signup', { body: payload });
  if (!r.data?.token) throw new Error(`Signup failed: ${JSON.stringify(r.raw)}`);
  return { token: r.data.token, user: r.data.user };
}

// ─── Supabase Admin (service role) ───────────────────────────────────────────

/** Llama directamente a Supabase REST API con service role key */
export async function supabaseAdmin(
  table: string,
  opts: {
    method?: string;
    query?: string;
    body?: any;
  } = {}
): Promise<any> {
  const { method = 'GET', query = '', body } = opts;
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    'Prefer': 'return=representation',
  };

  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase REST ${method} ${table} failed (${res.status}): ${text}`);
  }
  if (method === 'DELETE' || !text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

/** Borrar un usuario de auth.users via la Admin API */
export async function deleteAuthUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
}

/** Buscar un usuario en auth.users por email */
export async function findAuthUser(email: string): Promise<any | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
  const data = await res.json();
  return data.users?.find((u: any) => u.email === email) ?? null;
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

/** Limpia todos los datos creados por las pruebas */
export async function cleanup(opts: {
  emails?: string[];
  businessIds?: string[];
  employeeIds?: string[];
}) {
  // Delete timelogs for businesses
  for (const bid of opts.businessIds ?? []) {
    await supabaseAdmin('timelogs', { method: 'DELETE', query: `businessId=eq.${bid}` });
    await supabaseAdmin('shifts', { method: 'DELETE', query: `businessId=eq.${bid}` });
    await supabaseAdmin('employees', { method: 'DELETE', query: `businessId=eq.${bid}` });
    await supabaseAdmin('businesses', { method: 'DELETE', query: `businessId=eq.${bid}` });
  }

  // Delete user profiles and auth users
  for (const email of opts.emails ?? []) {
    const authUser = await findAuthUser(email);
    if (authUser) {
      await supabaseAdmin('users', { method: 'DELETE', query: `email=eq.${email}` });
      await deleteAuthUser(authUser.id);
    }
  }
}

// ─── Test runner ─────────────────────────────────────────────────────────────

export function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

export function assertEqual(actual: any, expected: any, msg: string): void {
  if (actual !== expected) {
    throw new Error(`${msg}\n    Esperado: ${JSON.stringify(expected)}\n    Obtenido: ${JSON.stringify(actual)}`);
  }
}

export function assertIncludes(str: string, sub: string, msg: string): void {
  if (!str || !str.includes(sub)) {
    throw new Error(`${msg}\n    Texto: "${str}"\n    Esperaba contener: "${sub}"`);
  }
}

type TestFn = () => Promise<void>;

export class TestSuite {
  name: string;
  tests: { name: string; fn: TestFn }[] = [];
  results: TestResult[] = [];

  constructor(name: string) {
    this.name = name;
  }

  test(name: string, fn: TestFn) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<SuiteResult> {
    console.log(`\n${BOLD}${CYAN}━━━ ${this.name} ━━━${RESET}\n`);

    for (const t of this.tests) {
      try {
        await t.fn();
        this.results.push({ name: t.name, passed: true });
        console.log(`  ${GREEN}PASS${RESET}  ${t.name}`);
      } catch (e: any) {
        this.results.push({ name: t.name, passed: false, error: e.message });
        console.log(`  ${RED}FAIL${RESET}  ${t.name}`);
        console.log(`        ${DIM}${e.message.split('\n').join('\n        ')}${RESET}`);
      }
    }

    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const color = passed === total ? GREEN : YELLOW;
    console.log(`\n  ${color}${passed}/${total} pasaron${RESET}`);

    return { name: this.name, tests: this.results };
  }
}

// ─── Reporte final ───────────────────────────────────────────────────────────

export function printReport(suites: SuiteResult[]) {
  console.log(`\n${BOLD}${'='.repeat(50)}${RESET}`);
  console.log(`${BOLD}  RESULTADOS — Ko-nnecta' Tests${RESET}`);
  console.log(`${'='.repeat(50)}`);

  let totalPassed = 0;
  let totalFailed = 0;
  const failures: { suite: string; test: TestResult }[] = [];

  for (const s of suites) {
    const passed = s.tests.filter(t => t.passed).length;
    const failed = s.tests.length - passed;
    totalPassed += passed;
    totalFailed += failed;

    const color = failed === 0 ? GREEN : RED;
    const pad = s.name.padEnd(24);
    console.log(`  ${pad} ${color}${passed}/${s.tests.length} pasaron${RESET}`);

    for (const t of s.tests.filter(t => !t.passed)) {
      failures.push({ suite: s.name, test: t });
    }
  }

  console.log(`${'─'.repeat(50)}`);
  const totalColor = totalFailed === 0 ? GREEN : RED;
  console.log(`  ${'TOTAL'.padEnd(24)} ${totalColor}${totalPassed}/${totalPassed + totalFailed} pasaron${RESET}`);

  if (failures.length > 0) {
    console.log(`\n${RED}${BOLD}  PRUEBAS FALLIDAS:${RESET}`);
    for (const f of failures) {
      console.log(`\n  ${RED}[${f.suite}] ${f.test.name}${RESET}`);
      console.log(`  ${DIM}${f.test.error}${RESET}`);
    }
  } else {
    console.log(`\n  ${GREEN}${BOLD}Todas las pruebas pasaron.${RESET}`);
  }

  console.log(`${'='.repeat(50)}\n`);
}
