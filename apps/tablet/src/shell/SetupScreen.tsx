import { useState } from 'react'
import { loadCredentials } from '@paddock/core'
import { t } from '../i18n'
import { useConnection } from '../stores/connection.store'
import styles from './SetupScreen.module.css'

/** Asks for the Home Assistant address and a long-lived token (stored on this device only). */
export function SetupScreen() {
  const message = useConnection((s) => s.message)
  const connect = useConnection((s) => s.connect)
  const initial = loadCredentials()
  const [url, setUrl] = useState(initial.url)
  const [token, setToken] = useState(initial.token)
  const [error, setError] = useState('')

  function submit() {
    const cleanUrl = url.trim().replace(/\/$/, '')
    if (!cleanUrl || !token.trim()) return setError(t('setup.required'))
    connect({ url: cleanUrl, token: token.trim() })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h2>{t('setup.title')}</h2>
        <p>{t('setup.help')}</p>
        <label htmlFor="pd-url">{t('setup.url')}</label>
        <input id="pd-url" type="url" autoComplete="off" placeholder="http://homeassistant.local:8123" value={url} onChange={(e) => setUrl(e.target.value)} />
        <label htmlFor="pd-token">{t('setup.token')}</label>
        <input id="pd-token" type="password" autoComplete="off" placeholder="eyJ…" value={token} onChange={(e) => setToken(e.target.value)} />
        <button onClick={submit}>{t('setup.connect')}</button>
        <div className={styles.message}>{error || message}</div>
      </div>
    </div>
  )
}
