// Temporary in-memory store for signup data between signup and verify-email screens.
// Cleared immediately after use.
let _data: { password: string; firstName: string; lastName: string } | null = null;

export function setPendingSignup(data: { password: string; firstName: string; lastName: string }) {
  _data = data;
}

export function getPendingSignup() {
  return _data;
}

export function clearPendingSignup() {
  _data = null;
}
