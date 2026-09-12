import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

for (const variant of ['V3']) {
  test(`${variant}: live data and API regressions`, async (t) => {
    const root = path.resolve(variant, 'app')
    const { createServer } = await import(pathToFileURL(path.join(root,'node_modules/vite/dist/node/index.js')))
    const vite = await createServer({ root, server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
    try {
      const records = await vite.ssrLoadModule('/src/data/records.ts')
      const logic = await vite.ssrLoadModule('/src/lib/logic.ts')
      await t.test('initials separate the AM exception in Cyrillic, Latin and mixed scripts',()=>{
        for(const [name,expected] of [['Ахметов Марат','А. М.'],['Adams Mark','A. M.'],['Ахметов Mark','А. M.'],['adams mark','A. M.'],['Сериков Асхат','СА'],['Марат Ахметов','МА'],['','']]) {
          assert.equal(logic.initials({ru:name}),expected)
        }
      })
      const teacher = { id:'live-only',kind:'teacher',fac:'other',name:{ru:'Обновлённый преподаватель'},year:2024,accent:'#123456',pos:{},bio:{} }
      records.hydrate({faculties:[{id:'other',depts:[{count:900}]}],alumni:[],teach:{},teachers:[teacher],laureates:[],veterans:[]})
      await t.test('category profile resolves freshly hydrated API record',()=>assert.equal(logic.person('live-only')?.name.ru,teacher.name.ru))
      await t.test('faculty count reflects published records',()=>assert.equal(logic.facAlumniCount(records.FAC[0]),0))
      const nav = await vite.ssrLoadModule('/src/lib/navigation.ts')
      await t.test('QR path takes precedence over saved/query route',()=>assert.deepEqual(nav.routeFromUrl(new URL('http://localhost/u/apply?page=admin')), {name:'apply'}))
      await t.test('public and staff routes round-trip with kiosk mode',()=>{
        for(const route of [{name:'home'},{name:'faculty',fac:'all faculties'},{name:'alumni',id:'person/one'},{name:'apply'},{name:'submission',id:'123'}]) {
          const url=new URL(nav.routeUrl(route,'http://localhost/?preview=kiosk'),'http://localhost')
          assert.deepEqual(nav.routeFromUrl(url),route)
          assert.equal(url.searchParams.get('preview'),'kiosk')
        }
      })
      await t.test('malformed routes and unauthorized admin are rejected',()=>{
        assert.equal(nav.validRoute({name:'faculty'}),null)
        assert.equal(nav.validRoute({name:'made-up'}),null)
        assert.equal(nav.canView({name:'admin'},{role:'moderator'}),false)
        assert.equal(nav.canView({name:'submission'},null),false)
        assert.equal(nav.canView({name:'mod'},{role:'admin'}),true)
      })
      await t.test('empty featured stays finite and recovers when content arrives',()=>{
        assert.equal(nav.nextFeatured(0,0),0)
        assert.equal(nav.nextFeatured(NaN,2),0)
        assert.equal(nav.nextFeatured(1,2),0)
      })
      await t.test('search finds alternate-language names and normalizes yo',()=>{
        assert.equal(logic.matchesText('әлия',{ru:'Алия',kz:'Әлия'}),true)
        assert.equal(logic.matchesText('федор',{ru:'Фёдор'}),true)
        assert.equal(logic.matchesText('unknown',{ru:'Алия'}),false)
      })
      await t.test('faculty search composes with translated names and reset',()=>{
        const people=[{...teacher,id:'a',fac:'mit',name:{ru:'Алия',kz:'Әлия'}},{...teacher,id:'b',fac:'law',name:{ru:'Алия'}},{...teacher,id:'c',fac:'mit',name:{ru:'Фёдор'}}]
        assert.deepEqual(logic.searchPeople(people,'','mit').map(p=>p.id),['a','c'])
        assert.deepEqual(logic.searchPeople(people,'әлия','mit').map(p=>p.id),['a'])
        assert.deepEqual(logic.searchPeople(people,'әлия','law'),[])
        assert.deepEqual(logic.searchPeople(people,'федор','').map(p=>p.id),['c'])
        assert.equal(logic.searchPeople(people,'','').length,3)
      })
      const api = await vite.ssrLoadModule('/src/lib/api.ts')
      const fetchBefore = globalThis.fetch
      try {
        globalThis.fetch = async () => new Response(JSON.stringify({error:'Validation failed'}),{status:422})
        await t.test('API retains server validation message',()=>assert.rejects(api.apiCreateSubmission({}),/Validation failed/))
        globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
        await t.test('network failure is actionable and never success',()=>assert.rejects(api.apiCreateSubmission({}),/Сервер недоступен/))
        globalThis.fetch = async () => new Response('<html>proxy error</html>',{status:502})
        await t.test('non-JSON proxy error is propagated',()=>assert.rejects(api.apiCreateSubmission({}),/HTTP 502/))
      } finally { globalThis.fetch = fetchBefore }
    } finally { await vite.close() }
  })
}
