const SERVER_URL = "http://127.0.0.1:3000";

let currentHost = null;
let currentImg = null;

/* ---------------- URL ---------------- */
function normalizeUrl(u) {
    try {
        const url = new URL(u);
        return url.origin + url.pathname;
    } catch {
        return u;
    }
}

/* ---------------- VALID IMAGE ---------------- */
function isValid(img) {
    return img && img.src && img.naturalWidth > 150;
}

/* ---------------- OPEN OVERLAY ---------------- */
function openBox(img) {

    if (!isValid(img)) return;

    const url = normalizeUrl(img.src);

    closeBox(); // חשוב: סוגר קודם כל חלון פתוח

    currentImg = img;

    const host = document.createElement('div');
    host.style.position = 'absolute';
    host.style.zIndex = 999999999;
    host.style.pointerEvents = 'none';

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');

    style.textContent = `
        .box {
            font-family: Arial;
            direction: rtl;
            pointer-events:auto;
            background:white;
            padding:14px;
            border-radius:16px;
            width:200px;
            box-shadow:0 10px 30px rgba(0,0,0,0.2);
        }

        .top {
            display:flex;
            justify-content:space-between;
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

        .real { background:#d4f5dd; }
        .ai { background:#ffd6e0; }

        .circle {
            width:60px;
            height:60px;
            border-radius:50%;
            display:flex;
            align-items:center;
            justify-content:center;
            background:#eee;
            font-weight:bold;
        }

        .results { display:none; gap:10px; margin-top:10px; }

        .voted .btns { display:none; }
        .voted .results { display:flex; }
    `;

    const box = document.createElement('div');
    box.className = 'box';

    shadow.appendChild(style);
    shadow.appendChild(box);
    document.body.appendChild(host);

    currentHost = host;

    position();

    window.addEventListener('scroll', position);
    window.addEventListener('resize', position);

    /* -------- UI: VOTE -------- */
    renderVote();

    function renderVote() {
        box.classList.remove('voted');

        box.innerHTML = `
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

        box.querySelector('.real').onclick = () => vote('real');
        box.querySelector('.ai').onclick = () => vote('ai');
        box.querySelector('.x').onclick = closeBox;
    }

    /* -------- UI: RESULTS -------- */
    function renderResults(real, ai) {

        const total = real + ai || 1;
        const r = Math.round(real / total * 100);
        const a = 100 - r;

        box.classList.add('voted');

        box.innerHTML = `
            <div class="top">
                <b>Authenticly</b>
                <button class="x">✕</button>
            </div>

            <div class="results">
                <div class="circle">${r}%</div>
                <div class="circle">${a}%</div>
            </div>

            <div>${total} votes</div>
        `;

        box.querySelector('.x').onclick = closeBox;
    }

    /* -------- VOTE -------- */
    function vote(type) {

        chrome.runtime.sendMessage({
            action: "fetchData",
            url: `${SERVER_URL}/vote`,
            method: "POST",
            body: { url, voteType: type }
        }, (res) => {

            if (!res?.data) return;

            chrome.storage.local.set({ [url]: true }, () => {
                renderResults(res.data.real, res.data.ai);
            });
        });
    }

    /* -------- POSITION -------- */
    function position() {
        const r = img.getBoundingClientRect();
        host.style.top = window.scrollY + r.top + 10 + 'px';
        host.style.left = window.scrollX + r.left + 10 + 'px';
    }
}

/* ---------------- CLOSE ---------------- */
function closeBox() {
    if (currentHost) currentHost.remove();
    currentHost = null;
    currentImg = null;
}

/* ---------------- CLICK ON IMAGE ---------------- */
document.addEventListener('click', (e) => {

    const img = e.target;

    if (!img || img.tagName !== 'IMG') return;

    openBox(img);
});