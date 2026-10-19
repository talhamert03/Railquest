# V2 oyun varlıkları

Araç ve ortam atlasları bu oyun için yerleşik ImageGen aracıyla üretildi. İki istek, iki seçili sonuç; varyant veya tekrar üretim yapılmadı. Kaynak çıktılar 1536×1024 RGBA; uygulamada alfa korunarak WebP'ye çevrildi.

- `dist/assets/vehicles-v2.webp`: 4 sütun × 2 satır. İlk satır lokomotif; ikinci satır vagon. Sıra: ekran sağ-alt, sol-alt, sol-üst, sağ-üst. Petrol yeşili, krem, kiremit rengi ve pirinç ayrıntılar. Sayı işaretleri oyun tarafından okunaklı ve dinamik olarak çizilir.
- `dist/assets/props-v2.webp`: yapraklı ağaçlar, çamlar, kayalar, çiçekler, sağ-alt ve sol-alt tünel ağızları, istasyon, sinyal. İstasyon kendi hücresinden taştığı için atlas kesimi özel sınırlarla yapılır. Kesim sınırları `renderer.js` içindedir.

Üretim özeti: “Original cute premium isometric toy diorama game sprites, transparent background, consistent orthographic 30-degree camera, soft top-left lighting, rounded forms, crisp readable details, no logos, text, grid, ground plane or cast shadow. Vehicle atlas: same teal/cream/terracotta/brass steam engine and same cream/terracotta carriage, four rotations. Environment atlas: trees, spruce, rocks, flowers, two moss-topped stone tunnel mouths, rural station and wooden signal.”

Kapak, Pati ve uygulama simgeleri önceki sürümden korunur. Referans görseller sanat yönünü değerlendirmek için kullanıldı; mevcut oyundan kesilmiş veya kopyalanmış görsel kullanılmadı.

## Kumdan Kara — 0.4.0

Kapak ve araç atlasları değiştirilmedi. Mevcut alfa kanallı ortam çizimleri yeniden kullanılır: çöllerde kaya ve seyrek bitki, kışta çam ağırlığı vardır. Altın kum, kızıl kanyon, kar ve buzul bölgelerinin zemin, kıyı, su, grid ve minyatür harita renkleri bölge verilerinde ayrı tanımlanır. Görsel piksel verisi değiştirilmedi; arazi oyun motorunda çizilir.

Yeni çöl ve kış atlası denemeleri arka planında dama deseni içerdiği için uygulamaya eklenmedi. Çalışan mevcut atlaslar kullanılarak görsellerde kareli arka plan veya eksik varlık oluşması önlendi. Yeni bağımsız çöl/kış nesne atlasları bu sürümün teslimi değildir.

## Saatler ve Sinyaller — 0.5.0

Bu sürümde iki yeni atlas üretildi ve oyuna eklendi. İki ImageGen çağrısı, iki seçili sonuç; tekrar üretim yapılmadı. Önceki `props-v2.webp` sanat yönü referansı olarak kullanıldı. Kaynaklar 1774×887 RGB; düz açık arka plan içerir. Kaynaklar incelendikten sonra orantılı küçültme ve WebP dönüşümü uygulandı; arka plan silme veya alfa üretimi yapılmadı. Canvas'ta `multiply` bileşimi kullanılır.

| Dosya | İçerik | Boyut |
|---|---|---:|
| `dist/assets/biomes-desert-snow-v5.webp` | Kaktüs, kumtaşı, palmiye, çöl istasyonu; karlı çam, kayalar, kulübe, çalı | 1280×640, 86.392 bayt |
| `dist/assets/biomes-glacier-clock-v5.webp` | Buz kristalleri, kayalar, kemer, gözlemevi; bakır saat kulesi, dişliler, mor ağaç, amber çit | 1280×640, 106.808 bayt |

İki atlas toplam 193.200 bayt ekler. Kaynak koordinatları ve temas noktaları `dist/js/biome-sprites.js` içinde saklanır; örnekleme mevcut çözünürlüğe ölçeklenir. Tam üretim istemleri `docs/ART-PROMPTS-V5.json` içindedir. Kapak, Pati ve araç atlası korunur. Arazi ve işlevsel sinyal/ok işaretleri kodla çizilir; kar, kum esintisi, buz ve bahçe ışıkları `weather.js` içinde sınırlı parçacık sayılarıyla üretilir.

## Anahtarların Yolculuğu — 0.6.0

Yeni bitmap üretilmedi; V2 araçlar, kapak ve V5 bölge atlasları kullanılır. Menünün ada resmi çok hafif hareket eder. Araçların gövde salınımı ve konvoyun bağlanma hareketi mevcut sprite'lara sunum dönüşümü uygular; bitmap piksel verisi değiştirilmez. Bitkiler küçük açılarla salınır. Bölge ışıkları yeniden boyutlandırmada hazırlanan gradyanlarla, buzul şeridi sınırlı sayıda noktayla çizilir. Anahtar, bariyer ve 1× köprü işaretleri oyun kurallarını açıklayan işlevsel geometridir.
