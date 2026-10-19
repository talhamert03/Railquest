# Yayın hazırlığı — 0.9.0

## Bu sürümün ekran ve kontrol değişiklikleri

- Yalnız yatay oyun: dikey web ekranında çevirme görünümü, duraklayan simülasyon ve pasif arka plan. Native `sensorLandscape`, tam ekran ve çentik koruması.
- Katmanlı ana menü düğmeleri; ilk girişte bölüm seçimi; dönüşte son seçilen bölüm/çizimin devamı; eski v2 kayıtlarına `hasStarted` göçü.
- Altı bölge, kaydırılan durak düğmeleri ve seçili haritanın gerçek Canvas çizicisiyle canlı önizlemesi.
- Oyun alanında yalnız menü, geri al, vagon seçimi ve Başlat. Diğer işlemler duraklatma menüsünde. Mesajlar geçici; oyun alanı iki dar kontrol satırı arasında tüm genişliği kullanır.
- Sayfa pinch-zoom, gesture büyütme ve Ctrl+wheel engellenir; tek parmak durak/pencere kaydırması korunur. Harita yakınlığı oyun menüsünden ayarlanır.
- Biome atlaslarının beyaz kenarları opak deniz çizimiyle düzeltildi. Gerçek atlaslarla önce/sonra görüntülerinde fark doğrulandı.

## Korunan kapsam

58 bölüm ve altı bölge. 58 bölümün verileri, bütçeleri ve çözüm yolları bu güncellemede korunur; derlenmiş bölüm dosyası ve anahtar tasarım yolları önceki Git sürümüyle birebir karşılaştırıldı. 53–54 beş, 55–58 altı vagonla oynanır. Tüm bölümler açıktır; geçerli alternatif rotalar gerçek kurallarla değerlendirilir.

Güneş, Ay ve Yıldız anahtarları eşleşen bariyerleri kalıcı açar. Her anahtarı bütün vagonlar alabilir. Harita üzerindeki işaretler vagon numaralarından bağımsız şekillerle gösterilir; açılan bariyer aynı simgeyi ve küçük bir onay işaretini taşır. Toplama mesajı anahtarı alan vagonu belirtir. Vagon kapalı bariyerin önünde bekler; açılmayı izleyen vuruşta geçer. Bütün vagonlar kapı bekliyorsa anlaşılır kilitlenme sonucu verilir. 1× hassas köprüler ilk vagonun ayrıldığı vuruşta çöker; takip eden ikinci vagon aynı vuruşta da geçemez. Yeniden denemede bu durumlar sıfırlanır. 58. bölüm üç anahtar, üç sinyal, üç tünel ve beş hassas köprüyü birleştirir.

Ana menüde mevcut ada resmi korunur; büyük Oyna/Bölümler düğmeleri kısa animasyonlarla açılır. Ana menü ve bölüm seçimi tek yatay oyun ekranına sığacak şekilde tanımlıdır. Ayarlar sol üstte, No Ads sağ üsttedir. Menüden açılan ayarlar, native dialog veya erişilebilir modal yedeği kullanır. Ses ve müzik bağımsız kanallardır.

Vagonlara sürüş salınımı, seçili vagon hareketi ve yumuşak konvoy bağlanması eklendi. Bu hareketler kurallardan ayrıdır. Bitkiler hafif salınır, çayırlarda az sayıda ışık zerresi ve buzulda sakin kuzey ışığı şeridi vardır. Bölge ışıkları yeniden boyutlandırmada hazırlanır. Yeni bitmap veya ağ hizmeti eklenmedi; mevcut kapak ve bütün atlaslar korundu. Hareket azaltma hareketleri, hava seçeneği atmosfer efektlerini kapatır.

Gerçek hazırlık ilerlemesini gösteren açılış ekranı, çevrimdışı paket, reklam sayacı ve No Ads / ödüllü otomatik çöz akışları korunur. Web önizlemesi gerçek reklam veya ödeme içermez. Canlı gelir etkin değildir.

## Doğrulama

