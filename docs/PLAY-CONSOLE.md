# Google Play'e hazırlık — satın almalar ve reklamlar

Oyundaki bütün satın almalar (No Ads ve 10 vagon) zaten Google Play'in kendi ödeme ekranını açar: oyuncu "Satın al"a basınca Play'in ödeme penceresi gelir, ödeme Play üzerinden alınır, satın almalar aynı Google hesabında otomatik geri gelir. Uygulamada ayrıca bir "geri yükle" düğmesi yoktur; her açılışta Play'den sorgulanır.

Bu ekranın çalışması için ürünlerin Play Console'da **aynı kimliklerle** açılmış ve **etkin** olması gerekir. Ürün yoksa oyunda düğme "Satın alma şu anda kullanılamıyor" yazar; oyun bozulmaz.

## Sıra önemli

Play Console, uygulamanın ödeme izni taşıyan bir sürümü yüklenmeden ürün açmana izin vermez. Bu yüzden:

1. **Ödeme profili:** Play Console → Ayarlar → Ödeme profili (Payments profile). Satış yapabilmek için banka ve vergi bilgileri tamamlanmış bir satıcı profili gerekir.
2. **İmzalı yayın paketi (AAB) üret:** Android Studio'da `android` klasörünü aç → Build → Generate Signed Bundle / APK → Android App Bundle → `release`. İlk kez yapıyorsan sihirbazda yeni bir yükleme anahtarı (keystore) oluştur. **Anahtar dosyasını ve şifresini kaybetme**, her güncellemede aynı anahtar gerekir. Paket kimliği `com.railquest.game`, sürüm kodu 18 olmalı.
3. **Dahili test kanalına yükle:** Play Console → Test et ve yayınla → Test → Dahili test → Yeni sürüm oluştur → AAB'yi yükle → Yayınla. Bu yükleme ödeme iznini Play'e tanıtır.
4. **Ürünleri aç:** Play Console → Para kazanma (Monetize with Play) → Ürünler → Tek seferlik ürünler (One-time products / In-app products) → Ürün oluştur. Aşağıdaki her satır için:
   - **Ürün kimliği:** tabloda yazdığı gibi, harfi harfine. Kimlik sonradan değiştirilemez.
   - **Ad / açıklama:** tablodaki ad ve kısa bir açıklama.
   - **Satın alma seçeneği:** "Satın al" (buy), kiralama değil.
   - **Fiyat:** Türkiye için 24,99 TRY. Diğer ülkeler için "fiyatları otomatik dönüştür" seçeneğini kullanabilirsin.
   - Kaydet ve **Etkinleştir**.
5. **Test et:** Play Console → Ayarlar → Lisans testi → kendi Gmail adresini ekle. Dahili test bağlantısından (Dahili test → Test kullanıcıları → bağlantıyı kopyala) uygulamayı telefona **Play Store üzerinden** kur. Lisans test hesabıyla satın almalar gerçek para çekmez.

Not: Sana gönderdiğim debug APK'nın paket kimliği `com.railquest.game.dev` olduğu için Play ürünlerini hiçbir zaman göremez. Satın alma testi yalnız Play'den kurulan yayın sürümüyle yapılır.

## Ürün listesi

| Ürün kimliği | Ad | Fiyat |
|---|---|---|
| `rota_plus` | No Ads | 49,99 TRY |
| `wagon_gold` | Altın Ekspres | 24,99 TRY |
| `wagon_neon` | Neon Gece | 24,99 TRY |
| `wagon_rosegold` | Gül Altını | 24,99 TRY |
| `wagon_lava` | Volkan | 24,99 TRY |
| `wagon_emerald` | Zümrüt | 24,99 TRY |
| `wagon_ruby` | Yakut Kraliyet | 24,99 TRY |
| `wagon_pearl` | Sedef İnci | 24,99 TRY |
| `wagon_galaxy` | Galaksi | 24,99 TRY |
| `wagon_frost` | Buz Kristali | 24,99 TRY |
| `wagon_halloween` | Balkabağı Gecesi | 24,99 TRY |

Oyun fiyatı Play'den okur; Play'de ne yazarsan oyunda o görünür.

## Yayından önce Play Console'da doldurulacaklar

- **Veri güvenliği:** Uygulama reklam (AdMob) ve uygulama içi satın alma içerir. AdMob'un cihaz kimliği ve reklam verisi topladığını beyan et.
- **Reklam içerir:** Evet.
- **Hedef kitle:** Çocukları kapsıyorsa Aile politikaları ve reklam kısıtlamaları devreye girer; 13+ seçmek reklam tarafını sadeleştirir.
- **Gizlilik politikası adresi:** Zorunlu (reklam ve satın alma olduğu için). Metin hazır: `docs/privacy-policy.html` (İngilizce + Türkçe). Sayfa GitHub Pages ile yayında: https://talhamert03.github.io/Railquest/privacy-policy.html (Settings → Pages → Branch: `claude/inspiring-mayer-ggfpv1`, klasör `/docs`). Başka bir yerde yayımlamak istersen sayfayı herkese açık bir HTTPS adreste yayımla (Google Sites, Netlify Drop veya herkese açık bir GitHub reposunda GitHub Pages) ve adresi Play Console → Uygulama içeriği → Gizlilik politikası alanına gir.
- **app-ads.txt:** Play'deki geliştirici web sitenin kök dizinine AdMob'un verdiği satırı içeren `app-ads.txt` koy.

## Kodda olanlar

- Ürün kimlikleri: `dist/js/cosmetics.js` ve `android/.../BillingController.java` (testler iki listenin eşleştiğini denetler).
- AdMob kimlikleri: `android/gradle.properties`.
- Doğrulama sunucusu kullanılmıyor: satın alma cihazda Play ile onaylanır (acknowledge). İstersen ileride `billing-server` kurulup `rotaBillingVerifyUrl` girilebilir.

## Mağaza dilleri

Oyun telefon diline göre Türkçe veya İngilizce açılır. Play Console'da varsayılan dili **İngilizce (en-US)** yapıp mağaza girişini İngilizce yaz, sonra **Türkçe (tr-TR)** çevirisini ekle. Ürün adlarını da iki dilde girebilirsin.
