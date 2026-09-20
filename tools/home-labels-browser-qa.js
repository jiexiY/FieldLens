async (page) => {
  const base=await page.evaluate(()=>location.origin),errors=[],posts=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.method()==='POST')posts.push(request.url());});
  const cdp=await page.context().newCDPSession(page);
  const output=[];
  try{
    for(const [path,selector,labels] of [
      ['/welcome','.welcome-tile',['Plan a trip','Talk to FieldLens','Check conditions','Bus alerts']],
      ['/','.home-action',['Plan a journey','Talk to FieldLens','Campus notices','Explore a place']]
    ]){
      await page.goto(base+path);await page.locator(selector).first().waitFor();
      await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
      const tree=await cdp.send('Accessibility.getFullAXTree');
      if(!tree.nodes.some(n=>!n.ignored&&n.role?.value==='group'&&n.name?.value==='Home actions'))throw Error('Missing named group on '+path);
      if(path==='/welcome'&&!tree.nodes.some(n=>!n.ignored&&n.role?.value==='main'&&n.name?.value==='FieldLens home'))throw Error('Missing home landmark');
      const links=[];
      for(const label of labels){
        const node=tree.nodes.find(n=>!n.ignored&&n.role?.value==='link'&&n.name?.value===label);
        if(!node?.description?.value)throw Error('Missing computed name or description for '+label);
        links.push({name:node.name.value,description:node.description.value});
      }
      for(const width of [1440,390,320]){
        await page.setViewportSize({width,height:844});
        const result=await page.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,violations:(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>v.id)}));
        if(result.overflow||result.violations.length)throw Error(JSON.stringify({path,width,...result}));
      }
      if(path==='/welcome'){
        if(await page.getByRole('link').count()!==4)throw Error('Extra start-screen controls');
        await page.reload();
        for(const label of labels){await page.keyboard.press('Tab');if(!await page.getByRole('link',{name:label,exact:true}).evaluate(el=>el===document.activeElement))throw Error('Keyboard order '+label);}
        if(await page.locator('[id$="-hint"]').evaluateAll(els=>els.some(el=>el.getClientRects().length)))throw Error('Hidden descriptions became visible');
      }
      await page.screenshot({path:'output/playwright/'+(path==='/welcome'?'start':'home')+'-screen-reader-labels.png'});
      output.push({path,links});
    }
    if(posts.length||errors.length)throw Error(JSON.stringify({posts,errors}));
    return {pages:output,checks:'Computed browser accessibility names/descriptions, grouping, keyboard order, 1440/390/320px axe scans; no audio requests',participantTesting:false};
  }finally{await cdp.detach();}
}
