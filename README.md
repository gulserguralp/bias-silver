# BIAS Silver

925 ayar gümüş takı e-ticaret platformu. Üniversite projesi olarak geliştirildi.

## Özellikler
- Ürün listeleme ve koleksiyonlar (Love, Mystic, Savage, Sun, Charm)
- Ürün arama
- Sepet ve ödeme akışı
- Üyelik, giriş ve profil sayfası
- Yönetici paneli
- Claude API ile yapay zeka sohbet asistanı

## Teknolojiler
Node.js, Express.js, MySQL, HTML/CSS/JavaScript, Claude API

## Kurulum

**Gereksinimler:** Node.js, MySQL

1. Bağımlılıkları yükle:
   ```
   npm install
   ```
2. MySQL'de veritabanını oluştur ve tabloları içe aktar:
   ```
   mysql -u root -p -e "CREATE DATABASE bias;"
   mysql -u root -p bias < schema.sql
   ```
3. `.env.example` dosyasını `.env` olarak kopyala ve doldur:
   - `DB_PASSWORD`: MySQL root şifren
   - `ANTHROPIC_API_KEY`: Claude API anahtarın
4. Sunucuyu başlat:
   ```
   node server.js
   ```
5. Tarayıcıda `http://localhost:3000` adresini aç.

> Veritabanı bağlantısı `localhost`, kullanıcı `root`, veritabanı adı `bias` olarak `server.js` içinde tanımlıdır.
