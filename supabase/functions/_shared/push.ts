export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  if (!token?.startsWith('ExponentPushToken[')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({ to: token, title, body, data: data ?? {} }),
    });
  } catch {
    // Never let a push failure break the main response
  }
}

export async function sendPushToOwners(
  sb: ReturnType<typeof import('./supabase.ts').getServiceClient>,
  businessId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const { data: owners } = await sb
    .from('users')
    .select('"expoPushToken"')
    .eq('businessId', businessId)
    .eq('role', 'owner')
    .not('expoPushToken', 'is', null);

  await Promise.all(
    (owners ?? []).map((o: { expoPushToken: string }) => sendPush(o.expoPushToken, title, body, data)),
  );
}

export function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export function fmtMinutes(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
