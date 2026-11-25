import { ActionTile, RowHeader, SceneButton } from '@paddock/ui'
import { countLit, type LightConfig } from '@paddock/core'
import { config } from '../config'
import { t } from '../i18n'
import { useLightList, useLights } from '../stores/lights.store'
import { LightWidget } from '../widgets/LightWidget'
import styles from './LightsPage.module.css'

/** A room: its name, how many lights are on, then one tile per light. */
function RoomRow({ room, lights }: { room: string; lights: LightConfig[] }) {
  const lit = countLit(useLightList(lights))
  return (
    <div className={styles.row}>
      <RowHeader title={room} subtitle={lit ? t('lights.countOn', { n: lit }) : t('lights.allOff')} highlight={lit > 0} />
      {lights.map((cfg) => (
        <LightWidget key={cfg.id} cfg={cfg} />
      ))}
    </div>
  )
}

/** Scenes + "turn everything off". */
function ScenesRow() {
  const lights = useLightList(config.lighting.lights)
  const activeScene = useLights((s) => s.activeScene)
  const { applyScene, allOff } = useLights.getState()
  const lit = countLit(lights)
  return (
    <div className={styles.row}>
      <RowHeader title={t('lights.scenes')} />
      <div className={styles.scenes}>
        {config.lighting.scenes.map((scene) => (
          <SceneButton
            key={scene.id}
            name={scene.name}
            icon={scene.icon}
            active={activeScene === scene.id}
            subtitle={t(activeScene === scene.id ? 'scene.active' : 'scene.idle')}
            onPress={() => applyScene(scene.id)}
          />
        ))}
      </div>
      <ActionTile
        icon="power_settings_new"
        title={t('lights.turnAllOff')}
        subtitle={lit ? t('lights.countOn', { n: lit }) : t('lights.nothingOn')}
        onPress={() => allOff(lights)}
      />
    </div>
  )
}

export function LightsPage() {
  const { rows, lights } = config.lighting
  return (
    <div className={styles.page} style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}>
      {rows.map((row) =>
        row.type === 'scenes' ? (
          <ScenesRow key="scenes" />
        ) : (
          <RoomRow key={row.room} room={row.room} lights={lights.filter((l) => l.room === row.room)} />
        ),
      )}
    </div>
  )
}
