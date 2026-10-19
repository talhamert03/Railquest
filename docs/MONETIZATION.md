# Gelir modeli — 0.4.0

Ücretsiz ana oyun, her beş tamamlanan turda bir otomatik reklam, reklamla otomatik çöz ve tek seferlik No Ads. Can, enerji, satın alınan ray veya ücretli bölüm yok. Beş bölüm sıklığı yayıncının tercihidir; Google zorunluluğu değildir.

| Akış | Davranış |
|---|---|
| Otomatik reklam | 5., 10., 15. tamamlanan turda, buluşma animasyonundan sonra ve sonuç ekranından önce kendiliğinden açılır |
| Tekrar oynama | Aynı bölümü yeniden başlatıp tamamlamak da sayılır; başarısız denemeler sayılmaz |
| Sayaç | Cihazda saklanır; yeniden açınca kaldığı yerden devam eder; yinelenen tamamlama aynı turu iki kez saymaz |
| Reklam yüklenmezse | O fırsat atlanır, sonuç ekranı açılır; ilerleme veya yıldız silinmez |
| Ücretsiz yardım | Sınırsız tek adım ipucu |
| Otomatik çöz | Oyuncu her kullanımda ödüllü reklamı seçer; yalnız tamamlanma sonucunda o turdaki bütün raylar yerleşir ve vagonlar başlar |
| İptal / kapanış / eski yanıt | Raylar değişmez; başka bölüme ait geç gelen ödül uygulanmaz |
| Otomatik çözülen tur | Bölüm ilerlemesi kaydedilir; otomatik reklam sayacına eklenmez ve hemen ikinci reklam açılmaz |
| No Ads | Tek seferlik satın alma; yalnız bölüm arası otomatik reklamları kaldırır |
| No Ads ile otomatik çöz | Ödüllü reklam yine gereklidir; bu ayrım satın alma ekranında açıklanır |
| Fiyat | Play Console'da belirlenecek; uygulama Google'ın yerelleştirilmiş fiyatını gösterir |

Eski hediye çözüm hakları ve bölüm bazında kalıcı çözüm açma sistemi kaldırıldı. Bölüm ilerlemesi, yıldızlar, ray taslakları ve ayarlar korunur. Yeni reklam sayacı güncellemede sıfırdan başlar.

