async (page) => {
  const base=await page.evaluate(()=>location.origin),checks=[],errors=[],requests=[];
  const assert=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/api/'))requests.push({url:request.url(),method:request.method()});});
  const scan=async()=>{
    await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
    return page.evaluate(async()=>({width:innerWidth,height:innerHeight,content:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))}));
  };
  await page.goto(base+'/welcome');
  await page.evaluate(()=>localStorage.removeItem('fieldlens.journey.preferences.v1'));await page.reload();
  assert(await page.getByRole('link').count()===4,'Start screen contains exactly four links, without header, dock, or promotional links');
  assert(await page.getByRole('link',{name:'Check conditions',exact:true}).count()===1,'Condition action has a concise accessible name and separate preparation hint');
  const dimensions=[[1440,1000],[1024,768],[768,1024],[390,844],[320,568],[844,390]];
  const scans=[];
  for(const path of ['/welcome','/project']){
    await page.goto(base+path);
    for(const [width,height] of dimensions){
      await page.setViewportSize({width,height});
      await page.evaluate(()=>scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);
      const result=await scan();scans.push({path,width,height,violations:result.violations});
      assert(result.content<=width&&!result.violations.length,path+' at '+width+'×'+height+': no horizontal overflow or axe violations '+JSON.stringify(result.violations));
      if(path==='/welcome')assert(result.scrollHeight<=height+1,'All four start blocks fill and fit '+width+'×'+height);
      if(width===1440||width===390)await page.screenshot({path:'output/playwright/'+(path==='/welcome'?'start':'project')+'-final-'+width+'.png',fullPage:path==='/project'});
    }
  }
  assert(requests.length===0,'Neither start nor project page requests environment, transit, closure, or voice APIs');
  await page.goto(base+'/welcome');
  const labels=['Plan a trip','Talk to FieldLens','Check conditions','Bus alerts'];
  for(const label of labels){
    await page.keyboard.press('Tab');
    assert(await page.getByRole('link',{name:label,exact:true}).evaluate(el=>el===document.activeElement),'Keyboard order: '+label);
  }
  await page.goto(base+'/');
  await page.getByRole('button',{name:'Reading preferences',exact:true}).click();
  await page.getByLabel('Larger text',{exact:true}).check();await page.getByLabel('Higher contrast',{exact:true}).check();await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.goto(base+'/welcome');await page.setViewportSize({width:320,height:568});
  const prefs=await page.evaluate(()=>({reading:document.documentElement.dataset.reading,contrast:document.documentElement.dataset.contrast}));
  assert(prefs.reading==='large'&&prefs.contrast==='high','App preferences carry into the start screen');
  await page.getByRole('link',{name:'Plan a trip',exact:true}).focus();
  const high=await scan();assert(high.content<=320&&!high.violations.length,'320px start screen supports large text, high contrast, and visible keyboard focus');
  await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert(await page.locator('.welcome-tile').evaluateAll(tiles=>tiles.every(tile=>tile.scrollWidth<=tile.clientWidth&&tile.scrollHeight<=tile.clientHeight)),'200% text remains inside each tile without truncation');
  await page.evaluate(()=>localStorage.removeItem('fieldlens.journey.preferences.v1'));
  await page.goto(base+'/project');await page.evaluate(()=>document.documentElement.style.fontSize='32px');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Project page reflows at 200% text and 320px width');
  await page.goto(base+'/project');
  await page.locator('.primary-link').first().click();assert(page.url()===base+'/welcome','Project call to action opens the four-block start screen');
  const destinations=[['Plan a trip','overview'],['Talk to FieldLens','voice-assistant'],['Check conditions','overview'],['Bus alerts','transit']];
  for(const [label,id] of destinations){
    await page.goto(base+'/welcome');await page.getByRole('link',{name:label,exact:true}).click();await page.locator('#'+id).waitFor();
    assert(page.url()===base+'/#'+id,label+' opens the correct existing app section');
    assert(await page.locator('#'+id).evaluate(el=>el===document.activeElement),'Arrival focus reaches '+id);
  }
  assert(!requests.some(r=>r.method==='POST'),'Navigation never records audio or requests speech');
  const noJs=await page.context().browser().newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  try{const fallback=await noJs.newPage();await fallback.goto(base+'/welcome');assert(await fallback.getByRole('link').count()===4,'Four static links remain available without JavaScript');await fallback.goto(base+'/project');assert(await fallback.locator('h1').innerText()==='Before you go,\nknow more.','Project information remains available without JavaScript');}finally{await noJs.close();}
  await page.goto(base+'/project');await page.emulateMedia({reducedMotion:'reduce'});assert(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior)==='auto','Project honors reduced-motion preferences');
  assert(errors.length===0,'No browser runtime errors: '+JSON.stringify(errors));
  return {checks,scans,noAudioRequests:true};
}
