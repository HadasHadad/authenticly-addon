const SERVER_URL = "http://127.0.0.1:3000";

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

/* --------------------------
   FIX: close button working everywhere
-------------------------- */
function attachCloseEvent(host, bubble) {

    const closeBtn = bubble.querySelector('.close-btn');

    if (!closeBtn) return;

    closeBtn.onclick = () => {

        host.style.opacity = '0';
        host.style.transform = 'scale(0.8)';

        setTimeout(() => {
            host.remove();
        }, 200);
    };
}

/* --------------------------
   MAIN INJECT
-------------------------- */
function injectTrustTool(imageElement) {

    if (imageElement.src.startsWith('data:')) return;
    if (!isValidImage(imageElement)) return;

    const cleanUrl = normalizeUrl(imageElement.src);
    const id = generateId(imageElement.src);

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

        const bubbleWidth = 220;

        if (left + bubbleWidth > window.innerWidth) {
            left = window.innerWidth - bubbleWidth - 20;
        }

        host.style.top = top + 'px';
        host.style.left = left + 'px';
    }

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');

    style.textContent = `
    :host {
        direction: rtl;
        font-family: Arial;
    }

    .trust-bubble {
        pointer-events: auto;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(12px);
        padding: 16px;
        border-radius: 22px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        min-width: 180px;
        max-width: 220px;
    }

    .top-bar {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .brand {
        font-weight: 800;
    }

    .close-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 16px;
    }

    .vote-options {
        display: flex;
        gap: 8px;
        width: 100%;
    }

    .btn {
        flex: 1;
        border: none;
        border-radius: 999px;
        padding: 8px;
        cursor: pointer;
        font-weight: 700;
    }

    .btn-real { background:#e8f5e9; }
    .btn-ai { background:#fde7ef; }

    .results {
        display:none;
    }

    .voted .results {
        display:flex;
    }

    .circle {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:800;
        background:#eee;
    }
    `;

    const bubble = document.createElement('div');
    bubble.className = 'trust-bubble';
    bubble.innerHTML = `<span>טוען...</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);

    document.body.appendChild(host);

    setTimeout(() => bubble.classList.add('visible'), 50);

    /* --------------------------
       FETCH DATA
    -------------------------- */
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
                showResultsUI(host, bubble, real, ai);
            } else {
                showVoteUI(host, bubble, cleanUrl);
            }
        });
    });

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    /* --------------------------
       HOVER FIX (NO FLICKER)
    -------------------------- */
    let hideTimeout;

    imageElement.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        host.style.display = 'block';
    });

    imageElement.addEventListener('mouseleave', () => {

        hideTimeout = setTimeout(() => {
            host.style.display = 'none';
        }, 150);
    });

    host.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
    });
}

/* --------------------------
   VOTE UI
-------------------------- */
function showVoteUI(host, bubble, cleanUrl) {

    bubble.innerHTML = `
        <div class="top-bar">
            <span class="brand">Authenticly</span>
            <button class="close-btn">✕</button>
        </div>

        <div>אמיתי או AI?</div>

        <div class="vote-options">
            <button class="btn btn-real">Real</button>
            <button class="btn btn-ai">AI</button>
        </div>
    `;

    bubble.querySelector('.btn-real').onclick =
        () => sendVote(cleanUrl, 'real', host, bubble);

    bubble.querySelector('.btn-ai').onclick =
        () => sendVote(cleanUrl, 'ai', host, bubble);

    attachCloseEvent(host, bubble);
}

/* --------------------------
   RESULTS UI
-------------------------- */
function showResultsUI(host, bubble, real, ai) {

    const total = real + ai || 1;

    const r = Math.round((real / total) * 100);
    const a = 100 - r;

    bubble.innerHTML = `
        <div class="top-bar">
            <span class="brand">Authenticly</span>
            <button class="close-btn">✕</button>
        </div>

        <div style="display:flex; gap:10px;">
            <div class="circle">${r}%</div>
            <div class="circle">${a}%</div>
        </div>

        <div>${total} votes</div>
    `;

    bubble.classList.add('voted');

    attachCloseEvent(host, bubble);
}

/* --------------------------
   SEND VOTE
-------------------------- */
function sendVote(cleanUrl, type, host, bubble) {

    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/vote`,
        method: "POST",
        body: { url: cleanUrl, voteType: type }
    }, (response) => {

        if (!response?.data) return;

        const { real, ai } = response.data;

        chrome.storage.local.set({ [cleanUrl]: true }, () => {
            showResultsUI(host, bubble, real, ai);
        });
    });
}

/* --------------------------
   OBSERVER
-------------------------- */
const observer = new MutationObserver((mutations) => {

    mutations.forEach(m =>
        m.addedNodes.forEach(node => {

            if (node.nodeType !== 1) return;

            if (node.tagName === 'IMG') injectTrustTool(node);

            node.querySelectorAll?.('img')?.forEach(injectTrustTool);
        })
    );
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});