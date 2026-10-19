# Rota Adaları — Android Studio paketi

Sürüm 0.8.0 · 58 bölüm · 6 bölge · 22 Eylül 2026

Bu paket son geliştirdiğimiz oyunun kaynak projesidir. Son mobil ana menü, bütün vagonlarla anahtar toplama, Güneş/Ay/Yıldız işaretleri, çizimler, sesler, Android reklam/ödeme kaynakları ve testler dahildir. HTML, CSS, JavaScript ve görseller ayrı dosyalardır.

## Yeni ekran ve dokunma kontrolleri

Telefon/tablet boyutlarına göre oyun alanı ve düğmeler yeniden yerleşir. Boş alanı tek parmakla sürükle: kamera kayar. Vagondan veya çizilmiş raydan sürükle: kamera sabit kalır, ray döşenir. + / − ile yakınlığı değiştir; çerçeve düğmesi haritanın tamamını gösterir. Vagon düğmesi ilgili hattın sonuna odaklanır. Yatay ve dikey web görünümü desteklenir; Android projesi iki yatay yönü kullanır.

Galaxy A36 için ekran genişliği ve sistem çubuğu/çentik alanı düzenlemeleri eklendi; fiziksel telefonda doğrulanmadı. Önceki uygulamayı silmeden, aynı uygulama kimliği ve imzayla güncellemek mevcut kayıtların korunmasını sağlar. Yeni web sürümü kurulu Android uygulamasını kendiliğinden güncellemez; bu paketten yeniden derlemelisin.

## Android Studio’da aç

1. ZIP’in **tamamını** bir klasöre çıkart. `android` ile `dist` aynı üst klasörde kalmalı; Android projesi oyunu `../dist` yolundan alır.
2. Android Studio’da **Open** seçeneğiyle `RotaAdalari/android` klasörünü aç. `app` alt klasörünü veya tek başına `index.html` dosyasını açma.
3. Gradle JDK olarak **17** kullan. SDK Manager’da **Android SDK Platform 36** ve **Build-Tools 35.0.0** kurulu olsun. Proje AGP **8.13.0** ve Gradle **8.13** kullanır. [Resmî araç uyumluluğu](https://developer.android.com/build/releases/agp-8-13-0-release-notes).
4. Gradle başlangıç dosyaları pakete dahildir; ayrıca Gradle kurman gerekmez. Gradle senkronizasyonunun bitmesini bekle. İlk açılışta araç ve bağımlılık indirmeleri için internet gerekir. Önce bir emülatör veya kendi telefonunda **Run** ile oyunu dene.

## İmzalı AAB oluştur

Android Studio’da **Build → Generate Signed Bundle / APK → Android App Bundle** yolunu izle. Modül olarak `app` seç. Kendi yükleme anahtarını kullan; ilk yayınınsa sihirbazdan yeni bir keystore oluştur. Anahtar dosyasını ve parolalarını sakla. `release` sürümünü seçerek işlemi tamamla; `.aab` dosyası sihirbazda seçtiğin çıktı klasörüne yazılır. [Android’in imzalama kılavuzu](https://developer.android.com/studio/publish/app-signing).

Uygulama kimliği `com.rotaadalari.game`, sürüm kodu `8` olarak ayarlı. Farklı kimlik kullanacaksan ilk Play yüklemesinden önce `android/app/build.gradle` içindeki `applicationId` değerini kesinleştir. Satın alma doğrulama sunucusunun paket kimliği de bununla eşleşmeli.

## Reklam ve No Ads durumu

- Debug sürümü Google’ın test reklam kimliklerini kullanır.
- Release sürümünde canlı reklamlar varsayılan olarak kapalıdır. Kendi AdMob uygulama/reklam birimi kimliklerini ve UMP ayarlarını tamamlayıp `rotaLiveAds` yapılandırmasını açmalısın.
- No Ads için Play Console’da `rota_plus` ürününün ve doğrulama sunucusunun kurulması gerekir. `rotaBillingVerifyUrl` boşken satın alma başlamaz.
- Gerekli ayarlar `docs/MONETIZATION.md`, sunucu kurulumu `billing-server/README.md` içindedir. Sunucu uygulamanın AAB paketine eklenmez; ayrı çalıştırılır.

## Paketin içeriği

| Klasör | İçerik |
| --- | --- |
| `android/` | Android Studio projesi ve yerel reklam/ödeme köprüsü |
| `dist/` | Oyunun tamamı, haritalar, görseller, CSS ve JavaScript |
| `billing-server/` | No Ads satın alma doğrulama servisi |
| `docs/` | Bölüm çözümleri, varlık bilgileri ve yayın notları |
| `tests/`, `scripts/` | Kural testleri, bölüm derleme ve kaynak kontrolleri |

Oyun kodunun bu sürümünde 144 otomatik test geçti. Android SDK ve derleme ortamı burada bulunmadığından APK/AAB oluşturulmadı; gerçek cihaz, reklam ve satın alma kabul testleri henüz tamamlanmadı. AAB üretmek bu kontrollerin yerine geçmez. Ayrıntılı durum `docs/RELEASE-READINESS.md` içindedir.
