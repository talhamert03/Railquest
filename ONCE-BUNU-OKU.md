# Railquest — Android Studio paketi

Sürüm 0.14.0 · versionCode 17 · paket kimliği `com.rotaadalari.game` · 58 bölüm · 6 bölge

## Android Studio'da aç

1. ZIP'in **tamamını** bir klasöre çıkart. `android` ile `dist` aynı üst klasörde kalmalı; Android projesi oyunu `../dist` klasöründen alır.
2. Android Studio → **Open** → `Railquest/android` klasörünü seç (`app` alt klasörünü veya `index.html`'i açma).
3. Gradle JDK olarak **17** veya üstü kullan (Settings → Build Tools → Gradle → Gradle JDK). SDK Manager'da **Android SDK Platform 36** kurulu olsun.
4. Gradle eşitlemesinin bitmesini bekle (ilk açılışta internet gerekir). İstersen önce telefonda **Run** ile dene; bu `.dev` uzantılı test sürümünü kurar.

## AAB oluştur (Play'e yüklenecek dosya)

1. **Build → Generate Signed App Bundle or APK… → Android App Bundle → Next**.
2. Modül `app`. İlk yayınsa **Create new…** ile yeni bir anahtar deposu (keystore) oluştur: dosya yolu, şifre, anahtar adı (ör. `upload`), anahtar şifresi, adın.
   **Bu dosyayı ve şifreleri güvenli bir yerde sakla.** Her güncellemede aynı anahtar gerekir; kaybedersen güncelleme yükleyemezsin.
3. **release** seç → **Create**. Dosya `android/app/release/app-release.aab` olarak oluşur (Android Studio sağ altta "locate" bağlantısı verir).
4. Bu AAB'yi Play Console → Test et ve yayınla → **Dahili test** kanalına yükle.

Sonraki her güncellemede `android/app/build.gradle` içindeki `versionCode`'u bir artır (17 → 18 …).

## Hazır olanlar

- **AdMob:** Kendi uygulama, geçiş ve ödüllü birim kimliklerin `android/gradle.properties` içinde; yayın sürümünde canlı reklam açıktır. Test (`.dev`) sürümü Google'ın test reklamlarını gösterir.
- **Satın almalar:** No Ads (`rota_plus`, 49,99 TRY) ve 10 vagon (her biri 24,99 TRY) Google Play'in ödeme ekranıyla satılır. Ürünlerin Play Console'da açılması gerekir; adım adım: `docs/PLAY-CONSOLE.md`.
- **Satın alma doğrulaması:** Sunucu gerekmez; satın alma cihazda Play ile onaylanır.

## Klasörler

| Klasör | İçerik |
|---|---|
| `android/` | Android Studio projesi, reklam ve ödeme kodu |
| `dist/` | Oyunun kendisi (HTML, CSS, JavaScript, görseller) |
| `docs/` | Play Console kılavuzu, gelir modeli, bölüm notları |
| `scripts/`, `tests/` | Vagon kaplaması üretimi, bölüm derleme ve testler |
| `billing-server/` | İsteğe bağlı satın alma doğrulama sunucusu (şu an kullanılmıyor) |
