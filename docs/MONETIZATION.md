# Gelir modeli — 0.13.0

Ücretsiz ana oyun. Gelir dört yerden gelir: her dört tamamlanan turda bir otomatik geçiş reklamı, isteğe bağlı ödüllü videolar (ekstra ray ve otomatik çöz), tek seferlik No Ads ve tek seferlik vagon kozmetikleri. Can, enerji veya ücretli bölüm yok.

| Akış | Davranış |
|---|---|
| Otomatik reklam | 4., 8., 12. tamamlanan turda, buluşma animasyonundan sonra ve sonuç ekranından önce açılır |
| Tekrar oynama | Aynı bölümü yeniden tamamlamak da sayılır; başarısız denemeler sayılmaz |
| Sayaç | Cihazda saklanır. 0.10 öncesinden kalan dolu sayaç (4/5), güncellemeden sonraki ilk tamamlamada reklamı gösterir |
| Reklam yüklenmezse | O fırsat atlanır, sonuç ekranı açılır |
| Ücretsiz ipucu | Kaldırıldı |
| Ekstra ray | Oyunun üst çubuğunda ve oyun menüsünde video rozetli **+3 ray** düğmesi. Tamamlanan her ödüllü video o bölümün ray hakkını 3 artırır; bölüm başına en fazla 3 kez. Ray bitince düğme nabız gibi atar. Kazanılan raylar bölüm bitene kadar kayıtta kalır |
| Yıldızlar | Kullanılan ray yine bölümün hedefiyle (par) karşılaştırılır; ekstra rayla bitiren oyuncu doğal olarak daha az yıldız alır |
| Otomatik çöz | Oyun menüsünde video rozetli kutucuk; yalnız tamamlanan ödüllü videoda bütün raylar yerleşir. Otomatik reklam sayacına eklenmez |
| No Ads | Tek seferlik; yalnız otomatik geçiş reklamlarını kaldırır. Ödüllü videolar isteğe bağlı olarak sürer |
| Vagon kozmetikleri | 10 tasarım, her biri ayrı tek seferlik ürün, hepsi aynı fiyat (24,99 TL). Garaj: ana menü → **Vagonlar** veya bölüm seçimi → **Vagonlar** |

## Play Console ürünleri

Hepsi **tüketilmeyen** (one-time, non-consumable) uygulama içi ürün; satın alma seçeneği `buy`, kiralama veya ön sipariş yok. Vagonların fiyatı 24,99 TRY; diğer ülkeler için Play'in otomatik kur dönüşümü kullanılabilir. Uygulama her zaman Play'in yerelleştirilmiş fiyatını gösterir; Play'den fiyat gelmezse yedek etiket "24,99 ₺"tir.

| Ürün kimliği | Görünen ad |
|---|---|
| `rota_plus` | No Ads |
| `wagon_gold` | Altın Ekspres |
| `wagon_neon` | Neon Gece |
| `wagon_rosegold` | Gül Altını |
| `wagon_lava` | Volkan |
| `wagon_emerald` | Zümrüt |
| `wagon_ruby` | Yakut Kraliyet |
| `wagon_pearl` | Sedef İnci |
| `wagon_galaxy` | Galaksi |
| `wagon_frost` | Buz Kristali |
| `wagon_halloween` | Balkabağı Gecesi (Cadılar Bayramı) |

Kimlikler `dist/js/cosmetics.js` ve `BillingController.java` içinde aynıdır; `tests/billing.test.mjs` iki listenin eşleştiğini denetler.

## Satın alma doğrulaması

- **Sunucusuz (varsayılan):** `rotaBillingVerifyUrl` boşsa satın alma cihazda Play Billing ile onaylanır (acknowledge) ve Play'in satın alma listesi esas alınır. Her açılışta ve uygulamaya dönüşte liste yeniden sorgulanır; iade edilen ürün kaldırılır. Çevrimdışı oyuncu sahipliğini 30 gün korur. Kök erişimli cihazlara karşı sunucu doğrulaması kadar güçlü değildir.
- **Sunuculu:** `rotaBillingVerifyUrl` bir HTTPS `/verify` adresiyse her ürün `billing-server` üzerinden Google'a doğrulatılır ve sunucu onaylar. İstek `{purchaseToken, productId}` gönderir; eski sürümler `productId` göndermez ve No Ads kabul edilir.

Belirteçler loglanmaz veya JavaScript'e aktarılmaz. JavaScript yalnız sahip olunan ürün kimliklerini ve fiyat metinlerini görür.

## AdMob

Yayın derlemesi `android/gradle.properties` içindeki kimlikleri kullanır:

| Ayar | Değer |
|---|---|
| `rotaAdmobAppId` | `ca-app-pub-1770141144744598~9051742862` |
| `rotaInterstitialUnit` (Geçiş) | `ca-app-pub-1770141144744598/3590076356` |
| `rotaRewardedUnit` (Ödüllü) | `ca-app-pub-1770141144744598/1927756309` |
| `rotaLiveAds` | `true` |

Debug derlemesi her zaman Google'ın test birimlerini kullanır; kendi birimlerinde test tıklaması yapma. Yeni birimlerin reklam göstermesi bir saat kadar sürebilir. Geliştirici web sitende `app-ads.txt` yayımlanmalıdır.

Ödüllü reklam açık onayla başlar ve reddeden oyuncu devam eder: [AdMob ödül politikası](https://support.google.com/admob/answer/7313578?hl=en). Geçiş reklamı doğal bölüm arası kullanır: [AdMob rehberi](https://developers.google.com/admob/android/interstitial). Banner veya açılış reklamı yoktur. UMP izni alınmadan reklam yüklenmez; gerekliyse Ayarlar'dan gizlilik tercihleri açılır.

## Web önizlemesi

Web ödeme almaz ve gerçek reklam göstermez. Ödüllü video, geçiş reklamı, No Ads ve vagon satın alma "önizleme" pencereleriyle denenir; açılan her şey yalnız o oturumda geçerlidir.

## Yayından önce gerçek cihazda denenecekler

| Durum | Beklenen |
|---|---|
| Ekstra ray videosu tamamla / kapat | Tamamlanınca +3 ray; kapatılınca ray yok, hak harcanmaz |
| 3 ekstra ray sonrası | Düğme gizlenir; ray bitince yalnız ortak hat / geri al önerilir |
| 4. ve 8. tur | Sonuç ekranından önce geçiş reklamı; yüklenmezse sonuç ekranı |
| Vagon satın al / iptal / bekleyen ödeme | Yalnız PURCHASED durumda açılır ve takılır |
| Uygulamayı sil / yeniden yükle | Garaj → Satın alımları geri yükle aynı hesabın vagonlarını getirir |
| İade | Sonraki açılışta vagon klasiğe döner |
| Debug APK | Paket `.dev` olduğu için Play ürünleri bulunmaz; satın alma testi dahili test kanalındaki imzalı sürümle yapılır |

Aktif kullanıcı ve reklam doluluğu bilinmediği için gelir tahmini verilmez.

