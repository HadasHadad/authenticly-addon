const SERVER_URL = "http://127.0.0.1:3000";

// ─── Fingerprinting ────────────────────────────────────────────────────────────
// מנרמל URL לזיהוי תמונה זהה בגרסאות שונות (CDN, resize, query params)
function normalizeUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    let path = url.pathname;

    // מסיר סיומות ריסייז נפוצות בפאת׳: /300x200/, _thumb, @2x, -large וכו׳
    path = path
      .replace(/[@_-](small|medium|large|thumb|thumbnail|preview|xl|xs|2x|3x|hd|sd|low|high)/gi, '')
      .replace(/\/\d+x\d+\//g, '/')           // /300x200/ → /
      .replace(/\.\w+$/, '')                   // מוריד סיומת (.jpg .png וכו׳)
      .replace(/[-_]+/g, '-')                  // מנרמל סימני מפריד
      .toLowerCase();

    // מוריד query params שאינם חלק מזהות התמונה
    const keepParams = ['id', 'photo_id', 'image_id'];
    const cleanParams = new URLSearchParams();
    for (const [k, v] of url.searchParams.entries()) {
      if (keepParams.includes(k.toLowerCase())) cleanParams.set(k, v);
    }

    const host = url.hostname.replace(/^(i\d+\.|cdn\d*\.|static\d*\.|img\d*\.|media\d*\.)/, '');
    const paramStr = cleanParams.toString() ? '?' + cleanParams.toString() : '';
    return `${host}${path}${paramStr}`;
  } catch (e) {
    return imageUrl;
  }
}

// ─── Perceptual hash (pHash-lite) ─────────────────────────────────────────────
// מחשב hash ויזואלי של התמונה בעצמה, כך שתמונה זהה עם URL שונה תזוהה
function computeImageHash(imgElement) {
  return new Promise((resolve) => {
    try {
      const SIZE = 16;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgElement, 0, 0, SIZE, SIZE);
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

      // ממיר ל-grayscale ומחשב ממוצע
      const grays = [];
      for (let i = 0; i < data.length; i += 4) {
        grays.push(Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]));
      }
      const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
      const hash = grays.map(v => v >= avg ? '1' : '0').join('');
      resolve(hash);
    } catch (e) {
      // CORS block — fallback ל-URL normalization בלבד
      resolve(null);
    }
  });
}

// בוחר מזהה: hash אם יש גישה, אחרת URL מנורמל
async function getImageKey(imgElement) {
  const hash = await computeImageHash(imgElement);
  if (hash) return 'hash:' + hash;
  return 'url:' + normalizeUrl(imgElement.src);
}

