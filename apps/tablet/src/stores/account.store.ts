import { loadCredentials, saveCredentials } from '@paddock/core'
import { isDesktop } from '../desktop'
import { ha } from '../ha'

/**
 * Remote account switch. A tablet often starts with an administrator's token (the quickest to paste);
 * it should run with an account without administrator rights. While it runs as an administrator,
 * the tablet listens for `paddock.assign_account` (called from Home Assistant, from anywhere):
 * it then claims a token for that account, keeps it, and starts again with it. Nobody needs to be next to it.
 * Not in the desktop app: a computer is signed in on purpose with its owner's account.
 */
let started = false
ha.onStatus(async (status) => {
  if (status !== 'live' || started || isDesktop) return
  started = true
  try {
    const me = await ha.command<{ is_admin: boolean }>({ type: 'auth/current_user' })
    if (!me.is_admin) return
    await ha.subscribe({ type: 'subscribe_events', event_type: 'paddock_account_assigned' }, async () => {
      try {
        const { token } = await ha.command<{ token: string }>({ type: 'paddock/claim_account', device: 'tablet' })
        saveCredentials({ url: loadCredentials().url, token })
        location.reload()
      } catch (error) {
        console.warn('[paddock] account switch', error)
      }
    })
  } catch (error) {
    console.warn('[paddock] account check', error)
  }
})
