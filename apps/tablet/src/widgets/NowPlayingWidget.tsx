import { NowPlayingCard } from '@paddock/ui'
import { isOn } from '@paddock/core'
import { haImage } from '../ha'
import { t } from '../i18n'
import { players, usePlayer } from '../stores/player.store'

/** Now playing on a TV / Apple TV. */
export function NowPlayingWidget({ entity }: { entity: string }) {
  const player = usePlayer(entity)
  if (!player) return null
  const on = isOn(player)
  const playing = player.state === 'playing'
  return (
    <NowPlayingCard
      state={playing ? t('player.playing') : on ? t('player.paused') : t('player.off')}
      playing={playing}
      title={player.title || (on ? t('player.nothing') : t('player.tvOff'))}
      subtitle={player.artist || player.app}
      artwork={haImage(player.picture)}
      placeholderIcon="tv"
      volume={player.volume}
      onPlayPause={() => players.playPause(player)}
      onPrevious={() => players.previous(player)}
      onNext={() => players.next(player)}
      onVolume={(delta) => players.changeVolume(player, delta)}
    />
  )
}
