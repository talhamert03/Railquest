import {levels} from './levels.js';
import {worlds} from './level-blueprints.js';
import {parseLevel,blankRoutes,cloneRoutes,restoreRoutes,extendRoute,railCount,Journey,rating,walkable,simulate,ONE_WAY,signalGreen,fragileBridge} from './engine.js';
import {loadSave,writeSave,recordWin,nextLevel,totalStars,homeDestination} from './storage.js';
import {IslandRenderer,CAR_COLORS} from './renderer.js';
import {AdPolicy,NativeCommerce,rewardedSolution} from './monetization.js';
import {Soundscape} from './audio.js';
import {revealDialog,dismissDialog} from './dialogs.js';
import {icon,stars} from './icons.js';
import {keySign} from './key-signs.js';
const app=document.querySelector('#app'),announcer=document.querySelector('#announcer'),catalog=levels.map(parseLevel),save=loadSave(),pref=save.settings,audio=new Soundscape(pref);
let gesture=null,screen='home',selectedWorld=0,game=null,renderer=null,dialog=null,art={props:null,vehicles:null},lastMessage='',saveWarning=false;
const commerce=new NativeCommerce(window),adPolicy=new AdPolicy(save.economy),COUNT=catalog.length;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s),bind=(s,event,fn)=>$(s)?.addEventListener(event,fn);
const announce=t=>{announcer.textContent='';requestAnimationFrame(()=>announcer.textContent=t);};
const persist=()=>{if(!writeSave(save)&&!saveWarning){saveWarning=true;announce('İlerleme bu tarayıcıda kaydedilemiyor. Oynamaya devam edebilirsin.');}};
const haptic=(n=9)=>{if(!pref.haptics)return;try{if(window.RotaHost?.haptic)window.RotaHost.haptic();else navigator.vibrate?.(n);}catch{}};
const applyPreferences=()=>{document.documentElement.dataset.motion=pref.reducedMotion?'reduced':'full';audio.update(pref);if(renderer){renderer.settings=pref;renderer.dirty=true;}};
const button=(id,name,label,cls='')=>`<button id="${id}" class="icon-button ${cls}" aria-label="${label}" title="${label}">${icon(name)}</button>`;
const brand=()=>`<button class="brand" id="brand-home" aria-label="Railquest ana ekran">${icon('train')}<span>RAILQUEST</span></button>`;
const topbar=(back=false)=>`<header class="topbar"><div class="back-brand">${back?button('nav-back','back','Ana ekrana dön'):''}${brand()}</div><div class="top-actions">${button('sound-toggle',pref.sound?'sound':'mute','Oyun sesini aç veya kapat')}${button('settings','settings','Ayarlar')}${button('shop','noads','No Ads · Bölüm arası reklamları kaldır','noads-button')}</div></header>`;
function bindTop(){bind('#shop','click',shopDialog);bind('#brand-home','click',goHome);bind('#nav-back','click',()=>screen==='game'?goMap(game.level.world):goHome());bind('#settings','click',settingsDialog);bind('#sound-toggle','click',async()=>{await audio.unlock();pref.sound=!pref.sound;persist();applyPreferences();$('#sound-toggle').innerHTML=icon(pref.sound?'sound':'mute');});}
commerce.onChange=()=>{if($('#privacy-options'))$('#privacy-options').hidden=!commerce.state.privacyRequired;if(dialog?.classList.contains('shop-dialog')&&!commerce.busy)shopDialog();};
function saveDraft(){if(game&&game.phase!=='won'){save.drafts[game.level.id]=cloneRoutes(game.routes);persist();}}
function setScreen(name){clearTimeout(messageTimer);saveDraft();if(dialog)closeDialog();renderer?.dispose();renderer=null;game=null;screen=name;document.body.dataset.screen=name;}
let messageTimer=0;
function enterScene(){
 const scene=app.firstElementChild;
 if(!pref.reducedMotion&&scene?.animate)scene.animate([{opacity:0,transform:'translateY(9px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:290,easing:'cubic-bezier(.16,1,.3,1)'});
}
function goHome(){
 setScreen('home');document.body.style.setProperty('--sea',worlds[0].water);
 const completed=Object.keys(save.completed).length,destination=homeDestination(save),target=destination.level,next=catalog[target-1];
 app.innerHTML=`<section class="phone-home" aria-labelledby="home-title">
  <div class="menu-sky" aria-hidden="true"><i class="cloud"></i><i class="cloud"></i><i class="cloud"></i><i class="cloud"></i></div>
  <div class="menu-scene" aria-hidden="true"><img src="./assets/cover.webp" alt="" width="1024" height="1024" draggable="false"></div>
  <header class="menu-crown">
   <button id="settings" class="menu-utility" aria-label="Ayarlar">${icon('settings')}</button>
   <button id="sound-toggle" class="menu-utility" aria-label="Oyun sesini aç veya kapat">${icon(pref.sound?'sound':'mute')}</button>
   <div class="menu-score"><span aria-label="${totalStars(save)} yıldız">${icon('star')}<b>${totalStars(save)}</b></span><span aria-label="${completed} / ${COUNT} bölüm tamamlandı">${icon('flag')}<b>${completed}<small> / ${COUNT}</small></b></span></div>
   <button id="shop" class="menu-utility menu-noads" aria-label="No Ads · Bölüm arası reklamları kaldır">${icon('noads')}<span>No Ads</span></button>
  </header>
  <div class="home-hub">
   <h1 id="home-title" class="menu-wordmark" aria-label="Railquest">${[...'Railquest'].map((ch,i)=>`<span style="--i:${i}" aria-hidden="true">${ch}</span>`).join('')}</h1>
   <p class="menu-tagline">Rayları döşe, vagonları buluştur!</p>
   <nav class="menu-controls" aria-label="Ana menü">
    <button id="start-game" class="menu-play"><span>${icon('play')} Oyna</span><small>${save.hasStarted?`Bölüm ${String(target).padStart(2,'0')} · Devam et`:'Yolculuğuna başla'}</small></button>
    <button id="choose-islands" class="menu-secondary">${icon('map')} Bölümler</button>
    <button id="how-to" class="menu-utility menu-guide" aria-label="Nasıl oynanır?">${icon('help')}</button>
   </nav>
  </div>
  <div class="home-conductor" aria-hidden="true"><span class="speech">Birlikte daha güzel!</span><img src="./assets/conductor.webp" alt="" width="160" height="160" draggable="false"></div>
 </section>`;
 bindTop();bind('#start-game','click',()=>{audio.unlock();destination.screen==='game'?startGame(target):goMap(0);});bind('#choose-islands','click',()=>{audio.unlock();goMap(next.world);});bind('#how-to','click',helpDialog);enterScene();
}
function goMap(world=0,chosen){
 setScreen('map');selectedWorld=world;const w=worlds[world];document.body.style.setProperty('--sea',w.water);
 const current=catalog.filter(l=>l.world===world),complete=current.filter(l=>save.completed[l.id]).length;
 const selected=current.find(l=>l.id===chosen)||current.find(l=>l.id===save.lastLevel)||current.find(l=>!save.completed[l.id])||current[0];
 const upcoming=current.find(l=>!save.completed[l.id])?.id,regionDone=v=>catalog.filter(l=>l.world===v.id&&save.completed[l.id]).length;
 app.innerHTML=`<section class="chapter-screen" aria-labelledby="chapter-title" data-biome="${w.biome}">
  <header class="chapter-header">${button('nav-back','back','Ana menüye dön')}<span class="region-badge" aria-hidden="true">${icon(w.icon)}</span><div class="chapter-name"><span class="eyebrow">BÖLGE ${String(world+1).padStart(2,'0')} / 06</span><h1 id="chapter-title">${w.name}</h1></div><span class="chapter-progress">${icon('star')}<b>${complete}</b><small> / ${current.length} durak</small></span></header>
  <div class="chapter-body">
   <div class="journey-scene"><div class="chapter-preview"><canvas id="chapter-island" aria-hidden="true"></canvas><span class="preview-tag">${icon(w.icon)}${w.subtitle}</span></div>
    <nav class="stop-trail" aria-label="${w.name} bölümleri"><div class="stop-track">${current.map((l,i)=>{const done=save.completed[l.id];return `<button class="stop-node ${done?'complete':''} ${l.id===upcoming?'upcoming':''}" data-level="${l.id}" style="--step:${i%2}" aria-pressed="${l.id===selected.id}" aria-label="Bölüm ${l.id}: ${l.name}, ${done?done.stars+' yıldız':'tamamlanmadı'}"><span class="stop-coin">${String(l.id).padStart(2,'0')}</span>${stars(done?.stars||0)}</button>`;}).join('')}</div></nav>
   </div>
   <aside class="level-ticket" aria-label="Seçili bölüm"><span class="ticket-caption">SONRAKİ BULUŞMAN</span><span id="selected-number" class="ticket-number"></span><h2 id="selected-title"></h2><div id="selected-stars" class="ticket-stars"></div><div id="selected-stats" class="ticket-stats"></div><button id="selected-play" class="menu-play"><span>${icon('play')} Oyna</span></button></aside>
  </div>
  <nav class="region-tabs" aria-label="Bölge seçimi">${worlds.map(v=>`<button data-world="${v.id}" style="--region:${v.water}" aria-current="${world===v.id?'page':'false'}" aria-label="${v.name}, ${regionDone(v)} bölüm tamamlandı">${icon(v.icon)}<span>${v.name}</span><small>${regionDone(v)}/${catalog.filter(l=>l.world===v.id).length}</small></button>`).join('')}</nav>
 </section>`;
 let selectedId=selected.id;
 renderer=new IslandRenderer($('#chapter-island'),art,{},pref);
 const choose=l=>{
  selectedId=l.id;const done=save.completed[l.id];
  $('#selected-number').textContent=String(l.id).padStart(2,'0');$('#selected-title').textContent=l.name;$('#selected-stars').innerHTML=stars(done?.stars||0);
  $('.ticket-caption').textContent=done?'YENİDEN YOLCULUK':'BİR BULUŞMA PLANLA';
  $('#selected-stats').innerHTML=`<span>${icon('train')}<b>${l.wagons.length}</b> vagon</span><span>${icon('rail')}<b>${l.budget}</b> ray</span>`;
  $('#selected-play').setAttribute('aria-label',`Bölüm ${l.id}: ${l.name}, oyna`);
  document.querySelectorAll('[data-level]').forEach(el=>el.setAttribute('aria-pressed',Number(el.dataset.level)===l.id));
  const ticket=$('.level-ticket');ticket.classList.remove('pop');void ticket.offsetWidth;ticket.classList.add('pop');
  renderer.setLevel(l,{routes:blankRoutes(l),selected:1,journey:null,overlay:true,preview:true});renderer.fitBoard();
 };
 choose(selected);bind('#nav-back','click',goHome);bind('#selected-play','click',()=>{audio.unlock();startGame(selectedId);});
 document.querySelectorAll('[data-world]').forEach(el=>el.addEventListener('click',()=>{if(Number(el.dataset.world)===world)return;audio.effect('tap');goMap(Number(el.dataset.world));}));
 document.querySelectorAll('[data-level]').forEach(el=>el.addEventListener('click',()=>{audio.effect('tap');choose(catalog[Number(el.dataset.level)-1]);}));
 const node=$(`[data-level="${selected.id}"]`),trail=$('.stop-trail');trail.scrollLeft=Math.max(0,node.offsetLeft-trail.clientWidth/2+node.offsetWidth/2);enterScene();
}
const hasSpecialRules=l=>!!(l.signals||l.locks||l.map.some(row=>/[XY]/.test(row)));
const lessons={
 locks:'Anahtarı istediğin vagonla al. Aynı simgeyi taşıyan bariyerler açılır. Menüden bölüm kurallarına bakabilirsin.',
 'lock-chain':'Sonraki vagon öncekinin kapısını açabilir. Anahtarların alınma sırasını, varış sırasından ayrı düşün.',
 fragile:'1× işaretli köprü yalnız bir vagon taşır. İlk vagon ayrılınca çöker; ortak hattı karşı kıyıda kur.',
 'lock-fragile':'Anahtarları doğru zamanda al, hassas köprüleri paylaşma. Bütün vagonlar yine numara sırasıyla ulaşmalı.',
 'lock-final':'Üç anahtar, üç sinyal ve altı vagon. Kapıların açılma sırasını kur, sonra ortak hatların ritmini ayarla.',
 signal:'Sinyaldeki vagon kırmızıda bekler, yeşilde ayrılır. Menüden ışık döngülerine bakabilirsin.',
 'one-way':'Ok işaretli geçitte yalnız ok yönünde düz ilerle. Ortak sinyale geliş aralığını koru.',
 'signal-merge':'Kırmızıda duran vagona arkadaki çarpabilir. Ortak yeşil aralığını ve geliş sırasını birlikte hesapla.',
 six:'Altı vagon aynı anda çıkar: 1 → 2 → 3 → 4 → 5 → 6. Boş alanı tek parmakla sürükleyerek haritayı kaydırabilirsin.',
 'signal-final':'Altı vagon, dört sinyal ve üç tünel. Her ortak yolun yeşil aralığını ayrı ayrı planla.',
 draw:'1 numaralı vagondan başlayıp lokomotifin arkasına doğru ray çiz.',
 turn:'Parmağını yan yana karelere sürükle. Raylar virajda kendiliğinden döner.',
 budget:'Ray hakkın sınırlı. Bahçenin iki tarafından da yol bulabilirsin.',
 order:'Önce 1, sonra 2 ulaşmalı. Düzenlemek istediğin vagona dokun.',
 timing:'Hepsi aynı anda çıkar. 2 erken geliyorsa ona biraz daha uzun yol çiz.',
 merge:'Bir hattı diğerine bağla; vagonlar ortak rayları sırayla kullansın.',
 tunnel:'A tünelleri birbirine bağlı. Ağız önündeki oku izleyerek devam et.',
 'tunnel-turn':'Tünelin çıkışı başka yöne bakıyor. Çıkış okunu takip et.',
 'two-tunnels':'A, diğer A’ya; B, diğer B’ye çıkar. Geliş sırasını unutma.',
 bridge:'Hazır köprüler ray harcamaz. Köprülerin üzerinde düz ilerle.',
 three:'Üç vagon, tek lokomotif. Buluşma sırası: 1, 2, 3.',
 final:'Son buluşma. Tünelleri, köprüyü ve ortak rayları birlikte düşün.',
 wait:'Saatli peronda nokta sayısı kadar adım beklersin. Süreyi rotana ekle.',
 four:'Dört vagon, tek hat. Buluşma sırası: 1 → 2 → 3 → 4.',
 bottleneck:'Ortak peronda bekleyen vagona arkadaki çarpabilir. Birleşmeden önce aralık oluştur.',
 'three-tunnels':'A, B ve C tünellerini eşleştir; peronların bekleme süresini de say.',
 shortcut:'En kısa yol en doğru zaman olmayabilir. Tüneli kullanıp kullanmamayı düşün.',
 'tunnel-chain':'İki geçidi art arda kullanabilir, aralarına başka bir vagonun hattını katabilirsin.',
 'expert-final':'Usta bulmaca: tünelleri, bekleme peronunu ve dört vagonun geliş sırasını birlikte çöz.',
 route:'Vagonları 1’den başlayarak sırayla lokomotife ulaştır.'
};
function startGame(id){
 setScreen('game');const level=catalog[Math.max(0,Math.min(COUNT-1,id-1))];selectedWorld=level.world;save.lastLevel=level.id;save.hasStarted=true;persist();
 game={roundId:crypto.randomUUID(),assisted:false,adDue:false,level,routes:restoreRoutes(level,save.drafts[level.id]),selected:1,history:[],journey:null,paused:false,hint:null,phase:'editing',speed:1,message:lessons[level.lesson],winTime:0,winPresented:false};
 document.body.style.setProperty('--sea',worlds[level.world].water);
 app.innerHTML=`<section class="play-screen" data-wagons="${level.wagons.length}" aria-labelledby="level-title">
  <header class="puzzle-header">${button('game-menu','pause','Oyun menüsü')}<div class="puzzle-title"><span class="level-chip" aria-hidden="true">${String(level.id).padStart(2,'0')}</span><div><span class="eyebrow">BÖLÜM ${String(level.id).padStart(2,'0')} · ${worlds[level.world].name}</span><h1 id="level-title">${level.name}</h1></div></div><div class="rail-counter" id="rail-counter" aria-live="polite">${icon('rail')}<strong id="rail-number">${level.budget}</strong><span>ray</span><i class="rail-meter" aria-hidden="true"><b></b></i></div></header>
  <div class="puzzle-canvas"><canvas id="island" tabindex="0" role="application" aria-label="${level.name} ray bulmacası. Boş alanı tek parmakla sürükleyerek haritayı kaydır. Vagondan veya raydan sürükleyerek ray döşe." aria-describedby="game-message"></canvas></div>
  <footer class="puzzle-dock">${button('undo','undo','Son hamleyi geri al')}<div class="dock-center"><div class="puzzle-wagons" role="group" aria-label="Vagon seçimi">${level.wagons.map(w=>`<button class="wagon-button" data-wagon="${w.id}" style="--wagon-color:${CAR_COLORS[w.id-1]}" aria-label="${w.id} numaralı vagonu seç" aria-pressed="${w.id===1}"><span>${w.id}</span><i class="route-dot" aria-hidden="true">${icon('check')}</i></button>`).join('')}</div><div class="dock-tools"><button class="speed-button board-speed" id="speed" aria-label="Tren hızı 1 kat. 2 kata geç" aria-pressed="false">1×</button>${button('zoom-out','minus','Haritayı uzaklaştır','board-zoom')}${button('zoom-in','plus','Haritayı yakınlaştır','board-zoom')}</div></div><button class="button button-green play-button" id="play">${icon('play')}<span>Başlat</span></button></footer>
  <p class="puzzle-message" id="game-message" role="status">${game.message}</p>
 </section>`;
 renderer=new IslandRenderer($('#island'),art,{
  cell:selectCell,end:()=>{gesture=null;saveDraft();},undo,tick,focus:announceCell,select:id=>selectWagon(id,false),camera:updateCameraHUD,
  begin:()=>{gesture={routes:cloneRoutes(game.routes),history:game.history.slice(),selected:game.selected,hint:game.hint,message:game.message};},
  cancel:()=>{if(!gesture||!game||game.journey)return;game.routes=gesture.routes;game.history=gesture.history;game.selected=gesture.selected;game.hint=gesture.hint;setMessage(gesture.message);renderer?.updateState(game);updateHUD();}
 },pref);renderer.setLevel(level,game);renderer.fitBoard();

 bind('#game-menu','click',gameMenu);bind('#undo','click',undo);bind('#play','click',play);bind('#speed','click',toggleSpeed);
 bind('#zoom-in','click',()=>renderer.zoomBy(1.3));bind('#zoom-out','click',()=>renderer.zoomBy(1/1.3));
 document.querySelectorAll('[data-wagon]').forEach(el=>el.addEventListener('click',()=>selectWagon(Number(el.dataset.wagon))));
 updateHUD();setMessage(game.message);announce(`Bölüm ${level.id}. ${level.name}. ${game.message}`);enterScene();
}
function toggleSpeed(){
 if(!game)return;
 game.speed=game.speed===1?2:1;
 if(game.journey)game.journey.speed=1.65*game.speed;
 const control=$('#speed');control.textContent=`${game.speed}×`;control.setAttribute('aria-pressed',String(game.speed===2));control.setAttribute('aria-label',`Tren hızı ${game.speed} kat. ${game.speed===1?2:1} kata geç`);haptic();
}
function gameMenu(){
 if(!game)return;
 const j=game.journey;
 if(j&&!j.done){game.paused=true;updateHUD();}
 const action=(id,g,label,disabled=false)=>`<button id="${id}" class="pause-action" ${disabled?'disabled':''}>${icon(g)}<span>${label}</span></button>`;
 const used=railCount(game.level,game.routes);
 openDialog(`<div class="pause-layout"><div class="pause-side"><span class="pause-badge" aria-hidden="true">${String(game.level.id).padStart(2,'0')}</span><span class="eyebrow">BÖLÜM ${String(game.level.id).padStart(2,'0')} · ${worlds[game.level.world].name}</span><h2>${game.level.name}</h2><div class="pause-meta"><span>${icon('rail')}<b>${used}</b> / ${game.level.budget} ray</span><span>${icon('star')}≤ <b>${game.level.par}</b> hedef</span>${hasSpecialRules(game.level)?`<span class="beat-chip">${icon('clock')}Vuruş <b id="beat-number">${j?.beat||0}</b></span>`:''}</div><div class="pause-footer"><button id="resume-game" class="button button-green">${icon('play')} Oyuna dön</button>${j?action('stop-journey','rail','Raylara dön'):''}</div></div><div class="pause-grid">${action('hint','hint','İpucu',!!j)}${action('reset','reset','Temizle',!!j||!Object.values(game.routes).some(p=>p.length>1))}${action('fit-board','fit','Sığdır')}${action('game-help','help',hasSpecialRules(game.level)?'Kurallar':'Nasıl oynanır?')}${action('menu-levels','map','Bölümler')}${action('menu-home','home','Ana menü')}${action('settings','settings','Ayarlar')}${!window.RotaHost&&document.documentElement.requestFullscreen?action('fullscreen','fullscreen','Tam ekran'):''}</div></div>`,()=>{
  bind('#menu-levels','click',()=>goMap(game.level.world,game.level.id));bind('#menu-home','click',goHome);
  bind('#hint','click',hint);bind('#reset','click',()=>{closeDialog();reset();});bind('#settings','click',settingsDialog);bind('#game-help','click',()=>hasSpecialRules(game.level)?specialRules():helpDialog());
  const resume=()=>{closeDialog();if(game?.journey&&!game.journey.done){game.paused=false;updateHUD();}};bind('#resume-game','click',resume);
  bind('#stop-journey','click',()=>{closeDialog();editJourney();});
  bind('#fit-board','click',()=>{resume();renderer.fitBoard();});
  bind('#fullscreen','click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await document.documentElement.requestFullscreen();try{await window.screen.orientation?.lock?.('landscape');}catch{}}}catch{announce('Bu tarayıcıda tam ekran kullanılamıyor.');}});updateCameraHUD();
 },'pause-dialog');
}

function updateCameraHUD(){
 if(!renderer?.camera?.initialized)return;const c=renderer.camera;
 if($('#zoom-out'))$('#zoom-out').disabled=c.size<=c.fitSize+.01;
 if($('#zoom-in'))$('#zoom-in').disabled=c.size>=104-.01;
 if($('#camera-scale'))$('#camera-scale').textContent=`${(c.size/c.fitSize).toFixed(1)}×`;
}
function setMessage(text,kind='normal'){
 if(!game)return;game.message=text;clearTimeout(messageTimer);const el=$('#game-message');
 if(el){el.textContent=text;el.className=`puzzle-message ${kind}`;messageTimer=setTimeout(()=>el.classList.add('quiet'),kind==='error'?14000:6500);}
 if(lastMessage!==text){lastMessage=text;announce(text);}
}
function announceCell(k){const c=game?.level.cells.get(k);if(!c)return;const labels={'#':'Engel','~':'Su','G':'Lokomotif','a':'A tüneli','b':'B tüneli','c':'C tüneli','p':'Anahtar plakası','l':'Anahtarla açılan bariyer','X':'Bir kez kullanılan yatay köprü','Y':'Bir kez kullanılan dikey köprü','q':'Sinyal; yeşilde ayrılır','>':'Doğuya tek yön','v':'Güneye tek yön','<':'Batıya tek yön','^':'Kuzeye tek yön','w':'Bir adım bekleme peronu','z':'İki adım bekleme peronu','H':'Köprü','V':'Köprü','.':'Boş kare'};const lock=(c.type==='p'?game.level.plateLinks:game.level.gateLinks)?.get(k),label=lock!==undefined?`${keySign(lock).name} ${c.type==='p'?'anahtarı. İstediğin vagon alabilir':`bariyeri. ${game.journey?.openLocks.has(lock)?'Açık':'Kapalı'}`}`:labels[c.type]||c.type+' numaralı vagon';announce(`${c.x+1}. sütun, ${c.y+1}. sıra. ${label}.`);}
function selectWagon(id,focus=true){if(!game||game.journey||!game.routes[id])return;game.selected=id;game.hint=null;renderer.focused=game.routes[id].at(-1);if(focus)renderer.focusCell(renderer.focused,true);renderer.updateState(game);updateHUD();setMessage(`${id} numaralı vagon seçili. Parlayan son raydan devam et.`);haptic();}
function remember(){game.history.push({routes:cloneRoutes(game.routes),selected:game.selected});if(game.history.length>120)game.history.shift();}
function selectCell(k,initial){
 if(!game||game.journey||dialog)return;
 const wagon=game.level.wagons.find(w=>w.key===k);
 if(wagon&&initial&&wagon.id!==game.selected){selectWagon(wagon.id,false);return;}
 const before=JSON.stringify(game.routes),result=extendRoute(game.level,game.routes,game.selected,k);
 if(!result.ok){
  if(result.reason==='budget')setMessage('Ray hakkın bitti. Ortak hat kurabilir veya bir rayı geri alabilirsin.','error');
  else if(['junction','crossing'].includes(result.reason))setMessage('Bu ray başka yöne gidiyor. Hatları aynı çıkışa bağla.','error');
  else if(initial&&walkable(game.level.cells.get(k)))setMessage('Seçili vagonun son rayından devam et. Vagon düğmelerinden diğerini seçebilirsin.');
  return;
 }
 if(before===JSON.stringify(result.routes))return;
 remember();game.routes=result.routes;game.hint=null;haptic();audio.effect(result.trimmed?'undo':'rail');
 if(result.joined)setMessage('Ortak hat kuruldu. İki vagon aynı noktaya aynı anda gelmesin.');
 else if(result.teleported)setMessage('Tünelin diğer ucundan, okun gösterdiği yönde devam et.');
 else if(game.routes[game.selected].at(-1)===game.level.goal)setMessage(game.level.wagons.every(w=>game.routes[w.id].at(-1)===game.level.goal)?'Hatlar hazır. Başlat ve buluşma sırasını izle.':'Bu hat tamam. Sıradaki vagonu seç.');
 else setMessage(`${game.selected} numaralı vagonun yolunu lokomotifin arkasına bağla.`);
 renderer.updateState(game);updateHUD();
}
function undo(){if(!game||game.journey||!game.history.length)return;const old=game.history.pop();game.routes=old.routes;game.selected=old.selected;game.hint=null;audio.effect('undo');renderer.updateState(game);updateHUD();saveDraft();setMessage('Son hamle geri alındı.');}
function reset(){if(!game||game.journey)return;remember();game.routes=blankRoutes(game.level);game.selected=1;game.hint=null;renderer.updateState(game);updateHUD();saveDraft();audio.effect('undo');setMessage('Raylar kaldırıldı. Geri al düğmesiyle eski rotana dönebilirsin.');}
function hint(){
 if(!game||game.journey)return;
 const solution=game.level.solution;
 if(simulate(game.level,game.routes).type==='success'){setMessage('Rotan çalışıyor! Vagonlarını gönderebilirsin.','success');return;}
 let id=game.selected;if(JSON.stringify(game.routes[id])===JSON.stringify(solution[id]))id=game.level.wagons.find(w=>JSON.stringify(game.routes[w.id])!==JSON.stringify(solution[w.id]))?.id||id;
 const path=game.routes[id],example=solution[id];let common=0;while(common<path.length&&path[common]===example[common])common++;
 game.selected=id;game.hint=example[Math.min(common,example.length-1)];renderer.updateState(game);updateHUD();
 const text=common<path.length?`${id} numaralı vagon için başka bir yol düşün: parlayan kare, örnek çözümdeki ilk farklı adım.`:`${id} numaralı vagonu parlayan kareye doğru götür. Bu, geçerli yollardan biri.`;
 setMessage(text);audio.effect('mail');
 openDialog(`<div class="dialog-hero"><span class="dialog-emblem emblem-sun">${icon('hint')}</span><div><h2>Bir sonraki ray</h2><p>${text}</p></div></div><p class="muted">Tek adım ipuçları ücretsiz. İstersen bir reklam izleyerek bütün rayları otomatik yerleştirip bölümü tamamlatabilirsin.</p><div class="dialog-actions dialog-actions-row"><button class="button button-green" data-close>Kendim deneyeyim</button><button class="button button-outline reward-button" id="auto-solve">${icon('play')}<span>Otomatik çöz<small>Reklam izle</small></span></button></div>`,()=>bind('#auto-solve','click',()=>autoSolve(game)));

}
function previewAd(reward=false){
 return new Promise(resolve=>openDialog(`<div class="dialog-hero"><span class="dialog-emblem emblem-sun">${icon(reward?'play':'noads')}</span><div><span class="eyebrow">REKLAM ÖNİZLEMESİ</span><h2>${reward?'Bölüm senin için çözülsün.':'Beş durak tamamlandı.'}</h2><p>${reward?'Tamamlanan ödüllü reklam, bu bölümün raylarını otomatik yerleştirip trenleri başlatır.':'Android sürümünde bu doğal bölüm arasında reklam gösterilir.'}</p></div></div><p class="muted">Bu web önizlemesi gerçek reklam göstermez ve ödeme almaz.</p><div class="dialog-actions dialog-actions-row"><button class="button button-green" id="preview-ad-complete">${reward?'Reklam tamamlanmasını dene':'Oyuna dön'}</button>${reward?'<button class="button button-plain" data-close>Vazgeç</button>':''}</div>`,()=>bind('#preview-ad-complete','click',()=>{resolve({status:reward?'earned':'dismissed',shown:true});closeDialog();}),'ad-preview',()=>resolve({status:'cancelled',shown:!reward})));
}
async function autoSolve(current){
 if(!current||game!==current||current.journey||commerce.busy||current.rewardPending)return;
 current.rewardPending=true;
 const control=$('#auto-solve');if(control){control.disabled=true;control.innerHTML=`${icon('play')}<span>Reklam açılıyor…</span>`;}
 let result;
 try{
  audio.pause();result=commerce.native?await commerce.perform('rewarded'):await previewAd(true);
  const routes=rewardedSolution(current.level,result,current.roundId,game?.roundId);
  if(game!==current)return;
  closeDialog();
  if(routes){remember();current.routes=routes;current.assisted=true;current.hint=null;renderer.updateState(current);updateHUD();saveDraft();await play();setMessage('Raylar yerleşti. Vagonların buluşmasını izleyebilirsin.','success');}
  else {audio.unlock();setMessage(result?.status==='cancelled'?'Reklam tamamlanmadı; rayların değişmedi.':'Şu anda reklam yok. Ücretsiz ipucuyla devam edebilir veya sonra yeniden deneyebilirsin.');}
 }finally{current.rewardPending=false;}
}
async function finishRound(){
 if(!game)return;const current=game;
 if(current.adDue&&!commerce.noAds){
  current.adDue=false;audio.pause();
  // Attempt only at this natural break. A no-fill response never blocks progress.
  if(commerce.native)await commerce.perform('interstitial');else await previewAd(false);
  audio.unlock();
 }
 if(game===current){showWin();updateHUD();}
}
function shopDialog(message=''){
 if(typeof message!=='string')message='';const owned=commerce.noAds;
 openDialog(`<div class="shop-layout"><div class="noads-ticket">${icon('noads')}<strong>No Ads</strong><span>Bölüm arası reklamları kaldır</span><small>${owned?'Etkin':'Tek seferlik'}</small></div><div class="shop-copy"><h2>${owned?'Kesintisiz yolculuk.':'Bulmacanın keyfi bölünmesin.'}</h2><div class="plus-benefits"><p>${icon('check')}Her 5 bölümde çıkan otomatik reklamlar kalkar</p><p>${icon('check')}Tek seferlik satın alma, abonelik yok</p><p>${icon('check')}Satın almanı aynı Play hesabıyla geri yükle</p></div><p class="purchase-disclosure">Otomatik çöz için isteğe bağlı ödüllü reklamlar devam eder. No Ads, otomatik çözme hakkı içermez.</p>${message?`<p class="shop-status" role="status">${escapeHtml(message)}</p>`:''}<div class="dialog-actions"><button class="button button-yellow" id="buy-noads" ${commerce.native&&(owned||!commerce.state.billingReady)?'disabled':''}>${commerce.native?(owned?'No Ads etkin':commerce.state.price?`${escapeHtml(commerce.state.price)} · Tek seferlik`:'Satın alma şu anda kullanılamıyor'):(owned?'No Ads önizlemesini kapat':'No Ads önizlemesini aç')}</button>${commerce.native?'<button class="button button-plain" id="restore-noads">Satın almayı geri yükle</button>':'<p class="preview-note">Önizleme · Ödeme alınmaz. Deneme yalnız bu oturumda geçerlidir.</p>'}</div><button class="text-button" data-close>Yolculuğa dön</button></div></div>`,()=>{
  bind('#buy-noads','click',async()=>{if(!commerce.native){commerce.previewNoAds=!commerce.previewNoAds;shopDialog(commerce.noAds?'No Ads bu oturum için açıldı.':'Önizleme kapandı.');return;}await purchaseAction('purchase');});bind('#restore-noads','click',()=>purchaseAction('restore'));
 },'shop-dialog');
}
async function purchaseAction(action){
 if(commerce.busy)return;for(const id of ['#buy-noads','#restore-noads'])if($(id))$(id).disabled=true;
 const result=await commerce.perform(action);
 const messages={purchased:'No Ads açıldı. Desteğin için teşekkürler!',restored:'Satın alman geri yüklendi.',pending:'Ödeme onay bekliyor. Onaylandığında No Ads açılacak.',cancelled:'Satın alma iptal edildi.',not_owned:'Bu Google Play hesabında No Ads bulunamadı.',unavailable:'Satın alma şu anda kullanılamıyor. Daha sonra yeniden deneyebilirsin.',verification_pending:'Satın alma kontrol ediliyor. Yeniden ödeme yapma; bağlantı geldiğinde geri yüklemeyi kullan.'};
 shopDialog(messages[result.status]||'İşlem tamamlanamadı. Oyununa devam edebilirsin.');
}
function nextStop(){if(!game||commerce.busy)return;const id=game.level.id;closeDialog();id<COUNT?startGame(id+1):goMap(worlds.length-1);}
async function play(){
 if(!game||commerce.busy||(game.phase==='won'&&!game.winPresented))return;const current=game;await audio.unlock();if(current!==game)return;
 if(game.journey){if(game.journey.done){editJourney();return;}game.paused=!game.paused;updateHUD();setMessage(game.paused?'Yolculuk duraklatıldı.':'Vagonlar yola devam ediyor.');return;}
 if(!Object.values(game.routes).some(p=>p.length>1)){setMessage('Önce bir vagondan başlayarak ray çiz.');return;}
 game.editCamera=renderer.cameraSnapshot();renderer.fitBoard();game.journey=new Journey(game.level,game.routes,1.65*game.speed);game.paused=false;game.phase='running';game.hint=null;audio.effect('go');haptic(18);setMessage('Buluşma sırası: '+game.level.wagons.map(w=>w.id).join(' → '));renderer.updateState(game);updateHUD();saveDraft();
}
function editJourney(){if(!game)return;game.journey=null;if(game.editCamera)renderer.restoreCamera(game.editCamera);game.paused=false;game.phase='editing';game.winTime=0;game.winPresented=false;renderer.updateState(game);updateHUD();setMessage('Rayların yerinde. Rotanı düzenleyip yeniden deneyebilirsin.');}
function tick(dt){
 if(!game||dialog||document.hidden||document.documentElement.dataset.orientation==='portrait'||commerce.busy)return;
 if(game.phase==='won'){game.winTime+=dt;if(game.winTime>1.1&&!game.winPresented){game.winPresented=true;finishRound();}return;}
 if(!game.journey||game.paused||game.journey.done)return;
 const previousBeat=game.journey.beat;
 for(const event of game.journey.update(dt)){
  if(event.type==='coupled'){audio.effect('mail');haptic(12);renderer.burst(event.key,CAR_COLORS[event.wagon-1]);updateHUD();}
  if(event.type==='unlock'){audio.effect('unlock');renderer.burst(event.key,keySign(event.lock).color);setMessage(`${event.wagon} numaralı vagon ${keySign(event.lock).name} anahtarını aldı. Eşleşen bariyerler açıldı.`);}
  if(event.type==='collapse'){renderer.burst(event.key,'#b99677');audio.effect('bridge');}
  if(event.type==='success')win();
  if(event.type==='failure'){
   game.phase='failed';audio.effect('error');haptic([12,60,12]);
   const text=event.reason==='locked'?`${keySign(event.lock).name} bariyeri kapalı ve bütün vagonlar bekliyor. İstediğin vagonu bu anahtara ulaştıracak yol kur.`:event.reason==='fragile'?`${event.wagon} numaralı vagon çökmüş köprüye geldi. 1× köprüleri paylaşma; başka bir geçit kullan.`:event.reason==='order'?`${event.wagon} erken geldi. Önce ${event.expected} ulaşmalı; erken gelen vagona daha uzun yol çiz.`:event.reason==='collision'?`${event.wagons.join(' ve ')} aynı noktada buluştu. Birinin yolunu uzatarak aralarına mesafe koy.`:event.reason==='unfinished'?`${event.wagon} numaralı vagonun rayı burada bitiyor. Raylara dönüp hattını tamamla.`:'Hat bağlantısı tamamlanmadı. Raylara dönüp yönleri kontrol et.';
   if(event.key){game.hint=event.key;renderer.burst(event.key,'#d8795e');}setMessage(text,'error');updateHUD();
  }
 }
 if(game.journey.beat!==previousBeat&&$('#beat-number'))$('#beat-number').textContent=game.journey.beat;
}
function updateHUD(){
 if(!game||!$('#play'))return;if($('#beat-number'))$('#beat-number').textContent=game.journey?.beat||0;const j=game.journey,remaining=game.level.budget-railCount(game.level,game.routes);
 $('#rail-number').textContent=remaining;$('#rail-counter').classList.toggle('empty',remaining===0);$('#rail-counter').classList.toggle('low',remaining>0&&remaining<=Math.max(2,game.level.budget*.2));$('#rail-counter').style.setProperty('--fill',Math.max(0,remaining/game.level.budget).toFixed(3));
 document.querySelectorAll('[data-wagon]').forEach(el=>{const id=Number(el.dataset.wagon);el.setAttribute('aria-pressed',id===game.selected);el.classList.toggle('connected',game.routes[id].at(-1)===game.level.goal);el.classList.toggle('arrived',!!j?.arrived.includes(id));el.disabled=!!j;});
 $('#undo').disabled=!!j||!game.history.length;
 if($('#reset'))$('#reset').disabled=!!j||!Object.values(game.routes).some(p=>p.length>1);if($('#hint'))$('#hint').disabled=!!j;
 const label=j?(j.done?'Raylara dön':game.paused?'Devam et':'Duraklat'):'Başlat';
 $('#play').disabled=game.phase==='won'&&!game.winPresented;$('#play').innerHTML=`${icon(j&&!j.done&&!game.paused?'pause':j?.done?'rail':'play')}<span>${label}</span>`;
 $('.play-screen').dataset.phase=game.phase;
}
function win(){
 game.adDue=adPolicy.complete(game.roundId,{noAds:commerce.noAds,assisted:game.assisted});game.phase='won';game.winTime=0;const score=rating(game.level,game.routes),rails=railCount(game.level,game.routes);recordWin(save,game.level.id,score,rails);persist();audio.effect('success');haptic([20,70,30]);renderer.burst(game.level.goal);setMessage('Hepsi sırayla bağlandı. Güzel buluşmaydı!','success');updateHUD();
}
function showWin(){
 if(!game)return;const score=rating(game.level,game.routes),rails=railCount(game.level,game.routes),all=Object.keys(save.completed).length===COUNT;
 openDialog(`<div class="confetti" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div class="win-portrait"><img src="./assets/conductor.webp" alt="Mutlu makinist Pati" width="160" height="160"></div><div class="win-copy"><span class="eyebrow">${all?`${COUNT} DURAK, BİR GÜZEL YOLCULUK`:'BİR BULUŞMA DAHA TAMAM'}</span><h2>${all?'Usta makinist sensin!':'Hepsi bir arada!'}</h2><div class="win-stars">${stars(score)}</div><p>${score===3?'Usta hedefini yakaladın. Her ray yerini buldu.':'Vagonları sırayla buluşturdun. Daha az rayla yeniden deneyebilirsin.'}</p><div class="result-receipt"><span>${icon('rail')}Kullanılan ray<strong>${rails}</strong></span><span>${icon('star')}3 yıldız hedefi<strong>≤ ${game.level.par}</strong></span></div><div class="dialog-actions"><button class="button button-green" id="next-level">${game.level.id<COUNT?'Sonraki durak':'Bölümlere dön'}${icon('arrow')}</button><button class="button button-plain" id="win-home">${icon('home')}Ana Menü</button></div></div>`,()=>{bind('#next-level','click',nextStop);bind('#win-home','click',goHome);},'win-dialog');
}
function openDialog(content,onReady=()=>{},className='',onDismiss=()=>{}){
 renderer?.input.cancel();
 if(dialog)closeDialog();const el=document.createElement('dialog');el.className=`game-dialog ${className}`;el.setAttribute('aria-label',className==='win-dialog'?'Bölüm tamamlandı':className==='settings-dialog'?'Ayarlar':'Oyun penceresi');el.innerHTML=`${button('dialog-close','close','Kapat','dialog-close')}<div class="dialog-inner">${content}</div>`;
 el.returnFocus=document.activeElement;el.backgroundInert=app.inert;el.previousOverflow=document.body.style.overflow;el.onDismiss=onDismiss;
 document.body.appendChild(el);dialog=el;if(game)game.overlay=true;
 el.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});el.querySelector('#dialog-close').addEventListener('click',closeDialog);el.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',closeDialog));
 if(revealDialog(el)==='fallback'){
  el.shade=document.createElement('div');el.shade.className='dialog-shade';document.body.insertBefore(el.shade,el);app.inert=true;
  el.addEventListener('keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();closeDialog();return;}
   if(e.key!=='Tab')return;
   const controls=[...el.querySelectorAll('button:not(:disabled),input:not(:disabled),summary,a[href]')].filter(n=>!n.hidden),first=controls[0],last=controls.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  });
 }
 document.body.style.overflow='hidden';
 try{onReady();if(!pref.reducedMotion&&el.animate)el.animate([{opacity:0,transform:'translateY(12px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:220,easing:'cubic-bezier(.16,1,.3,1)'});el.querySelector('#dialog-close').focus({preventScroll:true});}catch(error){closeDialog();throw error;}
}
function closeDialog(){
 if(!dialog)return;const old=dialog;dialog=null;if(game)game.overlay=false;dismissDialog(old);old.shade?.remove();app.inert=old.backgroundInert;document.body.style.overflow=old.previousOverflow;
 if(old.returnFocus?.isConnected)old.returnFocus.focus({preventScroll:true});old.onDismiss?.();
}
function specialRules(){
 if(!game)return;const level=game.level,beat=game.journey?.beat||0,entries=Object.entries(level.signals||{}),directed=[...level.cells.values()].some(c=>ONE_WAY[c.type]!==undefined),fragile=[...level.cells.values()].filter(fragileBridge);
 openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon(level.locks?'key':entries.length?'signal':'bridge')}</span><div><span class="eyebrow">BÖLÜM ${String(level.id).padStart(2,'0')}</span><h2>Bu durağın kuralları</h2></div></div>${level.locks?`<div class="lock-rules"><p>${icon('key')}Anahtarı istediğin vagonla alabilirsin. Aynı simgeyi taşıyan bütün bariyerler açılır ve açık kalır.</p><div class="lock-list">${level.locks.map(l=>`<div style="--key-color:${keySign(l.id).color}"><strong>${icon(keySign(l.id).icon)} ${keySign(l.id).name}</strong><span>${l.gates.length} bariyer</span><b>${game.journey?.openLocks.has(l.id)?'Açık':'Kapalı'}</b></div>`).join('')}</div><p>Vagon kapalı bariyerin <strong>önünde</strong> bekler. Anahtar alındıktan sonraki vuruşta geçebilir. Arkadan gelen vagon bekleyene çarpabilir.</p></div>`:''}${fragile.length?`<div class="fragile-rules"><span class="fragile-emblem">1×</span><p><strong>Hassas köprü · ${fragile.length} adet</strong>Üzerinden ilk vagon ayrılınca çöker. Aynı anda arkasından giren ikinci vagon da geçemez. Köprüde düz ilerle; hazır rayı bütçeden düşmez.</p></div>`:''}${entries.length?`<p>Sinyal karesindeki vagon kırmızıda bekler, yeşilde ayrılır. Döngüler bütün vagonlar için birlikte işler.</p><div class="signal-list">${entries.map(([k,s],i)=>`<div class="signal-rule"><div><strong>S${i+1}</strong><span>${s.green} yeşil · ${s.period-s.green} kırmızı</span></div><div class="signal-cycle" aria-label="S${i+1} döngüsü: ${Array.from({length:s.period},(_,b)=>`${b}. vuruş ${signalGreen(level,k,b)?'yeşil':'kırmızı'}`).join(', ')}">${Array.from({length:s.period},(_,b)=>`<span class="${signalGreen(level,k,b)?'open':'closed'} ${beat%s.period===b?'current':''}" aria-hidden="true">${b}</span>`).join('')}</div></div>`).join('')}</div><p class="muted">Yola çıkış vuruşu 0. Kırmızıda duran vagona arkadan çarpılabilir.</p>`:''}${directed?`<div class="oneway-rule">${icon('arrow')}<p>Ok işaretli geçitlerde <strong>yalnız ok yönünde düz</strong> ilerlenir. Bu karelere ray döşemek de ray hakkı kullanır.</p></div>`:''}<div class="sticky-actions"><button class="button button-green" data-close>Planımı kurayım</button><button class="text-button" id="general-help">Genel oyun rehberi ${icon('help')}</button></div>`,()=>bind('#general-help','click',helpDialog),'rules-dialog');
}
function settingsDialog(){openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon('settings')}</span><div><h2>Ayarlar</h2><p class="settings-intro">Yolculuğu kendine göre ayarla.</p></div></div><div class="settings-list">${[['sound','sound','Oyun sesleri','Raylar, düdükler ve buluşmalar'],['music','music','Müzik','Sakin bir yol arkadaşı'],['haptics','vibrate','Dokunma titreşimi','Destekleyen telefonlarda'],['weather','snow','Hava efektleri','Hafif kar, kum ve ortam ışıltıları'],['reducedMotion','leaf','Sakin görünüm','Daha az hareket; hava efektleri kapanır']].map(([k,g,title,desc])=>`<label class="setting-row"><span class="setting-icon">${icon(g)}</span><span class="setting-label"><strong>${title}</strong><small>${desc}</small></span><input type="checkbox" role="switch" aria-label="${title}" data-setting="${k}" ${pref[k]?'checked':''}><span class="toggle" aria-hidden="true"></span></label>`).join('')}</div><div class="settings-foot"><button class="text-button" id="settings-shop">${icon('noads')} No Ads</button><button class="text-button" id="privacy-options" ${commerce.state.privacyRequired?'':'hidden'}>${icon('lock')} Gizlilik</button><button class="text-button" id="about-game">${icon('leaf')} Hakkında</button><button class="button button-green" data-close>${icon('check')} Tamam</button></div><p class="settings-note">İlerlemen bu cihazda saklanır.</p>`,()=>{document.querySelectorAll('[data-setting]').forEach(el=>el.addEventListener('change',()=>{pref[el.dataset.setting]=el.checked;persist();applyPreferences();if(el.checked&&['music','sound'].includes(el.dataset.setting))audio.unlock();if($('#sound-toggle'))$('#sound-toggle').innerHTML=icon(pref.sound?'sound':'mute');}));bind('#about-game','click',aboutDialog);bind('#settings-shop','click',shopDialog);bind('#privacy-options','click',async()=>{closeDialog();await commerce.perform('privacy');settingsDialog();});},'settings-dialog');}
function helpDialog(){openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon('train')}</span><div><span class="eyebrow">NASIL OYNANIR?</span><h2>Bir buluşma planla.</h2></div></div><div class="help-steps"><div><b>1</b><p><strong>Vagonu seç, rayını çiz.</strong>Vagondan başlayıp yan yana karelere sürükle. Eski bir raya dokunmak o hattı kısaltır.</p></div><div><b>2</b><p><strong>Lokomotifin arkasına bağla.</strong>Başka bir hatta bağlanınca devamındaki raylar ortak kullanılır; bütçeden bir kez düşer.</p></div><div><b>3</b><p><strong>1’den başlayarak sırayla.</strong>Hepsi aynı anda yola çıkar. Erken gelen vagona dolambaç kur. Aynı karede buluşmasınlar.</p></div></div><div class="help-notes"><p>${icon('bridge')}Köprülerde düz ilerle. Aynı harfli tüneller eşleşir; içinden geçmek bir adım sürer.</p><p>${icon('hint')}Tek adım ipuçları ücretsiz. Otomatik çöz, her kullanımda bir ödüllü reklam gerektirir.</p><p>${icon('clock')}Saatli peronda bir nokta 1, iki nokta 2 adım bekletir. Perona çizdiğin ray bütçeden düşer.</p><p>${icon('signal')}Sinyal karesinde kırmızıda bekle, yeşilde ayrıl. Oyun menüsündeki bölüm kurallarından ışık döngülerini görebilirsin.</p><p>${icon('arrow')}Ok işaretli geçitte yalnız ok yönünde düz ilerle. Sinyal ve ok karelerine de ray harcanır.</p><p>${icon('key')}Anahtarları istediğin vagonla alabilirsin. Anahtarın simgesi, açacağı bariyerleri gösterir. 1× köprüler ilk kullanımdan sonra çöker.</p><p>${icon('zoom')}Boş alanı tek parmakla sürükleyerek haritayı kaydır. Vagondan veya mevcut raydan sürüklemeye başladığında kamera sabit kalır. Alttaki − / + düğmeleriyle yakınlığı değiştir. Haritayı sığdırma seçeneği oyun menüsünde.</p></div><details><summary>Klavye ile oynama</summary><p>1–2–3–4–5–6: vagon seç. Oklar: kare seç. Enter / boşluk: ray ekle. Backspace: geri al. P: başlat / duraklat.</p></details><div class="sticky-actions"><button class="button button-green" data-close>${icon('check')} Anladım</button></div>`,()=>{},'help-dialog');}
function aboutDialog(){openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon('leaf')}</span><div><span class="eyebrow">OYUN HAKKINDA</span><h2>Railquest</h2></div></div><p>${COUNT} özgün bulmaca, ${worlds.length} bölge ve birlikte yolculuk eden küçük vagonlar.</p><div class="about-copy"><p>${commerce.native?'Her beş tamamlanan bölümün ardından otomatik reklam gösterilir. No Ads bunları kaldırır; otomatik çözün isteğe bağlı ödüllü reklamları devam eder. Reklam hizmeti, gizlilik tercihlerine göre cihaz ve reklam verilerini işleyebilir.':'Bu web önizlemesi gerçek reklam göstermez ve ödeme almaz. No Ads denemesi yalnız bu oturumda geçerlidir.'} İlerleme bu cihazda saklanır. Tüm bölümler ücretsiz oynanabilir.</p><p>Çizimler bu oyun için üretildi. Müzik ve sesler oyun içinde oluşturulur.</p><p>Anahtarların Yolculuğu · Sürüm 0.10.0</p></div><button class="button button-green" data-close>Yolculuğa dön</button>`);}
function pauseForBackground(){renderer?.input.cancel();if(game?.journey&&!game.journey.done){game.paused=true;updateHUD();setMessage('Yolculuk duraklatıldı. Hazır olduğunda devam et.');}saveDraft();audio.pause();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForBackground();});window.addEventListener('rota-pause',pauseForBackground);window.addEventListener('rota-portrait',()=>{if(dialog)closeDialog();pauseForBackground();});
window.rotaBack=()=>{if(dialog){closeDialog();return true;}if(screen==='game'){gameMenu();return true;}if(screen==='map'){goHome();return true;}return false;};
document.addEventListener('keydown',e=>{if(dialog||screen!=='game'||e.ctrlKey||e.metaKey)return;if(e.key.toLowerCase()==='p'){e.preventDefault();play();}if(/^[1-6]$/.test(e.key)){e.preventDefault();selectWagon(Number(e.key));}});
window.addEventListener('pagehide',()=>{saveDraft();audio.pause();});
window.addEventListener('error',()=>{if(game){saveDraft();game.paused=true;setMessage('Beklenmedik bir sorun oluştu. Sayfayı yeniden açıp rotana dönebilirsin.','error');updateHUD();}});
let mounted=false;
export function mountGame(loaded){
 if(mounted)return;art=loaded;applyPreferences();goHome();mounted=true;commerce.refresh();
 // Dynamic boot may finish after the load event; register in either case.
 if('serviceWorker' in navigator&&location.protocol==='https:'&&location.hostname!=='appassets.androidplatform.net'){
  const register=()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
 }
}
