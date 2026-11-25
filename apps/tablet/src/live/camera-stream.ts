import { ha, haImage } from '../ha'

/**
 * Live camera video, attached to a host element.
 * WebRTC through Home Assistant's go2rtc first (< 1 s latency), HLS as a fallback.
 */
export interface StreamCallbacks {
  onPlaying: (mode: 'rtc' | 'hls') => void
  onError: () => void
  /** The browser refused sound: the video plays muted */
  onMuted: (muted: boolean) => void
}

export interface CameraStream {
  stop: () => void
  setSound: (on: boolean) => void
}

let soundWanted = true

function makeVideo(host: HTMLElement): HTMLVideoElement {
  host.innerHTML = ''
  const v = document.createElement('video')
  v.muted = true
  v.autoplay = true
  v.playsInline = true
  v.setAttribute('playsinline', '')
  host.appendChild(v)
  return v
}

/** Tries with sound; if the browser refuses, plays muted (the sound button can re-enable it). */
export function playWithSound(v: HTMLVideoElement, onMuted: (muted: boolean) => void) {
  v.muted = !soundWanted
  if (soundWanted) v.volume = 1
  v.play()?.catch((err: Error) => {
    if (err?.name === 'NotAllowedError' && !v.muted) {
      v.muted = true
      v.play().catch(() => {})
      onMuted(true)
    }
  })
  onMuted(!soundWanted)
}

export function startCameraStream(entity: string, host: HTMLElement, cb: StreamCallbacks): CameraStream {
  let stopped = false
  let playing = false
  let pc: RTCPeerConnection | null = null
  let unsubscribe: Promise<() => void> | null = null
  let hls: { destroy: () => void } | null = null
  let video: HTMLVideoElement | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const stopRtc = () => {
    unsubscribe?.then((u) => u()).catch(() => {})
    unsubscribe = null
    pc?.close()
    pc = null
  }

  const fail = () => {
    if (stopped) return
    host.innerHTML = ''
    cb.onError()
  }

  async function startHls() {
    if (stopped) return
    try {
      const r = await ha.command<{ url: string }>({ type: 'camera/stream', entity_id: entity, format: 'hls' })
      if (stopped) return
      if (!r?.url) throw new Error('no stream url')
      const url = haImage(r.url)!
      const v = (video = makeVideo(host))
      v.addEventListener('playing', () => {
        playing = true
        cb.onPlaying('hls')
      })
      const { default: Hls } = await import('hls.js')
      if (stopped) return
      if (Hls.isSupported()) {
        const h = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2 })
        hls = h
        h.on(Hls.Events.ERROR, (_e, d) => d?.fatal && fail())
        h.loadSource(url)
        h.attachMedia(v)
      } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
        v.src = url
        v.onerror = fail
      } else return fail()
      playWithSound(v, cb.onMuted)
      clearTimeout(timer)
      timer = setTimeout(() => !playing && fail(), 15000)
    } catch (error) {
      console.warn('[paddock] camera stream', error)
      fail()
    }
  }

  const fallback = () => {
    if (stopped || playing) return
    stopRtc()
    console.warn('[paddock] WebRTC unavailable, falling back to HLS')
    startHls()
  }

  async function startRtc() {
    try {
      let configuration: RTCConfiguration = {}
      try {
        const c = await ha.command<{ configuration?: RTCConfiguration }>({ type: 'camera/webrtc/get_client_config', entity_id: entity })
        configuration = c?.configuration ?? {}
      } catch {
        /* default configuration */
      }
      if (stopped) return
      const peer = (pc = new RTCPeerConnection(configuration))
      peer.addTransceiver('video', { direction: 'recvonly' })
      peer.addTransceiver('audio', { direction: 'recvonly' })
      const v = (video = makeVideo(host))
      v.addEventListener('playing', () => {
        playing = true
        cb.onPlaying('rtc')
      })
      const stream = new MediaStream()
      v.srcObject = stream
      peer.ontrack = (e) => {
        stream.addTrack(e.track)
        playWithSound(v, cb.onMuted)
      }
      peer.onconnectionstatechange = () => ['failed', 'closed'].includes(peer.connectionState) && fallback()

      let session: string | null = null
      const pending: RTCIceCandidateInit[] = []
      const send = (c: RTCIceCandidateInit) =>
        ha.command({ type: 'camera/webrtc/candidate', entity_id: entity, session_id: session, candidate: c }).catch(() => {})
      peer.onicecandidate = (e) => {
        if (!e.candidate) return
        const c = e.candidate.toJSON()
        if (session) send(c)
        else pending.push(c)
      }
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      type Msg = { type: string; session_id?: string; answer?: string; candidate?: string | RTCIceCandidateInit }
      unsubscribe = ha.subscribe<Msg>({ type: 'camera/webrtc/offer', entity_id: entity, offer: offer.sdp }, async (m) => {
        try {
          if (!m || pc !== peer) return
          if (m.type === 'session') {
            session = m.session_id ?? null
            pending.splice(0).forEach(send)
          } else if (m.type === 'answer') await peer.setRemoteDescription({ type: 'answer', sdp: m.answer })
          else if (m.type === 'candidate' && m.candidate) {
            await peer.addIceCandidate(typeof m.candidate === 'string' ? { candidate: m.candidate, sdpMLineIndex: 0 } : m.candidate).catch(() => {})
          } else if (m.type === 'error') fallback()
        } catch (error) {
          console.warn('[paddock] WebRTC', error)
          fallback()
        }
      })
      unsubscribe.catch(fallback)
      timer = setTimeout(fallback, 8000)
    } catch (error) {
      console.warn('[paddock] WebRTC', error)
      fallback()
    }
  }

  if ('RTCPeerConnection' in window) startRtc()
  else startHls()

  return {
    stop() {
      stopped = true
      clearTimeout(timer)
      stopRtc()
      hls?.destroy()
      host.innerHTML = ''
    },
    setSound(on: boolean) {
      soundWanted = on
      if (video) {
        video.muted = !on
        if (on) {
          video.volume = 1
          video.play().catch(() => {})
        }
      }
    },
  }
}

/** Recorded clip (mp4) with native controls. */
export function playRecording(url: string, host: HTMLElement, onMuted: (muted: boolean) => void) {
  host.innerHTML = ''
  const v = document.createElement('video')
  v.src = url
  v.controls = true
  v.autoplay = true
  v.playsInline = true
  v.setAttribute('playsinline', '')
  v.style.background = '#000'
  host.appendChild(v)
  playWithSound(v, onMuted)
}

export function soundEnabled() {
  return soundWanted
}
