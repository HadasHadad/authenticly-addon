const SERVER_URL = "http://127.0.0.1:3000";

function normalizeUrl(imageUrl) {
    try { const url = new URL(imageUrl); return url.origin + url.pathname; } catch (e) { return imageUrl; }
}

function injectTrustTool(imageElement) {
    if (imageElement.dataset.trustInjected === "true") return;
    if (!imageElement.src || imageElement.naturalWidth < 50) return;

    imageElement.dataset.trustInjected = "true";
    const cleanUrl = normalizeUrl(imageElement.src);
    
    const host = document.createElement('div');
    host.style.position = 'absolute';
    host.style.zIndex = '999999'; // גבוה מאוד כדי שיהיה מעל הכל
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
        <style>
            .wrapper { position: relative; }
            .x-btn { position: absolute; top: -10px; right: -10px; cursor: pointer; background: #333; color: #fff; 
                     border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 18px; font-size: 14px; border: none; z-index: 10; }
            .bubble { background: #fff; padding: 10px; border-radius: 12px; border: 1px solid #ccc; 
                      font-family: sans-serif; font-size: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.2); text-align: center; }
            .btn { cursor: pointer; padding: 4px 8px; margin: 2px; border-radius: 4px; border: 1px solid #ccc; }
        </style>
        <div class="wrapper">
            <button class="x-btn">✕</button>
            <div class="bubble">טוען...</div>
        </div>
    `;

    const bubble = shadow.querySelector('.bubble');
    shadow.querySelector('.x-btn').onclick = () => host.remove();

    // פונקציית מיקום קבועה
    const updatePosition = () => {
        const rect = imageElement.getBoundingClientRect();
        if (rect.width === 0) return; // תמונה נסתרת
        host.style.top = (rect.top + window.scrollY) + 'px';
        host.style.left = (rect.left + window.scrollX) + 'px';
    };
    
    setInterval(updatePosition, 500); // רענון מיקום כל חצי שנייה כדי להצמיד לתמונה
    updatePosition();

    chrome.runtime.sendMessage({ action: "fetchData", url: `${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}` }, (res) => {
        if (!res || !res.data) { bubble.innerHTML = "שגיאה"; return; }
        chrome.storage.local.get(cleanUrl, (result) => {
            if (result[cleanUrl]) {
                bubble.innerHTML = `Real: ${res.data.real}% | AI: ${res.data.ai}%`;
            } else {
                bubble.innerHTML = `AI or Real?<br><button class="btn" id="r">Real</button><button class="btn" id="a">AI</button>`;
                bubble.querySelector('#r').onclick = () => vote(bubble, cleanUrl, 'real');
                bubble.querySelector('#a').onclick = () => vote(bubble, cleanUrl, 'ai');
            }
        });
    });
}

function vote(bubble, url, type) {
    bubble.innerHTML = "שולח...";
    chrome.runtime.sendMessage({ action: "fetchData", url: `${SERVER_URL}/vote`, method: 'POST', body: { url, voteType: type } }, () => {
        chrome.storage.local.set({ [url]: type }, () => {
            chrome.runtime.sendMessage({ action: "fetchData", url: `${SERVER_URL}/front?url=${encodeURIComponent(url)}` }, (res) => {
                bubble.innerHTML = `Real: ${res.data.real}% | AI: ${res.data.ai}%`;
            });
        });
    });
}

const observer = new MutationObserver((mutations) => {
    document.querySelectorAll('img').forEach(injectTrustTool);
});
observer.observe(document.body, { childList: true, subtree: true });