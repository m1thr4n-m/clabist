/* CLab client-side. All PubChem/Wikipedia/YouTube traffic goes through /api/*.
   Quiz answers, Lipinski logic, and certificate signing live on the server. */
var $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
var LS={g(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},s(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
var rnd=n=>Math.floor(Math.random()*n),shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a},pick=(a,n)=>shuffle(a).slice(0,n);
var tok=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
var watched=LS.g('vl_w',[]),passed=LS.g('vl_p',false),score=LS.g('vl_s',0),certToken=LS.g('vl_t','');

var SY="H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(' ');
var NM="Hydrogen,Helium,Lithium,Beryllium,Boron,Carbon,Nitrogen,Oxygen,Fluorine,Neon,Sodium,Magnesium,Aluminium,Silicon,Phosphorus,Sulfur,Chlorine,Argon,Potassium,Calcium,Scandium,Titanium,Vanadium,Chromium,Manganese,Iron,Cobalt,Nickel,Copper,Zinc,Gallium,Germanium,Arsenic,Selenium,Bromine,Krypton,Rubidium,Strontium,Yttrium,Zirconium,Niobium,Molybdenum,Technetium,Ruthenium,Rhodium,Palladium,Silver,Cadmium,Indium,Tin,Antimony,Tellurium,Iodine,Xenon,Caesium,Barium,Lanthanum,Cerium,Praseodymium,Neodymium,Promethium,Samarium,Europium,Gadolinium,Terbium,Dysprosium,Holmium,Erbium,Thulium,Ytterbium,Lutetium,Hafnium,Tantalum,Tungsten,Rhenium,Osmium,Iridium,Platinum,Gold,Mercury,Thallium,Lead,Bismuth,Polonium,Astatine,Radon,Francium,Radium,Actinium,Thorium,Protactinium,Uranium,Neptunium,Plutonium,Americium,Curium,Berkelium,Californium,Einsteinium,Fermium,Mendelevium,Nobelium,Lawrencium,Rutherfordium,Dubnium,Seaborgium,Bohrium,Hassium,Meitnerium,Darmstadtium,Roentgenium,Copernicium,Nihonium,Flerovium,Moscovium,Livermorium,Tennessine,Oganesson".split(',');
var CAT={alk:['Alkali metal','var(--k-alk)'],ae:['Alkaline earth','var(--k-ae)'],tm:['Transition metal','var(--k-tm)'],pt:['Post-transition','var(--k-pt)'],md:['Metalloid','var(--k-md)'],nm:['Reactive nonmetal','var(--k-nm)'],hal:['Halogen','var(--k-hal)'],ng:['Noble gas','var(--k-ng)'],la:['Lanthanide','var(--k-la)'],ac:['Actinide','var(--k-ac)']};
var has=(n,a)=>a.includes(n);
function catOf(n){if(has(n,[3,11,19,37,55,87]))return'alk';if(has(n,[4,12,20,38,56,88]))return'ae';if(n>=57&&n<=71)return'la';if(n>=89&&n<=103)return'ac';if(has(n,[2,10,18,36,54,86,118]))return'ng';if(has(n,[9,17,35,53,85,117]))return'hal';if(has(n,[5,14,32,33,51,52]))return'md';if(has(n,[1,6,7,8,15,16,34]))return'nm';if(has(n,[13,31,49,50,81,82,83,84,113,114,115,116]))return'pt';return'tm'}
function pos(n){if(n===1)return[1,1];if(n===2)return[18,1];if(n>=57&&n<=71)return[n-54,9];if(n>=89&&n<=103)return[n-86,10];let p=2,s=3;for(const q of[[3,2],[11,3],[19,4],[37,5],[55,6],[87,7]])if(n>=q[0]){s=q[0];p=q[1]}const i=n-s;if(i<2)return[i+1,p];if(p<=3)return[i+11,p];if(p<=5)return[i+1,p];return[i-13,p]}
var EL=SY.map((s,i)=>{const n=i+1,[x,y]=pos(n);return{n,s,name:NM[i],x,y,cat:catOf(n)}});

var NAMES=['aspirin','caffeine','ibuprofen','paracetamol','dopamine','glucose','water','ethanol','methane','benzene','acetone','acetic acid','ammonia','carbon dioxide','glycine','urea','naproxen','morphine','nicotine','ascorbic acid','cholesterol','ethylene','toluene','phenol','glycerol','sucrose','lactic acid','citric acid','methanol','formic acid','chloroform','hydrogen peroxide','sulfuric acid','serotonin','adrenaline','melatonin','testosterone','estradiol','penicillin G','metformin','atorvastatin','diazepam','vanillin','menthol','limonene','capsaicin','camphor','naphthalene','adenine','propane'];
var CIDS=[2244,2519,3672,1983,681,5793,962,702,297,241,180,176,222,280,750,1176,156391,5288826,89594,54670067,5997,6325,1140,996,753,5988,612,311,887,284,174,6212,3283,784,1118,5202,5816,896,6013,5757,5904,4091,60823,3016];
var FORMS=['C9H8O4','C6H12O6','H2O','C2H6O','CH4','C8H10N4O2','C6H6','C3H6O','C2H4O2','NH3','CO2','C13H18O2'];

function toast(m){const t=$('toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2200)}
function copyTxt(t){const ok=()=>toast('Copied');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,()=>fb());else fb();function fb(){const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){toast('Copy failed')}a.remove()}}
window.$=$;window.copyTxt=copyTxt;

async function wiki(t){try{const r=await fetch('/api/wiki?t='+encodeURIComponent(t),{signal:AbortSignal.timeout(7000)});if(!r.ok)return null;const j=await r.json();if(j.type&&j.type.includes('disambiguation'))return null;return j}catch(e){return null}}
function ac(inp,dl){let t;inp.addEventListener('input',()=>{clearTimeout(t);const v=inp.value.trim();if(v.length<2||/^cid/i.test(v))return;t=setTimeout(async()=>{try{const r=await fetch('/api/ac?q='+encodeURIComponent(v));const j=await r.json();dl.innerHTML=((j.dictionary_terms&&j.dictionary_terms.compound)||[]).map(x=>`<option value="${esc(x)}">`).join('')}catch(e){}},250)})}

function slider(box){const t=box.querySelector('.slt');if(!t)return;const upd=()=>{const m=t.scrollWidth-t.clientWidth;box.classList.toggle('hl-l',t.scrollLeft>4);box.classList.toggle('hl-r',t.scrollLeft<m-4)};
 t.addEventListener('scroll',upd,{passive:true});addEventListener('resize',upd);if('ResizeObserver' in window)new ResizeObserver(upd).observe(t);new MutationObserver(()=>requestAnimationFrame(upd)).observe(t,{childList:true,subtree:true});
 ['l','r'].forEach(d=>{const b=document.createElement('button');b.className='sa '+d;b.type='button';b.setAttribute('aria-label',d==='l'?'Scroll left':'Scroll right');b.onclick=()=>t.scrollBy({left:(d==='l'?-1:1)*t.clientWidth*.8,behavior:'smooth'});box.appendChild(b)});box.upd=upd;upd()}

var ROUTES={home:'/',elements:'/elements',compounds:'/compounds',course:'/course',quiz:'/quiz',cert:'/certificate'};
var FROM_PATH=Object.fromEntries(Object.entries(ROUTES).map(([k,v])=>[v,k]));
var TITLES={home:'CLab Virtual Chemistry Laboratory | SRM IST',elements:'Periodic Table · CLab',compounds:'Compounds · CLab',course:'Course · CLab',quiz:'Quiz · CLab',cert:'Certificate · CLab'};
function pathFor(t){return ROUTES[t]||'/'}
function tabFor(p){const c=p.replace(/\/+$/,'')||'/';return FROM_PATH[c]||'home'}
function closeNav(){$('nav').classList.remove('on');$('burger').classList.remove('x');$('burger').setAttribute('aria-expanded','false')}
function tab(t,push=true){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+t));document.querySelectorAll('#nav [data-t]').forEach(b=>b.classList.toggle('on',b.dataset.t===t));closeNav();scrollTo(0,0);
 if(t==='quiz')quizInit();if(t==='cert')$('lock').style.display=passed?'none':'block';if(t==='elements'){rollESug();document.querySelectorAll('#v-elements .sl').forEach(s=>s.upd&&s.upd())}if(t==='compounds')rollQuick();
 if(push){const p=pathFor(t);if(location.pathname!==p)history.pushState({tab:t},'',p);document.title=TITLES[t]}}
