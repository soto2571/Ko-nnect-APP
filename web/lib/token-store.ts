// Module-level token store — auth context writes, api.ts reads.
// This avoids any cookie-read inconsistencies between browser client instances.

let _token: string | null = null;

export function setToken(token: string | null) {
  _token = token;
}

export function getToken(): string | null {
  return _token;
}