Ödüllü reklam açık onayla başlar ve reddeden oyuncu devam eder: [AdMob ödül politikası](https://support.google.com/admob/answer/7313578?hl=en). Geçiş reklamı doğal bölüm arası kullanır: [AdMob rehberi](https://developers.google.com/admob/android/interstitial). Banner veya açılış reklamı yoktur.

## Önizleme ve gerçek para akışı

Web ödeme almaz, gerçek reklam SDK'sı yüklemez. Tamamla/vazgeç önizlemesi çalışır. No Ads denemesi yalnız oturumluk olup satın alma sahipliği oluşturmaz. Otomatik çöz için her seferinde yeni bir ödül gerekir; döşenmiş raylar normal taslak olarak saklanır. Eski v2 kayıtları korunur.

Android reklam/ödeme kaynakları eklendi; derleme ve cihaz kabulü yapılmadı. Debug yalnız test reklamı kullanır. Release reklamları kapalıdır; doğrulama adresi olmadan satın alma açılmaz. Bu kaynakların bulunması canlı gelir akışının hazır olduğunu göstermez.

## Hesaplar hazır olduğunda

1. Kalıcı paket kimliğini belirle. Android `applicationId` ile sunucudaki `PLAY_PACKAGE_NAME` eşleşmeli. Debug `.dev` kimliğidir; satın alma testi doğru paket ve imzayla Play dahili kanalında yapılmalı.
2. Play Console'da görünen adı **No Ads** olan tüketilmeyen INAPP ürünü `rota_plus` oluştur (mevcut ürün kimliği uyumluluk için korunur). Satın alma seçeneği `buy` olmalı; kiralama/ön sipariş kullanma. Fiyatlar ve ülkeler Console'da seçilir. Ürün tüketilmez.
3. `billing-server/README.md` doğrultusunda HTTPS doğrulama servisini barındır. Play Developer API yetkili hizmet hesabı yalnız sunucuda tutulur. `rotaBillingVerifyUrl` Gradle özelliği servisin `/verify` adresidir.
4. AdMob uygulamasını, ödüllü/geçiş birimlerini ve UMP mesajlarını yapılandır. Testler tamamlandığında Gradle özellikleri `rotaAdmobAppId`, `rotaRewardedUnit`, `rotaInterstitialUnit`, `rotaLiveAds=true` sağlanır. Test kimlikleriyle canlı reklam açılması derlemede reddedilir.
5. İmzalı paketi Play dahili testinde lisans test hesaplarıyla doğrula. Test kartlarını kabul eden servis ayarı yalnız kontrollü test ortamında açık tutulmalı. Canlı doğrulayıcı bunları varsayılan olarak reddeder.

Satın alma ürün sorgusu, Google ödeme ekranı, sunucu doğrulaması ve onaydan geçer: [Play Billing rehberi](https://developer.android.com/google/play/billing/integrate). Bekleyen ödeme No Ads vermez; doğrulama hatasında oyuncu yeniden ödemeye yönlendirilmez. Google onayı ile istemci yanıtı arasında bağlantı koparsa sonraki geri yükleme aynı tüketilmeyen ürünü sağlar.

Belirteçler loglanmaz veya JavaScript'e aktarılmaz: [Play satın alma güvenliği](https://developer.android.com/google/play/billing/security). Android doğrulanmış sahipliği özel kayıtta tutar; çevrimdışı erişim korunur. Başarılı Play/sunucu sorgusu iptal veya iade gösterirse sahiplik silinir. Geçici ağ hatası eski doğrulanmış sahipliği silmez. Kök erişimli cihaz değişikliklerine karşı mutlak koruma iddiası yoktur.

UMP, reklam etkinse No Ads sahiplerinde de her uygulama başlangıcında güncellenir; ödüllü reklamlar isteğe bağlı olarak kullanılabilir; `canRequestAds` izin vermeden reklam yüklenmez. Gerekliyse Ayarlar'dan gizlilik tercihleri yeniden açılır: [UMP rehberi](https://developers.google.com/admob/android/privacy). Geliştirmede [Google test reklamları](https://developers.google.com/admob/android/rewarded) kullanılır.

## Gerçek ortamda henüz geçilmemiş kabul matrisi

| Durum | Beklenen |
|---|---|
| UMP izin / ret / form hatası | Oyun açık, reklamlar izin durumuna uygun |
| Ödül tamamla / kapat / gösterim hatası | Yalnız kazanım callback'inde otomatik çöz; iptalde raylar aynı, çift ödül yok |
| Reklam sırasında arka plan / uygulama kapanması | İlerleme korunur; dönüş ve sıklık kayıtları doğrulanır |
| Satın alma onay / iptal / bekleme | Yalnız doğrulanan PURCHASED durumunda No Ads |
| No Ads sahibi | Otomatik reklam yok; ödüllü reklam tamamlanırsa otomatik çöz var |
| 5. ve 10. tur | Sonraki düğmesine basmadan reklam; yüklenmezse sonuç ekranı |
| Çift dokunuş | Tek ödeme/reklam ekranı |
| Sil / yeniden yükle | Satın alan Play hesabından geri yükleme |
| İade / ağ veya servis hatası | Doğrulanan iade erişimi kaldırır; geçici hata eski satın almayı kaybettirmez |
| AAB / R8 / gerçek telefon | Derleme, SDK ve JavaScript köprüsü çalışır |

Son Android paketi reklam ve Billing SDK'ları içerir; gizlilik ve Veri güvenliği beyanları eski reklamsız sürümden kopyalanamaz. Yayıncı iletişimi, gizlilik URL'si ve hedef kitle belirlenmeli. Hedef kitlenin çocukları kapsaması halinde yaşa uygun istek ayarları ve mağaza beyanları yayın öncesinde tamamlanmalıdır. Analitik SDK'sı eklenmedi.

Aktif kullanıcı, ülke dağılımı veya reklam doluluğu bilinmediği için gelir tahmini verilmez. Oyuncu testlerinde bölüm süresi, çözüm ihtiyacı ve reklam sonrası ayrılma gözlemleriyle sıklık dengelenmeli. Bu plan otomasyon veya takip başlatmaz.
