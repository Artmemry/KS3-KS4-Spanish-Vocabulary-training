/* Le Lexique / El Léxico — engine v3
   Shared logic; language-specific parts live only in CFG and T blocks.
   v3 additions: direction-split SRS, dictation (TTS), leech deck, exam mode,
   weekly assignment, per-lesson export (code v2), print support.
*/
(function(){
"use strict";

/*CFG-START*/
const CFG={
  key:"es",                       // corpus field with target-language variants
  ls:"lexico-ks-v1",              // its own storage: KS3–KS4 progress never mixes with A-Level
  prefix:"LEXKSES2.",             // export code prefix — the dashboard sorts by this
  ttsLang:"es-ES",
  artRe:/^(el |la |los |las |un |una |unos |unas |lo )/,
  accents:["á","é","í","ó","ú","ñ","ü","¡","¿"],
  stop:"el la los las un una unos unas de del al a en y e o u que se lo le les me te nos os su sus mi mis tu tus es son ser estar esta estan como por para con sin mas muy ya he ha han hay tan todo toda todos todas sobre hasta desde entre cuando donde aqui alli este esta esto ese esa eso",
  FORMS_URL:"https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=dBTLADSljUaCn2NuzjLCTEWSzXdNOvRDicS2YScslGFUMzhIUlZJRThXRUQ3RTVQMlFUUFk2UTJWNyQlQCNjPTEu",
  /* One click instead of a paste.
     In MS Forms: ... > Get a link to fill in as the teacher, then Get pre-filled
     answer. Type anything into the name box and the code box, press Get link, and
     the URL you are handed carries one "&rXXXXXXXX=" pair per question. Paste the
     token of the NAME question below, and the token of the CODE question into
     FORMS_FIELD_CODE. While either is empty the student is asked to paste instead,
     which still works but costs them a step. */
  FORMS_FIELD_NAME:"r08cab71007074f60a012ed77717b62d2",   // empty = code is copied and pasted by hand
  /* Optional. Paste the URL of a Power Automate "When an HTTP request is received"
     flow here and a signalled answer is posted to it silently. Empty = nothing is sent. */
  ALERT_URL:"",
  /* Optional. The field id of one extra question on the Forms form, which then
     carries the report in words instead of inside the code. */
  FORMS_FIELD_FLAG:"r93f547c6c0984f949ff3e2c266090969",
  FORMS_FIELD_CODE:"rbd3a09625c5c42399a03efd42ac1d5fa"
};
/*CFG-END*/

/*T-START*/
/* Two languages, one rule.
   SPANISH for the words a student meets every lesson and should own: the tabs,
   the buttons, the labels — enviar, atrás, salir, empezar la lección,
   comprobar, siguiente, vistas, dominadas, precisión. Reading those IS part of
   the course.
   ENGLISH for the sentences: what a screen is asking of you, what the marking
   is telling you, and what your teacher has or has not received. Nobody should
   have to decode an explanation before they can act on it. */
const T={
  /* ── report to the teacher: the sentences are English, the buttons are not ── */
  barNever:"Your teacher has not received anything from you yet.",
  barWaiting:(n,ago)=>"Sent "+ago+" · "+n+" activit"+(n>1?"ies":"y")+" not sent since then.",
  barClear:ago=>"Sent to your teacher "+ago+" · nothing waiting.",
  barUnsent:n=>n+" activit"+(n>1?"ies":"y")+" still to send.",
  barSend:"Enviar ahora",
  barSending:"Abriendo el formulario…",
  agoNow:"a moment ago",
  agoMin:n=>n+" minute"+(n>1?"s":"")+" ago",
  agoHour:n=>n+" hour"+(n>1?"s":"")+" ago",
  agoDay:n=>n+" day"+(n>1?"s":"")+" ago",
  sendPanelTitle:"Enviar a tu profesor",
  sendPanelWhat:(seen,mast,acc)=>"Your teacher will see: "+seen+" words seen, "+mast+" mastered, "+acc+" % accuracy.",
  sendPanelHow:"The form opens with your name and your code already filled in — you just press Submit.",
  sendPanelHowPaste:"Your code is copied for you and the form opens: paste it into the “Code” box and press Submit.",
  sendPanelGo:"Enviar a mi profesor",
  sendPanelDone:"Enviado ✓",
  sendPanelThanks:"Sent. Your teacher will see it in their list.",
  sendPanelLater:"You can also send it later from Progreso.",
  sendNameHint:"Put your name in so your teacher knows whose code this is.",
  flagTitle:"You flagged some answers", flagLede:"Your teacher will see them in your progress code.",
  flagSend:"Avisar a mi profesor", flagSent:"Enviado ✓", flagAuto:"Your teacher has already been told.",
  padLabel:"Tildes y signos",
  audioLabel:"Audio", audioTitle:"Say the Spanish word automatically",
  audioTest:"audio activado",
  voiceLabel:"Voz", voiceHint:"★ = the best voice this device offers. Try the others if it does not convince you.",
  homeTitle:"Tus listas de vocabulario",
  loading:"Cargando la lista…",
  yearLabel:"Tu curso", yearAll:"Todos",
  homeLede:"These are the word lists from your Spanish lessons. Pick your year, then a unit, then a lesson. You can just read a list, or practise it by typing the answers. Your progress is saved on this device, and when you finish you can send it to your teacher in one click.",
  nameLabel:"Tu nombre",
  namePh:"Nombre + inicial, p. ej. Lucía G.",
  dueCard:n=>n+" palabra"+(n>1?"s":"")+" por repasar hoy",
  startReview:"Empezar el repaso →",
  unitsLabel:"Unidades",
  unitMeta:(l,w,s,m)=>`${l} lecciones · ${w} palabras · ${s} vistas · ${m} dominadas`,
  yearEmpty:"No lists for that year yet.",
  lessonLine:(n,t,c)=>`Lección ${n} — ${t} (${c} palabras)`,
  lessonMeta:(s,m)=>`${s} vistas · ${m} dominadas`,
  accSuffix:" % de precisión",
  list:"Lista", practise:"Practicar",
  backUnits:"← Volver a las unidades", practiseThis:"Practicar esta lista",
  print:"Imprimir",
  colTarget:"Español", colEn:"English", colStatus:"Estado",
  stMast:"dominada", stCur:"en curso", stNew:"sin ver",
  listLegend:"○ not seen · ◐ in progress · ● mastered (interval ≥ 3 weeks). Forms separated by “ ; ” are interchangeable: any of them counts as correct.",
  back:"← Atrás",
  dirLabel:"Dirección",
  dirEnFr:"Inglés → Español", dirFrEn:"Español → Inglés", dirMix:"Mixto", dirDict:"Dictado 🔊",
  dictNoTts:"Your browser has no voice — dictation is not available",
  startLesson:"Empezar la lección",
  reviewTitle:"Repaso del día",
  reviewLede:n=>`${n} card${n>1?"s":""} ${n>1?"have":"has"} come due (all units, production first). Spaced repetition chooses for you.`,
  reviewEmpty:"Nothing due just now — practise a lesson from Inicio, and the words will come back here at the right moment.",
  nWords:"Número de palabras", all:"Todo", start:"Empezar",
  quit:"← Salir",
  metaEnFrArt:"inglés → español (con el artículo)", metaEnFr:"inglés → español",
  metaFrEn:"español → inglés", metaDict:"dictado — escucha y escribe",
  replay:"🔊 Escuchar otra vez",
  alsoPrompt:"también: ",
  phTarget:"tu respuesta en español…", phEn:"your answer in English…",
  check:"Comprobar", next:"Siguiente →",
  genderTier:v=>"Correct — the other form works too. The list gives: “"+v+"”.",
  artSwap:v=>"Exactly right — the list gives: “"+v+"”.",
  exact:"Exactly right.", accentTier:"Right — but watch the accents.",
  artTier:"The word is right — check the article.",
  artWrong:"The article is wrong — gender counts as grammar.",
  typoTier:"Nearly — check the spelling.", wrong:"No.",
  senseTier:"Right meaning — compare your version with the one in the list.",
  selfOk:"Mi versión también vale", selfDone:"Aceptada ✓",
  phraseNear:"Right meaning — but the exact wording is the one below.",
  enTypo:"Right — small spelling slip.",
  altNote:v=>["Your answer “",v,"”"+" is also in your lists with this meaning — both count."],
  sibNote:"Also in your lists with this meaning: ",
  sessDone:"Sesión terminada", qs:"preguntas", right:"acertadas", prec:"precisión",
  toReview:"Para repasar", cont:"Continuar", seeProgress:"Ver mi progreso",
  leechTitle:"Palabras rebeldes", leechCard:n=>`${n} word${n>1?"s":""} missed again and again`,
  leechGo:"Domarlas →", leechLabel:"Rebeldes",
  examTab:"Examen", examTitle:"Modo examen",
  examLede:"Random questions from the units you choose, both directions, no corrections until the end — like a real exam. The result is kept in your code.",
  examUnits:"Unidades del examen", examStart:"Empezar el examen",
  examNeedUnits:"Choose at least one unit.",
  examDone:"Examen terminado", examScore:"nota", examWrong:"Respuestas incorrectas",
  examGiven:"tu respuesta", examNone:"(en blanco)", examAgain:"Otro examen",
  taskTitle:"Tarea de la semana", taskDone:"hecha ✓", taskPending:"pendiente",
  taskFor:d=>"For "+d, taskWasDue:d=>"Was due "+d, taskCount:(n,m)=>n+" of "+m+" done",
  taskAllDone:"Task of the week done ✓",
  clsOffer:(from,to)=>"This task was set for "+to+". You are down as "+from+".",
  clsOfferGo:to=>"Cambiar a "+to, clsOfferNo:"No, gracias", clsLabel:"Clase", clsHint:"Optional. Your teacher's task link sets it for you; change it here if it is wrong.", clsAsk:"Which class are you in?", taskGo:"Ver la tarea", taskStrip:l=>"This week: "+l,
  progressTitle:"Progreso",
  progressLede:"Your progress unit by unit, the lessons that need work, and your code to send to your teacher.",
  kSeen:"palabras vistas / ", kMast:"dominadas (≥ 3 sem.)", kDue:"repasos pendientes",
  kProd:"precisión, producción", kRec:"precisión, reconocimiento",
  byUnit:"Por unidad",
  thUnit:"Unidad", thSeen:"Vistas", thMast:"Dominadas", thAcc:"Precisión",
  weakLessons:"Lecciones por reforzar",
  weakEmpty:"Not enough yet — practise a few lessons.",
  weakLine:(u,n)=>`${u} · Lección ${n}`,
  examsHist:"Tus exámenes",
  sendTitle:"Enviar al profesor",
  sendFormsTxt:"Press “Enviar por MS Forms”: the form opens with your name and your code already filled in — you just press Submit. The code holds your statistics and the name you typed on Inicio, nothing else.",
  sendCopyTxt:"Copy this code and send it to your teacher (email, Teams…). It holds your statistics and the name you typed on Inicio, nothing else.",
  sendForms:"Enviar por MS Forms", copyCode:"Copiar el código",
  sendPasteTxt:"Press “Enviar por MS Forms”: your code is copied for you and the form opens. Paste the code into the “Code” box, type your name and press Submit.",
  formsPasteHint:"Code copied. Paste it into the “Code” box on the form.",
  backup:"Copia de seguridad (.json)", restore:"Restaurar copia", reset:"Reiniciar",
  resetConfirm:"Erase all your progress on this device? This cannot be undone.",
  restored:"Backup restored.", badFile:"File not recognised — choose a backup exported from this site.",
  noName:"(sin nombre)",
  backupFile:"lexico-progreso.json",
  sessionLabel:(u,n)=>`${u} · Lección ${n}`, reviewLabel:"Repaso", examLabel:"Examen"
};
/*T-END*/

/* ───────── state & migration ───────── */
const DAY=86400000;
let S=load();
function load(){
  let s=null;
  try{ const r=localStorage.getItem(CFG.ls); if(r) s=JSON.parse(r); }catch(e){}
  if(!s) s={name:"",srs:{},sessions:[],exams:[],created:Date.now(),v:3};
  s.srs=s.srs||{}; s.sessions=s.sessions||[]; s.exams=s.exams||[]; if(s.audio===undefined)s.audio=true;
  if(!s.v||s.v<3){ // split legacy per-entry records into production/recognition
    const old=s.srs; s.srs={};
    Object.keys(old).forEach(id=>{
      if(id.indexOf("|")>=0){ s.srs[id]=old[id]; return; }
      s.srs[id+"|f"]=JSON.parse(JSON.stringify(old[id]));
      s.srs[id+"|r"]=JSON.parse(JSON.stringify(old[id]));
    });
    s.v=3;
  }
  return s;
}
function save(){
  _agg=null; try{ localStorage.setItem(CFG.ls, JSON.stringify(S)); }catch(e){} }

/* ═══════════════════════════════════════════════════════════════════
   THE LISTS
   Every list is its own file in data/lists/, so a teacher can edit one
   without touching anything else. data/index.js is the contents page and
   is all the home page and the progress tab need; a list itself is
   fetched only when a student opens it.

   A word's id is its lesson plus a short hash of the Spanish, never a row
   number, so a list can be added to, cut and reordered without moving
   anyone's progress onto a different word.
   ═══════════════════════════════════════════════════════════════════ */
const K=CFG.key;
const IDX = (typeof window!=="undefined" && window.BBA_INDEX) ? window.BBA_INDEX : {years:[],units:[]};
const YEARS = IDX.years || [];
const UNITS={}, UNIT_ORDER=[], LESSON_META={};
(IDX.units||[]).forEach(u=>{
  UNITS[u.u]={name:u.name, year:u.y, lessons:{}, lessonOrder:[], n:0};
  UNIT_ORDER.push(u.u);
  (u.lessons||[]).forEach(L=>{
    UNITS[u.u].lessons[L.l]={title:L.t, n:L.n||0, ids:[], loaded:false};
    UNITS[u.u].lessonOrder.push(L.l);
    UNITS[u.u].n += (L.n||0);
    LESSON_META[L.l]={unit:u.u, unitName:u.name, title:L.t, ref:L};
  });
});
const CORPUS_TOTAL = UNIT_ORDER.reduce((t,uid)=>t+UNITS[uid].n, 0);
const lessonOf = id => { const i=id.indexOf(":"); return i<0 ? "" : id.slice(0,i); };
const unitOfLesson = lid => (LESSON_META[lid]||{}).unit || "";

/* the same short hash the build script uses, so an id is the word's own */
function wordId(word, width){
  let h = 0x811c9dc5;
  const w = String(word).trim().toLowerCase().normalize("NFD");
  for (let i=0;i<w.length;i++){ h ^= (w.charCodeAt(i) & 0xFF); h = Math.imul(h, 0x01000193) >>> 0; }
  return ("00000000" + h.toString(16)).slice(-8).slice(0, width||4);
}

const byId={}, LISTS={}, LOADED={}, REQUESTED={}, PENDING={}, MISSING=[];
window.BBA = {
  /* called by each file in data/lists/ */
  list(lessonId, pairs){
    const meta = LESSON_META[lessonId] || {};
    const out=[], used={};
    (pairs||[]).forEach(pr=>{
      const es = String(pr[0]||"").split(";").map(x=>x.trim()).filter(Boolean);
      const en = String(pr[1]||"").split(";").map(x=>x.trim()).filter(Boolean);
      if(!es.length || !en.length) return;
      let key = wordId(es[0]);
      if(used[key]) key = wordId(es[0], 6);
      used[key]=1;
      const e={id:lessonId+":"+key, unit:meta.unit, unitName:meta.unitName,
               lesson:lessonId, lessonTitle:meta.title, es:es, en:en};
      e[K]=es;                                     // the engine reads the target language as CFG.key
      byId[e.id]=e; out.push(e); indexEntry(e);
    });
    LISTS[lessonId]=out; LOADED[lessonId]=true;
    const L = (UNITS[meta.unit]||{lessons:{}}).lessons[lessonId];
    if(L){ L.ids=out.map(e=>e.id); L.loaded=true;
           /* the count in index.js is a hint; the list itself is the truth */
           if(L.n!==out.length){ L.n=out.length; if(meta.ref) meta.ref.n=out.length;
             UNITS[meta.unit].n = UNITS[meta.unit].lessonOrder.reduce((t,l)=>t+UNITS[meta.unit].lessons[l].n,0); } }
    (PENDING[lessonId]||[]).forEach(fn=>fn()); delete PENDING[lessonId];
  }
};
/* Fetch by <script> rather than fetch(), so the site still works when it is
   opened from a folder rather than served. A list that will not load is
   reported once and treated as empty, so one bad file cannot stop a lesson. */
function loadLists(ids){
  const todo=[...new Set(ids)].filter(l=>l && !LOADED[l]);
  if(!todo.length) return Promise.resolve();
  return Promise.all(todo.map(l=>new Promise(res=>{
    (PENDING[l]=PENDING[l]||[]).push(res);
    if(REQUESTED[l]) return;
    REQUESTED[l]=1;
    const sc=document.createElement("script");
    sc.src="data/lists/"+encodeURIComponent(l)+".js";
    sc.onerror=()=>{ if(!LOADED[l]){ MISSING.push(l); window.BBA.list(l, []); } };
    document.head.appendChild(sc);
  })));
}
const lessonsOfUnits = uids => uids.flatMap(u=>UNITS[u]?UNITS[u].lessonOrder:[]);
/* a spinner for the moment a list is on its way */
function busy(v, msg){
  if(v) v.innerHTML='<div class="card" style="text-align:center;color:var(--ink-soft)">'+(msg||T.loading)+'</div>';
}

/* ───────── progress, aggregated from the store ─────────
   Counts never need the words themselves: an id carries its lesson, so
   seen / mastered / due / accuracy are all read straight from S.srs. */
let _agg=null;
function agg(){
  if(_agg) return _agg;
  const m={}, now=Date.now();
  for(const k in S.srs){
    const i=k.lastIndexOf("|"); if(i<0) continue;
    const id=k.slice(0,i), d=k.slice(i+1), r=S.srs[k], l=lessonOf(id);
    if(!l) continue;
    const o=m[l]||(m[l]={seen:{}, mast:{}, due:0, ok:0, tries:0, nSeen:0, nMast:0});
    if(r.seen>0){
      if(!o.seen[id]){ o.seen[id]=1; o.nSeen++; }
      o.tries+=r.seen; o.ok+=r.ok;
      if(r.due<=now) o.due++;
    }
    if(d==="f" && r.int>=21 && !o.mast[id]){ o.mast[id]=1; o.nMast++; }
  }
  return _agg=m;
}
const aggL = lid => agg()[lid] || {seen:{},mast:{},due:0,ok:0,tries:0,nSeen:0,nMast:0};
function aggU(uid){
  const u=UNITS[uid]; const t={nSeen:0,nMast:0,due:0,ok:0,tries:0};
  if(!u) return t;
  u.lessonOrder.forEach(l=>{const a=aggL(l); t.nSeen+=a.nSeen; t.nMast+=a.nMast; t.due+=a.due; t.ok+=a.ok; t.tries+=a.tries;});
  return t;
}
function aggAll(){
  const t={nSeen:0,nMast:0,due:0,ok:0,tries:0,fOk:0,fTries:0,rOk:0,rTries:0};
  const a=agg();
  for(const l in a){ if(!LESSON_META[l]) continue; t.nSeen+=a[l].nSeen; t.nMast+=a[l].nMast; t.due+=a[l].due; t.ok+=a[l].ok; t.tries+=a[l].tries; }
  for(const k in S.srs){
    const i=k.lastIndexOf("|"), id=k.slice(0,i), d=k.slice(i+1), r=S.srs[k];
    if(!r || !LESSON_META[lessonOf(id)]) continue;
    if(d==="f"){ t.fOk+=r.ok; t.fTries+=r.seen; } else { t.rOk+=r.ok; t.rTries+=r.seen; }
  }
  return t;
}

/* ───────── SM-2, direction-split ─────────
   rec key = `${id}|f` production (EN → target)  ·  `${id}|r` recognition (target → EN) */
function rk(id,dir){ return id+"|"+(dir==="fren"?"r":"f"); }  // dict & enfr grade production
function srsGet(k){ return S.srs[k]||(S.srs[k]={ef:2.5,int:0,reps:0,due:0,seen:0,ok:0,lapses:0}); }
function srsGrade(id,dir,q){
  const r=srsGet(rk(id,dir));
  r.seen++; if(q>=3)r.ok++;
  if(q<3){ r.reps=0; r.int=0; r.lapses++; r.due=Date.now(); }
  else{ r.reps++;
    if(r.reps===1)r.int=1; else if(r.reps===2)r.int=6; else r.int=Math.round(r.int*r.ef);
    r.ef=Math.max(1.3, r.ef+(0.1-(5-q)*(0.08+(5-q)*0.02)));
    r.due=Date.now()+r.int*DAY;
  }
  save();
}
const recOf=(id,d)=>S.srs[id+"|"+d];
const isSeen=id=>{const f=recOf(id,"f"),r=recOf(id,"r");return (f&&f.seen>0)||(r&&r.seen>0)};
const isMastered=id=>{const f=recOf(id,"f");return f&&f.int>=21};          // production is the exam skill
function dueDirs(id){
  const out=[]; const f=recOf(id,"f"), r=recOf(id,"r");
  if(f&&f.seen>0&&f.due<=Date.now()) out.push("enfr");
  if(r&&r.seen>0&&r.due<=Date.now()) out.push("fren");
  return out;
}
const isDue=id=>dueDirs(id).length>0;
function leeches(){
  const out=[];
  Object.keys(S.srs).forEach(k=>{
    const r=S.srs[k];
    if(r.lapses>=3 && r.int<21){
      const i=k.lastIndexOf("|"), id=k.slice(0,i), d=k.slice(i+1);
      /* a leech is known from the store alone; its list loads when the deck starts */
      if(LESSON_META[lessonOf(id)]) out.push({id, dir:d==="r"?"fren":"enfr", lapses:r.lapses});
    }
  });
  return out.sort((a,b)=>b.lapses-a.lapses);
}

/* ───────── utils ───────── */
const $=s=>document.querySelector(s);
function el(tag,attrs,...kids){
  const n=document.createElement(tag);
  if(attrs)for(const k2 in attrs){
    if(k2==="class")n.className=attrs[k2];
    else if(k2==="html")n.innerHTML=attrs[k2];
    else if(k2.startsWith("on"))n.addEventListener(k2.slice(2),attrs[k2]);
    else n.setAttribute(k2,attrs[k2]);
  }
  kids.flat().forEach(c=>{ if(c==null)return; n.append(c.nodeType?c:document.createTextNode(c)); });
  return n;
}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function pct(a,b){return b?Math.round(100*a/b):0}
function stripAcc(s){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/œ/g,"oe").replace(/æ/g,"ae")}
function normFr(s){return s.toLowerCase().replace(/’/g,"'").replace(/\s*\([^)]*\)/g,"").replace(/\.{3}$/,"").replace(/[¡!¿?]/g,"").replace(/\s+/g," ").trim()}
function stripArt(s){return s.replace(CFG.artRe,"")}
function expandEn(s){
  return s
   .replace(/\bcan't\b/g,"cannot").replace(/\bwon't\b/g,"will not").replace(/\bshan't\b/g,"shall not")
   .replace(/\bi'm\b/g,"i am")
   .replace(/\b(he|she|it|that|this|there|here|what|who|where|when|how|one|nobody|somebody|everybody)'s\b/g,"$1 is")
   .replace(/\blet's\b/g,"let us")
   .replace(/\b(\w+)n't\b/g,"$1 not")
   .replace(/\b(\w+)'ll\b/g,"$1 will")
   .replace(/\b(\w+)'ve\b/g,"$1 have")
   .replace(/\b(\w+)'re\b/g,"$1 are")
   .replace(/\b(\w+)'d\b/g,"$1 would");
}
function normEn(s){return expandEn(s.toLowerCase().replace(/’/g,"'")).replace(/-/g," ").replace(/(\w)iz(e[sdr]?|ing|ation)\b/g,"$1is$2").replace(/\s*\([^)]*\)/g,"").replace(/\.{3}$/,"").replace(/[!?.]+$/,"").replace(/\s+/g," ").trim()}

/* ───────── phrase marking ─────────
   Items of 4+ words (quotations, expressions) are marked on MEANING, not wording:
   content-word overlap, function words ignored, synonyms and 1-letter slips tolerated.
   Single words and short phrases keep the strict word-level rules. */
const EN_STOP=new Set(("a an the to of in on at for with by from as and or but if so than then that this these those "
 +"is are was were be been being am do does did done have has had will would shall should can could may might must "
 +"i you he she it we they me him her us them my your his its our their there here one ones s "
 +"into onto upon out over under about through across between within during after before again still just very own "
 +"all any some each every own more most much many").split(" "));
const TG_STOP=new Set(CFG.stop.split(" "));
function lightStem(w){
  return w.replace(/ies$/,"y").replace(/([^aeiou])s$/,"$1").replace(/ing$/,"").replace(/ed$/,"")
          .replace(/([a-z])\1$/,"$1");
}
function toks(s,stop){
  return String(s).split(/[^\p{L}\p{N}']+/u).map(w=>w.toLowerCase().replace(/^'+|'+$/g,""))
    .filter(w=>w&&!stop.has(w)).map(lightStem).filter(w=>w.length>1);
}
/* multi-word equivalences collapsed to one token before scoring */
const EN_MULTI=[["blow up","explode"],["blows up","explode"],["blew up","explode"],["burst","explode"],
 ["take down","lower"],["takes down","lower"],["get down","lower"],["bring down","lower"],
 ["get away","move_away"],["go away","move_away"],["step away","move_away"],["move away","move_away"],
 ["speed up","hurry"],["speeds up","hurry"],["hurry up","hurry"],["bring forward","hurry"],
 ["get up","rise"],["got up","rise"],["gets up","rise"],["stand up","rise"],
 ["keep watch","watch"],["no longer","not_now"],["any more","not_now"],["anymore","not_now"]];
function preMulti(s){ let t=" "+s+" "; EN_MULTI.forEach(([a,b])=>{ t=t.split(" "+a+" ").join(" "+b+" ") }); return t.trim(); }
const enToks=s=>toks(preMulti(normEn(s)),EN_STOP);
/* extra English token equivalences for phrase marking (meaning, not wording) */
const EN_TOKSYN=[["explode","erupt"],["sink","drown"],["sorrow","grief"],["sorrow","mourning"],["grief","mourning"],
 ["place","station"],["place","spot"],["remedy","cure"],["remedy","solution"],["gossip","rumour"],["gossip","talk"],
 ["gossip","litany"],["dishonour","shame"],["dishonour","disgrace"],["shame","disgrace"],["weakness","frailty"],
 ["sign","mark"],["watch","guard"],["storm","tempest"],["room","chamber"],["neighbour","neighbor"],
 ["darkness","dark"],["deserve","earn"],["sure","certain"],["poison","venom"],["blessed","praised"],
 ["celestial","spiritual"],["celestial","heavenly"],["sky","heaven"],["pour","spill"],["pour","tip"],
 ["reed","rush"],["shore","bank"],["pony","mare"],["pony","horse"],["thing","matter"],["mean","meaning"],
 ["sweep","wipe"],["step","pace"],["never","not"],["woman","women"],["want","love"]];
const tgToks=s=>toks(stripAcc(normFr(s)),TG_STOP);
/* token-level synonyms are built later, once the synonym layer has loaded */
const SYN_TOK={};
function tokMatch(a,b){
  if(a===b)return true;
  if(SYN_TOK[a]&&SYN_TOK[a].has(b))return true;
  /* Same root, different derivation: prosecution / prosecutor, investigation /
     investigating. Seven shared letters is long enough that "manage" and
     "manager" are not caught by it. */
  if(a.length>=8 && b.length>=8){
    let i=0; while(i<a.length && i<b.length && a[i]===b[i]) i++;
    if(i>=7) return true;
  }
  return Math.max(a.length,b.length)>=4 && levDist(a,b,1)<=1;   // phrase scoring only
}
function overlap(ansT, expT){
  if(!expT.length) return {r:0,p:0};
  const used=new Array(ansT.length).fill(false);
  let hit=0;
  expT.forEach(e=>{
    for(let i=0;i<ansT.length;i++){ if(!used[i]&&tokMatch(e,ansT[i])){used[i]=true;hit++;return} }
  });
  return {r:hit/expT.length, p:ansT.length?hit/ansT.length:0};
}
/* short expected sets are brittle: 2 content words make one miss look like 50% failure,
   so the bar eases as the expected answer gets shorter. */
function phraseBars(expLen){
  // With very few content words, partial overlap cannot distinguish a paraphrase
  // from a different sentence ("women without a man" vs "men without work"),
  // so short items demand every content word.
  if(expLen<=2) return {full:1,   part:1};
  if(expLen===3)return {full:0.75,part:0.5};
  if(expLen===4)return {full:0.6, part:0.4};
  return {full:0.65,part:0.4};
}
function isPhrase(entry){
  return entry[K].some(v=>v.trim().split(/\s+/).length>=4)
      || entry.en.some(g=>g.trim().split(/\s+/).length>=4);
}
function bestOverlap(ans, list, tokFn){
  let best={r:0,p:0};
  list.forEach(x=>{ const s=overlap(tokFn(ans), tokFn(x)); if(s.r>best.r||(s.r===best.r&&s.p>best.p)) best=s; });
  return best;
}
function stripEnLead(s){return s.replace(/^(the |a |an |to )/,"")}
/* Two English words are the same word if stripping a regular inflection from
   each leaves a shared stem of at least three letters. This accepts
   unify/unified/unifies/unifying and refuses manage/manager, person/personal. */
const EN_SUFFIX = ["","s","es","ed","d","ing","ies","ied","ying","y","ly"];
function enRoots(w){
  const out = new Set();
  EN_SUFFIX.forEach(sfx=>{
    if(!sfx){ out.add(w); return; }
    if(w.length > sfx.length + 2 && w.slice(-sfx.length) === sfx)
      out.add(w.slice(0, w.length - sfx.length));
  });
  return out;
}
function sameEnWord(a, b){
  const A=String(a).trim().split(/\s+/), B=String(b).trim().split(/\s+/);
  if(A.length !== B.length || !A.length) return false;
  for(let i=0;i<A.length;i++){
    if(A[i]===B[i]) continue;
    const ra=enRoots(A[i]), rb=enRoots(B[i]);
    let hit=false;
    ra.forEach(x=>{ if(x.length>=3 && rb.has(x)) hit=true; });
    if(!hit) return false;
  }
  return true;
}
function levDist(a,b,max){
  if(a===b)return 0;
  if(Math.abs(a.length-b.length)>max)return max+1;
  let prev=Array(b.length+1).fill(0).map((_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i]; let rowMin=i;
    for(let j=1;j<=b.length;j++){
      cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+(a[i-1]===b[j-1]?0:1));
      if(cur[j]<rowMin)rowMin=cur[j];
    }
    if(rowMin>max)return max+1;
    prev=cur;
  }
  return prev[b.length];
}
/* A negating prefix is a meaning, not a slip: "employment" is not a misspelling of
   "unemployment", nor "heureux" of "malheureux". Two words that differ by exactly
   one of these are never treated as a typo. */
var NEG_PREFIX = ["un","in","im","il","ir","dis","non","mis","de","des","d\u00e9","d\u00e9s","mal","anti","a"];
function negFlip(a,b){
  var s = a.length < b.length ? a : b, l = a.length < b.length ? b : a;
  if(l.length <= s.length) return false;
  for(var i=0;i<NEG_PREFIX.length;i++){
    var p = NEG_PREFIX[i];
    if(l.length === s.length + p.length && l.slice(0,p.length) === p && l.slice(p.length) === s) return true;
  }
  return false;
}
function nearMiss(a,b){ // grammar-safe: suffix zone (last 2 chars of each word) must match exactly
  const ta=a.split(" "), tb=b.split(" ");
  if(ta.length!==tb.length) return false;
  const phraseTol=Math.max(a.length,b.length)>=12?2:1;
  let edits=0;
  for(let i=0;i<ta.length;i++){
    const wa=ta[i], wb=tb[i];
    if(wa===wb) continue;
    if(negFlip(wa,wb)) return false;                 // un- / in- / dé- is a meaning, not a typo
    if(Math.max(wa.length,wb.length)<5) return false;
    if(wa.slice(-2)!==wb.slice(-2)) return false;
    const d=levDist(wa.slice(0,-2), wb.slice(0,-2), 2);
    if(d>2) return false;
    edits+=d; if(edits>phraseTol) return false;
  }
  return edits>0 && edits<=phraseTol;
}

/* ───────── cross-acceptance indexes ───────── */
function xLexkey(s){
  s=s.toLowerCase().replace(/’/g,"'").replace(/\s*\([^)]*\)/g,"");
  s=s.replace(CFG.artRe,"");
  s=s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/œ/g,"oe").replace(/-/g," ");
  return s.replace(/\s+/g," ").trim();
}
function xCanonEn(s){
  s=s.toLowerCase().replace(/’/g,"'").replace(/-/g," ").replace(/\s*\([^)]*\)/g,"");
  s=s.replace(/^(the |a |an |to )/,"").replace(/\.{3}$/,"");
  return s.replace(/\s+/g," ").trim();
}
/* These four widen what counts as a correct answer and what the feedback can
   say. They used to be built once from the whole corpus; they now grow as
   lists load, which is why indexEntry() is called for every word that
   arrives. Nothing depends on them being complete — an unloaded list simply
   contributes no sibling hints yet. */
const GLOSS_TO_ENTRIES={}, LEX_TO_GLOSSES={}, ANSWER_FORMS=new Set(), FORM_SENSE={};
function indexEntry(e){
  e.en.forEach(g=>{const c=xCanonEn(g);(GLOSS_TO_ENTRIES[c]=GLOSS_TO_ENTRIES[c]||[]).push(e)});
  e[K].forEach(f=>{
    const lk=xLexkey(f);
    const set=(LEX_TO_GLOSSES[lk]=LEX_TO_GLOSSES[lk]||new Set());
    e.en.forEach(g=>set.add(g));
    const k2=stripAcc(stripArt(normFr(f)));
    ANSWER_FORMS.add(k2);
    (FORM_SENSE[k2]=FORM_SENSE[k2]||new Set());
    e.en.forEach(g=>FORM_SENSE[k2].add(xCanonEn(g)));
  });
}
/* ───────── synonym layer (data/synonyms.js, optional) ───────── */
const _SY=(typeof window!=="undefined"&&window.SYNONYMS)?window.SYNONYMS:{tg:[],en:[]};
function synNorm(s){ return stripAcc(stripArt(normFr(s))); }
const SYN_TG_IDX={}, SYN_EN_IDX={};
(_SY.tg||[]).forEach(g=>{
  const words=Array.isArray(g)?g:(g.w||[]);
  const gate=Array.isArray(g)?null:(g.for||[]).map(xCanonEn);
  const rec={words,gate};
  words.forEach(w=>{const k=synNorm(w);(SYN_TG_IDX[k]=SYN_TG_IDX[k]||[]).push(rec)});
});
/* The marker forgives a leading "to" or "the", but the synonym index must not:
   "to shoot" (fusiller) and "the shoot" (le tournage) are different words, and a
   group written for one must never fire on the other. */
function synKeyEn(s){
  const t=String(s).toLowerCase().trim();
  const p=/^to\s/.test(t)?"v|":/^(the|a|an)\s/.test(t)?"n|":"|";
  return p+xCanonEn(s);
}
(_SY.en||[]).forEach(g=>{
  const words=Array.isArray(g)?g:(g.w||[]);
  /* "for" narrows a group to the senses named, so that the TV "channel" does not
     make "station" right for la Manche. */
  const gate=Array.isArray(g)?null:(g.for||[]).map(xCanonEn);
  const rec={words,gate};
  words.forEach(w=>{const k=synKeyEn(w);(SYN_EN_IDX[k]=SYN_EN_IDX[k]||[]).push(rec)});
});
function gateOk(gate, entry){
  if(!gate||!gate.length) return true;
  const gl=entry.en.map(xCanonEn);
  return gate.some(g=>gl.some(x=>x===g||new RegExp("(^|\\s)"+g.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|\\s)").test(x)));
}
function synVariants(entry){
  const own=new Set(entry[K].map(synNorm)), out=[];
  entry[K].forEach(v=>{
    (SYN_TG_IDX[synNorm(v)]||[]).forEach(rec=>{
      if(!gateOk(rec.gate,entry))return;
      rec.words.forEach(w=>{ if(!own.has(synNorm(w)) && out.indexOf(w)<0) out.push(w); });
    });
  });
  return out;
}
function synGlosses(entry){
  const own=new Set(entry.en.map(xCanonEn)), out=[];
  entry.en.forEach(g=>{
    (SYN_EN_IDX[synKeyEn(g)]||[]).forEach(rec=>{
      if(!gateOk(rec.gate,entry))return;
      rec.words.forEach(w=>{ if(!own.has(xCanonEn(w)) && out.indexOf(w)<0) out.push(w); });
    });
  });
  return out;
}

/* token-level synonyms from the layer's single-word groups (needs _SY above) */
(function(){
  const add=(a,b)=>{ (SYN_TOK[a]=SYN_TOK[a]||new Set()).add(b); (SYN_TOK[b]=SYN_TOK[b]||new Set()).add(a); };
  ((_SY.en||[]).concat(_SY.tg||[])).forEach(g=>{
    const words=(Array.isArray(g)?g:(g.w||[])).map(w=>String(w)
      .replace(/^(to |the |a |an |el |la |los |las |un |una |le |les |l'|des |du )/,"").trim());
    const single=words.filter(w=>w&&w.indexOf(" ")<0).map(w=>lightStem(stripAcc(w.toLowerCase())));
    for(let i=0;i<single.length;i++)for(let j=i+1;j<single.length;j++)
      if(single[i]!==single[j]) add(single[i],single[j]);
  });
  EN_TOKSYN.forEach(([a,b])=>add(lightStem(a),lightStem(b)));
})();


/* ───────── gender layer (data/genero.js, optional) ─────────
   The corpus keeps one form per entry — "el empleado". A student who
   answers "la empleada" is right, so the other form is derived here and
   accepted. The lists are never touched: what widens is only what counts
   as correct, and the answer shown is still the one the teacher wrote.

   Three things keep it honest:
     · article and ending must agree, so "la empleado" still fails on the
       article, exactly as before;
     · a derived form that is a *different word already in the corpus* is
       refused — el puerto/la puerta, el modo/la moda — unless the two
       share an English meaning;
     · anything the rules get wrong can be pinned in the data file. */
const _G = (typeof window!=="undefined" && window.GENERO) ? window.GENERO : null;
const G_PAIR = {}, G_BLOCK = {}, G_PERSON = {};
if(_G){
  (_G.pairs||[]).forEach(p=>{ const m=p[0], f=p[1];
    (G_PAIR[m]=G_PAIR[m]||[]).push(f); (G_PAIR[f]=G_PAIR[f]||[]).push(m); });
  (_G.excepciones||_G.exceptions||[]).forEach(p=>{
    if(typeof p === "string") G_BLOCK[p]=1; else p.forEach(w=>{ G_BLOCK[w]=1; }); });
  (_G.personas||_G.personnes||[]).forEach(w=>{ G_PERSON[w]=1; });
}
/* FORM_SENSE — every answer form seen so far, with the meanings it carries —
   is filled by indexEntry() above, so a derived gender can be checked against
   words that already exist. */

function gOther(w){                       // the other gender of one word
  const out = new Set();
  (G_PAIR[w]||[]).forEach(x=>out.add(x));
  /* a blocked word keeps its hand-written partner, if it has one, but the
     regular rules are not allowed to invent a form for it */
  if(!_G || G_BLOCK[w]) return out;
  if((_G.invariable||[]).some(s=>s && w.endsWith(s) && w.length>s.length)) out.add(w);
  (_G.suffixes||[]).forEach(p=>{
    const m=p[0], f=p[1];
    if(f && w.endsWith(f) && w.length>f.length) out.add(w.slice(0,w.length-f.length)+m);
    if(m && w.endsWith(m) && w.length>m.length) out.add(w.slice(0,w.length-m.length)+f);
    if(!m && f) out.add(w+f);
  });
  return out;
}
function gPlural(x){                       /* re-pluralise after flipping */
  return /[aeiouáéíóú]$/.test(x) ? x+"s" : x+"es";
}
function gWordForms(w){                   /* singular or plural */
  const pl = /(es|s)$/.exec(w);
  if(pl && w.length > pl[0].length + 2){
    /* los trabajadores → las trabajadoras, not “trabajadoraes”: the plural
       ending is rebuilt from the flipped stem, not carried over. */
    const base = w.slice(0, w.length-pl[0].length), out = new Set();
    gOther(base).forEach(x=>{ if(x!==base) out.add(gPlural(x)); });
    gOther(w).forEach(x=>out.add(x));
    return out;
  }
  return gOther(w);
}
function genderForms(v){
  if(!_G) return [];
  const m = v.match(CFG.artRe), art = m ? m[0] : "";
  const bare = v.slice(art.length).trim();
  if(!bare) return [];
  /* Every article of the opposite gender in the same number, not just the
     one paired in the table: from "el empleado" a student may well write
     "una empleada", and in French "l'" hides the gender entirely. */
  const arts = [], cls = art ? artClass(art) : null;
  if(art){
    if(!cls) return [];
    const want = cls[0]==="m" ? "f" : cls[0]==="f" ? "m" : "?";
    Object.keys(ART_CLASS).forEach(a=>{
      const c = ART_CLASS[a];
      if(c[1] !== cls[1]) return;                       // keep the number
      if(want==="?" || c[0]===want || c[0]==="?")
        arts.push(a + (/'$/.test(a) ? "" : " "));
    });
  } else arts.push("");
  if(!arts.length) return [];
  const words = bare.split(" "), stops = _G.stops||[];
  /* An article means the head is a noun, and most nouns have no other
     gender: "el trabajo" must not become "la trabaja". A noun only flips
     if it is a listed person noun. A bare word is an adjective or a
     participle in this corpus, and those flip freely. */
  if(art){
    const h = words[0], sing = h.replace(/(es|s)$/, "");
    let ok = G_PERSON[h] || G_PERSON[sing] || G_PAIR[h] || G_PAIR[sing];
    if(!ok){
      /* the list holds one member of the pair; "la profesora" is reached
         through "profesor", so the flips are checked against it too */
      const alts = new Set();
      gOther(h).forEach(x=>alts.add(x));
      gOther(sing).forEach(x=>alts.add(x));
      alts.forEach(x=>{ if(G_PERSON[x] || G_PAIR[x]) ok = 1; });
    }
    if(!ok) return [];
  }
  const heads = gWordForms(words[0]);
  if(!heads.size) return [];
  const out = [];
  heads.forEach(h=>{
    let rest = "", agreeing = true;
    for(let i=1;i<words.length;i++){
      const w = words[i];
      if(agreeing && stops.indexOf(w)<0){
        const alt = gWordForms(w);
        if(alt.size){ rest += " " + Array.from(alt)[0]; continue; }
      }
      agreeing = false; rest += " " + w;
    }
    arts.forEach(a=>{ const cand = (a+h+rest).trim(); if(cand!==v) out.push(cand); });
  });
  return out;
}
function genderTier(raw, variants, entry){
  const senses = new Set((entry&&entry.en||[]).map(xCanonEn));
  for(let i=0;i<variants.length;i++){
    const v = normFr(variants[i]);
    const alts = genderForms(v);
    for(let j=0;j<alts.length;j++){
      const alt = alts[j];
      if(raw!==alt && stripAcc(raw)!==stripAcc(alt)) continue;
      /* refuse a form that is a different word already in the corpus */
      const known = FORM_SENSE[stripAcc(stripArt(alt))];
      if(known && !Array.from(known).some(g=>senses.has(g))) continue;
      return {q:5, msg:T.genderTier(variants[i]), cls:"good"};
    }
  }
  return null;
}

/* An article carries two things a vocabulary test cares about: gender and
   number. It also carries definiteness, which it does not. "le chanteur" and
   "un chanteur" are the same word correctly recalled; so are "un employe" and
   "l'employe", where the elided article hides the gender altogether. The
   marker used to compare the two articles as strings and fail anything that
   did not match, then blame the gender — which was often right.
   Each article is now read as gender + number. Only a real disagreement is
   marked wrong; "?" means the article does not say, and agrees with either. */
var ART_CLASS = {"el":"ms","la":"fs","los":"mp","las":"fp","un":"ms","una":"fs","unos":"mp","unas":"fp","lo":"ns"};
function artClass(a){ return ART_CLASS[String(a).trim()] || null; }
function artCompatible(a, b){
  var x = artClass(a), y = artClass(b);
  if(!x || !y) return false;                 // an article we do not know: keep the old verdict
  if(x[1] !== y[1]) return false;            // singular against plural is a real mistake
  return x[0] === y[0] || x[0] === "?" || y[0] === "?";
}
/* ───────── answer checking ───────── */
function frTiers(raw, variants, allowFuzzy){
  const vars=variants.map(normFr);
  if(vars.includes(raw)) return {q:5,msg:T.exact,cls:"good"};
  if(vars.map(stripAcc).includes(stripAcc(raw))) return {q:4,msg:T.accentTier,cls:"good"};
  const rawHasArt = raw!==stripArt(raw);
  if(vars.map(v=>stripArt(v)).includes(stripArt(raw))||vars.map(v=>stripAcc(stripArt(v))).includes(stripAcc(stripArt(raw)))){
    const target=variants.map(normFr).find(v=>stripAcc(stripArt(v))===stripAcc(stripArt(raw)));
    const varHasArt = target && target!==stripArt(target);
    if(rawHasArt && varHasArt){
      const ra=raw.match(CFG.artRe)[0], va=target.match(CFG.artRe)[0];
      if(ra!==va){
        if(artCompatible(ra,va)) return {q:5,msg:T.artSwap(target),cls:"good"};
        return {q:1,msg:T.artWrong,cls:"bad"};
      }
    }
    if(rawHasArt && !varHasArt) return {q:5,msg:T.exact,cls:"good"};
    return {q:3,msg:T.artTier,cls:"good"};
  }
  if(allowFuzzy && vars.some(v=>nearMiss(stripAcc(stripArt(v)),stripAcc(stripArt(raw)))))
    return {q:3,msg:T.typoTier,cls:"good"};
  return null;
}
function checkFr(ans, entry, promptedGloss){
  const raw=normFr(ans); if(!raw)return null;
  const rawForm=stripAcc(stripArt(raw));
  const own=frTiers(raw, entry[K], false);
  /* a common-gender noun (el/la periodista) reaches the article check
     first and is failed on the article; the gender tier outranks that. */
  const gen=genderTier(raw, entry[K], entry);
  if(gen && (!own || own.q<4)) return gen;
  if(own) return own;
  const sibs=(GLOSS_TO_ENTRIES[xCanonEn(promptedGloss||entry.en[0])]||[]).filter(x=>x.id!==entry.id);
  for(const s of sibs){
    const hit=frTiers(raw, s[K], false);
    if(hit) return {...hit, alt:s};
    const gsib=genderTier(raw, s[K], s);
    if(gsib) return {...gsib, alt:s};
  }
  // curated synonym layer: any interchangeable form for this entry's sense
  const syn=synVariants(entry);
  for(const w of syn){
    const hit=frTiers(raw, [w], false);
    if(hit) return {...hit, altTxt:w};
  }
  const inPool=[entry].concat(sibs).some(x=>x[K].some(v=>stripAcc(stripArt(normFr(v)))===rawForm))
    || syn.some(w=>stripAcc(stripArt(normFr(w)))===rawForm);
  const allowFuzzy=inPool || !ANSWER_FORMS.has(rawForm);
  if(allowFuzzy){
    const own2=frTiers(raw, entry[K], true);
    if(own2) return own2;
    for(const s of sibs){
      const hit=frTiers(raw, s[K], true);
      if(hit) return {...hit, alt:s};
    }
    for(const w of syn){
      const hit=frTiers(raw, [w], true);
      if(hit) return {...hit, altTxt:w};
    }
  }
  if(isPhrase(entry)){                       // quotation recalled with different wording
    let best={r:0,p:0,n:0};
    entry[K].concat(syn).forEach(v=>{ const t=tgToks(v); const s=overlap(tgToks(ans),t);
      if(s.r>best.r||(s.r===best.r&&s.p>best.p)) best={...s,n:t.length}; });
    const bar=phraseBars(best.n);
    if(best.r>=bar.part && best.p>=0.25) return {q:3,msg:T.phraseNear,cls:"good"};
  }
  return {q:1,msg:T.wrong,cls:"bad"};
}
function checkEn(ans, entry){
  const raw=normEn(ans); if(!raw)return null;
  const pool=new Set(entry.en);
  entry[K].forEach(f=>{const s=LEX_TO_GLOSSES[xLexkey(f)]; if(s)s.forEach(g=>pool.add(g))});
  synGlosses(entry).forEach(g=>pool.add(g));
  const vars=[...pool].map(normEn);
  if(vars.includes(raw)||vars.map(stripEnLead).includes(stripEnLead(raw)))
    return {q:5,msg:T.exact,cls:"good"};
  if(vars.some(v=>nearMiss(stripEnLead(v),stripEnLead(raw))))
    return {q:4,msg:T.enTypo,cls:"good"};
  /* Same word, another form: unify / unifies / unified / unifying. Only real
     inflections count — "manage" still does not accept "manager". */
  if(vars.some(v=>sameEnWord(stripEnLead(v), stripEnLead(raw))))
    return {q:5,msg:T.exact,cls:"good"};
  /* A gloss of three content words or more is a small paraphrase problem, not a
     spelling one, so it is marked on meaning like a phrase. */
  if(!isPhrase(entry)){
    let best={r:0,p:0,n:0};
    [...pool].forEach(g=>{ const t=enToks(g);
      if(t.length<3) return;
      const sc=overlap(enToks(ans), t);
      if(sc.r>best.r||(sc.r===best.r&&sc.p>best.p)) best={...sc,n:t.length}; });
    if(best.n>=3){
      const bar=phraseBars(best.n);
      if(best.r>=bar.full && best.p>=0.4)  return {q:5,msg:T.exact,cls:"good"};
      if(best.r>=bar.part && best.p>=0.25) return {q:3,msg:T.senseTier,cls:"good"};
    }
  }
  if(isPhrase(entry)){                       // meaning-level marking for quotations/expressions
    let best={r:0,p:0,n:0};
    [...pool].forEach(g=>{ const t=enToks(g); const s=overlap(enToks(ans),t);
      if(s.r>best.r||(s.r===best.r&&s.p>best.p)) best={...s,n:t.length}; });
    const bar=phraseBars(best.n);
    if(best.r>=bar.full && best.p>=0.4)  return {q:5,msg:T.exact,cls:"good"};
    if(best.r>=bar.part && best.p>=0.25) return {q:3,msg:T.senseTier,cls:"good"};
  }
  return {q:1,msg:T.wrong,cls:"bad"};
}

/* ───────── TTS ───────── */
const ttsOK="speechSynthesis" in window;
let _voice=null;
/* Voice quality varies enormously between the voices installed on a device.
   Rank them instead of taking whichever the browser lists first. */
function voiceScore(v){
  const n=(v.name||""), ln=n.toLowerCase(), lang=(v.lang||"").replace("_","-");
  let s=0;
  if(lang===CFG.ttsLang) s+=40; else if(lang.toLowerCase().startsWith(CFG.ttsLang.split("-")[0])) s+=15;
  // modern neural engines
  if(/natural|neural|premium|enhanced|siri|wavenet|studio/.test(ln)) s+=45;
  if(/google/.test(ln)) s+=30;             // Chrome's server voices — clearly better than local ones
  if(v.localService===false) s+=20;        // network voices are generally the good ones
  if(/online/.test(ln)) s+=10;
  // known-decent named system voices
  if(/thomas|am(é|e)lie|audrey|marie|denise|henri|c(é|e)line|mónica|monica|paulina|jorge|helena|elvira|sabina|lucia|alvaro/.test(ln)) s+=12;
  // known-poor engines
  if(/espeak|compact|festival|pico|robot/.test(ln)) s-=60;
  if(/eloquence/.test(ln)) s-=30;
  return s;
}
function voiceList(){
  if(!ttsOK)return [];
  const base=CFG.ttsLang.split("-")[0].toLowerCase();
  return (speechSynthesis.getVoices()||[])
    .filter(v=>v.lang&&v.lang.toLowerCase().replace("_","-").startsWith(base))
    .sort((a,b)=>voiceScore(b)-voiceScore(a));
}
function pickVoice(){
  const vs=voiceList();
  if(!vs.length)return null;
  if(S.voice){ const saved=vs.find(v=>v.name===S.voice); if(saved)return saved; }
  return vs[0];
}
if(ttsOK&&speechSynthesis.addEventListener) speechSynthesis.addEventListener("voiceschanged",()=>{_voice=pickVoice()});
/* iOS/Safari require a user gesture before any speech is allowed */
let _unlocked=false;
function unlockTts(){
  if(_unlocked||!ttsOK)return;
  _unlocked=true;
  try{const u=new SpeechSynthesisUtterance(" ");u.volume=0;speechSynthesis.speak(u)}catch(e){}
}
document.addEventListener("pointerdown",unlockTts,{once:true});
document.addEventListener("keydown",unlockTts,{once:true});
function speak(txt){
  if(!ttsOK)return;
  unlockTts();
  const u=new SpeechSynthesisUtterance(String(txt).replace(/\s*\([^)]*\)/g,"").replace(/;.*/,"").trim());
  _voice=_voice||pickVoice();
  if(_voice)u.voice=_voice;
  u.lang=CFG.ttsLang; u.rate=(S.rate||0.88); u.pitch=1;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function autoSpeak(txt){ if(S.audio!==false) speak(txt); }
function audioToggle(){
  if(!ttsOK)return null;
  const b=el("button",{class:"btn small ghost",type:"button",title:T.audioTitle});
  const paint=()=>{ b.textContent=(S.audio===false?"🔇 ":"🔊 ")+T.audioLabel; };
  b.addEventListener("click",()=>{ S.audio=!(S.audio!==false); save(); paint(); if(S.audio!==false)speak(T.audioTest); });
  paint(); return b;
}
function voicePicker(){
  if(!ttsOK)return null;
  const vs=voiceList();
  if(vs.length<2)return null;                       // nothing to choose between
  const wrap=el("div",{style:"margin-top:10px"});
  const sel=el("select",{class:"typed",style:"margin-top:6px;font-size:.95rem",
    onchange:e=>{ S.voice=e.target.value; save(); _voice=pickVoice(); speak(T.audioTest); }});
  vs.forEach((v,i)=>{
    const o=el("option",{value:v.name}, v.name+(i===0?" ★":""));
    if((S.voice||vs[0].name)===v.name) o.setAttribute("selected","");
    sel.append(o);
  });
  wrap.append(el("label",{style:"font-weight:600;font-size:.9rem"},T.voiceLabel), sel,
    el("div",{style:"font-size:.8rem;color:var(--muted);margin-top:4px"},T.voiceHint));
  return wrap;
}
function speakBtn(txt,small){
  if(!ttsOK)return null;
  return el("button",{class:"speak"+(small?" small":""),type:"button",title:"🔊","aria-label":"🔊",
    onclick:ev=>{ev.stopPropagation();speak(txt)}},"🔊");
}

/* ───────── accent pad ───────── */
let padTarget=null;
const pad=(function(){
  const p=el("div",{class:"accent-pad hidden",role:"toolbar","aria-label":T.padLabel});
  CFG.accents.forEach(ch=>{
    const b=el("button",{type:"button",tabindex:"-1"},ch);
    b.addEventListener("mousedown",ev=>ev.preventDefault());
    b.addEventListener("click",()=>{
      if(!padTarget)return;
      const st=padTarget.selectionStart??padTarget.value.length, en=padTarget.selectionEnd??padTarget.value.length;
      padTarget.setRangeText(ch,st,en,"end");
      padTarget.dispatchEvent(new Event("input",{bubbles:true}));
      padTarget.focus();
    });
    p.append(b);
  });
  document.body.append(p);
  return p;
})();
function showPad(i){ padTarget=i; pad.classList.remove("hidden"); document.body.classList.add("pad-on"); }
function hidePad(){ padTarget=null; pad.classList.add("hidden"); document.body.classList.remove("pad-on"); }


/* ═══════════════════════════════════════════════════════════════════
   THE REPORT TO THE TEACHER
   The code was only ever sent when a student remembered to go and look
   for it in Progreso, which is to say rarely. It now offers itself at
   the end of every activity, and the strip under the header keeps the
   state in view. Nothing is ever withheld and nothing is compulsory:
   the student presses the button, or does not.
   ═══════════════════════════════════════════════════════════════════ */
function sentState(){ return S.sent && S.sent.t ? S.sent : null; }
function unsentCount(){
  const done = S.sessions.length;
  const at = sentState() ? (S.sent.s || 0) : 0;
  return Math.max(0, done - at);
}
function agoText(ms){
  const d = Date.now() - ms;
  if(d < 90000) return T.agoNow;
  if(d < 3600000) return T.agoMin(Math.round(d/60000));
  if(d < DAY) return T.agoHour(Math.round(d/3600000));
  return T.agoDay(Math.round(d/DAY));
}
/* what the code is about to say, in words, so the student knows what travels */
function sendSummary(){
  const t = aggAll();
  return {seen:t.nSeen, mast:t.nMast, acc:pct(t.ok, t.tries)};
}
function markSent(){
  S.sent = {t:Date.now(), s:S.sessions.length, x:S.exams.length};
  save();
  renderSendBar();
}
/* One route out, used by the strip, the end-of-activity panel and Progreso,
   so all three behave the same and all three record the send. */
async function sendNow(extra){
  const code = buildExportCode();
  const tail = extra || "";
  if(!CFG.FORMS_URL){
    try{ await navigator.clipboard.writeText(code); }catch(e){}
    markSent();
    return "copied";
  }
  if(CFG.FORMS_FIELD_NAME && CFG.FORMS_FIELD_CODE){
    window.open(CFG.FORMS_URL
      + "&" + CFG.FORMS_FIELD_NAME + "=" + encodeURIComponent((S.name||"").trim() || T.noName)
      + "&" + CFG.FORMS_FIELD_CODE + "=" + encodeURIComponent(code) + tail, "_blank", "noopener");
    markSent();
    return "prefilled";
  }
  /* the form's field ids are not configured: copy, then open the empty form */
  try{ await navigator.clipboard.writeText(code); }
  catch(e){
    const ta = el("textarea", {}, code);
    document.body.append(ta); ta.select();
    try{ document.execCommand("copy"); }catch(e2){}
    ta.remove();
  }
  alert(T.formsPasteHint);
  /* Half a configuration is still worth using: fill in whatever field id is
     known, and leave the clipboard for the box that is not. */
  let u = CFG.FORMS_URL + tail;
  if(CFG.FORMS_FIELD_NAME)
    u += "&" + CFG.FORMS_FIELD_NAME + "=" + encodeURIComponent((S.name||"").trim() || T.noName);
  if(CFG.FORMS_FIELD_CODE)
    u += "&" + CFG.FORMS_FIELD_CODE + "=" + encodeURIComponent(code);
  window.open(u, "_blank", "noopener");
  markSent();
  return "paste";
}

function renderSendBar(){
  renderTaskBar();
  const bar = $("#sendbar");
  if(!bar) return;
  const nothingYet = !S.sessions.length && !S.exams.length;
  if(nothingYet){ bar.className = "sendbar hidden"; bar.innerHTML = ""; return; }

  const st = sentState(), n = unsentCount();
  let cls = "sendbar", txt;
  if(!st){ cls += " waiting"; txt = T.barNever + (n ? " " + T.barUnsent(n) : ""); }
  else if(n){ cls += " waiting"; txt = T.barWaiting(n, agoText(st.t)); }
  else { cls += " clear"; txt = T.barClear(agoText(st.t)); }

  bar.className = cls;
  bar.innerHTML = "";
  const inner = el("div", {class:"sendbar-inner"},
    el("span", {class:"dot"}),
    el("span", {class:"txt"}, txt));
  if(!st || n){
    const b = el("button", {class:"btn primary", onclick:async()=>{
      b.disabled = true; b.textContent = T.barSending;
      await sendNow();
    }}, T.barSend);
    inner.append(b);
  }
  bar.append(inner);
}

/* The panel at the end of an activity. It is the whole point of the change:
   the moment a student has just finished something is the only moment they
   are certain to be looking at the screen. */
function sendPanel(){
  const s = sendSummary();
  const card = el("div", {class:"card send-card"},
    el("h3", null, T.sendPanelTitle),
    el("p", {class:"send-what"}, T.sendPanelWhat(s.seen, s.mast, s.acc)));

  if(!(S.name||"").trim()){
    const inp = el("input", {class:"typed send-name", value:"", placeholder:T.namePh,
      oninput:e=>{ S.name = e.target.value.trim(); save(); }});
    card.append(el("p", {class:"send-what", style:"margin-top:8px"}, T.sendNameHint), inp);
  }

  const how = (CFG.FORMS_FIELD_NAME && CFG.FORMS_FIELD_CODE) ? T.sendPanelHow : T.sendPanelHowPaste;
  const note = el("p", {class:"send-what", style:"margin-top:10px"}, how);
  const b = el("button", {class:"btn primary", onclick:async()=>{
    b.disabled = true; b.textContent = T.barSending;
    await sendNow();
    b.textContent = T.sendPanelDone;
    note.textContent = T.sendPanelThanks;
  }}, T.sendPanelGo);
  card.append(el("div", {class:"btn-row"}, b), note,
              el("p", {class:"send-what", style:"margin-top:6px"}, T.sendPanelLater));
  return card;
}

/* ───────── router ───────── */
const VIEWS=["accueil","revision","examen","suivi"];
function go(v){
  hidePad();
  VIEWS.forEach(x=>{
    $("#view-"+x).classList.toggle("hidden",x!==v);
    $("#tab-"+x).setAttribute("aria-selected",x===v?"true":"false");
  });
  if(v==="accueil")renderAccueil();
  if(v==="revision")renderRevisionConfig();
  if(v==="examen")renderExamConfig();
  if(v==="suivi")renderSuivi();
  renderSendBar();
  window.scrollTo(0,0);
}
VIEWS.forEach(v=>$("#tab-"+v).addEventListener("click",()=>go(v)));

function kpi(n,l){return el("div",{class:"kpi"},el("div",{class:"n"},String(n)),el("div",{class:"l"},l))}
function pills(items,current,on){
  const w=el("div",{class:"pill-select"});
  items.forEach(([val,label,dis])=>{
    const b=el("button",{class:val===current?"on":"",...(dis?{disabled:"",title:T.dictNoTts}:{}),
      onclick:()=>{on(val);[...w.children].forEach(c=>c.classList.remove("on"));b.classList.add("on")}},label);
    w.append(b);
  });
  return w;
}

/* ───────── assignment ───────── */
/* A task can also arrive inside the link the teacher posts — ?task=… — built
   on the dashboard with no file to edit. It is kept on this device and shown
   from then on; a newer one replaces it; ?task=none removes it. When both a
   linked task and assignments.js exist, the more recent one wins. */
const TASK_KEY=CFG.ls+":task";
function decodeTask(str){
  try{
    let b=String(str||"").replace(/-/g,"+").replace(/_/g,"/");
    while(b.length%4) b+="=";
    const o=JSON.parse(decodeURIComponent(escape(atob(b))));
    return (o&&typeof o==="object")?o:null;
  }catch(e){ return null; }
}
const CLASSES=["Y7","Y8","Y9","Y10","Y11"];
/* A class is "8Beauvoir" from the teacher's link, or "Y8" if the student set it
   by hand on this screen. Both mean Year 8. */
function yearOf(c){ const m=/^Y?(\d{1,2})/.exec(String(c||"").trim()); return m ? "Y"+m[1] : ""; }
function taskStore(){
  try{ let o=JSON.parse(localStorage.getItem(TASK_KEY)||"{}"); if(o&&o.label) o={all:o}; return o||{}; }catch(e){ return {}; }
}
function saveTaskStore(o){ try{ localStorage.setItem(TASK_KEY,JSON.stringify(o)); }catch(e){} }
(function(){
  const m=/[?&]task=([^&#]+)/.exec(location.search||"");
  if(!m) return;
  const v=decodeURIComponent(m[1]);
  try{
    if(/^(none|clear|off)$/i.test(v)) localStorage.removeItem(TASK_KEY);
    else { const o=decodeTask(v); if(o&&o.label){ o.t=o.t||Date.now();
      const st=taskStore(); st[o.cls||"all"]=o; saveTaskStore(st);
      /* A link that names a class sets it on a device that has none. If the
         device is already in a different class the link is NOT applied — a Y9
         link opened by a Y8 student must not move them — but it is offered,
         because every September every student really does move up a year. */
      if(o.cls){
        if(!S.cls){ S.cls=o.cls; S.clsOffer=""; }
        else if(S.cls!==o.cls){ S.clsOffer=o.cls; }
        save();
      } } }
  }catch(e){}
  /* keep any ?l= deep link the same address may carry */
  try{
    const rest=(location.search||"").replace(/[?&]task=[^&#]*/,"").replace(/^&/,"?");
    history.replaceState(null,"",location.pathname+(rest.length>1?rest:"")+location.hash);
  }catch(e){}
})();
function fileTaskFor(cls){
  const a=window.ASSIGNMENT; if(!a) return null;
  if(a.label) return (!a.cls||!cls||a.cls===cls)?a:null;
  return (cls&&a[cls]&&a[cls].label)?a[cls]:null;
}
function fileHasClasses(){ const a=window.ASSIGNMENT; return !!(a&&!a.label&&CLASSES.some(c=>a[c]&&a[c].label)); }
function needsClass(){
  if(S.cls) return false;
  const st=taskStore();
  return fileHasClasses()||CLASSES.some(c=>st[c]&&st[c].label);
}
function setClass(c){ S.cls=c||""; S.clsOffer=""; save(); yearFilter=""; openUnit=null; renderAccueil(); renderSendBar(); }
function classButtons(){
  /* When the teacher's link has named the group, show that group rather than
     only its year — so a student can read back what their device thinks it is,
     which is the quickest way to find a link posted in the wrong channel. */
  const named = S.cls && CLASSES.indexOf(S.cls) < 0 ? S.cls : "";
  return el("div",{class:"btn-row",style:"margin-top:6px"},
    ...CLASSES.map(c=>el("button",{class:"btn small"+(yearOf(S.cls)===c?" primary":" ghost"),onclick:()=>setClass(yearOf(S.cls)===c?"":c)},c)),
    ...(named ? [el("span",{style:"align-self:center;margin-left:8px;color:var(--ink-soft);font-size:.85rem"}, named)] : []));
}
function currentTask(){
  const st=taskStore();
  const linked=(S.cls&&st[S.cls])||st.all||null;
  const file=fileTaskFor(S.cls);
  if(linked&&linked.label){
    if(!file) return linked;
    const ft=Date.parse(file.since||"2000-01-01")||0;
    return (linked.t||0)>=ft?linked:file;
  }
  return file;
}
function assignment(){
  const a=currentTask();
  if(!a||!a.label||!Array.isArray(a.lessons)||!a.lessons.length) return null;
  const since=Date.parse(a.since||"2000-01-01");
  const done=a.lessons.map(lid=>S.sessions.some(s=>s.lid===lid&&s.t>=since));
  const due=a.due ? new Date(a.due+"T23:59:59") : null;
  return {...a, since, done, due:(due&&!isNaN(due))?due:null,
          nDone:done.filter(Boolean).length, all:done.every(Boolean)};
}
function dueText(a){
  if(!a.due) return "";
  const d=a.due.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  return Date.now()>a.due.getTime() && !a.all ? T.taskWasDue(d) : T.taskFor(d);
}
/* The task strip: under the send strip, on every tab, so what is set is never
   more than a glance away. Blue while there is something to do, green once
   the whole task is done, absent when no task is set. */
function renderTaskBar(){
  const bar=$("#taskbar"); if(!bar) return;
  /* The year-group offer takes the strip first: without it a student who has
     moved up would sit looking at last year's task. */
  if(S.clsOffer && S.clsOffer!==S.cls){
    bar.className="sendbar task waiting"; bar.innerHTML="";
    const to=S.clsOffer;
    bar.append(el("div",{class:"sendbar-inner"},
      el("span",{class:"dot"}),
      el("span",{class:"txt"},T.clsOffer(S.cls,to)),
      el("button",{class:"btn primary",onclick:()=>{ setClass(to); }},T.clsOfferGo(to)),
      el("button",{class:"btn ghost",onclick:()=>{ S.clsOffer=""; save(); renderSendBar(); renderAccueil(); }},T.clsOfferNo)));
    return;
  }
  const a=assignment();
  if(!a&&needsClass()){
    bar.className="sendbar task"; bar.innerHTML="";
    const inner=el("div",{class:"sendbar-inner"},el("span",{class:"dot"}),el("span",{class:"txt"},T.clsAsk));
    CLASSES.forEach(c=>inner.append(el("button",{class:"btn primary",onclick:()=>setClass(c)},c)));
    bar.append(inner); return;
  }
  if(!a){ bar.className="sendbar hidden"; bar.innerHTML=""; return; }
  bar.className="sendbar task"+(a.all?" clear":"");
  bar.innerHTML="";
  const txt=a.all ? T.taskAllDone+" — "+a.label
                  : T.taskStrip(a.label)+" · "+T.taskCount(a.nDone,a.lessons.length)+(a.due?" · "+dueText(a):"");
  const inner=el("div",{class:"sendbar-inner"},el("span",{class:"dot"}),el("span",{class:"txt"},txt));
  if(!a.all) inner.append(el("button",{class:"btn primary",onclick:()=>{go("accueil");
    const c=$("#taskCard"); if(c&&c.scrollIntoView) try{c.scrollIntoView({block:"start"});}catch(e){} }},T.taskGo));
  bar.append(inner);
}

/* ═════════ ACCUEIL ═════════ */
let openUnit=null, yearFilter="";
function renderAccueil(){
  const v=$("#view-accueil"); v.innerHTML="";
  const dueN=aggAll().due;
  const lee=leeches();
  const a=assignment();
  v.append(
    el("h2",null,T.homeTitle),
    el("p",{class:"lede"},T.homeLede));
  if(!a&&needsClass()){
    v.append(el("div",{class:"card",id:"taskCard",style:"margin-top:14px;border:2px dashed var(--bleu)"},
      el("h3",null,T.taskTitle),
      el("p",{class:"lede",style:"margin:2px 0 6px;font-size:.9rem"},T.clsAsk),
      el("div",{class:"btn-row"},...CLASSES.map(c=>el("button",{class:"btn primary",onclick:()=>setClass(c)},c)))));
  }
  if(a){
    const card=el("div",{class:"card",id:"taskCard",style:"margin-top:14px;border-color:var(--bleu);border-width:2px"},
      el("h3",null,T.taskTitle+" — "+a.label+(S.cls?" · "+S.cls:"")),
      el("p",{class:"lede",style:"margin:2px 0 6px;font-size:.9rem"},
        T.taskCount(a.nDone,a.lessons.length)+(a.due?" · "+dueText(a):"")));
    a.lessons.forEach((lid,i)=>{
      const [uid]=lid.split(".");
      const L=UNITS[uid]&&UNITS[uid].lessons[lid];
      if(!L)return;
      card.append(el("div",{style:"display:flex;gap:10px;align-items:center;padding:4px 0"},
        el("span",{style:"flex:1"},T.lessonLine(lid.split(".")[1],L.title,L.ids.length)),
        el("span",{class:"session-count",style:a.done[i]?"color:var(--vert)":"color:var(--rouge)"},a.done[i]?T.taskDone:T.taskPending),
        el("button",{class:"btn small primary",onclick:()=>startLesson(uid,lid)},T.practise)));
    });
    v.append(card);
  }
  v.append(
    el("div",{class:"card"},
      el("label",{for:"student-name",style:"font-weight:600;font-size:.9rem"},T.nameLabel),
      el("input",{id:"student-name",class:"typed",style:"margin-top:8px",value:S.name||"",placeholder:T.namePh,
        oninput:e=>{S.name=e.target.value.trim();save()}}),
      el("label",{style:"font-weight:600;font-size:.9rem;display:block;margin-top:14px"},T.clsLabel),
      el("p",{class:"lede",style:"font-size:.82rem;margin:2px 0 0"},T.clsHint),
      classButtons(),
      el("div",{class:"btn-row"},audioToggle()), voicePicker()));
  if(dueN) v.append(el("div",{class:"card",style:"margin-top:14px;border-color:var(--rouge)"},
    el("h3",null,T.dueCard(dueN)),
    el("div",{class:"btn-row"},el("button",{class:"btn primary",onclick:()=>go("revision")},T.startReview))));
  if(lee.length) v.append(el("div",{class:"card",style:"margin-top:14px;border-color:#B07B12"},
    el("h3",null,T.leechTitle+" ("+lee.length+")"),
    el("p",{style:"margin:4px 0 0;color:var(--ink-soft);font-size:.9rem"},T.leechCard(lee.length)),
    el("div",{class:"btn-row"},el("button",{class:"btn",onclick:startLeech},T.leechGo))));
  /* Seventeen units across five years is too long a list to scroll. The year
     bar narrows it to the student's own, and their class — which the teacher's
     task link already set — is the default, so most students never touch it. */
  const yearBar=el("div",{class:"btn-row",style:"margin:18px 0 0;flex-wrap:wrap"});
  const shownYear = yearFilter || (CLASSES.indexOf(yearOf(S.cls))>=0 ? yearOf(S.cls) : "");
  yearBar.append(el("span",{style:"align-self:center;font-weight:600;font-size:.9rem;margin-right:4px"},T.yearLabel+":"));
  YEARS.forEach(y=>{
    yearBar.append(el("button",{class:"btn small"+(shownYear===y.y?" primary":" ghost"),
      onclick:()=>{ yearFilter = (shownYear===y.y) ? "__all" : y.y; openUnit=null; renderAccueil(); }}, y.y));
  });
  yearBar.append(el("button",{class:"btn small"+(shownYear?" ghost":" primary"),
    onclick:()=>{ yearFilter="__all"; renderAccueil(); }}, T.yearAll));
  v.append(yearBar);

  v.append(el("div",{class:"section-label"},T.unitsLabel));
  const visible = UNIT_ORDER.filter(uid => !shownYear || shownYear==="__all" || UNITS[uid].year===shownYear);
  if(!visible.length) v.append(el("p",{class:"lede"},T.yearEmpty));
  visible.forEach(uid=>{
    const u=UNITS[uid];
    const ua=aggU(uid), mast=ua.nMast, seen=ua.nSeen;
    const head=el("button",{class:"unit-tile",style:"width:100%",onclick:()=>{openUnit=openUnit===uid?null:uid;renderAccueil()}},
      el("div",{style:"flex:1"},
        el("div",{class:"u-code"},uid+(openUnit===uid?" ▾":" ▸")),
        el("div",{class:"u-name"},u.name),
        el("div",{class:"u-meta"},T.unitMeta(u.lessonOrder.length,u.n,seen,mast)),
        el("div",{class:"u-bar"},el("i",{style:"width:"+pct(mast,u.n)+"%"}))));
    v.append(head);
    if(openUnit===uid){
      const wrap=el("div",{style:"margin:6px 0 14px 10px;display:grid;gap:6px"});
      u.lessonOrder.forEach(lid=>{
        const L=u.lessons[lid];
        const la=aggL(lid), n=L.n, m=la.nMast, s=la.nSeen, a2=la.tries, c2=la.ok;
        wrap.append(el("div",{class:"card",style:"display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 16px"},
          el("div",{style:"flex:1;min-width:220px"},
            el("div",{style:"font-weight:600"},T.lessonLine(lid.split(".")[1],L.title,n)),
            el("div",{class:"u-meta"},T.lessonMeta(s,m)+(a2?` · ${pct(c2,a2)}${T.accSuffix}`:"")),
            el("div",{class:"u-bar",style:"max-width:220px"},el("i",{style:"width:"+pct(m,n)+"%"}))),
          el("div",{class:"btn-row",style:"margin:0"},
            el("button",{class:"btn small ghost",onclick:()=>renderListe(uid,lid)},T.list),
            el("button",{class:"btn small primary",onclick:()=>startLesson(uid,lid)},T.practise))));
      });
      v.append(wrap);
    }
  });
}

/* — liste (printable) — */
async function renderListe(uid,lid){
  const v=$("#view-accueil"); busy(v);
  await loadLists([lid]);
  v.innerHTML="";
  const u=UNITS[uid], L=u.lessons[lid];
  v.append(
    el("div",{class:"session-bar no-print"},
      el("button",{class:"btn small ghost",onclick:renderAccueil},T.backUnits),
      el("button",{class:"btn small ghost",style:"margin-left:auto",onclick:()=>window.print()},T.print),
      el("button",{class:"btn small primary",onclick:()=>startLesson(uid,lid)},T.practiseThis)),
    el("h2",null,`${uid} ${u.name} · `+T.lessonLine(lid.split(".")[1],L.title,L.ids.length)));
  const tbl=el("table",{class:"stats"},
    el("thead",null,el("tr",null,el("th",null,T.colTarget),el("th",null,T.colEn),el("th",{class:"no-print",style:"width:70px"},T.colStatus))));
  const tb=el("tbody");
  L.ids.forEach(id=>{
    const e=byId[id];
    const st=isMastered(id)?"●":isSeen(id)?"◐":"○";
    const stTitle=isMastered(id)?T.stMast:isSeen(id)?T.stCur:T.stNew;
    tb.append(el("tr",null,
      el("td",null,el("b",null,e[K].join(" ; "))," ",speakBtn(e[K][0],true)),
      el("td",null,e.en.join(" ; ")),
      el("td",{class:"num no-print",title:stTitle,style:"color:"+(isMastered(id)?"var(--vert)":isSeen(id)?"var(--bleu)":"var(--muted)")},st)));
  });
  tbl.append(tb);
  v.append(tbl, el("p",{class:"no-print",style:"font-size:.82rem;color:var(--muted);margin-top:10px"},T.listLegend));
}

/* ═════════ SESSIONS ═════════ */
/* Español → Inglés is the gentler way in, so Years 7–9 start there; Years 10
   and 11 start on the mix, which is what the GCSE asks for. A student can
   change it on the lesson screen either way. */
const KS3=["Y7","Y8","Y9"];
let sess=null, lessonPrefs={dir: KS3.indexOf(yearOf(S.cls))>=0 ? "fren" : "mixte"}, revLen=20;
async function startLesson(uid,lid){
  go("accueil");
  const v=$("#view-accueil"); busy(v);
  await loadLists([lid]);
  v.innerHTML="";
  const u=UNITS[uid], L=u.lessons[lid];
  v.append(
    el("div",{class:"session-bar"},el("button",{class:"btn small ghost",onclick:renderAccueil},T.back)),
    el("h2",null,T.lessonLine(lid.split(".")[1],L.title,L.ids.length)),
    el("div",{class:"card"},
      el("h3",null,T.dirLabel),
      pills([["enfr",T.dirEnFr],["fren",T.dirFrEn],["mixte",T.dirMix],["dict",T.dirDict,!ttsOK]],lessonPrefs.dir,d=>lessonPrefs.dir=d),
      el("div",{class:"btn-row"},
        el("button",{class:"btn primary",onclick:()=>{
          const ids=shuffle(L.ids);
          const q=ids.map((id,i)=>({id,dir:lessonPrefs.dir==="mixte"?(i%2?"fren":"enfr"):lessonPrefs.dir}));
          sess={queue:q,i:0,ok:0,wrong:[],back:renderAccueil,label:T.sessionLabel(uid,lid.split(".")[1]),view:"#view-accueil",lid,silent:false};
          renderQ();
        }},T.startLesson))));
}
async function startLeech(){
  const q=leeches().slice(0,20).map(l=>({id:l.id,dir:l.dir}));
  if(!q.length)return;
  go("accueil"); busy($("#view-accueil"));
  await loadLists(q.map(x=>lessonOf(x.id)));
  sess={queue:shuffle(q),i:0,ok:0,wrong:[],back:renderAccueil,label:T.leechLabel,view:"#view-accueil",lid:"leech",silent:false};
  go("accueil"); renderQ();
}
function renderRevisionConfig(){
  const v=$("#view-revision"); v.innerHTML="";
  // production first, then recognition
  const dueF=[],dueR=[];
  /* due cards come from the store, so nothing has to be loaded to count them */
  const now=Date.now();
  for(const k in S.srs){
    const i=k.lastIndexOf("|"), id=k.slice(0,i), d=k.slice(i+1), r=S.srs[k];
    if(!r || !r.seen || r.due>now || !LESSON_META[lessonOf(id)]) continue;
    (d==="r" ? dueR : dueF).push({id:id, dir:d==="r"?"fren":"enfr"});
  }
  const due=shuffle(dueF).concat(shuffle(dueR));
  v.append(
    el("h2",null,T.reviewTitle),
    el("p",{class:"lede"},due.length?T.reviewLede(due.length):T.reviewEmpty),
    due.length? el("div",{class:"card"},
      el("h3",null,T.nWords),
      pills([["10","10"],["20","20"],["30","30"],["999",T.all]],"20",n=>revLen=+n),
      el("div",{class:"btn-row"},el("button",{class:"btn primary",onclick:()=>{
        sess={queue:due.slice(0,revLen),i:0,ok:0,wrong:[],back:renderRevisionConfig,label:T.reviewLabel,view:"#view-revision",lid:"rev",silent:false};
        busy($("#view-revision"));
        loadLists(sess.queue.map(x=>lessonOf(x.id))).then(renderQ);
      }},T.start))):document.createComment("sin repaso pendiente"));
}

/* ═════════ EXAM ═════════ */
let examUnits=new Set(), examLen=30;
function renderExamConfig(){
  const v=$("#view-examen"); v.innerHTML="";
  v.append(el("h2",null,T.examTitle), el("p",{class:"lede"},T.examLede),
    el("div",{class:"card"}, el("h3",null,T.examUnits)));
  const grid=el("div",{class:"pill-select",style:"margin-top:4px"});
  UNIT_ORDER.forEach(uid=>{
    const b=el("button",{class:examUnits.has(uid)?"on":"",onclick:()=>{
      examUnits.has(uid)?examUnits.delete(uid):examUnits.add(uid);
      b.classList.toggle("on");
    }},uid);
    grid.append(b);
  });
  const card=v.lastChild;
  card.append(grid,
    el("h3",{style:"margin-top:18px"},T.nWords),
    pills([["20","20"],["30","30"],["50","50"]],String(examLen),n=>examLen=+n),
    el("div",{class:"btn-row"},el("button",{class:"btn primary",onclick:async()=>{
      if(!examUnits.size){alert(T.examNeedUnits);return}
      busy($("#view-examen"));
      await loadLists(lessonsOfUnits([...examUnits]));
      const ids=shuffle([...examUnits].flatMap(u=>UNITS[u]?UNITS[u].lessonOrder.flatMap(l=>UNITS[u].lessons[l].ids):[])).slice(0,examLen);
      if(!ids.length){ renderExamConfig(); return; }
      const q=ids.map((id,i)=>({id,dir:i%2?"fren":"enfr"}));
      sess={queue:q,i:0,ok:0,wrong:[],back:renderExamConfig,label:T.examLabel,view:"#view-examen",lid:"exam",silent:true,answers:[]};
      renderQ();
    }},T.examStart)));
}

/* ═════════ question renderer (shared) ═════════ */
function renderQ(){
  const v=$(sess.view);
  hidePad();
  if(sess.i>=sess.queue.length)return sess.silent?examEnd(v):sessionEnd(v);
  v.innerHTML="";
  const p=pct(sess.i,sess.queue.length);
  v.append(el("div",{class:"session-bar"},
    el("button",{class:"btn small ghost",onclick:sess.back},T.quit),
    el("div",{class:"progress"},el("i",{style:"width:"+p+"%"})),
    el("span",{class:"session-count"},`${sess.i+1} / ${sess.queue.length}`),
    sess.silent?null:el("span",{class:"score-pill"},`✓ ${sess.ok}`),
    audioToggle()));
  const {id,dir}=sess.queue[sess.i], e=byId[id];
  const enfr=dir==="enfr", dict=dir==="dict";
  const hasArt=e[K].some(vv=>CFG.artRe.test(vv.toLowerCase()));
  const meta=dict?T.metaDict:enfr?(hasArt?T.metaEnFrArt:T.metaEnFr):T.metaFrEn;
  let promptNode;
  if(dict){
    promptNode=el("div",null,
      el("button",{class:"btn primary",onclick:()=>speak(e[K][0])},T.replay));
    setTimeout(()=>speak(e[K][0]),300);
  } else if(enfr){
    promptNode=el("div",{class:"headword",style:"font-family:var(--font-body);font-weight:600;font-size:1.5rem"},e.en[0]);
  } else {
    promptNode=el("div",{class:"headword"},e[K][0]," ",speakBtn(e[K][0]));
  }
  const others=(dict||enfr)?[]:e[K].slice(1);   // production shows ONE gloss to translate; full set revealed in feedback
  const card=el("div",{class:"entry"},
    el("div",{class:"entry-meta"},`${sess.label} · ${meta}`),
    promptNode,
    others.length&&!sess.silent? el("div",{class:"gramm"},T.alsoPrompt+others.join(" ; ")):null);
  const targetLang = enfr||dict;
  const inp=el("input",{class:"typed",type:"text",autocapitalize:"off",autocomplete:"off",spellcheck:"false",
    placeholder:targetLang?T.phTarget:T.phEn});
  const row=el("div",{class:"btn-row"});
  const check=el("button",{class:"btn primary"},sess.silent?T.next:T.check);
  let done=false;
  function doCheck(){
    if(done)return;
    const res=targetLang? checkFr(inp.value,e,e.en[0]) : checkEn(inp.value,e);
    if(!res&&!sess.silent)return;
    done=true;
    const q=res?res.q:1;
    srsGrade(e.id, dict?"enfr":dir, q);
    if(q>=3)sess.ok++; else sess.wrong.push(e.id);
    if(sess.silent){
      sess.answers.push({id:e.id,dir,given:inp.value.trim(),q});
      sess.i++; renderQ(); return;
    }
    inp.disabled=true; check.disabled=true;
    hidePad();
    let sibs="";
    if(targetLang && q<3){
      const oth=(GLOSS_TO_ENTRIES[xCanonEn(e.en[0])]||[]).filter(x=>x.id!==e.id).map(x=>x[K][0]);
      if(oth.length) sibs=[...new Set(oth)].slice(0,3).join(" · ");
    }
    const fb=el("div",{class:"feedback "+res.cls},res.msg,
        sibs? el("span",{class:"note"},T.sibNote,sibs):null,
        res.alt? el("span",{class:"note"},...T.altNote(res.alt[K][0])):
        res.altTxt? el("span",{class:"note"},...T.altNote(res.altTxt)):null,
        el("span",{class:"note"},
          el("b",null,e[K].join(" ; "))," ",speakBtn(e[K][0],true)," — ",e.en.join(" ; ")));
    /* Translation of a phrase has many valid renderings; where the automatic
       check can't decide, the student judges against the model answer. */
    /* Any card can be glossed with one English word where several are right —
       "unbowed" for "unsubdued". The student judges against the model answer,
       and the claim is recorded so the list can be corrected. */
    if(res.q<4){
      const sg=el("button",{class:"btn small ghost",style:"margin-top:10px",onclick:()=>{
        const r=srsGet(rk(e.id, dict?"enfr":dir));
        r.seen--; if(res.q>=3)r.ok--;                 // undo the automatic mark
        srsGrade(e.id, dict?"enfr":dir, 4);
        if(res.q<3){ sess.ok++; const i=sess.wrong.lastIndexOf(e.id); if(i>=0)sess.wrong.splice(i,1); }
        S.claims = S.claims || [];
        S.claims.push({id:e.id, d:(dict?"enfr":dir), a:String(inp.value||"").slice(0,60),
                       g:e.en[0], t:Date.now()});
        if(S.claims.length>60) S.claims = S.claims.slice(-60);
        save();
        sg.disabled=true; sg.textContent=T.selfDone; fb.className="feedback good";
      }},T.selfOk);
      fb.append(sg);
    }
    card.append(fb, nextBtn());
    autoSpeak(e[K][0]);                                        // correct form revealed → say it
  }
  check.addEventListener("click",doCheck);
  inp.addEventListener("keydown",ev=>{if(ev.key==="Enter")doCheck()});
  row.append(check);
  card.append(inp,row);
  v.append(card);
  if(targetLang) showPad(inp);
  if(!dict && !enfr) setTimeout(()=>autoSpeak(e[K][0]),220);   // target word on screen → say it
  setTimeout(()=>inp.focus(),50);
}
function nextBtn(){
  const b=el("button",{class:"btn primary",onclick:()=>{sess.i++;renderQ()}},T.next);
  setTimeout(()=>b.focus(),50);
  return el("div",{class:"btn-row"},b);
}

/* ---- Signalled answers -------------------------------------------------
   A student pressing "my version counts too" is telling the teacher the list
   is wrong. That has to reach the teacher without waiting for them to hand a
   code in, so the claims are batched and sent once, at the end of the lesson. */
function pendingClaims(){ return (S.claims||[]).filter(c=>!c.s); }
function markClaimsSent(){ (S.claims||[]).forEach(c=>c.s=1); save(); }
function claimLine(c){
  const e=byId[c.id];
  return (e?e[K][0]:c.id)+" ["+c.id+"] — "+c.g+" \u2192 "+c.a;
}
function pushAlert(){
  const p=pendingClaims();
  if(!p.length || !CFG.ALERT_URL) return false;
  try{
    fetch(CFG.ALERT_URL,{method:"POST",mode:"no-cors",keepalive:true,
      headers:{"Content-Type":"text/plain;charset=UTF-8"},
      body:JSON.stringify({app:CFG.prefix,lang:CFG.key,
        who:S.name||T.noName, sid:S.sid||"", when:new Date().toISOString(),
        items:p.map(c=>({id:c.id, word:(byId[c.id]?byId[c.id][K][0]:""),
                         list:c.g, typed:c.a, dir:c.d}))})});
    markClaimsSent();
    return true;
  }catch(e){ return false; }            // never let this break the lesson
}
function claimPanel(){
  const p=pendingClaims();
  if(!p.length) return null;
  const sentAuto=pushAlert();
  const card=el("div",{class:"card",style:"margin-top:14px;border-color:var(--or,#c07a00)"},
    el("h3",null,"\u2691 "+T.flagTitle),
    el("div",{style:"margin-top:6px;font-size:.9rem"},
      p.map(c=>el("div",{style:"padding:3px 0"},claimLine(c)))),
    el("p",{class:"lede",style:"margin:8px 0 0"},sentAuto?T.flagAuto:T.flagLede));
  if(!sentAuto && CFG.FORMS_URL && CFG.FORMS_FIELD_FLAG){
    /* The report rides on the form the student already uses, and carries their
       progress code with it, so the code question can stay compulsory. */
    /* This used to build its own address, and with the code field unset it sent
       the teacher a report carrying no progress code and left nothing on the
       clipboard either. It now goes through the one send route, so the flagged
       answers ride along with the name and the code like everything else. */
    const b=el("button",{class:"btn",onclick:async()=>{
      b.disabled=true;
      await sendNow("&"+CFG.FORMS_FIELD_FLAG+"="+encodeURIComponent(p.map(claimLine).join("  |  ")));
      markClaimsSent(); b.textContent=T.flagSent;
    }},T.flagSend);
    card.append(el("div",{class:"btn-row"},b));
  }
  return card;
}
addEventListener("pagehide", ()=>{ try{ pushAlert(); }catch(e){} });
function sessionEnd(v){
  hidePad();
  v.innerHTML="";
  S.sessions.push({t:Date.now(),n:sess.queue.length,ok:sess.ok,label:sess.label,lid:sess.lid});save();
  /* Several of these are null when there is nothing to show, and DOM append
     turns null into the text "null". */
  v.append(
    el("h2",null,T.sessDone),
    el("div",{class:"kpi-row"},
      kpi(sess.queue.length,T.qs), kpi(sess.ok,T.right), kpi(pct(sess.ok,sess.queue.length)+" %",T.prec)),
    /* above the list of words to review, which can run to thirty lines:
       a panel below that is a panel nobody scrolls to */
    sendPanel(),
    sess.wrong.length? el("div",{class:"card"},
      el("h3",null,T.toReview),
      el("div",{style:"margin-top:8px"},
        [...new Set(sess.wrong)].map(id=>el("div",{style:"padding:4px 0;border-bottom:1px solid var(--line)"},
          el("b",null,byId[id][K].join(" ; "))," ",speakBtn(byId[id][K][0],true)," — ",byId[id].en.join(" ; "))))):null,
    claimPanel(),
    el("div",{class:"btn-row"},
      el("button",{class:"btn primary",onclick:sess.back},T.cont),
      el("button",{class:"btn",onclick:()=>go("suivi")},T.seeProgress)));
  renderSendBar();
}
function examEnd(v){
  hidePad(); v.innerHTML="";
  const p=pct(sess.ok,sess.queue.length);
  S.exams.push({t:Date.now(),units:[...examUnits],n:sess.queue.length,ok:sess.ok,pct:p});
  S.sessions.push({t:Date.now(),n:sess.queue.length,ok:sess.ok,label:T.examLabel,lid:"exam"});save();
  v.append(
    el("h2",null,T.examDone),
    el("div",{class:"kpi-row"},
      kpi(sess.queue.length,T.qs), kpi(sess.ok,T.right), kpi(p+" %",T.examScore)),
    sendPanel());
  const wrongs=sess.answers.filter(a=>a.q<3);
  if(wrongs.length){
    const card=el("div",{class:"card"},el("h3",null,T.examWrong));
    wrongs.forEach(a=>{
      const e=byId[a.id];
      card.append(el("div",{style:"padding:6px 0;border-bottom:1px solid var(--line)"},
        el("div",null,el("b",null,e[K].join(" ; "))," ",speakBtn(e[K][0],true)," — ",e.en.join(" ; ")),
        el("div",{style:"font-size:.85rem;color:var(--rouge)"},T.examGiven+": "+(a.given||T.examNone))));
    });
    v.append(card);
  }
  v.append(el("div",{class:"btn-row"},
    el("button",{class:"btn primary",onclick:renderExamConfig},T.examAgain),
    el("button",{class:"btn",onclick:()=>go("suivi")},T.seeProgress)));
  renderSendBar();
}

/* ═════════ SUIVI ═════════ */
function renderSuivi(){
  const v=$("#view-suivi"); v.innerHTML="";
  const tAll=aggAll();
  const mast=tAll.nMast, dueN=tAll.due;
  const fa=tAll.fTries, fc=tAll.fOk, ra=tAll.rTries, rc=tAll.rOk;
  v.append(
    el("h2",null,T.progressTitle),
    el("p",{class:"lede"},T.progressLede),
    el("div",{class:"kpi-row"},
      kpi(tAll.nSeen,T.kSeen+CORPUS_TOTAL),
      kpi(mast,T.kMast),
      kpi(dueN,T.kDue),
      kpi(fa?pct(fc,fa)+" %":"—",T.kProd),
      kpi(ra?pct(rc,ra)+" %":"—",T.kRec)),
    el("div",{class:"section-label"},T.byUnit));
  const tbl=el("table",{class:"stats"},
    el("thead",null,el("tr",null,el("th",null,T.thUnit),el("th",null,T.thSeen),el("th",null,T.thMast),el("th",null,T.thAcc),el("th",null,""))));
  const tb=el("tbody");
  UNIT_ORDER.forEach(uid=>{
    const u=UNITS[uid], t=aggU(uid);
    const ua=t.tries, uc=t.ok, acc=pct(uc,ua);
    tb.append(el("tr",null,
      el("td",null,el("b",null,uid)," ",u.name),
      el("td",{class:"num"},`${t.nSeen}/${u.n}`),
      el("td",{class:"num"},String(t.nMast)),
      el("td",{class:"num"},ua?acc+" %":"—"),
      el("td",null,el("div",{class:"bar"},el("i",{class:acc<60?"low":acc<80?"warn":"",style:"width:"+(ua?acc:0)+"%"})))));
  });
  tbl.append(tb); v.append(tbl);

  /* weakest lessons */
  const rows=[];
  UNIT_ORDER.forEach(uid=>UNITS[uid].lessonOrder.forEach(lid=>{
    const a3=aggL(lid), la=a3.tries, lc=a3.ok;
    if(la>=5)rows.push({uid,lid,title:UNITS[uid].lessons[lid].title,acc:pct(lc,la)});
  }));
  rows.sort((x,y)=>x.acc-y.acc);
  v.append(el("div",{class:"section-label"},T.weakLessons));
  if(!rows.length)v.append(el("p",{style:"color:var(--muted)"},T.weakEmpty));
  else{
    const w=el("div",{class:"card"});
    rows.slice(0,8).forEach(r=>w.append(el("div",{style:"display:flex;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line)"},
      el("div",{style:"flex:1"},el("b",null,T.weakLine(r.uid,r.lid.split(".")[1]))," — "+r.title),
      el("span",{class:"session-count"},r.acc+" %"),
      el("button",{class:"btn small primary",onclick:()=>startLesson(r.uid,r.lid)},T.practise))));
    v.append(w);
  }

  /* exam history */
  if(S.exams.length){
    v.append(el("div",{class:"section-label"},T.examsHist));
    const w=el("div",{class:"card"});
    S.exams.slice(-8).reverse().forEach(x=>w.append(el("div",{style:"display:flex;gap:12px;padding:4px 0;border-bottom:1px solid var(--line)"},
      el("span",{class:"session-count"},new Date(x.t).toLocaleDateString()),
      el("span",{style:"flex:1"},x.units.join(", ")),
      el("b",null,x.pct+" %"),
      el("span",{class:"session-count"},x.ok+"/"+x.n))));
    v.append(w);
  }

  /* export */
  const code=buildExportCode();
  const ta=el("textarea",{class:"code",readonly:""},code);
  v.append(el("div",{class:"section-label"},T.sendTitle),
    el("div",{class:"card"},
      el("p",{style:"margin:0 0 10px"},CFG.FORMS_URL?((CFG.FORMS_FIELD_NAME&&CFG.FORMS_FIELD_CODE)?T.sendFormsTxt:T.sendPasteTxt):T.sendCopyTxt),
      ta,
      el("div",{class:"btn-row"},
        CFG.FORMS_URL? el("button",{class:"btn primary",onclick:sendNow},T.sendForms):null,
        el("button",{class:"btn"+(CFG.FORMS_URL?" ghost":" primary"),onclick:async()=>{try{await navigator.clipboard.writeText(code)}catch(e){ta.select();document.execCommand("copy")}}},T.copyCode),
        el("button",{class:"btn ghost",onclick:downloadBackup},T.backup),
        el("button",{class:"btn ghost",onclick:restoreBackup},T.restore),
        el("button",{class:"btn ghost",style:"color:var(--rouge);border-color:var(--rouge)",onclick:()=>{
          if(confirm(T.resetConfirm)){localStorage.removeItem(CFG.ls);S=load();renderSuivi()}
        }},T.reset))));
}
function buildExportCode(){
  const u={};
  UNIT_ORDER.forEach(uid=>{
    const t=aggU(uid);
    if(!t.nSeen)return;
    u[uid]=[t.nSeen,UNITS[uid].n,t.nMast,pct(t.ok,t.tries)];
  });
  let l=[];
  UNIT_ORDER.forEach(uid=>UNITS[uid].lessonOrder.forEach(lid=>{
    const t=aggL(lid); if(!t.nSeen)return;
    l.push([lid,t.nSeen,UNITS[uid].lessons[lid].n,pct(t.ok,t.tries)]);
  }));
  const x=S.exams.slice(-5).map(e2=>[Math.round(e2.t/DAY),e2.pct,e2.n]);
  const a2=assignment();
  /* answers the student claimed were also right — the teacher decides */
  const cl=(S.claims||[]).slice(-25).map(c=>[c.id,c.a,c.g]);
  const payload={v:2,n:S.name||T.noName,t:Date.now(),k:S.cls||"",
    c:cl,
    o:{seen:aggAll().nSeen,total:CORPUS_TOTAL,
       mast:aggAll().nMast,sess:S.sessions.length,lee:leeches().length},
    u,l,x, a:a2?{lab:a2.label,done:a2.done}:null};
  let code=CFG.prefix+btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  if(code.length>3800){ // MS Forms long-answer safety: keep weakest 30 lessons
    payload.l=l.slice().sort((p,q2)=>p[3]-q2[3]).slice(0,30);
    payload.lt=true;
    code=CFG.prefix+btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  /* Still long: the claims are the next thing to go, keep the most recent few. */
  if(code.length>3800 && payload.c && payload.c.length>8){
    payload.c=payload.c.slice(-8);
    code=CFG.prefix+btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  }
  return code;
}
function downloadBackup(){
  const blob=new Blob([JSON.stringify(S)],{type:"application/json"});
  const a=el("a",{href:URL.createObjectURL(blob),download:T.backupFile});a.click();
}
function restoreBackup(){
  const inp=el("input",{type:"file",accept:".json"});
  inp.addEventListener("change",()=>{
    const f=inp.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=()=>{try{const s=JSON.parse(r.result);if(!s.srs)throw 0;localStorage.setItem(CFG.ls,r.result);S=load();save();renderSuivi();alert(T.restored)}
      catch(e){alert(T.badFile)}};
    r.readAsText(f);
  });
  inp.click();
}

/* ───────── deep links ─────────
   A homework link has to land on one list, not on the front page. The hash
   carries a lesson id — #U6.1 opens that list's start screen, #U6 opens the
   unit with its lists showing — so a cell in the scheme of work can point a
   student straight at the words they were set.

   Ids are matched case-insensitively, and #U6.1/practicar deals the first
   card immediately. An id that no longer exists falls back to the front page
   rather than a blank screen, so a link in an old spreadsheet still works. */
function deepLink(){
  /* Both forms are accepted. The fragment is the tidy one; the query string
     is the one that survives being pasted through Teams, SharePoint and mail
     clients, some of which drop everything after the #. */
  var h = "";
  try {
    h = decodeURIComponent((location.hash || "").replace(/^#\/?/, "")).trim();
    if(!h){
      var q = /[?&](?:l|lista|liste|lesson|lec|list)=([^&]+)/i.exec(location.search || "");
      if(q) h = decodeURIComponent(q[1]).trim();
    }
  } catch(e){ h = (location.hash || "").replace(/^#\/?/, "").trim(); }
  if(!h) return false;
  var go2 = /\/(practicar|practise|pratiquer|go)$/i.test(h);
  h = h.replace(/\/(practicar|practise|pratiquer|go)$/i, "");
  var m = /^([A-Za-z][A-Za-z0-9]*)(?:[.\-_](\d+))?$/.exec(h);
  if(!m) return false;
  var uid = UNIT_ORDER.filter(function(u){ return u.toLowerCase() === m[1].toLowerCase(); })[0];
  if(!uid) return false;
  if(m[2]){
    var lid = uid + "." + m[2];
    if(UNITS[uid] && UNITS[uid].lessons[lid]){
      startLesson(uid, lid);
      if(go2){ var b = document.querySelector("#view-accueil .btn.primary"); if(b) b.click(); }
      return true;
    }
  }
  openUnit = uid;                       // unknown lesson: show the unit, not nothing
  go("accueil");
  var t = document.querySelector("#view-accueil .unit-tile");
  if(t && t.scrollIntoView) try{ t.scrollIntoView({block:"start"}); }catch(e){}
  return true;
}
window.addEventListener("hashchange", function(){ deepLink() || go("accueil"); });

/* A small window onto the inside, for checking a deployment and for support:
   which lists are in memory, what the progress store adds up to, what the
   code would say. Read-only — nothing here changes a student's work. */
Object.assign(window.BBA, {
  loaded:()=>Object.keys(LOADED),
  missing:()=>MISSING.slice(),
  ids:()=>Object.keys(byId),
  totals:()=>({total:CORPUS_TOTAL, lessons:Object.keys(LESSON_META).length,
               units:UNIT_ORDER.length, years:YEARS.length}),
  agg:()=>aggAll(),
  code:()=>buildExportCode(),
  load:loadLists,
  state:()=>({name:S.name||"", cls:S.cls||""})
});

if(!deepLink()) go("accueil");
renderSendBar();
})();
