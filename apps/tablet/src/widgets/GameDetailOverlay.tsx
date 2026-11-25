import { useEffect } from 'react'
import { GameDetail, type GameMedia, type VideoBlocked } from '@paddock/ui'
import { metacriticTone, ratingTone, youtubeAppUrl, youtubeEmbed, youtubeThumb } from '@paddock/core'
import { config } from '../config'
import { ha } from '../ha'
import { decimal, formatDate, t } from '../i18n'
import { loadGamePage, useGamePages } from '../stores/gamedetail.store'
import { useUi } from '../stores/ui.store'
import { esrb, genre } from './gameLabels'

/** While a video plays full screen: no screensaver. */
export const keepAwake = () => useUi.getState().touched()

/** Trailer sound on the wall tablet: up while it plays, back to its usual level (muted) after. */
export function trailerSound(): () => void {
  const s = config.gaming?.trailerSound
  if (!s?.player || !/Android/i.test(navigator.userAgent)) return () => {}
  const set = (level: number) =>
    ha.call({ domain: 'media_player', service: 'volume_set', target: s.player, data: { volume_level: Math.max(0, Math.min(100, level)) / 100 } })
  set(s.volume ?? 50)
  return () => set(s.restore ?? 0)
}

/** When YouTube refuses a trailer on the tablet: open it in the YouTube app of an Apple TV. */
export function videoBlocked(): VideoBlocked {
  return {
    title: t('detail.blockedTitle'),
    text: t('detail.blockedText'),
    sentLabel: t('detail.blockedSent'),
    targets: (config.movies?.tvs ?? []).map((tv) => ({
      label: tv.remoteTitle ?? tv.name,
      icon: 'tv',
      onPress: (videoId: string) =>
        ha.call({ domain: 'media_player', service: 'play_media', target: tv.media, data: { media_content_type: 'url', media_content_id: youtubeAppUrl(videoId) } }),
    })),
  }
}

/** Full page of a game opened from the gaming lists. */
export function GameDetailOverlay({ id, title, image }: { id: number; title: string; image: string | null }) {
  const page = useGamePages((s) => s.pages[id])
  const failed = useGamePages((s) => s.failed[id])
  useEffect(() => {
    loadGamePage(id)
  }, [id])
  const close = () => useUi.getState().open(null)

  const released = page?.released ? new Date(page.released) : null
  const upcoming = released ? released.getTime() > Date.now() : !!page?.tba
  const kicker = !released ? t('shelf.tba') : t(upcoming ? 'detail.releases' : 'detail.released', { date: formatDate(released, { day: 'numeric', month: 'long', year: 'numeric' }) })

  const media: GameMedia[] = [
    ...(page?.trailers ?? []).map((v): GameMedia => ({ kind: 'video', key: `v-${v}`, id: v, thumb: youtubeThumb(v), embed: youtubeEmbed(v, location.origin) })),
    ...(page?.shots ?? []).map((s, i): GameMedia => ({ kind: 'image', key: `s-${i}`, thumb: s.thumb, large: s.large })),
  ]

  return (
    <GameDetail
      closeLabel={t('common.close')}
      onClose={close}
      loading={failed ? t('detail.unavailable') : t('shelf.loading')}
      kicker={page ? kicker : ''}
      title={page?.name ?? title}
      cover={image}
      score={
        page?.metacritic
          ? { value: page.metacritic, tone: metacriticTone(page.metacritic), label: t('gaming.metacritic') }
          : page?.rating && page.ratings >= 5
            ? { value: decimal(page.rating), tone: ratingTone(page.rating), label: t('detail.players', { n: page.ratings }) }
            : undefined
      }
      chips={[
        page?.esrb ? { icon: 'family_restroom', label: esrb(page.esrb) } : null,
        page?.playtime ? { icon: 'schedule', label: t('gaming.avgPlaytime', { h: page.playtime }) } : null,
        page?.trailers.length ? { icon: 'smart_display', label: t('detail.trailers', { n: page.trailers.length }) } : null,
      ].filter((x): x is { icon: string; label: string } => !!x)}
      facts={
        page
          ? [
              page.developers.length ? { label: t('gaming.developer'), value: page.developers.slice(0, 3).join(', ') } : null,
              page.publishers.length ? { label: t('gaming.publisher'), value: page.publishers.slice(0, 3).join(', ') } : null,
              page.genres.length ? { label: t('detail.genres'), value: page.genres.map(genre).join(', ') } : null,
              page.platforms.length ? { label: t('detail.platforms'), value: page.platforms.join(', ') } : null,
            ].filter((x): x is { label: string; value: string } => !!x)
          : []
      }
      media={media}
      videoBlocked={videoBlocked()}
      keepAwake={keepAwake}
      onVideo={trailerSound}
      descriptionTitle={t('gaming.about')}
      description={page?.description ?? ''}
      source={
        page
          ? {
              label: t('gaming.source'),
              links: [
                page.rawgUrl ? { label: 'RAWG', href: page.rawgUrl } : null,
                page.wikipediaUrl ? { label: 'Wikipédia', href: page.wikipediaUrl } : null,
                page.trailers.length ? { label: 'Wikidata · YouTube', href: `https://www.youtube.com/watch?v=${page.trailers[0]}` } : null,
              ].filter((x): x is { label: string; href: string } => !!x),
            }
          : undefined
      }
    />
  )
}
