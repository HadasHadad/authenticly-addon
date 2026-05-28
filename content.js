const SERVER_URL = "http://127.0.0.1:3000";

/* -------------------------
   מניעת כפילויות גלובלית
------------------------- */
const injected = new Map(); // img -> host

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

/* -------------------------
   inject main
------------------------- */
function injectTrustTool(imageElement) {

    if (imageElement.src.startsWith('data:')) return;
    if (!isValidImage(imageElement)) return;

    const cleanUrl = normalizeUrl(imageElement.src);

    const id = generateId(imageElement.src);

    // 🔥 אם כבר יש בועה לתמונה הזו → לא ליצור שוב
    if (injected.has(imageElement)) return;

    // אם כבר קיים DOM כזה → לא ליצור שוב
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
        font-family: Arial, sans-serif;
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
        transition: all 0.25s ease;
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
        font-size: 14px;
        font-weight: 800;
        color: #222;
    }

    .close-btn {
        border: none;
        background: transparent;
        cursor: pointer;
        font-size: 16px;
        color: #666;
    }

    .vote-options {
        display: flex;
        gap: 8px;
        width: 100%;
    }

    .btn {
        border: none;
        border-radius: 999px;
        padding: 8px 12px;
        cursor: pointer;
        flex: 1;
        font-weight: 700;
    }

    .btn-real { background:#e8f5e9; }
    .btn-ai { background:#fde7ef; }

    .circle {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        display:flex;
        justify-content:center;
        align-items:center;
        font-weight:800;
        background:#eee;
    }

    .results {
        display:none;
        gap: 18px;
    }

    .voted .results {
        display:flex;
    }
    `;

    const bubble = document.createElement('div');
    bubble.className = 'trust-bubble';
    bubble.innerHTML = `<span>טוען...</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);

    /* -------------------------
       Hover logic (כאן התיקון החשוב)
    ------------------------- */

    function show() {

        // 🔥 רק אחד פעיל בכל רגע
        if (window.__activeHost && window.__activeHost !== host) {
            window.__activeHost.remove();
            injected.delete(window.__activeImg);
        }

        window.__activeHost = host;
        window.__activeImg = imageElement;

        document.body.appendChild(host);

        injected.set(imageElement, host);

        updatePosition();
        window.addEventListener('scroll', updatePosition);
        window.addEventListener('resize', updatePosition);

        chrome.runtime.sendMessage({
            action: "fetchData",
            url: `${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`
        }, (response) => {

            if (!response?.data) {
                bubble.innerHTML = `<span>שגיאת שרת</span>`;
                return;
            }

            const { real, ai } = response.data;

            const total = real + ai || 1;

            const rP = Math.round((real / total) * 100);
            const aP = 100 - rP;

            bubble.innerHTML = `
                <div class="top-bar">
                    <span class="brand">Authenticly</span>
                    <button class="close-btn">✕</button>
                </div>

                <div style="display:flex; gap:10px;">
                    <div class="circle">${rP}% Real</div>
                    <div class="circle">${aP}% AI</div>
                </div>
            `;

            bubble.querySelector('.close-btn').onclick = () => {
                host.remove();
                injected.delete(imageElement);
            };
        });
    }

    function hide() {
        host.remove();
        injected.delete(imageElement);
    }

    imageElement.addEventListener('mouseenter', show);
    imageElement.addEventListener('mouseleave', hide);
}

/* -------------------------
   observer
------------------------- */
const observer = new MutationObserver((mutations) => {

    mutations.forEach(m =>
        m.addedNodes.forEach(node => {

            if (node.nodeType === 1) {

                if (node.tagName === 'IMG') {
                    injectTrustTool(node);
                }

                node.querySelectorAll?.('img')?.forEach(injectTrustTool);
            }
        })
    );
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});