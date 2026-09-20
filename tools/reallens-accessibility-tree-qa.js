async (page) => {
 const base=await page.evaluate(()=>location.origin),checks=[];
 const cdp=await page.context().newCDPSession(page);
 await page.goto(base+'/demo');
 let result=await cdp.send('Accessibility.getFullAXTree');
 const welcome=result.nodes.find(node=>node.role?.value==='link'&&node.name?.value==='RealLens Open home');
 if(!welcome?.description?.value.includes('four actions'))throw Error('White welcome description missing from accessibility tree');
 checks.push('White welcome exposes its name, link role and action description');
 await page.goto(base+'/welcome');result=await cdp.send('Accessibility.getFullAXTree');
 for(const name of ['Plan a trip','Talk to RealLens','Check conditions','Bus alerts']){
  const link=result.nodes.find(node=>node.role?.value==='link'&&node.name?.value===name);
  if(!link?.description?.value)throw Error(name+' lacks an accessible description');
  checks.push({name,description:link.description.value});
 }
 await cdp.detach();return {passed:checks.length,checks};
}
