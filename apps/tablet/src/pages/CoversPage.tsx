import { CoverGroupHeader, CoverTile, HouseCoversCard } from '@paddock/ui'
import { coverGroups, isOpen, type Cover } from '@paddock/core'
import { t } from '../i18n'
import { moveCovers, setCoverPosition, useCoverList } from '../stores/covers.store'
import styles from './CoversPage.module.css'

function statusFor(position: number) {
  return position >= 100 ? t('covers.open') : position <= 0 ? t('covers.closed') : t('covers.ajar')
}

function tooltipFor(position: number) {
  return position === 0 ? t('covers.closed') : position === 100 ? t('covers.open') : t('covers.openAt', { n: position })
}

function groupSummary(covers: Cover[]) {
  if (covers.length < 2) return ''
  const open = covers.filter(isOpen).length
  return open === 0 ? t('covers.allClosed') : open === covers.length ? t('covers.allOpen') : t('covers.someOpen', { n: open, total: covers.length })
}

export function CoversPage() {
  const covers = useCoverList()
  const groups = coverGroups(covers)
  const open = covers.filter(isOpen).length

  return (
    <div className={styles.page} style={{ gridTemplateRows: `repeat(${groups.length}, minmax(0, 1fr))` }}>
      {groups.map((group, gi) => (
        <div key={group.name} className={styles.row}>
          <CoverGroupHeader title={group.name} summary={groupSummary(group.covers)} controls={group.covers.length > 1} onCommand={(cmd) => moveCovers(group.covers, cmd)} />
          {group.covers.map((cover) => (
            <CoverTile
              key={cover.id}
              name={cover.name}
              available={cover.available}
              position={cover.position}
              moving={cover.moving}
              statusFor={statusFor}
              tooltipFor={tooltipFor}
              offlineLabel={t('covers.offline')}
              draggingLabel={t('covers.adjusting')}
              movingLabel={(dir) => t(dir === 'up' ? 'covers.opening' : 'covers.closing')}
              onCommand={(cmd) => moveCovers([cover], cmd)}
              onPosition={(position, phase) => setCoverPosition(cover, position, phase)}
            />
          ))}
          {gi === groups.length - 1 && (
            <HouseCoversCard
              title={t('covers.house')}
              summary={t('covers.houseOpen', { n: open, total: covers.length })}
              openLabel={t('covers.openAll')}
              closeLabel={t('covers.closeAll')}
              onOpen={() => moveCovers(covers, 'up')}
              onClose={() => moveCovers(covers, 'down')}
            />
          )}
        </div>
      ))}
    </div>
  )
}
