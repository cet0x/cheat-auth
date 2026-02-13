# 10 Dakikada Online Server Kurulumu (Git Olmadan)

Bilgisayarında Git yüklü olmadığı için en basit yöntem **GitHub Web Upload** ve **Render** kullanmaktır.

## Adım 1: GitHub Hesabı ve Repo Oluşturma

1. [GitHub.com](https://github.com/) adresine git ve üye ol (veya giriş yap).
2. Sağ üstteki **+** ikonuna tıkla ve **New repository** seç.
3. **Repository name**: `cs2-license-server` yaz.
4. **Public** veya **Private** seç (Private seçersen Render'da bağlarken izin vermen gerekir, Public daha kolaydır).
5. **Create repository** butonuna tıkla.

## Adım 2: Dosyaları Yükleme

1. Oluşturduğun proje sayfasında **uploading an existing file** linkine tıkla.
2. Bilgisayarındaki `license-server` klasörüne git:
   - `C:\Users\muham\Desktop\Cs2-Hack\license-server`
3. Şu dosyaları sürükle ve bırak:
   - `package.json`
   - `server.js`
   - `database.js`
   - `.env` (ÖNEMLİ: İçindeki şifreyi değiştirin!)
   - `public/` klasörünü (GitHub web arayüzünde klasör yüklemek bazen zordur, eğer yükleyemezseniz tek tek dosyaları atın veya sadece ana dosyaları atın).
   
   *Not: `node_modules` klasörünü ASLA yüklemeyin!*

4. Aşağıdaki **Commit changes** butonuna tıkla.

## Adım 3: Render ile Online Yapma

1. [Render.com](https://render.com/) adresine git ve "Get Started for Free" diyerek GitHub hesabınla giriş yap.
2. **New +** butonuna tıkla ve **Web Service** seç.
3. "Connect a repository" kısmında `cs2-license-server` projeni seç (Görünmüyorsa "Configure account" diyerek izin ver).
4. Ayarları şöyle yap:
   - **Name**: `cs2-license` (veya istediğin bir isim)
   - **Region**: Frankfurt (bize en yakın)
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free

5. **Create Web Service** butonuna tıkla.

## Adım 4: Tamamlandı!

Render birkaç dakika içinde server'ı kuracak. Sol üstte sana bir URL verecek:
Örnek: `https://cs2-license-xyz.onrender.com`

Bu senin **Server URL**'in!

### ⚠️ Önemli Notlar

1. **Database**: Render Free planda dosyalar kalıcı değildir (server kapanınca database sıfırlanabilir). Kalıcı olması için Render'da "Disk" eklemen gerekir (ücretli) veya veritabanını dışarıda tutman gerekir (örn: MongoDB Atlas).
   - *Başlangıç için sorun değil, ama server restart atarsa key'ler silinebilir.*
   - **Çözüm**: `render.yaml` ile Disk eklemek veya paralı plana geçmek.

2. **C++ Ayarı**:
   Bu yeni URL'i alıp `encrypt_url_tool` ile şifrele ve `main.cpp` içine koy!
