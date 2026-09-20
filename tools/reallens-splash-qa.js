async (page) => {
 const base=await page.evaluate(()=>location.origin),requests=[],errors=[],checks=[];
 const assert=(ok,message)=>{if(!ok)throw Error(message);checks.push(message);};
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>localStorage.setItem('reallens.narration.v1','off'));
 page.on('request',request=>{if(request.url().includes('/api/'))requests.push(request.url());});
 await page.goto(base+'/');
 await page.locator('.primary-link').first().click();await page.waitForURL('**/demo');
 const start=Date.now();
 assert(await page.getByRole('link',{name:'RealLens Open home',exact:true}).isVisible(),'Accessible icon link remains available on white screen');
 assert((await page.locator('#demo-hint').textContent()).includes('automatically in two seconds'),'Screen-reader hint explains automatic transition');
 await page.waitForURL('**/welcome');
 const elapsed=Date.now()-start;
 assert(elapsed>=1000&&elapsed<=3000,'Auto-advance occurs in 1–3 seconds: '+elapsed+'ms');
 assert(await page.locator('.welcome-tile').count()===4,'Automatic destination is the four-block home');
 await page.goBack();await page.waitForTimeout(2200);
 assert(await page.evaluate(()=>location.pathname)==='/','Back returns to product intro without a splash loop');
 await page.locator('.primary-link').first().click();await page.waitForURL('**/demo');
 const clickedAt=Date.now();
 await page.getByRole('link',{name:'RealLens Open home',exact:true}).click();await page.waitForURL('**/welcome');
 assert(Date.now()-clickedAt<1500,'Clicking the icon still continues immediately');
 await page.goBack();assert(await page.evaluate(()=>location.pathname)==='/','Immediate icon continuation also avoids a Back loop');
 assert(requests.length===0,'Entry flow makes no data or microphone API requests');
 assert(errors.length===0,'No browser JavaScript errors');
 return {passed:checks.length,elapsed,checks};
}
