import { ConnectionStatus, Divider, PanelFooter, RoundButton, RoundButtonGroup, SidePanel } from '@paddock/ui'
import { t } from '../i18n'
import { useHass } from '../stores/hass.store'
import { useMusicPlayer } from '../stores/music.store'
import { useUi } from '../stores/ui.store'
import { AgendaWidget } from '../widgets/AgendaWidget'
import { ClockWidget } from '../widgets/ClockWidget'
import { IndoorWidget, PoolWidget } from '../widgets/IndoorWidget'
import { MiniPlayerWidget } from '../widgets/MiniPlayerWidget'
import { WeatherWidget } from '../widgets/WeatherWidget'

export const SIDEBAR_WIDTH = 280

export function Sidebar() {
  const view = useUi((s) => s.view)
  const night = useUi((s) => s.night)
  const { toggleTheme, toggleNight, openSaver } = useUi.getState()
  const status = useHass((s) => s.status)
  const music = useMusicPlayer()
  const showPlayer = music.visible && view !== 'music'

  return (
    <SidePanel width={SIDEBAR_WIDTH}>
      <ClockWidget />
      <Divider space={[18, 6]} />
      <WeatherWidget />
      <Divider space={[6, 6]} />
      <IndoorWidget />
      {view !== 'outdoor' && <PoolWidget />}
      <Divider space={[18, 16]} />
      <AgendaWidget compact={showPlayer} />
      <PanelFooter>
        {showPlayer && music.player && <MiniPlayerWidget player={music.player} />}
        {!showPlayer && (
          <ConnectionStatus
            status={status === 'live' ? 'live' : status === 'error' ? 'error' : 'pending'}
            label={t(`conn.${status}`)}
          />
        )}
        <RoundButtonGroup>
          <RoundButton icon="contrast" label={t('theme.toggle')} onPress={toggleTheme} />
          <RoundButton icon="bedtime" label={t('night.toggle')} active={night} onPress={toggleNight} />
          <RoundButton icon="schedule" label={t('saver.open')} filled={false} onPress={openSaver} />
        </RoundButtonGroup>
      </PanelFooter>
    </SidePanel>
  )
}
