/** Wagon liveries. Rows index dist/assets/wagon-skins.webp (built by scripts/build-wagon-skins.py); their sheen, glow and sparkles live in skin-effects.js. */
import {L} from './i18n.js';
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
export const SKIN_PRICE_LABEL=L('24,99 ₺','₺24.99');
export const WAGON_SKINS=Object.freeze([
 {id:'classic',name:L('Klasik','Classic'),tagline:L('Railquest’in ilk vagonu','Railquest’s very first wagon'),row:-1,product:null,accent:'#c4563e'},
 {id:'gold',name:L('Altın Ekspres','Golden Express'),tagline:L('Cilalı altın gövde, ışıl ışıl pencereler','Polished gold body, glowing windows'),row:0,product:'wagon_gold',accent:'#e8b33c'},
 {id:'neon',name:L('Neon Gece','Neon Night'),tagline:L('Kenarlarında yanıp sönen neon şeritler','Neon strips flickering along its edges'),row:1,product:'wagon_neon',accent:'#38d8ff'},
 {id:'rosegold',name:L('Gül Altını','Rose Gold'),tagline:L('Pembe metal, yumuşak parıltı','Pink metal with a soft shimmer'),row:2,product:'wagon_rosegold',accent:'#e7a58f'},
 {id:'lava',name:L('Volkan','Volcano'),tagline:L('Kömür gövdede kor gibi lav çatlakları','Ember-bright lava cracks in a coal body'),row:3,product:'wagon_lava',accent:'#ff6a00'},
 {id:'emerald',name:L('Zümrüt','Emerald'),tagline:L('Cilalı yeşil, altın şerit','Lacquered green with a gold stripe'),row:4,product:'wagon_emerald',accent:'#1c8a55'},
 {id:'ruby',name:L('Yakut Kraliyet','Royal Ruby'),tagline:L('Kırmızı lake, çift altın şerit','Red lacquer, twin gold stripes'),row:5,product:'wagon_ruby',accent:'#c1122f'},
 {id:'pearl',name:L('Sedef İnci','Mother of Pearl'),tagline:L('Pembe ve lila sedef yansımalar','Pink and lilac pearly reflections'),row:6,product:'wagon_pearl',accent:'#d9c6ff'},
 {id:'galaxy',name:L('Galaksi','Galaxy'),tagline:L('Gövdesinde yanıp sönen yıldızlar','Stars twinkling across its body'),row:7,product:'wagon_galaxy',accent:'#5b2fb8'},
 {id:'frost',name:L('Buz Kristali','Ice Crystal'),tagline:L('Buz mavisi, parlayan çatı kenarı','Ice blue with a glowing roofline'),row:8,product:'wagon_frost',accent:'#86cdf2'},
 {id:'halloween',name:L('Balkabağı Gecesi','Pumpkin Night'),tagline:L('Mum gibi titreyen yeşil ışıklar','Green lights that flicker like candles'),row:9,product:'wagon_halloween',accent:'#f07a12',seasonal:true},
]);
export const SKIN_PRODUCTS=Object.freeze(WAGON_SKINS.filter(s=>s.product).map(s=>s.product));
export const skinById=id=>WAGON_SKINS.find(s=>s.id===id)||WAGON_SKINS[0];
