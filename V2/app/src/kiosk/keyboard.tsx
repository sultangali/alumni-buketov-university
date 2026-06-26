import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Setter = (updater: (v: string) => string) => void
interface KB {
  focus(setter: Setter): void
  blur(): void
  active: boolean
  type(ch: string): void
  backspace(): void
  layout: 'ru' | 'en'
  setLayout(l: 'ru' | 'en'): void
}
const Ctx = createContext<KB | null>(null)
export const useKeyboard = (): KB => {
  const v = useContext(Ctx)
  if (!v) throw new Error('useKeyboard outside KeyboardProvider')
  return v
}
export const useOptionalKeyboard = () => useContext(Ctx)

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const setter = useRef<Setter | null>(null)
  const [active, setActive] = useState(false)
  const [layout, setLayout] = useState<'ru' | 'en'>('ru')
  const api: KB = useMemo(() => ({
    focus(s) { setter.current = s; setActive(true) },
    blur() { setActive(false) },
    active,
    type(ch) { setter.current?.((v) => v + ch) },
    backspace() { setter.current?.((v) => v.slice(0, -1)) },
    layout,
    setLayout,
  }), [active, layout])
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}