// ─── UI ────────────────────────────────────────────────────────────────────────
const BUBBLE_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: system-ui, sans-serif; }

  .wrap {
    position: relative;
    background: #ffffff;
    border: 0.5px solid rgba(0,0,0,0.15);
    border-radius: 16px;
    width: 192px;
    padding: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .wrap::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #1D9E75, #7F77DD);
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .title {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: #888;
  }
  .close-btn {
    width: 18px; height: 18px;
    border-radius: 50%;
    border: 0.5px solid #ddd;
    background: #f5f5f5;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: #666;
    padding: 0;
    line-height: 1;
  }
  .close-btn:hover { background: #eee; }

  /* ── Vote state ── */
  .vote-question {
    font-size: 12px;
    font-weight: 600;
    color: #1a1a1a;
    text-align: center;
    margin-bottom: 8px;
  }
  .vote-btns { display: flex; gap: 7px; }
  .v-btn {
    flex: 1;
    padding: 7px 0;
    border-radius: 8px;
    border: 0.5px solid #ddd;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    background: #f8f8f8;
    transition: background 0.12s, transform 0.1s;
  }
  .v-btn:hover { background: #efefef; }
  .v-btn:active { transform: scale(0.96); }
  .v-btn.real { color: #0F6E56; }
  .v-btn.ai   { color: #534AB7; }

  /* ── Results state ── */
  .results { display: none; }
  .results.show { display: block; }

  .bar-row { margin-bottom: 8px; }
  .bar-top {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin-bottom: 3px;
  }
  .bar-name { font-weight: 600; }
  .bar-name.real { color: #0F6E56; }
  .bar-name.ai   { color: #534AB7; }
  .bar-pct { font-weight: 600; color: #1a1a1a; }
  .track {
    height: 5px;
    background: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s cubic-bezier(.4,0,.2,1);
  }
  .fill.real { background: #1D9E75; }
  .fill.ai   { background: #7F77DD; }
  .bar-sub {
    font-size: 9px;
    color: #aaa;
    text-align: right;
    margin-top: 1px;
  }

  .footer {
    margin-top: 8px;
    padding-top: 7px;
    border-top: 0.5px solid #eee;
    font-size: 9px;
    color: #aaa;
    text-align: center;
  }
  .my-badge {
    display: inline-block;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 600;
    margin-top: 4px;
  }
  .my-badge.real { background: #E1F5EE; color: #0F6E56; }
  .my-badge.ai   { background: #EEEDFE; color: #3C3489; }

  .loading { font-size: 11px; color: #aaa; text-align: center; padding: 6px 0; }
`;

function buildBubbleHTML(data, myVote) {
  if (!data) return `<div class="loading">שגיאה בטעינה</div>`;
  const total = data.real + data.ai;
  const realPct = total === 0 ? 50 : Math.round((data.real / total) * 100);
  const aiPct = 100 - realPct;
  return `
    <div class="bar-row">
      <div class="bar-top">
        <span class="bar-name real">Real</span>
        <span class="bar-pct">${realPct}%</span>
      </div>
      <div class="track"><div class="fill real" style="width:${realPct}%"></div></div>
      <div class="bar-sub">${data.real.toLocaleString()} votes</div>
    </div>
    <div class="bar-row">
      <div class="bar-top">
        <span class="bar-name ai">AI</span>
        <span class="bar-pct">${aiPct}%</span>
      </div>
      <div class="track"><div class="fill ai" style="width:${aiPct}%"></div></div>
      <div class="bar-sub">${data.ai.toLocaleString()} votes</div>
    </div>
    <div class="footer">
      ${total.toLocaleString()} votes total
      ${myVote ? `<br><span class="my-badge ${myVote}">You voted: ${myVote === 'real' ? 'Real' : 'AI'}</span>` : ''}
    </div>
  `;
}

function injectTrustTool(imageElement) {
  if (imageElement.dataset.trustInjected === 'true') return;
  if (!imageElement.src || imageElement.naturalWidth < 80) return;

  imageElement.dataset.trustInjected = 'true';

  getImageKey(imageElement).then((imageKey) => {
    const host = document.createElement('div');
    host.style.cssText = 'position:absolute;z-index:2147483647;pointer-events:none;';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>${BUBBLE_CSS}</style>
      <div class="wrap" style="pointer-events:auto">
        <div class="header">
          <span class="title">Authenticly</span>
          <button class="close-btn" id="close">✕</button>
        </div>
        <div class="vote-state" id="vote">
          <div class="vote-question">Real image or AI?</div>
          <div class="vote-btns">
            <button class="v-btn real" id="btn-real">📷 Real</button>
            <button class="v-btn ai"   id="btn-ai">🤖 AI</button>
          </div>
        </div>
        <div class="results" id="results"><div class="loading">טוען...</div></div>
      </div>`;

    const updatePosition = () => {
      const rect = imageElement.getBoundingClientRect();
      if (rect.width === 0) return;
      host.style.top  = (rect.top  + window.scrollY + 8) + 'px';
      host.style.left = (rect.left + window.scrollX + 8) + 'px';
    };
    updatePosition();
    const posInterval = setInterval(updatePosition, 500);

    shadow.getElementById('close').onclick = () => {
      clearInterval(posInterval);
      host.remove();
    };

    const showResults = (data, myVote) => {
      shadow.getElementById('vote').style.display = 'none';
      const resultsEl = shadow.getElementById('results');
      resultsEl.innerHTML = buildBubbleHTML(data, myVote);
      resultsEl.classList.add('show');
    };

    const vote = (type) => {
      shadow.getElementById('vote').innerHTML = '<div class="loading">שולח...</div>';
      chrome.runtime.sendMessage(
        { action: 'fetchData', url: `${SERVER_URL}/vote`, method: 'POST', body: { url: imageKey, voteType: type } },
        (res) => {
          chrome.storage.local.set({ [imageKey]: type }, () => {
            showResults(res?.data, type);
          });
        }
      );
    };

    shadow.getElementById('btn-real').onclick = () => vote('real');
    shadow.getElementById('btn-ai').onclick   = () => vote('ai');

    // בדוק אם כבר הצבעת
    chrome.storage.local.get(imageKey, (stored) => {
      const myVote = stored[imageKey];
      if (myVote) {
        // כבר הצבעת — הצג תוצאות ישר
        chrome.runtime.sendMessage(
          { action: 'fetchData', url: `${SERVER_URL}/front?url=${encodeURIComponent(imageKey)}` },
          (res) => showResults(res?.data, myVote)
        );
      } else {
        // טען תוצאות ברקע (למקרה שכבר יש הצבעות)
        chrome.runtime.sendMessage(
          { action: 'fetchData', url: `${SERVER_URL}/front?url=${encodeURIComponent(imageKey)}` },
          () => {} // מוכן לכשיצביעו
        );
      }
    });
  });
}

const observer = new MutationObserver(() => {
  document.querySelectorAll('img').forEach(injectTrustTool);
});
observer.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('img').forEach(injectTrustTool);
