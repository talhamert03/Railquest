# Railquest — Vagon Yolculuğu

Telefon ve tablet için yalnız yatay tasarlanan özgün tren bulmacası. 58 bölüm, altı bölge, sınırlı ray bütçesi, altıya kadar numaralı vagon, ortak hatlar, köprüler, A/B/C tünelleri, bekleme peronları, sinyaller ve tek yönlü geçitler.

## Railquest — 0.13.0 · Premium vagonlar

10 vagon kaplaması yeniden tasarlandı: Altın Ekspres, Neon Gece, Gül Altını, Volkan, Zümrüt, Yakut Kraliyet, Sedef İnci, Galaksi, Buz Kristali ve Balkabağı Gecesi. Üstüne obje eklenmez; vagonun kendisi boyanır:

- **Malzeme:** Cilalı lake, parlak metal (altın, gül altını), sedef ve nebula boyaları orijinal oyuncak gölgelendirmesi korunarak uygulanır. Neon ve altın şeritler vagonun gerçek çatı ve şasi kenarlarını izler.
- **Işıma:** Neon şeritler, lav çatlakları, yıldızlar ve yanan pencereler ayrı bir ışıma katmanındadır (`wagon-glow.webp`); oyunda ışık gibi eklenir, nefes alır gibi parlar, neon arada titrer, Cadılar Bayramı ışıkları mum gibi oynar.
- **Hareket:** Her birkaç saniyede vagonun yüzeyinden bir ışık yansıması geçer (silüete kırpılı), boyanın en parlak noktalarında pırıltılar çakar, Volkan'dan kıvılcımlar yükselir. Garaj önizlemesi canlıdır.
- Efektler bulanıklık kullanmaz; vagon kaplamasıyla FPS klasik vagonla aynı kalır. Sakin görünümde hareket durur.
- Üretim: `python3 scripts/build-wagon-skins.py`. Play Console ürün kimlikleri `docs/MONETIZATION.md` içinde. Android sürüm kodu 16.

## Railquest — 0.12.0 · Tam ekran ve akıcılık

- **Tam ekran:** Android uygulaması kenardan kenara çizer; kamera deliği bölgesinde açık renkli şerit kalmaz. Delik ölçüsü CSS değişkenleriyle (`--native-safe-*`) sayfaya iletilir, yalnız düğmeler ondan uzak durur.
- **Akıcılık:** Deniz, ışık ve zemin tek bir önbellekte; her karede tek görüntü kopyalanır. Harita kaydırılırken önbellek yeniden çizilmez, kaydırılır. Traversler tek çizim komutunda toplanır, rozetlerde bulanık gölge kullanılmaz. Yavaş cihazda canvas çözünürlüğü bir kez otomatik düşer. Menü animasyonları yalnız dönüşüm (transform) kullanır; pencere arkasındaki bulanıklık kaldırıldı ve pencere açıkken harita boşuna yeniden çizilmez. 4× yavaşlatılmış işlemcide boşta 31→60, kaydırmada 16→~45 FPS.
- Android sürüm kodu 15.

## Railquest — 0.11.0 · Garaj ve yeni gelir modeli

