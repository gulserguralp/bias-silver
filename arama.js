document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;

 
  const sonucDiv = document.createElement('div');
  sonucDiv.id = 'search-results';
  sonucDiv.style.marginTop = '16px';
  searchInput.parentNode.parentNode.appendChild(sonucDiv);

  searchInput.addEventListener('input', function() {
    const aramaMetni = this.value.toLowerCase().trim();

    if (aramaMetni.length < 2) {
      sonucDiv.innerHTML = '';
      return;
    }

    fetch('http://localhost:3000/api/urunler')
      .then(res => res.json())
      .then(urunler => {
        const filtrelenmis = urunler.filter(u =>
          u.ad.toLowerCase().includes(aramaMetni) ||
          u.kategori_ad.toLowerCase().includes(aramaMetni) ||
          u.koleksiyon_ad.toLowerCase().includes(aramaMetni)
        );

        if (filtrelenmis.length === 0) {
          sonucDiv.innerHTML = '<p style="font-family: var(--font-body); font-style: italic; font-size: 14px; color: rgba(192,192,192,0.35); padding: 16px 0;">Sonuç bulunamadı.</p>';
          return;
        }

        sonucDiv.innerHTML = filtrelenmis.map(urun => `
          <a href="urun.html?id=${urun.id}" style="display:flex; align-items:center; gap:16px; padding:12px 0; border-bottom:1px solid rgba(192,192,192,0.07); text-decoration:none;">
            <img src="${urun.fotograf}" style="width:48px; height:48px; object-fit:cover;" />
            <div>
              <div style="font-family: var(--font-body); font-size: 15px; color: #e8e8e8;">${urun.ad}</div>
              <div style="font-family: var(--font-ui); font-size: 9px; color: rgba(192,192,192,0.4); margin-top:4px; letter-spacing:0.15em;">${urun.kategori_ad} · ${urun.fiyat}₺</div>
            </div>
          </a>
        `).join('');
      });
  });
});