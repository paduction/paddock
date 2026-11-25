import type { ReactNode } from 'react'
import { DeviceAutomations } from './DeviceAutomations'
import styles from './WithAutomations.module.css'

/**
 * A device tile with, laid over it, the badge of the automations that drive this device (nothing when there is none).
 * `place` says where the tile has room: 'corner' (bottom right, with text: switch tiles),
 * 'light' and 'cover' (icon only, in the top row of those tiles).
 */
export function WithAutomations({ entity, name, place, children }: { entity: string; name: string; place: 'corner' | 'light' | 'cover'; children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      {children}
      <DeviceAutomations entity={entity} name={name} compact={place !== 'corner'} className={`${styles.badge} ${styles[place]}`} />
    </div>
  )
}
