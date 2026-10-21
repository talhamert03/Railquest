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
import {WAGON_SKINS,SKIN_PRICE_LABEL,SKIN_RECTS,CLASSIC_THUMB,skinById} from './cosmetics.js';
import {drawSkinnedCar} from './skin-effects.js';
import {L,localizeContent} from './i18n.js';
const app=document.querySelector('#app'),announcer=document.querySelector('#announcer'),catalog=levels.map(parseLevel),save=loadSave(),pref=save.settings,audio=new Soundscape(pref);
localizeContent(catalog,worlds);
let gesture=null,screen='home',selectedWorld=0,game=null,renderer=null,dialog=null,art={props:null,vehicles:null},lastMessage='',saveWarning=false;
const commerce=new NativeCommerce(window),adPolicy=new AdPolicy(save.economy),COUNT=catalog.length;
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s),bind=(s,event,fn)=>$(s)?.addEventListener(event,fn);
const announce=t=>{announcer.textContent='';requestAnimationFrame(()=>announcer.textContent=t);};
const persist=()=>{if(!writeSave(save)&&!saveWarning){saveWarning=true;announce(L('İlerleme bu tarayıcıda kaydedilemiyor. Oynamaya devam edebilirsin.','Progress can’t be saved in this browser. You can keep playing.'));}};
const haptic=(n=9)=>{if(!pref.haptics)return;try{if(window.RotaHost?.haptic)window.RotaHost.haptic();else navigator.vibrate?.(n);}catch{}};
const applyPreferences=()=>{document.documentElement.dataset.motion=pref.reducedMotion?'reduced':'full';audio.update(pref);if(renderer){renderer.settings=pref;renderer.terrainDirty=true;renderer.dirty=true;}};
const button=(id,name,label,cls='')=>`<button id="${id}" class="icon-button ${cls}" aria-label="${label}" title="${label}">${icon(name)}</button>`;
const brand=()=>`<button class="brand" id="brand-home" ${L('aria-label="Railquest ana ekran"','aria-label="Railquest home"')}>${icon('train')}<span>RAILQUEST</span></button>`;
const topbar=(back=false)=>`<header class="topbar"><div class="back-brand">${back?button('nav-back','back',L('Ana ekrana dön','Back to home')):''}${brand()}</div><div class="top-actions">${button('sound-toggle',pref.sound?'sound':'mute',L('Oyun sesini aç veya kapat','Turn game sound on or off'))}${button('settings','settings',L('Ayarlar','Settings'))}${button('shop','noads',L('No Ads · Bölüm arası reklamları kaldır','No Ads · Remove ads between levels'),'noads-button')}</div></header>`;
function bindTop(){bind('#shop','click',shopDialog);bind('#brand-home','click',goHome);bind('#nav-back','click',()=>screen==='game'?goMap(game.level.world):goHome());bind('#settings','click',settingsDialog);bind('#sound-toggle','click',async()=>{await audio.unlock();pref.sound=!pref.sound;persist();applyPreferences();$('#sound-toggle').innerHTML=icon(pref.sound?'sound':'mute');});}
commerce.onChange=()=>{if($('#privacy-options'))$('#privacy-options').hidden=!commerce.state.privacyRequired;if(dialog?.classList.contains('shop-dialog')&&!commerce.busy)shopDialog();applySkin();if(dialog?.classList.contains('garage-dialog')&&!commerce.busy)renderGarage();};
/** A chosen skin shows only while it is owned; refunds fall back to the classic carriage. */
const ownsSkin=s=>!s.product||commerce.owns(s.product);
const equippedSkin=()=>{const s=skinById(save.wagonSkin);return ownsSkin(s)?s.id:'classic';};
function applySkin(){if(renderer){renderer.skin=equippedSkin();renderer.dirty=true;}}
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
   <button id="settings" class="menu-utility" ${L('aria-label="Ayarlar"','aria-label="Settings"')}>${icon('settings')}</button>
   <button id="sound-toggle" class="menu-utility" aria-label="${L('Oyun sesini aç veya kapat','Turn game sound on or off')}">${icon(pref.sound?'sound':'mute')}</button>
   <button id="how-to" class="menu-utility menu-guide" ${L('aria-label="Nasıl oynanır?"','aria-label="How to play"')}>${icon('help')}</button>
   <div class="menu-score"><span aria-label="${totalStars(save)} ${L('yıldız','stars')}">${icon('star')}<b>${totalStars(save)}</b></span><span aria-label="${completed} / ${COUNT} ${L('bölüm tamamlandı','levels completed')}">${icon('flag')}<b>${completed}<small> / ${COUNT}</small></b></span></div>
   <button id="shop" class="menu-utility menu-noads" aria-label="${L('No Ads · Bölüm arası reklamları kaldır','No Ads · Remove ads between levels')}">${icon('noads')}<span>No Ads</span></button>
  </header>
  <div class="home-hub">
   <h1 id="home-title" class="menu-wordmark" aria-label="Railquest">${[...'Railquest'].map((ch,i)=>`<span style="--i:${i}" aria-hidden="true">${ch}</span>`).join('')}</h1>
   <p class="menu-tagline">${L('Rayları döşe, vagonları buluştur!','Lay the rails, unite the wagons!')}</p>
   <nav class="menu-controls" ${L('aria-label="Ana menü"','aria-label="Main menu"')}>
    <button id="start-game" class="menu-play"><span>${icon('play')} ${L('Oyna','Play')}</span><small>${save.hasStarted?`${L('Bölüm','Level')} ${String(target).padStart(2,'0')} · ${L('Devam et','Continue')}`:L('Yolculuğuna başla','Start your journey')}</small></button>
    <button id="choose-islands" class="menu-secondary">${icon('map')} ${L('Bölümler','Levels')}</button>
    <button id="garage" class="menu-secondary menu-garage">${icon('train')} ${L('Vagonlar','Wagons')}</button>
   </nav>
  </div>
  <div class="home-conductor" aria-hidden="true"><span class="speech">${L('Birlikte daha güzel!','Better together!')}</span><img src="./assets/conductor.webp" alt="" width="160" height="160" draggable="false"></div>
 </section>`;
 bindTop();bind('#start-game','click',()=>{audio.unlock();destination.screen==='game'?startGame(target):goMap(0);});bind('#choose-islands','click',()=>{audio.unlock();goMap(next.world);});bind('#how-to','click',helpDialog);bind('#garage','click',()=>{audio.unlock();garageDialog();});enterScene();
}
function goMap(world=0,chosen){
 setScreen('map');selectedWorld=world;const w=worlds[world];document.body.style.setProperty('--sea',w.water);
 const current=catalog.filter(l=>l.world===world),complete=current.filter(l=>save.completed[l.id]).length;
 const selected=current.find(l=>l.id===chosen)||current.find(l=>l.id===save.lastLevel)||current.find(l=>!save.completed[l.id])||current[0];
 const upcoming=current.find(l=>!save.completed[l.id])?.id,regionDone=v=>catalog.filter(l=>l.world===v.id&&save.completed[l.id]).length;
 app.innerHTML=`<section class="chapter-screen" aria-labelledby="chapter-title" data-biome="${w.biome}">
  <header class="chapter-header">${button('nav-back','back',L('Ana menüye dön','Back to main menu'))}<span class="region-badge" aria-hidden="true">${icon(w.icon)}</span><div class="chapter-name"><span class="eyebrow">${L('BÖLGE','REGION')} ${String(world+1).padStart(2,'0')} / 06</span><h1 id="chapter-title">${w.name}</h1></div><button id="map-garage" class="garage-chip" ${L('aria-label="Vagon garajı"','aria-label="Wagon garage"')}>${icon('train')}${L('<span>Vagonlar</span>','<span>Wagons</span>')}</button><span class="chapter-progress">${icon('star')}<b>${complete}</b><small> / ${current.length} ${L('durak','stops')}</small></span></header>
  <div class="chapter-body">
   <div class="journey-scene"><div class="chapter-preview"><canvas id="chapter-island" aria-hidden="true"></canvas><span class="preview-tag">${icon(w.icon)}${w.subtitle}</span></div>
    <nav class="stop-trail" aria-label="${L(`${w.name} bölümleri`,`${w.name} levels`)}"><div class="stop-track">${current.map((l,i)=>{const done=save.completed[l.id];return `<button class="stop-node ${done?'complete':''} ${l.id===upcoming?'upcoming':''}" data-level="${l.id}" style="--step:${i%2}" aria-pressed="${l.id===selected.id}" aria-label="${L('Bölüm','Level')} ${l.id}: ${l.name}, ${done?done.stars+L(' yıldız',' stars'):L('tamamlanmadı','not completed')}"><span class="stop-coin">${String(l.id).padStart(2,'0')}</span>${stars(done?.stars||0)}</button>`;}).join('')}</div></nav>
   </div>
   <aside class="level-ticket" ${L('aria-label="Seçili bölüm"','aria-label="Selected level"')}><span class="ticket-caption">${L('SONRAKİ BULUŞMAN','NEXT MEETUP')}</span><span id="selected-number" class="ticket-number"></span><h2 id="selected-title"></h2><div id="selected-stars" class="ticket-stars"></div><div id="selected-stats" class="ticket-stats"></div><button id="selected-play" class="menu-play"><span>${icon('play')} ${L('Oyna','Play')}</span></button></aside>
  </div>
  <nav class="region-tabs" ${L('aria-label="Bölge seçimi"','aria-label="Region selection"')}>${worlds.map(v=>`<button data-world="${v.id}" style="--region:${v.water}" aria-current="${world===v.id?'page':'false'}" aria-label="${v.name}, ${regionDone(v)} ${L('bölüm tamamlandı','levels completed')}">${icon(v.icon)}<span>${v.name}</span><small>${regionDone(v)}/${catalog.filter(l=>l.world===v.id).length}</small></button>`).join('')}</nav>
 </section>`;
 let selectedId=selected.id;
 renderer=new IslandRenderer($('#chapter-island'),art,{},pref);applySkin();bind('#map-garage','click',()=>garageDialog());
 const choose=l=>{
  selectedId=l.id;const done=save.completed[l.id];
  $('#selected-number').textContent=String(l.id).padStart(2,'0');$('#selected-title').textContent=l.name;$('#selected-stars').innerHTML=stars(done?.stars||0);
  $('.ticket-caption').textContent=done?L('YENİDEN YOLCULUK','RIDE AGAIN'):L('BİR BULUŞMA PLANLA','PLAN A MEETUP');
  $('#selected-stats').innerHTML=`<span>${icon('train')}<b>${l.wagons.length}</b> ${L('vagon','wagons')}</span><span>${icon('rail')}<b>${l.budget}</b> ${L('ray','rails')}</span>`;
  $('#selected-play').setAttribute('aria-label',L(`Bölüm ${l.id}: ${l.name}, oyna`,`Level ${l.id}: ${l.name}, play`));
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
 locks:L('Anahtarı istediğin vagonla al. Aynı simgeyi taşıyan bariyerler açılır. Menüden bölüm kurallarına bakabilirsin.','Any wagon can take a key. Barriers with the same symbol open. See the level rules in the menu.'),
 'lock-chain':L('Sonraki vagon öncekinin kapısını açabilir. Anahtarların alınma sırasını, varış sırasından ayrı düşün.','A later wagon may open an earlier wagon’s gate. Plan the order keys are taken apart from the arrival order.'),
 fragile:L('1× işaretli köprü yalnız bir vagon taşır. İlk vagon ayrılınca çöker; ortak hattı karşı kıyıda kur.','A 1× bridge carries one wagon only and collapses after it leaves. Build shared lines on the far bank.'),
 'lock-fragile':L('Anahtarları doğru zamanda al, hassas köprüleri paylaşma. Bütün vagonlar yine numara sırasıyla ulaşmalı.','Take keys at the right time and don’t share fragile bridges. Wagons must still arrive in number order.'),
 'lock-final':L('Üç anahtar, üç sinyal ve altı vagon. Kapıların açılma sırasını kur, sonra ortak hatların ritmini ayarla.','Three keys, three signals, six wagons. Set the order gates open, then tune the rhythm of shared lines.'),
 signal:L('Sinyaldeki vagon kırmızıda bekler, yeşilde ayrılır. Menüden ışık döngülerine bakabilirsin.','A wagon on a signal waits on red and leaves on green. See the light cycles in the menu.'),
 'one-way':L('Ok işaretli geçitte yalnız ok yönünde düz ilerle. Ortak sinyale geliş aralığını koru.','Cross arrow gates straight, in the arrow’s direction only. Keep your arrival gap at the shared signal.'),
 'signal-merge':L('Kırmızıda duran vagona arkadaki çarpabilir. Ortak yeşil aralığını ve geliş sırasını birlikte hesapla.','A wagon stopped on red can be bumped from behind. Plan the shared green window and arrival order together.'),
 six:L('Altı vagon aynı anda çıkar: 1 → 2 → 3 → 4 → 5 → 6. Boş alanı tek parmakla sürükleyerek haritayı kaydırabilirsin.','Six wagons leave together: 1 → 2 → 3 → 4 → 5 → 6. Drag empty space with one finger to pan the map.'),
 'signal-final':L('Altı vagon, dört sinyal ve üç tünel. Her ortak yolun yeşil aralığını ayrı ayrı planla.','Six wagons, four signals, three tunnels. Plan each shared line’s green window separately.'),
 draw:L('1 numaralı vagondan başlayıp lokomotifin arkasına doğru ray çiz.','Start at wagon 1 and draw rails to the back of the locomotive.'),
 turn:L('Parmağını yan yana karelere sürükle. Raylar virajda kendiliğinden döner.','Drag your finger across neighbouring tiles. Rails turn corners on their own.'),
 budget:L('Ray hakkın sınırlı. Bahçenin iki tarafından da yol bulabilirsin.','Your rails are limited. There’s a way around both sides of the garden.'),
 order:L('Önce 1, sonra 2 ulaşmalı. Düzenlemek istediğin vagona dokun.','1 must arrive before 2. Tap the wagon you want to edit.'),
 timing:L('Hepsi aynı anda çıkar. 2 erken geliyorsa ona biraz daha uzun yol çiz.','They all leave together. If 2 arrives early, give it a slightly longer route.'),
 merge:L('Bir hattı diğerine bağla; vagonlar ortak rayları sırayla kullansın.','Join one line into another; wagons take the shared rails in turn.'),
 tunnel:L('A tünelleri birbirine bağlı. Ağız önündeki oku izleyerek devam et.','The A tunnels are linked. Follow the arrow at the mouth.'),
 'tunnel-turn':L('Tünelin çıkışı başka yöne bakıyor. Çıkış okunu takip et.','This tunnel exits facing another way. Follow the exit arrow.'),
 'two-tunnels':L('A, diğer A’ya; B, diğer B’ye çıkar. Geliş sırasını unutma.','A leads to the other A, B to the other B. Mind the arrival order.'),
 bridge:L('Hazır köprüler ray harcamaz. Köprülerin üzerinde düz ilerle.','Ready-made bridges cost no rails. Go straight across them.'),
 three:L('Üç vagon, tek lokomotif. Buluşma sırası: 1, 2, 3.','Three wagons, one locomotive. Meetup order: 1, 2, 3.'),
 final:L('Son buluşma. Tünelleri, köprüyü ve ortak rayları birlikte düşün.','The last meetup. Think tunnels, bridge and shared rails together.'),
 wait:L('Saatli peronda nokta sayısı kadar adım beklersin. Süreyi rotana ekle.','A clock platform holds you one beat per dot. Add the wait to your route.'),
 four:L('Dört vagon, tek hat. Buluşma sırası: 1 → 2 → 3 → 4.','Four wagons, one line. Meetup order: 1 → 2 → 3 → 4.'),
 bottleneck:L('Ortak peronda bekleyen vagona arkadaki çarpabilir. Birleşmeden önce aralık oluştur.','A wagon waiting on a shared platform can be bumped from behind. Make a gap before merging.'),
 'three-tunnels':L('A, B ve C tünellerini eşleştir; peronların bekleme süresini de say.','Match the A, B and C tunnels, and count the platform waits too.'),
 shortcut:L('En kısa yol en doğru zaman olmayabilir. Tüneli kullanıp kullanmamayı düşün.','The shortest path may not be the best timing. Decide whether to take the tunnel.'),
 'tunnel-chain':L('İki geçidi art arda kullanabilir, aralarına başka bir vagonun hattını katabilirsin.','You can use two passes in a row and fit another wagon’s line between them.'),
 'expert-final':L('Usta bulmaca: tünelleri, bekleme peronunu ve dört vagonun geliş sırasını birlikte çöz.','Expert puzzle: solve tunnels, the waiting platform and four arrivals together.'),
 route:L('Vagonları 1’den başlayarak sırayla lokomotife ulaştır.','Bring the wagons to the locomotive in order, starting with 1.')
};
const EXTRA_RAILS=3,EXTRA_USES=3;
// Rewarded rails raise this level's budget; stars still compare the rails used against par.
const boostedLevel=(base,bonus)=>bonus?{...base,budget:base.budget+bonus}:base;
function startGame(id){
 setScreen('game');const base=catalog[Math.max(0,Math.min(COUNT-1,id-1))],bonus=save.boosts[base.id]||0,level=boostedLevel(base,bonus);selectedWorld=level.world;save.lastLevel=level.id;save.hasStarted=true;persist();
 game={roundId:crypto.randomUUID(),assisted:false,adDue:false,base,bonusRails:bonus,level,routes:restoreRoutes(level,save.drafts[level.id]),selected:1,history:[],journey:null,paused:false,hint:null,phase:'editing',speed:1,message:lessons[level.lesson],winTime:0,winPresented:false};
 document.body.style.setProperty('--sea',worlds[level.world].water);
 app.innerHTML=`<section class="play-screen" data-wagons="${level.wagons.length}" aria-labelledby="level-title">
  <header class="puzzle-header">${button('game-menu','pause',L('Oyun menüsü','Game menu'))}<div class="puzzle-title"><span class="level-chip" aria-hidden="true">${String(level.id).padStart(2,'0')}</span><div><span class="eyebrow">${L('BÖLÜM','LEVEL')} ${String(level.id).padStart(2,'0')} · ${worlds[level.world].name}</span><h1 id="level-title">${level.name}</h1></div></div><div class="rail-counter" id="rail-counter" aria-live="polite">${icon('rail')}<strong id="rail-number">${level.budget}</strong><span>${L('ray','rails')}</span><i class="rail-meter" aria-hidden="true"><b></b></i></div><button id="extra-rails" class="extra-rails" aria-label="${L(`Video izle, ${EXTRA_RAILS} ekstra ray al`,`Watch a video for ${EXTRA_RAILS} extra rails`)}">${icon('video')}<b>+${EXTRA_RAILS}</b><small>${L('ray','rails')}</small></button></header>
  <div class="puzzle-canvas"><canvas id="island" tabindex="0" role="application" aria-label="${L(`${level.name} ray bulmacası. Boş alanı tek parmakla sürükleyerek haritayı kaydır. Vagondan veya raydan sürükleyerek ray döşe.`,`${level.name} rail puzzle. Drag empty space with one finger to pan the map. Drag from a wagon or a rail to lay track.`)}" aria-describedby="game-message"></canvas></div>
  <footer class="puzzle-dock">${button('undo','undo',L('Son hamleyi geri al','Undo last move'))}<div class="dock-center"><div class="puzzle-wagons" role="group" ${L('aria-label="Vagon seçimi"','aria-label="Wagon selection"')}>${level.wagons.map(w=>`<button class="wagon-button" data-wagon="${w.id}" style="--wagon-color:${CAR_COLORS[w.id-1]}" aria-label="${L(`${w.id} numaralı vagonu seç`,`Select wagon ${w.id}`)}" aria-pressed="${w.id===1}"><span>${w.id}</span><i class="route-dot" aria-hidden="true">${icon('check')}</i></button>`).join('')}</div><div class="dock-tools"><button class="speed-button board-speed" id="speed" ${L('aria-label="Tren hızı 1 kat. 2 kata geç"','aria-label="Train speed 1×. Switch to 2×"')} aria-pressed="false">1×</button>${button('zoom-out','minus',L('Haritayı uzaklaştır','Zoom out'),'board-zoom')}${button('zoom-in','plus',L('Haritayı yakınlaştır','Zoom in'),'board-zoom')}</div></div><button class="button button-green play-button" id="play">${icon('play')}${L('<span>Başlat</span>','<span>Start</span>')}</button></footer>
  <p class="puzzle-message" id="game-message" role="status">${game.message}</p>
 </section>`;
 renderer=new IslandRenderer($('#island'),art,{
  cell:selectCell,end:()=>{gesture=null;saveDraft();},undo,tick,focus:announceCell,select:id=>selectWagon(id,false),camera:updateCameraHUD,
  begin:()=>{gesture={routes:cloneRoutes(game.routes),history:game.history.slice(),selected:game.selected,hint:game.hint,message:game.message};},
  cancel:()=>{if(!gesture||!game||game.journey)return;game.routes=gesture.routes;game.history=gesture.history;game.selected=gesture.selected;game.hint=gesture.hint;setMessage(gesture.message);renderer?.updateState(game);updateHUD();}
 },pref);applySkin();renderer.setLevel(level,game);renderer.fitBoard();

 bind('#game-menu','click',gameMenu);bind('#undo','click',undo);bind('#extra-rails','click',()=>extraRails(game));bind('#play','click',play);bind('#speed','click',toggleSpeed);
 bind('#zoom-in','click',()=>renderer.zoomBy(1.3));bind('#zoom-out','click',()=>renderer.zoomBy(1/1.3));
 document.querySelectorAll('[data-wagon]').forEach(el=>el.addEventListener('click',()=>selectWagon(Number(el.dataset.wagon))));
 updateHUD();setMessage(game.message);announce(L(`Bölüm ${level.id}. ${level.name}. ${game.message}`,`Level ${level.id}. ${level.name}. ${game.message}`));enterScene();
}
function toggleSpeed(){
 if(!game)return;
 game.speed=game.speed===1?2:1;
 if(game.journey)game.journey.speed=1.65*game.speed;
 const control=$('#speed');control.textContent=`${game.speed}×`;control.setAttribute('aria-pressed',String(game.speed===2));control.setAttribute('aria-label',L(`Tren hızı ${game.speed} kat. ${game.speed===1?2:1} kata geç`,`Train speed ${game.speed}×. Switch to ${game.speed===1?2:1}×`));haptic();
}
function gameMenu(){
 if(!game)return;
 const j=game.journey;
 if(j&&!j.done){game.paused=true;updateHUD();}
 const action=(id,g,label,disabled=false,ad=false)=>`<button id="${id}" class="pause-action ${ad?'rewarded':''}" ${disabled?'disabled':''}>${ad?`<i class="ad-badge" ${L('aria-label="Video reklam"','aria-label="Video ad"')}>${icon('video')}</i>`:''}${icon(g)}<span>${label}</span></button>`;
 const used=railCount(game.level,game.routes);
 openDialog(`<div class="pause-layout"><div class="pause-side"><span class="pause-badge" aria-hidden="true">${String(game.level.id).padStart(2,'0')}</span>${!window.RotaHost&&document.documentElement.requestFullscreen?button('fullscreen','fullscreen',L('Tam ekran','Full screen'),'pause-fullscreen'):''}<span class="eyebrow">${L('BÖLÜM','LEVEL')} ${String(game.level.id).padStart(2,'0')} · ${worlds[game.level.world].name}</span><h2>${game.level.name}</h2><div class="pause-meta"><span>${icon('rail')}<b>${used}</b> / ${game.level.budget} ${L('ray','rails')}</span><span>${icon('star')}≤ <b>${game.level.par}</b> ${L('hedef','target')}</span>${hasSpecialRules(game.level)?`<span class="beat-chip">${icon('clock')}${L('Vuruş','Beat')} <b id="beat-number">${j?.beat||0}</b></span>`:''}</div><div class="pause-footer"><button id="resume-game" class="button button-green">${icon('play')}${L(' Oyuna dön</button>',' Back to game</button>')}${j?action('stop-journey','rail',L('Raylara dön','Back to rails')):''}</div></div><div class="pause-grid">${action('menu-extra','rail',L(`+${EXTRA_RAILS} ray`,`+${EXTRA_RAILS} rails`),!!j||game.bonusRails>=EXTRA_RAILS*EXTRA_USES,true)}${action('auto-solve','hint',L('Otomatik çöz','Auto-solve'),!!j,true)}${action('reset','reset',L('Temizle','Clear'),!!j||!Object.values(game.routes).some(p=>p.length>1))}${action('fit-board','fit',L('Sığdır','Fit'))}${action('game-help','help',hasSpecialRules(game.level)?L('Kurallar','Rules'):L('Nasıl oynanır?','How to play'))}${action('menu-levels','map',L('Bölümler','Levels'))}${action('menu-home','home',L('Ana menü','Main menu'))}${action('settings','settings',L('Ayarlar','Settings'))}</div></div>`,()=>{
  bind('#menu-levels','click',()=>goMap(game.level.world,game.level.id));bind('#menu-home','click',goHome);
  bind('#menu-extra','click',()=>extraRails(game));bind('#auto-solve','click',()=>autoSolve(game));bind('#reset','click',()=>{closeDialog();reset();});bind('#settings','click',settingsDialog);bind('#game-help','click',()=>hasSpecialRules(game.level)?specialRules():helpDialog());
  const resume=()=>{closeDialog();if(game?.journey&&!game.journey.done){game.paused=false;updateHUD();}};bind('#resume-game','click',resume);
  bind('#stop-journey','click',()=>{closeDialog();editJourney();});
  bind('#fit-board','click',()=>{resume();renderer.fitBoard();});
  bind('#fullscreen','click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else{await document.documentElement.requestFullscreen();try{await window.screen.orientation?.lock?.('landscape');}catch{}}}catch{announce(L('Bu tarayıcıda tam ekran kullanılamıyor.','Full screen isn’t available in this browser.'));}});updateCameraHUD();
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
function announceCell(k){const c=game?.level.cells.get(k);if(!c)return;const labels={'#':L('Engel','Obstacle'),'~':L('Su','Water'),'G':L('Lokomotif','Locomotive'),'a':L('A tüneli','Tunnel A'),'b':L('B tüneli','Tunnel B'),'c':L('C tüneli','Tunnel C'),'p':L('Anahtar plakası','Key plate'),'l':L('Anahtarla açılan bariyer','Key barrier'),'X':L('Bir kez kullanılan yatay köprü','Single-use horizontal bridge'),'Y':L('Bir kez kullanılan dikey köprü','Single-use vertical bridge'),'q':L('Sinyal; yeşilde ayrılır','Signal; leaves on green'),'>':L('Doğuya tek yön','One way east'),'v':L('Güneye tek yön','One way south'),'<':L('Batıya tek yön','One way west'),'^':L('Kuzeye tek yön','One way north'),'w':L('Bir adım bekleme peronu','One-beat waiting platform'),'z':L('İki adım bekleme peronu','Two-beat waiting platform'),'H':L('Köprü','Bridge'),'V':L('Köprü','Bridge'),'.':L('Boş kare','Empty tile')};const lock=(c.type==='p'?game.level.plateLinks:game.level.gateLinks)?.get(k),label=lock!==undefined?`${keySign(lock).name} ${c.type==='p'?L('anahtarı. İstediğin vagon alabilir','key. Any wagon can collect it'):`${L('bariyeri.','barrier.')} ${game.journey?.openLocks.has(lock)?L('Açık','Open'):L('Kapalı','Closed')}`}`:labels[c.type]||L(`${c.type} numaralı vagon`,`Wagon ${c.type}`);announce(L(`${c.x+1}. sütun, ${c.y+1}. sıra. ${label}.`,`Column ${c.x+1}, row ${c.y+1}. ${label}.`));}
function selectWagon(id,focus=true){if(!game||game.journey||!game.routes[id])return;game.selected=id;game.hint=null;renderer.focused=game.routes[id].at(-1);if(focus)renderer.focusCell(renderer.focused,true);renderer.updateState(game);updateHUD();setMessage(L(`${id} numaralı vagon seçili. Parlayan son raydan devam et.`,`Wagon ${id} selected. Continue from its glowing last rail.`));haptic();}
function remember(){game.history.push({routes:cloneRoutes(game.routes),selected:game.selected});if(game.history.length>120)game.history.shift();}
function selectCell(k,initial){
 if(!game||game.journey||dialog)return;
 const wagon=game.level.wagons.find(w=>w.key===k);
 if(wagon&&initial&&wagon.id!==game.selected){selectWagon(wagon.id,false);return;}
 const before=JSON.stringify(game.routes),result=extendRoute(game.level,game.routes,game.selected,k);
 if(!result.ok){
  if(result.reason==='budget'){setMessage(game.bonusRails<EXTRA_RAILS*EXTRA_USES?L(`Ray hakkın bitti. Video izleyip +${EXTRA_RAILS} ray alabilir, ortak hat kurabilir veya bir rayı geri alabilirsin.`,`Out of rails. Watch a video for +${EXTRA_RAILS} rails, share a line or undo a rail.`):L('Ray hakkın bitti. Ortak hat kurabilir veya bir rayı geri alabilirsin.','Out of rails. Share a line or undo a rail.'),'error');$('#extra-rails')?.classList.add('nudge');}
  else if(['junction','crossing'].includes(result.reason))setMessage(L('Bu ray başka yöne gidiyor. Hatları aynı çıkışa bağla.','This rail heads another way. Join the lines at the same exit.'),'error');
  else if(initial&&walkable(game.level.cells.get(k)))setMessage(L('Seçili vagonun son rayından devam et. Vagon düğmelerinden diğerini seçebilirsin.','Continue from the selected wagon’s last rail, or pick another wagon below.'));
  return;
 }
 if(before===JSON.stringify(result.routes))return;
 remember();game.routes=result.routes;game.hint=null;haptic();audio.effect(result.trimmed?'undo':'rail');
 if(result.joined)setMessage(L('Ortak hat kuruldu. İki vagon aynı noktaya aynı anda gelmesin.','Lines joined. Don’t let two wagons reach the same tile at once.'));
 else if(result.teleported)setMessage(L('Tünelin diğer ucundan, okun gösterdiği yönde devam et.','Continue from the tunnel’s other end, in the arrow’s direction.'));
 else if(game.routes[game.selected].at(-1)===game.level.goal)setMessage(game.level.wagons.every(w=>game.routes[w.id].at(-1)===game.level.goal)?L('Hatlar hazır. Başlat ve buluşma sırasını izle.','All lines ready. Press Start and watch the meetup order.'):L('Bu hat tamam. Sıradaki vagonu seç.','This line is done. Pick the next wagon.'));
 else setMessage(L(`${game.selected} numaralı vagonun yolunu lokomotifin arkasına bağla.`,`Connect wagon ${game.selected} to the back of the locomotive.`));
 renderer.updateState(game);updateHUD();
}
function undo(){if(!game||game.journey||!game.history.length)return;const old=game.history.pop();game.routes=old.routes;game.selected=old.selected;game.hint=null;audio.effect('undo');renderer.updateState(game);updateHUD();saveDraft();setMessage(L('Son hamle geri alındı.','Last move undone.'));}
function reset(){if(!game||game.journey)return;remember();game.routes=blankRoutes(game.level);game.selected=1;game.hint=null;renderer.updateState(game);updateHUD();saveDraft();audio.effect('undo');setMessage(L('Raylar kaldırıldı. Geri al düğmesiyle eski rotana dönebilirsin.','Rails cleared. Undo brings your route back.'));}
async function extraRails(current){
 if(!current||game!==current||current.journey||commerce.busy||current.rewardPending)return;
 if(current.bonusRails>=EXTRA_RAILS*EXTRA_USES){setMessage(L('Bu bölümde ekstra ray hakkın doldu. Ortak hat kurmayı veya rotanı kısaltmayı dene.','No more extra rails on this level. Try sharing a line or a shorter route.'));return;}
 current.rewardPending=true;
 try{
  audio.pause();const result=commerce.native?await commerce.perform('rewarded'):await previewAd('rails');
  if(game!==current)return;closeDialog();audio.unlock();
  if(result?.status!=='earned'){setMessage(result?.status==='cancelled'?L('Video tamamlanmadı; ray eklenmedi.','Video not finished; no rails added.'):L('Şu anda video yok. Biraz sonra yeniden deneyebilirsin.','No video available right now. Try again in a bit.'));return;}
  current.bonusRails+=EXTRA_RAILS;current.level=boostedLevel(current.base,current.bonusRails);save.boosts[current.base.id]=current.bonusRails;persist();
  audio.effect('unlock');haptic(14);updateHUD();
  const counter=$('#rail-counter');counter?.classList.remove('gain');void counter?.offsetWidth;counter?.classList.add('gain');
  setMessage(L(`+${EXTRA_RAILS} ray eklendi! Bu bölümde ${EXTRA_USES-current.bonusRails/EXTRA_RAILS} hakkın kaldı.`,`+${EXTRA_RAILS} rails added! ${EXTRA_USES-current.bonusRails/EXTRA_RAILS} left on this level.`),'success');
 }finally{current.rewardPending=false;}
}
function previewAd(kind=false){
 const reward=!!kind,rails=kind==='rails';
 return new Promise(resolve=>openDialog(`<div class="dialog-hero"><span class="dialog-emblem emblem-sun">${icon(rails?'rail':reward?'video':'noads')}</span><div><span class="eyebrow">${L('REKLAM ÖNİZLEMESİ','AD PREVIEW')}</span><h2>${rails?L(`+${EXTRA_RAILS} ekstra ray`,`+${EXTRA_RAILS} extra rails`):reward?L('Bölüm senin için çözülsün.','Let us solve this level for you.'):L('Dört durak tamamlandı.','Four stops complete.')}</h2><p>${rails?L(`Tamamlanan ödüllü video bu bölümün ray hakkını ${EXTRA_RAILS} artırır.`,`A finished rewarded video adds ${EXTRA_RAILS} rails to this level.`):reward?L('Tamamlanan ödüllü reklam, bu bölümün raylarını otomatik yerleştirip trenleri başlatır.','A finished rewarded ad lays this level’s rails and starts the trains.'):L('Android sürümünde bu doğal bölüm arasında reklam gösterilir.','The Android version shows an ad at this natural break.')}</p></div></div><p class="muted">${L('Bu web önizlemesi gerçek reklam göstermez ve ödeme almaz.</p>','This web preview shows no real ads and takes no payments.</p>')}<div class="dialog-actions dialog-actions-row"><button class="button button-green" id="preview-ad-complete">${reward?L('Reklam tamamlanmasını dene','Simulate a finished ad'):L('Oyuna dön','Back to game')}</button>${reward?'<button class="button button-plain" data-close>'+L('Vazgeç','Cancel')+'</button>':''}</div>`,()=>bind('#preview-ad-complete','click',()=>{resolve({status:reward?'earned':'dismissed',shown:true});closeDialog();}),'ad-preview',()=>resolve({status:'cancelled',shown:!reward})));
}
async function autoSolve(current){
 if(!current||game!==current||current.journey||commerce.busy||current.rewardPending)return;
 current.rewardPending=true;
 const control=$('#auto-solve');if(control){control.disabled=true;control.querySelector('span').textContent=L('Video açılıyor…','Opening video…');}
 let result;
 try{
  audio.pause();result=commerce.native?await commerce.perform('rewarded'):await previewAd('solve');
  const routes=rewardedSolution(current.level,result,current.roundId,game?.roundId);
  if(game!==current)return;
  closeDialog();
  if(routes){remember();current.routes=routes;current.assisted=true;current.hint=null;renderer.updateState(current);updateHUD();saveDraft();await play();setMessage(L('Raylar yerleşti. Vagonların buluşmasını izleyebilirsin.','Rails placed. Watch your wagons meet up.'),'success');}
  else {audio.unlock();setMessage(result?.status==='cancelled'?L('Reklam tamamlanmadı; rayların değişmedi.','Ad not finished; your rails are unchanged.'):L('Şu anda reklam yok. Biraz sonra yeniden deneyebilirsin.','No ad available right now. Try again in a bit.'));}
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
let garageFrame=0;
/** Draws one carriage in a skin with its roof accessory and effects, fitted to the canvas box. */
function paintSkin(canvas,skin,{t=0}={}){
 const W=canvas.clientWidth,H=canvas.clientHeight,dpr=Math.min(3,window.devicePixelRatio||1);if(!W||!H)return;
 if(canvas.width!==Math.round(W*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}
 const c=canvas.getContext('2d'),classic=skin.row<0,img=classic?art.vehicles:art.skins;
 c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);if(!img)return;
 const [sx,sy,sw,sh]=classic?CLASSIC_THUMB.rect:SKIN_RECTS[0],s=Math.min(W/1.35,H/1.3),w=s*1.01,h=w*sh/sw;
 c.save();c.translate(W/2,H*.86);
 c.beginPath();c.ellipse(0,-s*.05,w*.45,s*.13,0,0,Math.PI*2);c.fillStyle='rgba(41,65,47,.18)';c.fill();
 if(classic)c.drawImage(img,sx,sy,sw,sh,-w/2,-h,w,h);else drawSkinnedCar(c,art,skin,w,h,{t,dir:0,s,reduced:pref.reducedMotion});
 c.restore();
}
function garageDialog(focus=equippedSkin()){
 openDialog('<div class="garage-root"></div>',()=>renderGarage(focus),'garage-dialog');
}
function renderGarage(focus,message=''){
 const root=$('.garage-root');if(!root)return;
 const sel=skinById(focus||root.dataset.skin),equipped=equippedSkin(),owned=ownsSkin(sel),price=s=>commerce.priceOf(s.product)||SKIN_PRICE_LABEL;
 root.dataset.skin=sel.id;
 const action=sel.id===equipped?`<button class="button button-outline" disabled>${icon('check')}${L(' Kullanılıyor</button>',' In use</button>')}`
  :owned?`<button id="equip-skin" class="button button-green">${icon('check')}${L(' Kullan</button>',' Use</button>')}`
  :`<button id="buy-skin" class="button button-yellow" ${commerce.native&&!commerce.state.billingReady?'disabled':''}>${commerce.native?(commerce.state.billingReady?L(`Satın al · ${escapeHtml(price(sel))}`,`Buy · ${escapeHtml(price(sel))}`):L('Satın alma şu anda kullanılamıyor','Purchases aren’t available right now')):L(`Önizlemede aç · ${SKIN_PRICE_LABEL}`,`Unlock in preview · ${SKIN_PRICE_LABEL}`)}</button>`;
 root.innerHTML=`<div class="garage-layout"><div class="garage-stage" style="--accent:${sel.accent}">${sel.seasonal?`<span class="season-tag">${icon('moon')}${L(' Cadılar Bayramı</span>',' Halloween</span>')}`:''}<canvas class="garage-wagon" aria-hidden="true"></canvas><h2>${sel.name}</h2><p>${sel.tagline}</p>${action}${!commerce.native&&!owned?`<p class="preview-note">${L('Önizleme · Ödeme alınmaz, yalnız bu oturumda geçerli.','Preview · No payment, valid this session only.')}</p>`:''}${message?`<p class="shop-status" role="status">${escapeHtml(message)}</p>`:''}</div><div class="garage-shelf"><span class="eyebrow">${L('VAGON GARAJI · TEK SEFERLİK','WAGON GARAGE · ONE-TIME')}</span><div class="skin-grid">${WAGON_SKINS.map(s=>`<button class="skin-card ${s.id===sel.id?'selected':''} ${s.id===equipped?'equipped':''}" data-skin="${s.id}" aria-pressed="${s.id===sel.id}" aria-label="${s.name}${ownsSkin(s)?'':`, ${escapeHtml(price(s))}`}" style="--accent:${s.accent}"><canvas class="skin-thumb" data-thumb="${s.id}" aria-hidden="true"></canvas><small>${s.id===equipped?`${icon('check')}${L('Takılı','Equipped')}`:ownsSkin(s)?L('Senin','Yours'):escapeHtml(price(s))}</small></button>`).join('')}</div></div></div>`;
 root.querySelectorAll('[data-thumb]').forEach(el=>paintSkin(el,skinById(el.dataset.thumb),{t:2.6}));
 // The stage plays the skin's accessories and effects live while the garage is open.
 const stage=root.querySelector('.garage-wagon'),start=performance.now();cancelAnimationFrame(garageFrame);
 const loop=now=>{if(!stage.isConnected)return;paintSkin(stage,sel,{t:(now-start)/1000});if(!pref.reducedMotion)garageFrame=requestAnimationFrame(loop);};
 loop(start);
 root.querySelectorAll('[data-skin]').forEach(el=>el.addEventListener('click',()=>{audio.effect('tap');renderGarage(el.dataset.skin);}));
 bind('#equip-skin','click',()=>{save.wagonSkin=sel.id;persist();applySkin();audio.effect('unlock');haptic();renderGarage(sel.id);});
 bind('#buy-skin','click',async()=>{
  if(!commerce.native){commerce.previewOwned.add(sel.product);save.wagonSkin=sel.id;persist();applySkin();audio.effect('success');renderGarage(sel.id,L(`${sel.name} bu oturum için açıldı.`,`${sel.name} unlocked for this session.`));return;}
  $('#buy-skin').disabled=true;const result=await commerce.perform(`purchase:${sel.product}`);
  if(result.status==='purchased'&&commerce.owns(sel.product)){save.wagonSkin=sel.id;persist();applySkin();audio.effect('success');}
  renderGarage(sel.id,purchaseMessages[result.status]||L('İşlem tamamlanamadı. Oyununa devam edebilirsin.','Couldn’t complete that. You can keep playing.'));
 });
}
function shopDialog(message=''){
 if(typeof message!=='string')message='';const owned=commerce.noAds;
 openDialog(`<div class="shop-layout"><div class="noads-ticket">${icon('noads')}<strong>No Ads</strong>${L('<span>Bölüm arası reklamları kaldır</span>','<span>Remove ads between levels</span>')}<small>${owned?L('Etkin','Active'):L('Tek seferlik','One-time')}</small></div><div class="shop-copy"><h2>${owned?L('Kesintisiz yolculuk.','An uninterrupted journey.'):L('Bulmacanın keyfi bölünmesin.','Keep the puzzles flowing.')}</h2><div class="plus-benefits"><p>${icon('check')}${L('Her 4 bölümde çıkan otomatik reklamlar kalkar','No more automatic ads every 4 levels')}</p><p>${icon('check')}${L('Tek seferlik satın alma, abonelik yok','One-time purchase, no subscription')}</p><p>${icon('check')}${L('Aynı Google Play hesabında otomatik geri gelir','Restored automatically on the same Google Play account')}</p></div><p class="purchase-disclosure">${L('Ekstra ray ve otomatik çöz için isteğe bağlı videolar devam eder; No Ads yalnız otomatik reklamları kaldırır.','Optional videos for extra rails and auto-solve stay available; No Ads removes only automatic ads.')}</p>${message?`<p class="shop-status" role="status">${escapeHtml(message)}</p>`:''}<div class="dialog-actions"><button class="button button-yellow" id="buy-noads" ${commerce.native&&(owned||!commerce.state.billingReady)?'disabled':''}>${commerce.native?(owned?L('No Ads etkin','No Ads active'):commerce.state.price?L(`${escapeHtml(commerce.state.price)} · Tek seferlik`,`${escapeHtml(commerce.state.price)} · One-time`):L('Satın alma şu anda kullanılamıyor','Purchases aren’t available right now')):(owned?L('No Ads önizlemesini kapat','Turn off No Ads preview'):L('No Ads önizlemesini aç · 49,99 ₺','Try No Ads in preview · ₺49.99'))}</button>${commerce.native?`<p class="preview-note">${L('Google Play ile güvenli ödeme. Satın almaların aynı hesapta otomatik geri gelir.','Secure payment with Google Play. Purchases come back automatically on the same account.')}</p>`:`<p class="preview-note">${L('Önizleme · Ödeme alınmaz. Deneme yalnız bu oturumda geçerlidir.','Preview · No payment. The trial lasts this session only.')}</p>`}</div><button class="text-button" ${L('data-close>Yolculuğa dön</button>','data-close>Back to the journey</button>')}</div></div>`,()=>{
  bind('#buy-noads','click',async()=>{if(!commerce.native){commerce.previewNoAds=!commerce.previewNoAds;shopDialog(commerce.noAds?L('No Ads bu oturum için açıldı.','No Ads is on for this session.'):L('Önizleme kapandı.','Preview off.'));return;}await purchaseAction('purchase');});
 },'shop-dialog');
}
const purchaseMessages={purchased:L('Satın alma tamamlandı. Desteğin için teşekkürler!','Purchase complete. Thanks for your support!'),restored:L('Satın alımların geri yüklendi.','Your purchases are restored.'),pending:L('Ödeme onay bekliyor. Onaylandığında açılacak.','Payment pending. It unlocks once approved.'),cancelled:L('Satın alma iptal edildi.','Purchase cancelled.'),not_owned:L('Bu Google Play hesabında satın alma bulunamadı.','No purchase found on this Google Play account.'),unavailable:L('Satın alma şu anda kullanılamıyor. Daha sonra yeniden deneyebilirsin.','Purchases aren’t available right now. Try again later.'),verification_pending:L('Satın alma kontrol ediliyor. Yeniden ödeme yapma; bağlantı gelince kendiliğinden açılacak.','Checking your purchase. Don’t pay again; it unlocks once you’re back online.'),busy:L('Önceki işlem sürüyor, biraz bekle.','Another purchase is in progress, hold on.')};
async function purchaseAction(action){
 if(commerce.busy)return;if($('#buy-noads'))$('#buy-noads').disabled=true;
 const result=await commerce.perform(action);
 shopDialog((result.status==='purchased'?L('No Ads açıldı. Desteğin için teşekkürler!','No Ads unlocked. Thanks for your support!'):result.status==='not_owned'?L('Bu Google Play hesabında No Ads bulunamadı.','No Ads wasn’t found on this Google Play account.'):purchaseMessages[result.status])||L('İşlem tamamlanamadı. Oyununa devam edebilirsin.','Couldn’t complete that. You can keep playing.'));
}
function nextStop(){if(!game||commerce.busy)return;const id=game.level.id;closeDialog();id<COUNT?startGame(id+1):goMap(worlds.length-1);}
async function play(){
 if(!game||commerce.busy||(game.phase==='won'&&!game.winPresented))return;const current=game;await audio.unlock();if(current!==game)return;
 if(game.journey){if(game.journey.done){editJourney();return;}game.paused=!game.paused;updateHUD();setMessage(game.paused?L('Yolculuk duraklatıldı.','Journey paused.'):L('Vagonlar yola devam ediyor.','Wagons rolling again.'));return;}
 if(!Object.values(game.routes).some(p=>p.length>1)){setMessage(L('Önce bir vagondan başlayarak ray çiz.','Start by drawing rails from a wagon.'));return;}
 game.editCamera=renderer.cameraSnapshot();renderer.fitBoard();game.journey=new Journey(game.level,game.routes,1.65*game.speed);game.paused=false;game.phase='running';game.hint=null;audio.effect('go');haptic(18);setMessage(L('Buluşma sırası: ','Meetup order: ')+game.level.wagons.map(w=>w.id).join(' → '));renderer.updateState(game);updateHUD();saveDraft();
}
function editJourney(){if(!game)return;game.journey=null;if(game.editCamera)renderer.restoreCamera(game.editCamera);game.paused=false;game.phase='editing';game.winTime=0;game.winPresented=false;renderer.updateState(game);updateHUD();setMessage(L('Rayların yerinde. Rotanı düzenleyip yeniden deneyebilirsin.','Your rails are still here. Edit your route and try again.'));}
function tick(dt){
 if(!game||dialog||document.hidden||document.documentElement.dataset.orientation==='portrait'||commerce.busy)return;
 if(game.phase==='won'){game.winTime+=dt;if(game.winTime>1.1&&!game.winPresented){game.winPresented=true;finishRound();}return;}
 if(!game.journey||game.paused||game.journey.done)return;
 const previousBeat=game.journey.beat;
 for(const event of game.journey.update(dt)){
  if(event.type==='coupled'){audio.effect('mail');haptic(12);renderer.burst(event.key,CAR_COLORS[event.wagon-1]);updateHUD();}
  if(event.type==='unlock'){audio.effect('unlock');renderer.burst(event.key,keySign(event.lock).color);setMessage(L(`${event.wagon} numaralı vagon ${keySign(event.lock).name} anahtarını aldı. Eşleşen bariyerler açıldı.`,`Wagon ${event.wagon} took the ${keySign(event.lock).name} key. Matching barriers opened.`));}
  if(event.type==='collapse'){renderer.burst(event.key,'#b99677');audio.effect('bridge');}
  if(event.type==='success')win();
  if(event.type==='failure'){
   game.phase='failed';audio.effect('error');haptic([12,60,12]);
   const text=event.reason==='locked'?L(`${keySign(event.lock).name} bariyeri kapalı ve bütün vagonlar bekliyor. İstediğin vagonu bu anahtara ulaştıracak yol kur.`,`The ${keySign(event.lock).name} barrier is closed and every wagon is waiting. Route any wagon to that key.`):event.reason==='fragile'?L(`${event.wagon} numaralı vagon çökmüş köprüye geldi. 1× köprüleri paylaşma; başka bir geçit kullan.`,`Wagon ${event.wagon} reached a collapsed bridge. Don’t share 1× bridges; use another crossing.`):event.reason==='order'?L(`${event.wagon} erken geldi. Önce ${event.expected} ulaşmalı; erken gelen vagona daha uzun yol çiz.`,`${event.wagon} arrived early. ${event.expected} must arrive first; give the early wagon a longer route.`):event.reason==='collision'?L(`${event.wagons.join(' ve ')} aynı noktada buluştu. Birinin yolunu uzatarak aralarına mesafe koy.`,`${event.wagons.join(' and ')} met on the same tile. Lengthen one route to space them out.`):event.reason==='unfinished'?L(`${event.wagon} numaralı vagonun rayı burada bitiyor. Raylara dönüp hattını tamamla.`,`Wagon ${event.wagon}’s rails end here. Go back and finish its line.`):L('Hat bağlantısı tamamlanmadı. Raylara dönüp yönleri kontrol et.','A line isn’t connected. Go back to the rails and check directions.');
   if(event.key){game.hint=event.key;renderer.burst(event.key,'#d8795e');}setMessage(text,'error');updateHUD();
  }
 }
 if(game.journey.beat!==previousBeat&&$('#beat-number'))$('#beat-number').textContent=game.journey.beat;
}
function updateHUD(){
 if(!game||!$('#play'))return;if($('#beat-number'))$('#beat-number').textContent=game.journey?.beat||0;const j=game.journey,remaining=game.level.budget-railCount(game.level,game.routes);
 $('#rail-number').textContent=remaining;$('#rail-counter').classList.toggle('empty',remaining===0);$('#rail-counter').classList.toggle('low',remaining>0&&remaining<=Math.max(2,game.level.budget*.2));$('#rail-counter').style.setProperty('--fill',Math.max(0,remaining/game.level.budget).toFixed(3));const extra=$('#extra-rails');extra.hidden=!!j||game.bonusRails>=EXTRA_RAILS*EXTRA_USES;extra.classList.toggle('nudge',remaining===0);
 document.querySelectorAll('[data-wagon]').forEach(el=>{const id=Number(el.dataset.wagon);el.setAttribute('aria-pressed',id===game.selected);el.classList.toggle('connected',game.routes[id].at(-1)===game.level.goal);el.classList.toggle('arrived',!!j?.arrived.includes(id));el.disabled=!!j;});
 $('#undo').disabled=!!j||!game.history.length;
 if($('#reset'))$('#reset').disabled=!!j||!Object.values(game.routes).some(p=>p.length>1);if($('#auto-solve'))$('#auto-solve').disabled=!!j;if($('#menu-extra'))$('#menu-extra').disabled=!!j||game.bonusRails>=EXTRA_RAILS*EXTRA_USES;
 const label=j?(j.done?L('Raylara dön','Back to rails'):game.paused?L('Devam et','Resume'):L('Duraklat','Pause')):L('Başlat','Start');
 $('#play').disabled=game.phase==='won'&&!game.winPresented;$('#play').innerHTML=`${icon(j&&!j.done&&!game.paused?'pause':j?.done?'rail':'play')}<span>${label}</span>`;
 $('.play-screen').dataset.phase=game.phase;
}
function win(){
 game.adDue=adPolicy.complete(game.roundId,{noAds:commerce.noAds,assisted:game.assisted});game.phase='won';game.winTime=0;const score=rating(game.level,game.routes),rails=railCount(game.level,game.routes);recordWin(save,game.level.id,score,rails);delete save.boosts[game.level.id];persist();audio.effect('success');haptic([20,70,30]);renderer.burst(game.level.goal);setMessage(L('Hepsi sırayla bağlandı. Güzel buluşmaydı!','All coupled in order. What a meetup!'),'success');updateHUD();
}
function showWin(){
 if(!game)return;const score=rating(game.level,game.routes),rails=railCount(game.level,game.routes),all=Object.keys(save.completed).length===COUNT;
 openDialog(`<div class="confetti" aria-hidden="true">${Array.from({length:18},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</div><div class="win-portrait"><img src="./assets/conductor.webp" ${L('alt="Mutlu makinist Pati"','alt="Pati the happy conductor"')} width="160" height="160"></div><div class="win-copy"><span class="eyebrow">${all?L(`${COUNT} DURAK, BİR GÜZEL YOLCULUK`,`${COUNT} STOPS, ONE LOVELY JOURNEY`):L('BİR BULUŞMA DAHA TAMAM','ANOTHER MEETUP DONE')}</span><h2>${all?L('Usta makinist sensin!','You’re a master conductor!'):L('Hepsi bir arada!','All together!')}</h2><div class="win-stars">${stars(score)}</div><p>${score===3?L('Usta hedefini yakaladın. Her ray yerini buldu.','You hit the master target. Every rail in its place.'):L('Vagonları sırayla buluşturdun. Daha az rayla yeniden deneyebilirsin.','Wagons united in order. Try again with fewer rails.')}</p><div class="result-receipt"><span>${icon('rail')}${L('Kullanılan ray<strong>','Rails used<strong>')}${rails}</strong></span><span>${icon('star')}${L('3 yıldız hedefi<strong>','3-star target<strong>')}≤ ${game.level.par}</strong></span></div><div class="dialog-actions"><button class="button button-green" id="next-level">${game.level.id<COUNT?L('Sonraki durak','Next stop'):L('Bölümlere dön','Back to levels')}${icon('arrow')}</button><button class="button button-plain" id="win-home">${icon('home')}${L('Ana Menü','Main Menu')}</button></div></div>`,()=>{bind('#next-level','click',nextStop);bind('#win-home','click',goHome);},'win-dialog');
}
function openDialog(content,onReady=()=>{},className='',onDismiss=()=>{}){
 renderer?.input.cancel();
 if(dialog)closeDialog();const el=document.createElement('dialog');el.className=`game-dialog ${className}`;el.setAttribute('aria-label',className==='win-dialog'?L('Bölüm tamamlandı','Level complete'):className==='settings-dialog'?L('Ayarlar','Settings'):L('Oyun penceresi','Game window'));el.innerHTML=`${button('dialog-close','close',L('Kapat','Close'),'dialog-close')}<div class="dialog-inner">${content}</div>`;
 el.returnFocus=document.activeElement;el.backgroundInert=app.inert;el.previousOverflow=document.body.style.overflow;el.onDismiss=onDismiss;
 document.body.appendChild(el);dialog=el;if(game)game.overlay=true;if(renderer)renderer.suspended=true;
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
 if(!dialog)return;const old=dialog;dialog=null;if(game)game.overlay=false;if(renderer){renderer.suspended=false;renderer.dirty=true;}dismissDialog(old);old.shade?.remove();app.inert=old.backgroundInert;document.body.style.overflow=old.previousOverflow;
 if(old.returnFocus?.isConnected)old.returnFocus.focus({preventScroll:true});old.onDismiss?.();
}
function specialRules(){
 if(!game)return;const level=game.level,beat=game.journey?.beat||0,entries=Object.entries(level.signals||{}),directed=[...level.cells.values()].some(c=>ONE_WAY[c.type]!==undefined),fragile=[...level.cells.values()].filter(fragileBridge);
 openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon(level.locks?'key':entries.length?'signal':'bridge')}</span><div><span class="eyebrow">${L('BÖLÜM','LEVEL')} ${String(level.id).padStart(2,'0')}</span>${L('<h2>Bu durağın kuralları</h2>','<h2>Rules of this stop</h2>')}</div></div>${level.locks?`<div class="lock-rules"><p>${icon('key')}${L('Anahtarı istediğin vagonla alabilirsin. Aynı simgeyi taşıyan bütün bariyerler açılır ve açık kalır.','Any wagon can collect a key. Every barrier with the same symbol opens and stays open.')}</p><div class="lock-list">${level.locks.map(l=>`<div style="--key-color:${keySign(l.id).color}"><strong>${icon(keySign(l.id).icon)} ${keySign(l.id).name}</strong><span>${l.gates.length} ${L('bariyer',l.gates.length===1?'barrier':'barriers')}</span><b>${game.journey?.openLocks.has(l.id)?L('Açık','Open'):L('Kapalı','Closed')}</b></div>`).join('')}</div><p>${L('Vagon kapalı bariyerin <strong>önünde</strong> bekler. Anahtar alındıktan sonraki vuruşta geçebilir. Arkadan gelen vagon bekleyene çarpabilir.','A wagon waits <strong>in front of</strong> a closed barrier and may pass on the beat after the key is taken. A wagon behind can bump into it.')}</p></div>`:''}${fragile.length?`<div class="fragile-rules"><span class="fragile-emblem">1×</span><p><strong>${L(`Hassas köprü · ${fragile.length} adet`,`Fragile bridge · ${fragile.length}`)}</strong>${L('Üzerinden ilk vagon ayrılınca çöker. Aynı anda arkasından giren ikinci vagon da geçemez. Köprüde düz ilerle; hazır rayı bütçeden düşmez.','It collapses once the first wagon leaves it, so a second wagon right behind can’t cross either. Go straight across; its rail is free.')}</p></div>`:''}${entries.length?`<p>${L('Sinyal karesindeki vagon kırmızıda bekler, yeşilde ayrılır. Döngüler bütün vagonlar için birlikte işler.','A wagon on a signal waits on red and leaves on green. Cycles run for all wagons together.')}</p><div class="signal-list">${entries.map(([k,s],i)=>`<div class="signal-rule"><div><strong>S${i+1}</strong><span>${s.green} ${L('yeşil','green')} · ${s.period-s.green} ${L('kırmızı','red')}</span></div><div class="signal-cycle" aria-label="S${i+1} ${L('döngüsü','cycle')}: ${Array.from({length:s.period},(_,b)=>`${L(`${b}. vuruş`,`beat ${b}`)} ${signalGreen(level,k,b)?L('yeşil','green'):L('kırmızı','red')}`).join(', ')}">${Array.from({length:s.period},(_,b)=>`<span class="${signalGreen(level,k,b)?'open':'closed'} ${beat%s.period===b?'current':''}" aria-hidden="true">${b}</span>`).join('')}</div></div>`).join('')}</div><p class="muted">${L('Yola çıkış vuruşu 0. Kırmızıda duran vagona arkadan çarpılabilir.','Departure is beat 0. A wagon stopped on red can be bumped from behind.')}</p>`:''}${directed?`<div class="oneway-rule">${icon('arrow')}<p>${L('Ok işaretli geçitlerde <strong>yalnız ok yönünde düz</strong> ilerlenir. Bu karelere ray döşemek de ray hakkı kullanır.','Arrow gates are crossed <strong>straight, in the arrow’s direction only</strong>. Rails on these tiles count toward your budget.')}</p></div>`:''}<div class="sticky-actions"><button class="button button-green" ${L('data-close>Planımı kurayım</button>','data-close>Let me plan</button>')}<button class="text-button" id="general-help">${L('Genel oyun rehberi ','General guide ')}${icon('help')}</button></div>`,()=>bind('#general-help','click',helpDialog),'rules-dialog');
}
function settingsDialog(){openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon('settings')}</span><div>${L('<h2>Ayarlar</h2>','<h2>Settings</h2>')}<p class="settings-intro">${L('Yolculuğu kendine göre ayarla.','Make the journey yours.')}</p></div></div><div class="settings-list">${[['sound','sound',L('Oyun sesleri','Game sounds'),L('Raylar, düdükler ve buluşmalar','Rails, whistles and meetups')],['music','music',L('Müzik','Music'),L('Sakin bir yol arkadaşı','A calm travel companion')],['haptics','vibrate',L('Dokunma titreşimi','Haptics'),L('Destekleyen telefonlarda','On supported phones')],['weather','snow',L('Hava efektleri','Weather effects'),L('Hafif kar, kum ve ortam ışıltıları','Light snow, sand and ambient sparkles')],['reducedMotion','leaf',L('Sakin görünüm','Calm mode'),L('Daha az hareket; hava efektleri kapanır','Less motion; weather effects off')]].map(([k,g,title,desc])=>`<label class="setting-row"><span class="setting-icon">${icon(g)}</span><span class="setting-label"><strong>${title}</strong><small>${desc}</small></span><input type="checkbox" role="switch" aria-label="${title}" data-setting="${k}" ${pref[k]?'checked':''}><span class="toggle" aria-hidden="true"></span></label>`).join('')}</div><div class="settings-foot"><button class="text-button" id="settings-shop">${icon('noads')} No Ads</button><button class="text-button" id="privacy-options" ${commerce.state.privacyRequired?'':'hidden'}>${icon('lock')}${L(' Gizlilik</button>',' Privacy</button>')}<button class="text-button" id="about-game">${icon('leaf')}${L(' Hakkında</button>',' About</button>')}<button class="button button-green" data-close>${icon('check')}${L(' Tamam</button>',' Done</button>')}</div><p class="settings-note">${L('İlerlemen bu cihazda saklanır.','Your progress is saved on this device.')}</p>`,()=>{document.querySelectorAll('[data-setting]').forEach(el=>el.addEventListener('change',()=>{pref[el.dataset.setting]=el.checked;persist();applyPreferences();if(el.checked&&['music','sound'].includes(el.dataset.setting))audio.unlock();if($('#sound-toggle'))$('#sound-toggle').innerHTML=icon(pref.sound?'sound':'mute');}));bind('#about-game','click',aboutDialog);bind('#settings-shop','click',shopDialog);bind('#privacy-options','click',async()=>{closeDialog();await commerce.perform('privacy');settingsDialog();});},'settings-dialog');}
function helpDialog(){openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon('train')}</span><div><span class="eyebrow">${L('NASIL OYNANIR?','HOW TO PLAY')}</span><h2>${L('Bir buluşma planla.','Plan a meetup.')}</h2></div></div><div class="help-steps"><div><b>1</b><p><strong>${L('Vagonu seç, rayını çiz.','Pick a wagon, draw its rails.')}</strong>${L('Vagondan başlayıp yan yana karelere sürükle. Eski bir raya dokunmak o hattı kısaltır.','Drag from the wagon across neighbouring tiles. Tapping an earlier rail shortens that line.')}</p></div><div><b>2</b><p><strong>${L('Lokomotifin arkasına bağla.','Connect to the locomotive.')}</strong>${L('Başka bir hatta bağlanınca devamındaki raylar ortak kullanılır; bütçeden bir kez düşer.','Join another line and the rest is shared; shared rails count once.')}</p></div><div><b>3</b><p><strong>${L('1’den başlayarak sırayla.','In order, starting with 1.')}</strong>${L('Hepsi aynı anda yola çıkar. Erken gelen vagona dolambaç kur. Aynı karede buluşmasınlar.','All wagons leave together. Give early wagons a detour, and never let two share a tile at once.')}</p></div></div><div class="help-notes"><p>${icon('bridge')}${L('Köprülerde düz ilerle. Aynı harfli tüneller eşleşir; içinden geçmek bir adım sürer.','Go straight over bridges. Tunnels with the same letter connect; passing through takes one beat.')}</p><p>${icon('video')}${L(`Ray yetmezse kısa bir video izleyip +${EXTRA_RAILS} ray alabilirsin (bölüm başına ${EXTRA_USES} kez). Otomatik çöz de bir video ister.`,`Short on rails? Watch a short video for +${EXTRA_RAILS} rails (${EXTRA_USES} times per level). Auto-solve also needs a video.`)}</p><p>${icon('clock')}${L('Saatli peronda bir nokta 1, iki nokta 2 adım bekletir. Perona çizdiğin ray bütçeden düşer.','A clock platform holds a wagon one beat per dot. Rails on platforms count toward your budget.')}</p><p>${icon('signal')}${L('Sinyal karesinde kırmızıda bekle, yeşilde ayrıl. Oyun menüsündeki bölüm kurallarından ışık döngülerini görebilirsin.','On a signal, wait on red and leave on green. See the light cycles under Rules in the game menu.')}</p><p>${icon('arrow')}${L('Ok işaretli geçitte yalnız ok yönünde düz ilerle. Sinyal ve ok karelerine de ray harcanır.','Cross arrow gates straight, in the arrow’s direction. Signal and arrow tiles also cost rails.')}</p><p>${icon('key')}${L('Anahtarları istediğin vagonla alabilirsin. Anahtarın simgesi, açacağı bariyerleri gösterir. 1× köprüler ilk kullanımdan sonra çöker.','Any wagon can take a key; its symbol shows which barriers it opens. 1× bridges collapse after first use.')}</p><p>${icon('zoom')}${L('Boş alanı tek parmakla sürükleyerek haritayı kaydır. Vagondan veya mevcut raydan sürüklemeye başladığında kamera sabit kalır. Alttaki − / + düğmeleriyle yakınlığı değiştir. Haritayı sığdırma seçeneği oyun menüsünde.','Drag empty space with one finger to pan. Dragging from a wagon or a rail keeps the camera still. Zoom with − / + below; Fit is in the game menu.')}</p></div><details><summary>${L('Klavye ile oynama','Keyboard controls')}</summary><p>${L('1–2–3–4–5–6: vagon seç. Oklar: kare seç. Enter / boşluk: ray ekle. Backspace: geri al. P: başlat / duraklat.','1–6: pick a wagon. Arrows: pick a tile. Enter / Space: add a rail. Backspace: undo. P: start / pause.')}</p></details><div class="sticky-actions"><button class="button button-green" data-close>${icon('check')}${L(' Anladım</button>',' Got it</button>')}</div>`,()=>{},'help-dialog');}
function aboutDialog(){openDialog(`<div class="dialog-title"><span class="dialog-emblem">${icon('leaf')}</span><div><span class="eyebrow">${L('OYUN HAKKINDA','ABOUT')}</span><h2>Railquest</h2></div></div><p>${L(`${COUNT} özgün bulmaca, ${worlds.length} bölge ve birlikte yolculuk eden küçük vagonlar.`,`${COUNT} original puzzles, ${worlds.length} regions and little wagons that travel together.`)}</p><div class="about-copy"><p>${commerce.native?L('Her dört tamamlanan bölümün ardından otomatik reklam gösterilir. No Ads bunları kaldırır; otomatik çözün isteğe bağlı ödüllü reklamları devam eder. Reklam hizmeti, gizlilik tercihlerine göre cihaz ve reklam verilerini işleyebilir.','An automatic ad plays after every four completed levels. No Ads removes them; optional rewarded videos remain. The ad service may process device and ad data according to your privacy choices.'):L('Bu web önizlemesi gerçek reklam göstermez ve ödeme almaz. No Ads denemesi yalnız bu oturumda geçerlidir.','This web preview shows no real ads and takes no payments. The No Ads trial lasts this session only.')}${L(' İlerleme bu cihazda saklanır. Tüm bölümler ücretsiz oynanabilir.',' Progress is saved on this device. Every level is free to play.')}</p><p>${L('Çizimler bu oyun için üretildi. Müzik ve sesler oyun içinde oluşturulur.','Art made for this game. Music and sounds are generated in-game.')}</p><p>${L('Anahtarların Yolculuğu · Sürüm','Journey of Keys · Version')} 0.15.1</p></div><button class="button button-green" ${L('data-close>Yolculuğa dön</button>','data-close>Back to the journey</button>')}`);}
function pauseForBackground(){renderer?.input.cancel();if(game?.journey&&!game.journey.done){game.paused=true;updateHUD();setMessage(L('Yolculuk duraklatıldı. Hazır olduğunda devam et.','Journey paused. Resume when you’re ready.'));}saveDraft();audio.pause();}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseForBackground();});window.addEventListener('rota-pause',pauseForBackground);window.addEventListener('rota-portrait',()=>{if(dialog)closeDialog();pauseForBackground();});
window.rotaBack=()=>{if(dialog){closeDialog();return true;}if(screen==='game'){gameMenu();return true;}if(screen==='map'){goHome();return true;}return false;};
document.addEventListener('keydown',e=>{if(dialog||screen!=='game'||e.ctrlKey||e.metaKey)return;if(e.key.toLowerCase()==='p'){e.preventDefault();play();}if(/^[1-6]$/.test(e.key)){e.preventDefault();selectWagon(Number(e.key));}});
window.addEventListener('pagehide',()=>{saveDraft();audio.pause();});
window.addEventListener('error',()=>{if(game){saveDraft();game.paused=true;setMessage(L('Beklenmedik bir sorun oluştu. Sayfayı yeniden açıp rotana dönebilirsin.','Something went wrong. Reopen the game to get back to your route.'),'error');updateHUD();}});
let mounted=false;
// Music starts with the menu. The Android app allows audio without a gesture; browsers only after the first
// touch, so any tap anywhere (not just Play) wakes the sound, and it resumes when the app returns.
const wakeAudio=()=>{if(!document.hidden&&!dialog?.classList.contains('ad-preview')&&!commerce.busy&&(!audio.ctx||audio.ctx.state!=='running'||!audio.timer))audio.unlock();};
document.addEventListener('pointerdown',wakeAudio,{capture:true,passive:true});
document.addEventListener('keydown',wakeAudio,{capture:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)wakeAudio();});
export function mountGame(loaded){
 if(mounted)return;art=loaded;applyPreferences();goHome();mounted=true;commerce.refresh();wakeAudio();
 // Dynamic boot may finish after the load event; register in either case.
 if('serviceWorker' in navigator&&location.protocol==='https:'&&location.hostname!=='appassets.androidplatform.net'){
  const register=()=>navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
  if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
 }
}
