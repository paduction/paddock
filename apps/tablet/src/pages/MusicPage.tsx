import { MusicPlayer, QueueCard, SpeakerCard, type QueueItem } from '@paddock/ui'
import { isCurrentTrack, isOn, livePosition, splitTrackTitle } from '@paddock/core'
import { config } from '../config'
import { haImage } from '../ha'
import { t } from '../i18n'
import { useClock } from '../stores/clock.store'
import { music, useCurrentPlayer, useMusic, useSpeakers } from '../stores/music.store'
import styles from './MusicPage.module.css'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function MusicPage() {
  const player = useCurrentPlayer()
  const speakers = useSpeakers()
  const { playlist, playlists, playlistName, pickerOpen, pending } = useMusic()
  const now = useClock((s) => s.now)
  if (!player) return null

  const on = isOn(player)
  const connecting = player.connecting
  const playing = on && player.state === 'playing'
  // Nothing playing: show the first track of the playlist, ready to play
  const first = (!on || !player.title) && playlist?.items.length ? playlist.items[0] : null
  const firstSplit = first ? splitTrackTitle(first.title) : null
  const starting = !!pending && now - pending.at < 25e3 && !(player.title && pending.title.toLowerCase().includes(player.title.toLowerCase()))
  const speaker = speakers.find((s) => s.entity === player.entity)
  const wanted = playlistName ?? config.music?.playlist ?? ''

  let items: QueueItem[]
  if (pickerOpen) {
    items = playlists.map((name) => {
      const selected = name.toLowerCase() === wanted.toLowerCase()
      return { key: name, title: name, subtitle: selected ? t('music.shown') : '', duration: '', thumb: '', icon: selected ? 'check' : 'queue_music', spinning: false, highlighted: selected, onPress: () => music.pickPlaylist(name) }
    })
  } else if (playlist) {
    items = playlist.items.map((track) => {
      const current = isCurrentTrack(track, player)
      const launching = !current && !!pending && pending.id === track.id && now - pending.at < 25e3
      const ready = !launching && first === track
      return {
        key: track.id,
        title: track.title,
        subtitle: launching ? t('music.starting') : ready ? t('music.readyTrack') : current ? player.artist : '',
        duration: current && player.duration ? clock(player.duration) : '',
        thumb: !current && !launching && track.thumb ? track.thumb : '',
        icon: launching ? 'progress_activity' : current ? (playing ? 'graphic_eq' : 'pause') : 'music_note',
        spinning: launching,
        highlighted: current || launching,
        onPress: () => music.playTrack(track),
      }
    })
  } else if (player.title) {
    items = [{ key: 'now', title: player.title, subtitle: player.artist, duration: player.duration ? clock(player.duration) : '', thumb: '', icon: playing ? 'graphic_eq' : 'pause', spinning: false, highlighted: true, onPress: () => {} }]
  } else items = []

  return (
    <div className={styles.page}>
      <MusicPlayer
        source={connecting ? t('music.connecting') : on ? player.name : t('music.sourceOff', { name: player.name })}
        sourceActive={on}
        counter={first ? playlist!.title : player.album || player.name}
        artwork={haImage(player.picture) || first?.thumb || ''}
        state={connecting ? t('music.connecting') : starting ? t('music.starting') : first ? t('music.ready') : playing ? t('music.playing') : on ? t('music.paused') : t('music.off')}
        stateIcon={starting || connecting ? 'progress_activity' : playing ? 'graphic_eq' : 'pause_circle'}
        stateSpinning={starting || connecting}
        stateHighlight={playing || connecting || starting}
        title={firstSplit ? firstSplit.title : player.title || (on ? t('music.nothing') : t('music.speakerOff'))}
        artist={firstSplit ? firstSplit.artist : player.artist}
        album={first ? playlist!.title : player.album}
        duration={player.duration}
        position={livePosition(player, now)}
        playing={playing || connecting}
        shuffle={player.shuffle}
        repeat={player.repeat}
        volume={player.volume}
        shuffleLabel={t('music.shuffle')}
        repeatLabel={t('music.repeat')}
        volumeTooltip={(v) => t('music.volume', { n: v })}
        onPlay={() => music.play(player)}
        onPrevious={() => music.previous(player)}
        onNext={() => music.next(player)}
        onShuffle={() => music.shuffle(player)}
        onRepeat={() => music.repeat(player)}
        onSeek={(sec) => music.seek(player, sec)}
        onVolume={(v) => music.setVolume(player, v)}
        onVolumeStep={(d) => music.changeVolume(player, d)}
      />
      <div className={styles.side}>
        <span className={styles.sideTitle}>{t('music.output')}</span>
        <SpeakerCard
          name={speaker ? (speaker.members?.length ? t('music.homepods', { name: speaker.name, n: speaker.members.length + 1 }) : speaker.name) : player.name}
          status={connecting ? t('music.connecting') : on ? t(playing ? 'music.outPlaying' : 'music.outOn') : t('music.outOff')}
          on={on}
          connecting={connecting}
          onToggle={() => music.power(player)}
          speakers={speakers.map((s) => {
            const current = s.entity === player.entity
            return {
              label: s.name,
              current,
              available: s.available,
              dot: !s.available ? 'off' : current && on ? 'on' : current && connecting ? 'pending' : s.state === 'playing' ? 'on' : 'off',
              onPress: () => music.pickSpeaker(s.entity, player),
            }
          })}
        />
        <QueueCard
          label={pickerOpen ? t('music.choosePlaylist') : playlist ? t('music.playlist') : t('music.queue')}
          action={pickerOpen ? t('music.close') : playlist ? t('music.tracks', { title: playlist.title, n: playlist.items.length }) : wanted || (player.title ? t('music.current') : t('music.empty'))}
          actionIcon={pickerOpen ? 'close' : 'expand_more'}
          onAction={music.togglePicker}
          items={items}
        />
      </div>
    </div>
  )
}
