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

function injectTrustTool(imageElement) {

    if (imageElement.src.startsWith('data:')) return;
    if (!isValidImage(imageElement) || imageElement.dataset.trustInjected) return;

    imageElement.dataset.trustInjected = "true";

    const cleanUrl = normalizeUrl(imageElement.src);
    const id = generateId(imageElement.src);

    const host = document.createElement('div');
    host.id = id;
    host.className = 'trust-tool-container';

    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';

    function updatePosition() {

        const rect = imageElement.getBoundingClientRect();

        let top = rect.top + window.scrollY + 15;
        let left = rect.left + window.scrollX + 15;

        const bubbleWidth = 160;

        if (left + bubbleWidth > window.innerWidth) {
            left = window.innerWidth - bubbleWidth - 20;
        }

        host.style.top = top + 'px';
        host.style.left = left + 'px';
    }

    updatePosition();

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');

    style.textContent = `
    
    :host {
        direction: rtl;
        pointer-events: auto;
        font-family: Arial, sans-serif;
    }

    .trust-bubble {

        background: rgba(255,255,255,0.93);
        backdrop-filter: blur(12px);

        padding: 10px;
        border-radius: 18px;

        box-shadow:
            0 8px 30px rgba(0,0,0,0.18);

        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;

        transition: all 0.25s ease;

        opacity: 0;
        transform: scale(0.92);

        min-width: 110px;
        max-width: 145px;

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
        font-size: 12px;
        font-weight: 800;
        color: #222;
        letter-spacing: 0.3px;
    }

    .close-btn {

        border: none;
        background: transparent;

        cursor: pointer;

        font-size: 14px;
        color: #666;

        padding: 0;

        transition: 0.2s;
    }

    .close-btn:hover {
        color: #111;
        transform: scale(1.1);
    }

    .vote-label {
        font-size: 12px;
        font-weight: 700;
        color: #444;
    }

    .vote-options {
        display: flex;
        gap: 6px;
        width: 100%;
    }

    .btn {

        border: none;
        border-radius: 999px;

        padding: 6px 10px;

        cursor: pointer;

        font-size: 12px;
        font-weight: 700;

        flex: 1;

        transition: 0.2s ease;
    }

    .btn:hover {
        transform: scale(1.04);
    }

    .btn-real {
        background: #e8f5e9;
        color: #2e7d32;
    }

    .btn-ai {
        background: #fde7ef;
        color: #c2185b;
    }

    .results {
        display: none;
        gap: 16px;
    }

    .voted .vote-options,
    .voted .vote-label {
        display: none;
    }

    .voted .results {
        display: flex;
    }

    .result-item {

        display: flex;
        flex-direction: column;
        align-items: center;

        gap: 6px;

        font-size: 12px;
        color: #333;
    }

    .circle {

        width: 56px;
        height: 56px;

        border-radius: 50%;

        display: flex;
        justify-content: center;
        align-items: center;

        font-size: 14px;
        font-weight: 800;

        color: #111;

        background: #eee;

        box-shadow:
            inset 0 0 0 3px rgba(255,255,255,0.6);
    }

    @media (max-width: 600px) {

        .trust-bubble {
            min-width: 100px;
            padding: 8px;
        }

        .circle {
            width: 48px;
            height: 48px;
            font-size: 12px;
        }

        .btn {
            padding: 5px 8px;
            font-size: 11px;
        }
    }

    `;

    const bubble = document.createElement('div');
    bubble.className = 'trust-bubble';

    bubble.innerHTML = `<span class="loading">טוען...</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);

    document.body.appendChild(host);

    setTimeout(() => bubble.classList.add('visible'), 50);

    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`
    }, (response) => {

        if (response && response.data) {

            const { real, ai } = response.data;

            const total = real + ai;

            const realPercent =
                total > 0
                    ? Math.round((real / total) * 100)
                    : 0;

            const aiPercent = 100 - realPercent;

            chrome.storage.local.get(cleanUrl, (s) => {

                if (s[cleanUrl]) {
                    showResultsUI(bubble, realPercent, aiPercent);
                } else {
                    showVoteOptionsUI(
                        bubble,
                        cleanUrl,
                        realPercent,
                        aiPercent
                    );
                }
            });

        } else {

            bubble.innerHTML =
                `<span class="loading">שגיאת שרת</span>`;
        }
    });
}