- **Ekstra ray:** Ücretsiz ipucu kaldırıldı. Oyunun üst çubuğundaki video rozetli **+3 ray** düğmesi (ve oyun menüsündeki kutucuk) ödüllü videodan sonra o bölüme 3 ray ekler; bölüm başına en fazla 3 kez. Otomatik çöz oyun menüsünde videolu kutucuk olarak durur.
- **Reklam sıklığı:** Otomatik geçiş reklamı artık her 4 tamamlanan bölümde bir.
- **Vagon Garajı:** 10 yeni vagon tasarımı (biri Cadılar Bayramı'na özel, çatısında balkabağı feneriyle). Her biri tek seferlik 24,99 TL. Ana menü ve bölüm seçiminde **Vagonlar** düğmesi. Tasarımlar `scripts/build-wagon-skins.py` ile orijinal vagon çiziminden bölge bölge boyanarak üretilir (`dist/assets/wagon-skins.webp`).
- **Satın alma:** Android tarafı No Ads ve 10 vagonu destekler. Doğrulama sunucusu adresi girilmemişse satın alma cihazda Play onayıyla tamamlanır.
- **AdMob:** Yayın derlemesi kendi uygulama, geçiş ve ödüllü birim kimliklerini kullanır.
- **Pencereler:** Yalnız içerik kayar, kapatma düğmesi hep yerinde kalır; Android'de sistem yazı boyutu oyun düzenini bozmaz.
- Ayrıntılar ve Play Console ürün listesi: `docs/MONETIZATION.md`. Android sürüm kodu 14.

## Railquest — 0.10.0 · Mobil arayüz yenilemesi

Bütün arayüz tek bir tasarım sistemine (`dist/ui.css`) taşındı; eski `styles.css`, `mobile-menu.css` ve `game-layout.css` kaldırıldı. Krem kâğıt paneller, basınca "çöken" oyuncak düğmeler ve yumuşak deniz renkleri her ekranda aynı dili konuşur.

- **Yükleme:** Ada resmi yuvarlak maskeyle yüzer; ilerleme çubuğu bir ray, üstünde küçük bir tren gider.
- **Ana menü:** Harf harf dalgalanan Railquest yazısı, sürüklenen bulutlar, parlayan Oyna düğmesi, hızlı ses düğmesi ve konuşma balonuyla Pati.
- **Bölümler:** Duraklar raylarla bağlı yuvarlak jetonlar; tamamlananlar yeşil, sıradaki halka ile nabız atar, seçili olan işaretlenir. Bilet kartı delikli kenarlıdır. Bölge sekmeleri bölge rengini ve ilerlemeyi gösterir; dar ekranda yalnız seçili bölgenin adı yazılır. Kızıl Kanyon artık kendi dağ simgesini kullanır.
- **Oyun ekranı:** Bölüm rozeti, kalan ray çubuğu (azalınca sarı, bitince mercan), vagon ve araç tepsileri, bağlanan vagonlarda onay işareti; mesajlar Pati'nin konuşma balonunda görünür. Başlat düğmesi duruma göre renk değiştirir.
- **Pencereler:** Yatay telefonda kaydırma gerektirmeyen iki sütunlu düzenler: oyun menüsü (özet + 8 kutucuk), ayarlar, No Ads, ipucu, kazanma (konfeti, dönen ışık halesi, sırayla beliren yıldızlar). Uzun rehberlerde alt düğme yapışkan kalır.
- 568×320'den 1366×1024'e kadar yatay ekranlarda denendi; Android sürüm kodu 13.

## Railquest — 0.9.3

Alt ortada vagonlar, 1× / 2× ve hemen yanında − / + bulunur. Yakınlık düğmeleri oyun menüsünden buraya taşındı. Küçük ekranlarda yalnız vagon şeridi kayar. Android versionCode 12.

## Railquest — 0.9.2

Ekran görüntüsündeki yerleşim düzeltildi: vagon düğmeleri alt orta grupta, 1× / 2× hız düğmesi hemen sağında. Geri al solda, Başlat sağda kalır. Kısa ekranlarda vagon şeridi kayar; hız düğmesi görünür kalır. Android versionCode 11.

## Railquest — 0.9.1

Oyun içi başlık, yükleme/döndürme ekranları, PWA adı ve Android uygulama etiketi Railquest oldu. Alt ortadaki hız düğmesi 1× / 2× arasında geçer ve hareket eden trenlere anında uygulanır. Bölüm sonu Sonraki durak ve Ana Menü sunar; son bölümde sonraki durak yerine Bölümlere dön gösterilir. Kayıt anahtarları ve Android paket kimliği korunur.

## Yatay mobil arayüz — 0.9.0

Ana menüde katmanlı Oyna/Bölümler düğmeleri, mevcut sevimli ada resmi ve kısa yumuşak geçişler vardır. İlk girişte Oyna bölüm seçimine götürür. Sonraki girişlerde son oynanan bölüm ve çizilmiş raylar korunarak açılır; tamamlanan bölümün ardından sıradaki bölüm devam hedefi olur. Eski v2 kayıtları yeni `hasStarted` alanına kayıpsız uyarlanır.

Bölüm seçimi, altı bölge sekmesi, tek parmakla kaydırılan numaralı duraklar, seçili haritanın gerçek çiziciden canlı önizlemesi ve Oyna bileti içerir. Bölüme önce dokunarak önizleyin, ardından Oyna ile başlayın. Bütün 58 harita erişilebilir.

Oyun ekranında menü, geri al, çoklu vagon seçimi ve Başlat kalır. İpucu/ödüllü otomatik çöz, temizleme, ayarlar, özel kurallar, hız ve kamera seçenekleri oyun menüsündedir. Harita başlangıçta ekrana sığar; vagon düğmesi çizim için o hatta odaklanır. Mesajlar kısa süre sonra çekilir. Temel kontroller 44–48 CSS piksel dokunma alanını korur.

Boş alana basıp sürüklemek kamerayı kaydırır. Hareket rayın üzerinden geçse bile aynı sürükleme boyunca ray çizmez. Vagondan veya mevcut raydan başlayan sürükleme kamerayı sabit tutar ve ray çizer. Sistemin iptal ettiği tamamlanmamış çizimler geri alınır. İkinci parmak mevcut hareketi devralmaz. Sayfa yakınlaştırması menü ve oyun genelinde engellenir; kamera yakınlığı menüden değişir.

Dikey web görünümünde çevirme ekranı açılır ve oyun duraklar. Android iki yatay yönü destekler, sistem çubuklarını oyun için gizler; çentik boşluğu yerel katmanda bir kez uygulanır. Geçici sistem çubuğu görünümü kamerayı yeniden boyutlandırmaz. Harita kıyılarındaki beyaz dekor dikdörtgenleri, çizicinin opak deniz zeminiyle giderildi. Hareketi azalt ayarı menü geçişlerini ve salınımları kapatır.

## Anahtarların Yolculuğu

Vagonlar aynı anda hareket eder ve lokomotife numara sırasıyla bağlanır. Oyuncu her vagon için bir yol çizer. Hatlar birleşebilir; ortak ray bütçeden yalnızca bir kez düşer. Aynı kareye aynı anda varış veya ters yönde çakışma başarısızlıktır. Erken gelen bir vagonun rotasını uzatmak geliş sırasını değiştirir.

45–48 beş vagon, 49–52 altı vagon içerir. Sinyal karesindeki vagon, ortak vuruş sayacına bağlı ışık yeşil olduğunda ayrılır. Arkadaki vagon kırmızıda bekleyene çarpabilir. Ok işaretli geçitten yalnız ok yönünde düz geçilir; sinyal ve ok karelerine ray döşemek bütçeden düşer. Her sinyalin döngüsü bölümdeki kurallar düğmesinden görülebilir.

Oyun belirli bir çözüm dizisiyle karşılaştırma yaparak kazanma kararı vermez: geçerli oyuncu yolları gerçek kurallarla simüle edilir. Hazır çözümler yalnızca ipucu ve doğrulama içindir. Üç yıldız hedefleri çalışan tasarım çözümleriyle doğrulanır; ilk beş bölümde tam arama ile en az ray sayısı da hesaplanır. İleri bölümlerde daha kısa bir yol bulunabilmesi özellikle engellenmez.

Posta efektinde yaşanan hata giderildi: süresi dolan parçacık artık negatif yarıçapla Canvas'a gönderilmez. Aynı regresyon testi vagon birleşme efektlerini de kapsar.

53–58 altı yeni bağımlılık bulmacasıdır. Güneş, Ay ve Yıldız anahtarlarını bütün vagonlar alabilir; aynı simgeyi taşıyan bariyerler açılır. Kapalı bariyerin önünde beklenir; açıldığı vuruştan sonraki harekette geçilebilir. Sonraki numaralı bir vagon, önceki vagonun yolunu açmak zorunda kalabilir. 1× işaretli hassas köprüler hazır raydır; ilk vagon ayrılınca çöker ve başka vagon taşımaz. Her iki kural da yeniden denemede sıfırlanır.

Anahtar etiketleri vagon sayılarından ayrıldı: Güneş / Ay / Yıldız simgeleri haritada, bariyerlerde ve rehberde aynıdır. Açılan bariyer simgesini korur ve küçük bir onay işareti kazanır. Toplama mesajı anahtarı alan vagonu belirtir. Bu serbest toplama kuralı oyun motorunda zaten vardı; altı vagon × üç anahtar için ayrı regresyonlarla açıkça korunur. Tasarım çözümleri öneridir; belirli bir vagonu anahtara atamaz.

## Mobil menü ve vagon hareketleri

Ana menü ve bölüm seçimi yalnız yatay ekran için düzenlenir. Ayarlar sol üstte, No Ads sağ üsttedir. Telefon güvenli alanları, kullanılabilir ekran yüksekliği ve kısa yatay görünüm için ölçüler tanımlıdır. Dekoratif görseller dokunma olaylarını yakalamaz.

Ayarlar büyük satırlar ve anahtarlarla açılır. Pencere açılışı ses başlatmaya bağlı değildir. Yerel dialog yöntemi bulunmadığında veya hata verdiğinde aynı içerik modal yedeğiyle gösterilir; odak, geri dönüş ve kapatma temizliği korunur. Müzik ve oyun sesleri ayrı kanallardan hemen susturulur; diğer ayarlar müziği yeniden başlatmaz. Bu yedek akış bağımsız birim testinde sınandı; gerçek tarayıcıdaki bildirilen sorun yeniden üretilmedi.

Vagon gövdeleri sürüşte hafif salınır; seçili vagon sakin bir hareketle belli olur. Lokomotif ve bağlı vagonlar yeni bağlantıda yumuşakça ilerler. Bu hareketler yalnız sunum katmanındadır; raylar, çarpışmalar ve varış zamanı değişmez. Hareket azaltma açıkken salınım ve yumuşak geçiş atlanır.

## Bölgeler, atmosfer ve açılış

İlk 52 bölümün verileri, bütçeleri ve çözümleri korunur. Yeni bölümler Zaman Bahçeleri'ne (45–46), Kızıl Kanyon'a (47–48), Kar İstasyonları'na (49–50) ve Buzul Geçitleri'ne (51–52) eklenir. 53–58 yeni anahtar/köprü bölümlerini ekler. Tüm haritalar baştan erişilebilir.

Çölde kaktüs, palmiye ve kumtaşı; kışta kar yüklü çamlar ve ahşap kulübe; buzulda mavi kristaller ve buz gözlemevi; Zaman Bahçeleri'nde bakır saat kulesi, dişliler ve mor ağaçlar vardır. 16 yeni nesne iki yerel WebP atlasından çizilir. Kar, kum esintisi, buz parıltısı ve saat bahçesinin ışıkları sınırlı parçacık sayısıyla çalışır. Hava efektleri ayarlardan kapatılır; hareketi azalt seçeneği de bu efektleri durdurur.

Açılış ekranındaki yüzde, hazırlığı biten görseller, yazı tipleri, oyun modülü ve menü kurulumu üzerinden hesaplanır. En fazla üç görsel aynı anda hazırlanır; gerekli görsel yüklenemediğinde yüzde tamamlanmaz ve yeniden deneme sunulur. Başarılı hazırlıkta %100 çizilir, ardından menü açılır. Yapay yükleme süresi eklenmez. Çevrimdışı paket yeni kaynakları da içerir.

Çayırlarda az sayıda ışık zerresi, bitkilerde hafif salınım ve bölgelerde yumuşak ışık katmanları bulunur. Buzulda sakin bir kuzey ışığı şeridi eklenir. Yeni bitmap dosyası yüklenmez; mevcut atlaslar kullanılır. Durak şeridi tek parmakla yatay kayar.

## Gelir modeli

Her beş tamamlanan, otomatik çözülmemiş turdan sonra reklam kendiliğinden açılır. Yeniden başlatılarak tamamlanan bölümler sayılır; başarısız denemeler sayılmaz. Sayaç cihazda saklanır. Reklam yüklenmezse sonuç ekranı bekletilmez.

Tek adım ipuçları ücretsiz. Otomatik çöz yalnız tamamlanmış ödüllü reklamla rayları yerleştirip trenleri başlatır. No Ads, bölüm arası reklamları kaldırır; otomatik çöz için ödüllü reklam gerekliliği devam eder ve mağazada açıklanır. Otomatik çözülen bölümün arkasına ikinci reklam eklenmez.

Web önizlemesi gerçek reklam göstermez veya ödeme almaz; No Ads denemesi oturumluk, tamamla/iptal reklam akışı açıkça önizleme olarak işaretlidir. Android AdMob/UMP ve Play Billing kaynakları ile bağımsız doğrulama servisi vardır. Hesap kimlikleri, sunucu ve gerçek cihaz testleri tamamlanmadığı için canlı gelir etkin değildir. Ayrıntılar `docs/MONETIZATION.md` içindedir.

## Proje yapısı

- `dist/`: statik oyun; tüm görseller ve ses üretimi yereldir. Oyun sunucusu veya CDN bağımlılığı yoktur.
- `dist/js/engine.js`: kurallar, bağımsız vagon simülasyonu, yol arama ve kayıt doğrulama.
- `dist/js/expedition-blueprints.js`: 37–44 arasındaki yeni kanyon/buzul bulmacaları ve doğrulama yolları.
- `dist/js/lock-blueprints.js`: 53–58, anahtar/bariyer ve hassas köprü bulmacaları.
- `dist/ui.css`: bütün ekranların tek tasarım sistemi (yükleme, menü, bölümler, oyun, pencereler).
- `dist/js/viewport.js`: kullanılabilir ekran yüksekliği ve hareket koruması.
- `dist/js/camera.js`, `board-gesture.js`: sınırlandırılmış kamera, yakınlık ve tek parmak pan/çizim ayrımı.
- `dist/js/dialogs.js`: ayar paneli ve modal yedeği.
- `dist/js/key-signs.js`: vagon kimliğinden bağımsız, ortak anahtar/bariyer simgeleri.
- `dist/js/vehicle-motion.js`: kurallardan bağımsız vagon hareketleri.
- `dist/js/signal-blueprints.js`: 45–52, beş/altı vagonlu sinyal bulmacaları ve doğrulama yolları.
- `dist/js/level-blueprints.js`: elle yazılmış tasarım yolları, ek açık alanlar, tünel yönleri ve köprüler.
- `dist/js/levels.js`: derlenmiş haritalar, ray bütçeleri ve doğrulanmış ipucu yolları.
- `dist/js/renderer.js`: izometrik arazi, dört yönden araç sprite'ları, ortak ray çizimi, dokunmatik giriş ve efektler.
- `dist/js/biome-sprites.js`, `weather.js`: bölge nesneleri ve sınırlı atmosfer efektleri.
- `dist/js/boot.js`, `resources.js`: gerçek hazırlık ilerlemesi, görsel çözme havuzu ve yükleme hatasından dönüş.
- `dist/js/app.js`: oyun akışı, vagon seçimi, geri alma, ipuçları, ayarlar ve sonuçlar.
- `dist/js/storage.js`: yeni kampanya için `rota-adalari.save.v2`; v1 kayıtlarını silmez, eski ayarları taşır.
- `dist/assets/`: bu oyun için üretilmiş çizimler ve yerel Rubik yazı tipleri.
- `android/`: aynı `dist` klasörünü çevrimdışı paketleyen Android ve yerel reklam/ödeme kaynakları.
- `billing-server/`: satın alma belirtecini Google Play sunucusunda doğrulayan bağımsız Node servisi; henüz barındırılmadı.
- `dist/js/monetization.js`: reklam sayacı, ödülle otomatik çöz ve güvenli sonuç köprüsü.
- `docs/LEVEL-DESIGN.md`: bölüm amaçları, ray hedefleri ve çözüm adımları.

## Çalıştırma ve doğrulama

`dist` klasörünü HTTP üzerinden sunun. ES modülleri nedeniyle dosyayı çift tıklayarak `file://` ile açmayın. HTTPS önbelleği bütün bir sürümü birlikte saklar; güncelleme tamamen hazır olduğunda eski pencereler yenilenir. İlk web erişimi internet ve barındıran platforma erişim gerektirir.

Node.js 20+:

```sh
node scripts/compile-levels.mjs
node --test tests/*.test.mjs
node scripts/check.mjs
```

Çizim kontrolleri için `node --test tests/renderer.test.mjs` kullanılır. Bu test, çalışma ortamındaki `@napi-rs/canvas` paketini `CODEX_PRIMARY_RUNTIME_NODE_MODULES` yolundan bulur. Gerçek tarayıcıyı veya telefonu çalıştırmaz ve ekran görüntüsü almaz. Doğrulama kapsamı ile tamamlanmamış yayın adımları `docs/RELEASE-READINESS.md` içindedir.

## Android

Android kaynak projesi 0.13.0 / versionCode 16 ve `sensorLandscape` kullanır. Gradle wrapper kaynaklara dahildir. Debug APK derleme ve imza kontrolleri `docs/RELEASE-READINESS.md` içinde kayıtlıdır. Gerçek Galaxy A36, tarayıcı CSS yerleşimi ve Play reklam/ödeme kabul testi henüz yapılmadı. Android Studio kurulum ayrıntıları `android/README.md` içindedir.

## Görseller

Kapak, Pati, araç ve ortam atlasları ImageGen ile bu oyun için üretildi. Referans oyunun varlıkları, kodu veya haritaları kopyalanmadı. V2 lokomotif/vagon atlası dört bakış yönü içerir. Üretim bilgisi `docs/ART-ASSETS.md`, font lisansı `docs/FONT-LICENSE.txt` içindedir.
