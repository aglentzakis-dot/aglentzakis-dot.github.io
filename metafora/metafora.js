/*
  GlenApps — «Μεταφορά στοιχείων» (aglentzakis-dot.github.io/metafora/)
  © 2026 Ανδρέας Μ. Γλεντζάκης (Andreas M. Glentzakis). Με την επιφύλαξη παντός δικαιώματος. All rights reserved.

  Όλες οι εφαρμογές στην παλιά κοινή διεύθυνση μοιράζονταν την ίδια μνήμη του φυλλομετρητή. Αυτή η σελίδα βλέπει αυτή
  τη μνήμη και στέλνει τα στοιχεία κάθε εφαρμογής ΜΟΝΟ στη νέα της διεύθυνση (όπως ορίζει το efarmoges-metaforas.json),
  με επιβεβαίωση του χρήστη. Τίποτα δεν σβήνεται χωρίς ρητή εντολή, και πρώτα πρέπει η νέα εφαρμογή να επιβεβαιώσει ότι τα παρέλαβε.
  Δεν φορτώνει τίποτα από τρίτους· δεν στέλνει τίποτα σε διακομιστή.
*/
(function(){
"use strict";
var $=function(s){return document.querySelector(s)};
var REG=null,INV=null,ST_KEY="glenapps-metafora-katastasi";
function st(){try{return JSON.parse(localStorage.getItem(ST_KEY)||"{}")||{}}catch(e){return{}}}
function stSet(id,o){var s=st();s[id]=Object.assign(s[id]||{},o);try{localStorage.setItem(ST_KEY,JSON.stringify(s))}catch(e){}}
function esc(t){return String(t==null?"":t).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function pl(n,a,b){return n+" "+(n===1?a:b)}
function kb(n){return n>=1048576?(Math.round(n/104857.6)/10).toLocaleString("el-GR")+" MB":Math.max(1,Math.round(n/1024))+" KB"}
function when(t){return t?new Date(t).toLocaleString("el-GR",{day:"numeric",month:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"}):""}
function note(t,bad){var n=$("#mn");n.textContent=t;n.className="mn"+(bad?" bad":"");n.hidden=!t;if(t)n.scrollIntoView({block:"nearest",behavior:"smooth"})}
var starts=function(k,list){return(list||[]).some(function(p){return k===p||k.indexOf(p)===0})};

// ---------- απογραφή της παλιάς μνήμης ----------
async function opfsList(){var out=[];try{var root=await navigator.storage.getDirectory();
  async function walk(dir,pre){for await(var [name,h] of dir.entries()){if(h.kind==="directory")await walk(h,pre+name+"/");else{var f=await h.getFile();out.push({path:pre+name,size:f.size})}}}
  await walk(root,"")}catch(e){}return out}
async function idbList(){try{if(indexedDB.databases)return(await indexedDB.databases()).map(function(d){return d.name}).filter(Boolean)}catch(e){}return null}
async function inventory(){var ls=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k===ST_KEY)continue;var v=localStorage.getItem(k)||"";ls.push({k:k,size:(k.length+v.length)*2})}
  INV={ls:ls,idb:await idbList(),opfs:await opfsList()};return INV}
function itemsOf(a){var ls=INV.ls.filter(function(x){return starts(x.k,a.ls)}),idb=(INV.idb||[]).filter(function(n){return(a.idb||[]).indexOf(n)>=0}),
  opfs=INV.opfs.filter(function(f){return starts(f.path,a.opfs)});
  return{ls:ls,idb:idb,opfs:opfs,size:ls.reduce(function(s,x){return s+x.size},0)+opfs.reduce(function(s,x){return s+x.size},0),n:ls.length+idb.length+opfs.length}}
function leftovers(){var all=REG.apps,koina=(REG.koina&&REG.koina.ls)||[];
  return{ls:INV.ls.filter(function(x){return!all.some(function(a){return starts(x.k,a.ls)})}),
    idb:(INV.idb||[]).filter(function(n){return!all.some(function(a){return(a.idb||[]).indexOf(n)>=0})}),
    opfs:INV.opfs.filter(function(f){return!all.some(function(a){return starts(f.path,a.opfs)})}),koina:koina}}

// ---------- ανάγνωση IndexedDB ----------
function idbOpenExisting(name){return new Promise(function(res,rej){var r=indexedDB.open(name);r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)};r.onupgradeneeded=function(){r.transaction.abort()}})}
async function idbDump(name){var db=await idbOpenExisting(name),stores=[],recs={};
  for(var i=0;i<db.objectStoreNames.length;i++){var sn=db.objectStoreNames[i];
    await new Promise(function(res,rej){var t=db.transaction(sn,"readonly"),o=t.objectStore(sn),idx=[];
      for(var j=0;j<o.indexNames.length;j++){var x=o.index(o.indexNames[j]);idx.push({name:x.name,keyPath:x.keyPath,unique:x.unique,multiEntry:x.multiEntry})}
      stores.push({name:sn,keyPath:o.keyPath,autoIncrement:o.autoIncrement,indexes:idx});var list=recs[sn]=[];
      var c=o.openCursor();c.onsuccess=function(){var cur=c.result;if(cur){list.push([cur.primaryKey,cur.value]);cur.continue()}};t.oncomplete=res;t.onerror=function(){rej(t.error)}})}
  var v=db.version;db.close();return{name:name,version:v,stores:stores,recs:recs}}
async function opfsBlob(path){var parts=path.split("/"),dir=await navigator.storage.getDirectory();for(var i=0;i<parts.length-1;i++)dir=await dir.getDirectoryHandle(parts[i]);return(await dir.getFileHandle(parts[parts.length-1])).getFile()}

// ---------- μεταφορά σε νέο παράθυρο ----------
var busy=false;
function transfer(a){if(busy)return;var origin=new URL(a.nea).origin;
  if(!/^https:\/\/([a-z0-9-]+\.)?glenapps\.gr$/.test(origin)){note("Λάθος νέα διεύθυνση στο μητρώο.",true);return}
  var w=window.open(a.nea+"#glenapps-metafora","glenmetafora-"+a.id);
  if(!w){note("Ο φυλλομετρητής δεν άφησε να ανοίξει νέο παράθυρο. Επίτρεψε τα αναδυόμενα για αυτή τη σελίδα και ξαναπάτα.",true);return}
  busy=true;note("Άνοιξε η νέα διεύθυνση των «"+a.onoma+"». Περιμένω να απαντήσει…");
  var timer=setTimeout(function(){finish();note("Η νέα διεύθυνση δεν απάντησε. Ίσως δεν έχει ακόμα τον παραλήπτη μεταφοράς ή δεν λειτουργεί ακόμα. Δοκίμασε «Αρχείο μεταφοράς».",true)},45000);
  function finish(){busy=false;clearTimeout(timer);window.removeEventListener("message",on)}
  async function send(thelo){var post=function(m){m.glenapps="metafora";m.app=a.id;w.postMessage(m,origin)};
    var wantLs=(thelo&&thelo.ls)||[],wantIdb=(thelo&&thelo.idb)||[],wantOpfs=(thelo&&thelo.opfs)||[];
    post({typos:"arxi"});
    var items={};INV.ls.forEach(function(x){if(starts(x.k,wantLs))items[x.k]=localStorage.getItem(x.k)});post({typos:"ls",items:items});
    for(var i=0;i<wantIdb.length;i++){if(INV.idb&&INV.idb.indexOf(wantIdb[i])<0)continue;var d=await idbDump(wantIdb[i]);
      post({typos:"idb",name:d.name,version:d.version,stores:d.stores});
      for(var s in d.recs){var r=d.recs[s];for(var j=0;j<r.length;j+=300)post({typos:"idbrec",name:d.name,store:s,recs:r.slice(j,j+300)})}}
    var files=INV.opfs.filter(function(f){return starts(f.path,wantOpfs)});for(var k=0;k<files.length;k++)post({typos:"opfs",path:files[k].path,blob:await opfsBlob(files[k].path)});
    post({typos:"telos"});note("Τα στοιχεία στάλθηκαν. Πάτα «Αποθήκευση» στη νέα διεύθυνση.")}
  function on(ev){if(ev.origin!==origin||ev.source!==w)return;var d=ev.data;if(!d||d.glenapps!=="metafora"||d.app!==a.id)return;
    if(d.typos==="etoimos"){clearTimeout(timer);timer=setTimeout(function(){finish();note("Δεν ήρθε επιβεβαίωση. Αν στη νέα διεύθυνση φάνηκαν τα στοιχεία, ξαναπάτα «Μεταφορά» για να το επιβεβαιώσει.",true)},600000);
      send(d.thelo).catch(function(e){finish();note("Σφάλμα στην αποστολή: "+(e&&e.message||e),true)})}
    else if(d.typos==="ok"){finish();stSet(a.id,{metaferthike:Date.now(),pire:d.pire});draw();note("✓ Τα «"+a.onoma+"» μεταφέρθηκαν στη νέα διεύθυνση. Άνοιξέ τα εκεί και έλεγξε ότι φαίνονται όλα· μετά πάτα «Σβήσε από την παλιά μνήμη».")}
    else if(d.typos==="akyro"){finish();note(d.keno?"Η νέα διεύθυνση δεν βρήκε στοιχεία για μεταφορά.":"Η μεταφορά ακυρώθηκε στη νέα διεύθυνση. Δεν άλλαξε τίποτα.",!d.keno)}
    else if(d.typos==="lathos"){finish();note("⚠ Η νέα διεύθυνση δεν μπόρεσε να αποθηκεύσει: "+String(d.lathos||"").slice(0,200)+". Τα παλιά δεν πειράχτηκαν.",true)}}
  window.addEventListener("message",on)}

// ---------- αρχείο μεταφοράς (εναλλακτικά) ----------
function b64(blob){return new Promise(function(res){var r=new FileReader();r.onload=function(){res(String(r.result).split(",")[1]||"")};r.readAsDataURL(blob)})}
async function pack(v){if(typeof CryptoKey!=="undefined"&&v instanceof CryptoKey)return null; /* κλειδί συσκευής: δεν μπαίνει σε αρχείο — στη νέα διεύθυνση ζητείται ξανά ο κωδικός */
  if(v instanceof Blob)return{__blob:{type:v.type,b64:await b64(v)}};if(v instanceof Date)return{__date:v.toISOString()};
  if(v&&typeof v==="object"){if(Array.isArray(v)){var a=[];for(var i=0;i<v.length;i++)a.push(await pack(v[i]));return a}var o={};for(var k in v)o[k]=await pack(v[k]);return o}return v}
async function fileOut(a){note("Ετοιμάζω το αρχείο…");var it=itemsOf(a),koina=(REG.koina&&REG.koina.ls)||[],ls={};
  INV.ls.forEach(function(x){if(starts(x.k,a.ls)||starts(x.k,koina))ls[x.k]=localStorage.getItem(x.k)});
  var idb=[];for(var i=0;i<it.idb.length;i++){var d=await idbDump(it.idb[i]);var recs={};for(var s in d.recs)recs[s]=await pack(d.recs[s]);idb.push({name:d.name,version:d.version,stores:d.stores,recs:recs})}
  var opfs=[];for(var j=0;j<it.opfs.length;j++){var b=await opfsBlob(it.opfs[j].path);opfs.push({path:it.opfs[j].path,type:b.type,b64:await b64(b)})}
  var blob=new Blob([JSON.stringify({glenapps:"metafora-arxeio",app:a.id,dimiourgia:new Date().toISOString(),ls:ls,idb:idb,opfs:opfs})],{type:"application/json"});
  var u=URL.createObjectURL(blob),l=document.createElement("a");l.href=u;l.download="metafora-"+a.id+"-"+new Date().toISOString().slice(0,10)+".json";document.body.appendChild(l);l.click();l.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);
  stSet(a.id,{arxeio:Date.now()});draw();
  note("✓ Κατέβηκε το αρχείο μεταφοράς. Άνοιξε τη νέα διεύθυνση με «#glenapps-metafora» στο τέλος ("+a.nea+"#glenapps-metafora) και διάλεξέ το εκεί. ⚠ Το αρχείο έχει τα στοιχεία χωρίς κωδικό: σβήσ' το μόλις τελειώσεις.")}

// ---------- σβήσιμο από την παλιά μνήμη ----------
async function wipe(a,items){var n=0;
  (items.ls||[]).forEach(function(k){try{localStorage.removeItem(k);n++}catch(e){}});
  for(var i=0;i<(items.idb||[]).length;i++){await new Promise(function(res){var r=indexedDB.deleteDatabase(items.idb[i]);r.onsuccess=r.onerror=r.onblocked=function(){res()}});n++}
  if((items.opfs||[]).length){var root=await navigator.storage.getDirectory();
    for(var j=0;j<items.opfs.length;j++){try{var parts=items.opfs[j].split("/"),dir=root;for(var x=0;x<parts.length-1;x++)dir=await dir.getDirectoryHandle(parts[x]);await dir.removeEntry(parts[parts.length-1]);n++}catch(e){}}
    // άδειοι φάκελοι της εφαρμογής
    for(var p=0;p<(a.opfs||[]).length;p++){var pre=a.opfs[p];if(pre.slice(-1)==="/"){try{await root.removeEntry(pre.slice(0,-1))}catch(e){} /* μόνο αν άδειασε */}}}
  if(a){try{var regs=await navigator.serviceWorker.getRegistrations();for(var r=0;r<regs.length;r++){if(new URL(regs[r].scope).pathname.indexOf(a.palia)===0)await regs[r].unregister()}}catch(e){}
    try{var ks=await caches.keys();for(var c=0;c<ks.length;c++){if(a.cache&&ks[c].indexOf(a.cache)===0)await caches.delete(ks[c])}}catch(e){}}
  return n}
async function wipeApp(a){var s=st()[a.id]||{},it=itemsOf(a),done=!!s.metaferthike;
  if(!done&&!s.arxeio){note("Πρώτα κάνε «Μεταφορά» ή κατέβασε «Αρχείο μεταφοράς». Δεν σβήνω στοιχεία που δεν έχουν φυλαχτεί αλλού.",true);return}
  var msg=done?"Τα «"+a.onoma+"» μεταφέρθηκαν στις "+when(s.metaferthike)+".\n\nΆνοιξες τη νέα διεύθυνση και είδες ότι είναι όλα εκεί;\n\nΑν ναι, να σβηστούν οριστικά από την παλιά μνήμη αυτού του κινητού;"
    :"Δεν έγινε μεταφορά — υπάρχει μόνο το «Αρχείο μεταφοράς».\n\nΑν σβηστούν τώρα, θα μείνουν ΜΟΝΟ σε εκείνο το αρχείο. Είσαι σίγουρος;";
  if(!confirm(msg))return;if(!done&&!confirm("Τελευταία επιβεβαίωση: οριστικό σβήσιμο των «"+a.onoma+"» από την παλιά μνήμη;"))return;
  // σβήνεται ΜΟΝΟ ό,τι παρέλαβε η νέα εφαρμογή (ή ό,τι μπήκε στο αρχείο)· τα κοινά κλειδιά μένουν για τις άλλες εφαρμογές
  var p=s.pire||{},koina=(REG.koina||{}).ls||[],items=done?{ls:(p.ls||[]).filter(function(k){return!starts(k,koina)}),idb:p.idb||[],opfs:p.opfs||[]}
    :{ls:it.ls.map(function(x){return x.k}),idb:it.idb,opfs:it.opfs.map(function(f){return f.path})};
  items.ls=items.ls.filter(function(k,i,arr){return arr.indexOf(k)===i&&localStorage.getItem(k)!=null});
  // κοινά με άλλη εφαρμογή (π.χ. ΦωτοΜέτρα μέσα στο Δρομολόγιο) μένουν μέχρι να μεταφερθεί κι εκείνη
  var S=st(),alles=(REG.apps||[]).filter(function(o){return o.id!==a.id&&!(S[o.id]||{}).metaferthike&&!(S[o.id]||{}).svistike}),kratithikan=[];
  items.ls=items.ls.filter(function(k){var x=alles.filter(function(o){return starts(k,o.ls)});x.forEach(function(o){if(kratithikan.indexOf(o.onoma)<0)kratithikan.push(o.onoma)});return!x.length});
  items.idb=items.idb.filter(function(nm){var x=alles.filter(function(o){return(o.idb||[]).indexOf(nm)>=0});x.forEach(function(o){if(kratithikan.indexOf(o.onoma)<0)kratithikan.push(o.onoma)});return!x.length});
  items.opfs=items.opfs.filter(function(pt){return!alles.some(function(o){return starts(pt,o.opfs)})});
  var n=await wipe(a,items);stSet(a.id,{svistike:Date.now()});await inventory();draw();note("✓ Σβήστηκαν "+pl(n,"στοιχείο","στοιχεία")+" των «"+a.onoma+"» από την παλιά μνήμη, μαζί με τη μνήμη χωρίς σύνδεση της παλιάς διεύθυνσης."+(kratithikan.length?" Κρατήθηκαν όσα είναι κοινά με: "+kratithikan.join(", ")+" — σβήνονται όταν μεταφερθεί κι εκείνη.":""))}
async function wipeAll(){var L=leftovers(),allLs=INV.ls.map(function(x){return x.k});
  if(!confirm("ΟΡΙΣΤΙΚΟ ΣΒΗΣΙΜΟ ΟΛΩΝ όσων έχουν μείνει στην παλιά μνήμη αυτού του κινητού ("+(allLs.length+(INV.idb||[]).length+INV.opfs.length)+" στοιχεία).\n\nΚάν' το ΜΟΝΟ αφού μεταφέρθηκαν όλες οι εφαρμογές που χρησιμοποιείς. Συνέχεια;"))return;
  if(prompt("Γράψε ΣΒΗΣΕ για επιβεβαίωση:")!=="ΣΒΗΣΕ"){note("Δεν σβήστηκε τίποτα.");return}
  await wipe(null,{ls:allLs,idb:INV.idb||[],opfs:INV.opfs.map(function(f){return f.path})});
  try{var root=await navigator.storage.getDirectory();for await(var [nm] of root.entries()){try{await root.removeEntry(nm,{recursive:true})}catch(e){}}}catch(e){}
  try{var regs=await navigator.serviceWorker.getRegistrations();for(var r=0;r<regs.length;r++)await regs[r].unregister()}catch(e){}
  try{var ks=await caches.keys();for(var c=0;c<ks.length;c++)await caches.delete(ks[c])}catch(e){}
  try{localStorage.removeItem(ST_KEY)}catch(e){}await inventory();draw();note("✓ Η παλιά μνήμη αυτού του κινητού άδειασε. Μπορείς να κλείσεις αυτή τη σελίδα.")}

// ---------- εμφάνιση ----------
function draw(){var s=st(),h="";
  REG.apps.forEach(function(a){var it=itemsOf(a),x=s[a.id]||{},has=it.n>0;
    var chips=(x.metaferthike?'<span class="ok">✓ Μεταφέρθηκε '+esc(when(x.metaferthike))+'</span>':"")+(x.svistike?'<span class="ok">✓ Σβήστηκε από την παλιά μνήμη</span>':"")+(x.arxeio&&!x.metaferthike?'<span>📄 Αρχείο '+esc(when(x.arxeio))+'</span>':"")+(!a.etoimo?'<span class="wait">Η νέα διεύθυνση δεν είναι ακόμα έτοιμη</span>':'<span class="ok">Η νέα διεύθυνση λειτουργεί</span>');
    h+='<div class="app'+(has?"":" empty")+'"><div class="hd"><b>'+esc(a.icon)+" "+esc(a.onoma)+'</b><small>'+esc(a.nea.replace(/^https:\/\//,"").replace(/\/$/,""))+'</small></div>'+
      '<div class="info">'+(has?"Στην παλιά μνήμη: "+[it.ls.length?pl(it.ls.length,"στοιχείο","στοιχεία"):"",it.idb.length?pl(it.idb.length,"βάση","βάσεις"):"",it.opfs.length?pl(it.opfs.length,"αρχείο","αρχεία"):""].filter(Boolean).join(", ")+" · "+kb(it.size):(x.svistike?"Η παλιά μνήμη είναι καθαρή.":"Δεν βρέθηκαν στοιχεία σε αυτό το κινητό."))+'</div>'+
      (chips?'<div class="chips">'+chips+'</div>':"")+
      (has?'<div class="bt"><button type="button" class="main" data-tr="'+esc(a.id)+'"'+(a.etoimo?"":" disabled")+'>📦 Μεταφορά</button><button type="button" data-fl="'+esc(a.id)+'">📄 Αρχείο μεταφοράς</button><button type="button" class="del" data-wp="'+esc(a.id)+'"'+(x.metaferthike||x.arxeio?"":" disabled")+'>🗑 Σβήσε από την παλιά μνήμη</button></div>':"")+'</div>'});
  $("#list").innerHTML=h;
  var L=leftovers(),n=L.ls.length+L.idb.length+L.opfs.length;
  $("#rest").innerHTML='<div class="info">'+(n?"Στοιχεία που δεν ανήκουν σε καμία εφαρμογή της λίστας (π.χ. κοινά κλειδιά, παλιές δοκιμές): "+n+". "+esc(L.ls.slice(0,12).map(function(x){return x.k}).concat(L.idb).join(", "))+(n>12?"…":""):"Δεν έμεινε τίποτα άλλο.")+
    '</div><div class="info">Σύνολο στην παλιά μνήμη: '+pl(INV.ls.length+(INV.idb||[]).length+INV.opfs.length,"στοιχείο","στοιχεία")+'.'+(INV.idb===null?" (Αυτός ο φυλλομετρητής δεν δείχνει τις βάσεις IndexedDB· χρησιμοποίησε Chrome.)":"")+'</div>'+
    '<div class="bt"><button type="button" class="del" id="wipeAll"'+(INV.ls.length+(INV.idb||[]).length+INV.opfs.length?"":" disabled")+'>🗑 Σβήσε ΟΛΑ από την παλιά μνήμη</button></div>'}
document.addEventListener("click",function(e){var b=e.target.closest("button");if(!b||b.disabled)return;
  var id=b.dataset.tr||b.dataset.fl||b.dataset.wp,a=id&&REG.apps.filter(function(x){return x.id===id})[0];
  if(b.dataset.tr&&a)transfer(a);else if(b.dataset.fl&&a)fileOut(a).catch(function(err){note("Σφάλμα: "+(err&&err.message||err),true)});
  else if(b.dataset.wp&&a)wipeApp(a).catch(function(err){note("Σφάλμα: "+(err&&err.message||err),true)});else if(b.id==="wipeAll")wipeAll()});
(async function(){try{REG=await (await fetch("efarmoges-metaforas.json",{cache:"no-store"})).json()}catch(e){note("Δεν φορτώθηκε η λίστα εφαρμογών. Έλεγξε τη σύνδεση.",true);return}
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
  await inventory();draw();
  // η νέα διεύθυνση λειτουργεί; (φορτώνει το εικονίδιό της) — μέχρι τότε η «Μεταφορά» μένει κλειστή
  REG.apps.forEach(function(a){if(!a.etoimo)return;a.etoimo=false;var im=new Image();im.onload=function(){a.etoimo=true;draw()};im.src=a.nea+(a.elegxos||"icon-192.png")+"?"+Date.now()})})();
})();
