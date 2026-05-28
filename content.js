```js
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

    // מונע יצירה כפולה של חלוניות
    if (document.getElementById(id)) return;

    const host = document.createElement('div');
    host.id = id;
    host.className = 'trust-tool-container';

    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';

    // מאפשר ללחוץ על הדף רגיל
    host.style.pointerEvents = 'none';

    function updatePosition() {

        const rect = imageElement.getBoundingClientRect();

        let top = rect.top + 15;
        let left = rect.left + 15;

        const bubbleWidth = 220;

        if (left + bubbleWidth > window.innerWidth) {
            left = window.innerWidth - bubbleWidth - 20;
        }

        if (top < 10) {
            top = 10;
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
        font-family: Arial, sans-serif;
    }

    .trust-bubble {

        pointer-events: auto;

        background: rgba(255,255,255,0.95);

        backdrop-filter: blur(12px);

        padding: 16px;

        border-radius: 22px;

        box-shadow:
            0 8px 30px rgba(0,0,0,0.18);

        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;

        transition: all 0.25s ease;

        opacity: 0;
        transform: scale(0.92);

        min-width: 180px;
        max-width: 220px;

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
        font-size: 14px;
        font-weight: 800;
        color: #222;
        letter-spacing: 0.3px;
    }

    .close-btn {

        border: none;
        background: transparent;

        cursor: pointer;

        font-size: 16px;
        color: #666;

        padding: 0;

        transition: 0.2s;
    }

    .close-btn:hover {
        color: #111;
        transform: scale(1.1);
    }

    .vote-label {
        font-size: 14px;
        font-weight: 700;
        color: #444;
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

        font-size: 13px;
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
        gap: 18px;
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

        gap: 8px;

        font-size: 14px;
        color: #333;
    }

    .circle {

        width: 72px;
        height: 72px;

        border-radius: 50%;

        display: flex;
        justify-content: center;
        align-items: center;

        font-size: 18px;
        font-weight: 800;

        color: #111;

        background: #eee;

        box-shadow:
            inset 0 0 0 3px rgba(255,255,255,0.6);
    }

    .vote-count {
        font-size: 12px;
        color: #777;
        margin-top: 4px;
        font-weight: 600;
    }

    .loading {
        font-size: 14px;
        font-weight: 700;
        color: #444;
    }

    @media (max-width: 600px) {

        .trust-bubble {
            min-width: 160px;
            padding: 12px;
        }

        .circle {
            width: 62px;
            height: 62px;
            font-size: 16px;
        }

        .btn {
            padding: 7px 10px;
            font-size: 12px;
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
                    showResultsUI(bubble, real, ai);
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

            // fake data זמני עד שיהיה DB
            const fakeReal = Math.floor(Math.random() * 40) + 10;
            const fakeAi = Math.floor(Math.random() * 20) + 1;

            showVoteOptionsUI(
                bubble,
                cleanUrl,
                fakeReal,
                fakeAi
            );
        }
    });

    // ניקוי אם התמונה נמחקה מהDOM
    const cleanupObserver = new MutationObserver(() => {
        if (!document.body.contains(imageElement)) {

            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);

            host.remove();

            cleanupObserver.disconnect();
        }
    });

    cleanupObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function attachCloseEvent(bubble) {

    const closeBtn = bubble.querySelector('.close-btn');

    if (!closeBtn) return;

    closeBtn.onclick = () => {

        bubble.style.opacity = '0';
        bubble.style.transform = 'scale(0.8)';

        setTimeout(() => {

            const host = bubble.getRootNode().host;

            if (host) {
                host.remove();
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

    const totalVotes = realPercent + aiPercent;

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

        <div class="vote-count">
            ${totalVotes} votes
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

            // fake results זמני
            const fakeReal = Math.floor(Math.random() * 50) + 10;
            const fakeAi = Math.floor(Math.random() * 30) + 5;

            chrome.storage.local.set({

                [cleanUrl]: { voted: true }

            }, () => {

                showResultsUI(
                    bubble,
                    fakeReal,
                    fakeAi
                );
            });
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

        <div class="vote-count">
            ${total} votes
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

                node.querySelectorAll?.('img')
                    .forEach(injectTrustTool);
            }
        })
    );
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

// טעינה ראשונית של תמונות שכבר קיימות בדף
document.querySelectorAll('img').forEach(injectTrustTool);
```
