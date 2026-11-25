import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  ERR_INVALID_AUTH,
  type Connection,
} from 'home-assistant-js-websocket'
import type { ConnectionStatus, HassEntities, ServiceCall } from './types'

export interface Credentials {
  url: string
  token: string
}

type Listener<T> = (value: T) => void

/**
 * The only object that talks to Home Assistant.
 * Framework-agnostic: the app subscribes to it and copies what it needs into its stores.
 */
export class HomeAssistant {
  status: ConnectionStatus = 'connecting'
  entities: HassEntities = {}

  private connection: Connection | null = null
  private waiting: Array<(c: Connection) => void> = []
  private entityListeners = new Set<Listener<HassEntities>>()
  private statusListeners = new Set<Listener<ConnectionStatus>>()

  /** Connects and keeps entities in sync. Rejects with 'invalid-auth' or 'unreachable'. */
  async connect({ url, token }: Credentials): Promise<void> {
    this.setStatus('connecting')
    try {
      const conn = await createConnection({ auth: createLongLivedTokenAuth(url.replace(/\/$/, ''), token) })
      this.connection = conn
      this.waiting.splice(0).forEach((resolve) => resolve(conn))
      this.setStatus('live')
      conn.addEventListener('ready', () => this.setStatus('live'))
      conn.addEventListener('disconnected', () => this.setStatus('reconnecting'))
      conn.addEventListener('reconnect-error', () => this.setStatus('error'))
      subscribeEntities(conn, (entities) => {
        this.entities = entities as HassEntities
        this.entityListeners.forEach((listener) => listener(this.entities))
      })
    } catch (error) {
      this.setStatus('error')
      throw new Error(error === ERR_INVALID_AUTH ? 'invalid-auth' : 'unreachable')
    }
  }

  /** Sends a service call. Failures are logged, never thrown at the UI. Resolves to false on failure. */
  async call({ domain, service, target, data }: ServiceCall): Promise<boolean> {
    try {
      const conn = await this.ready()
      await conn.sendMessagePromise({
        type: 'call_service',
        domain,
        service,
        service_data: { entity_id: target, ...data },
      })
      return true
    } catch (error) {
      console.warn(`[paddock] ${domain}.${service} failed`, error)
      return false
    }
  }

  /** Raw websocket command (calendars, statistics, forecasts…). */
  async command<T = unknown>(message: Record<string, unknown>): Promise<T> {
    const conn = await this.ready()
    return conn.sendMessagePromise<T>(message as any)
  }

  async subscribe<T = unknown>(message: Record<string, unknown>, callback: (data: T) => void): Promise<() => void> {
    const conn = await this.ready()
    return conn.subscribeMessage<T>(callback, message as any)
  }

  onEntities(listener: Listener<HassEntities>): () => void {
    this.entityListeners.add(listener)
    if (Object.keys(this.entities).length) listener(this.entities)
    return () => this.entityListeners.delete(listener)
  }

  onStatus(listener: Listener<ConnectionStatus>): () => void {
    this.statusListeners.add(listener)
    listener(this.status)
    return () => this.statusListeners.delete(listener)
  }

  private ready(): Promise<Connection> {
    return this.connection ? Promise.resolve(this.connection) : new Promise((resolve) => this.waiting.push(resolve))
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status
    this.statusListeners.forEach((listener) => listener(status))
  }
}
