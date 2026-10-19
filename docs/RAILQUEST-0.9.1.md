# Railquest 0.9.1

- Oyun başlığı, ana menü, yükleme ekranı, döndürme ekranı, hakkında penceresi, PWA adı ve Android uygulama etiketi Railquest olarak güncellendi.
- Alt ortadaki 1× / 2× düğmesi düzenleme ve yolculuk sırasında çalışır; hız değişimi mevcut simülasyona anında uygulanır. Duraklatma menüsündeki eski hız düğmesi kaldırıldı.
- Alt kontrol sırası aynı yükseklikte kalır. Geri al ve vagon seçimi solda; kısa ekranlarda vagon şeridi tek parmakla kayar. Başlat sağda kalır.
- Bölüm sonucu Sonraki durak / Ana Menü sunar. Son bölümde sonraki durak yerine Bölümlere dön kullanılır. Ana Menü tamamlanmış bölüm kaydını ve devam hedefini korur.
- Android versionCode 10 / versionName 0.9.1. Android paket kimliği, kayıt anahtarları, 58 bölüm, gelir akışları ve oyun kuralları değişmedi.

## Doğrulama

JavaScript sözdizimi, yerel varlık ve çevrimdışı dosya kapsamı `scripts/check.mjs` ile doğrulandı. JSDOM ve gerçek Canvas kaynaklarıyla başlık, düzenleme/sürüşte hız geçişi, tek hız düğmesi, kazanma → ana menü → sıradaki bölüme devam, Sonraki durak, son bölüm sınırı ve altı vagon akışları çalıştırıldı. İki güncel CSS dosyası hata olmadan ayrıştırıldı.

Bu güncellemede fiziksel cihaz veya gerçek tarayıcı yerleşim testi yapılmadı. Önceki 0.9.0 sürümündeki 148 mekanik/çizim testi kaydı `RELEASE-READINESS.md` içinde korunur; bu küçük arayüz değişikliği için aynı kapsam gereksiz yere tekrarlanmadı.
