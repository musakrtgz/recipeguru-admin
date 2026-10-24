# RecipeGuru Admin

Nuxt 4, Nuxt UI 4, Tailwind CSS 4 ve TypeScript ile SSR yönetim paneli.
İlk kapsam: admin girişi, dashboard, tarif inceleme listesi ve ortak bileşenler.

## Yerel kurulum

Node 24 ve pnpm 12 kullanılır.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
# NUXT_SESSION_PASSWORD için en az 32 karakterlik rastgele anahtar tanımlayın.
pnpm dev
```

Bu bilgisayarda .env ve Herd CA bağlantısı hazırlandı. Adres: http://localhost:3000.
API: https://recipev3.test/api. Yerel CA tanımı yalnız güvenilir Herd sertifikasını kullanır; TLS doğrulaması kapatılmaz.

## Ortamlar ve canlıya alma

- `NUXT_API_ENVIRONMENT=development` → `NUXT_API_BASE_DEV`
- `NUXT_API_ENVIRONMENT=production` → `NUXT_API_BASE_PROD`
- Canlı API varsayılanı mevcut Flutter konfigürasyonundaki https://api.recipeguru.app/api adresidir.
- `NUXT_PUBLIC_ENVIRONMENT` yalnız ortam etiketidir; API adresini veya tokenı yayımlamaz.
- `NUXT_SITE_URL` panelin tam origin adresidir; protokol ve port dahil. CSRF denetimi bunu kullanır.
- Canlıda `NUXT_SITE_URL` HTTPS olmalı; güçlü ve tüm instance'larda aynı `NUXT_SESSION_PASSWORD` verilmelidir.
- Yerel `NUXT_API_CA_FILE` değerini canlıya taşımayın. Canlıda sistemin güvenilir sertifika deposu kullanılır.
- Canlı ortam değişkenlerini sunucuda tanımlayın; Nuxt production başlatılırken .env otomatik yüklenmez.

```sh
pnpm build
node .output/server/index.mjs
```

SSR sunucu gerektirir. Statik hosting/generate kullanılmaz. Ters proxy HTTPS'i sonlandırmalı ve giriş uçlarına IP bazlı rate limit uygulamalıdır. Laravel'in mevcut auth throttle'ı korunur; proxy üzerinden tüm kullanıcıların aynı backend IP'sini paylaşabileceğini hesaba katın. API yöneticisi tarafından tanımlanmış mevcut admin hesabıyla giriş yapılır; panel kullanıcıya admin rolü vermez.

## Mimari

```text
app/pages            Sayfa bileşimi
app/layouts          Auth ve responsive yönetim kabuğu
app/components/ui    AppButton, Input, Select, Textarea, Modal, Card, Badge, Alert, Table, EmptyState
app/components/*     Alan bileşenleri: sidebar, header, tarif tablosu, inceleme modalı, istatistik kartları
app/composables      useAuth, useApi
app/middleware       SSR ve istemci gezinme denetimi
server/api           Sabit ve doğrulanan BFF uçları
server/utils         İstek başına Axios, rol denetimi, şifreli oturum
shared/config        Merkezi marka/tema/menü ayarları
shared/types         API sözleşmeleri
shared/utils         Paylaşılan doğrulama ve güvenlik kuralları
tests                Sözleşme ve gerçek HTTP entegrasyon testleri
```

Tarayıcı aynı origin'deki Nuxt API'ye Axios ile istek atar. SSR veri yüklemesi Nuxt'un istek bağlamını koruyan iç fetch'i kullanır; Laravel'e yapılan bütün çağrılar sunucudaki istek başına Axios istemcisinden geçer. Global Authorization değişkeni yoktur. Başka kullanıcının tokenı istekler arasında taşınmaz.

Giriş, Laravel `POST /auth/login` yanıtındaki `data.access_token.token` alanını okur. Yalnız `role=admin`, `is_active=true`, `is_blocked=false` kabul edilir. Diğer rollerin yeni tokenı iptal edilir. Token şifreli, HttpOnly, SameSite=Lax, canlıda Secure çerezde en fazla 8 saat tutulur. localStorage veya Nuxt payload'ında tutulmaz.

Her BFF isteğinde `GET /me` ile güncel rol kontrol edilir; Laravel admin middleware'i ikinci sınırdır. Sabit rotalar açık proxy/SSRF oluşturmaz. Durum değiştiren uçlar Origin denetler. HTML/API yanıtları private,no-store'dur. 401 oturumu temizler, 403 erişimi keser, 422 alan hatalarını gösterir. Mutasyon başarıları ve hataları ortak toast/alert sistemiyle gösterilir; ilk veri yükleme hataları ilgili bölümde görünür. Şifre/tokenlar loglanmaz.

## Tema ve bileşen kullanımı

`shared/config/admin.ts` dosyasındaki `theme.primary` değerini örneğin amber yerine orange/emerald yapın. Nuxt UI semantik renkleri, menü, buton, input, modal, tablo ve kart vurguları aynı kaynaktan güncellenir. `theme.neutral` nötr paleti; `theme.radius` köşe ölçeğini belirler. Hata/başarı renkleri anlamlarını korur.

Yeni sayfalarda `UiAppButton`, `UiAppInput`, `UiAppCard`, `UiAppModal`, `UiAppTable` vb. kullanın. API durumlarını composable/sayfa mantığında tutun; rastgele input/dialog stilleri oluşturmayın. Tema ve sistem sayfasında bileşen önizlemesi vardır.

## Dashboard ve incelemeler

- Gerçek `/admin/stats/dashboard` verileri; tüm zamanlar/son 7/son 30 gün.
- Topluluk tarifleri ayrı `/admin/submitted-recipes` verisidir; durum dağılımı ve kuyruk sayısı tüm zamanları kapsar.
- İstatistik hatası sıfır değer olarak gösterilmez. Kısmi arızada çalışan bölümler kullanılabilir.
- Gelir raporu mevcut API'nin 10 Ağustos 2024 sonrası kapsamını korur.
- İnceleme tablosu sayfalama/durum filtresi ve erişimi korunan kapak fotoğrafını destekler.
- Onay/red, Laravel'in revision denetimli `PATCH /admin/submitted-recipes/{id}/review` ucuna gider; reddetme notu zorunludur.
- Kullanıcı ve bildirim yönetimi menüde “Yakında” görünür. Reklam kampanyaları ayrı yönetim modülüdür.

## Kontroller

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

HTTP testleri önce build gerektirir. Testler geçici bir Laravel sözleşme sunucusu ve ayrı production Nuxt süreci kullanır; gerçek kullanıcı/veritabanına veri yazmaz. Admin olmayan giriş, cookie şifreleme, CSRF, yetki değişimi, SSR token sızıntısı, kısmi arıza, review ve çıkış denetlenir.

Koyu temanın yüzey, kenarlık ve metin renkleri de aynı dosyadaki `theme.dark` alanında tanımlıdır. Menü satırları masaüstünde kompakt, dokunmatik cihazlarda en az 44 px yüksekliğindedir.

## Tarif kütüphanesi

`/recipes` ekranı `recipes` tablosundaki tarifleri `/api/catalog` → Laravel `/admin/recipes` zinciriyle listeler. Tarif adına göre sunucuda arama, API'den gelen dil seçenekleri, yeni/eski/kısa/uzun pişirme sıralaması ve 10/25/50 kayıtlı sayfalama vardır. Arama ve filtreler URL'de saklanır; filtre değişince ilk sayfaya dönülür. İptal edilen istekler hata bildirimi üretmez ve eski sonuçlar yeni sorguya yazılmaz.

Tarif listesi yalnız gereken alanları taşır; `summary=1` ağır çeviri içeriğini API sorgusunda çıkarır. Eksik çeviri/durumlar açıkça gösterilir. Yükleniyor, boş arama ve API hatası ayrı durumlardır. `RecipesCatalogFilters`, `RecipesCatalogTable` ve ortak `UiAppPagination` kullanılır. Topluluk tarifleri ve onay/red işlemleri `/reviews` ekranındadır; mevcut `/api/recipes` inceleme uçları korunur. Dashboard'daki inceleme bağlantıları `/reviews` yoluna gider.

Tarif adına veya “Detay” butonuna tıklanınca ortak `RecipesCatalogDetailModal` açılır. `/api/catalog/{id}` → `/admin/recipes/{id}/preview` yalnız okuma yapar; görüntü veya AI üretimi başlatmaz. Seçili dil, malzemeler, hazırlanış adımları, püf noktaları ve kapak gösterilir. Eski metin/JSON içerikler korunur; hatalı görsel URL'leri yüklenmez. İstek iptali ve sıra denetimi, kapanan veya farklı tarife geçen modalın eski yanıtlarla dolmasını önler.

### Topluluk tarifini inceleme ve düzenleme

`/reviews` içindeki İncele eylemi her açılışta güncel detayı getirir. Ortak `UiAppImageGallery`, kapak ve tüm galeri fotoğraflarını oturumlu medya proxy'si üzerinden küçük önizleme, ileri/geri ve büyütme ile gösterir. Fotoğraf URL'lerine token eklenmez.

Üç yayın durumu arasında geçiş yapılabilir. Reddetme gerekçesi zorunludur. Karar sonrasında modal güncel durum ve revision ile açık kalır; tablo ve sayaçlar yenilenir. İncelemede/reddedilmiş tarifler akıştan kaldırılır.

`RecipesRecipeEditForm`, ortak alan ve `UiAppTextListField` bileşenleriyle başlık, porsiyon, süre, malzemeler/hazırlanış, eski serbest metin ve püf noktalarını düzenler. Fotoğraflar, kaynak dil ve yazar korunur. Değişen içerik yeniden incelemeye girer. İptal açık bir eylemdir; form açıkken yanlışlıkla dışarı tıklayarak kapanmaz. 409 çakışmasında taslak korunur ve güncel tarifi yüklemek için ayrı bir eylem sunulur. `useRecipeReview` yükleme, düzenleme, istek iptali ve sürüm durumunu yönetir. BFF her okuma/yazmada admin kontrolü ve yazmalarda Origin doğrulaması yapar.


Yayın yönetimi düğmeleri detay penceresinin sabit alt bölümündedir. Yayındaki tarifte **Yayından kaldır** (`pending`), reddedilende **Yeniden incelemeye al** veya **Onayla ve yayınla** kullanılabilir. Reddet eylemi ayrı ortak diyalogda gerekçe ister. `/reviews` varsayılan olarak tüm tarifleri açar; durumlar görünür filtre düğmeleriyle ayrılır. Durum değiştirmek için detayın altında bir seçim alanı aramak gerekmez.


## Reklam kampanyaları

`/advertisements`, gerçek Laravel reklam uçlarıyla çalışır. Başlık/sponsor arama, durum ve hedef filtreleri, sayfalama ve URL'de filtre koruma vardır. Oluşturma/düzenleme; sponsor, görsel, açıklama/düğme metni, hazır tarif/onaylı kullanıcı tarifi/harici bağlantı seçimi, yayın tarihi, dil, ağırlık, kişi başına günlük ve toplam gösterim sınırını içerir. Yeni kampanya varsayılan olarak kapalıdır. Mevcut görsel, yenisi seçilmedikçe korunur.

`AdvertisementsSettingsCard` tüm akış reklamlarını açıp kapatır ve organik gönderi aralığını ayarlar. Durdurma geri açılabilir; arşivleme rapor ve görsel geçmişini korur, ayrı onay penceresi kullanır. Arşiv kayıtları görüntülenip raporlanabilir. Etkin etiketi tek başına teslim garantisi değildir; tarih, kaynak görünürlüğü, kotalar ve genel anahtar birlikte uygulanır.

`AdvertisementsReportModal`, UTC günlerinde en fazla 366 gün, gösterim, tıklama, tekil izleyici, gösterime bağlı CTR, günlük grafik/tablo ve ömür boyu sayaçları gösterir. Önizleme veya rapor açılması gösterim/tıklama olayı üretmez.

`useAdvertisements` liste ve yayın işlemlerini, `useAdvertisementEditor` dosya/metin taslağı ve sürüm çakışmalarını yönetir. Ortak `UiAppImageUpload`, `UiAppSwitch`, `UiMetricCard`, `UiDailyBarChart`, tablo ve form bileşenleri kullanılır. Tarihler yöneticinin yerel saatinden açık ISO saate çevrilir. Multipart yükleme BFF'de akış okunurken 11 MB, görselde 10 MB ile sınırlıdır; MIME ve gerçek görsel doğrulaması Laravel'de tekrarlanır. Token/özel dosya yolu tarayıcıya taşınmaz. Mevcut reklam güncellemeleri zorunlu `expected_revision` ile gider; 409 çakışmasında taslak korunur. Canlı ters proxy ve Laravel/PHP yükleme sınırları en az 12 MB olmalıdır.


## AI yayın masası

`/ai-publications` yedi gerçek AI hesabının üretim ve yayınlarını yönetir. Ortak `AiSettingsCard`, `AiProfileModal`, `AiPlanModal`, `AiPublicationTable` ve `AiPublicationModal`; mevcut `UiApp*` bileşenlerini ve `RecipesRecipeEditForm` yapısını kullanır. Renkler merkezi tema dosyasından gelir.

- **Tarif hazırla:** Profil ve isteğe bağlı tarif adı/ek not seçilir; yayın saati gerekmez. Otomasyon/profil zamanlaması kapalı olsa da hazırlık başlar. Tarif, kontrol ve yatay kapak her zaman admin onayını bekler; zamanlayıcı bu kayıtları kendiliğinden yayınlamaz.
- Tarif adı belirtilmişse istenen ürünün hazırlanması zorunludur; kontrol aşaması isteğe uyumu ayrıca doğrular. Kontrolden geçemeyen kayıtlarda listede **Düzeltme gerekiyor**, detayda kapak üretiminin neden başlamadığı ve düzeltme/yeniden üretme eylemleri gösterilir.
- Üst menüde ve her kullanılabilir AI profil kartında aynı ortak `AiPrepareModal` açılır. `/api/ai-publications/prepare` yalnız doğrulanmış profil/istek UUID'si/ek notu sabit Laravel ucuna taşır. Aynı içerikle yeniden denemede UUID korunur ve ikinci üretim kaydı oluşmaz.
- Hazırlık detayı 5 saniyede güncellenir; tarif/kontrol/kapak aşamaları `AiPreparationStatus` ile gösterilir. Düzenleme, mutasyon, hata veya sürüm çakışmasında otomatik yenileme durur; yazılan inceleme notu korunur. Pencere kapatılınca istek/yenileme durur.
- **Yayın planla** mevcut tarihli otomasyon akışını kullanır. Günlük toplam sınır ve bütçe iki akışta ortaktır; elle hazırlık otomasyonun profil başına saat kontenjanıyla sınırlandırılmaz.
- Genel aç/kapat, zorunlu admin onayı, USD bütçesi ve günlük plan sınırı.
- Her hesap için dil, 1–3 İstanbul yayın saati, tarif ve görsel kuralları.
- Durum/yayıncı filtresi, gerçek sayfalama ve açık sayfada 15 saniyelik yenileme.
- Tarif, malzemeler, hazırlanış, püf noktaları ve üretilen kapağı inceleme; onay/ret/iptal, hata sonrası devam ve yeniden üretim.
- Düzenleme sonrası eski onay ve kapak sıfırlanır; yeniden kontrol ve görsel üretimi gerekir. 409'da yazılan taslak korunur.
- Kullanım ve belirsiz maliyetler, model ve aşama geçmişi ayrı gösterilir. Sağlayıcı maliyetleri tahminidir.

Sabit BFF uçları `/api/ai-publications` altında Laravel'in `/admin/ai-publications`, `/admin/ai-publication-settings` ve `/admin/ai-publication-profiles` uçlarını kullanır. Her istekte admin, yazmalarda aynı origin, payload allowlist ve revision denetlenir. Kapağın özel depolama yolu DTO'dan çıkarılır ve oturumlu medya proxy'sine çevrilir. OpenAI anahtarı Nuxt'ta tutulmaz.

Backend migration'ları ve Redis AI çalışanı/planlayıcısı gerekir. İlk kurulumda genel sistem kapalı ve admin onayı açıktır. Ayarları kaydetmek tek başına arka plan çalışanını başlatmaz; panel son çalışan ve planlayıcı zamanlarını gösterir. Yayınlanan tarifler mevcut topluluk tarifleri olduğundan sonradan **Tarif incelemeleri** üzerinden yönetilir. Kurulum ve hata/bütçe davranışları API deposundaki `docs/api/ai-publications.md` içindedir.

Hazır bir AI tarifini hemen paylaşmak için inceleme penceresindeki **Onayla ve şimdi yayınla** / **Şimdi yayınla** kullanılır. Aynı işlem admin kararını ve normal tarif paylaşımını atomik olarak kaydeder; otomatik üretim kapalı olsa da saat beklenmez. Tarif, olumlu kontrol ve kapak hazır olmalıdır. Gerçek yayın zamanı ayrıca gösterilir; yeniden tıklama ikinci tarif oluşturmaz.

AI kapak önizlemesi API `width`/`height` bilgilerini korur ve ortak `UiAppImageGallery` bileşeninin isteğe bağlı `aspectRatio` parametresini kullanır. Yeni kapaklar 1080×566 yatay PNG’dir; diğer galeri çağrıları önceki görünümü korur.
