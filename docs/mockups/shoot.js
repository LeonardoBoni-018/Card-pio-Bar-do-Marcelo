const {chromium}=require('/opt/node-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const shots=[['client-mobile',{width:390,height:844},2],['client-desktop',{width:1280,height:800},1],['admin-list',{width:1280,height:800},1],['admin-form',{width:1280,height:800},1]];
for(const [n,v,s] of shots){const p=await b.newPage({viewport:v,deviceScaleFactor:s});await p.goto('file://'+process.cwd()+'/'+n+'.html');await p.waitForTimeout(1500);await p.screenshot({path:n+'.png',fullPage:n.startsWith('client')});}
await b.close()})();
