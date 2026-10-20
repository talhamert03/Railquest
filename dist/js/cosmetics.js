/** Wagon liveries. Rows index dist/assets/wagon-skins.webp (built by scripts/build-wagon-skins.py); their sheen, glow and sparkles live in skin-effects.js. */
export const SKIN_ATLAS='./assets/wagon-skins.webp';
// Emissive light of the same cells at half size (see skin-effects.js).
export const SKIN_GLOW_ATLAS='./assets/wagon-glow.webp';
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
 {id:'gold',name:'Altın Ekspres',tagline:'Cilalı altın gövde, ışıl ışıl pencereler',row:0,product:'wagon_gold',accent:'#e8b33c'},
 {id:'neon',name:'Neon Gece',tagline:'Kenarlarında yanıp sönen neon şeritler',row:1,product:'wagon_neon',accent:'#38d8ff'},
 {id:'rosegold',name:'Gül Altını',tagline:'Pembe metal, yumuşak parıltı',row:2,product:'wagon_rosegold',accent:'#e7a58f'},
 {id:'lava',name:'Volkan',tagline:'Kömür gövdede kor gibi lav çatlakları',row:3,product:'wagon_lava',accent:'#ff6a00'},
 {id:'emerald',name:'Zümrüt',tagline:'Cilalı yeşil, altın şerit',row:4,product:'wagon_emerald',accent:'#1c8a55'},
 {id:'ruby',name:'Yakut Kraliyet',tagline:'Kırmızı lake, çift altın şerit',row:5,product:'wagon_ruby',accent:'#c1122f'},
 {id:'pearl',name:'Sedef İnci',tagline:'Pembe ve lila sedef yansımalar',row:6,product:'wagon_pearl',accent:'#d9c6ff'},
 {id:'galaxy',name:'Galaksi',tagline:'Gövdesinde yanıp sönen yıldızlar',row:7,product:'wagon_galaxy',accent:'#5b2fb8'},
 {id:'frost',name:'Buz Kristali',tagline:'Buz mavisi, parlayan çatı kenarı',row:8,product:'wagon_frost',accent:'#86cdf2'},
 {id:'halloween',name:'Balkabağı Gecesi',tagline:'Mum gibi titreyen yeşil ışıklar',row:9,product:'wagon_halloween',accent:'#f07a12',seasonal:true},
]);
export const SKIN_PRODUCTS=Object.freeze(WAGON_SKINS.filter(s=>s.product).map(s=>s.product));
export const skinById=id=>WAGON_SKINS.find(s=>s.id===id)||WAGON_SKINS[0];