document.querySelectorAll('[data-t]').forEach(el=>{el.addEventListener('click',e=>{if(el.tagName==='A')e.preventDefault();tab(el.dataset.t)})});
$('burger').onclick=()=>{const o=$('nav').classList.toggle('on');$('burger').classList.toggle('x',o);$('burger').setAttribute('aria-expanded',o)};
function modal(h){$('sb2').innerHTML='<button class="btn o s x2" onclick="$(\'sh\').classList.remove(\'on\')">Close</button>'+h;$('sh').classList.add('on');$('sb2').scrollTop=0}
$('sh').onclick=e=>{if(e.target.id==='sh')$('sh').classList.remove('on')};
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('sh').classList.remove('on')});

function refresh(){const n=watched.length;$('pgb').style.width=n*20+'%';$('cnt').textContent=n+' of 5 watched';$('toQuiz').disabled=n<5;
 const S={course:n===5?['Done','ok']:[n+'/5',''],quiz:passed?[score+'%','ok']:n<5?['Locked','lk']:['Open',''],cert:passed?['Ready','ok']:['Locked','lk']};
 document.querySelectorAll('[data-sf]').forEach(el=>{const x=S[el.dataset.sf];el.textContent=x[0];el.className='st '+x[1]});
 document.querySelectorAll('.vc').forEach((c,i)=>c.classList.toggle('done',watched.includes(i)))}

