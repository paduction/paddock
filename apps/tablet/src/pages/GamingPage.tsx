import { useEffect } from 'react'
import { GameShelf, type ShelfGame } from '@paddock/ui'
import { metacriticTone, pickBestRated, pickUpcoming, ratingTone, type ListedGame } from '@paddock/core'
import { config } from '../config'
import { decimal, formatDate, t } from '../i18n'
import { loadShelves, useShelves } from '../stores/shelves.store'
import { useUi } from '../stores/ui.store'
import { CinemaBarWidget } from '../widgets/CinemaBarWidget'
import { GamingWidget } from '../widgets/GamingWidget'
import styles from './GamingPage.module.css'

const releaseLabel = (g: ListedGame) =>
  g.tba || !g.released ? t('shelf.tba') : formatDate(new Date(g.released), { day: 'numeric', month: 'long', year: 'numeric' })

/** Gaming tab: cinema mode (the console plays on the projector), game lists, the console. */
export function GamingPage() {
  const { upcoming, bestRated, error } = useShelves()
  useEffect(() => {
    loadShelves()
  }, [])
  const now = Date.now()
  const empty = !config.gaming?.rawgKey ? t('shelf.noKey') : error ? t('shelf.unavailable') : t('shelf.loading')

  const soon: ShelfGame[] = pickUpcoming(upcoming ?? [], now).map((g) => ({ key: String(g.id), title: g.name, image: g.image, sub: releaseLabel(g) }))
  const best: ShelfGame[] = pickBestRated(bestRated ?? []).map((g) => ({
    key: String(g.id),
    title: g.name,
    image: g.image,
    sub: [t('shelf.ratings', { n: g.ratings }), g.released ? formatDate(new Date(g.released), { month: 'short', year: 'numeric' }) : ''].filter(Boolean).join(' · '),
    // Metacritic when RAWG has it, otherwise the players' rating out of 5
    score: g.metacritic ? { value: g.metacritic, tone: metacriticTone(g.metacritic) } : { value: decimal(g.rating!), tone: ratingTone(g.rating!) },
  }))

  const open = (key: string) => {
    const g = [...(upcoming ?? []), ...(bestRated ?? [])].find((x) => String(x.id) === key)
    if (g) useUi.getState().open({ kind: 'gameDetail', id: g.id, title: g.name, image: g.image })
  }

  return (
    <div className={styles.page}>
      <CinemaBarWidget mode="game" />
      <div className={styles.row}>
        <div className={styles.shelves}>
          <GameShelf title={t('shelf.upcoming')} games={soon} empty={empty} onOpen={open} />
          <GameShelf title={t('shelf.bestRated')} games={best} empty={empty} onOpen={open} />
        </div>
        <GamingWidget />
      </div>
    </div>
  )
}
