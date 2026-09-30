(function(){
const $ = s => document.querySelector(s);
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const CUR = {USD:"$",EUR:"€",GBP:"£",JPY:"¥",CAD:"C$",AUD:"A$",MXN:"MX$"};
const money = (n,c) => (CUR[c]||"") + Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0});
const code = s => { const w=String(s||"").replace(/[^a-z ]/gi,"").trim().split(/\s+/).filter(x=>!/^(the|of|a|and)$/i.test(x)); if(!w.length) return "???"; return (w.length>=3? w.slice(0,3).map(x=>x[0]).join("") : w.join("").slice(0,3)).toUpperCase(); };
const parseD = s => { const [y,m,d] = s.slice(0,10).split("-").map(Number); return new Date(y,m-1,d); };
const fmtD = (s,o={weekday:"short",month:"short",day:"numeric"}) => parseD(s).toLocaleDateString(undefined,o);
const iso = d => d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const today = () => iso(new Date());
const localDT = d => iso(d)+"T"+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
function dayList(t){ const out=[]; if(!t.start||!t.end) return out; let d=parseD(t.start), e=parseD(t.end), n=0; while(d<=e && n<60){ out.push(iso(d)); d.setDate(d.getDate()+1); n++; } return out; }
function daysUntil(s){ const t=new Date(); t.setHours(0,0,0,0); return Math.round((parseD(s)-t)/864e5); }
const isPast = t => !!(t.end && t.end < today());
const isActive = t => !!(t.start && t.start<=today() && t.end>=today());
const range = t => !t.start ? "" : fmtD(t.start,{month:"short",day:"numeric"})+(t.end&&t.end!==t.start?" – "+fmtD(t.end,{month:"short",day:"numeric"}):"");

const I = (d,extra="") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  home: I('<path d="M2.5 20l7-12 4.5 7 2.5-3.5 5 8.5z"/><circle cx="17" cy="6" r="2"/>'),
  quests: I('<path d="M5 21V4"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>'),
  lists: I('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  passport: I('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10.5" r="3.2"/><path d="M8.8 10.5h6.4M12 7.3c-1.2 1.6-1.2 4.8 0 6.4M12 7.3c1.2 1.6 1.2 4.8 0 6.4M9 17h6"/>'),
  cam: I('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  plan: I('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  edit: I('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>',''),
  x: I('<path d="M6 6l12 12M18 6L6 18"/>'),
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  spark: I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>')
};
const LOGO = `<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M13 2c1.6 1.4 2 2.8 1.4 4.2 2-1 3.4-.6 4 .9-1 1.2-1.1 2.3-.2 3.2 1.8-.2 2.7.8 2.5 2.4-1.5.5-2 1.4-1.3 2.6-1.3 1.3-2.8 1.3-4.3.3.3 1.8-.4 3.1-2.1 3.9-1.7-.8-2.4-2.1-2.1-3.9-1.5 1-3 1-4.3-.3.7-1.2.2-2.1-1.3-2.6-.2-1.6.7-2.6 2.5-2.4.9-.9.8-2-.2-3.2.6-1.5 2-1.9 4-.9C11 4.8 11.4 3.4 13 2z" fill="var(--forest)"/><path d="M13 7v17" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round"/></svg>`;

/* ---------- landscape art: every trip gets its own scene ---------- */
function hash(s){ let h=2166136261; for(const ch of String(s)){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function rng(seed){ let a=seed||1; return ()=>{ a^=a<<13; a^=a>>>17; a^=a<<5; return ((a>>>0)%10000)/10000; }; }
const SKIES=[["#F6CF86","#E9955A"],["#CFE0DA","#F1E3C0"],["#F0B98A","#C4694C"],["#D9E4C9","#F4E7C4"],["#E8C6A8","#A9706B"]];
function scene(seed){
  const h=hash(seed), r=rng(h), sky=SKIES[h%SKIES.length], id="g"+h.toString(36);
  const ridge=(base,amp,n)=>{ const st=400/n; let d=`M0 200 L0 ${(base-amp*.2*r()).toFixed(0)}`;
    for(let i=1;i<=n;i++){ const x=i*st-st/2+(r()-.5)*st*.4, y=i%2? base-amp*(.55+.45*r()) : base-amp*.18*r(); d+=` L${x.toFixed(0)} ${y.toFixed(0)}`; }
    return d+` L400 ${(base-amp*.2*r()).toFixed(0)} L400 200Z`; };
  return `<svg class="scene" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs><rect width="400" height="200" fill="url(#${id})"/><circle cx="${(60+r()*280).toFixed(0)}" cy="${(38+r()*38).toFixed(0)}" r="${(16+r()*10).toFixed(0)}" fill="#FFF4DA" opacity=".92"/><path d="${ridge(118,70,7)}" fill="#A3B594"/><path d="${ridge(150,60,9)}" fill="#62805A"/><path d="${ridge(182,48,11)}" fill="#2F4A34"/></svg>`;
}

/* ---------- storage (same keys as before, so saved data carries over) ---------- */
const use = n => (window.claude && claude.use) ? claude.use(n).catch(()=>null) : Promise.resolve(null);
const dbP = use("db"), assetsP = use("assets"), sampleP = use("sample"), userP = use("user"), dlP = use("downloads");
let sample = null; sampleP.then(s=>{ sample=s; if(s) render(); });
let db=null, myId=null, userApi=null, dl=null;
dlP.then(d=>{ dl=d; });
const LS="waypoint-v1", LSM="waypoint-moments-v1", LSV="waypoint-view-2";
let state = { trips:[], bucket:[], been:[] };
let moments = [];
function normalize(){
  state.trips ||= []; state.bucket ||= []; state.been ||= [];
  state.checks ||= {}; state.checks.adv ||= {}; state.checks.np ||= {};
  state.quests ||= {}; state.quests.packs ||= []; state.quests.done ||= {};
  state.trips.forEach(t=>{ t.ideas ||= []; t.days ||= {}; t.pack ||= []; t.exp ||= []; t.notes ||= ""; });
}
try{ const v=localStorage.getItem(LS); if(v) state=Object.assign(state,JSON.parse(v)); }catch(e){}
try{ const v=localStorage.getItem(LSM); if(v) moments=JSON.parse(v); }catch(e){}
normalize();
const stateDoc=()=>db.doc("data/users/"+myId+"/state");
const momDoc=id=>db.doc("data/users/"+myId+"/state/moments/"+id);
const momCol=()=>db.collection("data/users/"+myId+"/state/moments");
let saveTimer=null, loaded=false;
function save(){
  if(loaded) checkBadges();
  try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){}
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{ if(db&&myId) stateDoc().set({trips:state.trips,bucket:state.bucket,been:state.been,checks:state.checks,quests:state.quests,badges:state.badges||{},v:6}).catch(()=>{}); },600);
  if(loaded){ publishBoard(); ensureGroupSubs(); }
}
function saveMomentsLocal(){ try{ localStorage.setItem(LSM, JSON.stringify(moments)); }catch(e){} }
async function putMoment(m){ saveMomentsLocal(); if(db&&myId){ try{ await momDoc(m.id).set(m); }catch(e){ toast("Saved on this device only. Sync failed."); } } }
async function dropMoment(m){ saveMomentsLocal(); if(db&&myId) momDoc(m.id).delete().catch(()=>{}); const a=await assetsP; if(a) (m.photos||[]).forEach(id=>a.delete(id).catch(()=>{})); }
(async()=>{
  const [d,u]=await Promise.all([dbP,userP]); userApi=u;
  if(u){ try{ myId=await u.id(); }catch(e){} }
  if(d&&myId){
    db=d;
    try{
      const s=await stateDoc().get();
      if(s.exists){ const x=s.data(); state={trips:x.trips||[],bucket:x.bucket||[],been:x.been||[],checks:x.checks||{},quests:x.quests||{},badges:x.badges}; normalize(); try{ localStorage.setItem(LS, JSON.stringify(state)); }catch(e){} }
      const q=await momCol().get();
      const map=new Map(moments.map(m=>[m.id,m]));
      q.docs.forEach(x=>map.set(x.id,x.data()));
      moments=[...map.values()];
      moments.forEach(m=>{ if(!q.docs.find(x=>x.id===m.id)) momDoc(m.id).set(m).catch(()=>{}); });
      saveMomentsLocal();
    }catch(e){}
  }
  loaded=true; checkBadges(); save(); startBoard(); rerender();
})();

/* ---------- view state ---------- */
let view = { tab:"home", trip:null, ttab:"plan", pack:null, qtrip:null, blist:"adv", qsearch:"", mapv:"world" };
try{ const v=JSON.parse(localStorage.getItem(LSV)||"null"); if(v){ if(["home","quests","lists","passport"].includes(v.tab)) view.tab=v.tab; if(["plan","quests","log","prep"].includes(v.ttab)) view.ttab=v.ttab; if(["adv","np","mine"].includes(v.blist)) view.blist=v.blist; } }catch(e){}
function setView(p,keep){ Object.assign(view,p); try{ localStorage.setItem(LSV,JSON.stringify({tab:view.tab,ttab:view.ttab,blist:view.blist})); }catch(e){} const y=scrollY; render(); scrollTo(0,keep?y:0); }
function rerender(){ const y=scrollY; render(); scrollTo(0,y); }
const trip = () => state.trips.find(t=>t.id===view.trip);
function toast(msg){ document.querySelectorAll(".toast").forEach(x=>x.remove()); const el=document.createElement("div"); el.className="toast"; el.setAttribute("role","status"); el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2600); }
const upcoming = () => state.trips.filter(t=>!isPast(t)).sort((a,b)=>(a.start||"9").localeCompare(b.start||"9"));
const pastTrips = () => state.trips.filter(isPast).sort((a,b)=>b.start.localeCompare(a.start));
const photoSrc=(m,i)=>[...(m.photos||[]).map(id=>blobUrl(id)),...(m.thumbs||[])][i];
const photoCount=m=>(m.photos||[]).length+(m.thumbs||[]).length;
const momentsFor=id=>moments.filter(m=>id==="none"?!state.trips.some(t=>t.id===m.trip):m.trip===id);
function cover(t){ const m=momentsFor(t.id).sort((a,b)=>b.at.localeCompare(a.at)).find(x=>photoCount(x)); return m?`<img class="scene" src="${esc(photoSrc(m,0))}" alt="">`:scene(t.id); }
function status(t){
  if(!t.start) return {short:"No dates",long:"Dates not set",cls:""};
  const dl=daysUntil(t.start), len=dayList(t).length;
  if(isActive(t)) return {short:"Now",long:`Happening now · Day ${dayList(t).indexOf(today())+1} of ${len}`,cls:"now"};
  if(dl>0) return {short:dl===1?"Tomorrow":`In ${dl}d`,long:dl===1?"Starts tomorrow":`Next up · in ${dl} days`,cls:""};
  return {short:fmtD(t.start,{month:"short",year:"numeric"}),long:"Trip complete · "+fmtD(t.start,{month:"long",year:"numeric"}),cls:""};
}

/* ================= QUEST DATA ================= */
const PACKS=[
{id:"cincy",name:"Cincinnati & Northern Kentucky",region:"USA",keys:["cincinnati","cincy","covington","newport, ky","northern kentucky","williamstown","petersburg, ky","ark encounter","creation museum"],items:[
 ["Photo with the full-size Ark at Ark Encounter","Williamstown, KY. Get the whole hull in frame from the lawn.",50],
 ["Photo with a dinosaur at the Creation Museum","Petersburg, KY. Bonus points for a matching pose.",25],
 ["Eat a Cincinnati 3-way","Chili over spaghetti, piled with shredded cheddar. Skyline or Gold Star.",10],
 ["Walk across the Roebling Suspension Bridge","Ohio to Kentucky on foot. Snap the skyline mid-bridge.",25],
 ["Grab a scoop of Graeter's","The black raspberry chocolate chip is the classic.",10],
 ["Wander Findlay Market","Ohio's oldest continuously operated public market.",10],
 ["Visit Fiona's home at the Cincinnati Zoo","Find the hippos at Hippo Cove.",25]]},
{id:"nyc",name:"New York City",region:"USA",keys:["new york","nyc","manhattan","brooklyn"],items:[
 ["Photo with the Statue of Liberty","From the ferry deck counts.",25],["Walk the Brooklyn Bridge","Start in Brooklyn so you walk toward the skyline.",25],
 ["Fold a dollar slice","Proper NYC fold, one hand.",10],["Stand in Times Square after dark","Get the billboards glowing behind you.",10],
 ["Find Bow Bridge in Central Park","",25],["Order a bagel with schmear","",10]]},
{id:"chi",name:"Chicago",region:"USA",keys:["chicago"],items:[
 ["Reflection selfie in Cloud Gate (the Bean)","Millennium Park.",10],["Eat deep-dish pizza","",10],
 ["Step onto The Ledge at Willis Tower","Glass box, 103 floors up.",50],["Chicago-style hot dog, no ketchup","",10],
 ["Take an architecture boat tour","",25],["Walk the Riverwalk at sunset","",10]]},
{id:"nash",name:"Nashville",region:"USA",keys:["nashville"],items:[
 ["Catch live music on Lower Broadway","",10],["Eat Nashville hot chicken","Go one level hotter than you'd like.",25],
 ["Photo outside the Ryman Auditorium","",10],["Find the Parthenon in Centennial Park","Full-scale replica.",25],["Pose at the angel wings mural in the Gulch","",10]]},
{id:"dc",name:"Washington, D.C.",region:"USA",keys:["washington, d","washington dc","d.c.","dc"],items:[
 ["Sit on the Lincoln Memorial steps","Look down the Reflecting Pool.",10],["Photo of the Capitol dome","",10],
 ["See the Spirit of St. Louis at Air and Space","",25],["Eat a half-smoke","Ben's Chili Bowl is the classic.",10],["Walk the full National Mall","Capitol to Lincoln, about 2 miles.",25]]},
{id:"lv",name:"Las Vegas",region:"USA",keys:["las vegas","vegas"],items:[
 ["Photo at the Welcome to Fabulous Las Vegas sign","",10],["Watch the Bellagio fountains","",10],
 ["Stand on top of Hoover Dam","Straddle Nevada and Arizona.",25],["Walk under the Fremont Street canopy","",10],["Ride the High Roller at night","",25]]},
{id:"gc",name:"Grand Canyon & the Southwest",region:"USA",keys:["grand canyon","flagstaff","page, az","sedona","williams, az"],items:[
 ["Sunrise at Mather Point","",25],["Photo from the rim at Horseshoe Bend","Stay behind the edge.",25],
 ["Tour Antelope Canyon","Guided tours only. Book ahead.",50],["Stand on a Route 66 sign corner","",10],["Hike below the rim","Even a mile down Bright Angel counts.",50]]},
{id:"yell",name:"Yellowstone",region:"USA",keys:["yellowstone","west yellowstone","jackson, wy","cody"],items:[
 ["Watch Old Faithful erupt","",10],["See Grand Prismatic from the overlook","Fairy Falls trail overlook.",25],
 ["Photograph a bison from a safe distance","25 yards minimum. Zoom in.",25],["Spot wildlife in Lamar Valley at dawn","",50],["See the Lower Falls from Artist Point","",10]]},
{id:"par",name:"Paris",region:"Europe",keys:["paris"],items:[
 ["Eiffel Tower photo from Trocadéro","",10],["Eat a croissant at a corner boulangerie","",10],
 ["Photo at the Louvre pyramid","",10],["Climb to Sacré-Cœur","Take the stairs, not the funicular.",25],["Walk along the Seine at night","",10],["Order in French","Whole order, no English.",25]]},
{id:"lon",name:"London",region:"Europe",keys:["london"],items:[
 ["Photo with Big Ben","Westminster Bridge angle.",10],["Pose in a red phone box","",10],
 ["Walk across Tower Bridge","",10],["Fish and chips in a pub","",10],["Recreate the Abbey Road crossing","Watch for real traffic.",25],["Watch the Changing of the Guard","",25]]},
{id:"rome",name:"Rome",region:"Europe",keys:["rome","roma"],items:[
 ["Photo at the Colosseum","",10],["Toss a coin into the Trevi Fountain","Right hand, over the left shoulder.",10],
 ["Eat gelato twice in one day","",10],["Look up through the Pantheon oculus","",25],["Stand in St. Peter's Square","",25],["Climb the dome of St. Peter's","",50]]},
{id:"tok",name:"Tokyo",region:"Asia",keys:["tokyo"],items:[
 ["Cross Shibuya Crossing","Then watch it from above.",10],["Visit Senso-ji in Asakusa","",10],
 ["Slurp ramen at a ticket-machine shop","",10],["Buy something odd from a vending machine","",10],["See Mount Fuji on a clear day","",50],["Soak in an onsen","",25]]},
{id:"mex",name:"Mexico City",region:"Americas",keys:["mexico city","cdmx","ciudad de méxico"],items:[
 ["Stand in the Zócalo","",10],["Eat tacos al pastor from a street stand","",10],
 ["Climb the Pyramid of the Sun at Teotihuacan","",50],["Visit Casa Azul in Coyoacán","Book tickets ahead.",25],["Ride a trajinera in Xochimilco","",25]]},
{id:"ice",name:"Iceland",region:"Europe",keys:["iceland","reykjavik","reykjavík"],items:[
 ["Walk behind Seljalandsfoss","You will get wet.",25],["Watch Strokkur erupt","",10],
 ["Photo on Reynisfjara black sand beach","Stay far back from the waves.",25],["See the northern lights","Sept to April, dark clear nights.",50],["Soak in a geothermal lagoon","",10]]},
{id:"any",name:"Anywhere Explorer",region:"Everywhere",keys:[],items:[
 ["Watch a sunrise somewhere new","",25],["Eat a dish you can't pronounce","",10],
 ["Get a local's favorite spot and go","Ask a server, driver or shopkeeper.",25],["Mail yourself a postcard","",10],
 ["Find the highest viewpoint in town","",25],["Photo of a wild animal","",25],["Swim somewhere new","",25],["Take a photo with a stranger you met","",25]]}
];
PACKS.forEach(p=>p.items=p.items.map(([title,hint,pts],i)=>({id:p.id+"-"+i,title,hint,pts})));

