import { CinemaBar, type CinemaControl } from '@paddock/ui'
import { config } from '../config'
import { t } from '../i18n'
import { cinema, useCinema } from '../stores/cinema.store'
import { useLightList, useLights } from '../stores/lights.store'

/** Cinema mode, compact: on the Cinema page (films) and, named "game mode", on the Gaming page (the console plays on the projector too). */
export function CinemaBarWidget({ mode = 'cinema' }: { mode?: 'cinema' | 'game' }) {
  const cfg = config.home.cinema
  const lights = useLightList(config.lighting.lights)
  const toggleLight = useLights((s) => s.toggle)
  const cine = useCinema(lights.filter((l) => l.on && l.available).map((l) => l.id))
  if (!cfg || !cine) return null
  const { steps, screen } = cine
  const light = lights.find((l) => l.id === cfg.light)
  const stepList = [steps.dimmed, steps.screenDown, steps.projector, steps.amplifier]

  const controls: CinemaControl[] = [
    { kind: 'switch', id: 'projector', icon: 'videocam', label: t('cinema.projector'), on: steps.projector, onToggle: () => cinema.setProjector(!steps.projector) },
    {
      kind: 'screen',
      id: 'screen',
      label: t('cinema.screen'),
      status: screen.moving ? t(screen.moving === 'down' ? 'cinema.screenGoingDown' : 'cinema.screenGoingUp') : t(screen.down ? 'cinema.screenDown' : 'cinema.screenUp'),
      down: screen.down,
      moving: !!screen.moving,
      downLabel: t('cinema.lowerScreen'),
      upLabel: t('cinema.raiseScreen'),
      onCommand: cinema.screen,
    },
    { kind: 'switch', id: 'amplifier', icon: 'speaker', label: t('cinema.amplifierShort'), on: steps.amplifier, onToggle: () => cinema.setAmplifier(!steps.amplifier) },
  ]
  if (light?.available) {
    controls.push({ kind: 'switch', id: 'light', icon: light.icon, label: light.on ? `${t('cinema.light')} ${light.brightness} %` : t('cinema.light'), on: light.on, onToggle: () => toggleLight(light) })
  }

  return (
    <CinemaBar
      title={t(mode === 'game' ? 'cinema.gameTitle' : 'cinema.title')}
      icon={mode === 'game' ? 'sports_esports' : 'movie'}
      hint={cine.status === 'on' ? t('cinema.stop') : cine.status === 'starting' ? t('cinema.starting') : t('cinema.start')}
      status={cine.status}
      progress={{ done: stepList.filter(Boolean).length, total: stepList.length }}
      onToggle={() => cinema.toggle(cine)}
      controls={controls}
    />
  )
}
