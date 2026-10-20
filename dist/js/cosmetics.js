/** Wagon skins. Rows index dist/assets/wagon-skins.webp (built by scripts/build-wagon-skins.py). */
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
 {id:'sakura',name:'Kiraz Çiçeği',tagline:'Pembe çatı, bahar havası',row:0,product:'wagon_sakura',accent:'#f2a0bd'},
 {id:'midnight',name:'Gece Ekspresi',tagline:'Işıl ışıl pencereler',row:1,product:'wagon_midnight',accent:'#2d3c74'},
 {id:'golden',name:'Altın Lüks',tagline:'Siyah ve altın, birinci sınıf',row:2,product:'wagon_golden',accent:'#f0c04a'},
 {id:'mint',name:'Nane Şekeri',tagline:'Ferah nane, şeker pembe',row:3,product:'wagon_mint',accent:'#79d6bd'},
 {id:'lemon',name:'Limonata',tagline:'Güneşli bir yaz yolculuğu',row:4,product:'wagon_lemon',accent:'#ffd84a'},
 {id:'lavender',name:'Lavanta',tagline:'Mor tarlaların kokusu',row:5,product:'wagon_lavender',accent:'#9b7ed6'},
 {id:'forest',name:'Orman Kulübesi',tagline:'Ahşap gövde, yosun çatı',row:6,product:'wagon_forest',accent:'#6aa84f'},
 {id:'ocean',name:'Okyanus Esintisi',tagline:'Turkuaz dalgalar',row:7,product:'wagon_ocean',accent:'#2fb3c4'},
 {id:'frost',name:'Buz Kristali',tagline:'Karlı bir sabah',row:8,product:'wagon_frost',accent:'#bfe3f7'},
 {id:'halloween',name:'Balkabağı Gecesi',tagline:'Cadılar Bayramı’na özel',row:9,product:'wagon_halloween',accent:'#f28a1e',seasonal:true},
]);
export const SKIN_PRODUCTS=Object.freeze(WAGON_SKINS.filter(s=>s.product).map(s=>s.product));
export const skinById=id=>WAGON_SKINS.find(s=>s.id===id)||WAGON_SKINS[0];
/** CSS background for a skin thumbnail of the given width, cropped from its atlas. */
export function skinThumb(skin,width){
 if(skin.row<0){
  const {src,atlas,rect:[x,y,w,h]}=CLASSIC_THUMB,f=width/w;
  return `width:${width}px;height:${Math.round(h*f)}px;background:url(${src}) ${-x*f}px ${-y*f}px/${atlas[0]*f}px ${atlas[1]*f}px no-repeat`;
 }
 const [,,w,h]=SKIN_RECTS[0],f=width/w;
 return `width:${width}px;height:${Math.round(h*f)}px;background:url(${SKIN_ATLAS}) 0 ${-skin.row*SKIN_CELL[1]*f}px/${SKIN_ATLAS_SIZE[0]*f}px ${SKIN_ATLAS_SIZE[1]*f}px no-repeat`;
}
