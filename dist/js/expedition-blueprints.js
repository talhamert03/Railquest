/** Further expeditions: authored timing proofs, not runtime answer matching. */
const labyrinth={
 name:'Kumların Labirenti',w:13,h:10,lesson:'tunnel-chain',directions:{1:2},
 tunnels:[['a',0,0,0,4,0,1],['b',4,3,0,7,1,1],['c',0,6,0,9,5,1]],
 paths:[[[3,0],[0,0],[4,0],[4,1],[6,1],[6,3],[4,3],[7,1],[7,3],[11,3]],[[0,4],[2,4],[2,5],[5,5],[5,3],[4,3],[7,1],[7,3],[11,3]],[[0,8],[6,8],[6,7],[3,7],[3,6],[0,6],[9,5],[9,6],[10,6],[10,3],[11,3]],[[0,9],[10,9],[10,6],[10,3],[11,3]]],
 waits:[[3,5,2],[4,5,2],[2,9,2],[4,9,2],[6,9,2]],
 floor:[[4,1,6,2],[1,4,3,5],[3,7,6,8],[7,6,9,8]],water:[[7,6,7,9]],bridges:[[7,9,'H']],
 idea:'İlk iki vagon B çıkışını paylaşır. C, üçüncüyü önce güneye çıkarır; son vagonun bu hatta ne zaman katılacağını hesapla.'
};
// Reflect every geometric property together, including tunnel-mouth directions.
function flipY(b){
 const y=v=>b.h-1-v,dir=d=>d===1?3:d===3?1:d,rect=r=>[r[0],y(r[3]),r[2],y(r[1])];
 return {...b,paths:b.paths.map(p=>p.map(([x,v])=>[x,y(v)])),directions:Object.fromEntries(Object.entries(b.directions||{}).map(([k,d])=>[k,dir(d)])),
  tunnels:(b.tunnels||[]).map(([l,x,v,d,u,w,e])=>[l,x,y(v),dir(d),u,y(w),dir(e)]),
  floor:(b.floor||[]).map(rect),water:(b.water||[]).map(rect),bridges:(b.bridges||[]).map(([x,v,t])=>[x,y(v),t]),waits:(b.waits||[]).map(([x,v,n])=>[x,y(v),n])};
}
export const expeditionBlueprints=[
 {name:'Kanyon Makası',w:12,h:9,lesson:'bottleneck',
  paths:[[[2,0],[6,0],[6,4],[10,4]],[[0,2],[3,2],[3,6],[7,6],[7,4],[10,4]],[[0,7],[8,7],[8,4],[10,4]],[[0,8],[9,8],[9,4],[10,4]]],
  waits:[[8,4,1],[2,7,2],[5,7,2],[6,7,1],[2,8,2],[5,8,2],[7,8,2]],
  floor:[[2,0,5,1],[1,2,3,4],[3,5,6,6],[1,7,6,8]],water:[[4,3,4,8]],bridges:[[4,6,'H'],[4,7,'H'],[4,8,'H']],
  idea:'Ortak perona giren ilk üç vagona aralık bırak. Dördüncü, perondan sonraki makasa bağlanabilir.'},
 {name:'Vaha Saatleri',w:12,h:9,lesson:'two-tunnels',directions:{1:2,2:2},
  tunnels:[['a',0,1,0,5,0,1],['b',0,4,0,4,5,0]],
  paths:[[[3,1],[0,1],[5,0],[5,3],[10,3]],[[3,4],[0,4],[4,5],[7,5],[7,3],[10,3]],[[0,7],[8,7],[8,3],[10,3]],[[0,8],[9,8],[9,3],[10,3]]],
  waits:[[5,1,2],[5,5,2],[7,4,1],[3,7,2],[3,8,2]],
  floor:[[0,0,3,2],[0,3,3,5],[4,2,8,5],[1,6,5,8]],water:[[6,0,6,8]],bridges:[[6,3,'H'],[6,5,'H'],[6,7,'H'],[6,8,'H']],
  idea:'A ve B aynı uzunlukta görünebilir; peronları farklıdır. Dört varışı birer vuruşla sırala.'},
 {name:'Dar Kervan',w:12,h:9,lesson:'bottleneck',
  paths:[[[4,0],[6,0],[6,3],[10,3]],[[0,1],[3,1],[3,5],[7,5],[7,3],[10,3]],[[0,6],[8,6],[8,3],[10,3]],[[0,8],[8,8],[8,6],[8,3],[10,3]]],
  waits:[[8,3,2],[2,6,2],[4,6,2],[6,6,2],[2,8,2],[4,8,2],[6,8,2],[7,8,1]],
  floor:[[4,0,6,2],[1,1,3,3],[1,4,6,5],[1,6,7,8]],
  idea:'İki vuruşluk ortak peron, arka arkaya gelenleri durdurur. Son iki vagon aynı uzun hattı üç vuruş arayla kullanmalı.'},
 labyrinth,
 {name:'Karın Öteki Yüzü',w:12,h:9,lesson:'bottleneck',directions:{1:2},tunnels:[['a',0,6,0,6,0,1]],
  paths:[[[3,6],[0,6],[6,0],[6,4],[10,4]],[[0,1],[3,1],[3,5],[7,5],[7,4],[10,4]],[[0,7],[8,7],[8,4],[10,4]],[[0,8],[9,8],[9,4],[10,4]]],
  waits:[[6,2,2],[7,4,1],[4,5,1],[2,7,2],[4,7,1],[6,7,2],[2,8,2],[4,8,1],[6,8,2]],
  floor:[[1,1,4,3],[4,4,6,5],[1,7,7,8],[6,1,8,3]],
  idea:'Alttaki ilk vagon dağın üstünden çıkar. 1 ve 2 ortak perondan geçer; 3 ve 4 bir sonraki makasları kullanabilir.'},
 flipY({...labyrinth,name:'Kutup Düğümü',lesson:'bottleneck',
  waits:[[8,3,2],[3,5,2],[4,5,2],[5,4,1],[4,8,2],[3,7,1],[2,9,2],[4,9,2],[6,9,2],[8,9,2]],
  idea:'Tünel zincirinin sonunda iki vuruşluk peron var. İlk iki vagonun arasını açarken dış hatların sırasını da koru.'}),
 {name:'Üç Buz Kapısı',w:13,h:10,lesson:'three-tunnels',directions:{1:2,2:2},
  tunnels:[['a',0,1,0,5,0,1],['b',0,5,0,4,6,0],['c',3,8,3,8,6,1]],
  paths:[[[3,1],[0,1],[5,0],[5,4],[11,4]],[[3,5],[0,5],[4,6],[7,6],[7,4],[11,4]],[[0,7],[3,7],[3,8],[8,6],[8,7],[9,7],[9,4],[11,4]],[[0,9],[10,9],[10,4],[11,4]]],
  waits:[[5,2,1],[5,6,2],[7,5,1],[1,7,2],[2,7,2],[8,7,1],[4,9,2]],
  floor:[[0,0,3,2],[4,2,5,4],[4,5,8,7],[1,8,5,9],[8,8,10,9]],water:[[6,0,6,9]],bridges:[[6,4,'H'],[6,6,'H'],[6,9,'H']],
  idea:'C tünelinin ağzına kuzeyden girilir ve güneyden çıkılır. Üç geçidin sürelerini dört ardışık varışa dönüştür.'},
 {name:'Son Kar Ekspresi',w:12,h:9,lesson:'expert-final',directions:{1:2},tunnels:[['a',0,0,0,6,0,1]],
  paths:[[[3,0],[0,0],[6,0],[6,4],[10,4]],[[0,2],[3,2],[3,6],[7,6],[7,4],[10,4]],[[0,7],[8,7],[8,4],[10,4]],[[0,8],[9,8],[9,4],[10,4]]],
  waits:[[7,4,1],[8,4,1],[2,7,2],[4,7,2],[6,7,2],[2,8,2],[4,8,2],[6,8,2],[7,8,1]],
  floor:[[0,0,3,1],[1,2,3,5],[6,1,8,3],[1,6,4,8],[6,5,8,8]],water:[[5,2,5,8]],bridges:[[5,6,'H'],[5,7,'H'],[5,8,'H']],
  idea:'Art arda iki ortak peron var. Hangi vagonun hangi perondan sonra katılacağını seç; köprülerden kalan rayları hesapla.'}
].map((b,i)=>({...b,world:i<4?4:5,slack:0}));
