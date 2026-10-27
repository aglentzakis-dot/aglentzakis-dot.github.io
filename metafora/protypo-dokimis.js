// Δοκιμή 83 (1.9.75): μεταφορά από την παλιά κοινή διεύθυνση (aglentzakis-dot.github.io) στο tameia.glenapps.gr
// μέσα από τη σελίδα «Μεταφορά στοιχείων» — μόνο τα στοιχεία των Ταμείων, επιβεβαίωση, σβήσιμο από την παλιά μνήμη, λωρίδα «μετακόμισαν».
const { chromium } = require('/opt/npm-tools/node_modules/playwright');const fs=require('fs'),path=require('path');
const APP=fs.realpathSync('/home/claude/www/tameia'),BR=__dirname+'/../metafora';
const mime=f=>/\.js$/.test(f)?'text/javascript':/\.css$/.test(f)?'text/css':/\.json$/.test(f)?'application/json':/\.png$/.test(f)?'image/png':/\.html?$/.test(f)?'text/html':'application/octet-stream';
(async()=>{const R={},PASS={},errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
try{
const ctx=await b.newContext({viewport:{width:390,height:850},serviceWorkers:'block',locale:'el-GR'});
const serve=async(route,file,body)=>{if(body!=null)return route.fulfill({status:200,contentType:mime(file),body});if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:'nf'});return route.fulfill({status:200,contentType:mime(file),body:fs.readFileSync(file)})};
await ctx.route('https://aglentzakis-dot.github.io/**',r=>{const u=new URL(r.request().url());let p=decodeURIComponent(u.pathname);
  if(p.startsWith('/tameia/'))return serve(r,path.join(APP,p.slice(8)||'index.html'));
  if(p.startsWith('/metafora/')){const f=p.slice(10)||'index.html';if(f==='efarmoges-metaforas.json'){const j=JSON.parse(fs.readFileSync(BR+'/'+f,'utf8'));return serve(r,f,JSON.stringify(j))}return serve(r,path.join(BR,f))}
  return r.fulfill({status:404,body:'nf'})});
await ctx.route('https://tameia.glenapps.gr/**',r=>{const p=decodeURIComponent(new URL(r.request().url()).pathname);return serve(r,path.join(APP,p==='/'?'index.html':p.slice(1)))});
await ctx.route(/googleapis|accounts\.google|jsdelivr|emailjs|web3forms/,r=>r.fulfill({status:404,body:''}));
// --- 1. παλιά διεύθυνση: στοιχεία Ταμείων + άλλης εφαρμογής + αντίγραφο στη συσκευή
const old=await ctx.newPage();old.on('pageerror',e=>errs.push('old:'+e.message));old.on('dialog',x=>x.accept());
await old.goto('https://aglentzakis-dot.github.io/tameia/index.html');await old.waitForTimeout(1800);
R.seed=await old.evaluate(async()=>{window.checkDue=()=>{};setBook("personal");pMigrate();bkStore("personal").name="Σπίτι";
  for(let i=0;i<7;i++)PB().ent.push({id:"m"+i,dir:"out",kind:"market",amount:10+i,date:new Date().toISOString()});persist();
  localStorage.setItem("glenread-foo","ΑΛΛΗ ΕΦΑΡΜΟΓΗ");localStorage.setItem("glenapps-kleidi",JSON.stringify({k:"GA2-δοκιμή"}));
  const root=await navigator.storage.getDirectory(),d=await root.getDirectoryHandle("antigrafa-tameia",{create:true}),h=await d.getFileHandle("tameia-2026-10-20.json",{create:true}),w=await h.createWritable();await w.write('{"x":1}');await w.close();
  return{n:PB().ent.length,ls:localStorage.getItem("tameia-v1").length}});
R.bar=await old.evaluate(()=>!!document.getElementById("movedBar"));
// --- 2. σελίδα μεταφοράς
const br=await ctx.newPage();br.on('pageerror',e=>errs.push('br:'+e.message));br.on('dialog',x=>x.accept());
await br.goto('https://aglentzakis-dot.github.io/metafora/');await br.waitForTimeout(800);
R.list=await br.evaluate(()=>document.querySelector('#list').innerText.slice(0,300));
const [pop]=await Promise.all([ctx.waitForEvent('page'),br.click('[data-tr="tameia"]')]);pop.on('pageerror',e=>errs.push('new:'+e.message));pop.on('dialog',x=>x.accept());
await pop.waitForTimeout(2500);R.ask=await pop.evaluate(()=>document.body.innerText.match(/Ήρθαν[^\n]*/)?.[0]||"");
await pop.screenshot({path:'shots/d83-nea.png'});
await pop.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==="Αποθήκευση").click()});await pop.waitForTimeout(1200);
R.bridgeMsg=await br.evaluate(()=>document.querySelector('#mn').textContent);
await pop.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent==="Άνοιγμα").click()});await pop.waitForTimeout(2500);
R.newData=await pop.evaluate(async()=>{const root=await navigator.storage.getDirectory();let f=false;try{const d=await root.getDirectoryHandle("antigrafa-tameia");await d.getFileHandle("tameia-2026-10-20.json");f=true}catch(e){}
  return{name:bkName("personal"),n:(S.personal||[]).length,other:localStorage.getItem("glenread-foo"),kleidi:!!localStorage.getItem("glenapps-kleidi"),opfs:f,url:APP_URL}});
// --- 3. σβήσιμο από την παλιά μνήμη
await br.click('[data-wp="tameia"]');await br.waitForTimeout(1200);
R.after=await br.evaluate(async()=>{const root=await navigator.storage.getDirectory();let f=true;try{await root.getDirectoryHandle("antigrafa-tameia")}catch(e){f=false}
  return{v1:localStorage.getItem("tameia-v1"),other:localStorage.getItem("glenread-foo"),kleidi:!!localStorage.getItem("glenapps-kleidi"),opfsDir:f,chips:document.querySelector('#list').innerText.match(/Σβήστηκε[^\n]*/)?.[0]}});
await br.screenshot({path:'shots/d83-gefyra.png',fullPage:true});
PASS.seed=R.seed.n>=7&&R.bar;
PASS.transfer=/Ήρθαν/.test(R.ask)&&/μεταφέρθηκαν/.test(R.bridgeMsg)&&R.newData.name==="Σπίτι"&&R.newData.n>=7&&R.newData.other===null&&R.newData.kleidi&&R.newData.opfs&&R.newData.url==="https://tameia.glenapps.gr/";
PASS.wipe=R.after.v1===null&&R.after.other==="ΑΛΛΗ ΕΦΑΡΜΟΓΗ"&&R.after.kleidi&&!R.after.opfsDir&&!!R.after.chips;
PASS.noErrors=errs.filter(e=>!/ServiceWorker|service worker/i.test(e)).length===0;
}catch(e){R.err=String(e)}
console.log(JSON.stringify({R,PASS,errs},null,1));await b.close()})();
