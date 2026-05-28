const SERVER_URL = "http://127.0.0.1:3000";

const injected = new WeakMap();

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

/* ---------------------------
   CREATE / GET SINGLE BUBBLE
---------------------------- */

function getHost(imageElement) {

    if (injected.has(imageElement)) {
        return injected.get(imageElement);
    }

    const host = document.createElement('div');

    host.style.position = 'absolute';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');

    style.textContent = `
    :host { font-family: Arial; direction: rtl; }

    .box {
        pointer-events: auto;
        background: white;
        border-radius: 18px;
        padding: 14px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.2);
        width: 200px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .top {
        display:flex;
        justify-content:space-between;
        font-weight:800;
    }

    .btns {
        display:flex;
        gap:8px;
    }

    button {
        flex:1;
        border:none;
        border-radius:999px;
        padding:6px;
        cursor:pointer;
        font-weight:700;
    }

    .real { background:#e8f5e9; }
    .ai { background:#fde7ef; }

    .circle {
        width:70px;
        height:70px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:800;
        background:#eee;
    }

    .stats {
        display:flex;
        justify-content:space-around;
        font-size:12px;
    }
    `;

    const box = document.createElement('div');
    box.className = 'box';
    box.innerHTML = `<div>Loading...</div>`;

    shadow.appendChild(style);
    shadow.appendChild(box);

    host._box = box;
    document.body.appendChild(host);

    injected.set(imageElement, host);

    return host;
}

/* ---------------------------
   POSITION
---------------------------- */

function position(host, img) {

    const rect = img.getBoundingClientRect();

    host.style.top = (rect.top + window.scrollY + 10) + 'px';
    host.style.left = (rect.left + window.scrollX + 10) + 'px';
}

/* ---------------------------
   LOAD DATA
---------------------------- */

function loadStats(cleanUrl, box) {

    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`
    }, (res) => {

        if (!res?.data) {
            box.innerHTML = "Error";
            return;
        }

        const { real, ai, totalVotes = real + ai } = res.data;

        const r = Math.round((real / (real + ai || 1)) * 100);
        const a = 100 - r;

        renderResults(box, cleanUrl, r, a, totalVotes);
    });
}

/* ---------------------------
   RENDER VOTE UI
---------------------------- */

function renderVote(box, cleanUrl) {

    box.innerHTML = `
        <div class="top">
            <span>Authenticly</span>
        </div>

        <div>אמיתי או AI?</div>

        <div class="btns">
            <button class="real">Real</button>
            <button class="ai">AI</button>
        </div>
    `;

    box.querySelector('.real').onclick =
        () => sendVote(cleanUrl, 'real', box);

    box.querySelector('.ai').onclick =
        () => sendVote(cleanUrl, 'ai', box);
}

/* ---------------------------
   RENDER RESULTS
---------------------------- */

function renderResults(box, cleanUrl, r, a, total) {

    box.innerHTML = `
        <div class="top">
            <span>Authenticly</span>
        </div>

        <div style="display:flex; gap:10px; justify-content:center;">
            <div class="circle">${r}%</div>
            <div class="circle">${a}%</div>
        </div>

        <div class="stats">
            <span>Real ${r}%</span>
            <span>AI ${a}%</span>
        </div>

        <div class="stats">
            <span>${total} votes</span>
        </div>
    `;
}

/* ---------------------------
   VOTE
---------------------------- */

function sendVote(cleanUrl, type, box) {

    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/vote`,
        method: "POST",
        body: { url: cleanUrl, voteType: type }
    }, (res) => {

        if (!res?.data) return;

        const { real, ai } = res.data;

        const r = Math.round((real / (real + ai || 1)) * 100);
        const a = 100 - r;

        renderResults(box, cleanUrl, r, a, real + ai);
    });
}

/* ---------------------------
   MAIN INJECT
---------------------------- */

function inject(imageElement) {

    if (!isValidImage(imageElement)) return;

    const cleanUrl = normalizeUrl(imageElement.src);

    const host = getHost(imageElement);

    const box = host._box;

    const update = () => position(host, imageElement);

    update();

    window.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    imageElement.addEventListener('mouseenter', () => {

        host.style.display = 'block';

        position(host, imageElement);

        renderVote(box, cleanUrl);
    });

    imageElement.addEventListener('mouseleave', () => {

        host.style.display = 'none';
    });
}

/* ---------------------------
   OBSERVER
---------------------------- */

const observer = new MutationObserver((mutations) => {

    mutations.forEach(m =>
        m.addedNodes.forEach(node => {

            if (node.nodeType !== 1) return;

            if (node.tagName === 'IMG') inject(node);

            node.querySelectorAll?.('img')?.forEach(inject);
        })
    );
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
