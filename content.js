const SERVER_URL = "http://127.0.0.1:3000";

/* ------------------ ANTI DUPLICATE GLOBAL LOCK ------------------ */
const processedImages = new WeakSet();

/* ------------------ URL ------------------ */
function normalizeUrl(imageUrl) {
    try {
        const url = new URL(imageUrl);
        return url.origin + url.pathname;
    } catch {
        return imageUrl;
    }
}

/* ------------------ VALID ------------------ */
function isValidImage(img) {
    return (
        img &&
        img.src &&
        img.src.startsWith('http') &&
        img.naturalWidth > 150 &&
        img.naturalHeight > 150
    );
}

/* ------------------ MAIN ------------------ */
function injectTrustTool(img) {

    if (!isValidImage(img)) return;

    /* 🔥 HARD LOCK: prevents duplicates completely */
    if (img.dataset.injected === "1") return;
    if (processedImages.has(img)) return;

    processedImages.add(img);
    img.dataset.injected = "1";

    const cleanUrl = normalizeUrl(img.src);

    const host = document.createElement('div');
    host.style.position = 'absolute';
    host.style.zIndex = '999999999';
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');

    style.textContent = `
        .bubble {
            font-family: Arial;
            direction: rtl;
            pointer-events: auto;
            background: white;
            border-radius: 16px;
            padding: 14px;
            width: 200px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }

        .top {
            display:flex;
            justify-content:space-between;
            align-items:center;
        }

        .x {
            cursor:pointer;
            border:none;
            background:transparent;
            font-size:16px;
        }

        .btns {
            display:flex;
            gap:8px;
            margin-top:10px;
        }

        .btn {
            flex:1;
            border:none;
            padding:8px;
            border-radius:999px;
            cursor:pointer;
            font-weight:bold;
        }

        .real {
            background:#d4f5dd;
            color:#1b5e20;
        }

        .ai {
            background:#ffd6e0;
            color:#b0003a;
        }

        .results {
            display:none;
            margin-top:10px;
            gap:10px;
            justify-content:center;
        }

        .circle {
            width:60px;
            height:60px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:bold;
            background:#eee;
        }

        .voted .btns {
            display:none;
        }

        .voted .results {
            display:flex;
        }
    `;

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `<span>Loading...</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);
    document.body.appendChild(host);

    /* ---------------- POSITION ---------------- */
    function position() {
        const r = img.getBoundingClientRect();
        host.style.top = window.scrollY + r.top + 10 + 'px';
        host.style.left = window.scrollX + r.left + 10 + 'px';
    }

    position();
    window.addEventListener('scroll', position);
    window.addEventListener('resize', position);

    /* ---------------- FETCH ---------------- */
    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`
    }, (res) => {

        if (!res?.data) {
            bubble.innerHTML = "error";
            return;
        }

        const { real, ai } = res.data;

        chrome.storage.local.get(cleanUrl, (s) => {
            if (s[cleanUrl]) {
                renderResults(real, ai);
            } else {
                renderVote();
            }
        });
    });

    /* ---------------- VOTE UI ---------------- */
    function renderVote() {

        bubble.classList.remove('voted');

        bubble.innerHTML = `
            <div class="top">
                <b>Authenticly</b>
                <button class="x">✕</button>
            </div>

            <div>אמיתי או AI?</div>

            <div class="btns">
                <button class="btn real">Real</button>
                <button class="btn ai">AI</button>
            </div>
        `;

        bubble.querySelector('.real').onclick =
            () => sendVote('real');

        bubble.querySelector('.ai').onclick =
            () => sendVote('ai');

        bubble.querySelector('.x').onclick =
            () => host.remove();
    }

    /* ---------------- RESULTS UI ---------------- */
    function renderResults(real, ai) {

        const total = real + ai || 1;

        const r = Math.round(real / total * 100);
        const a = 100 - r;

        bubble.classList.add('voted');

        bubble.innerHTML = `
            <div class="top">
                <b>Authenticly</b>
                <button class="x">✕</button>
            </div>

            <div class="results">
                <div class="circle" style="background:#c8f7d4">${r}%</div>
                <div class="circle" style="background:#ffd0dc">${a}%</div>
            </div>

            <div style="margin-top:8px">${total} votes</div>
        `;

        bubble.querySelector('.x').onclick =
            () => host.remove();
    }

    /* ---------------- VOTE ---------------- */
    function sendVote(type) {

        chrome.runtime.sendMessage({
            action: "fetchData",
            url: `${SERVER_URL}/vote`,
            method: "POST",
            body: { url: cleanUrl, voteType: type }
        }, (res) => {

            if (!res?.data) return;

            chrome.storage.local.set({ [cleanUrl]: true }, () => {
                renderResults(res.data.real, res.data.ai);
            });
        });
    }
}

/* ---------------- OBSERVER ---------------- */
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