function attachCloseEvent(bubble) {

    const closeBtn = bubble.querySelector('.close-btn');

    if (!closeBtn) return;

    closeBtn.onclick = () => {

        bubble.style.opacity = '0';
        bubble.style.transform = 'scale(0.8)';

        setTimeout(() => {

            if (bubble.parentElement?.host) {
                bubble.parentElement.host.remove();
            }

        }, 200);
    };
}

function showVoteOptionsUI(
    bubble,
    cleanUrl,
    realPercent,
    aiPercent
) {

    bubble.innerHTML = `

        <div class="top-bar">
            <span class="brand">Authenticly</span>
            <button class="close-btn">✕</button>
        </div>

        <span class="vote-label">אמיתי או AI?</span>

        <div class="vote-options">

            <button
                class="btn btn-real"
                id="vote-real">

                Real

            </button>

            <button
                class="btn btn-ai"
                id="vote-ai">

                AI

            </button>

        </div>

        <div class="results">

            <div class="result-item">

                <div
                    class="circle"
                    id="c-real">

                    ${realPercent}%

                </div>

                Real

            </div>

            <div class="result-item">

                <div
                    class="circle"
                    id="c-ai">

                    ${aiPercent}%

                </div>

                AI

            </div>

        </div>
    `;

    bubble.querySelector('#vote-real').onclick =
        () => sendVote(cleanUrl, 'real', bubble);

    bubble.querySelector('#vote-ai').onclick =
        () => sendVote(cleanUrl, 'ai', bubble);

    attachCloseEvent(bubble);
}

function sendVote(cleanUrl, voteType, bubble) {

    chrome.runtime.sendMessage({

        action: "fetchData",

        url: `${SERVER_URL}/vote`,

        method: "POST",

        body: {
            url: cleanUrl,
            voteType: voteType
        }

    }, (response) => {

        if (response && response.data) {

            chrome.storage.local.set({

                [cleanUrl]: { voted: true }

            }, () => {

                showResultsUI(
                    bubble,
                    response.data.real,
                    response.data.ai
                );
            });

        } else {

            alert("שגיאה בשליחה!");
        }
    });
}

function showResultsUI(bubble, real, ai) {

    const total = real + ai;

    const rP =
        total > 0
            ? Math.round((real / total) * 100)
            : 0;

    const aP = 100 - rP;

    bubble.innerHTML = `

        <div class="top-bar">

            <span class="brand">
                Authenticly
            </span>

            <button class="close-btn">
                ✕
            </button>

        </div>

        <div
            class="results"
            style="display:flex;">

            <div class="result-item">

                <div
                    class="circle"

                    style="
                    background:
                    conic-gradient(
                        #4caf50 ${rP}%,
                        #eee 0
                    );
                    ">

                    ${rP}%

                </div>

                Real

            </div>

            <div class="result-item">

                <div
                    class="circle"

                    style="
                    background:
                    conic-gradient(
                        #f44336 ${aP}%,
                        #eee 0
                    );
                    ">

                    ${aP}%

                </div>

                AI

            </div>

        </div>
    `;

    bubble.classList.add('voted');

    attachCloseEvent(bubble);
}

const observer = new MutationObserver((mutations) => {

    mutations.forEach(m =>

        m.addedNodes.forEach(node => {

            if (node.nodeType === 1) {

                if (node.tagName === 'IMG') {
                    injectTrustTool(node);
                }

                node.querySelectorAll('img')
                    .forEach(injectTrustTool);
            }
        })
    );
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});