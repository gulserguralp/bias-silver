// Chatbot HTML'ini sayfaya ekle
document.addEventListener('DOMContentLoaded', function() {

  const chatHTML = `
    <div id="chat-btn" style="position:fixed; bottom:32px; right:32px; width:56px; height:56px; background:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:1000; box-shadow: 0 4px 24px rgba(0,0,0,0.4);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" stroke-width="1.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>

    <div id="chat-box" style="position:fixed; bottom:100px; right:32px; width:360px; height:500px; background:#111; border:1px solid rgba(192,192,192,0.1); z-index:1000; display:none; flex-direction:column; box-shadow: 0 8px 40px rgba(0,0,0,0.6);">
      <div style="padding:20px 24px; border-bottom:1px solid rgba(192,192,192,0.08); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-family:var(--font-display); font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#fff;">BIAS Asistan</div>
          <div style="font-family:var(--font-body); font-size:12px; color:rgba(192,192,192,0.4); margin-top:2px; font-style:italic;">Takı danışmanınız</div>
        </div>
        <button id="chat-close" style="background:none; border:none; color:rgba(192,192,192,0.4); cursor:pointer; font-size:20px;">×</button>
      </div>

      <div id="chat-messages" style="flex:1; overflow-y:auto; padding:20px 24px; display:flex; flex-direction:column; gap:12px;">
        <div style="background:rgba(192,192,192,0.06); padding:12px 16px; border-radius:2px; font-size:14px; color:rgba(192,192,192,0.7); font-style:italic;">
          Merhaba! Ben BIAS'ın yapay zeka asistanıyım. Size takı önerisi yapabilir, sorularınızı cevaplayabilirim.
        </div>
      </div>

      <div style="padding:16px 24px; border-top:1px solid rgba(192,192,192,0.08); display:flex; gap:8px;">
        <input type="text" id="chat-input" placeholder="Mesajınızı yazın..." style="flex:1; background:rgba(192,192,192,0.06); border:1px solid rgba(192,192,192,0.1); color:#fff; font-size:14px; padding:10px 14px; outline:none;"/>
        <button id="chat-gonder" style="background:#fff; color:#0a0a0a; border:none; padding:10px 16px; cursor:pointer; font-size:10px; letter-spacing:0.2em;">GÖNDER</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', chatHTML);

  document.getElementById('chat-btn').addEventListener('click', function() {
    const box = document.getElementById('chat-box');
    box.style.display = box.style.display === 'none' ? 'flex' : 'none';
  });

  document.getElementById('chat-close').addEventListener('click', function() {
    document.getElementById('chat-box').style.display = 'none';
  });

  document.getElementById('chat-gonder').addEventListener('click', chatGonder);
  document.getElementById('chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') chatGonder();
  });
});

async function chatGonder() {
  const input = document.getElementById('chat-input');
  const mesaj = input.value.trim();
  if (!mesaj) return;

  const messages = document.getElementById('chat-messages');

  messages.innerHTML += `
    <div style="align-self:flex-end; background:rgba(255,255,255,0.08); padding:10px 14px; max-width:80%; font-size:14px; color:#fff;">
      ${mesaj}
    </div>
  `;

  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  messages.innerHTML += `<div id="yukleniyor" style="font-size:13px; color:rgba(192,192,192,0.4); font-style:italic;">yazıyor...</div>`;
  messages.scrollTop = messages.scrollHeight;

  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mesaj })
    });
    const data = await res.json();

    document.getElementById('yukleniyor').remove();

let cevap = data.cevap.replace(/\[URUN:(\d+)\]/g, (match, id) => {
  return `<a href="urun.html?id=${id}" style="color:#e8e8e8; text-decoration:underline;">ürünü incele</a>`;
});

let gorselHTML = '';
if (data.gorselUrl) {
gorselHTML = `
    <div style="margin-top:12px;">
      <div style="font-size:11px; color:rgba(192,192,192,0.4); margin-bottom:8px; letter-spacing:0.1em;">OLUŞTURULAN TASARIM</div>
      <img src="${data.gorselUrl}" style="width:100%; max-width:280px; display:block; opacity:1;" />
      <div style="font-size:11px; color:rgba(192,192,192,0.35); margin-top:8px; font-style:italic;">Bu tasarımı beğendiyseniz özel sipariş verebilirsiniz.</div>
    </div>
  `;
}

messages.innerHTML += `
  <div style="background:rgba(192,192,192,0.06); padding:12px 16px; max-width:85%; font-size:14px; color:rgba(192,192,192,0.8); line-height:1.6;">
    ${cevap}
    ${gorselHTML}
  </div>
`;
    messages.scrollTop = messages.scrollHeight;

  } catch (err) {
    document.getElementById('yukleniyor').remove();
    messages.innerHTML += `<div style="color:rgba(192,192,192,0.4); font-size:13px;">Bağlantı hatası.</div>`;
  }
}