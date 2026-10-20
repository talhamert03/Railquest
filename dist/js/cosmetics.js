/** Wagon skins. Rows index dist/assets/wagon-skins.webp (built by scripts/build-wagon-skins.py); accessories and effects live in skin-effects.js. */
export const SKIN_ATLAS='./assets/wagon-skins.webp';
export const SKIN_ATLAS_SIZE=Object.freeze([952,2490]);
export const SKIN_CELL=Object.freeze([238,249]);
// Source rectangles of the four carriage directions inside one atlas row: right-down, left-down, left-up, right-up.
export const SKIN_RECTS=Object.freeze([[0,0,236,243],[238,0,235,245],[476,0,232,248],[714,0,230,248]]);
// The classic carriage lives in the vehicle atlas (right-down crop), used for its thumbnail.
export const CLASSIC_THUMB=Object.freeze({src:'./assets/vehicles-v2.webp',atlas:[1536,1024],rect:[35,586,328,338]});
/** Every paid skin is its own one-time Play product, priced the same in Play Console. */
export const SKIN_PRICE_LABEL='24,99 ₺';
export const WAGON_SKINS=Object.freeze([
 {id:'classic',name:'Klasik',tagline:'Railquest’in ilk vagonu',row:-1,product:null,accent:'#c4563e'},
 {id:'dragon',name:'Ejderha Ekspresi',tagline:'Pullu gövde, çırpan kanatlar, ateş nefesi',row:0,product:'wagon_dragon',accent:'#3fae5a'},
 {id:'unicorn',name:'Unicorn',tagline:'Altın boynuz ve pırıltılar',row:1,product:'wagon_unicorn',accent:'#e27fd0'},
 {id:'galaxy',name:'Galaksi Yolcusu',tagline:'Yıldız tozu ve yörüngede minik gezegen',row:2,product:'wagon_galaxy',accent:'#5b2fb8'},
 {id:'halloween',name:'Balkabağı Gecesi',tagline:'Titreyen fener, etrafında yarasalar',row:3,product:'wagon_halloween',accent:'#f28a1e',seasonal:true},
 {id:'icequeen',name:'Buz Kraliçesi',tagline:'Kristal taç, süzülen kar taneleri',row:4,product:'wagon_icequeen',accent:'#7fb8f0'},
 {id:'sakura',name:'Kiraz Bahçesi',tagline:'Çiçek tacı, uçuşan yapraklar',row:5,product:'wagon_sakura',accent:'#ec5f95'},
 {id:'mermaid',name:'Deniz Kızı',tagline:'Sedef pullar, yükselen baloncuklar',row:6,product:'wagon_mermaid',accent:'#46d1c3'},
 {id:'royal',name:'Kraliyet Treni',tagline:'Mücevherli taç, altın pırıltılar',row:7,product:'wagon_royal',accent:'#e9b949'},
 {id:'candy',name:'Şeker Diyarı',tagline:'Dönen lolipop, uçan kalpler',row:8,product:'wagon_candy',accent:'#ff7fb0'},
 {id:'firefly',name:'Ateş Böceği Ormanı',tagline:'Mantar şapka, yanıp sönen ateş böcekleri',row:9,product:'wagon_firefly',accent:'#6aa84f'},
]);
export const SKIN_PRODUCTS=Object.freeze(WAGON_SKINS.filter(s=>s.product).map(s=>s.product));
export const skinById=id=>WAGON_SKINS.find(s=>s.id===id)||WAGON_SKINS[0];
