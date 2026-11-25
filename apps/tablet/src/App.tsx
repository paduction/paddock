import { Shell } from './shell/Shell'
import { SetupScreen } from './shell/SetupScreen'
import { useConnection } from './stores/connection.store'

export function App() {
  const setupOpen = useConnection((s) => s.setupOpen)
  return (
    <>
      <Shell />
      {setupOpen && <SetupScreen />}
    </>
  )
}