const GEO={"world":{"type":"Topology","objects":{"countries":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","arcs":[[[0]],[[1]]]},{"type":"Polygon","arcs":[[2,3,4,5,6,7,8,9,10]]},{"type":"Polygon","arcs":[[11,12,13,14]]},{"type":"MultiPolygon","arcs":[[[15,16,17,18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45]],[[46]],[[47]]]},{"type":"MultiPolygon","arcs":[[[-19,48,49,50]],[[51]],[[52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[-17,58]],[[59]]]},{"type":"Polygon","arcs":[[60,61,62,63,64,65]]},{"type":"Polygon","arcs":[[-63,66,67,68,69]]},{"type":"MultiPolygon","arcs":[[[70,71]],[[72]],[[73]],[[74]]]},{"type":"MultiPolygon","arcs":[[[-72,75]],[[76]],[[77]],[[78,79]],[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]]]},{"type":"MultiPolygon","arcs":[[[89,90]],[[91,92,93,94,95,96]]]},{"type":"MultiPolygon","arcs":[[[-91,97]],[[98,-94,99,100]]]},{"type":"Polygon","arcs":[[-8,101,102,103,104,105,106,107,108,109,110]]},{"type":"Polygon","arcs":[[111,112,113,114]]},{"type":"Polygon","arcs":[[-3,115,116,117,-112,118]]},{"type":"Polygon","arcs":[[119,120,121,122,123,124,125,126]]},{"type":"Polygon","arcs":[[-121,127,128,129,130]]},{"type":"Polygon","arcs":[[131,-132,132]]},{"type":"Polygon","arcs":[[-132,133]]},{"type":"MultiPolygon","arcs":[[[134]],[[135]],[[136]],[[137]],[[138]],[[139]],[[140,141,142]],[[143]],[[144]],[[145,146,147,148,-66,149,150,151,152,153,154,155,156,157,158,159,160]],[[161]],[[162,-163,163]]]},{"type":"MultiPolygon","arcs":[[[164]],[[165]],[[166]]]},{"type":"Polygon","arcs":[[167]]},{"type":"MultiPolygon","arcs":[[[168]],[[-160,169,170,171]],[[172]],[[173]]]},{"type":"Polygon","arcs":[[174]]},{"type":"Polygon","arcs":[[175]]},{"type":"Polygon","arcs":[[76]]},{"type":"Polygon","arcs":[[176,177,178,179,180,181,182],[183]]},{"type":"Polygon","arcs":[[183]]},{"type":"Polygon","arcs":[[-50,184,185,186,187]]},{"type":"Polygon","arcs":[[188,189,-92]]},{"type":"Polygon","arcs":[[-189,-97,190,191,192,193,194,195,196,197,198]]},{"type":"Polygon","arcs":[[-192,199,-95,-99,200]]},{"type":"Polygon","arcs":[[-193,-201,-101,201,202,203]]},{"type":"Polygon","arcs":[[-194,-204,204,205,206,207,208]]},{"type":"Polygon","arcs":[[-207,209,210,211]]},{"type":"Polygon","arcs":[[-211,212,213,214]]},{"type":"Polygon","arcs":[[-214,215,216,217]]},{"type":"Polygon","arcs":[[-217,218,219,220,221]]},{"type":"Polygon","arcs":[[-220,222,223]]},{"type":"Polygon","arcs":[[-187,224,225,-221,-224,226]]},{"type":"Polygon","arcs":[[-186,227,-225]]},{"type":"Polygon","arcs":[[-195,-209,228,229]]},{"type":"Polygon","arcs":[[-196,-230,230,231]]},{"type":"Polygon","arcs":[[-197,-232,232,233]]},{"type":"MultiPolygon","arcs":[[[-198,-234,234]],[[235,236,237,238,239,240,241,242]],[[243]]]},{"type":"Polygon","arcs":[[-203,244,-205]]},{"type":"Polygon","arcs":[[245]]},{"type":"Polygon","arcs":[[246]]},{"type":"Polygon","arcs":[[247]]},{"type":"Polygon","arcs":[[-179,248,249,250]]},{"type":"Polygon","arcs":[[-178,251,252,-249]]},{"type":"Polygon","arcs":[[-177,253,254,255,-252]]},{"type":"Polygon","arcs":[[256,257,258,259,260,261,262]]},{"type":"Polygon","arcs":[[-259,263,264,265,266,267,268]]},{"type":"Polygon","arcs":[[-13,269,-264,-258,270]]},{"type":"Polygon","arcs":[[271,272,273,274,275]]},{"type":"Polygon","arcs":[[-130,276,277,-275,278,-266,279,280]]},{"type":"Polygon","arcs":[[-276,-278,281,282]]},{"type":"Polygon","arcs":[[-129,283,284,285,286,287,-282,-277]]},{"type":"Polygon","arcs":[[-273,288,289,290]]},{"type":"Polygon","arcs":[[-290,291,292,293]]},{"type":"Polygon","arcs":[[-268,294,-293,295,296,297]]},{"type":"Polygon","arcs":[[-260,-269,-298,298,299,300,301]]},{"type":"Polygon","arcs":[[-261,-302,302]]},{"type":"Polygon","arcs":[[-297,303,304,-299]]},{"type":"Polygon","arcs":[[-300,-305,305]]},{"type":"Polygon","arcs":[[-267,-279,-274,-291,-294,-295]]},{"type":"Polygon","arcs":[[-107,306,-284,-128,-120,307]]},{"type":"Polygon","arcs":[[-106,308,309,310,-285,-307]]},{"type":"Polygon","arcs":[[-286,-311,311,312]]},{"type":"Polygon","arcs":[[-287,-313,313]]},{"type":"Polygon","arcs":[[-7,314,315,-250,-253,-256,316,-102]]},{"type":"Polygon","arcs":[[-6,317,-315]]},{"type":"Polygon","arcs":[[-5,318,-182,-181,-180,-251,-316,-318]]},{"type":"Polygon","arcs":[[-181,180,319]]},{"type":"MultiPolygon","arcs":[[[-105,320,-309]],[[-103,-317,-255,321]]]},{"type":"Polygon","arcs":[[-9,-111,322]]},{"type":"Polygon","arcs":[[323,324,325,326,327,328,329]]},{"type":"Polygon","arcs":[[-329,330,331]]},{"type":"Polygon","arcs":[[332]]},{"type":"Polygon","arcs":[[-325,324,333]]},{"type":"Polygon","arcs":[[-263,262,334]]},{"type":"Polygon","arcs":[[335,336,337]]},{"type":"Polygon","arcs":[[-12,338,339,-336,340,-280,-265,-270]]},{"type":"Polygon","arcs":[[-324,341,342,343,344,-326,-325]]},{"type":"Polygon","arcs":[[345,346,347,348,349]]},{"type":"Polygon","arcs":[[350,-351,351]]},{"type":"Polygon","arcs":[[352,353,354]]},{"type":"Polygon","arcs":[[-343,355,356,357,358,-355,359]]},{"type":"MultiPolygon","arcs":[[[-349,360,361,362]],[[-347,346,363]]]},{"type":"MultiPolygon","arcs":[[[364]],[[365]]]},{"type":"Polygon","arcs":[[366,367,368,369]]},{"type":"Polygon","arcs":[[-367,370,371,372,373,374]]},{"type":"Polygon","arcs":[[-368,-375,375,376,377]]},{"type":"Polygon","arcs":[[-374,378,379,380,381,-376]]},{"type":"Polygon","arcs":[[-369,-378,382,383]]},{"type":"MultiPolygon","arcs":[[[384,384,384]],[[-146,385,386,387,388]]]},{"type":"Polygon","arcs":[[-387,389]]},{"type":"Polygon","arcs":[[-148,390]]},{"type":"Polygon","arcs":[[-381,391,392,393,394,395,396,397,398]]},{"type":"Polygon","arcs":[[-380,399,-392]]},{"type":"Polygon","arcs":[[-398,397,400]]},{"type":"Polygon","arcs":[[-396,401]]},{"type":"Polygon","arcs":[[-394,402,403,404,405]]},{"type":"Polygon","arcs":[[-69,406,407,-405,408,409]]},{"type":"Polygon","arcs":[[-68,410,411,-407]]},{"type":"Polygon","arcs":[[-62,412,-411,-67]]},{"type":"Polygon","arcs":[[-64,-70,-410,413,414]]},{"type":"Polygon","arcs":[[-358,415,416,417,418,419,-414,-409,-404,420]]},{"type":"Polygon","arcs":[[-330,-332,421,422,-356,-342]]},{"type":"Polygon","arcs":[[-418,-417,423,424,425]]},{"type":"Polygon","arcs":[[-171,426,427]]},{"type":"Polygon","arcs":[[-155,428,429,430,431]]},{"type":"Polygon","arcs":[[-154,432,-163,433,434,435,436,437,438,439,-429]]},{"type":"Polygon","arcs":[[-430,-440,440,441,442,443,-141,444]]},{"type":"Polygon","arcs":[[445,446,447,448,449,450,451]]},{"type":"Polygon","arcs":[[-438,452,453,454,455,-446,456]]},{"type":"Polygon","arcs":[[-436,457]]},{"type":"Polygon","arcs":[[-435,458,459,460,-453,-437,-458]]},{"type":"Polygon","arcs":[[-431,-445,-143,461,462]]},{"type":"Polygon","arcs":[[-156,-432,-463,463,464]]},{"type":"Polygon","arcs":[[-157,-465,465]]},{"type":"Polygon","arcs":[[-443,466,-450,467,-236,468,469,470,471,472,473]]},{"type":"Polygon","arcs":[[-460,474,475,476,477,478]]},{"type":"MultiPolygon","arcs":[[[479]],[[-477,480,481,482,483]]]},{"type":"MultiPolygon","arcs":[[[-357,-423,484,485,-424,-416]],[[-476,486,-481]]]},{"type":"Polygon","arcs":[[-483,487,488,489,490]]},{"type":"Polygon","arcs":[[-455,491,492,493,494,495]]},{"type":"Polygon","arcs":[[-449,496,-237,-468]]},{"type":"Polygon","arcs":[[-469,-243,497]]},{"type":"Polygon","arcs":[[-470,-498,-242,498,499]]},{"type":"Polygon","arcs":[[-471,-500,500]]},{"type":"Polygon","arcs":[[501,502]]},{"type":"Polygon","arcs":[[-502,503,-240,504]]},{"type":"Polygon","arcs":[[505,506]]},{"type":"Polygon","arcs":[[507]]},{"type":"MultiPolygon","arcs":[[[508]],[[509]],[[510]],[[511]],[[512]]]},{"type":"MultiPolygon","arcs":[[[513]],[[514]]]},{"type":"MultiPolygon","arcs":[[[515]],[[516]]]},{"type":"Polygon","arcs":[[517]]},{"type":"MultiPolygon","arcs":[[[518]],[[-61,-149,-391,-147,-389,519,-383,-377,-382,-399,-398,-397,-402,-395,-406,-408,-412,-413]]]},{"type":"Polygon","arcs":[[520]]},{"type":"MultiPolygon","arcs":[[[-448,521,522,-238,-497]],[[523]],[[524]]]},{"type":"MultiPolygon","arcs":[[[-473,525]],[[526]]]},{"type":"MultiPolygon","arcs":[[[-507,506,527]],[[528]]]},{"type":"Polygon","arcs":[[529]]},{"type":"MultiPolygon","arcs":[[[-151,530,-419,-426,531]],[[-417,416,532]]]},{"type":"Polygon","arcs":[[-152,-532,-425,-486,533]]},{"type":"MultiPolygon","arcs":[[[534]],[[535]],[[536]],[[537]],[[538]],[[539]],[[540]]]},{"type":"MultiPolygon","arcs":[[[-372,541]],[[-80,542,543,544]]]},{"type":"Polygon","arcs":[[-544,543,545]]},{"type":"Polygon","arcs":[[-447,-456,-496,546,-522]]},{"type":"Polygon","arcs":[[-159,547,-427,-170]]},{"type":"Polygon","arcs":[[-439,-457,-452,548,-441]]},{"type":"Polygon","arcs":[[-442,-549,-451,-467]]},{"type":"Polygon","arcs":[[-125,549,550,551]]},{"type":"MultiPolygon","arcs":[[[552]],[[553]],[[554]]]},{"type":"Polygon","arcs":[[-191,-96,-200]]},{"type":"Polygon","arcs":[[-362,555,556]]},{"type":"Polygon","arcs":[[-344,-360,-354,557,350,558,-350,-363,-557,559]]},{"type":"MultiPolygon","arcs":[[[560]],[[561]],[[562]],[[563]],[[564]],[[565]],[[566]],[[567]]]},{"type":"Polygon","arcs":[[568]]},{"type":"Polygon","arcs":[[568]]},{"type":"Polygon","arcs":[[-339,-15,569]]},{"type":"Polygon","arcs":[[-123,570,571,-327,572]]},{"type":"Polygon","arcs":[[-122,-131,-281,-341,-338,573,-571]]},{"type":"Polygon","arcs":[[-113,-118,574,-126,-552,575,576]]},{"type":"Polygon","arcs":[[-551,577,578,-576]]},{"type":"Polygon","arcs":[[-114,-577,-579,579]]},{"type":"Polygon","arcs":[[-11,580,-109,581,-116]]},{"type":"Polygon","arcs":[[-10,-323,-110,-581]]},{"type":"Polygon","arcs":[[-493,582,583]]},{"type":"Polygon","arcs":[[-478,-484,-491,584,585]]},{"type":"Polygon","arcs":[[-454,-461,-479,-586,586,587,-583,-492]]},{"type":"Polygon","arcs":[[-489,588,-494,-584,-588,589]]},{"type":"Polygon","arcs":[[-490,-590,-587,-585]]},{"type":"Polygon","arcs":[[590]]},{"type":"Polygon","arcs":[[-108,-308,-127,-575,-117,-582]]}]}},"arcs":[[[9947,4023],[0,0]],[[0,4108],[0,-29],[9981,-14],[18,43],[-9999,0]],[[5941,5001],[147,-220]],[[6088,4781],[0,-225],[31,-108]],[[6119,4448],[-105,-83],[-55,12]],[[5959,4377],[-50,135]],[[5909,4512],[-56,53]],[[5853,4565],[-39,227]],[[5814,4792],[32,123]],[[5846,4915],[-2,75]],[[5844,4990],[97,11]],[[4759,6691],[-1,-15]],[[4758,6676],[0,-90],[-91,3],[-27,-272],[-114,-19]],[[4526,6298],[1,25]],[[4527,6323],[63,5],[93,317],[76,46]],[[1588,7952],[-128,108],[-86,235]],[[1374,8295],[-137,294],[-55,-52],[-99,83],[1,555]],[[1084,9175],[124,-47],[232,93],[67,-59],[85,22],[244,-86],[11,-42],[204,66],[50,-46],[268,2],[-49,120],[35,108],[167,-157],[51,-122],[51,159],[118,-43],[-3,-121],[-122,-33],[-43,-105],[-72,-44],[-120,-185],[-13,-115],[67,-110],[90,-14],[112,-92],[76,-9],[25,-176],[41,-56],[36,79],[-34,125],[92,110],[-55,135],[32,61],[-21,146],[119,7],[118,-81],[8,-125],[46,-44],[85,126],[88,-199],[-11,-37],[124,-101],[46,-147],[-121,-113],[-177,0],[-131,-202],[127,137],[58,-171],[130,-19],[-155,-140],[-49,94]],[[3135,7724],[-59,136],[-63,-144],[-93,0],[-54,-81],[-156,-116],[-3,217],[-162,175],[-91,-10],[-98,51],[-768,0]],[[2667,8747],[0,0]],[[2784,9358],[-16,57],[114,-55],[-98,-2]],[[2769,8725],[0,0]],[[2399,9487],[0,0]],[[2393,9637],[0,0]],[[2312,9711],[0,0]],[[2551,9452],[-118,27],[-121,137],[143,-23],[67,-69],[224,6],[-23,-75],[-172,-3]],[[1909,9674],[0,0]],[[1918,9712],[0,0]],[[3455,8089],[-33,-89],[92,-33],[23,-101],[-184,3],[53,185],[49,35]],[[2670,8904],[21,-60],[-67,-62],[-10,159],[56,-37]],[[2812,9331],[26,24],[251,-132],[50,-78],[-51,-28],[194,-110],[-58,-110],[-78,82],[-39,-41],[78,-77],[9,-101],[-105,63],[73,-107],[-76,24],[-165,121],[-80,-9],[-5,64],[109,8],[18,155],[-157,124],[-65,-26],[-205,40],[-42,108],[50,77],[169,12],[99,-83]],[[2375,9437],[111,-16],[-105,-109],[-49,54],[43,71]],[[1587,9554],[104,82],[77,-37],[-181,-45]],[[1313,8250],[0,0]],[[2070,9742],[129,-30],[32,-52],[-161,82]],[[1569,7923],[-59,19],[-76,115],[73,-29],[62,-105]],[[1624,9456],[167,-58],[-210,-152],[-79,57],[122,153]],[[2005,9538],[42,-50],[-164,-34],[12,43],[-165,4],[64,74],[176,-59],[35,22]],[[2041,9375],[57,-124],[97,-57],[-40,-75],[-99,25],[-204,-38],[-112,84],[137,24],[-152,11],[-42,60],[43,68],[315,22]],[[2210,9353],[2,66],[83,-4],[23,-71],[-50,-76],[-115,73],[57,12]],[[2039,9405],[0,0]],[[2264,9590],[9,-102],[-75,4],[-47,75],[113,23]],[[2333,9819],[100,39],[183,-114],[-89,-62],[-107,3],[-87,134]],[[2456,9896],[169,44],[352,34],[194,-12],[110,-39],[-259,-151],[-159,-29],[43,-46],[-144,-139],[-248,17],[42,112],[80,58],[-180,151]],[[2910,9041],[0,0]],[[2326,9163],[0,0]],[[3207,8003],[0,0]],[[3222,7836],[0,0]],[[3135,7724],[-102,-135],[23,-72],[-81,-25],[-79,-193],[0,-141],[-78,-100],[-82,-185],[40,-228],[-31,-99],[-71,280],[-163,13],[5,-59],[-147,19],[-74,-124],[6,-89]],[[2301,6586],[-52,29],[-54,178],[-97,11],[-57,129],[-125,-25],[-170,71]],[[1746,6979],[-90,114],[-93,265],[-22,226],[17,162],[-18,169],[62,-60],[-14,97]],[[683,6244],[0,0]],[[667,6284],[0,0]],[[645,6309],[0,0]],[[610,6340],[0,0]],[[573,6370],[0,0]],[[376,8624],[0,0]],[[744,8482],[0,0]],[[1374,8295],[-99,196],[-70,5],[-90,79],[-201,79],[-26,-53],[-146,-66],[-143,-170],[-181,-84],[201,177],[-170,132],[-63,100],[43,98],[105,37],[0,60],[-116,-20],[-88,72],[101,54],[78,-28],[-103,114],[96,135],[148,61],[120,-45],[314,-53]],[[230,8825],[0,0]],[[7426,7965],[-61,-131],[-55,19],[-20,-105],[-69,-37],[8,-152]],[[7229,7559],[-168,56],[-91,-61]],[[6970,7554],[-64,-94],[-54,30],[-50,151],[-80,-14],[-98,124],[-71,-35],[1,-218]],[[6554,7498],[-96,28]],[[6458,7526],[-61,167],[76,38],[0,94],[-110,-27]],[[6363,7798],[-73,118],[30,122],[90,73],[137,-63],[109,-4],[50,204],[212,81],[121,-112],[86,41],[97,-195],[93,11],[111,-109]],[[6970,7554],[58,-82],[-56,-37]],[[6972,7435],[-47,29],[-52,-94],[10,-118]],[[6883,7252],[-36,12]],[[6847,7264],[1,36],[-180,205],[-40,78],[-74,-85]],[[8916,4904],[99,-75],[115,-310],[58,-69],[-80,9],[-88,148],[-59,-101],[-44,13]],[[8917,4519],[-1,385]],[[9239,4841],[0,0]],[[9202,4712],[0,0]],[[9298,4742],[0,0]],[[8917,4519],[-95,42],[9,178],[-119,109],[-87,154],[96,9],[12,-117],[109,63],[74,-53]],[[8471,4532],[3,-29],[-3,29]],[[8727,4650],[0,0]],[[8274,5302],[31,-191],[-33,-8],[-46,-282],[-165,63],[-32,146],[16,146]],[[8045,5176],[24,-73],[114,39],[35,170],[56,-10]],[[8593,4892],[0,0]],[[8523,4833],[0,0]],[[8553,5186],[0,0]],[[8414,5109],[-77,-37],[83,-330],[-79,142],[3,-153],[-46,161],[35,199],[81,18]],[[8341,4451],[0,0]],[[8370,4553],[0,0]],[[8284,4564],[0,0]],[[8013,4678],[114,-31],[55,-107],[-256,113],[87,25]],[[7898,4994],[49,-117],[-8,-165],[-90,96],[-111,357],[-89,186],[58,17],[88,-187],[28,-1],[75,-186]],[[3093,1948],[47,-134]],[[3140,1814],[-47,2],[0,132]],[[3399,3272],[-22,-218]],[[3377,3054],[45,-176],[-68,-108],[-86,-6],[5,-110],[-82,-22],[46,-89],[-115,-221],[54,-55],[-97,-206],[16,-93]],[[3095,1968],[-93,17],[-39,96],[58,331],[-25,149],[28,331],[36,146],[-19,167],[62,263],[-4,141],[37,105]],[[3136,3714],[23,54],[99,-25]],[[3258,3743],[137,-172],[-24,-116],[59,-25],[52,107]],[[3482,3537],[27,-70],[-110,-195]],[[3140,1814],[-113,-9],[-101,131],[98,-73],[69,85]],[[3067,4019],[49,-313],[20,8]],[[3095,1968],[-68,-91],[-109,93],[-20,332],[36,150],[33,413],[48,277],[38,652],[-8,179]],[[3045,3973],[22,46]],[[5853,4565],[-56,-12],[-10,-192],[-123,51]],[[5664,4412],[-49,-9],[-12,224],[-118,-46],[-32,129],[-111,-13]],[[5342,4697],[-4,18]],[[5338,4715],[22,60]],[[5360,4775],[44,-11],[82,250],[26,250]],[[5512,5264],[28,91],[82,-60],[138,71]],[[5760,5366],[96,-101]],[[5856,5265],[9,-78],[-44,-209]],[[5821,4978],[-15,-88]],[[5806,4890],[8,-98]],[[6155,4958],[-17,264],[24,67]],[[6162,5289],[86,64],[79,177]],[[6327,5530],[32,201]],[[6359,5731],[60,36],[-46,-308],[-80,-233],[-138,-268]],[[5941,5001],[32,169],[-29,138]],[[5944,5308],[36,75]],[[5980,5383],[118,-124],[64,30]],[[6155,4958],[-67,-177]],[[5682,5544],[-47,171]],[[5635,5715],[-16,189],[44,76],[-1,234]],[[5662,6214],[32,143]],[[5694,6357],[330,0]],[[6024,6357],[42,-236]],[[6066,6121],[-43,-62],[-12,-150]],[[6011,5909],[-60,-224],[-8,-114]],[[5943,5571],[-21,206],[-52,-140],[-66,-24],[-108,51],[-14,-120]],[[5635,5715],[-136,-192],[-75,-27]],[[5424,5496],[-37,126],[42,25],[-27,170]],[[5402,5817],[-26,89],[47,134],[18,222],[-29,146]],[[5412,6408],[28,32],[222,-226]],[[3008,6222],[0,-99]],[[3008,6222],[0,0]],[[3008,6222],[94,-65],[-94,-34]],[[7604,9844],[60,13],[118,-87],[-67,-60],[-183,93],[72,41]],[[7856,9741],[62,-57],[-157,-23],[95,80]],[[8856,9555],[173,-34],[-22,-44],[-148,-12],[-3,90]],[[9116,9509],[0,0]],[[8884,9392],[0,0]],[[6245,9818],[185,7],[-109,-41],[-76,34]],[[5631,8267],[-85,6]],[[5546,8273],[44,45]],[[5590,8318],[41,-51]],[[6486,9414],[59,79],[153,69],[195,41],[0,-42],[-183,-58],[-86,-56],[-85,-114],[58,-98],[-164,44],[53,135]],[[8969,8230],[48,-279],[-41,19],[10,-146],[-40,-51],[-11,433],[34,24]],[[8632,7552],[-4,10]],[[8628,7562],[11,152],[57,10],[54,197],[-112,-40],[-93,116],[-47,179],[-138,27],[-86,-221],[-34,23]],[[8240,8005],[-64,21],[-103,-66],[-105,67],[-89,-11],[-134,116],[-44,-137],[-140,63],[-124,-88]],[[7437,7970],[-11,-5]],[[6363,7798],[-67,-105],[53,-166]],[[6349,7527],[-60,3]],[[6289,7530],[-180,94]],[[6109,7624],[-91,106],[43,110]],[[6061,7840],[51,148],[-130,57],[-45,104],[-55,-14]],[[5882,8135],[25,74],[-50,130],[-75,37]],[[5782,8376],[-25,76]],[[5757,8452],[20,119]],[[5777,8571],[2,60]],[[5779,8631],[96,140],[-41,41],[-2,245],[-38,81]],[[5794,9138],[69,29]],[[5863,9167],[151,-30],[105,-67],[23,-67],[-76,-47],[-124,45],[28,-139],[266,139],[-30,107],[78,-19],[3,-93],[205,129],[-7,-39],[148,40],[48,58],[221,-104],[-50,173],[90,119],[74,-15],[-21,-81],[51,-177],[-67,-124],[105,85],[-54,218],[182,52],[24,78],[175,17],[10,70],[168,55],[209,22],[34,51],[253,-34],[78,-82],[-125,-67],[115,-50],[56,24],[212,-46],[2,46],[148,-42],[-4,-62],[79,-71],[27,62],[211,-20],[17,80],[251,-38],[96,-81],[168,2],[54,-84],[191,8],[49,-53],[24,84],[226,-42],[-9960,-26],[281,-176],[-111,-100],[-167,94],[-3,-53],[9999,-1],[-72,-21],[55,-96],[-159,-79],[-93,-104],[-39,41],[-149,-42],[-40,-296],[-48,-30],[-100,-197],[-37,258],[38,145],[43,13],[147,182],[23,84],[-121,-119],[-23,72],[-72,-20],[-69,-98],[-334,-43],[-196,-254],[172,-97],[-35,-274],[-144,-299],[-114,-69]],[[0,9282],[0,-40],[9968,-3],[-4,19],[-9964,24]],[[5928,7773],[44,-14]],[[5928,7773],[0,0]],[[2806,6640],[0,0]],[[2839,6655],[0,0]],[[2828,6547],[0,0]],[[3300,1994],[0,0]],[[5420,9764],[51,22],[127,-64],[-70,-24],[-53,-103],[-185,168],[130,1]],[[5794,9138],[-67,45],[-41,-70],[-113,27]],[[5573,9140],[-108,-65],[-134,-288],[19,-109],[-44,-143]],[[5306,8535],[-149,-16],[-19,199],[154,149],[117,196],[123,119],[149,71],[101,10],[81,-96]],[[5761,9787],[-41,-32],[-163,3],[-75,44],[154,20],[125,-35]],[[5686,9656],[0,0]],[[3701,9939],[93,35],[231,25],[222,-8],[173,-46],[-51,-23],[-256,-9],[196,-24],[47,-38],[205,45],[99,-36],[-153,-69],[-55,-81],[34,-105],[-25,-158],[-136,-101],[70,-114],[-105,45],[-23,-71],[112,-6],[-150,-98],[-112,-20],[-67,-85],[-156,-73],[-84,-164],[-15,-152],[-136,45],[-94,163],[-65,211],[87,161],[-72,-38],[-66,141],[31,55],[-108,173],[-74,34],[-201,-2],[-130,140],[207,57],[-64,42],[300,123],[116,-18],[74,33],[163,-47],[-62,58]],[[6914,2185],[0,0]],[[5454,3369],[98,7],[0,218]],[[5552,3594],[28,-122],[67,93],[65,-13],[105,200]],[[5817,3752],[49,-9]],[[5866,3743],[18,-212]],[[5884,3531],[6,-53]],[[5890,3478],[21,0]],[[5911,3478],[-10,-92],[-118,-264],[-67,-70],[-90,5],[-82,-57],[-90,369]],[[5804,3347],[0,0]],[[2301,6586],[-20,-203],[55,-213],[41,-41],[101,67],[14,102],[90,32],[-35,-180]],[[2547,6150],[-23,-40]],[[2524,6110],[-65,-34],[-21,-160]],[[2438,5916],[-69,98],[-51,-32],[-193,156],[-62,126],[-8,139],[-173,365],[-25,131],[-42,-60],[146,-402],[-77,82],[-64,142],[-74,318]],[[3399,3272],[106,-108],[12,-102]],[[3517,3062],[-43,-69],[-97,61]],[[3482,3537],[10,101],[-102,114],[-6,113]],[[3384,3865],[-2,229],[-53,3],[-10,146],[-136,131],[2,107],[-117,-70]],[[3068,4411],[-74,53],[-50,149],[31,132],[83,58]],[[3058,4803],[2,356],[82,-28]],[[3142,5131],[74,14],[-12,158],[43,-23],[66,85]],[[3313,5365],[47,-230],[69,35]],[[3429,5170],[56,24]],[[3485,5194],[55,11],[25,98]],[[3565,5303],[84,-259],[145,-127],[95,-29],[132,-153],[3,-209],[-106,-283],[-23,-343],[-62,-200],[-124,-66],[-56,-105],[-11,-165],[-125,-302]],[[3384,3865],[-101,33],[-25,-155]],[[3067,4019],[25,296],[-24,96]],[[3045,3973],[-157,219],[-104,441],[-41,62],[26,162]],[[2769,4857],[30,-93],[102,201],[5,84]],[[2906,5049],[64,-128],[63,3],[25,-121]],[[2906,5049],[-97,90]],[[2809,5139],[48,146],[-21,199]],[[2836,5484],[15,86]],[[2851,5570],[52,115],[104,107],[11,-39]],[[3018,5753],[-44,-78],[27,-205],[128,-52],[-13,-194],[26,-93]],[[2836,5484],[-34,105],[-25,-86],[-82,40]],[[2695,5543],[12,80]],[[2707,5623],[144,-53]],[[2695,5543],[-76,170]],[[2619,5713],[57,-9]],[[2676,5704],[31,-81]],[[2619,5713],[-45,111]],[[2574,5824],[116,120]],[[2690,5944],[-14,-240]],[[2574,5824],[-13,24]],[[2561,5848],[-43,61]],[[2518,5909],[31,78]],[[2549,5987],[107,6],[34,-49]],[[2561,5848],[-64,21]],[[2497,5869],[21,40]],[[2524,6110],[5,-114]],[[2529,5996],[20,-9]],[[2497,5869],[-59,47]],[[2547,6150],[-18,-154]],[[3018,5753],[88,-72],[175,10],[59,-139]],[[3340,5552],[-27,-187]],[[3340,5552],[72,-142]],[[3412,5410],[-25,-113],[42,-127]],[[3412,5410],[89,-12]],[[3501,5398],[-16,-204]],[[3501,5398],[64,-95]],[[5171,7979],[36,-108]],[[5207,7871],[-18,-97]],[[5189,7774],[17,-136]],[[5206,7638],[-123,-72]],[[5083,7566],[-136,56]],[[4947,7622],[19,153],[-94,158],[83,-2],[114,148]],[[5069,8079],[88,-96]],[[5157,7983],[14,-4]],[[5243,7576],[0,0]],[[2769,4857],[6,246],[34,36]],[[3159,6151],[0,0]],[[2845,6150],[0,0]],[[2714,6427],[109,-40],[116,-132],[-99,-24],[-27,102],[-99,94]],[[5817,3752],[-39,36],[-77,221]],[[5701,4009],[50,-11],[89,143]],[[5840,4141],[72,-71],[-17,-260],[-29,-67]],[[5552,3594],[27,175],[1,210],[116,35]],[[5696,4014],[5,-5]],[[5454,3369],[-32,88],[-26,294],[-71,284]],[[5325,4035],[319,-13]],[[5644,4022],[52,-8]],[[4535,5861],[7,150]],[[4542,6011],[53,27],[66,-117]],[[4661,5921],[19,-129]],[[4680,5792],[-61,9]],[[4619,5801],[-83,-12]],[[4536,5789],[-4,45]],[[4532,5834],[3,27]],[[4661,5921],[14,46],[171,6],[-26,559],[43,0]],[[4863,6532],[255,-343]],[[5118,6189],[-17,-212],[-91,-38]],[[5010,5939],[-122,-86],[-39,-183]],[[4849,5670],[-73,-9]],[[4776,5661],[-30,124],[-66,7]],[[4758,6676],[105,-144]],[[4542,6011],[5,233],[-21,54]],[[5074,5427],[-23,-7]],[[5051,5420],[-27,287]],[[5024,5707],[35,56]],[[5059,5763],[41,-17]],[[5100,5746],[-26,-319]],[[5402,5817],[-9,-22]],[[5393,5795],[-24,63],[-119,-43],[-129,55],[-21,-124]],[[5059,5763],[-49,176]],[[5118,6189],[215,255]],[[5333,6444],[79,-36]],[[5393,5795],[-67,-325],[-70,-32],[-20,-99]],[[5236,5339],[-73,-30],[-43,119],[-46,-1]],[[5424,5496],[-22,-159],[42,-146]],[[5444,5191],[-81,0]],[[5363,5191],[-50,0]],[[5313,5191],[-45,1]],[[5268,5192],[-32,147]],[[5051,5420],[-22,-12]],[[5029,5408],[-29,300]],[[5000,5708],[24,-1]],[[5029,5408],[-109,-55]],[[4920,5353],[1,274]],[[4921,5627],[-3,78],[82,3]],[[4849,5670],[72,-43]],[[4920,5353],[-135,-38]],[[4785,5315],[-20,197]],[[4765,5512],[11,149]],[[4765,5512],[-50,42]],[[4715,5554],[-24,97],[-60,-68]],[[4631,5583],[-52,127]],[[4579,5710],[40,91]],[[4579,5710],[-43,79]],[[4785,5315],[-103,144]],[[4682,5459],[33,95]],[[4682,5459],[-51,124]],[[5512,5264],[-68,-73]],[[5682,5544],[78,-178]],[[5360,4775],[-30,-15]],[[5330,4760],[-22,62]],[[5308,4822],[80,89],[8,217],[-33,63]],[[5308,4822],[-64,170],[19,125]],[[5263,5117],[50,74]],[[5263,5117],[5,75]],[[5909,4512],[13,-280]],[[5922,4232],[-82,-91]],[[5644,4022],[-37,85],[2,188],[58,0],[-3,117]],[[5959,4377],[32,-183],[-19,-129],[-50,167]],[[6119,4448],[13,-258],[-37,-120],[-129,-181],[7,-278],[-62,-133]],[[5890,3478],[0,0]],[[5338,4715],[-8,45]],[[5325,4035],[53,311],[-36,351]],[[5806,4890],[40,25]],[[5992,6990],[-5,-19]],[[5987,6971],[-4,-53]],[[5983,6918],[-14,-118]],[[5969,6800],[-18,102]],[[5951,6902],[24,110]],[[5975,7012],[19,11]],[[5994,7023],[-2,-33]],[[5975,7012],[24,92]],[[5999,7104],[-5,-81]],[[6375,4321],[27,-163],[-94,-574],[-85,-3],[-22,173],[31,118],[2,227],[52,26],[89,196]],[[5983,6918],[0,0]],[[4535,5861],[0,0]],[[5263,6848],[-52,179],[22,213]],[[5233,7240],[61,-32],[-13,-123],[38,-70]],[[5319,7015],[-56,-167]],[[4759,6691],[0,70],[95,69],[109,133],[-24,172]],[[4939,7135],[101,85],[193,20]],[[5263,6848],[-5,-249],[75,-155]],[[5992,6990],[85,39]],[[6077,7029],[11,-72]],[[6088,6957],[-33,-97],[-85,-68]],[[5970,6792],[-1,8]],[[6432,6489],[68,-7],[57,115]],[[6557,6597],[5,-21]],[[6562,6576],[4,-46]],[[6566,6530],[-33,-131]],[[6533,6399],[-89,17],[-12,73]],[[6411,6519],[16,-7]],[[6411,6519],[0,0]],[[6332,6828],[12,-84]],[[6344,6744],[-51,32]],[[6293,6776],[39,52]],[[6077,7029],[62,62],[37,166]],[[6176,7257],[67,-4]],[[6243,7253],[18,-189],[88,-238]],[[6349,6826],[-17,2]],[[6293,6776],[-52,5],[-153,176]],[[6566,6530],[95,-155],[-56,-191],[-130,-143]],[[6475,6041],[-31,139]],[[6444,6180],[83,59],[6,160]],[[6562,6576],[0,0]],[[9644,4119],[0,0]],[[9632,4132],[0,0]],[[7849,5778],[11,120],[62,2]],[[7922,5900],[60,-4]],[[7982,5896],[3,-110],[-88,-109]],[[7897,5677],[-48,101]],[[7849,5778],[-69,72],[-27,-204],[83,-221]],[[7836,5425],[-57,14]],[[7779,5439],[-42,205]],[[7737,5644],[29,116],[-39,191],[19,62],[-42,134],[76,117]],[[7780,6264],[26,-172],[81,43],[45,-158],[-10,-77]],[[7780,6264],[30,60]],[[7810,6324],[27,60]],[[7837,6384],[48,-188],[102,-241],[-5,-59]],[[7737,5644],[6,89],[-45,325],[-82,-53],[4,128],[-55,145]],[[7565,6278],[8,81]],[[7573,6359],[69,268],[61,100]],[[7703,6727],[37,-44],[-29,-214],[99,-145]],[[7837,6384],[88,53],[76,-107]],[[8001,6330],[-67,-147],[90,-223],[9,-213],[-113,-182],[-23,112]],[[8632,7552],[0,0]],[[8632,7552],[-90,-146],[22,-68]],[[8564,7338],[-60,-51]],[[8504,7287],[-53,129]],[[8451,7416],[72,112],[105,34]],[[8564,7338],[21,-208],[-72,-41],[-9,198]],[[8240,8005],[-26,-128],[65,20],[44,-81],[-62,-2],[-227,-245],[-119,-54],[-87,54],[-152,13],[-29,89],[-121,62],[-19,142],[-70,95]],[[7573,6359],[-8,174],[-119,-28],[26,-144]],[[7472,6361],[-57,-33],[-184,-331],[-13,-328],[-65,-141],[-26,55],[-85,419],[-25,317],[-60,-28],[-64,166]],[[6893,6457],[80,39],[-43,153],[63,57],[97,258],[-42,121],[114,69]],[[7162,7154],[29,-69],[-4,-166],[65,-79]],[[7252,6840],[-28,-82],[143,-122],[78,-18],[2,86]],[[7447,6704],[19,-34]],[[7466,6670],[80,28]],[[7546,6698],[123,99],[34,-70]],[[7565,6278],[-26,125],[-67,-42]],[[7546,6698],[0,0]],[[7252,6840],[195,-136]],[[6893,6457],[-50,102],[-135,-20]],[[6708,6539],[50,99],[-68,182]],[[6690,6820],[152,3],[72,102],[81,289],[92,37]],[[7087,7251],[75,-97]],[[6883,7252],[83,79],[29,-103],[87,40]],[[7082,7268],[5,-17]],[[6690,6820],[25,53],[-34,174],[19,116]],[[6700,7163],[28,-22],[119,123]],[[6972,7435],[-43,-42],[117,-6]],[[7046,7387],[36,-119]],[[7229,7559],[-183,-172]],[[6700,7163],[-108,141],[-95,-49]],[[6497,7255],[-39,271]],[[6243,7253],[1,150]],[[6244,7403],[37,-57]],[[6281,7346],[10,2]],[[6291,7348],[66,-27]],[[6357,7321],[94,-96],[46,30]],[[6708,6539],[-114,39],[-25,83],[-50,-39],[-89,82],[-39,134],[-42,-12]],[[5999,7104],[5,69]],[[6004,7173],[25,48],[147,36]],[[6244,7403],[-34,82]],[[6210,7485],[39,9]],[[6249,7494],[42,-146]],[[5573,9140],[80,-69],[10,-114]],[[5663,8957],[-168,-193],[-20,-83],[46,-74],[-54,-81],[-26,-155],[-82,-43],[-53,207]],[[5882,8135],[-34,-46],[-195,15]],[[5653,8104],[-1,138]],[[5652,8242],[83,101]],[[5735,8343],[47,33]],[[6061,7840],[-89,-81]],[[5928,7773],[-74,36],[-32,-76]],[[5822,7733],[-38,12]],[[5784,7745],[50,55],[-26,84],[-69,22]],[[5739,7906],[-109,-20]],[[5630,7886],[-17,32]],[[5613,7918],[13,39]],[[5626,7957],[27,147]],[[5626,7957],[-103,25]],[[5523,7982],[-106,95]],[[5417,8077],[-25,156]],[[5392,8233],[97,65],[57,-25]],[[5631,8267],[21,-25]],[[5471,7900],[-22,-75]],[[5449,7825],[-66,-20]],[[5383,7805],[-94,22]],[[5289,7827],[-23,38]],[[5266,7865],[95,7],[16,73]],[[5377,7945],[94,-17]],[[5471,7928],[0,-28]],[[5630,7886],[-69,-103]],[[5561,7783],[-38,-13]],[[5523,7770],[-63,34]],[[5460,7804],[-11,21]],[[5471,7900],[142,18]],[[5784,7745],[-45,161]],[[5822,7733],[-29,-93]],[[5793,7640],[-164,31]],[[5629,7671],[-68,112]],[[5590,8318],[-6,49]],[[5584,8367],[106,20],[45,-44]],[[5584,8367],[15,82],[76,22]],[[5675,8471],[82,-19]],[[5675,8471],[-27,83],[129,17]],[[5417,8077],[-78,-50],[38,-82]],[[5266,7865],[-59,6]],[[5171,7979],[-4,40]],[[5167,8019],[4,39]],[[5171,8058],[20,159]],[[5191,8217],[45,87]],[[5236,8304],[39,1]],[[5275,8305],[117,-72]],[[5793,7640],[-16,-101]],[[5777,7539],[-52,-11]],[[5725,7528],[-88,-28]],[[5637,7500],[-16,57]],[[5621,7557],[8,114]],[[5730,7143],[0,0]],[[5725,7528],[-2,-59]],[[5723,7469],[-90,-20],[34,-134],[-66,-81],[-42,165]],[[5559,7399],[24,71]],[[5583,7470],[54,30]],[[6004,7173],[-40,58],[-62,-40],[-135,32],[-41,165],[86,104],[164,49],[89,-64],[89,34]],[[6154,7511],[56,-26]],[[5777,7539],[-54,-70]],[[5559,7399],[-21,132]],[[5538,7531],[19,42]],[[5557,7573],[14,-43]],[[5571,7530],[12,-60]],[[5523,7770],[5,-63]],[[5528,7707],[-91,-2],[78,-128]],[[5515,7577],[-3,-10]],[[5512,7567],[-132,178]],[[5380,7745],[80,59]],[[5289,7827],[-100,-53]],[[5157,7983],[10,36]],[[5069,8079],[22,12]],[[5091,8091],[80,-33]],[[5091,8091],[39,103],[61,23]],[[4749,7531],[65,0],[-21,-282]],[[4793,7249],[-58,97],[14,185]],[[4749,7531],[29,111],[169,-20]],[[5083,7566],[-61,-86],[-19,-134],[-63,-122],[-90,-43],[-57,68]],[[4827,8240],[-16,-95],[-89,-26],[8,121],[59,74]],[[4789,8314],[38,-74]],[[9604,3812],[0,0]],[[9502,4438],[0,0]],[[9490,4490],[0,0]],[[9467,4474],[0,0]],[[9434,4584],[0,0]],[[9364,4643],[0,0]],[[9913,2690],[-25,-72],[-61,105],[15,251],[28,-115],[88,-29],[-45,-140]],[[9712,2484],[87,181],[40,-75],[-136,-288],[-74,25],[83,157]],[[9102,2647],[6,-142],[-52,-20],[-36,168],[82,-6]],[[8503,3154],[-69,-99],[-105,-5],[-51,-64],[-84,51],[22,118],[-67,462],[21,155],[186,123],[60,193],[113,153],[36,-62],[111,221],[127,-72],[-42,-140],[106,-157],[45,0],[46,396],[39,-229],[40,-26],[28,-235],[69,-84],[23,-115],[88,-173],[20,-168],[-19,-209],[-80,-342],[-102,-95],[-158,60],[-30,111],[-99,74],[-48,134],[-82,67],[-144,-43]],[[7271,5502],[-40,-92],[-5,228],[45,-136]],[[8040,6133],[0,0]],[[8451,7416],[-89,-61],[16,122],[-114,-131],[99,-124],[-54,-102],[77,-191],[5,-109],[-96,-312],[-77,-105],[-141,-81],[-76,8]],[[8382,6498],[-29,-143],[-17,94],[46,49]],[[5383,7805],[4,-54]],[[5387,7751],[-38,-89],[161,-220],[-63,-140],[-19,121],[-182,256],[-40,-41]],[[5409,7311],[10,-90],[-74,58],[64,32]],[[5241,7474],[0,0]],[[5236,8304],[-12,93],[69,71],[-18,-163]],[[5343,8372],[0,0]],[[4827,8240],[0,0]],[[4914,8212],[-85,200],[31,109],[85,-56],[-4,-105],[72,-176],[2,-127],[-176,-36],[41,62],[-8,135],[42,-6]],[[4596,8984],[25,-79],[-140,-96],[-157,124],[272,51]],[[6349,7527],[29,-73],[-21,-133]],[[6249,7494],[40,36]],[[6281,7346],[0,0]],[[6154,7511],[-45,113]],[[8356,5808],[0,0]],[[8404,5647],[0,0]],[[8510,5554],[-28,-167],[-49,133],[77,34]],[[8291,5608],[0,0]],[[8397,6134],[-16,-230],[-47,38],[18,209],[45,-17]],[[8389,5732],[0,0]],[[8485,5776],[0,0]],[[7836,5425],[35,-81],[4,-214],[-59,90],[-37,219]],[[8045,5176],[42,-9],[85,158]],[[8172,5325],[34,54]],[[8206,5379],[36,87],[68,-89],[-36,-75]],[[8206,5379],[0,0]],[[5380,7745],[7,6]],[[5779,8631],[-144,-38],[-51,163],[121,148],[-42,53]],[[5471,7928],[52,54]],[[6066,6121],[24,-123],[106,-190]],[[6196,5808],[-20,-10]],[[6176,5798],[-41,94],[-124,17]],[[8940,7372],[-31,-197],[-138,-141],[-20,67],[-113,-42],[9,-144],[-53,110],[89,125],[85,6],[104,159],[25,176],[43,-119]],[[9016,7654],[-40,-116],[-43,41],[10,169],[73,-94]],[[8676,7034],[0,0]],[[6475,6041],[-123,-157],[-145,-80],[-19,219]],[[6188,6023],[16,73],[114,-27],[46,88],[80,23]],[[6344,6744],[67,-225]],[[6427,6512],[5,-23]],[[6188,6023],[-103,368],[-110,324],[-5,77]],[[3648,447],[132,-26],[16,-91],[-199,-59],[-97,47],[83,36],[65,93]],[[3158,316],[0,0]],[[2947,847],[51,5],[50,136],[41,-194],[-150,-12],[8,65]],[[2157,811],[0,0]],[[1594,706],[0,0]],[[1464,718],[0,0]],[[452,414],[69,13],[56,-66],[-125,53]],[[0,53],[279,49],[82,-41],[248,-47],[80,16],[185,-30],[157,61],[-199,16],[-98,36],[20,98],[-111,55],[172,-14],[108,84],[-238,51],[-75,61],[30,43],[156,-6],[145,54],[50,56],[253,73],[431,-10],[160,44],[177,-86],[192,-7],[-84,158],[204,-59],[220,36],[193,-49],[32,42],[113,-49],[246,88],[-31,140],[21,164],[132,159],[24,-92],[-94,-82],[111,-207],[23,-123],[-35,-75],[-240,-130],[-185,-4],[82,-50],[-101,-49],[71,-111],[436,-125],[40,-50],[235,88],[193,-20],[397,102],[-32,64],[-165,-12],[-4,66],[191,99],[179,33],[187,95],[-21,38],[172,154],[95,19],[184,-42],[271,97],[36,-49],[72,51],[162,5],[92,-48],[183,29],[131,101],[133,-76],[38,40],[454,185],[167,-120],[46,35],[135,-31],[18,-103],[-44,-128],[85,-14],[79,130],[105,25],[143,133],[110,4],[34,55],[74,-60],[252,-1],[87,99],[93,-81],[206,63],[55,-49],[147,-29],[40,37],[180,-11],[165,32],[75,-44],[223,3],[33,-58],[162,-58],[50,18],[233,-129],[160,-13],[77,-43],[-53,-116],[-141,-106],[-21,-96],[98,-99],[-145,-24],[-55,-106],[109,-85],[264,-119],[188,-18],[-9999,0]],[[5909,7133],[34,-4],[-34,4]],[[4527,6323],[71,285],[136,218],[25,195],[76,149],[104,-35]],[[5694,6357],[5,565]],[[5699,6922],[103,-41],[149,21]],[[5969,6800],[-27,-109],[-33,62],[115,-396]],[[5319,7015],[104,-51],[107,-118],[49,144],[120,-68]],[[5980,5383],[-37,188]],[[6176,5798],[12,-95]],[[6188,5703],[25,-103],[114,-70]],[[6196,5808],[2,-74]],[[6198,5734],[-10,-31]],[[6198,5734],[27,-59],[134,56]],[[5844,4990],[-23,-12]],[[5856,5265],[88,43]],[[5528,7707],[5,-79]],[[5533,7628],[-18,-51]],[[5571,7530],[28,23]],[[5599,7553],[22,4]],[[5599,7553],[-37,33]],[[5562,7586],[-29,42]],[[5538,7531],[-26,36]],[[5562,7586],[-5,-13]],[[3286,5693],[0,0]]],"bbox":[-180,-85.61,180,83.65],"transform":{"scale":[0.036003600360036005,0.016927692769276928],"translate":[-180,-85.61]}},"us":{"type":"Topology","objects":{"states":{"type":"GeometryCollection","geometries":[{"type":"MultiPolygon","arcs":[[[0]],[[1,2,3,4,5]]]},{"type":"MultiPolygon","arcs":[[[6]],[[7]],[[8]],[[9]],[[10]],[[11]],[[12]],[[13]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]],[[20]],[[21]],[[22]],[[23]],[[24]],[[25]],[[26]],[[27]],[[28]],[[29]],[[30]],[[31]],[[32]],[[33]],[[34]],[[35]],[[36]],[[37]],[[38]],[[39]],[[40]],[[41]],[[42]],[[43]],[[44]],[[45]],[[46]],[[47]],[[48]],[[49]],[[50]],[[51]],[[52]],[[53]],[[54]],[[55]],[[56]],[[57]],[[58]],[[59]],[[60]],[[61]],[[62]],[[63]],[[64]],[[65]],[[66]],[[67]],[[68]],[[69]],[[70]],[[71]],[[72]],[[73]],[[74]],[[75]],[[76]],[[77]],[[78]],[[79]],[[80]],[[81]],[[82]],[[83]],[[84]],[[85]],[[86]],[[87]],[[88]],[[89]],[[90]],[[91]],[[92]],[[93]],[[94]],[[95]],[[96]],[[97]],[[98]],[[99]],[[100]],[[101]],[[102]],[[103]],[[104]],[[105]],[[106]],[[107]],[[108]],[[109]],[[110]],[[111]],[[112]],[[113]],[[114]],[[115]],[[116]],[[117]],[[118]],[[119]],[[120]],[[121]],[[122]],[[123]],[[124]],[[125]],[[126]],[[127]],[[128]],[[129]],[[130]],[[131]],[[132]],[[133]],[[134]],[[135]],[[136]],[[137]],[[138]],[[139]],[[140]],[[141]],[[142]]]},{"type":"Polygon","arcs":[[143,144,145,146,147]]},{"type":"Polygon","arcs":[[148,149,150,151,152,153]]},{"type":"MultiPolygon","arcs":[[[154]],[[155]],[[156]],[[157]],[[158]],[[159]],[[160]],[[161]],[[162]],[[163,164,-4]]]},{"type":"Polygon","arcs":[[165,166,167,168,-164,-3]]},{"type":"Polygon","arcs":[[169,170,171,172,173]]},{"type":"Polygon","arcs":[[174,175,176,-151]]},{"type":"MultiPolygon","arcs":[[[177]],[[178]],[[179]],[[180]],[[181]],[[182]],[[183]],[[184,185]]]},{"type":"MultiPolygon","arcs":[[[186]],[[187]],[[188,189,190,191,192,193,194,195]]]},{"type":"Polygon","arcs":[[196,197,198,199,200]]},{"type":"Polygon","arcs":[[201,202,203,204,205,206,207,208]]},{"type":"MultiPolygon","arcs":[[[209]],[[210]],[[211,212,213,-167,214]]]},{"type":"Polygon","arcs":[[215,-201,216,217]]},{"type":"Polygon","arcs":[[-152,-177,218,219,220,221]]},{"type":"Polygon","arcs":[[222,223,-204,224,225,226,227]]},{"type":"Polygon","arcs":[[228,-217,-200,229,230,231]]},{"type":"Polygon","arcs":[[-221,232,233,234,235]]},{"type":"Polygon","arcs":[[-232,236,-149,237,238,239]]},{"type":"Polygon","arcs":[[-195,240,241,242]]},{"type":"Polygon","arcs":[[243,244,245,246,247,248,249,-219,-176,250]]},{"type":"Polygon","arcs":[[251,-227,252,253,254]]},{"type":"Polygon","arcs":[[255,256,257,-174,258,-245]]},{"type":"Polygon","arcs":[[-153,-222,-236,259,-147]]},{"type":"Polygon","arcs":[[-250,260,261,262,-233,-220]]},{"type":"MultiPolygon","arcs":[[[263]],[[264]],[[265]],[[266]],[[267]],[[268]],[[269]],[[270]],[[271,272,273,-144,274]]]},{"type":"MultiPolygon","arcs":[[[-209,208,275]],[[-225,-203,276,277]]]},{"type":"Polygon","arcs":[[278,279]]},{"type":"MultiPolygon","arcs":[[[280]],[[281]],[[282]],[[283]],[[284]],[[285]],[[286]],[[287]]]},{"type":"Polygon","arcs":[[-199,288,-256,-244,289,-230]]},{"type":"MultiPolygon","arcs":[[[-259,-173,290,-255,291,292,-246]],[[247,-248,293]]]},{"type":"MultiPolygon","arcs":[[[294]],[[295]],[[296]],[[-226,-278,297,298,299,300,-279,301,-253]]]},{"type":"MultiPolygon","arcs":[[[302]],[[303]],[[304]],[[305]],[[306]],[[307]],[[308]],[[309]],[[310]],[[311,312,-171]],[[313]],[[314,315]]]},{"type":"MultiPolygon","arcs":[[[316]],[[317]],[[318]],[[319]],[[-262,320,-6,321,322]]]},{"type":"Polygon","arcs":[[323,-218,-229,-240,324]]},{"type":"Polygon","arcs":[[325,-185,326,-190,327]]},{"type":"MultiPolygon","arcs":[[[328]],[[329]],[[330]],[[331,-207]],[[332]],[[333]],[[334,335,-196,-243,336,-205,-224]]]},{"type":"MultiPolygon","arcs":[[[337]],[[338]],[[-313,339,-228,-252,-291,-172]]]},{"type":"Polygon","arcs":[[340,341,342,272,-273,-272,343]]},{"type":"Polygon","arcs":[[-249,-248,-247,-293,344,-215,-166,-2,-321,-261]]},{"type":"Polygon","arcs":[[345,-238,-154,-146,346]]},{"type":"MultiPolygon","arcs":[[[347]],[[-299,348]],[[294]],[[-254,-302,-280,-301,349,-212,-345,-292]]]},{"type":"MultiPolygon","arcs":[[[350]],[[351]],[[352]],[[353]],[[354]],[[355]],[[356]],[[357]],[[358]],[[359]],[[360,-341,361]]]},{"type":"MultiPolygon","arcs":[[[362]],[[363]],[[364]],[[365]],[[366]],[[367]],[[368]],[[369]],[[370]],[[371]],[[372,-316,373,-257,-289,-198]]]},{"type":"MultiPolygon","arcs":[[[374]],[[375]],[[376]]]},{"type":"MultiPolygon","arcs":[[[377]]]},{"type":"MultiPolygon","arcs":[[[378]],[[379]],[[380]],[[381]],[[382]],[[383]],[[384]],[[385]]]},{"type":"Polygon","arcs":[[-231,-290,-251,-175,-150,-237]]},{"type":"Polygon","arcs":[[-214,386,-168]]},{"type":"MultiPolygon","arcs":[[[387]],[[388]],[[389]],[[390]],[[391]]]},{"type":"MultiPolygon","arcs":[[[392]],[[393]],[[394]]]},{"type":"Polygon","arcs":[[-361,395,-325,-239,-346,396,-342]]},{"type":"Polygon","arcs":[[-273,-343,-397,-347,-145,-274]]},{"type":"Polygon","arcs":[[397,-328,-189,-336]]},{"type":"MultiPolygon","arcs":[[[398]],[[399]],[[400]],[[401]],[[402]],[[403]],[[404]],[[-263,-323,405,-234]]]},{"type":"MultiPolygon","arcs":[[[-192,406]],[[407]],[[408]],[[409]],[[-241,-194,410]]]}]}},"arcs":[[[2530,5204],[0,0]],[[2534,5759],[0,1],[37,-2],[35,-1]],[[2606,5757],[4,-76],[7,-171],[3,-25],[4,-27],[-1,-12],[3,-7],[-5,-14],[0,-15],[-2,-20],[0,-17],[2,-20],[-1,-39],[3,-22]],[[2623,5292],[-25,-1],[-48,1],[-1,-15],[3,-15],[4,-8],[-2,-17],[3,-10],[-5,-19]],[[2552,5208],[-6,-2],[-4,17],[-1,30],[-2,2],[-3,-21],[-1,-21],[-3,7],[-4,-1]],[[2528,5219],[-2,177],[7,233],[3,117],[-2,13]],[[805,8808],[0,0]],[[790,8597],[3,9],[2,-6],[-5,-3]],[[769,8576],[0,0]],[[764,8574],[0,0]],[[760,8578],[0,0]],[[759,8467],[0,0]],[[754,8549],[0,0]],[[754,8716],[3,19],[4,-3],[-4,-14],[-3,-2]],[[746,8549],[0,0]],[[738,8695],[0,0]],[[717,8449],[2,9],[5,-6],[0,15],[3,11],[4,-4],[5,21],[3,3],[-2,9],[10,8],[-1,-11],[-4,-12],[0,-9],[4,8],[5,-8],[3,2],[-2,-12],[4,10],[1,-14],[-3,-10],[-7,8],[2,-9],[-6,-1],[-4,6],[0,-12],[-6,-9],[-4,-3],[-12,10]],[[713,8604],[4,3],[1,-9],[-4,-2],[-1,8]],[[696,8289],[0,0]],[[690,8271],[2,7],[6,3],[4,-13],[-8,-2],[-4,5]],[[679,8368],[4,17],[11,17],[7,-1],[0,-12],[2,-6],[1,18],[5,2],[-7,4],[0,13],[6,9],[4,-7],[1,-13],[2,14],[4,1],[-6,10],[3,3],[5,-8],[5,-2],[-5,10],[11,-3],[4,7],[-5,-18],[5,2],[7,12],[4,-5],[-4,-3],[5,-16],[-4,3],[-1,-21],[9,2],[-5,-23],[-5,1],[-7,10],[0,-6],[4,-10],[-3,-11],[-3,-1],[-4,8],[1,-10],[-5,-9],[7,-3],[-10,-9],[-2,-10],[-3,10],[1,12],[-5,-21],[-12,-29],[-5,0],[2,12],[7,10],[-4,1],[5,25],[-14,-36],[0,8],[-6,8],[0,21],[-3,12],[-5,2],[1,9]],[[678,8259],[8,19],[4,-5],[-10,-18],[-2,4]],[[652,8189],[4,9],[0,-18],[-4,9]],[[624,8213],[0,0]],[[622,8232],[0,0]],[[608,8271],[7,5],[2,-6],[-9,1]],[[592,8249],[0,0]],[[564,8189],[0,0]],[[557,8194],[0,0]],[[552,8080],[0,0]],[[551,8179],[0,0]],[[548,8086],[3,13],[1,-11],[-4,-2]],[[544,8070],[0,0]],[[543,8114],[4,7],[0,-25],[-4,2],[0,16]],[[538,8071],[0,0]],[[537,8099],[0,0]],[[530,8130],[0,0]],[[526,8084],[5,12],[-3,10],[4,9],[6,-2],[-1,-11],[-7,-13],[-3,-14],[-1,9]],[[524,8522],[0,0]],[[523,8142],[6,2],[0,-8],[-6,6]],[[521,8521],[0,0]],[[509,8129],[4,9],[8,-7],[3,3],[0,-13],[-7,9],[3,-17],[-2,-6],[-4,9],[-3,-4],[-2,17]],[[503,8511],[1,12],[10,14],[-5,-28],[-6,2]],[[493,8117],[0,0]],[[486,8117],[0,0]],[[480,8106],[2,7],[7,-10],[-4,-5],[-5,8]],[[465,8084],[6,3],[-2,-15],[-4,12]],[[459,9093],[3,7],[5,-2],[1,-9],[-8,-1],[-1,5]],[[454,8028],[0,4],[13,-11],[-3,-6],[-10,13]],[[445,8142],[0,0]],[[398,8000],[0,0]],[[388,7987],[8,5],[-1,-7],[-7,2]],[[381,7985],[0,0]],[[378,7980],[0,0]],[[375,8004],[1,6],[7,-10],[-4,-12],[-3,2],[2,12],[-3,2]],[[363,7992],[4,9],[6,-7],[2,-7],[-10,-7],[-2,12]],[[361,7973],[0,0]],[[326,8700],[9,2],[5,-4],[6,16],[4,-2],[2,9],[4,-5],[6,10],[2,-14],[5,3],[6,-6],[-1,-26],[4,-18],[-12,-6],[-5,-13],[-6,12],[-6,0],[-11,15],[-9,10],[-3,17]],[[315,7896],[10,14],[3,-2],[5,11],[1,11],[7,13],[-7,12],[3,14],[11,7],[0,-10],[4,-2],[4,12],[4,-9],[-9,-21],[0,-3],[12,16],[0,-9],[-5,-12],[-7,-7],[-1,-11],[-5,-10],[-10,-1],[-5,-11],[-9,-10],[-6,8]],[[307,9335],[4,8],[19,18],[21,30],[20,22],[18,17],[22,13],[13,1],[5,-5],[-1,-10],[-3,-9],[2,-12],[-8,-12],[5,1],[4,-15],[8,3],[9,-3],[12,3],[3,-5],[7,-2],[7,6],[8,-7],[8,26],[6,1],[4,-5],[6,3],[-4,11],[-11,9],[-5,0],[-6,-7],[1,19],[-11,25],[-6,1],[-4,15],[4,11],[5,-1],[6,-18],[2,-1],[-1,-15],[8,-18],[5,-7],[7,5],[-15,28],[2,19],[4,9],[5,0],[-9,10],[-19,-8],[-10,6],[-4,-1],[-21,13],[-2,25],[-5,23],[-6,11],[-9,11],[-22,34],[-15,10],[-11,19],[-12,8],[-1,3],[9,6],[5,19],[1,23],[-1,12],[18,-4],[7,2],[30,8],[7,6],[13,18],[8,20],[3,16],[-1,19],[4,23],[9,19],[10,26],[13,16],[16,-3],[14,9],[16,21],[16,27],[13,9],[6,-8],[9,-1],[17,4],[15,14],[7,12],[12,28],[7,7],[1,-7],[12,-6],[2,-8],[3,5],[10,-5],[1,-10],[-9,-13],[-4,-1],[1,-14],[9,-3],[4,6],[-1,8],[10,11],[-3,3],[7,11],[11,-14],[2,-24],[6,0],[5,-7],[7,14],[12,0],[7,4],[9,-5],[8,0],[11,-7],[-7,-15],[1,-9],[10,-6],[10,-1],[0,-6],[-6,-4],[1,-4],[9,1],[12,-7],[4,8],[13,4],[5,-9],[15,10],[10,3],[8,-3],[11,-11],[5,3],[7,-14],[4,5],[11,-8],[3,-9],[10,-1],[2,3],[3,-7],[7,4],[18,-1],[4,-5],[7,3],[13,-16],[13,-8],[9,1],[4,8],[25,13],[9,0],[14,-13],[22,-25],[7,-4],[8,-10],[12,-6],[0,-904],[0,-186],[13,-10],[1,10],[14,-14],[8,18],[17,2],[-3,-31],[4,-12],[10,-9],[4,-20],[26,-59],[4,-38],[6,10],[12,19],[7,1],[3,13],[0,21],[4,0],[2,12],[-3,4],[11,7],[13,17],[13,-28],[-1,-17],[3,-16],[7,-3],[4,-14],[5,-11],[-1,-7],[5,-14],[11,-15],[3,-12],[10,-23],[-2,-5],[7,-28],[3,-17],[6,-19],[9,-40],[8,-32],[-3,-14],[9,-6],[-2,-21],[7,-7],[1,-25],[7,2],[14,-24],[8,-4],[5,-12],[4,-4],[1,-11],[5,-5],[4,2],[3,-15],[0,-8],[-4,-17],[0,-23],[5,-35],[-10,-42],[-10,-23],[-3,12],[-1,-6],[-3,7],[-1,29],[-3,13],[4,13],[2,27],[-2,25],[-8,27],[4,-17],[4,-30],[-2,-12],[2,-16],[-3,9],[0,-16],[-3,-9],[-4,4],[3,15],[-3,2],[0,-10],[-4,-6],[-11,25],[0,7],[5,9],[-2,4],[1,31],[-3,-9],[-1,-17],[-4,-6],[0,-14],[-6,11],[-1,12],[4,16],[0,25],[4,17],[-7,-16],[2,-11],[-7,-13],[-3,26],[-6,4],[-1,13],[4,2],[2,12],[5,0],[-2,18],[5,-4],[-10,20],[1,15],[-6,9],[-4,18],[2,10],[-4,-5],[-15,17],[1,15],[6,3],[-6,3],[-2,23],[-4,7],[1,11],[13,-14],[-10,22],[0,9],[-4,-8],[-4,18],[-6,14],[0,25],[2,5],[-1,9],[-3,-11],[-1,-12],[-3,-1],[-10,7],[-4,17],[0,11],[-6,22],[2,0],[-1,18],[-2,-12],[-3,14],[-2,27],[-5,24],[-4,4],[4,-13],[2,-13],[-4,15],[-5,5],[7,-21],[0,-19],[7,-36],[-2,-2],[4,-29],[0,-19],[-6,5],[-4,19],[-6,4],[-8,-6],[0,28],[-5,23],[1,11],[-3,8],[2,-14],[-1,-12],[-3,-1],[-7,11],[-1,15],[-3,-9],[-7,8],[-1,-7],[10,-7],[7,-20],[3,0],[5,-34],[-10,-9],[-4,2],[-2,-13],[-7,13],[-3,8],[-4,0],[-16,27],[0,6],[-7,13],[0,10],[-10,21],[-9,10],[-8,14],[-14,15],[-13,18],[4,12],[4,-3],[-1,30],[4,14],[-2,6],[-6,-25],[-15,-16],[-16,6],[-15,16],[-2,6],[5,1],[1,7],[-3,13],[-5,7],[5,-18],[-6,-7],[-26,14],[-11,2],[-22,-7],[-5,-5],[-8,1],[-11,-23],[4,16],[6,12],[5,0],[-8,14],[-1,-8],[-2,8],[-13,7],[4,4],[-6,6],[4,15],[-6,-3],[-2,-13],[-4,1],[-13,19],[-7,0],[7,13],[-11,-13],[-6,-2],[0,-5],[6,2],[1,-7],[-11,-7],[-4,-8],[-2,5],[5,8],[-6,0],[4,16],[3,-2],[19,14],[-6,6],[3,8],[-8,-11],[-2,4],[6,10],[-8,0],[-4,-7],[-5,2],[-1,5],[12,9],[-8,0],[-4,7],[-2,10],[4,15],[10,0],[-1,4],[-9,0],[-10,-22],[-2,22],[-4,-22],[-2,4],[-3,-10],[-3,9],[-1,13],[-3,-12],[1,-11],[-5,4],[1,-10],[-9,-5],[-3,5],[11,42],[1,10],[-9,-31],[-3,8],[-6,-35],[7,-4],[1,-9],[-4,-7],[-3,-14],[7,14],[4,-19],[-2,-18],[-4,4],[-4,-8],[5,-1],[9,-21],[-7,-14],[-5,-1],[-3,24],[-3,-23],[-2,7],[-3,-9],[-4,4],[-10,3],[-1,4],[-3,-17],[-4,-2],[3,14],[-3,17],[-1,-23],[-3,-1],[-2,-21],[-1,24],[-2,1],[0,-36],[-3,12],[-5,6],[3,-14],[-12,-30],[-2,-2],[3,22],[-6,-14],[-1,14],[-2,-4],[1,-14],[-4,0],[-7,-25],[-2,9],[-1,-9],[-6,-1],[-2,8],[-5,-14],[-5,0],[0,7],[-6,4],[2,19],[4,3],[13,17],[9,22],[-4,0],[-11,-17],[-8,8],[-2,9],[4,30],[8,21],[1,17],[3,4],[0,17],[-3,21],[10,9],[9,17],[9,11],[6,-16],[5,-5],[3,12],[3,1],[12,-8],[7,-2],[-3,7],[-4,-1],[-11,10],[-9,16],[4,6],[6,20],[8,8],[-5,5],[-8,-13],[-3,-16],[-6,2],[-7,-2],[-6,7],[-1,-6],[-9,-8],[-4,-15],[-8,-5],[-9,-18],[2,-17],[-4,2],[-4,-7],[-3,-9],[-6,-9],[3,-14],[-4,-5],[-5,-15],[-6,1],[5,-19],[-4,-17],[-2,-5],[-12,-2],[-2,-6],[8,2],[-1,-16],[-5,-7],[-5,1],[1,11],[-3,7],[0,-18],[-4,-2],[1,-8],[-5,-2],[2,-9],[-12,-10],[0,-19],[-4,-8],[3,-14],[3,6],[8,-3],[10,-9],[3,-12],[-3,-15],[-8,-15],[-6,-1],[0,-10],[-5,-5],[2,-11],[-5,-7],[3,-5],[-3,-16],[-4,-6],[-4,6],[1,-9],[-4,-5],[-4,5],[-2,-7],[-5,1],[-4,-7],[1,-9],[-7,-5],[1,-8],[-2,-6],[-5,9],[-5,-28],[-8,1],[0,-14],[-5,4],[-10,-21],[6,6],[0,-19],[-5,-15],[-1,-8],[-10,-1],[-8,-24],[-5,11],[-1,-11],[-4,-8],[3,-8],[-6,-2],[-2,8],[-5,-5],[-4,-10],[4,3],[2,-13],[-7,6],[-1,-7],[-5,2],[-5,-16],[8,-6],[-3,-7],[6,0],[-10,-16],[-1,-13],[-5,12],[1,-14],[-6,4],[-1,-7],[-13,-8],[-1,-9],[-3,8],[-1,-22],[-5,-12],[3,28],[-5,6],[-2,-7],[-5,-1],[0,-8],[-10,-14],[-4,-15],[-1,10],[-2,-12],[-4,-1],[-2,10],[-4,-12],[-6,-8],[-8,0],[1,16],[3,14],[-7,-1],[-2,-11],[0,-12],[-6,-25],[-4,4],[3,-14],[-3,-5],[-4,9],[0,-10],[-8,-1],[-1,23],[-3,6],[-3,-10],[4,-9],[1,-20],[-3,4],[-5,-8],[-7,21],[-4,-9],[6,-11],[-10,-17],[5,-2],[4,-14],[-4,2],[-4,9],[-2,-11],[-5,-6],[-6,4],[-12,-6],[-3,-14],[-8,-9],[-6,3],[-2,13],[0,9],[6,6],[4,22],[4,10],[2,-5],[13,17],[10,2],[3,-23],[3,3],[0,29],[6,6],[6,0],[0,10],[4,5],[3,9],[4,0],[0,14],[6,21],[13,24],[19,14],[8,2],[0,-14],[-3,-11],[4,-9],[0,18],[9,-4],[0,-8],[5,-2],[2,7],[-10,17],[6,35],[15,30],[8,11],[16,26],[3,-7],[5,1],[-1,15],[2,12],[7,24],[8,14],[5,14],[7,9],[0,25],[3,41],[5,6],[-5,12],[3,27],[11,24],[4,30],[-6,-12],[-28,-29],[-5,6],[-1,7],[-6,8],[2,23],[-8,-16],[0,-12],[-2,-7],[4,-25],[-2,-8],[-7,1],[-9,36],[-6,20],[-4,3],[-2,-14],[-3,-3],[-4,13],[-3,-3],[-5,10],[0,14],[-12,-19],[-16,-20],[-1,-8],[-11,-14],[-5,13],[5,14],[0,22],[-6,21],[-2,14],[3,13],[7,13],[-5,18],[-1,11],[-5,16],[0,7],[-8,27],[-3,-4],[0,-16],[-17,-16],[-16,-7],[-13,4],[-2,13],[0,8],[-5,7],[-4,14],[-5,12],[-4,0],[-8,15],[5,10],[-3,3],[-3,-5],[-7,6],[4,4],[9,16],[-1,19],[-5,7],[2,9],[4,1],[-4,6],[-5,12],[-2,-12],[-5,1],[-2,22],[-6,3],[-3,14],[5,8],[-4,8],[-7,-6],[0,14],[9,5],[-5,7],[-2,10],[12,4],[-3,13],[0,13],[2,8],[16,44],[3,14],[4,6],[-1,10],[3,20],[6,13],[-2,5],[6,12],[11,6],[8,-6],[3,-8],[9,-11],[7,2],[11,20],[11,30],[-1,6],[7,-4],[1,-7],[12,0],[12,6],[11,32],[0,7],[-5,30],[-1,18],[-8,18],[-7,3],[4,14],[10,-5],[6,14],[0,12],[-4,11],[-7,12],[-5,-16],[-4,-4],[-4,5],[-6,-10],[-8,-3],[-2,-7],[-9,-11],[-2,-16],[-4,-7],[-2,20],[-9,16],[-4,-6],[8,-12],[-4,-10],[-2,8],[-10,11],[-23,-1],[-11,-12],[-6,-2],[-10,8],[-24,9],[-4,8],[-2,10],[1,17],[-7,13],[0,6],[-6,12],[7,-4],[5,8],[3,12],[-3,6],[-9,1],[-7,5],[-10,2],[-9,12],[-10,9],[-1,9]],[[281,7842],[3,4],[4,18],[1,16],[5,10],[7,-1],[-2,7],[2,19],[9,10],[6,-6],[-1,-15],[-12,-17],[-7,-24],[-16,-25],[1,4]],[[275,7832],[0,0]],[[261,7856],[0,0]],[[260,8281],[9,-3],[-5,-7],[-4,10]],[[261,7868],[0,0]],[[254,7841],[7,5],[3,-4],[-2,-10],[-5,2],[-3,7]],[[252,7847],[0,0]],[[250,7826],[0,0]],[[243,8345],[7,7],[-3,-12],[-4,5]],[[232,7812],[4,12],[3,-4],[-1,-8],[-5,-7],[-1,7]],[[223,7810],[0,0]],[[218,7799],[0,0]],[[203,9089],[3,12],[0,15],[4,-12],[6,-6],[13,-7],[12,16],[6,-3],[5,-8],[1,-14],[11,-7],[3,-7],[14,-3],[10,-5],[-5,-18],[-5,4],[-9,-4],[-5,-9],[-2,-15],[-6,16],[-8,12],[-4,0],[-2,13],[-6,7],[-9,7],[-6,1],[-10,-13],[-8,7],[-3,21]],[[182,7777],[4,10],[4,-3],[-3,-9],[-5,-4],[0,6]],[[169,8733],[5,12],[0,-10],[8,-14],[5,0],[6,-10],[-14,6],[-6,14],[-4,2]],[[169,8757],[0,0]],[[142,7757],[7,-2],[5,4],[7,-5],[11,-2],[-14,-7],[-13,4],[-3,8]],[[106,7745],[10,4],[11,9],[1,4],[7,4],[-2,12],[5,13],[5,-14],[-5,-12],[3,-8],[-8,-2],[-2,-10],[-2,3],[-6,-5],[-17,2]],[[101,7740],[0,0]],[[100,7763],[0,0]],[[95,7738],[0,0]],[[89,7740],[4,1],[1,-8],[-5,7]],[[82,7751],[4,4],[2,-8],[-2,-13],[-3,2],[-1,15]],[[81,7722],[0,5],[7,4],[1,-7],[-6,-9],[-2,7]],[[60,7699],[3,11],[-1,10],[3,1],[1,17],[5,4],[0,-19],[8,4],[0,-15],[-5,1],[-9,-17],[-1,10],[-4,-7]],[[47,7731],[0,0]],[[40,7708],[4,1],[10,12],[0,13],[5,-4],[-3,-10],[0,-12],[-4,-3],[-3,5],[-9,-2]],[[26,7728],[7,5],[4,-16],[-1,-9],[-5,-9],[-2,8],[4,2],[-7,19]],[[13,7696],[0,0]],[[8,7693],[0,0]],[[8,7719],[0,0]],[[4,7670],[0,0]],[[0,7659],[0,0]],[[9991,7740],[5,4],[3,-6],[-4,-11],[-4,13]],[[9967,7700],[8,-4],[9,-23],[6,-3],[-5,-3],[-9,21],[-9,12]],[[9962,7740],[4,-4],[-2,-6],[-2,10]],[[9956,7722],[0,0]],[[9952,7745],[0,0]],[[9927,7730],[8,11],[2,15],[4,-4],[-10,-29],[-4,7]],[[9890,7785],[0,0]],[[9840,7828],[0,0]],[[9837,7829],[0,0]],[[9835,7833],[0,0]],[[9820,7790],[8,11],[4,0],[-2,-7],[1,-10],[-4,5],[-7,1]],[[9795,7850],[5,9],[13,-2],[6,-7],[3,-11],[-5,3],[-3,-9],[-9,1],[-5,16],[-5,0]],[[1334,8102],[0,0]],[[1327,8086],[7,6],[2,-10],[-5,-7],[-4,11]],[[1324,8086],[0,0]],[[1323,8096],[3,12],[0,16],[5,-11],[-1,-20],[-7,3]],[[1317,8134],[1,7],[5,-13],[-3,-21],[-2,7],[-1,20]],[[1300,8267],[0,0]],[[1298,8253],[0,0]],[[1295,8264],[0,0]],[[1288,8088],[0,0]],[[1285,8235],[0,6],[5,-20],[-5,6],[0,8]],[[1283,8250],[4,12],[6,0],[3,-8],[-1,-13],[-6,-5],[-6,14]],[[1277,8142],[0,0]],[[1270,8077],[0,0]],[[1267,8165],[0,0]],[[1266,8170],[0,0]],[[1263,8145],[2,12],[3,-1],[0,-11],[6,13],[3,-3],[-3,-18],[-5,-7],[-1,-10],[-2,8],[2,14],[-5,3]],[[1263,8204],[7,23],[-4,6],[3,16],[12,-3],[7,-35],[8,-12],[4,-16],[0,-13],[3,-2],[2,-12],[4,-11],[-10,14],[-3,-10],[6,2],[7,-17],[-2,-17],[4,-1],[1,8],[2,-11],[-4,-22],[4,4],[0,-28],[-2,-10],[-7,2],[-2,7],[-4,0],[5,8],[-8,14],[2,15],[-1,9],[-4,-5],[-1,-15],[-4,4],[1,10],[-2,10],[-5,5],[3,-14],[3,-27],[5,5],[3,-7],[0,-12],[-4,5],[3,-18],[-6,4],[-8,30],[-2,15],[0,17],[-6,-3],[0,13],[4,-3],[3,10],[3,4],[-5,18],[-5,8],[1,12],[-3,-5],[-5,10],[4,7],[4,-6],[3,3],[-6,9],[1,15],[-7,-15],[-2,8]],[[1261,8360],[0,0]],[[1259,8198],[0,0]],[[1247,8198],[7,-1],[-4,-8],[-3,9]],[[1246,8308],[4,10],[6,-2],[3,-13],[2,5],[-1,12],[-4,9],[5,8],[15,-12],[7,1],[2,-8],[2,-14],[3,-3],[8,-25],[-8,-9],[-8,3],[-2,-9],[-6,5],[-3,-6],[-4,1],[-1,12],[-3,-6],[1,-13],[-5,-25],[0,-10],[-4,0],[-1,-9],[-4,12],[-1,27],[3,21],[-3,3],[-3,35]],[[1231,8488],[6,-15],[1,-13],[4,5],[5,-6],[6,1],[-1,-9],[8,-31],[0,-14],[-3,15],[-5,9],[2,-16],[5,-18],[2,-17],[0,-12],[-2,-6],[-4,3],[-2,-14],[-9,-21],[-3,0],[-2,23],[4,9],[-2,11],[4,-1],[-4,14],[-4,24],[1,13],[-3,27],[-3,17],[-1,22]],[[1229,8502],[0,0]],[[1220,8561],[0,0]],[[1210,8367],[8,23],[10,-16],[6,-1],[0,-19],[3,-35],[3,-25],[0,-54],[-1,-12],[-4,8],[-7,35],[3,7],[-5,0],[-5,18],[-5,3],[-2,10],[4,-1],[-1,10],[3,9],[-4,9],[4,17],[-6,-1],[-4,15]],[[1209,8485],[0,0]],[[1206,8353],[0,12],[3,1],[6,-16],[4,2],[-4,-9],[-3,-17],[-6,-1],[3,14],[-3,14]],[[1198,8512],[0,0]],[[1198,8474],[0,0]],[[1186,8434],[0,17],[6,8],[-1,14],[3,0],[1,-11],[3,5],[4,-2],[6,11],[8,-14],[-4,-16],[1,-5],[4,16],[14,-9],[1,-9],[-3,-11],[-3,1],[5,-9],[4,-37],[-8,-3],[-13,23],[0,-21],[-4,-14],[-5,5],[-6,21],[-4,1],[-3,27],[-6,12]],[[933,8718],[0,0]],[[923,8722],[7,-1],[-2,-5],[-5,6]],[[886,8778],[7,2],[-2,-6],[-5,4]],[[881,8751],[4,10],[2,-9],[-6,-1]],[[881,8704],[0,0]],[[869,8649],[2,10],[5,16],[8,14],[9,30],[4,-8],[0,-6],[-7,-11],[-9,-27],[4,-6],[-7,-3],[-7,-11],[-2,2]],[[869,8703],[4,28],[7,12],[-2,-25],[-4,-24],[-5,9]],[[867,8760],[5,-4],[-3,-4],[-2,8]],[[1795,5493],[5,5],[2,17],[-2,14],[-5,7],[1,21],[-2,16],[5,14],[2,20],[-1,27],[3,19],[8,20],[-1,10],[-5,12],[-3,30],[-5,20],[0,14]],[[1797,5759],[2,16],[-1,25],[-2,11],[0,20],[-1,22],[1,9],[-2,24],[5,7],[5,-1],[4,-15],[3,1],[2,20],[0,94]],[[1813,5992],[74,0],[66,0]],[[1953,5992],[0,-289],[0,-61],[0,-311]],[[1953,5331],[-57,0],[-36,48],[-68,87],[0,15],[3,12]],[[1953,6459],[72,0],[7,0],[60,0]],[[2092,6459],[56,0],[0,-117]],[[2148,6342],[0,-100],[0,-251]],[[2148,5991],[-27,1]],[[2121,5992],[-37,-1],[-71,0],[0,1],[-60,0]],[[1953,5992],[0,135],[-1,14],[1,74],[0,244]],[[2741,4576],[0,0]],[[2738,4569],[0,0]],[[2731,4559],[0,0]],[[2712,4542],[2,11],[8,17],[5,-16],[-12,-13],[-3,1]],[[2706,4539],[0,0]],[[2702,4541],[0,0]],[[2699,4791],[0,0]],[[2680,4549],[0,0]],[[2632,5151],[0,0]],[[2623,5292],[2,-29],[2,-5],[39,-8],[34,-8],[2,-24],[3,1],[1,24],[0,24],[2,5],[6,-10],[8,-4]],[[2722,5258],[1,-47],[4,-58],[3,-29],[6,-52],[10,-61],[1,-15],[-2,-20],[1,-22],[5,-42],[4,-42],[4,-42],[2,-26],[0,-24],[-3,-104],[-3,2],[-2,-22],[-1,-28],[4,14],[-4,-30],[-4,-12],[2,17],[-3,2],[-6,-7],[-9,-4],[-3,12],[1,19],[-4,36],[-2,10],[-7,14],[-2,-5],[-3,28],[-2,33],[-4,18],[-3,-6],[-1,19],[3,18],[-1,19],[-3,-5],[1,-15],[-3,-3],[-12,86],[3,13],[5,27],[-8,22],[-1,-9],[4,-16],[-4,-14],[-3,19],[0,19],[-1,23],[2,-3],[4,29],[0,30],[-2,17],[1,7],[-3,28],[-6,4],[-4,13],[-2,16],[-5,11],[0,17],[-4,6],[-2,20],[-11,24],[-7,0],[-2,-10],[0,-13],[-6,1],[-9,-21],[-7,-1],[2,-15],[-4,10],[-4,-2],[1,17],[-1,11],[-16,40],[-11,14],[-9,4],[-18,-9],[-7,-5]],[[2606,5757],[36,1]],[[2642,5758],[19,0],[14,1]],[[2675,5759],[0,-7],[-6,-18],[0,-12],[5,-9],[4,-16],[4,1],[4,-38],[5,-25],[8,-22],[2,-14],[4,-8],[4,-14],[-1,-12],[5,-14],[1,-9],[6,-15],[2,-20],[1,-26],[3,-8],[5,-31],[0,-20],[6,-10]],[[2737,5412],[-3,-19],[-4,-17],[-1,-23],[-2,-14],[-1,-22],[-3,-10],[-1,-49]],[[2552,6542],[3,-9],[6,-2],[11,16]],[[2572,6547],[56,0],[0,-7]],[[2628,6540],[0,-163],[0,-139]],[[2628,6238],[-3,-7],[4,-21],[-1,-9],[-5,-1],[-4,-11],[-4,6],[-5,-3],[1,-20],[-5,-12],[-2,-16],[-4,-3],[-3,-14],[0,-15],[-3,-4],[-7,8],[-1,10],[-6,-13],[1,-12],[-7,-3],[-1,10],[-7,-12],[-3,-13],[-7,19],[-3,-4],[-3,7],[1,-13],[-3,5],[-7,-1],[1,-9],[-4,-2]],[[2538,6085],[-2,12],[2,18],[3,11],[0,18],[2,-3],[6,27],[1,19],[3,8],[-1,14],[1,11],[-4,25],[3,21],[0,276]],[[2148,6342],[187,0]],[[2335,6342],[4,-12],[7,-1],[1,-7],[-6,-35],[6,-21],[2,-15],[7,-7],[-1,-5],[0,-247]],[[2355,5992],[-104,0],[-52,0],[-51,-1]],[[3086,6831],[0,0]],[[3082,6827],[0,0]],[[3082,6848],[0,0]],[[3073,6837],[0,0]],[[3071,6791],[0,0]],[[3070,6822],[3,9],[2,-14],[-3,-5],[-2,10]],[[3069,6838],[0,0]],[[3021,6699],[-4,8],[1,11],[-5,18],[1,23],[-2,127],[-2,76]],[[3010,6962],[2,4],[5,-14],[2,24],[4,-6],[-2,16],[4,17],[5,7],[-1,9],[4,10],[-1,20],[3,31],[4,11],[2,31],[21,90],[5,-3],[0,-20],[4,-9],[9,12],[6,0],[4,7],[6,-12],[6,-20],[0,-125],[0,-37],[5,-8],[5,-2],[0,-11],[-2,-1],[2,-13],[-2,-12],[5,-17],[1,7],[4,-4],[5,-41],[-6,-18],[-3,7],[-8,-31],[-2,11],[-3,1],[-3,-15],[-5,-11],[-4,6],[-1,-13],[-5,-2],[-2,10],[3,6],[-3,5],[-2,-6],[1,-14],[-3,-12],[1,-17],[-4,24],[1,5],[-4,6],[1,22],[-4,-16],[-4,-31],[1,-10],[-5,-11],[-9,-4],[-3,-12],[-5,-9],[-2,9],[-2,-8],[-5,-4],[-1,-12],[-4,-4],[-2,-21],[-4,-5],[0,-11],[-4,-19]],[[3033,6495],[9,-4],[-5,-4],[-4,8]],[[3017,6500],[7,15],[4,-15],[-11,0]],[[2950,6663],[22,-2]],[[2972,6661],[33,-4],[7,19],[6,1]],[[3018,6677],[1,-21],[5,-4],[-2,-9],[-6,-3],[1,-6],[-4,-11],[-1,-15],[4,4],[3,-9],[4,-17],[-2,-12],[4,-7],[1,-13],[7,-12],[8,11],[-3,26],[3,-14],[2,-26],[-12,-6],[-4,-10],[-5,-1],[1,20],[-2,3],[-3,-13],[-3,-1],[-1,-13],[-5,-1]],[[3009,6517],[0,19],[-2,2]],[[3007,6538],[0,4]],[[3007,6542],[-3,8],[-2,28],[-12,-1]],[[2990,6577],[0,1],[-47,3]],[[2943,6581],[0,5],[7,77]],[[2282,7392],[58,0],[0,44],[5,-1],[4,-9],[5,-64],[3,-5],[8,0],[1,-6],[11,-2],[1,-13],[9,3],[3,10],[10,-1],[7,-10],[1,-9],[5,-1],[4,-27],[3,2],[0,13],[6,1],[1,-10],[8,-8],[1,-11],[4,0],[0,-8],[9,5],[10,19],[3,-17],[5,2],[6,-3],[7,2],[7,-14],[8,1],[-11,-20],[-16,-15],[-9,-16],[-7,-19],[-10,-31],[-17,-40],[2,-9]],[[2427,7125],[-2,4],[-5,-10],[0,-69],[-2,-6],[-10,-15],[-4,-20],[-1,-16],[3,-1],[4,-15],[-4,-18],[0,-52],[-1,-8],[8,-24],[6,-3],[2,-11],[9,-14],[1,-15],[8,-20],[4,-3],[5,-19],[1,-40]],[[2449,6750],[-145,0]],[[2304,6750],[0,210],[-1,7],[-6,6],[-5,24],[8,25],[1,13]],[[2301,7035],[-1,45],[-4,13],[-2,26],[1,31],[-2,5],[-1,75],[-7,62],[0,16],[-1,31],[2,17],[-4,36]],[[2886,6299],[1,7]],[[2887,6306],[3,13]],[[2890,6319],[8,11],[0,7],[11,23],[-9,31],[0,14],[-4,5],[0,13],[4,21],[-3,11],[5,14],[4,24],[4,8]],[[2910,6501],[22,-42],[-4,-36]],[[2928,6423],[-1,-4]],[[2927,6419],[-3,-3],[-2,-16]],[[2922,6400],[8,-15],[-4,-71],[-6,-38],[-9,-25],[-4,-27],[-5,-6],[2,26],[-8,9],[-10,26],[0,18]],[[2886,6297],[0,2]],[[2881,5869],[0,0]],[[2873,5767],[2,6],[11,17],[1,-4],[-8,-7],[-6,-12]],[[2715,5944],[39,-5],[22,0],[72,0],[29,1]],[[2877,5940],[4,-47],[6,-42],[-6,25],[-3,49],[-6,10],[4,-16],[3,-35],[-3,20],[-3,-6],[-5,13],[4,-17],[-7,-7],[-4,-9],[-7,2],[1,-11],[7,4],[1,-4],[9,5],[1,-37],[1,27],[5,7],[2,-16],[0,-16],[-1,-12],[-4,-2],[-6,-28],[-10,5],[-3,16],[0,-14],[-5,4],[-7,12],[10,-20],[4,-4],[1,-7],[-2,-18],[-7,-17],[-5,12],[0,-7],[6,-9],[9,16],[4,-14],[-3,-9],[-3,-21],[12,46],[1,-2],[-7,-25],[-7,-30],[-4,12],[-9,-4],[-5,-6],[-10,-22],[-8,-30],[-3,-36],[-6,7],[-6,-1],[-4,-6]],[[2803,5625],[-32,111],[-31,2],[0,14],[-4,20],[-3,-8],[0,12],[-35,6],[-7,-4],[-16,-19]],[[2642,5758],[0,27],[8,9],[0,13],[7,17],[8,1],[7,19],[7,5],[3,21],[1,-4],[6,18],[0,-12],[4,5],[2,9],[5,8],[5,-3],[4,20],[5,11],[1,22]],[[2092,7392],[130,0],[60,0]],[[2301,7035],[-52,0],[-62,0],[-95,1]],[[2092,7036],[0,282],[0,74]],[[2355,5992],[0,-58]],[[2355,5934],[5,-130],[-2,-204]],[[2358,5600],[-10,13],[-3,13],[-7,12],[-2,-10],[-7,0],[-2,6],[-6,-12],[-9,2],[-1,-10],[-4,-8],[-3,11],[-5,8],[-7,2],[-1,9],[-7,-25],[-1,22],[-7,-12],[-7,20],[-4,-15],[-4,2],[1,13],[-4,1],[-1,18],[-1,-5],[-6,6],[-3,-12],[-2,10],[-6,0],[-6,9],[-6,0],[0,14],[-5,14],[0,-9],[-6,4],[-3,-3],[-6,22],[-2,-2],[0,226],[-84,0]],[[2121,5934],[0,58]],[[2747,6573],[10,13],[12,21]],[[2769,6607],[0,-32],[84,0],[38,0],[3,-15],[4,-3],[2,-11],[-1,-16],[5,-20],[5,-1],[1,-8]],[[2890,6319],[-5,4],[-6,-14]],[[2879,6309],[-103,0]],[[2776,6309],[-29,0],[0,108]],[[2747,6417],[0,156]],[[2092,6925],[0,111]],[[2304,6750],[-4,0],[1,-12],[0,-20],[3,-12],[-2,-8],[-1,-23],[-2,-17],[3,-9],[2,-16]],[[2304,6633],[-5,2],[-2,16],[-8,13],[-4,1],[-5,12],[-11,-4],[-4,4],[-5,-13],[-13,22],[0,6],[-88,0],[-67,0]],[[2092,6692],[0,233]],[[2358,5600],[4,-11],[5,5],[4,-4],[0,-62]],[[2371,5528],[0,-120],[3,-12],[4,-22],[-2,-12],[5,-28],[2,-22],[2,1],[-1,-42],[-3,-25],[-1,-19],[-2,-13],[2,-5],[0,-25],[-6,-29],[2,-16]],[[2376,5139],[-8,-4],[-18,-32],[7,22],[-6,-4],[2,27],[-4,0],[-1,-10],[-4,-2],[0,-12],[3,-7],[0,-22],[-6,-16],[-1,-10],[9,30],[3,-2],[-9,-21],[-10,-32],[-23,-44],[-6,-20],[-5,-12],[-8,-22],[-3,-14],[-8,-56],[-2,-33],[1,-41],[4,-57],[1,-27],[-3,54],[-3,30],[-1,38],[1,27],[4,32],[9,54],[8,22],[5,7],[0,9],[-5,-11],[-5,7],[0,-19],[-4,-12],[-3,9],[-4,-13],[4,3],[1,-8],[-5,-24],[-2,5],[-5,-1],[2,-15],[3,-5],[-4,-44],[-2,5],[-4,-11],[6,-1],[-2,-52],[2,-39],[4,-24],[0,-21],[3,-4],[0,-13],[-5,-2],[-1,-11],[-6,12],[-2,9],[-4,5],[-11,0],[-7,19],[-6,2],[-5,15],[-7,7],[-5,48],[-5,21],[0,27],[-2,7],[1,21],[-3,17],[-3,2],[-5,17],[-1,21],[-4,19],[-6,16],[-3,36],[-3,8],[-5,52],[-3,17],[-6,14],[-2,11],[-5,7],[0,12],[-3,4],[-3,14],[-7,-2],[-7,5],[-2,-2],[-7,11],[-3,-13],[-7,-5],[-4,-24],[-3,-37],[-3,-3],[-3,-22],[-5,-1],[-6,18],[-6,6],[-3,11],[-4,2],[-5,9],[-3,15],[-7,16],[-5,32],[0,38],[-4,21],[-2,17],[-3,14],[-6,13],[-5,7],[-5,26],[-5,10],[-5,23],[-7,12],[-5,30],[-4,6]],[[2023,5383],[-3,14],[0,12],[99,0],[0,121],[1,106],[0,298],[1,0]],[[2092,6692],[0,-233]],[[1953,6459],[-56,0],[0,116]],[[1897,6575],[0,194],[0,95]],[[1897,6864],[0,61],[9,-1],[45,3],[1,-2],[140,0]],[[2990,6577],[0,-69],[-1,-12]],[[2989,6496],[-3,2],[-12,-9],[-8,1],[-6,-3],[-1,6],[-6,-17],[-6,-6],[-8,-14]],[[2939,6456],[-2,14],[7,13],[-2,11],[1,87]],[[2323,6411],[33,-2],[34,1],[45,3],[9,-27]],[[2444,6386],[-3,-16],[1,-23],[3,-36],[10,-35],[8,-24],[2,-35],[2,-7],[3,11],[6,-5],[4,-8],[-2,-15],[0,-13],[-5,-32],[0,-15],[10,-29],[2,-9],[3,3],[9,-25],[0,-18],[3,-16],[-3,-13],[6,-35],[1,8],[4,-9]],[[2508,5990],[-2,-20],[1,-16],[-3,-13],[-3,7],[-1,-14]],[[2500,5934],[-2,0]],[[2498,5934],[-2,0]],[[2496,5934],[0,-26],[-5,-4],[3,-9],[-3,-19]],[[2491,5876],[-18,0],[1,10],[7,21],[1,14],[-3,13],[-124,0]],[[2335,6342],[-3,6],[1,8],[-2,15],[-4,7],[-4,33]],[[2690,6158],[7,3],[1,15],[4,5],[-2,21],[5,27],[4,-19],[4,18],[0,18],[2,11],[3,0],[3,15],[2,-7],[5,6],[11,37],[-1,6],[3,18],[0,19],[4,28],[0,17],[-2,13],[4,8]],[[2776,6309],[0,-59],[11,30],[4,-3],[5,21],[4,-11],[5,-1],[3,14],[5,7],[8,-16],[3,-12],[1,-16]],[[2825,6263],[-3,-22],[-14,39],[0,-14],[-2,-10],[1,-11],[-14,-48],[-3,11],[-6,-42],[-3,-9],[-5,5],[-4,16],[-1,-19],[-7,-29],[-2,-22],[-5,-17],[-3,-18],[2,-7],[-2,-14],[-5,-11],[-1,7],[-7,-13],[-3,7],[-2,-14],[-8,-8],[-4,12],[-5,-15],[-4,-2],[-7,19],[-1,21]],[[2707,6055],[-4,2],[-5,13],[-1,14],[-5,17],[1,5],[-5,19],[2,14],[0,19]],[[2444,6386],[1,2],[0,24],[7,8],[1,19],[3,10],[1,21],[-5,17],[2,21],[11,6],[9,14],[1,17],[3,8],[1,36],[-6,11],[-1,14],[-6,21]],[[2466,6635],[27,0],[24,-2],[28,0]],[[2545,6633],[-1,-23],[4,-25],[2,-27],[2,-16]],[[2538,6085],[-3,-16],[2,-22],[-11,-9],[-1,-13],[2,-15],[-1,-10],[-13,18],[-4,-6],[-3,-16],[2,-6]],[[2023,5383],[-47,0],[0,-52],[-23,0]],[[2491,5876],[2,-13],[-4,-15],[-5,-5],[4,-9],[-3,-5],[-6,-21],[2,-5],[-2,-14],[3,-14],[-4,-3],[-3,-13]],[[2475,5759],[1,-11],[-7,-12],[-2,-16],[1,-28],[-6,-7],[-2,-11],[-1,-22],[-6,-14],[3,-20],[-4,-1],[1,-14],[-4,1],[3,-8],[-3,-5],[3,-11],[0,-19],[1,-19],[-3,-4],[1,-12]],[[2451,5526],[-53,2],[-27,0]],[[1687,5582],[6,-9],[1,-12],[-4,3],[0,11],[-3,7]],[[1686,5529],[8,-24],[-4,2],[-4,22]],[[1674,5583],[0,0]],[[1663,5646],[0,0]],[[1659,5558],[0,0]],[[1650,5652],[10,-10],[-5,-4],[-4,2],[-1,12]],[[1641,5642],[5,5],[2,-12],[-4,-4],[-3,11]],[[1635,5647],[0,0]],[[1530,6575],[16,0],[14,2],[18,0],[41,-3],[29,1]],[[1648,6575],[0,-1]],[[1648,6574],[0,-224],[0,-125],[31,-93],[29,-85],[44,-139],[23,-76],[22,-73]],[[1795,5493],[-42,-13],[-25,-9],[-2,18],[-2,-2],[0,23],[-2,30],[-5,24],[-6,15],[-2,10],[-11,25],[-2,-7],[-4,5],[0,12],[-4,23],[-7,-5],[-12,18],[-1,14],[-8,16],[-9,0],[-7,7],[-9,-2],[-6,15],[2,33],[-2,4],[1,26],[-7,15],[1,13],[-4,12],[-5,21],[-2,2],[-2,14],[-4,13],[-7,36],[-5,10],[-1,23],[0,18],[2,-4],[2,23],[-4,21],[-5,-2],[-8,27],[0,19],[-4,19],[0,30],[3,4],[2,-26],[7,-16],[-2,26],[-4,12],[1,8],[-4,13],[5,9],[-4,12],[-3,-3],[1,-14],[-2,-20],[-5,8],[-3,13],[-5,0],[1,29],[-5,23],[-5,14],[-4,18],[-8,27],[2,12],[-4,35],[2,24],[-3,31],[-6,22],[-8,28],[-1,21],[6,47],[2,22],[-1,13],[2,35],[-2,35],[-3,5],[1,25]],[[2886,6299],[0,0]],[[2887,6306],[-3,-8],[1,-19],[4,-17],[1,-28],[6,-31],[2,-1],[2,-41]],[[2900,6161],[-18,1],[-3,147]],[[2842,6217],[2,7],[4,-11],[-4,-12]],[[2844,6201],[-2,16]],[[643,3979],[7,34],[-2,9],[0,19],[8,-17],[9,-13],[5,-18],[0,-14],[8,-26],[-5,-20],[-4,-8],[-5,-1],[-6,-16],[-4,-25],[-6,14],[-1,10],[1,26],[-5,46]],[[625,4116],[2,13],[2,-3],[3,-13],[4,7],[9,-18],[-2,-17],[-7,-7],[-4,1],[0,21],[-5,5],[-2,11]],[[625,4071],[4,9],[1,-9],[-5,0]],[[615,4114],[5,2],[2,-11],[-4,-10],[-3,19]],[[608,4137],[2,14],[15,-7],[-5,-12],[-6,5],[-6,0]],[[581,4193],[5,2],[4,14],[3,-18],[0,-12],[6,-18],[-5,-5],[-2,6],[-6,-1],[-5,32]],[[539,4246],[2,13],[4,9],[5,1],[3,-14],[-2,-20],[-2,-8],[-5,3],[-5,16]],[[526,4225],[5,17],[0,-11],[-4,-13],[-1,7]],[[2449,6750],[1,-17],[4,-12],[-3,-14],[0,-27],[3,-18],[10,-13],[2,-14]],[[2323,6411],[-4,15],[3,21],[-4,44],[0,21],[-4,9],[-1,9],[1,22],[-2,13],[1,7],[-4,9],[-2,21],[-2,13],[-1,18]],[[2628,6238],[1,5],[5,-9],[4,4],[3,-9],[4,-26],[10,-7],[5,-14],[4,8],[6,-11],[4,2],[4,13],[3,3],[2,-19],[3,-4],[4,-16]],[[2707,6055],[-10,-31],[-11,-18],[0,-9],[-4,-7],[0,-11],[-6,-4],[-2,-13],[-15,-16]],[[2659,5946],[0,-3],[-24,3],[-20,3],[-6,-2],[-31,4],[-35,-2],[-6,6],[1,-21],[-35,1],[-3,-1]],[[2498,5934],[0,0]],[[2874,6103],[-2,0],[2,0]],[[2871,6123],[0,0]],[[2862,6199],[0,0]],[[2900,6161],[-5,-49]],[[2895,6112],[-11,-4],[-1,-5]],[[2883,6103],[-3,2],[-4,-6],[2,25],[-3,-2],[3,11],[-5,12],[-4,-8],[-5,29],[3,16],[6,-7],[-9,24],[4,5],[-1,14],[-4,-10],[2,21],[3,-2],[-2,16],[2,20],[4,8],[2,20],[-3,-3],[0,-11],[-5,-17],[-3,11],[1,-15],[-3,-7],[2,-22],[-4,-18],[0,-37],[4,-21],[-2,-8],[3,-18],[0,-12],[-3,14],[-1,-7],[-3,13],[-6,4],[-5,13],[-1,11],[-5,-10],[-2,14],[4,18]],[[2842,6183],[2,18]],[[2842,6217],[-3,12],[-8,10],[2,13],[-3,8],[-5,3]],[[2632,7026],[9,-11],[-4,-3],[-5,14]],[[2612,7016],[0,0]],[[2608,7022],[0,0]],[[2605,6995],[2,19],[2,-1],[0,-16],[-4,-2]],[[2603,7012],[0,0]],[[2598,6977],[0,0]],[[2593,6942],[0,0]],[[2590,6927],[0,0]],[[2576,6998],[0,0]],[[2572,6547],[6,16],[3,26],[4,14],[3,24],[1,32],[-1,35],[-4,35],[-4,40],[3,15],[-2,31],[6,35],[2,25],[-1,14],[4,6],[1,16],[4,11],[3,-2],[5,28],[2,-18],[-2,-22],[1,-9],[4,25],[-2,-28],[4,21],[0,40],[7,12],[6,2],[-5,10],[-1,11],[5,16],[-2,6],[6,-1],[1,4],[9,-16],[7,-2],[4,-16],[4,0],[9,-17],[2,1],[7,-39],[-4,6],[-1,-16],[3,-7],[2,-19],[-2,-13],[0,-31],[-6,-10],[-1,-22],[-3,-8],[-4,0],[-3,-28],[1,-10],[6,-9],[12,44],[10,12],[5,-9],[2,-17],[2,-30],[1,-18],[1,-24],[3,-26],[-3,-46],[-5,-11],[-1,9],[3,9],[-6,-5],[-2,-28],[-5,-8],[-1,-11],[-2,-25],[-7,-24],[0,-9]],[[2666,6544],[-38,-4]],[[2504,7261],[2,7],[15,24],[6,5],[-7,-21],[-9,-11],[3,-3],[-6,-7],[-4,6]],[[2472,7108],[11,12],[6,18],[10,2],[8,16],[5,4],[2,9],[9,19],[5,15],[6,9],[11,1],[2,-8],[-7,-1],[1,-5],[-8,-17],[-1,-7],[-5,-20],[-1,-24],[6,19],[12,-4],[4,-6],[8,-37],[4,-4],[8,5],[1,-8],[6,-3],[0,12],[3,-9],[13,24],[7,2],[11,-1],[6,8],[9,3],[-2,-8],[0,-26],[6,-4],[5,4],[1,-8],[4,9],[6,5],[3,-4],[-1,-9],[1,-28],[2,-9],[5,-13],[3,3],[-1,10],[6,-2],[3,-12],[-2,-9],[-9,7],[-7,2],[-7,-6],[-8,14],[-2,-12],[1,-12],[-4,3],[-5,16],[-8,9],[-6,0],[-4,-14],[-6,0],[-1,-5],[-8,4],[-3,-6],[-1,-14],[-5,-4],[-3,-11],[-2,1],[5,21],[-7,0],[-2,-15],[-3,-2],[-2,16],[-1,-15],[-3,-6],[-4,-26],[-8,-37],[1,-2]],[[2551,6937],[-5,12],[3,16],[-2,6],[-4,-6],[2,38],[-3,11],[-7,7],[1,12],[-11,11],[-8,0],[-8,14],[-29,24],[-3,18],[-3,5],[-2,3]],[[2525,5201],[0,0]],[[2518,5205],[0,0]],[[2512,5201],[0,0]],[[2507,5204],[0,0]],[[2475,5759],[59,0]],[[2528,5219],[-2,-6],[-12,8],[-5,-2],[-9,-14],[-4,-8]],[[2496,5197],[-2,4],[-2,27],[-4,25],[2,39],[-52,0],[2,8],[-2,24],[3,1],[-2,14],[3,0],[-1,14],[3,6],[1,23],[5,22],[3,4],[1,15],[-3,9],[7,17],[-2,12],[-4,4],[4,15],[-5,4],[3,10],[-3,2],[3,17],[-3,13]],[[1758,7392],[46,0],[94,0],[23,0],[171,0]],[[1897,6864],[-2,2],[-8,31],[-3,-18],[1,-7],[-6,2],[-4,-6],[-1,6],[-7,-5],[-5,6],[-2,-14],[-3,4],[-8,0],[-2,-14],[-4,10],[-2,22],[-2,16],[-3,5],[-3,-3],[-3,9],[0,22],[-3,9],[-5,23],[-3,22],[1,9],[-5,12],[-4,-16],[-3,-1],[-3,-11],[-3,12],[-3,0],[2,17],[-2,7],[4,9],[-2,18],[5,71],[-1,7],[-8,-3],[0,8],[-9,17],[1,7],[-11,40],[-6,5],[-5,14],[0,32],[-3,6],[-6,27],[0,119]],[[2999,6927],[3,26],[3,7],[4,-5],[1,7]],[[3021,6699],[-3,-22]],[[2972,6661],[-3,14],[4,18],[0,29],[1,37],[5,23],[3,26],[2,11],[0,27],[6,4],[7,17],[0,15],[-2,14],[4,19],[0,12]],[[2984,6489],[0,0]],[[2981,6470],[0,0]],[[2979,6480],[0,0]],[[2927,6419],[1,-7],[-6,-12]],[[2863,6794],[0,0]],[[2861,6796],[0,0]],[[2769,6607],[8,16],[3,10],[6,7],[2,16],[6,10],[-2,21],[-2,4],[-2,31],[16,13],[11,1],[11,-7],[5,-10],[4,6],[12,-1],[7,8],[8,21],[5,1],[1,14],[-1,17],[3,16],[-7,11],[2,20],[11,20],[4,17],[13,38],[9,16],[4,5],[19,-4],[23,3]],[[2948,6927],[-2,-20],[2,-6],[-2,-18],[3,-23],[-1,-20],[-3,-27],[2,-31],[-2,-21],[4,3],[1,-8],[-1,-87],[1,-6]],[[2939,6456],[-2,-12],[6,9],[8,-6],[2,8],[14,1],[8,19],[3,-12],[4,-5],[6,7],[-14,-21],[-23,-28],[-10,-6],[-6,1],[-4,-6],[-3,18]],[[2686,6529],[0,0]],[[2683,6535],[0,0]],[[2666,6544],[10,-15],[4,-11],[3,10],[6,-19],[4,-6],[13,16],[8,-3],[8,21],[12,21],[13,15]],[[1549,7072],[7,-13],[5,5],[6,-13],[2,-14],[2,-35],[3,-5],[10,-9],[5,5],[8,15],[8,2],[9,-7],[1,-6],[17,15],[2,-6],[8,4],[6,11],[9,5],[5,5],[10,3],[4,8],[57,0]],[[1733,7042],[5,-21],[5,-5],[3,-21],[-6,-33],[-1,-20],[-4,-14],[1,-11],[-3,-16],[-3,-6],[-3,-26],[-2,-4],[0,-22],[7,-6],[2,-7],[-2,-11],[1,-8],[-3,-24],[0,-212]],[[1730,6575],[-46,-1],[-36,1]],[[1530,6575],[-3,11],[-2,19],[-1,22],[1,15],[-4,31],[2,19],[3,32],[5,46],[1,28],[2,88],[0,13],[3,44],[1,59],[-2,34],[2,14],[-2,20],[3,-8],[5,2],[5,8]],[[2659,5946],[56,-2]],[[1814,6574],[83,1]],[[1813,5992],[0,362],[1,220]],[[2873,6091],[0,0]],[[2895,6112],[-3,-17],[-3,-3],[-3,-14],[-3,-33],[-5,-33],[-3,-6],[-2,16],[2,40],[7,34],[1,7]],[[2842,6183],[-5,-17],[1,-19],[7,5],[2,-19],[3,-6],[6,-1],[3,-14],[8,-16],[-2,-9],[-2,-24],[3,-25],[0,-10],[-4,11],[2,-15],[-1,-5],[3,-18],[-5,-12],[-5,17],[-1,12],[-3,-4],[3,-17],[5,-11],[0,-5],[4,-2],[0,9],[10,-5],[3,-43]],[[1577,7201],[2,17],[3,-14],[-5,-3]],[[1574,7339],[0,0]],[[1572,7360],[0,0]],[[1571,7343],[0,0]],[[1570,7302],[5,21],[3,-13],[-3,-1],[-3,-9],[3,-3],[2,-10],[4,-8],[-1,-14],[-5,14],[0,15],[-5,8]],[[1565,7367],[0,0]],[[1562,7357],[0,0]],[[1562,7392],[0,0]],[[1558,7345],[5,3],[3,10],[5,-6],[-1,-27],[-7,4],[-5,16]],[[1557,7356],[0,0]],[[1730,7392],[0,-102],[0,-200],[0,-5],[3,-24],[-1,-9],[1,-10]],[[1549,7072],[-5,5],[-4,-7],[-4,9],[-2,-6],[2,37],[0,-24],[2,0],[1,19],[-2,12],[4,9],[-7,3],[-2,19],[8,5],[-8,8],[-2,31],[-3,9],[-1,28],[-3,25],[-4,8],[-3,32],[2,27],[7,-12],[12,-15],[8,1],[3,-5],[9,-1],[3,5],[3,-9],[8,7],[-1,-12],[3,-15],[-4,-25],[-4,-13],[6,10],[2,15],[4,13],[2,-19],[-1,-19],[-3,-43],[-3,-10],[-4,16],[2,-17],[3,-3],[4,22],[3,-2],[3,9],[-3,27],[1,27],[4,26],[-6,18],[2,-15],[-3,8],[-1,14],[5,5],[-5,18],[-4,-4],[-1,11],[7,-4],[-1,33],[-6,4],[-3,20],[2,5],[159,0]],[[2568,6966],[4,7],[-3,-13],[-1,6]],[[2556,6949],[0,0]],[[2470,7159],[0,0]],[[2469,7145],[0,0]],[[2465,7150],[0,0]],[[2462,7140],[0,0]],[[2463,7154],[0,0]],[[2462,7161],[3,3],[3,-5],[-3,-6],[-3,8]],[[2461,7134],[5,9],[-1,-9],[-4,0]],[[2456,7157],[0,0]],[[2427,7125],[6,-3],[8,9],[15,21],[4,2],[2,-8],[-3,-15],[1,-9],[-3,-10],[6,10],[4,-10],[5,-4]],[[2551,6937],[-2,-14],[-3,-1],[-6,-29],[-2,-18],[2,-4],[6,12],[4,24],[6,7],[4,31],[4,3],[1,11],[1,-23],[-4,-14],[-8,-49],[-2,-27],[0,-16],[-3,-10],[-3,-25],[1,-24],[-5,-36],[0,-15],[2,-47],[2,-7],[-2,-18],[1,-15]],[[268,17],[0,0]],[[263,24],[0,0]],[[231,6],[5,10],[3,-2],[-6,-14],[-2,6]],[[9020,3245],[4,4],[2,19],[3,-5],[-5,-25],[-1,-16],[-2,2],[-1,21]],[[9059,3543],[0,0]],[[9053,3729],[0,0]],[[9050,3784],[0,0]],[[9050,3441],[0,13],[3,6],[-3,-19]],[[9048,3867],[0,0]],[[9048,3586],[0,0]],[[9046,3428],[2,10],[0,-21],[-2,11]],[[9034,3323],[0,0]],[[2803,5625],[-5,-6],[-6,-19],[-5,-18],[-2,-32],[-4,-14],[-1,-9],[-5,3],[-1,-15],[-8,-17],[-4,-18],[-3,-2],[-6,-13],[-4,-2],[0,-16],[-5,-8],[-5,-17],[-2,-10]],[[3170,3817],[0,0]],[[3164,3790],[5,5],[3,-4],[-7,-6],[-1,5]],[[3163,3821],[0,0]],[[3117,3819],[3,6],[0,10],[15,-2],[17,-3],[10,-13],[1,-17],[-4,-3],[-2,-19],[-12,-11],[-6,8],[-10,-5],[-11,0],[2,28],[-3,21]],[[3098,3789],[0,0]],[[3185,3816],[0,0]],[[3182,3739],[1,10],[9,-1],[-3,-6],[-7,-3]],[[3178,3816],[0,4],[7,-8],[-7,4]],[[1730,7392],[28,0]],[[1814,6574],[-84,1]],[[2948,6927],[18,1],[10,-3],[23,2]],[[2515,5181],[0,0]],[[2502,5183],[4,11],[1,-14],[-5,3]],[[2494,5122],[0,0]],[[2473,5072],[0,0]],[[2468,5069],[0,0]],[[2462,5066],[0,0]],[[2427,5128],[5,4],[4,-8],[-3,-10],[-6,14]],[[2496,5197],[-8,-17],[0,-10],[3,1],[2,-12],[5,26],[3,-20],[2,9],[2,-7],[-4,-9],[-2,-22],[-6,-2],[-1,-10],[5,-20],[9,-4],[3,-21],[-2,-21],[-4,22],[-3,-7],[-7,20],[-5,3],[-11,-27],[-3,24],[-3,7],[-4,-5],[-3,-21],[-3,-10],[-4,16],[-4,1],[-7,13],[2,7],[4,-13],[0,11],[-4,11],[-2,-6],[-1,14],[-2,-4],[-3,18],[-3,0],[1,13],[-6,-3],[-1,15],[-6,-12],[-3,1],[3,-16],[-6,-9],[-9,7],[-15,21],[-8,0],[-8,-4],[-3,-6]],[[3009,6517],[-2,-5],[-4,5],[4,21]],[[3003,6536],[0,0]],[[3002,6512],[0,0]],[[2996,6477],[0,0]],[[3007,6542],[-5,8],[0,-13],[-2,-11],[1,-12],[-2,-12],[-10,-6]]],"bbox":[-179.14,-14.37,179.77,71.35],"transform":{"scale":[0.03589458945894589,0.008572857285728572],"translate":[-179.14,-14.37]}}};
const RANKS=[[0,"Trailhead"],[100,"Wanderer"],[300,"Explorer"],[700,"Pathfinder"],[1500,"Trailblazer"],[3000,"Legend"]];
const allPacks=()=>[...PACKS,...state.quests.packs];
const findCh=id=>{ for(const p of allPacks()){ const c=p.items.find(x=>x.id===id); if(c) return [p,c]; } return [null,null]; };
const packDone=p=>p.items.filter(c=>state.quests.done[c.id]).length;
const isCustom=p=>state.quests.packs.includes(p);
function score(){ let n=0; for(const id in state.quests.done){ const [,c]=findCh(id); if(c) n+=c.pts; } return n; }
function rankOf(pts){ let i=0; RANKS.forEach((r,k)=>{ if(pts>=r[0]) i=k; }); return {i,name:RANKS[i][1],next:RANKS[i+1]}; }
function packForPlace(place){
  const q=String(place||"").toLowerCase(); if(!q) return null;
  const mine=state.quests.packs.find(p=>(p.keys||[]).some(k=>q.includes(k)||k.includes(q))); if(mine) return mine;
  return PACKS.find(p=>p.keys.some(k=>k.length<=3?new RegExp("\\b"+k.replace(/\./g,"\\.")+"\\b").test(q):q.includes(k)))||null;
}
const tripFor=p=>{ const t=upcoming().find(x=>packForPlace(x.to)===p); return t?t.id:null; };
const ptsTag=p=>`<span class="pts p${p}">+${p}</span>`;
const PATCH_BG=["#2F4A34","#7A4A2A","#2B5563","#5E4B2B","#6C3B3B","#3E5A2A"];
function patch(p,size){
  const d=packDone(p), n=p.items.length, full=n&&d===n, C=2*Math.PI*46, f=n?d/n:0;
  return `<span class="patch ${full?"full":""}" style="width:${size}px;height:${size}px;${full?"":"background:"+PATCH_BG[hash(p.id)%PATCH_BG.length]}"><svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" class="rt"/><circle cx="50" cy="50" r="46" class="rf" stroke-dasharray="${(C*f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 50 50)"/></svg><span class="pc" style="font-size:${Math.round(size*.25)}px">${full?"★":esc(code(p.name))}</span></span>`;
}
function rankCard(){
  const pts=score(), r=rankOf(pts), pct=r.next?(pts-RANKS[r.i][0])/(r.next[0]-RANKS[r.i][0])*100:100;
  return `<div class="rankcard"><div class="rc-top"><span class="lvbadge">${r.i+1}</span><div><b>${r.name}</b><span>${pts} points · ${Object.keys(state.quests.done).length} challenges done</span></div></div>
  <div class="rbar"><i style="width:${pct}%"></i></div><div class="rc-next">${r.next?`${r.next[0]-pts} more points to reach ${r.next[1]}`:"Top rank reached"}</div></div>`;
}

/* ================= LAYOUT ================= */
function topbar(){ const pts=score(), r=rankOf(pts);
  return `<header class="top"><div class="brand">${LOGO}<span>Waypoint</span></div><button class="rankchip" data-tab="passport" aria-label="${r.name}, ${pts} points. Open passport"><span class="lv">${r.i+1}</span>${pts} pts</button></header>`; }
const phead=(t,s)=>`<div class="phead"><h1>${t}</h1><p>${s}</p></div>`;
function render(){
  const app=$("#app"), t=trip();
  if(view.trip&&!t) view.trip=null;
  if(view.pack&&!allPacks().some(p=>p.id===view.pack)) view.pack=null;
  if(view.pack) app.innerHTML=packPage(view.pack);
  else if(trip()) app.innerHTML=tripPage(trip());
  else app.innerHTML={home:homePage,quests:questsPage,lists:listsPage,passport:passportPage}[view.tab]();
  const it=(k,l)=>`<button data-tab="${k}" ${view.tab===k?'aria-current="page"':""}>${ICON[k]}<span>${l}</span></button>`;
  if($("#map")) requestAnimationFrame(drawMap);
  $("#tabs").innerHTML=`<div class="tb">${it("home","Trips")}${it("quests","Quests")}<button class="capbtn" data-act="capture" aria-label="Capture a moment">${ICON.cam}</button>${it("lists","Lists")}${it("passport","Passport")}</div>`;
}

/* ================= TRIPS (home) ================= */
function heroCard(t){
  const s=status(t), p=packForPlace(t.to), act=isActive(t), n=(t.days[today()]||[]).length;
  return `<button class="hero" data-open="${t.id}" aria-label="Open ${esc(t.name)}">${cover(t)}<span class="shade"></span>
    <span class="hero-in"><span class="kicker ${s.cls}">${s.long}</span><span class="hero-title">${esc(t.name)}</span><span class="hero-sub">${esc(t.to)}${t.start?" · "+range(t):""}</span></span></button>
  <div class="quick">
    <button class="qa" data-act="capture" data-trip="${t.id}">${ICON.cam}<b>Capture</b><span>a moment</span></button>
    <button class="qa" data-open="${t.id}" data-ttab="quests">${ICON.quests}<b>${p?packDone(p)+" of "+p.items.length:"Quests"}</b><span>${p?"challenges":"get some"}</span></button>
    <button class="qa" data-open="${t.id}" data-ttab="plan">${ICON.plan}<b>${act?"Today":"Plan"}</b><span>${act?n+" stop"+(n===1?"":"s"):"the days"}</span></button>
  </div>`;
}
function tripRow(t){
  const s=status(t), p=packForPlace(t.to), n=momentsFor(t.id).length;
  return `<button class="trow" data-open="${t.id}"><span class="thumb">${cover(t)}</span>
    <span class="tr-m"><b>${esc(t.name)}</b><span>${esc(t.to)}${t.start?" · "+range(t):""}</span>
    ${(p&&packDone(p))||n?`<span class="tr-meta">${p&&packDone(p)?`<i class="mini">⚑ ${packDone(p)}/${p.items.length}</i>`:""}${n?`<i class="mini">${n} moment${n===1?"":"s"}</i>`:""}</span>`:""}</span>
    <span class="tr-s ${s.cls}">${s.short}</span></button>`;
}
function homePage(){
  if(!state.trips.length) return topbar()+`
    <div class="hero" style="min-height:200px">${scene("welcome-oak")}<span class="shade"></span><span class="hero-in"><span class="hero-title">Every trip, one place.</span><span class="hero-sub">Plan it, play it, remember it.</span></span></div>
    <ol class="steps">
      <li><div><b>Plan a trip</b><span>Build each day, pack, and track your budget.</span></div></li>
      <li><div><b>Go on quests</b><span>Every destination has photo challenges, like a scavenger hunt. Snap them for points.</span></div></li>
      <li><div><b>Fill your passport</b><span>Photos, stamps, national parks and bucket lists, all saved.</span></div></li>
    </ol>
    <button class="btn wide" data-act="new">${ICON.plus}Plan your first trip</button>
    <div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="demo" style="flex:1">Try a sample trip</button><button class="btn ghost sm" data-act="capture" style="flex:1">Already traveling? Capture</button></div>
    <button class="btn ghost sm wide" data-act="import" style="margin-top:10px">${ICON.cam}Import a past trip from your photos</button>
    <button class="btn ghost sm wide" data-act="join" style="margin-top:10px">Join a friend's trip with a code</button>`;
  const act=state.trips.find(isActive), up=upcoming(), feat=act||up[0], rest=up.filter(t=>t!==feat), past=pastTrips();
  let h=topbar();
  const done=past.find(t=>daysUntil(t.end)>=-14&&momentsFor(t.id).length);
  if(done) h+=`<button class="recapban" data-open="${done.id}" data-ttab="log"><span class="rb-ic">${bIcon("star")}</span><span><b>${esc(done.name)} is in the books</b><span>Open it and tap Recap to make a card to share.</span></span></button>`;
  if(feat) h+=heroCard(feat);
  if(act) h+=nearbyHTML(true);
  h+=`<div class="sechead"><h2>${feat?"Also coming up":"Upcoming"}</h2><button class="btn sm" data-act="new">${ICON.plus}New trip</button></div>`;
  h+=rest.length?rest.map(tripRow).join(""):`<p class="hint">${feat?"Nothing else planned yet.":"No upcoming trips. Start one."}</p>`;
  h+=`<div class="row" style="gap:8px;margin-top:4px"><button class="btn ghost sm" style="flex:1" data-act="join">${bIcon("users")}Join a friend's trip</button><button class="btn ghost sm" style="flex:1" data-act="import">${ICON.cam}Import past trip</button></div>`;
  if(past.length) h+=`<div class="sechead"><h2>Past trips</h2></div>`+past.map(tripRow).join("");
  return h;
}

/* ================= ONE TRIP ================= */
function tripPage(t){
  const tabs=[["plan","Plan"],["quests","Quests"],["log","Photos"],["prep","Essentials"]];
  const s=status(t), len=dayList(t).length, p=packForPlace(t.to);
  const body={plan:tPlan,quests:tQuests,log:tLog,prep:tPrep}[view.ttab](t);
  return `<div class="thero">${cover(t)}<span class="shade"></span>
    <div class="thero-bar"><button class="round" data-home aria-label="Back to trips">${ICON.back}</button><span class="row" style="gap:8px"><button class="round" data-act="recap" aria-label="Make a recap card">${bIcon("star")}</button><button class="round" data-act="edit" aria-label="Edit trip">${ICON.edit}</button></span></div>
    <div class="hero-in"><span class="kicker ${s.cls}">${s.long}</span><h1 class="hero-title">${esc(t.name)}</h1><span class="hero-sub">${esc(t.to)}${t.start?" · "+range(t):""}${len>1?" · "+len+" days":""}</span></div></div>
  <div class="seg sticky" role="tablist" aria-label="Trip sections">${tabs.map(([k,l])=>`<button role="tab" data-ttab="${k}" aria-selected="${view.ttab===k}">${l}${k==="quests"&&p?` <i>${packDone(p)}/${p.items.length}</i>`:""}${k==="log"&&momentsFor(t.id).length?` <i>${momentsFor(t.id).length}</i>`:""}</button>`).join("")}</div>
  ${body}`;
}
function tPlan(t){
  const days=dayList(t);
  const ai=sample&&days.length?`<button class="btn ai sm" data-act="aiplan">${ICON.spark}Plan with AI</button>`:"";
  const itin=!days.length?`<div class="empty"><h3>When are you going?</h3><p>Add dates and you'll get a spot for each day.</p><button class="btn" data-act="edit">Add dates</button></div>`:
  `<div class="panel"><h3>Day by day ${ai}</h3>
  ${days.map((d,i)=>{ const items=(t.days[d]||[]).slice().sort((a,b)=>(a.time||"99").localeCompare(b.time||"99")), tod=d===today();
    return `<div class="day ${tod?"today":""}"><h4>Day ${i+1} <span>${fmtD(d)}</span>${tod?'<i class="tag" style="font-style:normal">Today</i>':""}</h4>
      ${items.map(it=>`<div class="item"><span class="t">${esc(it.time||"—")}</span><div><div>${esc(it.title)}</div>${it.note?`<div class="note">${esc(it.note)}</div>`:""}</div><button class="iconbtn" aria-label="Remove ${esc(it.title)}" data-del-item="${d}|${it.id}">${ICON.x}</button></div>`).join("")}
      ${view.addDay===d?`<form class="add" data-add-item="${d}"><input type="time" name="time" aria-label="Time"><input name="title" placeholder="What are you doing?" aria-label="Stop for day ${i+1}" required><button class="btn sm">Add</button></form>`:`<button class="linkbtn addstop" data-addday="${d}">${ICON.plus}${items.length?"Add another stop":"Add a stop"}</button>`}</div>`; }).join("")}</div>`;
  const ideas=`<div class="panel"><h3>Maybe list</h3><p class="note" style="margin:-4px 0 6px">Ideas you haven't put on a day yet.</p>
    ${t.ideas.map(i=>`<div class="item" style="grid-template-columns:1fr auto auto;align-items:center"><div>${esc(i.text)}</div>
      ${days.length?`<select data-slot="${i.id}" aria-label="Move to a day" style="width:auto;padding:6px 8px;font-size:13px"><option value="">Move to…</option>${days.map((d,k)=>`<option value="${d}">Day ${k+1}</option>`).join("")}</select>`:"<span></span>"}
      <button class="iconbtn" aria-label="Remove" data-del-idea="${i.id}">${ICON.x}</button></div>`).join("")}
    <form class="add" data-add-idea><input name="text" placeholder="A restaurant, a hike, a museum…" aria-label="Idea" required><button class="btn sm">Add</button></form></div>`;
  return itin+ideas;
}
function chalRow(c,tripId){
  const dn=state.quests.done[c.id], m=dn&&moments.find(x=>x.id===dn.moment), img=m&&photoSrc(m,0), [p]=findCh(c.id);
  return `<div class="chal ${dn?"done":""}">${img?`<img class="proof" src="${esc(img)}" alt="Proof photo" data-zoom="${esc(img)}">`:`<span class="dot">${dn?ICON.check:""}</span>`}
    <div><div class="ct">${esc(c.title)}</div>${dn?`<div class="note">Found ${fmtD(dn.at,{month:"short",day:"numeric",year:"numeric"})}</div>`:c.hint?`<div class="note">${esc(c.hint)}</div>`:""}<div style="margin-top:4px">${ptsTag(c.pts)}</div></div>
    <div class="cr">${dn?`<button class="linkbtn" data-undo="${c.id}">Undo</button>`:`<button class="btn ember sm" data-snap="${c.id}"${tripId?` data-trip="${tripId}"`:""}>${ICON.cam}Snap</button>`}${p&&isCustom(p)&&!dn?`<button class="linkbtn" data-delch="${c.id}">Remove</button>`:""}</div></div>`;
}
function addChForm(p){ return `<form class="add" data-addch="${p.id}" style="margin-top:12px;flex-wrap:wrap"><input name="title" placeholder="Add your own challenge" aria-label="New challenge" required style="flex:3 1 180px">
  <select name="pts" aria-label="Difficulty" style="flex:1 1 100px"><option value="10">Easy +10</option><option value="25" selected>Medium +25</option><option value="50">Hard +50</option></select><button class="btn sm">Add</button></form>`; }
function tQuests(t){
  const p=packForPlace(t.to);
  if(!p) return `<div class="empty"><span class="big-ic">${ICON.quests}</span><h3>No challenges for ${esc(t.to)} yet</h3><p>Challenges are photo missions at the must-see spots. Snap each one to score points and climb the ranks.</p>
    ${sample?`<button class="btn ai" data-gen="${esc(t.to)}" data-trip="${t.id}">${ICON.spark}Make challenges for ${esc(t.to)}</button>`:`<button class="btn" data-gen="${esc(t.to)}" data-trip="${t.id}">Start your own list</button>`}</div>
    <p class="hint center" style="margin-top:14px">Or try the <button class="linkbtn" data-qpack="any">Anywhere Explorer</button> pack, which works on every trip.</p>`;
  const d=packDone(p), tot=p.items.reduce((s,c)=>s+c.pts,0), got=p.items.filter(c=>state.quests.done[c.id]).reduce((s,c)=>s+c.pts,0);
  return `<div class="packhead">${patch(p,64)}<div><b>${esc(p.name)}</b><span>${d} of ${p.items.length} found · ${got} of ${tot} points</span></div></div>
    ${crewRace(t,p)}
    ${d===p.items.length&&d?`<div class="panel cleared">★ Pack cleared. Every challenge here is done.</div>`:""}
    ${p.items.map(c=>chalRow(c,t.id)).join("")}
    ${isCustom(p)?addChForm(p):""}
    <p class="hint center" style="margin-top:14px">Want more? The <button class="linkbtn" data-qpack="any">Anywhere Explorer</button> pack works on every trip.</p>`;
}
function momentCard(m){
  const k=photoCount(m), [qp,qc]=m.quest?findCh(m.quest):[null,null];
  return `<article class="moment">${k?`<div class="photos ${k===1?"one":k%2?"odd":""}">${Array.from({length:k},(_,i)=>`<img src="${esc(photoSrc(m,i))}" alt="Photo at ${esc(m.place||"this moment")}" loading="lazy" data-zoom="${esc(photoSrc(m,i))}">`).join("")}</div>`:""}
    <div class="body"><div class="where"><b>${esc(m.place||"Somewhere")}</b><span style="display:flex;align-items:center;gap:2px"><span class="note">${new Date(m.at).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</span><button class="iconbtn" aria-label="Delete moment" data-del-moment="${m.id}">${ICON.x}</button></span></div>
    ${qc?`<button class="qbadge" data-qpack="${qp.id}">⚑ ${esc(qc.title)} ${ptsTag(qc.pts)}</button>`:""}${m.note?`<p>${esc(m.note)}</p>`:""}</div></article>`;
}
function tLog(t){
  const mine=momentsFor(t.id).map(m=>({m,own:true})), theirs=friendMoments(t).map(m=>({m,own:false}));
  const all=[...mine,...theirs].sort((a,b)=>b.m.at.localeCompare(a.m.at));
  let out=`<div class="row" style="gap:10px"><button class="btn ember" style="flex:2" data-act="capture" data-trip="${t.id}">${ICON.cam}Capture a moment</button><button class="btn ghost" style="flex:1" data-act="recap">${bIcon("star")}Recap</button></div>`+crewPanel(t);
  if(!all.length) return out+`<p class="hint center" style="margin-top:14px">Photos and notes from this trip show up here, sorted by day.</p>`;
  let last="";
  all.forEach(({m,own})=>{ const d=m.at.slice(0,10); if(d!==last){ const n=dayList(t).indexOf(d); out+=`<div class="dayhead">${n>=0?"Day "+(n+1)+" · ":""}${fmtD(d,{weekday:"long",month:"long",day:"numeric"})}</div>`; last=d; } out+=own?momentCard(m):friendCard(m); });
  return out;
}
const PACK_BASE={Documents:["Passport / ID","Tickets & confirmations","Travel insurance","Cards + some cash"],Tech:["Phone charger","Power bank","Plug adapter","Headphones"],Clothes:["Underwear & socks","Sleepwear","Walking shoes","Light jacket"],Toiletries:["Toothbrush & paste","Meds","Sunscreen","Deodorant"]};
const ECAT=["Stay","Transport","Food","Activities","Tickets","Shopping","Other"];
function tPrep(t){
  const cats={}; t.pack.forEach(p=>(cats[p.cat||"Other"] ||= []).push(p));
  const done=t.pack.filter(p=>p.done).length;
  const spent=t.exp.reduce((s,e)=>s+Number(e.amt||0),0), left=(t.budget||0)-spent, pct=t.budget?Math.min(100,spent/t.budget*100):0, days=dayList(t).length||1;
  return `<div class="panel"><h3>Packing list ${sample?`<button class="btn ai sm" data-act="aipack">${ICON.spark}Suggest items</button>`:""}</h3>
    <div class="note">${done} of ${t.pack.length} packed</div><div class="bar"><i style="width:${t.pack.length?done/t.pack.length*100:0}%"></i></div>
    ${Object.entries(cats).map(([c,l])=>`<div class="cat">${esc(c)}</div>${l.map(p=>`<label class="check ${p.done?"done":""}"><input type="checkbox" data-packitem="${p.id}" ${p.done?"checked":""}><span class="txt">${esc(p.text)}</span><button class="iconbtn" aria-label="Remove ${esc(p.text)}" data-del-packitem="${p.id}">${ICON.x}</button></label>`).join("")}`).join("")}
    <form class="add" data-add-packitem style="margin-top:14px"><input name="text" placeholder="Add an item" aria-label="Packing item" required><button class="btn sm">Add</button></form></div>
  <div class="panel"><h3>Budget</h3>
    <div class="big">${money(spent,t.cur)} <span class="muted" style="font-size:17px;font-weight:600">spent of ${money(t.budget,t.cur)}</span></div>
    <div class="bar ${left<0?"over":""}"><i style="width:${pct}%"></i></div>
    <div class="note">${!t.budget?"Set a budget with the edit button up top.":left>=0?money(left,t.cur)+" left, about "+money(left/days,t.cur)+" a day":money(-left,t.cur)+" over budget"}${t.people>1&&spent?" · "+money(spent/t.people,t.cur)+" per person":""}</div>
    <form class="add" data-add-exp style="flex-wrap:wrap;margin-top:12px"><input name="title" placeholder="What did you spend on?" aria-label="Expense" required style="flex:2 1 150px">
    <input name="amt" type="number" inputmode="decimal" step="0.01" placeholder="Amount" aria-label="Amount" required style="flex:1 1 90px">
    <select name="cat" aria-label="Category" style="flex:1 1 110px">${ECAT.map(c=>`<option>${c}</option>`).join("")}</select><button class="btn sm">Add</button></form>
    ${t.exp.slice().reverse().map(e=>`<div class="item" style="grid-template-columns:1fr auto auto;align-items:center"><div><div>${esc(e.title)}</div><div class="note">${esc(e.cat)}</div></div><b>${money(e.amt,t.cur)}</b><button class="iconbtn" aria-label="Remove" data-del-exp="${e.id}">${ICON.x}</button></div>`).join("")}</div>
  <div class="panel"><h3>Bookings & notes</h3><p class="note" style="margin-top:-4px">Flight numbers, addresses, confirmation codes, Wi-Fi passwords.</p>
    <textarea data-notes aria-label="Bookings and notes" style="min-height:160px" placeholder="Flight AA123, departs 8:40&#10;Hotel: …&#10;Confirmation: …">${esc(t.notes)}</textarea></div>`;
}

/* ================= QUESTS TAB ================= */
function packTile(p,t){
  return `<button class="ptile" data-qpack="${p.id}"${t?` data-qtrip="${t.id}"`:""}>${patch(p,84)}<b>${esc(p.name)}</b><span>${t?"For "+esc(t.name):esc(p.region)} · ${packDone(p)}/${p.items.length}</span></button>`;
}
function genTile(t){
  return `<button class="ptile gen" data-gen="${esc(t.to)}" data-trip="${t.id}"><span class="patch add" style="width:84px;height:84px"><span class="pc" style="font-size:30px">+</span></span><b>${esc(t.to)}</b><span>${sample?"Make challenges":"Start a list"}</span></button>`;
}
function filteredPacks(){ const q=(view.qsearch||"").trim().toLowerCase(); return allPacks().filter(p=>!q||p.name.toLowerCase().includes(q)||p.region.toLowerCase().includes(q)||(p.keys||[]).some(k=>k.includes(q))); }
function questsPage(){
  const mine=upcoming().map(t=>[t,packForPlace(t.to)]);
  return topbar()+phead("Quests","Photo challenges at the must-see spots, all over the world. Snap one to check it off and earn points.")+rankCard()+nearbyHTML(false)+leaderboardHTML()+
  (mine.length?`<div class="sechead"><h2>For your trips</h2></div><div class="hscroll">${mine.map(([t,p])=>p?packTile(p,t):genTile(t)).join("")}</div>`:"")+
  `<div class="sechead"><h2>Explore the world</h2></div>
  <input data-qsearch value="${esc(view.qsearch||"")}" placeholder="Search a city, country or region" aria-label="Search quest packs" style="margin-bottom:12px">
  <div class="pgrid" id="packlist">${filteredPacks().map(p=>packTile(p)).join("")}</div>
  <form class="panel" data-genform style="margin-top:16px"><h3>Going somewhere else?</h3><p class="note" style="margin:-4px 0 10px">Type any city or park and get challenges for it.</p>
    <div class="add" style="margin:0"><input name="place" placeholder="Savannah, Banff, Kyoto…" aria-label="Place" required><button class="btn ${sample?"ai":""} sm">${sample?ICON.spark+"Make":"Start"}</button></div></form>`;
}
function packPage(id){
  const p=allPacks().find(x=>x.id===id), d=packDone(p), tot=p.items.reduce((s,c)=>s+c.pts,0), got=p.items.filter(c=>state.quests.done[c.id]).reduce((s,c)=>s+c.pts,0);
  const tid=view.qtrip||view.trip||tripFor(p);
  return `<button class="back" data-qpack="">${ICON.back}${view.trip?"Back to trip":"All quests"}</button>
  <div class="packhero">${patch(p,112)}<h1>${esc(p.name)}</h1><p>${esc(p.region)} · ${d} of ${p.items.length} found · ${got} of ${tot} points</p></div>
  ${d===p.items.length&&d?`<div class="panel cleared">★ Pack cleared. Every challenge in ${esc(p.name)} is done.</div>`:`<p class="hint center">Tap Snap when you're there. Your photo is the proof.</p>`}
  ${p.items.map(c=>chalRow(c,tid)).join("")}
  ${isCustom(p)?addChForm(p)+`<button class="btn ghost sm" data-delpack="${p.id}" style="margin-top:18px">Delete this list</button>`:""}`;
}

/* ================= LISTS TAB ================= */
const ADV={"In the air":["Skydiving","Paragliding","Hang gliding","Hot air balloon ride","Bungee jumping","Ziplining","Helicopter tour","Parasailing"],
"In the water":["Scuba diving","Snorkel a coral reef","Shark cage dive","White-water rafting","Surf lesson","Sea kayaking","Swim in a cenote","Whale watching","Cliff jumping","Jet skiing"],
"On land":["Rock climbing outdoors","Via ferrata","Canyoneering","Summit a 14,000 ft peak","Hike a volcano","Explore a cave","ATV or dune buggy ride","Sandboarding","Horseback ride on the beach","Backcountry camping"],
"Snow & ice":["Ski or snowboard","Dog sledding","Glacier hike","Ice climbing","See the northern lights","Snowmobiling"]};
const NP=[["Acadia","ME"],["American Samoa","AS"],["Arches","UT"],["Badlands","SD"],["Big Bend","TX"],["Biscayne","FL"],["Black Canyon of the Gunnison","CO"],["Bryce Canyon","UT"],["Canyonlands","UT"],["Capitol Reef","UT"],["Carlsbad Caverns","NM"],["Channel Islands","CA"],["Congaree","SC"],["Crater Lake","OR"],["Cuyahoga Valley","OH"],["Death Valley","CA/NV"],["Denali","AK"],["Dry Tortugas","FL"],["Everglades","FL"],["Gates of the Arctic","AK"],["Gateway Arch","MO"],["Glacier","MT"],["Glacier Bay","AK"],["Grand Canyon","AZ"],["Grand Teton","WY"],["Great Basin","NV"],["Great Sand Dunes","CO"],["Great Smoky Mountains","TN/NC"],["Guadalupe Mountains","TX"],["Haleakalā","HI"],["Hawaiʻi Volcanoes","HI"],["Hot Springs","AR"],["Indiana Dunes","IN"],["Isle Royale","MI"],["Joshua Tree","CA"],["Katmai","AK"],["Kenai Fjords","AK"],["Kings Canyon","CA"],["Kobuk Valley","AK"],["Lake Clark","AK"],["Lassen Volcanic","CA"],["Mammoth Cave","KY"],["Mesa Verde","CO"],["Mount Rainier","WA"],["New River Gorge","WV"],["North Cascades","WA"],["Olympic","WA"],["Petrified Forest","AZ"],["Pinnacles","CA"],["Redwood","CA"],["Rocky Mountain","CO"],["Saguaro","AZ"],["Sequoia","CA"],["Shenandoah","VA"],["Theodore Roosevelt","ND"],["Virgin Islands","VI"],["Voyageurs","MN"],["White Sands","NM"],["Wind Cave","SD"],["Wrangell–St. Elias","AK"],["Yellowstone","WY/MT/ID"],["Yosemite","CA"],["Zion","UT"]];
const ADV_ALL=Object.values(ADV).flat();
function listsPage(){
  const lists=[["adv","Adventures"],["np","National parks"],["mine","My list"]];
  const chips=`<div class="chips" role="group" aria-label="Which list">${lists.map(([k,l])=>`<button data-blist="${k}" aria-pressed="${view.blist===k}">${l}</button>`).join("")}</div>`;
  const prog=(n,of,label)=>`<div class="big">${n} <span class="muted" style="font-size:17px;font-weight:600">of ${of} ${label}</span></div><div class="bar"><i style="width:${of?n/of*100:0}%"></i></div>`;
  const row=(list,key,label,extra="")=>{ const d=state.checks[list][key];
    return `<label class="check ${d?"done":""}" data-name="${esc(label.toLowerCase())}" data-st="${esc(extra.toLowerCase())}"><input type="checkbox" data-preset="${list}" data-key="${esc(key)}" ${d?"checked":""}><span class="txt">${esc(label)}${d?` <span class="note">· ${fmtD(d,{month:"short",year:"numeric"})}</span>`:""}</span>${extra?`<span class="ptag">${esc(extra)}</span>`:""}</label>`; };
  let body;
  if(view.blist==="adv") body=`<div class="panel">${prog(Object.keys(state.checks.adv).length,ADV_ALL.length,"done")}
    ${Object.entries(ADV).map(([c,l])=>`<div class="cat">${c}</div>${l.map(x=>row("adv",x,x)).join("")}`).join("")}
    <p class="note" style="margin:14px 0 0">Missing one? Add it under My list.</p></div>`;
  else if(view.blist==="np") body=`<div class="panel">${prog(Object.keys(state.checks.np).length,NP.length,"parks")}
    <input data-filter placeholder="Search parks or states (e.g. UT)" aria-label="Search parks" style="margin:8px 0 6px">
    <div id="nplist">${NP.map(([n,s])=>row("np",n,n,s)).join("")}</div></div>`;
  else { const open=state.bucket.filter(b=>!b.done), done=state.bucket.filter(b=>b.done);
    const mine=b=>`<label class="check ${b.done?"done":""}"><input type="checkbox" data-bucket="${b.id}" ${b.done?"checked":""}><span class="txt">${esc(b.text)}${b.done&&b.doneAt?` <span class="note">· ${fmtD(b.doneAt,{month:"short",year:"numeric"})}</span>`:""}</span>
      ${!b.done&&b.kind==="place"?`<button class="btn ghost sm" data-plan-bucket="${b.id}">Plan it</button>`:`<span class="ptag">${b.kind==="place"?"Place":"Do"}</span>`}
      <button class="iconbtn" aria-label="Remove" data-del-bucket="${b.id}">${ICON.x}</button></label>`;
    body=`<div class="panel"><h3>Someday</h3>
      <form class="add" data-add-bucket style="margin:0 0 8px"><input name="text" placeholder="Iceland, see a total eclipse…" aria-label="Bucket list item" required>
      <select name="kind" aria-label="Type" style="width:auto"><option value="place">Place</option><option value="do">Do</option></select><button class="btn sm">Add</button></form>
      ${open.map(mine).join("")||'<p class="note" style="margin:6px 0 0">Your own places and experiences. Places get a Plan it button.</p>'}</div>
      ${done.length?`<div class="panel"><h3>Done</h3>${done.map(mine).join("")}</div>`:""}`; }
  return topbar()+phead("Bucket lists","Check things off as you do them. Everything you finish counts in your Passport.")+chips+body;
}

/* ================= PASSPORT TAB ================= */
function places(){
  const map=new Map();
  const add=(p,d)=>{ if(!p) return; const k=p.trim().toLowerCase(); if(!k) return; const cur=map.get(k); if(!cur||(d&&d<cur.date)) map.set(k,{place:p.trim(),date:d||""}); };
  state.trips.filter(t=>t.start && t.start<=today()).forEach(t=>add(t.to,t.start));
  moments.forEach(m=>add(m.place,m.at.slice(0,10)));
  state.bucket.filter(b=>b.done&&b.kind==="place").forEach(b=>add(b.text,b.doneAt));
  Object.entries(state.checks.np).forEach(([k,d])=>add(k+" National Park",d));
  state.been.forEach(b=>add(b.place,b.date));
  return [...map.values()].sort((a,b)=>(b.date||"").localeCompare(a.date||""));
}
function passportPage(){
  const list=places(), colors=["var(--forest)","#8A6A3F","var(--ember)","var(--moss)"], loose=momentsFor("none");
  const tile=(n,label,attrs)=>`<button ${attrs}><b>${n}</b><span>${label}</span></button>`;
  return topbar()+phead("Passport","Your travel record: rank, stamps and everything you've checked off.")+rankCard()+
  `<div class="stats">
    ${tile(list.length,"places","data-scroll=\"stamps\"")}
    ${tile(state.trips.filter(t=>t.start&&t.start<=today()).length,"trips",'data-tab="home"')}
    ${tile(moments.length,"moments",'data-tab="home"')}
    ${tile(Object.keys(state.quests.done).length,"challenges",'data-tab="quests"')}
    ${tile(Object.keys(state.checks.np).length+'<small>/63</small>',"national parks",'data-tab="lists" data-blist="np"')}
    ${tile(Object.keys(state.checks.adv).length,"adventures",'data-tab="lists" data-blist="adv"')}
  </div>
  ${mapHTML()}
  ${badgesHTML()}
  <div class="sechead" id="stamps"><h2>Stamps</h2></div>
  <div class="panel"><p class="note" style="margin:0 0 6px">Every place from your trips, photos, parks and lists gets a stamp.</p>
    ${list.length?`<div class="stamps">${list.map((p,i)=>`<div class="stamp" style="color:${colors[i%4]};transform:rotate(${((i*37)%13)-6}deg)"><span class="c">${esc(code(p.place.replace(/ National Park$/,"")))}</span><span class="p">${esc(p.place)}</span><span class="d">${p.date?fmtD(p.date,{month:"short",year:"numeric"}):""}</span></div>`).join("")}</div>`:'<p class="muted">No stamps yet. Capture a moment or add a place below.</p>'}
    <form class="add" data-add-been style="margin-top:14px;flex-wrap:wrap"><input name="place" placeholder="Add a place you've been" aria-label="Place" required style="flex:2 1 160px"><input type="date" name="date" aria-label="When" style="flex:1 1 130px"><button class="btn sm">Add</button></form></div>
  ${window.accountHTML?accountHTML():""}
  ${loose.length?`<div class="sechead"><h2>Moments without a trip</h2></div>${loose.sort((a,b)=>b.at.localeCompare(a.at)).map(momentCard).join("")}`:""}`;
}

/* ================= CAPTURE (one flow for moments and challenges) ================= */
let pending=[];
function questOptions(tripId,sel){
  const t=state.trips.find(x=>x.id===tripId), packs=[], p=t&&packForPlace(t.to);
  if(p) packs.push(p);
  if(sel){ const [sp]=findCh(sel); if(sp&&!packs.includes(sp)) packs.unshift(sp); }
  const any=PACKS.find(x=>x.id==="any"); if(!packs.includes(any)) packs.push(any);
  return `<option value="">No, just a moment</option>`+packs.map(pk=>{ const items=pk.items.filter(c=>!state.quests.done[c.id]||c.id===sel);
    return items.length?`<optgroup label="${esc(pk.name)}">${items.map(c=>`<option value="${c.id}" ${c.id===sel?"selected":""}>${esc(c.title)} (+${c.pts})</option>`).join("")}</optgroup>`:""; }).join("");
}
const placeFrom=title=>title.replace(/^(Photo (with|at|of|from) |Walk (across|along|under) |Visit |See |Stand (in|on) |Eat |Watch |Find |Climb |Wander |Ride |Tour |Toss a coin into )/i,"").replace(/^(the|a|an) /i,"").replace(/^./,c=>c.toUpperCase());
function openCapture(opt={}){
  pending=[];
  const act=state.trips.find(isActive);
  let sel=opt.trip||view.trip||(act&&act.id)||"";
  if(!sel&&opt.quest){ const [qp]=findCh(opt.quest); sel=tripFor(qp)||""; }
  if(!sel) sel="__new";
  const order=[...upcoming(),...pastTrips()];
  const qc=opt.quest&&findCh(opt.quest)[1];
  $("#modal").innerHTML=`<div class="scrim" data-close><form class="sheet" id="mf" role="dialog" aria-modal="true" aria-label="Capture">
    <h2>${qc?"Snap the challenge":"Capture a moment"}</h2>
    <label class="pick" for="m-photo" id="m-pick">${ICON.cam}<span>Add photos</span></label>
    <input id="m-photo" type="file" accept="image/*" multiple class="hidden">
    <div class="previews" id="prev"></div>
    <div class="field"><label for="m-trip">Which trip?</label><select id="m-trip" name="trip">
      <option value="__new" ${sel==="__new"?"selected":""}>＋ New trip</option>
      ${order.map(t=>`<option value="${t.id}" ${sel===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}
      <option value="">No trip</option></select></div>
    <div class="field" id="m-newwrap"><label for="m-new">Name the new trip</label><input id="m-new" name="newtrip" placeholder="Kentucky weekend" autocomplete="off"></div>
    <div class="field"><label for="m-q">Does this complete a challenge?</label><select id="m-q" name="quest">${questOptions(sel,opt.quest)}</select><div class="qhint hidden" id="m-qhint">A photo is required to count it.</div></div>
    <div class="field"><label for="m-place">Where</label><input id="m-place" name="place" placeholder="Name the spot" autocomplete="off" required value="${qc?esc(placeFrom(qc.title)):""}"></div>
    <div class="field"><label for="m-note">What happened</label><textarea id="m-note" name="note" placeholder="The part you'll want to remember"></textarea></div>
    <div class="field"><label for="m-at">When</label><input id="m-at" type="datetime-local" name="at" value="${localDT(new Date())}"></div>
    <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn ember" id="m-save">Save</button></div></form></div>`;
  let autoPlace=!!qc;
  const syncQ=()=>{ const v=$("#m-q").value, c=v&&findCh(v)[1]; $("#m-qhint").classList.toggle("hidden",!c); $("#m-pick").classList.toggle("req",!!c&&!pending.length);
    if(c&&(autoPlace||!$("#m-place").value.trim())){ $("#m-place").value=placeFrom(c.title); autoPlace=true; } };
  const syncTrip=()=>{ const v=$("#m-trip").value; $("#m-newwrap").classList.toggle("hidden",v!=="__new"); const cur=$("#m-q").value; $("#m-q").innerHTML=questOptions(v,cur); if(cur&&$("#m-q").value!==cur) $("#m-q").value=""; syncQ(); };
  syncTrip();
  $("#m-trip").addEventListener("change",syncTrip);
  $("#m-q").addEventListener("change",syncQ);
  $("#m-place").addEventListener("input",()=>{ autoPlace=false; });
  $("#m-photo").addEventListener("change",e=>{ pending.push(...[...e.target.files].slice(0,8-pending.length)); $("#prev").innerHTML=pending.map(f=>`<img src="${URL.createObjectURL(f)}" alt="">`).join(""); $("#m-pick span").textContent=pending.length?`${pending.length} photo${pending.length>1?"s":""}. Add more`:"Add photos"; e.target.value=""; syncQ(); });
  $("#mf").addEventListener("submit",saveMoment);
}
function shrink(file,max,q){ return new Promise((res,rej)=>{ const url=URL.createObjectURL(file), img=new Image();
  img.onload=()=>{ const s=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)); const c=document.createElement("canvas"); c.width=Math.round(img.naturalWidth*s); c.height=Math.round(img.naturalHeight*s); c.getContext("2d").drawImage(img,0,0,c.width,c.height); URL.revokeObjectURL(url); c.toBlob(b=>b?res(b):rej(new Error("encode")),"image/jpeg",q); };
  img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error("decode")); }; img.src=url; }); }
const toDataURL=b=>new Promise(r=>{ const f=new FileReader(); f.onload=()=>r(f.result); f.readAsDataURL(b); });
async function saveMoment(ev){
  ev.preventDefault();
  const f=Object.fromEntries(new FormData(ev.target)), btn=$("#m-save");
  if(f.quest&&!pending.length){ toast("Add a photo to count the challenge."); $("#m-pick").classList.add("req"); return; }
  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Saving…';
  const when=new Date(f.at||Date.now());
  let tripId=f.trip;
  if(tripId==="__new"){
    const nm=(f.newtrip||"").trim()||f.place.trim();
    const nt={id:uid(),name:nm,from:"",to:f.place.trim()||nm,start:iso(when),end:iso(when),people:1,budget:0,cur:"USD",days:{},ideas:[],pack:[],exp:[],notes:""};
    Object.entries(PACK_BASE).forEach(([c,l])=>l.forEach(x=>nt.pack.push({id:uid(),text:x,cat:c,done:false})));
    state.trips.push(nt); tripId=nt.id;
  }
  const m={id:uid(),at:when.toISOString(),place:f.place.trim(),note:f.note.trim(),trip:tripId||"",photos:[],thumbs:[]};
  const assets=await assetsP; let failed=0;
  for(const file of pending){
    try{
      if(assets){ const b=await shrink(file,1600,.82); const r=await assets.upload(b,{type:"image/jpeg"}); m.photos.push(r.id); }
      else { const b=await shrink(file,520,.7); m.thumbs.push(await toDataURL(b)); }
    }catch(e){ failed++; }
  }
  if(!m.thumbs.length) delete m.thumbs;
  if(f.quest&&photoCount(m)){ m.quest=f.quest; state.quests.done[f.quest]={at:iso(when),moment:m.id}; }
  const t=state.trips.find(x=>x.id===m.trip);
  if(t&&t.end&&iso(when)>t.end) t.end=iso(when);
  if(t&&t.start&&iso(when)<t.start) t.start=iso(when);
  save(); moments.push(m); await putMoment(m); postGroupMoment(t,m); closeModal();
  if(m.trip) setView({trip:m.trip,pack:null,tab:"home",ttab:m.quest?"quests":"log"}); else setView({trip:null,pack:null,tab:"passport"});
  if(m.quest){ const [qp,qc]=findCh(m.quest); toast(packDone(qp)===qp.items.length?`★ ${qp.name} cleared! +${qc.pts} pts`:`Challenge complete! +${qc.pts} pts`); }
  else if(f.quest) toast("Saved, but the photo didn't upload, so the challenge wasn't counted.");
  else toast(failed?`Saved. ${failed} photo${failed>1?"s":""} couldn't upload.`:"Saved to "+(t?t.name:"your passport"));
}

/* ================= TRIP FORM ================= */
function openForm(t,preset={}){
  const e=t||Object.assign({name:"",from:"",to:"",start:"",end:"",people:1,budget:"",cur:"USD"},preset);
  $("#modal").innerHTML=`<div class="scrim" data-close><form class="sheet" id="tf" role="dialog" aria-modal="true" aria-label="${t?"Edit trip":"New trip"}">
    <h2>${t?"Edit trip":"Where are you going?"}</h2>
    <div class="field"><label for="f-to">Destination</label><input id="f-to" name="to" value="${esc(e.to)}" placeholder="Cincinnati, Paris, Zion…" required></div>
    <div class="grid2"><div class="field"><label for="f-s">Start</label><input id="f-s" type="date" name="start" value="${e.start}"></div>
    <div class="field"><label for="f-e">End</label><input id="f-e" type="date" name="end" value="${e.end}"></div></div>
    <div class="field"><label for="f-name">Trip name <span style="font-weight:500">(optional)</span></label><input id="f-name" name="name" value="${esc(e.name)}" placeholder="Spring in Portugal"></div>
    <div class="grid2"><div class="field"><label for="f-from">Leaving from</label><input id="f-from" name="from" value="${esc(e.from)}" placeholder="Home"></div>
    <div class="field"><label for="f-p">Travelers</label><input id="f-p" type="number" min="1" name="people" value="${e.people}"></div></div>
    <div class="grid2"><div class="field"><label for="f-b">Budget</label><input id="f-b" type="number" inputmode="decimal" name="budget" value="${e.budget}" placeholder="2500"></div>
    <div class="field"><label for="f-c">Currency</label><select id="f-c" name="cur">${Object.keys(CUR).map(c=>`<option ${c===e.cur?"selected":""}>${c}</option>`).join("")}</select></div></div>
    <div class="actions">${t?'<button type="button" class="btn ghost" data-act="deltrip">Delete trip</button><span class="spacer"></span>':""}<button type="button" class="btn ghost" data-close>Cancel</button><button class="btn">${t?"Save":"Create trip"}</button></div></form></div>`;
  $("#tf").addEventListener("submit",ev=>{
    ev.preventDefault(); const f=Object.fromEntries(new FormData(ev.target));
    if(f.start&&f.end&&f.end<f.start){ toast("The end date is before the start date."); return; }
    const data={name:f.name.trim()||("Trip to "+f.to.trim()),from:f.from,to:f.to.trim(),start:f.start,end:f.end||f.start,people:Math.max(1,+f.people||1),budget:+f.budget||0,cur:f.cur};
    if(t){ Object.assign(t,data); save(); closeModal(); rerender(); toast("Trip saved"); return; }
    const nt={id:uid(),...data,days:{},ideas:[],pack:[],exp:[],notes:""};
    Object.entries(PACK_BASE).forEach(([c,l])=>l.forEach(x=>nt.pack.push({id:uid(),text:x,cat:c,done:false})));
    state.trips.push(nt); save(); closeModal(); setView({tab:"home",trip:nt.id,ttab:"plan",pack:null});
    const p=packForPlace(nt.to); toast(p?`Trip created. ${p.items.length} challenges found for ${nt.to}!`:"Trip created");
  });
  setTimeout(()=>{ const i=$("#f-to"); if(i&&!t) i.focus(); },60);
}
function closeModal(){ $("#modal").innerHTML=""; }
function demo(){
  const s=new Date(); s.setDate(s.getDate()+24); const e=new Date(s); e.setDate(e.getDate()+3);
  const t={id:uid(),name:"Long weekend in Lisbon",from:"Home",to:"Lisbon",start:iso(s),end:iso(e),people:2,budget:2400,cur:"EUR",days:{},ideas:[{id:uid(),text:"Pastéis de Belém"},{id:uid(),text:"LX Factory on Sunday"}],pack:[],exp:[],notes:"Flight TP 204, arrives 7:15am\nStay: Rua das Flores 28, Chiado"};
  const d=dayList(t);
  t.days[d[0]]=[{id:uid(),time:"09:30",title:"Land & drop bags",note:"Metro to Chiado"},{id:uid(),time:"18:30",title:"Sunset at Miradouro de Santa Catarina"}];
  t.days[d[1]]=[{id:uid(),time:"10:00",title:"Tram 28 through Alfama"},{id:uid(),time:"15:00",title:"Castelo de São Jorge"}];
  t.days[d[2]]=[{id:uid(),time:"09:00",title:"Day trip to Sintra",note:"Train from Rossio, about 40 min"}];
  Object.entries(PACK_BASE).forEach(([c,l])=>l.forEach((x,i)=>t.pack.push({id:uid(),text:x,cat:c,done:i<2})));
  t.exp=[{id:uid(),title:"Flights",amt:1180,cat:"Transport"},{id:uid(),title:"Apartment, 3 nights",amt:540,cat:"Stay"}];
  state.trips.push(t); save(); setView({tab:"home",trip:null});
}

/* ================= CLAUDE HELPERS ================= */
async function aiPlan(btn){
  const t=trip(), days=dayList(t);
  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Planning…';
  try{
    const res=await sample.json(`You are a sharp travel planner. Build a realistic day-by-day itinerary.
Destination: ${t.to}. From: ${t.from||"unknown"}. Dates: ${days.join(", ")}. Travelers: ${t.people}. Budget: ${t.budget} ${t.cur}.
Ideas the traveler wants to fit in: ${t.ideas.map(i=>i.text).join("; ")||"none"}.
Already planned (don't duplicate): ${JSON.stringify(t.days)}
Rules: 3-5 items per day, 24h "HH:MM" times, lighter arrival and departure days, cluster by neighborhood, include meals at specific local spots, work in the ideas. "note" = one short practical tip.
Respond ONLY with JSON: {"days":[{"date":"YYYY-MM-DD","items":[{"time":"HH:MM","title":"...","note":"..."}]}]}`);
    let n=0;
    (res.days||[]).forEach(d=>{ if(!days.includes(d.date)) return; (t.days[d.date] ||= []); (d.items||[]).forEach(it=>{ t.days[d.date].push({id:uid(),time:it.time||"",title:it.title,note:it.note||""}); n++; }); });
    save(); rerender(); toast(`Added ${n} stops`);
  }catch(e){ btn.disabled=false; btn.innerHTML=ICON.spark+"Plan with AI"; toast(e&&e.code==="not_granted"?"AI isn't available right now. Try again later.":"Couldn't plan it. Try again."); }
}
async function aiPack(btn){
  const t=trip();
  btn.disabled=true; btn.innerHTML='<span class="spin"></span>Thinking…';
  try{
    const res=await sample.json(`Suggest packing items for a trip to ${t.to} from ${t.start} to ${t.end}, ${t.people} traveler(s). Activities: ${Object.values(t.days).flat().map(i=>i.title).join("; ")||"none yet"}.
Consider likely weather that season, local plugs, and the activities. Already packed: ${t.pack.map(p=>p.text).join(", ")}. Only NEW items, 6-12.
Respond ONLY with JSON: {"items":[{"text":"...","cat":"Documents|Tech|Clothes|Toiletries|Gear|Other"}]}`,{modelTier:"quick"});
    const have=new Set(t.pack.map(p=>p.text.toLowerCase())); let n=0;
    (res.items||[]).forEach(i=>{ if(i.text&&!have.has(i.text.toLowerCase())){ t.pack.push({id:uid(),text:i.text,cat:i.cat||"Other",done:false}); n++; }});
    save(); rerender(); toast(`Added ${n} items`);
  }catch(e){ btn.disabled=false; btn.innerHTML=ICON.spark+"Suggest items"; toast("Couldn't suggest items. Try again."); }
}
function newPack(place,items,ai){
  const p={id:"u"+uid(),name:place,region:ai?"Made for you":"Your list",keys:[place.toLowerCase()],ai:!!ai,items:[]};
  items.forEach(c=>p.items.push({id:p.id+"-"+uid(),title:c.title,hint:c.hint||"",pts:[10,25,50].includes(+c.pts)?+c.pts:25}));
  state.quests.packs.push(p); save(); return p;
}
async function genPack(place,btn,tripId){
  const done=p=>tripId?setView({trip:tripId,tab:"home",ttab:"quests",pack:null}):setView({pack:p.id,qtrip:null});
  const existing=packForPlace(place); if(existing){ done(existing); return; }
  if(!sample){ const p=newPack(place,[],false); done(p); toast("List started. Add your own challenges."); return; }
  const label=btn&&btn.innerHTML; if(btn){ btn.disabled=true; btn.innerHTML='<span class="spin"></span>Scouting…'; }
  try{
    const res=await sample.json(`Create a traveler's scavenger hunt for: ${place}.
Give 7 photo challenges at real, specific, currently open landmarks, foods, and experiences in or near ${place}, like "Photo with the dinosaur at the Creation Museum". Mix iconic sights, one signature local food, one hidden gem, and one harder one. Each must be provable with a photo. Only use places you're confident exist.
"pts": 10 easy/quick, 25 moderate, 50 hard or far. "hint": one short practical tip (where exactly, best time). Include approximate "lat"/"lon" for each spot and for the place itself.
Respond ONLY with JSON: {"name":"<clean place name>","lat":0,"lon":0,"items":[{"title":"...","hint":"...","pts":10,"lat":0,"lon":0}]}`);
    const p=newPack(res.name||place,res.items||[],true); const okG=(a,b)=>typeof a==="number"&&typeof b==="number"&&Math.abs(a)<=90&&Math.abs(b)<=180&&(a||b); if(okG(res.lat,res.lon)) p.geo=[res.lat,res.lon]; p.items.forEach((c,i)=>{ const r=(res.items||[])[i]; if(r&&okG(r.lat,r.lon)) c.geo=[r.lat,r.lon]; }); if(!p.keys.includes(place.toLowerCase())) p.keys.push(place.toLowerCase()); save();
    done(p); toast(`${p.items.length} challenges ready`);
  }catch(e){ if(btn){ btn.disabled=false; btn.innerHTML=label; } toast(e&&e.code==="not_granted"?"AI isn't available right now. Try again later.":"Couldn't make challenges. Try again."); }
}


/* ================= IN-PAGE CONFIRM (the viewer blocks confirm()) ================= */
function ask(msg,ok="Delete"){
  return new Promise(res=>{
    $("#modal").innerHTML=`<div class="scrim"><div class="sheet" role="alertdialog" aria-modal="true" aria-labelledby="ask-t"><h2 id="ask-t" style="font-size:21px;line-height:1.3">${esc(msg)}</h2>
      <div class="actions"><button class="btn ghost" id="ask-no">Cancel</button><button class="btn ember" id="ask-yes">${esc(ok)}</button></div></div></div>`;
    $("#ask-yes").onclick=()=>{ closeModal(); res(true); };
    $("#ask-no").onclick=()=>{ closeModal(); res(false); };
    $("#ask-yes").focus();
  });
}

/* ================= GEO DATA ================= */
const PACK_GEO={cincy:[39.10,-84.51],nyc:[40.71,-74.01],chi:[41.88,-87.63],nash:[36.16,-86.78],dc:[38.90,-77.04],lv:[36.17,-115.14],gc:[36.06,-112.14],yell:[44.43,-110.59],par:[48.857,2.352],lon:[51.507,-0.128],rome:[41.90,12.50],tok:[35.68,139.69],mex:[19.43,-99.13],ice:[64.15,-21.94]};
const CH_GEO=[["Ark at Ark Encounter",38.624,-84.591],["Creation Museum",39.087,-84.786],["Roebling",39.092,-84.510],["Findlay Market",39.115,-84.518],["Cincinnati Zoo",39.145,-84.508],["Statue of Liberty",40.689,-74.045],["Brooklyn Bridge",40.706,-73.997],["Times Square",40.758,-73.986],["Bow Bridge",40.776,-73.972],["Cloud Gate",41.883,-87.623],["Willis Tower",41.879,-87.636],["Ryman",36.161,-86.779],["Parthenon",36.150,-86.813],["Lincoln Memorial",38.889,-77.050],["Capitol dome",38.890,-77.009],["Welcome to Fabulous",36.082,-115.173],["Bellagio",36.113,-115.174],["Hoover Dam",36.016,-114.738],["Fremont Street",36.171,-115.144],["High Roller",36.118,-115.168],["Mather Point",36.062,-112.108],["Horseshoe Bend",36.880,-111.510],["Antelope Canyon",36.862,-111.374],["Old Faithful",44.460,-110.828],["Grand Prismatic",44.525,-110.838],["Lamar Valley",44.898,-110.227],["Artist Point",44.720,-110.479],["Trocadéro",48.862,2.288],["Louvre",48.861,2.336],["Sacré-Cœur",48.887,2.343],["Big Ben",51.500,-0.125],["Tower Bridge",51.505,-0.075],["Abbey Road",51.532,-0.178],["Changing of the Guard",51.501,-0.142],["Colosseum",41.890,12.492],["Trevi",41.901,12.483],["Pantheon",41.899,12.477],["St. Peter's",41.902,12.457],["Shibuya",35.660,139.700],["Senso-ji",35.715,139.797],["Zócalo",19.433,-99.133],["Teotihuacan",19.692,-98.844],["Casa Azul",19.355,-99.162],["Xochimilco",19.257,-99.103],["Seljalandsfoss",63.616,-19.989],["Strokkur",64.313,-20.300],["Reynisfjara",63.404,-19.045]];
const NP_GEO={"Acadia":[44.35,-68.21],"American Samoa":[-14.26,-170.68],"Arches":[38.73,-109.59],"Badlands":[43.75,-102.50],"Big Bend":[29.25,-103.25],"Biscayne":[25.65,-80.08],"Black Canyon of the Gunnison":[38.57,-107.72],"Bryce Canyon":[37.57,-112.18],"Canyonlands":[38.20,-109.93],"Capitol Reef":[38.20,-111.17],"Carlsbad Caverns":[32.17,-104.44],"Channel Islands":[34.01,-119.42],"Congaree":[33.78,-80.78],"Crater Lake":[42.94,-122.10],"Cuyahoga Valley":[41.24,-81.55],"Death Valley":[36.24,-116.82],"Denali":[63.33,-150.50],"Dry Tortugas":[24.63,-82.87],"Everglades":[25.32,-80.93],"Gates of the Arctic":[67.78,-153.30],"Gateway Arch":[38.62,-90.19],"Glacier":[48.80,-114.00],"Glacier Bay":[58.50,-137.00],"Grand Canyon":[36.06,-112.14],"Grand Teton":[43.73,-110.80],"Great Basin":[38.98,-114.30],"Great Sand Dunes":[37.73,-105.51],"Great Smoky Mountains":[35.68,-83.53],"Guadalupe Mountains":[31.92,-104.87],"Haleakalā":[20.72,-156.17],"Hawaiʻi Volcanoes":[19.38,-155.20],"Hot Springs":[34.51,-93.05],"Indiana Dunes":[41.65,-87.05],"Isle Royale":[48.10,-88.55],"Joshua Tree":[33.79,-115.90],"Katmai":[58.50,-155.00],"Kenai Fjords":[59.92,-149.65],"Kings Canyon":[36.80,-118.55],"Kobuk Valley":[67.55,-159.28],"Lake Clark":[60.97,-153.42],"Lassen Volcanic":[40.49,-121.51],"Mammoth Cave":[37.18,-86.10],"Mesa Verde":[37.18,-108.49],"Mount Rainier":[46.85,-121.75],"New River Gorge":[37.95,-81.07],"North Cascades":[48.70,-121.20],"Olympic":[47.97,-123.50],"Petrified Forest":[35.07,-109.78],"Pinnacles":[36.48,-121.16],"Redwood":[41.30,-124.00],"Rocky Mountain":[40.40,-105.58],"Saguaro":[32.25,-110.50],"Sequoia":[36.43,-118.68],"Shenandoah":[38.53,-78.35],"Theodore Roosevelt":[46.97,-103.45],"Virgin Islands":[18.33,-64.73],"Voyageurs":[48.50,-92.88],"White Sands":[32.78,-106.17],"Wind Cave":[43.57,-103.48],"Wrangell–St. Elias":[61.00,-142.00],"Yellowstone":[44.60,-110.50],"Yosemite":[37.83,-119.50],"Zion":[37.30,-113.05]};
function packGeo(p){ return p.geo||PACK_GEO[p.id]||null; }
function chGeo(c){ if(c.geo) return c.geo; const hit=CH_GEO.find(([k])=>c.title.includes(k)); return hit?[hit[1],hit[2]]:null; }
function tripGeo(t){
  if(t.geo) return t.geo;
  const p=packForPlace(t.to); if(p&&packGeo(p)) return packGeo(p);
  const q=t.to.toLowerCase(), np=Object.keys(NP_GEO).find(n=>q.includes(n.toLowerCase())); if(np) return NP_GEO[np];
  return null;
}
function km(a,b){ const R=6371, r=x=>x*Math.PI/180, dLa=r(b[0]-a[0]), dLo=r(b[1]-a[1]); const h=Math.sin(dLa/2)**2+Math.cos(r(a[0]))*Math.cos(r(b[0]))*Math.sin(dLo/2)**2; return 2*R*Math.asin(Math.sqrt(h)); }
let geocoding=false;
async function geocodeMissing(){
  if(geocoding||!sample) return;
  const t=state.trips.find(x=>!tripGeo(x)&&!x.geoTried&&x.to); if(!t) return;
  geocoding=true; t.geoTried=true;
  try{ const r=await sample.json(`Give the latitude and longitude of this travel destination: "${t.to}". Respond ONLY with JSON: {"lat":number,"lon":number} or {"lat":null,"lon":null} if unknown.`,{modelTier:"quick"});
    if(typeof r.lat==="number"&&typeof r.lon==="number"&&Math.abs(r.lat)<=90&&Math.abs(r.lon)<=180) t.geo=[r.lat,r.lon]; save(); if($("#map")) drawMap(); }catch(e){}
  geocoding=false; setTimeout(geocodeMissing,400);
}

/* ================= MAP ================= */
const mapCache={};
function mapHTML(){
  return `<div class="sechead" id="mapsec"><h2>Map</h2><div class="chips" style="margin:0" role="group" aria-label="Map area"><button data-mapv="world" aria-pressed="${view.mapv!=="us"}">World</button><button data-mapv="us" aria-pressed="${view.mapv==="us"}">USA</button></div></div>
  <div class="panel mapwrap"><div id="map" class="map" role="img" aria-label="Map of places you've been"></div>
  <div class="legend"><span><i class="lg been"></i>Been</span><span><i class="lg next"></i>Planned</span><span><i class="lg park"></i>National park</span>${view.mapv==="us"?'<span><i class="lg todo"></i>Park to visit</span>':""}</div></div>`;
}
function drawMap(){
  const el=$("#map"); if(!el) return;
  if(!window.d3||!window.topojson){ el.innerHTML='<p class="note" style="padding:20px;text-align:center">The map couldn\'t load. Check your connection and open Passport again.</p>'; return; }
  const us=view.mapv==="us", W=Math.max(280,Math.round(el.clientWidth||340)), H=Math.round(W*(us?0.62:0.52)), key=(us?"us":"w")+W;
  let c=mapCache[key];
  if(!c){
    const topo=us?GEO.us:GEO.world, obj=us?topo.objects.states:topo.objects.countries, fc=topojson.feature(topo,obj);
    const proj=us?d3.geoAlbersUsa().fitExtent([[6,6],[W-6,H-6]],fc):d3.geoNaturalEarth1().fitExtent([[4,4],[W-4,H-4]],{type:"Sphere"});
    const path=d3.geoPath(proj);
    c=mapCache[key]={proj,sea:us?"":path({type:"Sphere"}),land:path(fc),border:path(topojson.mesh(topo,obj,(a,b)=>a!==b))};
  }
  const pt=g=>{ if(!g) return null; const p=c.proj([g[1],g[0]]); return p&&isFinite(p[0])?p:null; };
  let pins="";
  if(us) Object.entries(NP_GEO).forEach(([n,g])=>{ if(state.checks.np[n]) return; const p=pt(g); if(p) pins+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.2" class="pin todo"><title>${esc(n)} (not yet)</title></circle>`; });
  Object.keys(state.checks.np).forEach(n=>{ const p=pt(NP_GEO[n]); if(p) pins+=`<path transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})" d="M0-7 2 -2 7-2 3 1.5 4.5 7 0 3.8-4.5 7-3 1.5-7-2-2-2z" class="pin park"><title>${esc(n)} National Park</title></path>`; });
  state.trips.forEach(t=>{ const p=pt(tripGeo(t)); if(!p) return; const been=t.start&&t.start<=today();
    pins+=`<g class="pin ${been?"been":"next"}" transform="translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})"><circle r="6.5"/><circle r="2.4" class="dotc"/><title>${esc(t.name)}</title></g>`; });
  el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true">${c.sea?`<path d="${c.sea}" class="sea"/>`:""}<path d="${c.land}" class="land"/><path d="${c.border}" class="border"/>${pins}</svg>`;
  geocodeMissing();
}

/* ================= BADGES ================= */
const lenK=o=>Object.keys(o).length;
const tripsTaken=()=>state.trips.filter(t=>t.start&&t.start<=today());
const spentOn=t=>t.exp.reduce((s,e)=>s+Number(e.amt||0),0);
const MIGHTY5=["Arches","Bryce Canyon","Canyonlands","Capitol Reef","Zion"];
const hourOf=m=>new Date(m.at).getHours();
const BADGES=[
  ["first-trip","First steps","Take your first trip","home",()=>[tripsTaken().length,1]],
  ["road-5","Road warrior","Take 5 trips","home",()=>[tripsTaken().length,5]],
  ["snap-1","First find","Complete a challenge","quests",()=>[lenK(state.quests.done),1]],
  ["snap-10","Sharpshooter","Complete 10 challenges","quests",()=>[lenK(state.quests.done),10]],
  ["snap-50","Scavenger","Complete 50 challenges","quests",()=>[lenK(state.quests.done),50]],
  ["cleared","Pack cleared","Finish every challenge in one pack","star",()=>[allPacks().some(p=>p.items.length&&packDone(p)===p.items.length)?1:0,1]],
  ["hunter-3","Collector","Find challenges in 3 different places","pin",()=>[allPacks().filter(p=>p.id!=="any"&&packDone(p)).length,3]],
  ["park-1","Park ranger","Visit a national park","park",()=>[lenK(state.checks.np),1]],
  ["park-10","Trail boss","Visit 10 national parks","park",()=>[lenK(state.checks.np),10]],
  ["mighty-5","Mighty 5","Visit all five Utah parks","park",()=>[MIGHTY5.filter(n=>state.checks.np[n]).length,5]],
  ["park-63","All 63","Visit every national park","park",()=>[lenK(state.checks.np),63]],
  ["adv-1","Thrill seeker","Check off an adventure","bolt",()=>[lenK(state.checks.adv),1]],
  ["adv-10","Adrenaline junkie","Check off 10 adventures","bolt",()=>[lenK(state.checks.adv),10]],
  ["sunrise","Sunrise chaser","Capture a moment before 7am","sun",()=>[moments.some(m=>hourOf(m)>=4&&hourOf(m)<7)?1:0,1]],
  ["night","Night owl","Capture a moment after 10pm","moon",()=>[moments.some(m=>hourOf(m)>=22||hourOf(m)<3)?1:0,1]],
  ["story-10","Storyteller","Write notes on 10 moments","pen",()=>[moments.filter(m=>m.note).length,10]],
  ["stamps-10","Stamp collector","Collect 10 stamps","stamp",()=>[places().length,10]],
  ["bucket-5","Bucket lister","Finish 5 things on My list","lists",()=>[state.bucket.filter(b=>b.done).length,5]],
  ["planner","Planner","Plan a stop on every day of a trip","plan",()=>[state.trips.some(t=>{ const d=dayList(t); return d.length>1&&d.every(x=>(t.days[x]||[]).length); })?1:0,1]],
  ["packed","Packed and ready","Pack every item on a trip's list","bag",()=>[state.trips.some(t=>t.pack.length&&t.pack.every(p=>p.done))?1:0,1]],
  ["budget","Budget boss","Finish a trip under budget","wallet",()=>[state.trips.some(t=>isPast(t)&&t.budget>0&&spentOn(t)>0&&spentOn(t)<=t.budget)?1:0,1]],
  ["crew","Crew trip","Share a trip with a friend","users",()=>[state.trips.some(t=>t.group)?1:0,1]]
];
const BICON={star:I('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>'),pin:I('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),park:I('<path d="M12 3l-6 9h3.5L5 18h14l-4.5-6H18z"/><path d="M12 18v3"/>'),bolt:I('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),sun:I('<circle cx="12" cy="14" r="4"/><path d="M12 4v3M4.9 7l2 2M19.1 7l-2 2M3 18h18"/>'),moon:I('<path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z"/>'),pen:I('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),stamp:I('<circle cx="12" cy="12" r="8" stroke-dasharray="3 2.4"/><circle cx="12" cy="12" r="4.5"/>'),bag:I('<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3"/>'),wallet:I('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12.5h2"/>'),users:I('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16 14.2c2.3.2 3.9 1.8 4.5 4.3"/>')};
const bIcon=k=>BICON[k]||ICON[k]||"";
function badgeState(){ return BADGES.map(([id,name,desc,icon,f])=>{ const [have,need]=f(); return {id,name,desc,icon,have:Math.min(have,need),need,got:have>=need}; }); }
function checkBadges(){
  const first=!state.badges; state.badges ||= {};
  const fresh=badgeState().filter(b=>b.got&&!state.badges[b.id]);
  fresh.forEach(b=>state.badges[b.id]=today());
  if(!first&&fresh.length) setTimeout(()=>toast(fresh.length===1?`Badge unlocked: ${fresh[0].name}`:`${fresh.length} badges unlocked!`),350);
}
function badgesHTML(){
  const bs=badgeState(), n=bs.filter(b=>b.got).length;
  return `<div class="sechead"><h2>Badges</h2><span class="note">${n} of ${bs.length}</span></div>
  <div class="bgrid">${bs.map(b=>`<div class="badge ${b.got?"got":""}" title="${esc(b.desc)}"><span class="medal">${bIcon(b.icon)}</span><b>${esc(b.name)}</b><span>${b.got?(state.badges&&state.badges[b.id]?"Earned "+fmtD(state.badges[b.id],{month:"short",year:"numeric"}):"Earned"):esc(b.desc)}</span>${!b.got&&b.need>1?`<i class="bbar"><i style="width:${b.have/b.need*100}%"></i></i><span class="bcount">${b.have}/${b.need}</span>`:""}</div>`).join("")}</div>`;
}

/* ================= RECAP CARD ================= */
function loadImg(src){ return new Promise((res,rej)=>{ const i=new Image(); if(/^https:/.test(src)) i.crossOrigin="anonymous"; i.onload=()=>res(i); i.onerror=rej; i.src=src; }); }
function coverDraw(ctx,img,x,y,w,h){ const s=Math.max(w/img.width,h/img.height), sw=w/s, sh=h/s; ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h); }
function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function wrapText(ctx,text,maxW,maxLines){ const words=text.split(/\s+/), lines=[]; let cur=""; words.forEach(w=>{ const t=cur?cur+" "+w:w; if(ctx.measureText(t).width>maxW&&cur){ lines.push(cur); cur=w; } else cur=t; }); if(cur) lines.push(cur); if(lines.length>maxLines){ lines.length=maxLines; lines[maxLines-1]+="…"; } return lines; }
function tripStats(t){
  const ms=momentsFor(t.id), qs=ms.filter(m=>m.quest&&state.quests.done[m.quest]&&state.quests.done[m.quest].moment===m.id);
  const pts=qs.reduce((s,m)=>{ const c=findCh(m.quest)[1]; return s+(c?c.pts:0); },0);
  return {days:Math.max(1,dayList(t).length),photos:ms.reduce((s,m)=>s+photoCount(m),0),moments:ms.length,challenges:qs.length,pts,places:new Set(ms.map(m=>m.place.toLowerCase())).size};
}
async function buildRecap(t){
  const W=1080,H=1350, cv=document.createElement("canvas"); cv.width=W; cv.height=H; const ctx=cv.getContext("2d");
  try{ await document.fonts.ready; }catch(e){}
  const F=(w,s)=>`${w} ${s}px "Bricolage Grotesque", Figtree, system-ui, sans-serif`;
  ctx.fillStyle="#22382A"; ctx.fillRect(0,0,W,H);
  const srcs=[]; momentsFor(t.id).sort((a,b)=>a.at.localeCompare(b.at)).forEach(m=>{ for(let i=0;i<photoCount(m)&&srcs.length<3;i++) srcs.push(photoSrc(m,i)); });
  const imgs=[]; for(const s of srcs){ try{ imgs.push(await loadImg(s)); }catch(e){} }
  const PH=800;
  if(!imgs.length){ try{ const svg=scene(t.id).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="800" '); imgs.push(await loadImg("data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg))); }catch(e){} }
  if(imgs.length===1) coverDraw(ctx,imgs[0],0,0,W,PH);
  else if(imgs.length===2){ coverDraw(ctx,imgs[0],0,0,W/2-3,PH); coverDraw(ctx,imgs[1],W/2+3,0,W/2-3,PH); }
  else if(imgs.length>=3){ coverDraw(ctx,imgs[0],0,0,690,PH); coverDraw(ctx,imgs[1],696,0,W-696,PH/2-3); coverDraw(ctx,imgs[2],696,PH/2+3,W-696,PH/2-3); }
  const g=ctx.createLinearGradient(0,PH-360,0,PH); g.addColorStop(0,"rgba(34,56,42,0)"); g.addColorStop(1,"rgba(34,56,42,1)"); ctx.fillStyle=g; ctx.fillRect(0,PH-360,W,360);
  ctx.fillStyle="#22382A"; ctx.fillRect(0,PH,W,H-PH);
  // kicker pill
  ctx.font=F(800,92); const lines=wrapText(ctx,t.name,W-128,2), y0=PH-120-(lines.length-1)*96;
  ctx.font=F(700,30); const kick=isPast(t)?"Trip recap":"Trip so far", kw=ctx.measureText(kick).width+44;
  rr(ctx,64,y0-160,kw,56,28); ctx.fillStyle="#D0702A"; ctx.fill(); ctx.fillStyle="#fff"; ctx.textBaseline="middle"; ctx.fillText(kick,86,y0-132);
  ctx.fillStyle="#F4EEDF"; ctx.textBaseline="alphabetic"; ctx.font=F(800,92);
  lines.forEach((l,i)=>ctx.fillText(l,64,y0+i*96));
  ctx.font=F(500,38); ctx.globalAlpha=.9; ctx.fillText(`${t.to}${t.start?"  ·  "+range(t)+", "+parseD(t.start).getFullYear():""}`,64,PH-40); ctx.globalAlpha=1;
  // stats
  const s=tripStats(t), cells=[[s.days,s.days===1?"day":"days"],[s.photos,s.photos===1?"photo":"photos"],[s.challenges,s.challenges===1?"challenge":"challenges"],[s.pts,"points"]];
  const cw=(W-128-3*20)/4;
  cells.forEach(([n,l],i)=>{ const x=64+i*(cw+20), y=PH+64; rr(ctx,x,y,cw,190,28); ctx.fillStyle="rgba(244,238,223,.08)"; ctx.fill();
    ctx.fillStyle=i===3?"#E2AE45":"#F4EEDF"; ctx.font=F(800,76); ctx.textAlign="center"; ctx.fillText(String(n),x+cw/2,y+108); ctx.font=F(600,30); ctx.fillStyle="rgba(244,238,223,.75)"; ctx.fillText(l,x+cw/2,y+156); ctx.textAlign="left"; });
  // pack line
  const p=packForPlace(t.to); let yb=PH+330;
  if(p){ const d=packDone(p); ctx.font=F(600,32); ctx.fillStyle="rgba(244,238,223,.85)"; ctx.fillText(`⚑ ${d} of ${p.items.length} ${p.name} challenges`,64,yb); }
  // wordmark
  ctx.save(); ctx.translate(64,H-112); ctx.scale(2.2,2.2); ctx.fillStyle="#9CC08A"; ctx.fill(new Path2D("M13 2c1.6 1.4 2 2.8 1.4 4.2 2-1 3.4-.6 4 .9-1 1.2-1.1 2.3-.2 3.2 1.8-.2 2.7.8 2.5 2.4-1.5.5-2 1.4-1.3 2.6-1.3 1.3-2.8 1.3-4.3.3.3 1.8-.4 3.1-2.1 3.9-1.7-.8-2.4-2.1-2.1-3.9-1.5 1-3 1-4.3-.3.7-1.2.2-2.1-1.3-2.6-.2-1.6.7-2.6 2.5-2.4.9-.9.8-2-.2-3.2.6-1.5 2-1.9 4-.9C11 4.8 11.4 3.4 13 2z")); ctx.restore();
  ctx.font=F(800,44); ctx.fillStyle="#F4EEDF"; ctx.fillText("Waypoint",134,H-64);
  const r=rankOf(score()); ctx.font=F(600,30); ctx.fillStyle="rgba(244,238,223,.7)"; ctx.textAlign="right"; ctx.fillText(`${r.name} · ${score()} pts`,W-64,H-68); ctx.textAlign="left";
  return cv;
}
let recapBlob=null;
async function openRecap(t){
  $("#modal").innerHTML=`<div class="scrim" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="Trip recap"><h2>Your recap card</h2><div id="recap-out" class="recap-out"><p class="note center" style="padding:40px 0"><span class="spin"></span> Making your card…</p></div>
    <div class="actions" id="recap-act"><button class="btn ghost" data-close>Close</button></div></div></div>`;
  try{
    const cv=await buildRecap(t);
    recapBlob=await new Promise(r=>cv.toBlob(r,"image/png"));
    const url=cv.toDataURL("image/jpeg",.9);
    if(!$("#recap-out")) return;
    $("#recap-out").innerHTML=`<img src="${url}" alt="Recap card for ${esc(t.name)}">`;
    $("#recap-act").innerHTML=`<button class="btn ghost" data-close>Close</button>${dl?`<button class="btn ember" data-act="saverecap" data-name="${esc(t.name)}">Save image</button>`:""}`;
    if(!dl) $("#recap-out").insertAdjacentHTML("beforeend",`<p class="note center">Press and hold the image to save it.</p>`);
  }catch(e){ if($("#recap-out")) $("#recap-out").innerHTML=`<p class="note center">Couldn't make the card. Try again.</p>`; }
}
async function saveRecap(name){
  if(!dl||!recapBlob) return;
  try{ await dl.save({filename:(name||"trip").replace(/[^a-z0-9]+/gi,"-").toLowerCase()+"-recap.png",data:recapBlob}); toast("Recap saved"); }
  catch(e){ if(e&&e.code!=="declined") toast("Couldn't save the image. Press and hold it instead."); }
}

/* ================= FRIENDS: shared trips + leaderboard ================= */
const groups={}; const groupSubs={}; const names={}; let board=[]; let boardSub=null;
const CODE_CHARS="ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const newCode=()=>Array.from({length:6},()=>CODE_CHARS[Math.floor(Math.random()*CODE_CHARS.length)]).join("");
let nameTimer=null; const nameQueue=new Set();
function nameOf(id){ if(id===myId) return "You"; if(names[id]!==undefined) return names[id]||"Friend"; nameQueue.add(id); clearTimeout(nameTimer); nameTimer=setTimeout(resolveNames,50); return "Friend"; }
async function resolveNames(){ if(!userApi||!nameQueue.size) return; const ids=[...nameQueue]; nameQueue.clear(); try{ const ps=await userApi.profiles(ids); ids.forEach(i=>names[i]=(ps[i]&&ps[i].name)||""); rerender(); }catch(e){ ids.forEach(i=>names[i]=""); } }
function ensureGroupSubs(){
  if(!db) return;
  state.trips.filter(t=>t.group).forEach(t=>{ const g=t.group; if(groupSubs[g]) return;
    groups[g] ||= {members:[],moments:[]};
    groupSubs[g]=[
      db.collection(`groups/${g}/members`).onSnapshot(s=>{ groups[g].members=s.docs.map(d=>d.id); rerenderIf(); },()=>{}),
      db.collection(`groups/${g}/moments`).onSnapshot(s=>{ groups[g].moments=s.docs.map(d=>Object.assign({id:d.id},d.data())); rerenderIf(); },()=>{})
    ]; });
}
function rerenderIf(){ const t=trip(); if(t&&t.group&&(view.ttab==="log"||view.ttab==="quests")) rerender(); else if(!t&&view.tab==="quests") rerender(); }
function startBoard(){ if(!db||boardSub) return; boardSub=db.collection("board").orderBy("pts","desc").limit(50).onSnapshot(s=>{ board=s.docs.map(d=>Object.assign({id:d.id},d.data())); if(!trip()&&!view.pack&&view.tab==="quests") rerender(); },()=>{}); }
let boardTimer=null;
function publishBoard(){ if(!db||!myId) return; clearTimeout(boardTimer); boardTimer=setTimeout(()=>{ const r=rankOf(score());
  db.doc("board/"+myId).set({pts:score(),rank:r.i+1,challenges:lenK(state.quests.done),parks:lenK(state.checks.np),places:places().length,trips:tripsTaken().length,badges:lenK(state.badges||{}),updated:Date.now()}).catch(()=>{}); },1500); }
function postGroupMoment(t,m){ if(!db||!myId||!t||!t.group) return;
  db.doc(`groups/${t.group}/moments/${m.id}`).set({by:myId,at:m.at,place:m.place,note:m.note||"",quest:m.quest||"",photos:m.photos||[],thumb:(m.thumbs||[])[0]||""}).catch(()=>{}); }
function dropGroupMoment(m){ const t=state.trips.find(x=>x.id===m.trip); if(db&&t&&t.group) db.doc(`groups/${t.group}/moments/${m.id}`).delete().catch(()=>{}); }
async function shareTrip(t,btn){
  if(!db||!myId){ toast("Sharing isn't available in this view."); return; }
  btn&&(btn.disabled=true);
  try{ const g=newCode();
    await db.doc("groups/"+g).set({name:t.name,to:t.to,start:t.start||"",end:t.end||"",owner:myId,created:Date.now()});
    await db.doc(`groups/${g}/members/${myId}`).set({joined:Date.now()});
    t.group=g; save(); ensureGroupSubs(); momentsFor(t.id).forEach(m=>postGroupMoment(t,m)); rerender(); toast("Trip shared. Send your friends the code.");
  }catch(e){ btn&&(btn.disabled=false); toast(e&&e.code==="invalid_argument"?"Couldn't share the trip. Check your connection.":"Couldn't share the trip. Try again."); }
}
function openJoin(){
  $("#modal").innerHTML=`<div class="scrim" data-close><form class="sheet" id="jf" role="dialog" aria-modal="true" aria-label="Join a friend's trip"><h2>Join a friend's trip</h2>
    <p class="note" style="margin-top:-8px">Ask your friend for the 6-letter code on their trip's Photos tab.</p>
    <div class="field"><label for="j-code">Trip code</label><input id="j-code" name="code" autocomplete="off" autocapitalize="characters" maxlength="6" placeholder="ABC123" required style="font-size:22px;letter-spacing:.2em;text-transform:uppercase"></div>
    <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" id="j-go">Join trip</button></div></form></div>`;
  $("#jf").addEventListener("submit",async ev=>{ ev.preventDefault(); const code=$("#j-code").value.trim().toUpperCase();
    if(!/^[A-Z0-9]{6}$/.test(code)){ toast("Codes are 6 letters and numbers."); return; }
    if(!db||!myId){ toast("Joining isn't available in this view."); return; }
    const mine=state.trips.find(x=>x.group===code); if(mine){ closeModal(); setView({tab:"home",trip:mine.id,ttab:"log",pack:null}); return; }
    $("#j-go").disabled=true;
    try{ const s=await db.doc("groups/"+code).get();
      if(!s.exists){ $("#j-go").disabled=false; toast("No trip with that code. Check it with your friend."); return; }
      const g=s.data(); await db.doc(`groups/${code}/members/${myId}`).set({joined:Date.now()});
      const nt={id:uid(),name:String(g.name||"Shared trip").slice(0,80),from:"",to:String(g.to||"").slice(0,80),start:g.start||"",end:g.end||g.start||"",people:2,budget:0,cur:"USD",days:{},ideas:[],pack:[],exp:[],notes:"",group:code};
      Object.entries(PACK_BASE).forEach(([c,l])=>l.forEach(x=>nt.pack.push({id:uid(),text:x,cat:c,done:false})));
      state.trips.push(nt); save(); ensureGroupSubs(); closeModal(); setView({tab:"home",trip:nt.id,ttab:"log",pack:null}); toast(`You joined ${nt.name}`);
    }catch(e){ $("#j-go")&&($("#j-go").disabled=false); toast("Couldn't join. Try again."); }
  });
  setTimeout(()=>{ const i=$("#j-code"); i&&i.focus(); },60);
}
function friendMoments(t){ const g=t.group&&groups[t.group]; return g?g.moments.filter(m=>m.by!==myId&&!isBlocked(m.by)):[]; }
function friendCard(m){
  const srcs=[...(m.photos||[]).map(id=>blobUrl(id)),...(m.thumb?[m.thumb]:[])].filter(s=>typeof s==="string"&&(/^(https:|blob:)/.test(s)||s.startsWith("data:image/")));
  const k=srcs.length, qc=m.quest&&findCh(m.quest)[1];
  return `<article class="moment friend">${k?`<div class="photos ${k===1?"one":k%2?"odd":""}">${srcs.map(s=>`<img src="${esc(s)}" alt="Photo from ${esc(nameOf(m.by))}" loading="lazy" data-zoom="${esc(s)}">`).join("")}</div>`:""}
    <div class="body"><div class="where"><b>${esc(m.place||"Somewhere")}</b><span class="who">${esc(nameOf(m.by))}</span></div><div class="modrow"><button class="linkbtn" data-report="${esc(m.id)}|${esc(m.by)}">Report</button><button class="linkbtn" data-block="${esc(m.by)}">Block</button></div>
    ${qc?`<div class="qbadge" style="cursor:default">⚑ ${esc(qc.title)} ${ptsTag(qc.pts)}</div>`:""}${m.note?`<p>${esc(m.note)}</p>`:""}</div></article>`;
}
function crewPanel(t){
  if(!t.group) return `<div class="panel crew"><h3>Traveling with friends?</h3><p class="note" style="margin:-4px 0 12px">Share this trip and friends can add their photos here and race you on the challenges.</p><button class="btn" data-act="share" data-trip="${t.id}">${bIcon("users")}Share this trip</button></div>`;
  const g=groups[t.group]||{members:[]}, mem=g.members.length?g.members:[myId];
  return `<div class="panel crew"><h3>Trip crew <span class="note" style="font-weight:600">${mem.length} ${mem.length===1?"person":"people"}</span></h3>
    <div class="chipsrow">${mem.map(id=>`<span class="person ${id===myId?"me":""}">${esc(nameOf(id))}</span>`).join("")}</div>
    <div class="codebox"><div><span class="note">Trip code</span><b id="tcode">${esc(t.group)}</b></div><button class="btn ghost sm" data-copy="${esc(t.group)}">Copy</button></div>
    <p class="note" style="margin:10px 0 0">Friends open Waypoint, tap <b>Join a friend's trip</b> on the Trips tab, and enter this code.</p></div>`;
}
function crewRace(t,p){
  if(!t.group||!groups[t.group]) return "";
  const ids=new Set(p.items.map(c=>c.id)), tally={};
  (groups[t.group].members.length?groups[t.group].members:[myId]).forEach(id=>tally[id]=0);
  groups[t.group].moments.forEach(m=>{ if(m.quest&&ids.has(m.quest)) tally[m.by]=(tally[m.by]||0)+ (findCh(m.quest)[1]||{pts:0}).pts; });
  const rows=Object.entries(tally).sort((a,b)=>b[1]-a[1]);
  if(rows.length<2) return `<div class="panel"><h3>Crew race</h3><p class="note" style="margin:0">Once a friend joins, you'll race each other for points on these challenges.</p></div>`;
  return `<div class="panel"><h3>Crew race</h3>${rows.map(([id,pts],i)=>`<div class="lrow ${id===myId?"me":""}"><span class="lpos">${i+1}</span><b>${esc(nameOf(id))}</b><span class="lpts">${pts} pts</span></div>`).join("")}</div>`;
}
function leaderboardHTML(){
  if(!db) return "";
  const rows=board.filter(r=>typeof r.pts==="number"&&!isBlocked(r.id)).slice(0,20);
  const others=rows.filter(r=>r.id!==myId).length;
  return `<div class="sechead"><h2>Leaderboard</h2></div><div class="panel">
    ${rows.length?rows.map((r,i)=>`<div class="lrow ${r.id===myId?"me":""}"><span class="lpos">${i+1}</span><div class="lwho"><b>${esc(nameOf(r.id))}</b><span class="note">${esc(RANKS[Math.max(0,Math.min(RANKS.length-1,(r.rank||1)-1))][1])} · ${Number(r.challenges)||0} challenges · ${Number(r.parks)||0} parks</span></div><span class="lpts">${Number(r.pts)||0}</span></div>`).join(""):'<p class="note" style="margin:0">Complete a challenge to get on the board.</p>'}
    ${others?"":`<p class="note" style="margin:12px 0 0">Invite friends to Waypoint and they show up here once they score points.</p>`}</div>`;
}

/* ================= NEARBY ================= */
let here=null, locating=false;
function nearbyItems(){
  const out=[]; const seen=new Set();
  if(here){ allPacks().forEach(p=>p.items.forEach(c=>{ if(state.quests.done[c.id]) return; const g=chGeo(c)||packGeo(p); if(!g) return; const d=km(here,g); if(d<=60){ out.push({p,c,d,exact:!!chGeo(c)}); seen.add(c.id); } })); out.sort((a,b)=>a.d-b.d); return out; }
  const t=state.trips.find(isActive), p=t&&packForPlace(t.to);
  if(p) p.items.forEach(c=>{ if(!state.quests.done[c.id]) out.push({p,c,d:null,t}); });
  return out;
}
function nearbyHTML(compact){
  const items=nearbyItems(), act=state.trips.find(isActive);
  if(!items.length&&!compact) return `<div class="panel near"><h3>Near you</h3><p class="note" style="margin:0 0 12px">${here?"No open challenges within 60 km of you.":act?"No open challenges for "+esc(act.to)+". Make some from the trip's Quests tab.":"When a trip is happening, open challenges for that place show up here."}</p>${here?"":`<button class="btn ghost sm" data-act="locate">${bIcon("pin")}Use my location</button>`}</div>`;
  if(!items.length) return "";
  const top=items.slice(0,compact?3:6), where=here?"near you":"in "+esc((items[0].t||act||{}).to||"");
  return `<div class="panel near"><h3>${items.length} challenge${items.length===1?"":"s"} ${where}${compact?"":here?`<button class="linkbtn" data-act="unlocate">Clear location</button>`:`<button class="btn ghost sm" data-act="locate">${bIcon("pin")}Use my location</button>`}</h3>
    ${top.map(x=>`<div class="nrow"><div><b>${esc(x.c.title)}</b><span class="note">${x.d!=null?(x.exact?x.d<1?Math.round(x.d*1000)+" m away":x.d.toFixed(1)+" km away":"In "+esc(x.p.name)):esc(x.p.name)} · ${ptsTag(x.c.pts)}</span></div><button class="btn ember sm" data-snap="${x.c.id}"${x.t?` data-trip="${x.t.id}"`:""}>${ICON.cam}Snap</button></div>`).join("")}
    ${items.length>top.length?`<button class="linkbtn" data-qpack="${items[0].p.id}" ${compact?'data-goq="1"':""}>See all ${items.length}</button>`:""}</div>`;
}
function locate(btn){
  if(locating) return;
  if(!navigator.geolocation){ toast("Location isn't available on this device."); return; }
  locating=true; btn&&(btn.disabled=true);
  let done=false; const fail=()=>{ if(done) return; done=true; locating=false; btn&&(btn.disabled=false); toast("Location is off for Waypoint. Turn it on in your phone's Settings to see challenges near you."); };
  setTimeout(fail,8000);
  try{ navigator.geolocation.getCurrentPosition(p=>{ if(done) return; done=true; locating=false; here=[p.coords.latitude,p.coords.longitude]; rerender(); toast("Showing challenges near you"); },fail,{timeout:7000,maximumAge:300000}); }catch(e){ fail(); }
}

/* ================= EVENTS for the new features ================= */
document.addEventListener("click",ev=>{
  const el=ev.target.closest("[data-mapv],[data-copy],[data-act]"); if(!el) return;
  const ds=el.dataset;
  if(ds.mapv){ view.mapv=ds.mapv; const y=scrollY; render(); scrollTo(0,y); return; }
  if(ds.copy){ const done=()=>toast("Code copied"); try{ navigator.clipboard.writeText(ds.copy).then(done,()=>{ selectCode(); }); }catch(e){ selectCode(); } return; }
  const a=ds.act, t=trip();
  if(a==="recap"&&t) openRecap(t);
  else if(a==="saverecap") saveRecap(ds.name);
  else if(a==="share"&&t) shareTrip(t,el);
  else if(a==="join") openJoin();
  else if(a==="locate") locate(el);
  else if(a==="unlocate"){ here=null; rerender(); }
});
function selectCode(){ const b=$("#tcode"); if(!b) return; const r=document.createRange(); r.selectNodeContents(b); const s=getSelection(); s.removeAllRanges(); s.addRange(r); toast("Code selected. Copy it from the menu."); }


/* ================= IMPORT A PAST TRIP FROM PHOTOS ================= */
// Reads each photo's date and GPS from its EXIF data, builds a trip from the date range,
// groups photos taken close together into moments, and spots challenges you already did.
async function readExif(file){
  const out={date:null,geo:null};
  try{
    const buf=await file.slice(0,262144).arrayBuffer(), v=new DataView(buf);
    if(v.getUint16(0)!==0xFFD8) return out;
    let off=2;
    while(off<v.byteLength-4){
      const marker=v.getUint16(off), size=v.getUint16(off+2);
      if(marker===0xFFE1&&v.getUint32(off+4)===0x45786966){ // "Exif"
        const t=off+10, le=v.getUint16(t)===0x4949;
        const u16=o=>v.getUint16(t+o,le), u32=o=>v.getUint32(t+o,le);
        const ifd=(o,cb)=>{ const n=u16(o); for(let i=0;i<n;i++){ const e=o+2+i*12; cb(u16(e),u16(e+2),u32(e+4),t+e+8); } };
        const ascii=(o,len)=>{ let s=""; for(let i=0;i<len-1;i++) s+=String.fromCharCode(v.getUint8(t+o+i)); return s; };
        const rat=o=>u32(o)/(u32(o+4)||1);
        let exifPtr=0,gpsPtr=0,dt0="";
        ifd(u32(4),(tag,type,cnt,e)=>{ const val=v.getUint32(e,le); if(tag===0x8769) exifPtr=val; if(tag===0x8825) gpsPtr=val; if(tag===0x0132) dt0=ascii(val,cnt); });
        let dt="";
        if(exifPtr) ifd(exifPtr,(tag,type,cnt,e)=>{ if(tag===0x9003) dt=ascii(v.getUint32(e,le),cnt); });
        dt=dt||dt0;
        const m=/^(\d{4}):(\d\d):(\d\d) (\d\d):(\d\d):(\d\d)/.exec(dt);
        if(m) out.date=new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);
        if(gpsPtr){ let la,lo,laR="N",loR="E";
          ifd(gpsPtr,(tag,type,cnt,e)=>{ const p=v.getUint32(e,le);
            if(tag===1) laR=String.fromCharCode(v.getUint8(e)); if(tag===3) loR=String.fromCharCode(v.getUint8(e));
            if(tag===2) la=rat(p)+rat(p+8)/60+rat(p+16)/3600; if(tag===4) lo=rat(p)+rat(p+8)/60+rat(p+16)/3600; });
          if(la!=null&&lo!=null&&(la||lo)) out.geo=[laR==="S"?-la:la,loR==="W"?-lo:lo]; }
        return out;
      }
      if((marker&0xFF00)!==0xFF00||marker===0xFFDA) break;
      off+=2+size;
    }
  }catch(e){}
  return out;
}
let importData=null;
function nearestPlace(g){
  if(!g) return null;
  let best=null;
  allPacks().forEach(p=>{ const pg=packGeo(p); if(pg){ const d=km(g,pg); if(d<80&&(!best||d<best.d)) best={d,name:p.name.split(" & ")[0],pack:p}; } });
  Object.entries(NP_GEO).forEach(([n,pg])=>{ const d=km(g,pg); if(d<60&&(!best||d<best.d)) best={d,name:n+" National Park",np:n}; });
  return best;
}
function openImport(){
  importData=null;
  $("#modal").innerHTML=`<div class="scrim" data-close><div class="sheet" role="dialog" aria-modal="true" aria-label="Import a past trip"><h2>Import a past trip</h2>
    <p class="note" style="margin-top:-8px">Pick the photos from one trip. Waypoint reads when and where each was taken, builds the trip, and sorts them into days.</p>
    <label class="pick" for="imp-files">${ICON.cam}<span>Choose photos</span></label><input id="imp-files" type="file" accept="image/jpeg,image/*" multiple class="hidden">
    <div id="imp-body"></div>
    <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn ember" id="imp-go" disabled>Import trip</button></div></div></div>`;
  $("#imp-files").addEventListener("change",async e=>{
    const files=[...e.target.files].slice(0,80); if(!files.length) return;
    $("#imp-body").innerHTML=`<p class="note center" style="padding:14px 0"><span class="spin"></span> Reading ${files.length} photos…</p>`;
    const items=[]; for(const f of files){ const x=await readExif(f); items.push({f,date:x.date||new Date(f.lastModified||Date.now()),geo:x.geo,exact:!!x.date}); }
    items.sort((a,b)=>a.date-b.date);
    const geos=items.filter(i=>i.geo), mid=geos.length?geos[Math.floor(geos.length/2)].geo:null, place=nearestPlace(mid);
    const found=[]; // challenges visited, from GPS within 400 m
    allPacks().forEach(p=>p.items.forEach(c=>{ if(state.quests.done[c.id]) return; const g=chGeo(c); if(!g) return; const hit=items.find(i=>i.geo&&km(i.geo,g)<0.4); if(hit&&!found.some(x=>x.c.id===c.id)) found.push({c,p,item:hit}); }));
    importData={items,mid,found};
    const s=iso(items[0].date), en=iso(items[items.length-1].date), undated=items.filter(i=>!i.exact).length;
    $("#imp-body").innerHTML=`<div class="impsum"><b>${items.length} photo${items.length===1?"":"s"}</b><span>${fmtD(s,{month:"short",day:"numeric",year:"numeric"})}${en!==s?" – "+fmtD(en,{month:"short",day:"numeric",year:"numeric"}):""}${geos.length?` · ${geos.length} with location`:""}</span>${undated?`<span class="note">${undated} had no date inside, so their file date was used.</span>`:""}</div>
      <div class="field"><label for="imp-to">Where did you go?</label><input id="imp-to" value="${esc(place?place.name:"")}" placeholder="City, park or place" required></div>
      <div class="field"><label for="imp-name">Trip name</label><input id="imp-name" placeholder="${esc(place?place.name+" trip":"Weekend away")}"></div>
      <div class="grid2"><div class="field"><label for="imp-s">Start</label><input id="imp-s" type="date" value="${s}"></div><div class="field"><label for="imp-e">End</label><input id="imp-e" type="date" value="${en}"></div></div>
      ${found.length?`<div class="field"><label>Challenges spotted in your photos</label>${found.map((x,i)=>`<label class="check"><input type="checkbox" data-impq="${i}" checked><span class="txt">${esc(x.c.title)} ${ptsTag(x.c.pts)}</span></label>`).join("")}</div>`:""}
      ${!geos.length?`<p class="note">These photos have no location inside. Many phones remove it when sharing. Type the place above.</p>`:""}`;
    $("#imp-go").disabled=false;
  });
  $("#imp-go").addEventListener("click",runImport);
}
async function runImport(){
  if(!importData) return;
  const to=$("#imp-to").value.trim(); if(!to){ toast("Add where you went."); $("#imp-to").focus(); return; }
  const s=$("#imp-s").value, e=$("#imp-e").value||s; if(e<s){ toast("The end date is before the start date."); return; }
  const btn=$("#imp-go"); btn.disabled=true;
  const {items,mid,found}=importData, keepQ=found.filter((x,i)=>{ const cb=document.querySelector(`[data-impq="${i}"]`); return !cb||cb.checked; });
  const t={id:uid(),name:$("#imp-name").value.trim()||to+" trip",from:"",to,start:s,end:e,people:1,budget:0,cur:"USD",days:{},ideas:[],pack:[],exp:[],notes:"",imported:true};
  if(mid) t.geo=mid;
  state.trips.push(t);
  // group photos taken within 90 minutes (and 3 km) of each other into one moment, max 6 photos each
  const groupsOf=[]; items.forEach(it=>{ const g=groupsOf[groupsOf.length-1]; const last=g&&g[g.length-1];
    if(g&&g.length<6&&it.date-last.date<90*60000&&(!it.geo||!last.geo||km(it.geo,last.geo)<3)) g.push(it); else groupsOf.push([it]); });
  const assets=await assetsP; let done=0, failed=0;
  for(const g of groupsOf){
    btn.innerHTML=`<span class="spin"></span>Importing ${done+1} of ${groupsOf.length}…`;
    const where=nearestPlace(g.find(i=>i.geo)&&g.find(i=>i.geo).geo);
    const q=keepQ.find(x=>g.includes(x.item));
    const m={id:uid(),at:g[0].date.toISOString(),place:q?placeFrom(q.c.title):(where?where.name:to),note:"",trip:t.id,photos:[],thumbs:[]};
    for(const it of g){ try{ if(assets){ const b=await shrink(it.f,1600,.82); const r=await assets.upload(b,{type:"image/jpeg"}); m.photos.push(r.id); } else { const b=await shrink(it.f,520,.7); m.thumbs.push(await toDataURL(b)); } }catch(err){ failed++; } }
    if(!m.thumbs.length) delete m.thumbs;
    if(q&&photoCount(m)){ m.quest=q.c.id; state.quests.done[q.c.id]={at:iso(g[0].date),moment:m.id}; }
    moments.push(m); await putMoment(m); done++;
  }
  save(); closeModal(); setView({tab:"home",trip:t.id,ttab:"log",pack:null});
  toast(`Imported ${items.length-failed} photos into ${groupsOf.length} moments${keepQ.length?` · ${keepQ.length} challenge${keepQ.length===1?"":"s"} done`:""}`);
}

document.addEventListener("click",ev=>{ const el=ev.target.closest('[data-act="import"]'); if(el) openImport(); });

/* ================= EVENTS ================= */
document.addEventListener("click",ev=>{
  const el=ev.target.closest("[data-tab],[data-open],[data-ttab],[data-home],[data-qpack],[data-act],[data-snap],[data-undo],[data-gen],[data-delch],[data-delpack],[data-blist],[data-scroll],[data-zoom],[data-del-item],[data-del-packitem],[data-del-exp],[data-del-idea],[data-del-bucket],[data-del-moment],[data-plan-bucket],[data-addday],[data-close]");
  if(!el) return;
  const ds=el.dataset, t=trip();
  if(el.hasAttribute("data-close")){ if(ev.target===el||el.tagName==="BUTTON") closeModal(); return; }
  if(ds.tab){ const p={tab:ds.tab,trip:null,pack:null}; if(ds.blist) p.blist=ds.blist; setView(p); return; }
  if(ds.open){ setView({tab:"home",trip:ds.open,pack:null,ttab:ds.ttab||"plan"}); return; }
  if(ds.ttab){ setView({ttab:ds.ttab},true); return; }
  if(el.hasAttribute("data-home")){ setView({trip:null,pack:null}); return; }
  if(ds.qpack!==undefined){ setView({pack:ds.qpack||null,qtrip:ds.qpack?(ds.qtrip||null):null}); return; }
  if(ds.blist){ setView({blist:ds.blist},true); return; }
  if(ds.addday){ view.addDay=ds.addday; rerender(); const i=document.querySelector(`[data-add-item="${ds.addday}"] input[name=title]`); i&&i.focus(); return; }
  if(ds.scroll){ const x=document.getElementById(ds.scroll); x&&x.scrollIntoView({behavior:"smooth"}); return; }
  if(ds.snap){ const [qp]=findCh(ds.snap); openCapture({quest:ds.snap,trip:ds.trip||view.qtrip||view.trip||tripFor(qp)}); return; }
  if(ds.undo){ ask("Mark this challenge as not done? The photo stays in your trip.","Mark not done").then(ok=>{ if(!ok) return; delete state.quests.done[ds.undo]; save(); rerender(); }); return; }
  if(ds.gen!==undefined){ genPack(ds.gen,el,ds.trip||null); return; }
  if(ds.delch){ const [qp]=findCh(ds.delch); qp.items=qp.items.filter(c=>c.id!==ds.delch); save(); rerender(); return; }
  if(ds.delpack){ ask("Delete this challenge list?").then(ok=>{ if(!ok) return; state.quests.packs=state.quests.packs.filter(p=>p.id!==ds.delpack); save(); setView({pack:null}); }); return; }
  if(ds.zoom){ $("#modal").innerHTML=`<div class="scrim viewer" data-close><img src="${esc(ds.zoom)}" alt="" data-close></div>`; return; }
  if(ds.delItem){ const [d,id]=ds.delItem.split("|"); t.days[d]=t.days[d].filter(i=>i.id!==id); save(); rerender(); return; }
  if(ds.delPackitem){ ev.preventDefault(); t.pack=t.pack.filter(p=>p.id!==ds.delPackitem); save(); rerender(); return; }
  if(ds.delExp){ t.exp=t.exp.filter(x=>x.id!==ds.delExp); save(); rerender(); return; }
  if(ds.delIdea){ t.ideas=t.ideas.filter(x=>x.id!==ds.delIdea); save(); rerender(); return; }
  if(ds.delBucket){ ev.preventDefault(); state.bucket=state.bucket.filter(b=>b.id!==ds.delBucket); save(); rerender(); return; }
  if(ds.delMoment){ ask("Delete this moment and its photos?").then(ok=>{ if(!ok) return; const m=moments.find(x=>x.id===ds.delMoment); moments=moments.filter(x=>x!==m); if(m.quest&&state.quests.done[m.quest]&&state.quests.done[m.quest].moment===m.id){ delete state.quests.done[m.quest]; save(); } dropGroupMoment(m); dropMoment(m); rerender(); }); return; }
  if(ds.planBucket){ ev.preventDefault(); const b=state.bucket.find(x=>x.id===ds.planBucket); openForm(null,{to:b.text}); return; }
  const a=ds.act;
  if(a==="new") openForm(); else if(a==="edit") openForm(t); else if(a==="demo") demo();
  else if(a==="capture") openCapture({trip:ds.trip});
  else if(a==="aiplan") aiPlan(el); else if(a==="aipack") aiPack(el);
  else if(a==="deltrip"){ ask("Delete this trip? This can't be undone.","Delete trip").then(ok=>{ if(!ok) return; state.trips=state.trips.filter(x=>x.id!==t.id); closeModal(); save(); setView({trip:null}); toast("Trip deleted"); }); }
});
document.addEventListener("change",ev=>{
  const d=ev.target.dataset;
  if(d.packitem){ const p=trip().pack.find(x=>x.id===d.packitem); p.done=ev.target.checked; save(); rerender(); }
  else if(d.preset){ const c=state.checks[d.preset]; if(ev.target.checked){ c[d.key]=today(); toast("Checked off: "+d.key); } else delete c[d.key]; save(); rerender(); }
  else if(d.bucket){ const b=state.bucket.find(x=>x.id===d.bucket); b.done=ev.target.checked; b.doneAt=b.done?today():""; save(); rerender(); if(b.done) toast("Checked off. Nice."); }
  else if(d.slot&&ev.target.value){ const t=trip(), i=t.ideas.find(x=>x.id===d.slot); (t.days[ev.target.value] ||= []).push({id:uid(),time:"",title:i.text,note:""}); t.ideas=t.ideas.filter(x=>x!==i); save(); rerender(); toast("Moved to the day"); }
});
document.addEventListener("input",ev=>{
  const el=ev.target;
  if(el.hasAttribute("data-qsearch")){ view.qsearch=el.value; const l=filteredPacks(); $("#packlist").innerHTML=l.map(p=>packTile(p)).join("")||`<p class="muted">No pack for that yet. Make one below.</p>`; return; }
  if(el.hasAttribute("data-filter")){ const q=el.value.trim().toLowerCase(); document.querySelectorAll("#nplist .check").forEach(r=>r.classList.toggle("hidden",!!q&&!(q.length===2?(r.dataset.st.split("/").includes(q)||r.dataset.name.startsWith(q)):(r.dataset.name.includes(q)||r.dataset.st.includes(q))))); return; }
  if(el.hasAttribute("data-notes")){ trip().notes=el.value; save(); }
});
document.addEventListener("submit",ev=>{
  const f=ev.target; if(f.id==="tf"||f.id==="mf") return; ev.preventDefault();
  const v=Object.fromEntries(new FormData(f)), t=trip(), ds=f.dataset;
  if(ds.genform!==undefined){ genPack(v.place.trim(),f.querySelector("button"),null); return; }
  if(ds.addch){ const p=state.quests.packs.find(x=>x.id===ds.addch); if(p){ p.items.push({id:p.id+"-"+uid(),title:v.title,hint:"",pts:+v.pts}); save(); rerender(); const i=document.querySelector(`[data-addch="${ds.addch}"] input`); i&&i.focus(); } return; }
  if(ds.addItem!==undefined) (t.days[ds.addItem] ||= []).push({id:uid(),time:v.time,title:v.title,note:""});
  else if(ds.addPackitem!==undefined) t.pack.push({id:uid(),text:v.text,cat:"Other",done:false});
  else if(ds.addExp!==undefined) t.exp.push({id:uid(),title:v.title,amt:+v.amt,cat:v.cat});
  else if(ds.addIdea!==undefined) t.ideas.push({id:uid(),text:v.text});
  else if(ds.addBucket!==undefined) state.bucket.push({id:uid(),text:v.text,kind:v.kind,done:false,doneAt:""});
  else if(ds.addBeen!==undefined) state.been.push({id:uid(),place:v.place,date:v.date||today()});
  save(); rerender();
  const key=Object.keys(ds)[0], sel=key&&"[data-"+key.replace(/[A-Z]/g,c=>"-"+c.toLowerCase())+(ds[key]?`="${ds[key]}"`:"")+"] input:not([type=time]):not([type=date])";
  const again=sel&&document.querySelector(sel); again&&again.focus();
});
document.addEventListener("keydown",ev=>{ if(ev.key==="Escape") closeModal(); });

window.addEventListener("wp:refresh",()=>rerender());
render();
})();
