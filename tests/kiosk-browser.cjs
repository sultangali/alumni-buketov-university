const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:900,height:1600}});
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.addInitScript(() => {
      Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage disabled','SecurityError')}});
      window.__submits=[];
      window.__maintenance=0;
      window.AlumniNative={request(id,method,raw){
        const payload=JSON.parse(raw); let data;
        if(method==='bootstrap' && location.search.includes('empty=1')) { setTimeout(()=>window.__alumniNativeResponse(id,JSON.stringify({ok:false,error:'Нет сохранённого каталога'})),0);return; }
        if(method==='bootstrap')data={faculties:[{id:'mit',name:{ru:'Математика'},depts:[],est:1972}],alumni:[],teachers:[],laureates:[],veterans:[],teach:{}};
        else if(method==='status')data={online:!!window.__online,cachedAt:'2026-09-12T10:00:00Z',pending:0,needsAttention:0,publicOrigin:window.__online?'https://example.test':''};
        else if(method==='maintenance'){window.__maintenance++;data={};}
        else if(method==='handoff'){window.__handoffStarted=true;setTimeout(()=>window.__alumniNativeResponse(id,JSON.stringify({ok:true,data:{url:'https://example.test/u/apply#handoff='+'a'.repeat(64),expiresAt:new Date(Date.now()+60000).toISOString()}})),1500);return;}
        else if(method==='submit'){window.__submits.push(payload);data={id:payload.clientSubmissionId,status:'queued',submittedAt:new Date().toISOString()}};
        if(method==='bootstrap' && location.search.includes('broken=1')) data.faculties[0].name.ru={broken:true};
        if(method==='bootstrap' && location.search.includes('media=1')) data.alumni=[{id:'qa',kind:'alumnus',fac:'mit',year:2020,name:{ru:'Тест медиа'},pos:{},bio:{},accent:'#123456',media:[{name:'Нет фото',kind:'image',url:'/media/unavailable.jpg'},{name:'Нет видео',kind:'video',url:'/media/unavailable.mp4'}]}];
        setTimeout(()=>window.__alumniNativeResponse(id,JSON.stringify({ok:true,data})),0);
      }};
    });
    await page.goto((process.env.KIOSK_TEST_URL || 'http://127.0.0.1:5183/'));
    await page.getByRole('button',{name:'Слайдшоу',exact:true}).click();
    await page.locator('.attract-overlay').waitFor();
    await page.locator('.attract-overlay').click({position:{x:10,y:10}});
    console.log(JSON.stringify({slideshowWithoutWebStorage:'passed'}));
    await page.getByRole('button',{name:/Подать заявку/}).last().click();
    await page.getByRole('button',{name:'Заполнить здесь',exact:true}).click();
    assert.equal(await page.locator('input[type=file]').count(),0);
    await page.locator('input[placeholder="Айдос Серикулы Жумабеков"]').fill('Проверка автономной заявки');
    await page.locator('select').selectOption('mit');
    await page.getByRole('button',{name:/Отправить/}).click();
    await page.getByText('Заявка сохранена на киоске',{exact:true}).waitFor();
    const sent=await page.evaluate(()=>window.__submits);
    assert.equal(sent.length,1); assert.ok(sent[0].clientSubmissionId);
    assert.deepEqual(sent[0].media,[]);
    assert.equal(sent[0].name.ru,'Проверка автономной заявки');
    await page.screenshot({path:'/tmp/alumni-offline-receipt.png'});
    assert.equal(errors.length,0,JSON.stringify(errors));
    console.log(JSON.stringify({nativeOfflineForm:'passed',filePickers:0,queued:sent.length,pageErrors:errors}));
    await page.getByRole('button',{name:'Отправить ещё одну',exact:true}).click();
    await page.evaluate(()=>{window.__online=true});
    await page.locator('input[placeholder="Айдос Серикулы Жумабеков"]').fill('QR race check');
    await page.locator('select').selectOption('mit');
    await page.getByRole('button',{name:'Продолжить с фото на телефоне',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'Отправить заявку',exact:true}).isDisabled(),true);
    await page.getByRole('heading',{name:'Продолжите на телефоне',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.__submits.length),1);
    console.log(JSON.stringify({handoffSubmitMutualExclusion:'passed'}));
    await page.goto(new URL('?empty=1',process.env.KIOSK_TEST_URL || 'http://127.0.0.1:5183/').href);
    await page.getByText('Нет сохранённого каталога',{exact:true}).waitFor();
    await page.getByAltText('Buketov University',{exact:true}).dispatchEvent('pointerdown');
    await page.waitForFunction(()=>window.__maintenance===1);
    console.log(JSON.stringify({noCacheMaintenance:'passed'}));
    await page.route('**/cached-media/**',r=>r.fulfill({status:404,body:''}));
    await page.goto(new URL('?media=1',process.env.KIOSK_TEST_URL || 'http://127.0.0.1:5183/').href);
    await page.locator('[data-kiosk]').waitFor();
    await page.evaluate(()=>{history.replaceState({},'', '?media=1&page=alumni&id=qa');window.dispatchEvent(new PopStateEvent('popstate'))});
    await page.getByRole('heading',{name:'Тест медиа',exact:true}).waitFor();
    await page.getByRole('status').filter({hasText:'Материал сейчас недоступен'}).first().waitFor();
    console.log(JSON.stringify({unavailableMediaFallback:'passed'}));
    await page.goto(new URL('?broken=1',process.env.KIOSK_TEST_URL || 'http://127.0.0.1:5183/').href);
    await page.getByRole('heading',{name:'Не удалось открыть страницу',exact:true}).waitFor();
    await page.getByAltText('Buketov University',{exact:true}).dispatchEvent('pointerdown');
    await page.waitForFunction(()=>window.__maintenance===1);
    console.log(JSON.stringify({renderFailureRecovery:'passed'}));
    const phone=await browser.newPage({viewport:{width:390,height:844}});
    const boot={faculties:[{id:'mit',name:{ru:'Математика'},depts:[],est:1972}],alumni:[],teachers:[],laureates:[],veterans:[],teach:{}};
    await phone.route('**/api/bootstrap',r=>r.fulfill({json:boot}));
    await phone.route('**/api/kiosk/handoffs/*',r=>r.fulfill({json:{draft:{name:{ru:'Черновик с киоска'},fac:'mit',contact:'test@example.test',year:2020},expiresAt:new Date(Date.now()+60000).toISOString()}}));
    await phone.goto(new URL('/u/apply',process.env.KIOSK_TEST_URL || 'http://127.0.0.1:5183/').href+'#handoff='+'a'.repeat(64));
    await phone.locator('input[placeholder="Айдос Серикулы Жумабеков"]').waitFor();
    assert.equal(await phone.locator('input[placeholder="Айдос Серикулы Жумабеков"]').inputValue(),'Черновик с киоска');
    assert.equal(await phone.locator('input[type=file]').count(),2);
    console.log(JSON.stringify({phoneDraft:'passed',phoneFilePickers:2}));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
