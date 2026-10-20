# Android kaynak projesi

Bu klasör, test APK’sı derlenebilen Android kaynak projesidir. Fiziksel cihaz kabul testleri henüz yapılmadı. Oyun, `WebViewAssetLoader` ile uygulamanın içindeki `dist` dosyalarını yükler. Oyun haritaları için Sites bağlantısı gerekmez. Yerel reklam, gizlilik onayı ve satın alma doğrulaması internet kullanır; bu nedenle manifestte internet izni vardır. JavaScript köprüsü paket içindeki güvenilir sayfayla sınırlıdır; satın alma belirteçleri JavaScript’e aktarılmaz.

## Yapılandırma

| Alan | Değer |
|---|---|
| Uygulama kimliği | `com.railquest.game` (kod paketi `com.rotaadalari.game` olarak kalır) |
| Ekran yönü | `sensorLandscape` — iki yatay yön |
| Minimum Android | API 26 / Android 8.0; güncel Android System WebView gerekir |
| Hedef / derleme SDK | API 36 |
| Android Gradle Plugin | 8.13.0 |
| Gradle | 9.1.0 (Java 17–25 ile çalışır) |
| JDK | 17, 21 veya 25 |
| AndroidX WebKit | 1.14.0 |
| Yayın sürümü | 0.14.0 / versionCode 17 |

AGP ve araç sürümleri [resmî uyumluluk tablosuna](https://developer.android.com/build/releases/agp-8-13-0-release-notes) göre seçildi. Hedef API, [Google Play gereksinimine](https://developer.android.com/google/play/requirements/target-sdk) göre 36 olarak ayarlandı. Yerel içerik yöntemi [Android WebViewAssetLoader belgesini](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content) izler.

## Android Studio ile derleme

Android Studio’da bu klasörü açın; `../dist` yan klasörü korunmalıdır. Android SDK ve JDK 17 ya da üstü kurulu bir ortamda, bu klasör içinde:

```sh
./gradlew :app:assembleDebug
```

Windows için `gradlew.bat :app:assembleDebug` kullanılır. Resmî Gradle wrapper dosyaları (dağıtım 9.1.0) kaynaklara dahildir. Wrapper JAR SHA-256 değeri doğrulandı; dağıtım özeti `gradle/wrapper/gradle-wrapper.properties` içinde sabittir. İlk senkronizasyon dağıtımı ve Android bağımlılıklarını indirir. Ayrı Gradle kurulumu gerekmez. 0.9.0 için JDK 17, Gradle 8.13 ve SDK 36 ile debug derlemesi başarıyla oluşturuldu; son doğrulama kaydı `../docs/RELEASE-READINESS.md` içindedir.

`preBuild`, `../dist` dosyalarını otomatik olarak uygulama varlıklarına kopyalar. Böylece web ve Android sürümleri aynı kaynak kodunu kullanır. Android'de service worker kapalıdır; dosyalar zaten paket içindedir.

## Yayın yapısı

Sahibin yükleme anahtarıyla imzalanmış `bundleRelease` çıktısı gerekir. Yayın anahtarı ve parolalar sağlanmadı; release imzalama yapılandırması kasıtlı olarak atanmadı. Hata ayıklama sürümü `.dev` kimlik ekiyle kurulur. Üretim sürümünde WebView hata ayıklaması kapalıdır. R8 için JavaScript arayüz metotlarını koruyan kural vardır.

## Doğrulanacak Android davranışları

- Çentik ve sistem çubuklarında güvenli kenarlar; küçük ve büyük ekranlarda tüm düğmelere erişim.
- Geri hareketi: diyalog kapanır; oyun ekranında önce duraklatma menüsü açılır; bölüm seçimi ana menüye döner; ana menüde uygulamadan çıkılır.
- Arka plana geçişte sesin ve trenin duraklaması; dönüşte kullanıcı tarafından sürdürme.
- Uçak modunda ilk açılış ve 58 bölümün oynanması.
- Uygulama yeniden başlatıldıktan sonra ilerlemenin korunması.
- Gerçek cihazda boş alanda tek parmakla kaydırma, vagondan/raydan çizim, kısa dokunma, yakınlaştırma, tüm haritayı gösterme ve titreşim.
- Galaxy A36’da sistem çubukları açıkken ve iki yatay yönde düğmelere erişim; bölünmüş ekran ve tablet boyut değişimi. Kamera hareketi ray değiştirmemeli; çizimde kamera sabit kalmalı.
- Güncel WebView sürümünde düşük/orta sınıf cihaz performansı ve pil tüketimi.

Bu maddeler henüz çalıştırılmadı; kaynak kodda karşılıklarının bulunması geçtikleri anlamına gelmez.

## Reklamlar ve Play Billing

- Debug sürümü yalnız Google'ın test reklam kimliklerini kullanır. Release reklamları varsayılan olarak kapalıdır.
- `AdsController`: UMP onayı, hazır reklam önbelleği, kazanılan ödül geri çağrısı, gösterim başarısızlığı, gizlilik tercihlerinin yeniden açılması.
- `BillingController`: Play Billing 9.1.0, görünen adı No Ads olan `rota_plus` INAPP ürünü ve `buy` satın alma seçeneği, Play'den yerel fiyat, bekleyen ödemeler, iptal, geri yükleme, sunucuda doğrulama.
- `CommerceController`: paketli sayfaya sınırlı, aynı anda tek işlem, belirteç veya hizmet hesabı sırrı aktarmayan köprü.
- Mobile Ads 25.4.0 ve UMP 4.0.0 eklendi. Bağımlılıklar resmî güncel Android belgelerinden seçildi; son derleme ve imza doğrulama durumu yayın hazırlığı dosyasında kayıtlıdır.

`rotaBillingVerifyUrl` boşsa satın alma akışı açılmaz. Servis yanıtı doğrulanmadan No Ads verilmez. Doğrulanmış sahiplik, uygulamanın özel kayıt alanında çevrimdışı korunur; başarılı Play sorgusu veya sunucu kontrolü iptal/iade gösterirse kaldırılır. Hata ya da bağlantı kesintisi eski doğrulanmış sahipliği silmez. Uygulamanın silinmesi sonrası geri yükleme için internet ve satın alan Play hesabı gerekir.

Canlı etkinleştirme ve kabul matrisi: `../docs/MONETIZATION.md`. Bu kaynakların varlığı ödeme ve reklam testlerinin geçtiği anlamına gelmez.

## 0.9.0 tam ekran davranışı

Android 11 ve üzerinde `WindowInsetsController`, eski sürümlerde immersive-sticky bayrakları kullanılır. Sistem çubukları kenardan kaydırmayla geçici görünür; oyun kamerasını küçültmez. Çentik alanı WebView dışında bir kez ayrılır. WebView yakınlaştırması kapalıdır; sayfa ayrıca çoklu dokunma/gesture büyütmesini engeller. Rehber: https://developer.android.com/develop/ui/views/layout/immersive

Yeni test APK’sının uygulama kimliği `com.railquest.game.dev`. Önceki 0.8.0 test APK’sıyla aynı test anahtarı kullanılır; güncelleme kurulumu uygulama verilerini korur. Bu anahtar Google Play yayın anahtarı değildir.
