async (page) => {
  await page.setViewportSize({width:320,height:844});
  await page.getByRole('button',{name:'Reading preferences',exact:true}).click();
  await page.getByLabel('Larger text',{exact:true}).check();
  await page.getByLabel('Higher contrast',{exact:true}).check();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const result=await page.evaluate(async()=>{const a=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,violations:a.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),incomplete:a.incomplete.map(v=>v.id)};});
  await page.locator('#voice-title').scrollIntoViewIfNeeded();
  await page.screenshot({path:'output/playwright/eleven-production-mobile.png'});
  if(result.scrollWidth>result.width||result.violations.length)throw Error(JSON.stringify(result));
  return result;
}
