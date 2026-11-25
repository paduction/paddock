import type { Credentials } from './connection'

/**
 * The long-lived token stays on the device (localStorage), never in the build.
 * Keys are the same as the legacy UI so an existing tablet connects without re-entering the token.
 */
const KEYS = { url: 'ha_url', token: 'ha_token' }

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function loadCredentials(): Credentials {
  const sameOrigin = /^https?:$/.test(location.protocol) ? location.origin : ''
  return { url: read(KEYS.url) || sameOrigin, token: read(KEYS.token) || '' }
}

export function saveCredentials({ url, token }: Credentials): void {
  try {
    localStorage.setItem(KEYS.url, url)
    localStorage.setItem(KEYS.token, token)
  } catch {
    /* private mode: the user will have to enter it again */
  }
}
