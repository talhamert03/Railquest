# Rota No Ads doğrulama servisi

Node.js 22+ kaynak servisi; bu güncellemede barındırılmadı ve gerçek Google hesabıyla denenmedi. Statik `dist` içine dahil edilmez. Dış npm bağımlılığı yoktur.

| Çalışma zamanı değişkeni | İçerik |
|---|---|
| `PLAY_PACKAGE_NAME` | Android ile aynı paket kimliği |
| `GOOGLE_APPLICATION_CREDENTIALS` | Gizli hizmet hesabı JSON dosyasının sunucudaki yolu |
| `PLAY_SERVICE_ACCOUNT_JSON` | Dosya yerine secret manager'dan JSON; iki yöntemden biri yeterli |
| `PORT` | Varsayılan 8080; dış erişim HTTPS ingress üzerinden |
| `PLAY_ALLOW_TEST_PURCHASES` | Varsayılan kapalı; kontrollü lisans testinde `true` |

Çalıştırma: `node billing-server/server.mjs`. `GET /health`; `POST /verify` gövdesi `{"purchaseToken":"…","productId":"wagon_sakura"}`; `productId` yoksa `rota_plus` (No Ads) kabul edilir. Ürün kimliği yalnız `rota_plus` veya `wagon_*` olabilir; paket kimliği istemciden kabul edilmez. Belirteç erişim sırrıdır; proxy/APM gövde ve Authorization kaydı kapalı tutulmalı.

Hizmet hesabına gerekli Play satın alma okuma/onay yetkilerini ver. JSON'u depoya, APK'ya veya statik dosyalara koyma. [Hizmet hesabı OAuth](https://developers.google.com/identity/protocols/oauth2/service-account), [satın alma sorgusu](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.productsv2/getproductpurchasev2) ve [onay endpoint'i](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products/acknowledge) kullanılır.

Google'ın satın alma kaydı kalıcı kaynaktır. Ürün tüketilmez; tekrarlanan geri yükleme yeni satın alma veya ödül yaratmaz. Kullanıcı hesabı/cüzdan/para transferi sistemi yoktur. `validUntil` yeniden doğrulama hedefidir; Android bağlantı hatasında önceden doğrulanan erişimi korur. Bağlantı gelince yeniden sorgular; başarılı iptal/iade yanıtı kaydı temizler.

HTTPS, güvenilir proxy yapılandırması, gövde sınırı ve kullanıcı/IP hız limiti gerekir. Süreç içindeki 60/dk soket-IP limiti ve 20 eşzamanlı istek sınırı ek korumadır; proxy arkasında kullanıcı limiti ingress'te uygulanmalı. Genel internette ücretli satışa açmadan önce Play Integrity/istemci doğrulaması, kötüye kullanım yük testi, hizmet hesabı erişimi, iade ve gözlemlenebilirlik akışlarını gerçek ortamda doğrula.

`node --test tests/billing.test.mjs` iş kurallarını sahte Google yanıtlarıyla sınar. OAuth, gerçek işlem ve barındırma kabul testi değildir.
