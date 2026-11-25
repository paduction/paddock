import { HomeAssistant, loadCredentials } from '@paddock/core'

/** The single Home Assistant connection of the app. */
export const ha = new HomeAssistant()

/** Pictures from Home Assistant are often relative (/api/media_player_proxy/…): make them absolute. */
export function haImage(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:/.test(path)) return path
  return loadCredentials().url.replace(/\/$/, '') + path
}
