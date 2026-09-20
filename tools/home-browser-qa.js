async (page) => {
  const checks=[],errors=[],apiRequests=[];const assert=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
  const base=await page.evaluate(()=>location.origin);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/api/'))apiRequests.push({url:r.url().split('/api/')[1],method:r.method()});});
  await page.unrouteAll({behavior:'wait'});
  await page.route('**/api/voice',r=>r.fulfill({json:{configured:true}}));
  await page.route('**/api/environment?*',r=>r.fulfill({json:{weather:{status:'unavailable'},alerts:{status:'unavailable'},closures:{status:'available',geometryStatus:'available',notices:[],fetchedAt:new Date().toISOString()}}}));
  await page.route('**/api/closures',r=>r.fulfill({json:{status:'available',geometryStatus:'available',notices:[],fetchedAt:new Date().toISOString()}}));
  await page.evaluate(()=>localStorage.removeItem('fieldlens.journey.preferences.v1'));
  await page.goto(base+'/');await page.waitForFunction(()=>!document.querySelector('#home-destination').disabled);
  assert(await page.locator('.home-action').count()===4,'Home offers four real action cards');
  assert(await page.locator('#home [role=tab],#home [role=tablist]').count()===0,'No category tabs beneath the destination search');
  await page.getByRole('button',{name:'Open navigation',exact:true}).click();
  assert(await page.locator('#home-menu').isVisible(),'Menu opens with accessible expanded state');
  await page.keyboard.press('Escape');
  assert(await page.locator('#home-menu').isHidden()&&await page.locator('#menu-toggle').evaluate(el=>el===document.activeElement),'Escape closes the menu and restores focus');
  await page.getByLabel('Search a campus destination',{exact:true}).fill('Lake Alice');
  await page.getByRole('button',{name:'Choose destination',exact:true}).click();
  assert(await page.locator('#home-destination').getAttribute('aria-invalid')==='true'&&await page.locator('#destination').inputValue()==='smathers','Unsupported destination is not silently substituted');
  await page.getByLabel('Search a campus destination',{exact:true}).fill('Marston');
  await page.getByRole('button',{name:'Choose destination',exact:true}).click();
  assert(await page.locator('#destination').inputValue()==='marston'&&await page.locator('#origin').evaluate(el=>el===document.activeElement),'Search selects the supported destination and focuses trip review');
  assert(!apiRequests.some(r=>r.url.startsWith('environment')||r.url.startsWith('closures')),'Selecting a destination does not prepare or fetch a journey without confirmation');
  await page.locator('#home-notices').click();
  assert((await page.locator('#announcer').textContent()).includes('prepare a briefing'),'Campus notices explains the unprepared state');
  await page.locator('.home-action[href="#voice-assistant"]').click();
  assert(!apiRequests.some(r=>r.method==='POST'),'Opening the voice section does not record or request speech');
  const scans=[];
  for(const path of ['/','/welcome']){
    await page.goto(base+path);await page.getByRole('heading',{level:1}).waitFor();
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    for(const width of [1440,1024,768,390,320]){
      await page.setViewportSize({width,height:1000});await page.evaluate(()=>window.scrollTo(0,0));
      const result=await page.evaluate(async()=>({width:innerWidth,content:document.documentElement.scrollWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))}));
      assert(result.content<=width&&result.violations.length===0,`${path} at ${width}px: no overflow or automated WCAG violations ${JSON.stringify(result.violations)}`);scans.push({path,width,violations:0});
      if(width===1440||width===390)await page.screenshot({path:`output/playwright/${path==='/'?'home':'welcome'}-${width}.png`});
    }
  }
  assert(!apiRequests.some(r=>r.method==='POST'),'Neither page automatically uploads audio or requests spoken output');
  const beforeLanding=apiRequests.length;await page.reload();await page.getByRole('heading',{level:1}).waitFor();
  assert(apiRequests.length===beforeLanding,'Landing does not contact voice, weather, or closure APIs');
  await page.evaluate(()=>localStorage.setItem('fieldlens.journey.preferences.v1',JSON.stringify({large:false,contrast:false,detail:'short',rate:.85})));
  await page.reload();await page.getByRole('button',{name:'Reading preferences',exact:true}).click();
  await page.getByLabel('Larger text',{exact:true}).check();await page.getByLabel('Higher contrast',{exact:true}).check();await page.getByRole('button',{name:'Done',exact:true}).click();
  const prefs=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldlens.journey.preferences.v1')));
  assert(prefs.large&&prefs.contrast&&prefs.detail==='short'&&prefs.rate===.85,'Landing preferences retain existing voice speed and detail');
  for(const path of ['/welcome','/']){
    await page.goto(base+path);await page.getByRole('heading',{level:1}).waitFor();await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});await page.locator('.skip-link').focus();
    const high=await page.evaluate(async()=>({large:document.documentElement.dataset.reading,contrast:document.documentElement.dataset.contrast,content:document.documentElement.scrollWidth,width:innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))}));
    assert(high.large==='large'&&high.contrast==='high'&&high.content<=high.width&&high.violations.length===0,`Shared 320px large-text/high-contrast preferences on ${path}: ${JSON.stringify(high)}`);
  }
  await page.evaluate(()=>localStorage.removeItem('fieldlens.journey.preferences.v1'));await page.goto(base+'/welcome');
  await page.getByRole('link',{name:'Open voice assistant',exact:true}).click();
  await page.locator('#voice-title').waitFor();
  assert(page.url().endsWith('/#voice-assistant'),'Landing voice dock opens the actual home voice assistant');
  assert(errors.length===0,`No page errors: ${JSON.stringify(errors)}`);
  return {checks,scans};
}
