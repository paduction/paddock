import { MiniPlayer } from '@paddock/ui'
import { livePosition, type Player } from '@paddock/core'
import { haImage } from '../ha'
import { useClock } from '../stores/clock.store'
import { music } from '../stores/music.store'
import { useUi } from '../stores/ui.store'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function MiniPlayerWidget({ player }: { player: Player }) {
  const now = useClock((s) => s.now)
  const position = livePosition(player, now)
  const d = player.duration
  return (
    <MiniPlayer
      title={player.title}
      artist={player.artist || player.album}
      artwork={haImage(player.picture)}
      playing={player.state === 'playing'}
      progress={d ? (position / d) * 100 : 0}
      elapsed={clock(position)}
      remaining={d ? `-${clock(d - position)}` : ''}
      onOpen={() => useUi.getState().go('music')}
      onPlayPause={() => music.playPause(player)}
      onStop={() => music.stop(player)}
    />
  )
}
