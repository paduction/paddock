import { CinemaHero, RemotePad, ScreenCard, SwitchTile } from '@paddock/ui'
import { remoteKeyCall } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { t } from '../i18n'
import { cinema, useCinema } from '../stores/cinema.store'
import { useLightList } from '../stores/lights.store'
import { LightWidget } from '../widgets/LightWidget'
import { CinemaBarWidget } from '../widgets/CinemaBarWidget'
import { NowPlayingWidget } from '../widgets/NowPlayingWidget'
import { MoviesLibrary } from './MoviesPage'
import styles from './CinemaPage.module.css'

/** Cinema tab: cinema mode (compact) and the film library; without a library, the full cinema controls. */
export function CinemaPage() {
  if (config.movies) {
    return (
      <div className={styles.stack}>
        <CinemaBarWidget />
        <div className={styles.library}>
          <MoviesLibrary />
        </div>
      </div>
    )
  }
  return <CinemaControls />
}

/** Big cinema controls, for homes without a film library. */
function CinemaControls() {
  const cfg = config.home.cinema!
  const lights = useLightList(config.lighting.lights)
  const cine = useCinema(lights.filter((l) => l.on && l.available).map((l) => l.id))
  const light = config.lighting.lights.find((l) => l.id === cfg.light)
  if (!cine) return null
  const { steps, screen } = cine
  const done = (step: boolean) => cine.on && step

  return (
    <div className={styles.page}>
      <div className={styles.left}>
        <CinemaHero
          title={t('cinema.title')}
          hint={cine.status === 'on' ? t('cinema.stop') : cine.status === 'starting' ? t('cinema.starting') : t('cinema.start')}
          status={cine.status}
          steps={[
            { label: t('cinema.stepLights'), done: done(steps.dimmed) },
            { label: t('cinema.stepScreen'), done: done(steps.screenDown) },
            { label: t('cinema.stepProjector'), done: done(steps.projector) },
            { label: t('cinema.stepAmplifier'), done: done(steps.amplifier) },
          ]}
          onToggle={() => cinema.toggle(cine)}
        />
        <div className={styles.grid}>
          <SwitchTile
            name={t('cinema.projector')}
            icon="videocam"
            on={steps.projector}
            status={t(steps.projector ? 'switch.on' : 'switch.off')}
            onToggle={() => cinema.setProjector(!steps.projector)}
          />
          <ScreenCard
            name={t('cinema.screen')}
            down={screen.down}
            moving={screen.moving}
            status={screen.moving ? t(screen.moving === 'down' ? 'cinema.screenGoingDown' : 'cinema.screenGoingUp') : t(screen.down ? 'cinema.screenDown' : 'cinema.screenUp')}
            downLabel={t('cinema.lowerScreen')}
            upLabel={t('cinema.raiseScreen')}
            onCommand={cinema.screen}
          />
          <SwitchTile
            name={t('cinema.amplifier')}
            icon="speaker"
            on={steps.amplifier}
            status={t(steps.amplifier ? 'switch.on' : 'switch.off')}
            onToggle={() => cinema.setAmplifier(!steps.amplifier)}
          />
          {light && <LightWidget cfg={light} size="large" />}
        </div>
      </div>
      {cfg.player && (
        <div className={styles.room}>
          <div className={styles.roomHead}>
            <span className={styles.roomTitle}>{cfg.player.name}</span>
          </div>
          <NowPlayingWidget entity={cfg.player.media} />
          <RemotePad
            title={t('remote.title')}
            sentLabel={t('remote.sent')}
            onKey={(key) => {
              const call = remoteKeyCall(cfg.player!, key)
              if (call) ha.call(call)
            }}
          />
        </div>
      )}
    </div>
  )
}
