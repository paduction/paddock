import { QuickAction } from '@paddock/ui'
import { countLit, isOpen, pauseCall } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { t } from '../i18n'
import { cinema, useCinema } from '../stores/cinema.store'
import { moveCovers, useCoverList } from '../stores/covers.store'
import { useEntity } from '../stores/hass.store'
import { createHold } from '../stores/hold'
import { useLightList, useLights } from '../stores/lights.store'
import { useMusicPlayer } from '../stores/music.store'

/** Green "done" check for 1.8 s after a press. */
const done = createHold<boolean>()

export function QuickActionsWidget() {
  const lights = useLightList(config.lighting.lights)
  const covers = useCoverList()
  const lit = lights.filter((l) => l.on && l.available).map((l) => l.id)
  const cine = useCinema(lit)
  const video = useEntity(config.home.cinema?.player?.media)
  const musicPlayer = useMusicPlayer()
  const offDone = done.useValue('off')
  const coversDone = done.useValue('covers')

  const devicesOn = countLit(lights) + (cine?.steps.projector ? 1 : 0) + (cine?.steps.amplifier ? 1 : 0)
  const openCovers = covers.filter(isOpen).length

  function allOff() {
    useLights.getState().allOff(lights)
    if (cine?.on) cinema.toggle(cine)
    else {
      if (cine?.steps.amplifier) cinema.amplifierOff()
      if (cine?.steps.projector) cinema.projectorOff()
    }
    if (video?.state === 'playing') ha.call(pauseCall(video.entity_id))
    if (musicPlayer.player?.state === 'playing') ha.call(pauseCall(musicPlayer.player.entity))
    done.hold('off', true, 1800)
  }

  return (
    <>
      <QuickAction
        icon="power_settings_new"
        label={t('quick.allOff')}
        detail={offDone ? t('quick.done') : devicesOn ? t('quick.devicesOn', { n: devicesOn }) : t('quick.nothingOn')}
        state={offDone ? 'done' : 'idle'}
        onPress={allOff}
      />
      <QuickAction
        icon="blinds_closed"
        label={t('quick.closeCovers')}
        detail={coversDone ? t('quick.done') : openCovers ? t('quick.coversOpen', { n: openCovers }) : t('quick.allClosed')}
        state={coversDone ? 'done' : 'idle'}
        onPress={() => {
          moveCovers(covers, 'down')
          done.hold('covers', true, 1800)
        }}
      />
      {cine && (
        <QuickAction
          icon="movie"
          label={t('quick.cinema')}
          detail={cine.status === 'on' ? t('quick.cinemaOn') : cine.status === 'starting' ? t('quick.cinemaStarting') : t('quick.cinemaIdle')}
          state={cine.status === 'off' ? 'idle' : 'active'}
          onPress={() => cinema.toggle(cine)}
        />
      )}
    </>
  )
}
