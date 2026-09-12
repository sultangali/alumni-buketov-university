import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from '../V3/app/node_modules/vite/dist/node/index.js'
import { fileURLToPath } from 'node:url'

test('APK bridge correlates asynchronous responses and propagates durable-storage failures', async () => {
  const vite = await createServer({root: fileURLToPath(new URL('../V3/app', import.meta.url)), server:{middlewareMode:true,hmr:false,watch:null},appType:'custom'})
  const original = globalThis.window
  try {
    const calls = []
    globalThis.window = {AlumniNative:{request:(...args)=>calls.push(args)}}
    const bridge = await vite.ssrLoadModule('/src/lib/kiosk.ts')
    const nav = await vite.ssrLoadModule('/src/lib/navigation.ts')
    const handoffUrl='https://example.test/u/apply#handoff='+ 'a'.repeat(64)
    assert.ok(nav.routeUrl({name:'apply'},handoffUrl).endsWith('#handoff='+ 'a'.repeat(64)))
    assert.ok(!nav.routeUrl({name:'home'},handoffUrl).includes('#handoff='))
    assert.equal(bridge.isNativeKiosk(),true)
    const first = bridge.nativeRequest('status')
    const second = bridge.nativeRequest('submit',{clientSubmissionId:'test',name:{ru:'Test'}})
    assert.notEqual(calls[0][0], calls[1][0])
    window.__alumniNativeResponse(calls[1][0],JSON.stringify({ok:false,error:'Недостаточно места'}))
    await assert.rejects(second,/Недостаточно места/)
    window.__alumniNativeResponse(calls[0][0],JSON.stringify({ok:true,data:{online:false,pending:2}}))
    assert.deepEqual(await first,{online:false,pending:2})
    // A late/duplicate response must not settle another request.
    window.__alumniNativeResponse(calls[1][0],JSON.stringify({ok:true,data:{id:'unexpected'}}))
    assert.equal(bridge.kioskMediaSrc('/media/photo-one.jpg'),'/cached-media/photo-one.jpg')
    for(const url of ['https://external.test/photo.jpg','file:///etc/passwd','/media/../secret','/media/a.jpg?x=1']) assert.equal(bridge.kioskMediaSrc(url),'')
    delete window.AlumniNative
    await assert.rejects(bridge.nativeRequest('status'),/unavailable/)
  } finally {
    globalThis.window = original
    await vite.close()
  }
})