function rollTry(){const n=pick(NAMES,2),it=shuffle([n[0],n[1],'CID:'+pick(CIDS,1)[0],pick(FORMS,1)[0]]);$('try').innerHTML='Try '+it.map(q=>`<button data-q="${esc(q)}">${esc(q)}</button>`).join('')}
function rollQuick(){$('quick').innerHTML=pick(NAMES,6).map(q=>`<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')+'<button class="chip a" id="qr">Random compound</button>';$('qr').onclick=()=>search(pick(NAMES,1)[0])}
async function rollPicks(){const box=$('picks');box.innerHTML=Array(8).fill('<div class="mt"><div class="im sk"></div><div class="tx"><div class="sk" style="height:14px;margin-bottom:6px"></div><div class="sk" style="height:12px;width:60%"></div></div></div>').join('');
 try{const j=await(await fetch('/api/picks')).json();box.innerHTML=j.properties.map((c,i)=>`<button class="mt" style="--d:${i}" data-q="CID:${c.CID}"><div class="im"><img alt="" loading="lazy" src="/api/img?id=${c.CID}&size=240x240"></div><div class="tx"><b>${esc(c.Title||'CID '+c.CID)}</b><span>${esc(c.MolecularFormula||'')}</span></div></button>`).join('')}catch(e){box.innerHTML='<p class="m">Molecules could not load. Check your internet connection and press Shuffle.</p>'}}
$('shuf').onclick=rollPicks;
document.addEventListener('click',e=>{const b=e.target.closest('[data-q]');if(b){e.preventDefault();$('sh').classList.remove('on');search(b.dataset.q)}});
$('bAdv').onclick=()=>{$('adv').classList.toggle('on');$('bAdv').classList.toggle('on')};
var hist=LS.g('vl_h',[]);
$('bHis').onclick=()=>modal('<h2>History</h2>'+(hist.length?hist.map(h=>`<p><a href="#" data-q="${esc(h)}">${esc(h)}</a></p>`).join(''):'<p class="m">No searches yet.</p>'));
$('bHelp').onclick=()=>modal('<h2>Help</h2><p>Type a compound name such as aspirin, a CID such as CID:2244, a formula such as C9H8O4, or a SMILES string.</p><p>Under Advanced you can force one search type. The arrow button opens a .sdf or .mol file in 3D. Everything loads live, so you need an internet connection.</p>');
$('bHex').onclick=()=>{$('st').value='smiles';$('adv').classList.add('on');$('bAdv').classList.add('on');$('hq').focus()};
$('bUp').onclick=()=>$('fup').click();
$('fup').onchange=e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{modal('<h2>'+esc(f.name)+'</h2><div class="pn2"><div class="fr"><div id="uv" style="position:absolute;inset:0"></div></div></div>');try{const v=$3Dmol.createViewer($('uv'),{backgroundColor:tok('--c-hero')});v.addModel(t,/\.mol$/i.test(f.name)?'mol':'sdf');v.setStyle({},STY.ball);v.zoomTo();v.render()}catch(x){$('uv').innerHTML='<div class="err">This file could not be read as a molecule. Use .sdf or .mol.</div>'}});e.target.value=''};
var hq=$('hq');ac(hq,$('dl1'));ac($('sin'),$('dl2'));
$('hf').onsubmit=e=>{e.preventDefault();search($('hq').value)};$('sf').onsubmit=e=>{e.preventDefault();search($('sin').value)};

/* ---- periodic table ---- */
var grid=$('grid'),tiles=[],labs=[],pin=null,filt=null,qs='',curEl=null;
for(let g=1;g<=18;g++){const d=document.createElement('div');d.className='gl';d.style.cssText=`grid-column:${g+1};grid-row:1`;d.textContent=g;grid.appendChild(d);labs.push({el:d,k:'g',n:g})}
for(let p=1;p<=7;p++){const d=document.createElement('div');d.className='gl';d.style.cssText=`grid-column:1;grid-row:${p+1}`;d.textContent=p;grid.appendChild(d);labs.push({el:d,k:'p',n:p})}
function hl(e){grid.classList.add('hl');const pr=e.y<=7?e.y:(e.y===9?6:7);tiles.forEach(t=>{const r=e.y<=7?(t.e.x===e.x&&t.e.y<=7)||t.e.y===e.y:t.e.y===e.y;t.el.classList.toggle('rel',r);t.el.classList.toggle('cur',t.e===e)});labs.forEach(l=>l.el.classList.toggle('rel',(l.k==='g'&&e.y<=7&&l.n===e.x)||(l.k==='p'&&l.n===pr)))}
function unhl(){grid.classList.remove('hl');tiles.forEach(t=>t.el.classList.remove('rel','cur'));labs.forEach(l=>l.el.classList.remove('rel'))}
EL.forEach(e=>{const b=document.createElement('button');b.className='t';b.setAttribute('aria-label',e.name);b.style.cssText=`--d:${e.n*6};--ct:${CAT[e.cat][1]};grid-column:${e.x+1};grid-row:${e.y+1}`;b.innerHTML=`<span class="n">${e.n}</span><span class="s">${e.s}</span><span class="nm">${e.name}</span>`;b.onclick=()=>{pin=e;hl(e);openEl(e)};b.onpointerenter=()=>hl(e);b.onfocus=()=>hl(e);grid.appendChild(b);tiles.push({el:b,e})});
[[4,7,'57–71'],[4,8,'89–103']].forEach(([c,r,t])=>{const d=document.createElement('div');d.className='ph2';d.style.cssText=`grid-column:${c};grid-row:${r}`;d.textContent=t;grid.appendChild(d)});
[[10,'Lanthanides'],[11,'Actinides']].forEach(([r,t])=>{const d=document.createElement('div');d.className='gt';d.style.cssText=`grid-column:2/4;grid-row:${r}`;d.textContent=t;grid.appendChild(d)});
var gp=document.createElement('div');gp.className='gp';gp.style.cssText='grid-column:1;grid-row:9';grid.appendChild(gp);
grid.onpointerleave=()=>pin?hl(pin):unhl();
document.addEventListener('click',ev=>{if(pin&&!ev.target.closest('#grid')&&!ev.target.closest('#sh')&&!ev.target.closest('#esug')&&!ev.target.closest('#rndE')){pin=null;unhl()}});
$('lg').innerHTML=Object.entries(CAT).map(([k,v])=>`<button data-k="${k}" style="--ct:${v[1]}"><span>${v[0]}</span><em>${EL.filter(e=>e.cat===k).length}</em></button>`).join('');
$('lg').onclick=e=>{const b=e.target.closest('button');if(!b)return;filt=filt===b.dataset.k?null:b.dataset.k;document.querySelectorAll('#lg button').forEach(c=>c.classList.toggle('on',c.dataset.k===filt));applyF()};
function applyF(){let n=0;const ok=e=>(!filt||e.cat===filt)&&(!qs||e.name.toLowerCase().includes(qs)||e.s.toLowerCase()===qs||String(e.n)===qs);
 tiles.forEach(t=>{const m=ok(t.e);t.el.classList.toggle('dim',!m);if(m)n++});$('status').textContent=n+' of 118 shown'}
$('q').oninput=e=>{qs=e.target.value.trim().toLowerCase();applyF()};
function rollESug(){$('esug').innerHTML=pick(EL,6).map(e=>`<button class="chip" data-e="${e.n}"><i style="width:10px;height:10px;border-radius:50%;background:${CAT[e.cat][1]}"></i>${e.name}</button>`).join('')}
function selectEl(e,open){pin=e;hl(e);tiles[e.n-1].el.scrollIntoView({inline:'center',block:'nearest',behavior:'smooth'});if(open)openEl(e)}
$('esug').onclick=e=>{const b=e.target.closest('[data-e]');if(b)selectEl(EL[b.dataset.e-1],true)};
$('rndE').onclick=()=>selectEl(EL[rnd(118)],true);

var PT=null,PTMAX={};
async function loadPT(){if(PT)return PT;try{PT=await(await fetch('/api/elements')).json();
 ['Electronegativity','AtomicRadius','IonizationEnergy'].forEach(k=>PTMAX[k]=Math.max(...Object.values(PT).map(r=>parseFloat(r[k])||0)));return PT}catch(e){return {}}}
var bar=(l,v,max,u)=>`<div class="mt2"><span>${l}</span><div class="bar2"><i style="--w:${Math.min(100,v/max*100).toFixed(1)}%"></i></div><span>${v}${u||''}</span></div>`;
function clip(t,n){if(!t||t.length<=n)return t||'';const c=t.slice(0,n),i=c.lastIndexOf('. ');return(i>n*.5?c.slice(0,i+1):c.replace(/\s+\S*$/,'')+'…')}
async function openEl(e){curEl=e;const c=CAT[e.cat],pr=EL[(e.n+116)%118],nx=EL[e.n%118];
 modal(`<div class="elh"><div class="elb" style="--ct:${c[1]}">${e.s}</div><div><h2>${e.name}</h2><span class="m">${c[0]}, atomic number ${e.n}</span></div></div><div id="ew"></div><div id="eb"><div class="sp"></div></div><div class="nv"><button class="btn o s" id="ep">← ${pr.name}</button><button class="btn o s" id="en">${nx.name} →</button></div>`);
 $('ep').onclick=()=>{selectEl(pr,false);openEl(pr)};$('en').onclick=()=>{selectEl(nx,false);openEl(nx)};
 const[pt,wk]=await Promise.all([loadPT(),wiki(e.n===80?'Mercury_(element)':e.name)]);if(curEl!==e||!$('eb'))return;
 const d=pt[e.n]||{},num=k=>parseFloat(d[k]),per=e.y<=7?e.y:(e.y===9?6:7);
 if(wk&&wk.extract)$('ew').innerHTML=`<p class="wk">${esc(clip(wk.extract,360))}</p><p class="wl m">Summary from Wikipedia${wk.content_urls?` · <a href="${esc(wk.content_urls.desktop.page)}" target="_blank" rel="noopener">Read more</a>`:''}</p>`;
 const R=[['Group',e.y<=7?e.x:'f-block'],['Period',per],['Atomic mass',d.AtomicMass&&(+d.AtomicMass).toFixed(3)+' u'],['Electron configuration',d.ElectronConfiguration],['Standard state',d.StandardState],['Oxidation states',d.OxidationStates],['Melting point',d.MeltingPoint&&d.MeltingPoint+' K'],['Boiling point',d.BoilingPoint&&d.BoilingPoint+' K'],['Density',d.Density&&d.Density+' g/cm³'],['Discovered',d.YearDiscovered]].filter(r=>r[1]);
 let m='';if(num('Electronegativity'))m+=bar('Electronegativity',num('Electronegativity'),PTMAX.Electronegativity);if(num('AtomicRadius'))m+=bar('Atomic radius',num('AtomicRadius'),PTMAX.AtomicRadius,' pm');if(num('IonizationEnergy'))m+=bar('Ionization energy',num('IonizationEnergy'),PTMAX.IonizationEnergy,' eV');
 $('eb').innerHTML=(m?`<div style="margin:6px 0 16px">${m}</div>`:'')+(R.length>2?'<table class="d">'+R.map(r=>`<tr><td>${r[0]}</td><td><b>${esc(r[1])}</b></td></tr>`).join('')+'</table>':'<div class="err">Element data could not load. Check your internet connection and open the element again.</div>')}

/* ---- compounds ---- */
var STY={ball:{stick:{radius:.14,colorscheme:'Jmol'},sphere:{scale:.28,colorscheme:'Jmol'}},stick:{stick:{radius:.2,colorscheme:'Jmol'}},space:{sphere:{colorscheme:'Jmol'}}};
var V=null,sty='ball',spin=true,seq=0,CUR=null;
function setSty(k){sty=k;document.querySelectorAll('#sgs button').forEach(b=>b.classList.toggle('on',b.dataset.st===k));if(V){V.setStyle({},STY[k]);V.render()}}
function kind(q){const t=$('st').value;if(t!=='auto')return t;if(/^cid:?\s*\d+$/i.test(q))return'cid';if(/^([A-Z][a-z]?\d*)+$/.test(q)&&/\d/.test(q))return'formula';if(/[=#()\[\]@\/\\]/.test(q))return'smiles';return'name'}
async function getCid(q,k){if(k==='cid')return q.replace(/\D/g,'');const r=await fetch('/api/find?type='+encodeURIComponent(k)+'&q='+encodeURIComponent(q));if(!r.ok)throw new Error('not found');return(await r.json()).id}
var num=v=>{const n=parseFloat(v);return isNaN(n)?null:n},fmt=(v,u)=>{const n=num(v);if(n===null)return'n/a';return(Math.abs(n)>=100?n.toFixed(1):n.toFixed(2)).replace(/\.?0+$/,'')+(u||'')};
var stat=(l,v,u)=>`<div class="stt"><b>${fmt(v,u)}</b><span>${l}</span></div>`;
function meter(l,v,lim){const n=num(v);if(n===null)return`<div class="mt2"><span>${l}</span><div class="bar2"></div><span>n/a</span></div>`;const bad=n>lim;return`<div class="mt2"><span>${l}</span><div class="bar2 lim ${bad?'bad':'ok'}"><i style="--w:${Math.min(100,n/(lim*1.5)*100).toFixed(1)}%"></i></div><span>${Math.round(n*10)/10} / ${lim}</span></div>`}
function viol(c){let v=0;if(num(c.MolecularWeight)>500)v++;if(num(c.XLogP)>5)v++;if(num(c.HBondDonorCount)>5)v++;if(num(c.HBondAcceptorCount)>10)v++;return v}
function row(a,b,o){if(b===undefined||b===null||b==='')return'';return`<tr><td>${a}</td><td${o&&o.m?' class="mn"':''}>${esc(b)}${o&&o.cp?`<button class="cp" data-c="${esc(b)}">Copy</button>`:''}</td></tr>`}
function atomKey(f){const s=[...new Set((f||'').match(/[A-Z][a-z]?/g)||[])].filter(x=>['C','H','N','O','S','P','F','Cl','Br','I','Na'].includes(x));return s.map(x=>`<span><i style="--ac:var(--a-${x})"></i>${x}</span>`).join('')}
function view2(c,cid,q){const v=viol(c),name=c.Title||q;
 return`<h2 class="ct">${esc(name)}</h2><div class="meta"><span>CID ${cid}</span><span>${esc(c.MolecularFormula)}</span><span>${fmt(c.MolecularWeight,' g/mol')}</span></div>
 <div class="row" style="margin-bottom:18px"><button class="btn o s" id="dl">Download SDF</button><button class="btn o
