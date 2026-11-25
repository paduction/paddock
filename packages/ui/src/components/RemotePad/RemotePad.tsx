import { useState } from 'react'
import { Icon } from '../Icon/Icon'
import styles from './RemotePad.module.css'

export type RemoteKey = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'home' | 'power' | 'mute' | 'vdown' | 'vup'

const DPAD: (null | [RemoteKey, string])[] = [
  null, ['up', 'keyboard_arrow_up'], null,
  ['left', 'keyboard_arrow_left'], ['ok', 'radio_button_unchecked'], ['right', 'keyboard_arrow_right'],
  null, ['down', 'keyboard_arrow_down'], null,
]
const SIDE: [RemoteKey, string][] = [
  ['back', 'arrow_back'], ['home', 'home'], ['power', 'power_settings_new'], ['mute', 'volume_off'], ['vdown', 'remove'], ['vup', 'add'],
]

export interface RemotePadProps {
  title: string
  sentLabel: string
  onKey: (key: RemoteKey) => void
}

/** D-pad + side keys; the pressed key lights up for a moment. */
export function RemotePad({ title, sentLabel, onKey }: RemotePadProps) {
  const [flash, setFlash] = useState<RemoteKey | null>(null)
  const press = (key: RemoteKey) => {
    setFlash(key)
    setTimeout(() => setFlash((k) => (k === key ? null : k)), 700)
    onKey(key)
  }
  const cls = (key: RemoteKey, base: string) => (flash === key ? `${base} ${styles.flash}` : base)

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.title}>{title}</span>
        <span className={styles.sent}>{flash ? sentLabel : ''}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.dpad}>
          {DPAD.map((k, i) =>
            k ? (
              <button key={i} className={cls(k[0], k[0] === 'ok' ? `${styles.key} ${styles.ok}` : styles.key)} onClick={() => press(k[0])} aria-label={k[0]}>
                <Icon name={k[1]} size={28} />
              </button>
            ) : (
              <span key={i} />
            ),
          )}
        </div>
        <div className={styles.side}>
          {SIDE.map(([key, icon]) => (
            <button key={key} className={cls(key, styles.sideKey)} onClick={() => press(key)} aria-label={key}>
              <Icon name={icon} size={22} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
