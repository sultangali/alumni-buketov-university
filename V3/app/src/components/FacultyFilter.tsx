import { useApp } from '../AppContext'
import { FAC } from '../data/records'
import { useOptionalKeyboard } from '../kiosk/keyboard'
import { Icon } from './icons'

export function FacultyFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { ui, L, lang } = useApp()
  const kb = useOptionalKeyboard()
  return <label className="faculty-filter">
    <span><Icon name="building" size={16} />{ui.applyFaculty}</span>
    <select value={value} onFocus={() => kb?.blur()} onPointerDown={() => kb?.blur()} onChange={e => onChange(e.target.value)}>
      <option value="">{L({ru:'Все факультеты',kz:'Барлық факультеттер',en:'All faculties'})}</option>
      {[...FAC].sort((a,b) => L(a.name).localeCompare(L(b.name), lang === 'kz' ? 'kk' : lang)).map(f => <option key={f.id} value={f.id}>{L(f.name)}</option>)}
    </select>
  </label>
}
