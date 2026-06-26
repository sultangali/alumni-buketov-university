import { writeFileSync } from 'fs'
import { FAC, ALU, TEACH, TEACHERS, LAUREATES, VETERANS, AUDIT, MODS } from '../src/data/records'
const data = { FAC, ALU, TEACH, TEACHERS, LAUREATES, VETERANS, AUDIT, MODS }
writeFileSync('scripts/seed.json', JSON.stringify(data, null, 2))
const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v.length : Object.keys(v).length]))
console.log('seed counts:', JSON.stringify(counts))
