const SERVER_URL = "http://127.0.0.1:3000";

let activeImage = null;
let host = null;
let bubble = null;

function normalizeUrl(imageUrl) {
    try {
        const url = new URL(imageUrl);
        return url.origin + url.pathname;
    } catch (e) {
        return imageUrl;
    }
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
   יצירת UI אחד בלבד
-------------------------- */

function createBubble() {

    host = document.createElement('div');
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';

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
        gap: 10px;
        min-width: 180px;
        max-width: 220px;
    }

    .top-bar {
        width: 100%;
        display: flex;
        justify-content: space-between;
    }

    .brand {
        font-weight: 800;
    }

    .btn {
        flex: 1;
        border-radius: 999px;
        padding: 6px;
        border: none;
        cursor: pointer;
    }

    .btn-real { background:#e8f5e9; }
    .btn-ai { background:#fde7ef; }

    .circle {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#eee;
        font-weight:800;
    }
    `;

    bubble = document.createElement('div');
    bubble.className = 'trust-bubble';
    bubble.innerHTML = `<span>Hover image</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);
    document.body.appendChild(host);
}

/* --------------------------
   מיקום ליד תמונה
-------------------------- */

function moveToImage(img) {

    const rect = img.getBoundingClientRect();

    host.style.top = (rect.top + window.scrollY + 10) + 'px';
    host.style.left = (rect.left + window.scrollX + 10) + 'px';
}

/* --------------------------
   טעינת דאטה
-------------------------- */

function loadData(url) {

    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/front?url=${encodeURIComponent(url)}`
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
            </div>

            <div style="display:flex; gap:10px;">
                <div class="circle">${rP}% Real</div>
                <div class="circle">${aP}% AI</div>
            </div>
        `;
    });
}

/* --------------------------
   hover logic
-------------------------- */

function attachHover(img) {

    img.addEventListener('mouseenter', () => {

        if (!isValidImage(img)) return;

        activeImage = img;

        if (!host) createBubble();

        host.style.display = 'block';

        moveToImage(img);

        const cleanUrl = normalizeUrl(img.src);

        loadData(cleanUrl);
    });

    img.addEventListener('mousemove', () => {
        if (activeImage === img) {
            moveToImage(img);
        }
    });

    img.addEventListener('mouseleave', () => {

        activeImage = null;

        if (host) {
            host.style.display = 'none';
        }
    });
}

/* --------------------------
   init
-------------------------- */

function init() {

    document.querySelectorAll('img').forEach(attachHover);

    const observer = new MutationObserver(mutations => {

        mutations.forEach(m => {

            m.addedNodes.forEach(node => {

                if (node.nodeType !== 1) return;

                if (node.tagName === 'IMG') {
                    attachHover(node);
                }

                node.querySelectorAll?.('img')?.forEach(attachHover);
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

init();