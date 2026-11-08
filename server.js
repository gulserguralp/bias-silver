const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));
const Anthropic = require('@anthropic-ai/sdk');

// Veritabanı bağlantısı
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'bias'
});

db.connect((err) => {
    if (err) {
        console.log('Veritabanı bağlantı hatası:', err);
        return;
    }
    console.log('Veritabanına bağlandı!');
});

// ── ÜRÜNLER ──
app.get('/api/urunler', (req, res) => {
    const sql = `
    SELECT u.*, k.ad as kategori_ad, ko.ad as koleksiyon_ad 
    FROM urunler u
    LEFT JOIN kategoriler k ON u.kategori_id = k.id
    LEFT JOIN koleksiyonlar ko ON u.koleksiyon_id = ko.id
  `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json(results);
    });
});

app.get('/api/urunler/:id', (req, res) => {
    const sql = `
    SELECT u.*, k.ad as kategori_ad, ko.ad as koleksiyon_ad 
    FROM urunler u
    LEFT JOIN kategoriler k ON u.kategori_id = k.id
    LEFT JOIN koleksiyonlar ko ON u.koleksiyon_id = ko.id
    WHERE u.id = ?
  `;
    db.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        if (results.length === 0) return res.status(404).json({ hata: 'Ürün bulunamadı' });
        res.json(results[0]);
    });
});

// ── KATEGORİLER ──
app.get('/api/kategoriler', (req, res) => {
    db.query('SELECT * FROM kategoriler', (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json(results);
    });
});

// ── KOLEKSİYONLAR ──
app.get('/api/koleksiyonlar', (req, res) => {
    db.query('SELECT * FROM koleksiyonlar', (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json(results);
    });
});

// ── KULLANICI KAYIT ──
app.post('/api/kayit', async (req, res) => {
    const { ad, soyad, email, sifre, telefon } = req.body;
    try {
        const hashSifre = await bcrypt.hash(sifre, 10);
        const sql = 'INSERT INTO kullanicilar (ad, soyad, email, sifre, telefon) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [ad, soyad, email, hashSifre, telefon], (err, result) => {
            if (err) return res.status(500).json({ hata: 'Bu email zaten kayıtlı' });
            res.json({ mesaj: 'Kayıt başarılı', id: result.insertId });
        });
    } catch (err) {
        res.status(500).json({ hata: err.message });
    }
});

// ── KULLANICI GİRİŞ ──
app.post('/api/giris', (req, res) => {
    const { email, sifre } = req.body;
    db.query('SELECT * FROM kullanicilar WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        if (results.length === 0) return res.status(401).json({ hata: 'Email veya şifre hatalı' });
        const kullanici = results[0];
        const eslesti = await bcrypt.compare(sifre, kullanici.sifre);
        if (!eslesti) return res.status(401).json({ hata: 'Email veya şifre hatalı' });
        const token = jwt.sign({ id: kullanici.id, email: kullanici.email }, 'bias_gizli_anahtar', { expiresIn: '7d' });
        res.json({ mesaj: 'Giriş başarılı', token, kullanici: { id: kullanici.id, ad: kullanici.ad, email: kullanici.email } });
    });
});

// ── SEPET ──
app.get('/api/sepet/:kullanici_id', (req, res) => {
    const sql = `
    SELECT s.*, u.ad, u.fiyat, u.fotograf 
    FROM sepet s
    LEFT JOIN urunler u ON s.urun_id = u.id
    WHERE s.kullanici_id = ?
  `;
    db.query(sql, [req.params.kullanici_id], (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json(results);
    });
});

app.post('/api/sepet', (req, res) => {
    const { kullanici_id, urun_id, adet } = req.body;
    const sql = 'INSERT INTO sepet (kullanici_id, urun_id, adet) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE adet = adet + ?';
    db.query(sql, [kullanici_id, urun_id, adet, adet], (err, result) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json({ mesaj: 'Sepete eklendi' });
    });
});

app.delete('/api/sepet/:id', (req, res) => {
    db.query('DELETE FROM sepet WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json({ mesaj: 'Sepetten silindi' });
    });
});

// ── SİPARİŞ ──
app.post('/api/siparis', (req, res) => {
    const { kullanici_id, toplam, teslimat_adresi, urunler } = req.body;
    const siparisSql = 'INSERT INTO siparisler (kullanici_id, toplam, teslimat_adresi) VALUES (?, ?, ?)';
    db.query(siparisSql, [kullanici_id, toplam, teslimat_adresi], (err, result) => {
        if (err) return res.status(500).json({ hata: err.message });
        const siparis_id = result.insertId;
        const urunSql = 'INSERT INTO siparis_urunleri (siparis_id, urun_id, adet, fiyat) VALUES ?';
        const urunData = urunler.map(u => [siparis_id, u.urun_id, u.adet, u.fiyat]);
        db.query(urunSql, [urunData], (err2) => {
            if (err2) return res.status(500).json({ hata: err2.message });
            res.json({ mesaj: 'Sipariş oluşturuldu', siparis_id });
        });
    });
});

app.get('/api/kullanicilar', (req, res) => {
    db.query('SELECT id, ad, soyad, email, telefon, created_at FROM kullanicilar', (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json(results);
    });
});

