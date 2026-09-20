async (page) => {
  const errors=[],audio=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/api/voice')&&r.method()==='POST')audio.push(true);});
  const rtsResponse=page.waitForResponse(r=>r.url().endsWith('/api/transit'),{timeout:35000});
  await page.goto('https://fieldlens-pi.vercel.app/#transit');
  const response=await rtsResponse,data=await response.json();
  if(response.status()!==200||data.status!=='available'||!Array.isArray(data.notices))throw Error('Live RTS source unavailable');
  await page.waitForFunction(()=>document.querySelector('#transit-badge')?.textContent==='RTS source checked');
  const before=await page.locator('#transit-freshness').textContent(),start=Date.now();
  await page.waitForFunction(old=>document.querySelector('#transit-freshness').textContent!==old,before,{timeout:40000});
  const automaticMs=Date.now()-start,after=await page.locator('#transit-freshness').textContent();
  if(automaticMs<12000||!after.includes('Last successful RTS source check:'))throw Error('No verified normal-cycle RTS source-check advance');
  await page.getByLabel('Automatically check RTS posts',{exact:true}).uncheck();
  await page.getByLabel('Filter by route number (optional)',{exact:true}).fill('11');await page.getByRole('button',{name:'Apply route filter',exact:true}).click();
  await page.getByText('Type a request or see supported commands',{exact:true}).click();await page.getByLabel('Trip or briefing question',{exact:true}).fill('bus alerts for route eleven');await page.getByRole('button',{name:'Send request',exact:true}).click();
  if(!(await page.locator('#voice-reply').innerText()).includes('RTS published rider information for the Route 11 filter'))throw Error('Live typed RTS command failed');
  if(await page.locator('#brief-title').count())throw Error('Bus query unexpectedly prepared a walking journey');
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const scans=[];
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await page.locator('#transit').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    const r=await page.evaluate(async()=>({width:innerWidth,content:document.documentElement.scrollWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id)}));
    if(r.content>r.width||r.violations.length)throw Error(JSON.stringify(r));scans.push(r);
    await page.screenshot({path:`output/playwright/rts-production-${width}.png`});
  }
  const voice=await(await page.request.get('https://fieldlens-pi.vercel.app/api/voice')).json();
  if(audio.length||errors.length)throw Error(JSON.stringify({audioRequests:audio.length,errors}));
  return {status:response.status(),posts:data.notices.length,route11Posts:data.notices.filter(n=>n.routes.includes('11')).map(n=>({id:n.id,title:n.title,postedAt:n.postedAt,modifiedAt:n.modifiedAt})),before,after,automaticMs,voiceConfigured:voice.configured,typedVoiceCommand:true,scans,audioRequests:audio.length,errors,liveSources:true};
}