- `node --test tests/*.test.mjs`: 148 test geçti; hata, iptal ve atlanan test yok. Bu sayı aşağıdaki mekanik, çizim, kayıt, kaynak, ses ve gelir köprüsü kontrollerini içerir.
- Yeni anahtar regresyonları: 1–6 numaralı vagonların her biri üç anahtarın her birini alır; 18 kombinasyonda toplayıcı kimliği, sonraki vuruşta geçiş ve bir anahtarın farklı vagonların yolundaki iki bariyeri birlikte açması sınandı.
- 58 bölüm oyuncunun ray ekleme işlemleriyle kurulup doğru varış sırasına kadar çalıştırıldı. Anahtarlı bölümlerde varış raporu bütün konvoyun simülasyonundan hesaplanır. Sinyaller ve yeni bölümler 30/60/120 Hz güncellemelerde aynı sonuçları verdi.
- Anahtarın doğru vuruşta açılması, kalıcı durumu, kapıda bekleyene çarpışma, kalıcı kilitlenme, köprüye eşzamanlı/geç ikinci giriş, köprü yönleri, bütçe ve yeniden deneme sınandı. Bozuk anahtar tanımları yüklemede reddedilir.
- Tam harita görünümünde Canvas arka ucunda 58 harita 450×231, 832×301, 390×460 ve 1200×620 çizim alanlarında çalıştırıldı. Dokunma koordinat dönüşümü, tam konvoy alanı ve eski parçacık hatası kontrol edildi.
- Yeni kamera testleri bütün 58 haritada 246×300, 318×470, 450×180, 640×231, 706×255, 832×301, 700×740, 920×560 ve 1200×620 çizim alanlarını kapsar: başlangıç ölçeği, genel görünüm, bütün hücrelere erişim, zoom noktası, uç kaydırma sınırları ve yön değişimi. Bunlar CSS yerleşim veya fiziksel cihaz testleri değildir.
- Canvas giriş işleyicileriyle boş alandan ray üstüne kaydırma, kamera kilitli tam çözüm çizimi, hızlı ray çizimi, vagon seçimi, kısa dokunma, iptal/yeniden boyutlandırma, modal kilidi, sağ tık ve klavye odağı sınandı. İkinci parmak, hareket eşiği, visualViewport yüksekliği ve dinleyici temizliği ayrıca sınandı.
- Modal yedeği yerel açılışın bulunmadığı ve hata verdiği sahte bağımlılıklarla sınandı. Müzik/efekt kanallarının bağımsız susturulması ve diğer ayarlarda müziğin yeniden başlamaması sınandı. JSDOM ile ayarlar, ilk giriş, 58 bölümün seçim/başlat/menü akışı, kamera menüsü, devam kaydı ve ipucu geçişleri çalıştırıldı. CSS dosyaları ayrıştırıldı. Bunlar tarayıcı yerleşimi veya gerçek dokunma testi değildir.
- `node scripts/check.mjs` JavaScript sözdizimini, statik/dinamik modül yollarını, varlıkları ve çevrimdışı CSS/modül/görsel kapsamını doğruladı. Mevcut bütün bitmap dosyaları aynı kaldı.

Bu kontroller gerçek cihaz FPS, bellek veya açılış süresi ölçümü değildir. Yeni bölüm çözümleri ve anahtar bağlantıları `LEVEL-DESIGN.md` içinde bulunur. İleri yıldız hedefleri küresel minimum iddiası taşımaz.

## Android paketi

`assembleDebug` JDK 17.0.20.1, Gradle 8.13, SDK 36 ve Build Tools 35.0.0 ile başarılı (36 görev). Paket `com.rotaadalari.game.dev`, versionCode 9 / 0.9.0-dev, minSDK 26 / targetSDK 36.

APK Signature Scheme v2 ve ZIP hizalaması doğrulandı. 0.8.0 test paketiyle aynı test sertifikası kullanıldı; paket bütünlüğü ve uygulama içindeki 40 oyun dosyasının kaynak `dist` ile birebir eşleşmesi doğrulandı. APK boyutu 9,612,079 bayt. SHA-256: `918ba9f5d7999a2c9a2a3406449f2e3f10ef1b0e1c863c798052f30576c4f8e0`.

JSDOM akış doğrulaması ve gerçek atlaslarla Canvas görsel karşılaştırması yapıldı. Fiziksel cihaz veya emülatör kullanılmadı. Statik proje için desteklenen tarayıcı önizlemesi bulunmadığından CSS düzeninin tarayıcı görüntüsüyle kabulü yapılmadı. Bu bir test APK’sıdır; Google Play yayın AAB’si değildir.

## Kalan yayın işleri

1. Fiziksel Galaxy A36 ve tablette yatay menü/harita yerleşimi, tek parmak dokunma, çentik, ters yatay yön, ses, yükleme ekranı ve arka plan kabulü. Web tarafında gerçek tarayıcı CSS yerleşim testi; bu çalışma ortamında statik proje için desteklenen tarayıcı önizlemesi yoktu.
2. Özellikle 53–58'de anahtar işaretlerinin okunabilirliği, hassas köprülerin anlaşılması ve oyuncu zorluk dengesi.
3. Yayın sahibinin Google Play yükleme anahtarıyla imzalı AAB. Test APK’sı ve yayın AAB’si ayrı çıktılardır; Play yayını yapılmadı.
4. Play Console/AdMob kimlikleri, UMP mesajları, doğrulama sunucusu, hesap yetkileri ve `MONETIZATION.md` kabul matrisi. No Ads ürün kimliği `rota_plus` olarak korunur.
5. Çevrimdışı başlangıç, service worker güncellemesi, uzun oturum ve düşük donanımda animasyon/atmosfer performansı.
6. Yayıncı iletişimi, gizlilik URL'si, hedef kitle, içerik derecelendirmesi, Veri güvenliği, mağaza materyalleri ve yayın tarihindeki hedef API gereksinimi.

Android kaynak hedefi API 36; sürüm 0.9.0 / versionCode 9. Google Play'e yükleme/yayın yapılmadı. Durdurulan haftalık görev yeniden açılmadı.
