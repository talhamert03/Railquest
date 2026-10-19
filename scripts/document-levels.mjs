import {writeFile} from 'node:fs/promises';
import {levels} from '../dist/js/levels.js';
import {parseLevel,arrivalTimes} from '../dist/js/engine.js';
import {keySign} from '../dist/js/key-signs.js';
let text=`# Bölüm tasarım defteri — 0.7.0

${levels.length} bölüm, 6 bölge. İlk 52 bölümün bütün verileri ve bütçeleri korunur.

| Bölge | Bölümler | Sayı |
|---|---|---:|
| Çayır Yolları | 1–8 | 8 |
| Kum Denizi | 9–16, 54 | 9 |
| Kar İstasyonları | 17–24, 49–50 | 10 |
| Zaman Bahçeleri | 25–36, 45–46, 53, 57 | 16 |
| Kızıl Kanyon | 37–40, 47–48, 56 | 7 |
| Buzul Geçitleri | 41–44, 51–52, 55, 58 | 8 |

Vagonlar aynı anda çıkar. Bir ray hareketi veya tünel geçişi bir vuruş sürer. Saatli peronda bir nokta bir, iki nokta iki ek vuruş tutar. Ortak ray bir kez sayılır. Bekleme peronu, sinyal ve tek yön karesine ray koymak bütçeden düşer. İleri bölüm yıldız hedefleri küresel minimum iddiası taşımaz; alternatif çözümler kabul edilir.

Sinyaller vuruş 0'dan başlayan ortak saate bağlıdır. Vagon kırmızı sinyal karesine girebilir, fakat yeşil olana kadar o kareden ayrılamaz. Yeşil koşulu: (vuruş + faz) mod döngü < yeşil süresi. Bekleyen vagona arkadan gelen çarpabilir. Hız düğmesi yalnız animasyon süresini değiştirir. Tek yön karesine giriş ve çıkış ok yönünde düz olmalıdır.

Her vagon Güneş, Ay veya Yıldız anahtarını alabilir. Simge, açılan bariyer grubunu gösterir. Anahtar plakasına varış eşleşen bariyerleri kalıcı açar; kapalı bariyerin önünde bekleyen vagon ancak sonraki vuruşta geçer. Plaka ve bariyer kareleri ray hakkı kullanır. Bütün vagonlar kapı bekliyorsa bölüm kilitlenme nedeni ile sonlanır. Hassas köprüler hazır raydır ve bütçeden düşmez; ilk vagon ayrıldığı vuruşta çöker. Aynı vuruşta arkasından gelen ikinci vagon da geçemez. Yeniden denemede anahtarlar ve köprüler sıfırlanır. Anahtarlı bölümlerin varışları tek rota uzunluğundan değil, bütün konvoyun simülasyonundan hesaplanır.

| Bölüm | Ad | Vagon | Ray hedefi / hak | Örnek varış vuruşları | Tasarım amacı |
|---|---|---:|---:|---|---|
`;
for(const data of levels){const l=parseLevel(data);text+=`| ${l.id} | ${l.name} | ${l.wagons.length} | ${l.par} / ${l.budget} | ${Object.values(arrivalTimes(l,l.solution)).join(' → ')} | ${l.designNote||l.lesson} |\n`;}
text+=`\n## Tasarım yaklaşımı

25’te tanıdık üç vagonla bekleme tanıtılır. 26–28 dördüncü vagonu ve yakın varışları ekler. 29 ortak bekleme peronunda çarpışmayı öğretir. 30–32 tünel seçimi ve yön değişimleri, 33–35 dar geçitte zaman aralıkları, 36 bu mekaniklerin birleşimidir. 37–40 daha uzun hatlar, ortak peron aralıkları ve üç geçitli kanyon labirentidir. 41–44 geç katılımlar, yön değiştiren tüneller ve art arda iki peronla süre hesabını derinleştirir.

45 beş vagonla sinyalde ayrılma zamanını öğretir; 46 ortak yeşil aralığına tek yönlü geçitleri ekler. 47 farklı döngüleri köprülerle birleştirir, 48 tünel zincirinden sonra bekleyen ortak hatlar oluşturur. 49 altıncı vagonu ve dış hatların katılma sırasını ekler. 50 üç tünelin ve dört sinyalin zamanlamasını birleştirir. 51 iki vagonun aynı yeşil aralığını paylaşmasını, 52 altı vagonun iki ortak yeşil penceresini ve yönlü geçitleri aynı planda hesaplamayı amaçlar.

53, sonraki vagonun öncekinin yolunu açmasını öğretir. 54 üç anahtarı ters bağımlılık sırasına dizer. 55 her vagona ayrı hassas köprü gerektirir. 56 altıncı vagonun anahtarını iki tünel ve dört hassas köprüye bağlar. 57 iki kıyı, altı hassas köprü ve uzun beklemeler içerir. 58 üç tünel, üç sinyal, üç anahtar ve beş hassas köprüyü altı vagonla birleştirir.

Tasarım notlarında adı geçen vagonlar örnek çözüme aittir; motor anahtarları belirli bir vagona atamaz.

Açık yan alanlar alternatif çizimler ve yanlış denemeler için bırakılmıştır. Hiçbir oyun sonu kararı aşağıdaki çözüm dizileriyle eşitliğe bağlı değildir. Çözülebilirlik her haritada gerçek ray ekleme işlemleri ve simülasyonla sınanır. Zorluk ve eğlence oyuncu testlerinde ayrıca dengelenmelidir. İpucu hesabı yereldir; otomatik çözün kullanımı tamamlanmış ödüllü reklam gerektirir.

## Doğrulanmış rotalar

Koordinatlar sıfırdan başlayan (sütun,satır) çiftleridir. Uzak ardışık kareler eşleşen tünel ağızlarıdır. Bekleme ve sinyal noktaları ayrıca listelenir. Sinyal numaraları oyundaki S1, S2… sırasıyla aynıdır. Yönler haritanın sütun/satır eksenine göredir.
`;
for(const data of levels){const l=parseLevel(data);text+=`\n### ${l.id}. ${l.name}\n\n`;
 for(const w of l.wagons)text+=`- Vagon ${w.id}: ${l.solution[w.id].map(k=>`(${k})`).join(' → ')}\n`;
 const waits=[...l.cells.values()].filter(c=>'wz'.includes(c.type));if(waits.length)text+=`- Peronlar: ${waits.map(c=>`(${c.key}) +${c.type==='z'?2:1}`).join('; ')} vuruş.\n`;
 for(const [i,[k,s]] of Object.entries(l.signals||{}).entries())text+=`- S${i+1} (${k}): döngü ${s.period}, yeşil ${s.green}, faz ${s.phase}.\n`;
 for(const lock of l.locks||[])text+=`- ${keySign(lock.id).name}: anahtar (${lock.plate}), bariyerler ${lock.gates.map(k=>`(${k})`).join(', ')}.\n`;
 const fragile=[...l.cells.values()].filter(c=>['X','Y'].includes(c.type));if(fragile.length)text+=`- Hassas köprüler: ${fragile.map(c=>`(${c.key}) ${c.type==='X'?'yatay':'dikey'}`).join('; ')}.\n`;
 const names={'>':'doğu','v':'güney','<':'batı','^':'kuzey'},arrows=[...l.cells.values()].filter(c=>names[c.type]);if(arrows.length)text+=`- Tek yön: ${arrows.map(c=>`(${c.key}) ${names[c.type]}`).join('; ')}.\n`;
}
await writeFile(new URL('../docs/LEVEL-DESIGN.md',import.meta.url),text);
