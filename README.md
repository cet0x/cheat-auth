# CS2 License Server - Kurulum ve Kullanım Kılavuzu

## 📋 Gereksinimler

- **Node.js** (v14 veya üzeri)
- **npm** (Node.js ile birlikte gelir)
- **Windows** (C++ client için)
- **Visual Studio** veya **MinGW** (C++ derlemesi için)

## 🚀 Hızlı Başlangıç

### 1. Backend Server Kurulumu

```bash
# License server klasörüne git
cd license-server

# Bağımlılıkları yükle
npm install

# Sunucuyu başlat
npm start
```

Server başarıyla başladığında şu mesajı göreceksiniz:
```
╔═══════════════════════════════════════════════════════╗
║         CS2 License Server - Online & Ready          ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running on: http://localhost:3000
🔐 Admin Panel: http://localhost:3000/admin.html
📊 API Health: http://localhost:3000/api/health

Admin Credentials:
  Username: admin
  Password: admin123
```

### 2. Admin Panel Kullanımı

1. Tarayıcınızda `http://localhost:3000/admin.html` adresini açın
2. Giriş yapın:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Key üretmek için:
   - Expiry Duration seçin (7, 30, 90, 180, 365 gün veya Lifetime)
   - "Generate Key" butonuna tıklayın
   - Oluşturulan key'i kopyalayın

### 3. CS2 Cheat Entegrasyonu

C++ cheat'iniz otomatik olarak entegre edilmiştir. Program başlatıldığında:

1. License key isteyecek
2. Admin panelden ürettiğiniz key'i girin
3. HWID otomatik olarak bilgisayarınıza bağlanacak
4. Doğrulama başarılıysa cheat yüklenecek

## 🔧 Yapılandırma

### Admin Şifresini Değiştirme

`.env` dosyasını düzenleyin:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yeni_sifreniz_buraya
```

### Server Portunu Değiştirme

`.env` dosyasında:

```env
PORT=3000  # İstediğiniz port numarasını yazın
```

### C++ Client Server Adresi

Eğer server'ı farklı bir bilgisayarda çalıştırıyorsanız, `main.cpp` dosyasında şu satırı düzenleyin:

```cpp
LicenseSystem::LicenseClient licenseClient(L"localhost", 3000);
// Değiştirin:
LicenseSystem::LicenseClient licenseClient(L"sunucu_ip_adresi", 3000);
```

## 📊 Admin Panel Özellikleri

### Dashboard
- **Total Keys**: Toplam üretilen key sayısı
- **Active Keys**: Aktif ve süresi dolmamış key'ler
- **Expired Keys**: Süresi dolmuş key'ler
- **Bound to HWID**: Bir bilgisayara bağlanmış key'ler

### Key Yönetimi
- Tüm key'leri görüntüleme
- Key silme
- Key arama (key veya HWID ile)
- Gerçek zamanlı durum güncellemeleri

### Key Özellikleri
- **Expiry System**: 7 gün, 30 gün, 90 gün, 180 gün, 365 gün veya Lifetime
- **HWID Lock**: Her key sadece bir bilgisayara bağlanır
- **Last Used**: Son kullanım zamanı takibi
- **Status**: Active/Expired durumu

## 🌐 Deployment (Canlıya Alma)

### Option 1: Heroku (Ücretsiz)

```bash
# Heroku CLI yükleyin
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Uygulama oluştur
heroku create cs2-license-server

# Deploy et
git push heroku main

# URL'inizi alın
heroku open
```

### Option 2: Railway

1. [Railway.app](https://railway.app) hesabı oluşturun
2. "New Project" → "Deploy from GitHub repo"
3. `license-server` klasörünü seçin
4. Otomatik deploy edilecek

### Option 3: VPS (DigitalOcean, Linode, vb.)

```bash
# VPS'e bağlan
ssh root@your-vps-ip

# Node.js yükle
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Projeyi klonla
git clone your-repo-url
cd license-server

# Bağımlılıkları yükle
npm install

# PM2 ile çalıştır (otomatik restart)
npm install -g pm2
pm2 start server.js --name "license-server"
pm2 startup
pm2 save
```

## 🔒 Güvenlik Önerileri

1. **Admin Şifresini Değiştirin**: `.env` dosyasındaki varsayılan şifreyi mutlaka değiştirin
2. **HTTPS Kullanın**: Production'da SSL sertifikası kullanın
3. **Firewall**: Sadece gerekli portları açın
4. **Rate Limiting**: Varsayılan olarak aktif (15 dakikada 100 istek)
5. **Database Backup**: `database.db` dosyasını düzenli yedekleyin

## 🐛 Sorun Giderme

### Server başlamıyor
```bash
# Port zaten kullanımda olabilir
netstat -ano | findstr :3000
# Çalışan process'i sonlandırın veya portu değiştirin
```

### C++ Cheat bağlanamıyor
- Server'ın çalıştığından emin olun (`http://localhost:3000/api/health`)
- Firewall ayarlarını kontrol edin
- Server IP ve port'u doğru mu kontrol edin

### Key doğrulanamıyor
- Key'in doğru girildiğinden emin olun
- Key'in süresinin dolmadığını kontrol edin
- HWID lock'u kontrol edin (farklı PC'de kullanılamaz)

## 📝 API Endpoints

### Public Endpoints

#### Validate License
```http
POST /api/validate
Content-Type: application/json

{
  "key": "XXXX-XXXX-XXXX-XXXX",
  "hwid": "hardware_id_here"
}
```

Response:
```json
{
  "valid": true,
  "message": "License valid",
  "expiresAt": "2026-03-15T12:00:00.000Z"
}
```

### Admin Endpoints (Basic Auth Required)

#### Generate Key
```http
POST /api/admin/generate
Authorization: Basic YWRtaW46YWRtaW4xMjM=
Content-Type: application/json

{
  "expiryDays": 30
}
```

#### Get All Keys
```http
GET /api/admin/keys
Authorization: Basic YWRtaW46YWRtaW4xMjM=
```

#### Delete Key
```http
DELETE /api/admin/keys/XXXX-XXXX-XXXX-XXXX
Authorization: Basic YWRtaW46YWRtaW4xMjM=
```

#### Get Statistics
```http
GET /api/admin/stats
Authorization: Basic YWRtaW46YWRtaW4xMjM=
```

## 📞 Destek

Sorun yaşarsanız:
1. `database.db` dosyasını silin ve yeniden başlatın
2. `node_modules` klasörünü silin ve `npm install` çalıştırın
3. Server loglarını kontrol edin

## 🎉 Başarılı Kurulum!

Artık profesyonel bir online license sisteminiz var! 🚀

- ✅ Key üretme ve yönetme
- ✅ HWID kilitleme
- ✅ Süre sınırı kontrolü
- ✅ Modern admin paneli
- ✅ Güvenli API