app.get('/api/siparisler/:kullanici_id', (req, res) => {
    db.query(
        'SELECT * FROM siparisler WHERE kullanici_id = ? ORDER BY created_at DESC',
        [req.params.kullanici_id],
        (err, results) => {
            if (err) return res.status(500).json({ hata: err.message });
            res.json(results);
        }
    );
});
app.get('/api/sql', (req, res) => {
    const sql = req.query.q;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ hata: err.message });
        res.json(results);
    });
});
// Sunucuyu başlat
const PORT = 3000;
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

app.post('/api/chat', async (req, res) => {
    const { mesaj } = req.body;

    try {
        const urunlerSorgu = await new Promise((resolve, reject) => {
            db.query(`SELECT u.*, k.ad as kategori_ad, ko.ad as koleksiyon_ad 
                FROM urunler u
                LEFT JOIN kategoriler k ON u.kategori_id = k.id
                LEFT JOIN koleksiyonlar ko ON u.koleksiyon_id = ko.id`,
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
        });

        const urunListesi = urunlerSorgu.map(u =>
            `ID:${u.id} - ${u.ad} - ${u.kategori_ad} - ${u.koleksiyon_ad} - ${u.fiyat}₺`
        ).join('\n');

        const response = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1024,
            system: `Sen BIAS adlı 925 ayar gümüş takı markasının yapay zeka asistanısın. 
      Müşterilere takı önerisi yapıyor, sorularını cevaplıyorsun.
      Türkçe konuşuyorsun, kibar ve yardımseversin.
      
      Mevcut ürünlerimiz:
      ${urunListesi}
      
Kurallar:
1. Eğer müşteri genel soru sorarsa (kargo, iade, materyal gibi) normal cevap ver.
2. Eğer müşteri mevcut ürünlerden birini istiyorsa ürün ID'sini şu formatta belirt: [URUN:ID]
3. Eğer müşteri özel bir tasarım veya mevcut ürünlerde olmayan bir şey istiyorsa, mutlaka görsel oluştur ve şu formatta ekle: [GORSEL:ingilizce prompt] Örneğin: [GORSEL:minimalist silver ring with moon motif]
4. Özel tasarım isteklerinde her zaman görsel oluştur, ürün önerme.

Kargo: 5000₺ üzeri ücretsiz, altı 49₺.
İade: 14 gün içinde kabul edilir.
Materyal: Tüm ürünler 925 ayar gümüş.`,
            messages: [{ role: 'user', content: mesaj }]
        });

        const cevap = response.content[0].text;

        // Görsel üretme isteği var mı kontrol et
        const gorselMatch = cevap.match(/\[GORSEL:(.*?)\]/);
console.log('Claude cevabı:', cevap);
console.log('Görsel match:', gorselMatch);
let gorselUrl = null;

        if (gorselMatch) {
            const prompt = gorselMatch[1];
            const encodedPrompt = encodeURIComponent(`925 sterling silver jewelry, ${prompt}, professional product photography, black background, highly detailed`);
           gorselUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}`;
        }
        console.log('Görsel URL:', gorselUrl);

        res.json({
            cevap: cevap.replace(/\[GORSEL:.*?\]/g, ''),
            gorselUrl
        });
    } catch (err) {
        console.log('Claude API hatası:', err);
        res.status(500).json({ hata: err.message });
    }
});
// Yapay zeka ile ürün açıklaması oluştur
app.post('/api/aciklama-olustur', async (req, res) => {
  const { ad, kategori, koleksiyon } = req.body;

  try {
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

    res.json({ aciklama: response.content[0].text });
  } catch (err) {
    res.status(500).json({ hata: err.message });
  }
});
app.listen(PORT, () => {
    console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});

// Admin - Ürün ekle
app.post('/api/urunler', (req, res) => {
  const { ad, fiyat, stok, fotograf, kategori_id, koleksiyon_id, aciklama } = req.body;
  const sql = 'INSERT INTO urunler (ad, fiyat, stok, fotograf, kategori_id, koleksiyon_id, aciklama) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [ad, fiyat, stok, fotograf, kategori_id, koleksiyon_id, aciklama], (err, result) => {
    if (err) return res.status(500).json({ hata: err.message });
    res.json({ mesaj: 'Ürün eklendi', id: result.insertId });
  });
});

// Admin - Ürün sil
app.delete('/api/urunler/:id', (req, res) => {
  db.query('DELETE FROM urunler WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ hata: err.message });
    res.json({ mesaj: 'Ürün silindi' });
  });
});

// Admin - Tüm siparişler
app.get('/api/admin/siparisler', (req, res) => {
  const sql = `SELECT s.*, k.ad as kullanici_ad, k.email 
               FROM siparisler s 
               LEFT JOIN kullanicilar k ON s.kullanici_id = k.id
               ORDER BY s.created_at DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ hata: err.message });
    res.json(results);
  });
});

// Admin - Sipariş durumu güncelle
app.put('/api/siparisler/:id/durum', (req, res) => {
  const { durum } = req.body;
  db.query('UPDATE siparisler SET durum = ? WHERE id = ?', [durum, req.params.id], (err) => {
    if (err) return res.status(500).json({ hata: err.message });
    res.json({ mesaj: 'Durum güncellendi' });
  });
});

// Admin - Sipariş sil
app.delete('/api/siparisler/:id', (req, res) => {
  db.query('DELETE FROM siparis_urunleri WHERE siparis_id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ hata: err.message });
    db.query('DELETE FROM siparisler WHERE id = ?', [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ hata: err2.message });
      res.json({ mesaj: 'Sipariş silindi' });
    });
  });
});