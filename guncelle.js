//ürünleri güncellemek için 



const mysql = require('mysql2');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'bias'
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

db.connect((err) => {
  if (err) { console.log('Hata:', err); return; }
  console.log('Bağlandı!');
  aciklamalariGuncelle();
});

async function aciklamaOlustur(ad, kategori, koleksiyon) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `Sen BIAS Silver adlı lüks 925 ayar gümüş takı markasının copywriter'ısın. 
    Kısa, etkileyici ve marka tonuna uygun ürün açıklamaları yazıyorsun.
    Açıklamalar Türkçe, 2-3 cümle, şiirsel ama sade olmalı.
    Teknik bilgi değil, duygu ve estetik ön planda olmalı.`,
    messages: [{
      role: 'user',
      content: `Şu ürün için açıklama yaz: ${ad} — Kategori: ${kategori} — Koleksiyon: ${koleksiyon}`
    }]
  });
  return response.content[0].text;
}

async function aciklamalariGuncelle() {
  // Tüm ürünleri kategori ve koleksiyon adlarıyla çek
  db.query(`
    SELECT u.id, u.ad, k.ad as kategori, ko.ad as koleksiyon
    FROM urunler u
    LEFT JOIN kategoriler k ON u.kategori_id = k.id
    LEFT JOIN koleksiyonlar ko ON u.koleksiyon_id = ko.id
  `, async (err, urunler) => {
    if (err) { console.log('Hata:', err); return; }

    console.log(`${urunler.length} ürün için açıklama oluşturuluyor...`);

    for (const urun of urunler) {
      try {
        const aciklama = await aciklamaOlustur(urun.ad, urun.kategori, urun.koleksiyon);
        await new Promise((resolve, reject) => {
          db.query('UPDATE urunler SET aciklama = ? WHERE id = ?', [aciklama, urun.id], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`✓ ${urun.ad}`);
        // API rate limit için kısa bekleme
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.log(`✗ ${urun.ad}: ${err.message}`);
      }
    }

    console.log('Tüm açıklamalar güncellendi!');
    db.end();
  });
}