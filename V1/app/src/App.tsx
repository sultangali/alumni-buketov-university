import { AppProvider, useApp } from './AppContext'
import { Shell } from './components/Shell'
import { KioskApp } from './kiosk/KioskApp'

function Stage() {
  const { preview } = useApp()
  return preview === 'kiosk' ? <KioskApp /> : <Shell />
}

export function App() {
  return (
    <AppProvider>
      <Stage />
    </AppProvider>
  )
}
