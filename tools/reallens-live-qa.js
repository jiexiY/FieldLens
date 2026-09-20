async (page) => {
 const base=await page.evaluate(()=>location.origin),errors=[],responses=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('response',response=>{if(response.url().includes('/api/'))responses.push({path:response.url().split('/api/')[1].split('?')[0],status:response.status()});});
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/');await page.locator('.primary-link').first().locator('img').click();await page.waitForURL('**/demo');
 await page.getByRole('link',{name:'RealLens Open home'}).click();await page.waitForURL('**/welcome');
 await page.getByRole('link',{name:'Plan a trip',exact:true}).click();await page.waitForURL('**/plan');
 await page.getByRole('button',{name:'Check this trip’s conditions'}).click();await page.waitForURL('**/conditions');
 await page.locator('#brief-title').waitFor({timeout:45000});
 const conditions={title:await page.locator('#brief-title').innerText(),weather:await page.locator('.weather-section').innerText(),closureBadge:await page.locator('#closure-badge').innerText(),summary:await page.locator('.summary-text').innerText()};
 if(await page.locator('.journey-sections>li').count()!==3)throw Error('Missing real vegetation analysis');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Conditions overflow');
 await page.screenshot({path:'output/playwright/reallens-live-conditions.png',fullPage:true});
 await page.goto(base+'/bus');
 await page.waitForFunction(()=>!document.querySelector('#transit-status').textContent.includes('Checking'),{},{timeout:35000});
 const bus={status:await page.locator('#transit-status').innerText(),freshness:await page.locator('#transit-freshness').innerText(),posts:await page.locator('.transit-post').count()};
 await page.goto(base+'/talk');await page.locator('#voice-title').waitFor();
 await page.waitForFunction(()=>!document.querySelector('#voice-provider option[value="elevenlabs"]').textContent.includes('checking'),{},{timeout:10000});
 const voice=await page.locator('#voice-provider option[value="elevenlabs"]').innerText();
 await page.goto(base+'/');await page.screenshot({path:'output/playwright/reallens-live-intro.png',fullPage:true});
 if(errors.length)throw Error(errors.join('; '));
 return {base,conditions,bus,voice,responses,pageErrors:errors};
}
