const SERVER_URL = "http://127.0.0.1:3000";

/* =========================
   מניעת כפילויות גלובלית
========================= */
const processedUrls = new Set();

/* =========================
   עזר
========================= */

function normalizeUrl(imageUrl) {
    try {
        const url = new URL(imageUrl);
        return url.origin + url.pathname;
    } catch (e) {
        return imageUrl;
    }
}

function generateId(src) {
    return 'img-btn-' + btoa(encodeURIComponent(src)).replace(/[^a-zA-Z0-9]/g, '');
}

function isValidImage(img) {
    return (
        img.src &&
        img.src.startsWith('http') &&
        img.naturalWidth > 150 &&
        img.naturalHeight > 150
    );
}

/* =========================
   הזרקה ראשית
========================= */

function injectTrustTool(imageElement) {

    if (!imageElement) return;

    if (imageElement.src.startsWith('data:')) return;

    if (!isValidImage(imageElement)) return;

    const cleanUrl = normalizeUrl(imageElement.src);

    if (processedUrls.has(cleanUrl)) return;
    processedUrls.add(cleanUrl);

    if (!imageElement.complete) {
        imageElement.addEventListener('load', () => injectTrustTool(imageElement), { once: true });
        return;
    }

    const id = generateId(cleanUrl);

    if (document.getElementById(id)) return;

    const host = document.createElement('div');
    host.id = id;
    host.className = 'trust-tool-container';
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';

    function updatePosition() {
        const rect = imageElement.getBoundingClientRect();

        let top = rect.top + window.scrollY + 15;
        let left = rect.left + window.scrollX + 15;

        const bubbleWidth = 320;

        if (left + bubbleWidth > window.innerWidth) {
            left = window.innerWidth - bubbleWidth - 20;
        }

        host.style.top = top + 'px';
        host.style.left = left + 'px';
    }

    updatePosition();

    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();

    window.addEventListener('scroll', onScroll);
    window.addEventListener('resize', onResize);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
    :host {
        direction: rtl;
        font-family: Arial, sans-serif;
    }

    .trust-bubble {
        pointer-events: auto;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(12px);
        padding: 18px;
        border-radius: 22px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        transition: all 0.25s ease;
        opacity: 0;
        transform: scale(0.92);
        min-width: 320px;
        max-width: 360px;
        position: relative;
    }

    .trust-bubble.visible {
        opacity: 1;
        transform: scale(1);
    }

    .top-bar {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .brand {
        font-size: 20px;
        font-weight: 800;
        color: #222;
    }

    .close-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 18px;
        color: #666;
    }

    .vote-options {
        display: flex;
        gap: 10px;
        width: 100%;
    }

    .btn {
        flex: 1;
        padding: 12px 18px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        border: none;
    }

    .btn-real { background: #e8f5e9; color: #2e7d32; }
    .btn-ai { background: #fde7ef; color: #c2185b; }

    .circle {
        width: 110px;
        height: 110px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        font-weight: 800;
        background: #eee;
    }

    .vote-count {
        font-size: 15px;
        font-weight: 700;
        color: #777;
    }
    `;

    const bubble = document.createElement('div');
    bubble.className = 'trust-bubble';
    bubble.innerHTML = `<span>טוען...</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);
    document.body.appendChild(host);

    setTimeout(() => bubble.classList.add('visible'), 50);

    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`
    }, (response) => {

        if (!response?.data) {
            bubble.innerHTML = "שגיאת שרת";
            return;
        }

        const { real, ai } = response.data;

        chrome.storage.local.get(cleanUrl, (s) => {

            if (s[cleanUrl]) {
                showResultsUI(bubble, real, ai);
            } else {
                showVoteOptionsUI(bubble, cleanUrl);
            }
        });
    });

    function attachCloseEvent() {
        const btn = bubble.querySelector('.close-btn');
        if (!btn) return;

        btn.onclick = () => {
            bubble.style.opacity = '0';
            bubble.style.transform = 'scale(0.8)';

            setTimeout(() => {
                host.remove();
                processedUrls.delete(cleanUrl);

                window.removeEventListener('scroll', onScroll);
                window.removeEventListener('resize', onResize);
            }, 200);
        };
    }

    function showVoteOptionsUI(bubble, cleanUrl) {
        bubble.innerHTML = `
        <div class="top-bar">
            <span class="brand">Authenticly</span>
            <button class="close-btn">✕</button>
        </div>

        <div class="vote-options">
            <button class="btn btn-real" id="real">Real</button>
            <button class="btn btn-ai" id="ai">AI</button>
        </div>
        `;

        bubble.querySelector('#real').onclick = () => sendVote(cleanUrl, 'real', bubble);
        bubble.querySelector('#ai').onclick = () => sendVote(cleanUrl, 'ai', bubble);

        attachCloseEvent();
    }

    function sendVote(cleanUrl, voteType, bubble) {

        chrome.runtime.sendMessage({
            action: "fetchData",
            url: `${SERVER_URL}/vote`,
            method: "POST",
            body: { url: cleanUrl, voteType }
        }, (response) => {

            if (!response?.data) {
                alert("שגיאה בשליחה!");
                return;
            }

            chrome.storage.local.set({ [cleanUrl]: true }, () => {
                showResultsUI(bubble, response.data.real, response.data.ai);
            });
        });
    }

    function showResultsUI(bubble, real, ai) {

        const total = real + ai;
        const rP = total ? Math.round((real / total) * 100) : 0;
        const aP = 100 - rP;

        bubble.innerHTML = `
        <div class="top-bar">
            <span class="brand">Authenticly</span>
            <button class="close-btn">✕</button>
        </div>

        <div style="display:flex; gap:15px;">
            <div class="circle">${rP}%</div>
            <div class="circle">${aP}%</div>
        </div>

        <div class="vote-count">${total} votes</div>
        `;

        bubble.classList.add('voted');
        attachCloseEvent();
    }
}

/* =========================
   Observer
========================= */

const observer = new MutationObserver((mutations) => {
    mutations.forEach(m =>
        m.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                if (node.tagName === 'IMG') injectTrustTool(node);
                node.querySelectorAll?.('img').forEach(injectTrustTool);
            }
        })
    );
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

/* סריקה ראשונית */
document.querySelectorAll('img').forEach(injectTrustTool);