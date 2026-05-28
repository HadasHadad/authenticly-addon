const SERVER_URL = "http://127.0.0.1:3000";

/* ---------------- SINGLE GLOBAL OVERLAY ---------------- */
let activeImg = null;

const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.zIndex = '999999999';
overlay.style.pointerEvents = 'none';

const shadow = overlay.attachShadow({ mode: 'open' });

shadow.innerHTML = `
<style>
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
</style>

<div class="bubble" id="box">
    <span>hover image</span>
</div>
`;

document.body.appendChild(overlay);

const box = shadow.getElementById('box');

/* ---------------- POSITION ---------------- */
function move(img) {
    const r = img.getBoundingClientRect();
    overlay.style.top = window.scrollY + r.top + 10 + 'px';
    overlay.style.left = window.scrollX + r.left + 10 + 'px';
}

/* ---------------- FETCH ---------------- */
async function load(img) {

    const url = normalizeUrl(img.src);

    const res = await chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/front?url=${encodeURIComponent(url)}`
    });

    return res?.data || { real: 0, ai: 0 };
}

/* ---------------- NORMALIZE ---------------- */
function normalizeUrl(u) {
    try {
        const url = new URL(u);
        return url.origin + url.pathname;
    } catch {
        return u;
    }
}

/* ---------------- HOVER SYSTEM ---------------- */
document.addEventListener('mouseover', async (e) => {

    const img = e.target;

    if (!img || img.tagName !== 'IMG') return;
    if (img.naturalWidth < 150) return;

    activeImg = img;

    overlay.style.display = 'block';
    move(img);

    const { real, ai } = await load(img);

    const total = real + ai || 1;
    const r = Math.round(real / total * 100);
    const a = 100 - r;

    box.innerHTML = `
        <div class="top">
            <b>Authenticly</b>
            <button onclick="this.parentElement.parentElement.remove()">✕</button>
        </div>

        <div style="display:flex; gap:10px; justify-content:center; margin-top:10px;">
            <div class="circle">${r}%</div>
            <div class="circle">${a}%</div>
        </div>

        <div style="margin-top:8px">${total} votes</div>
    `;
});

document.addEventListener('mousemove', (e) => {
    if (!activeImg) return;
    move(activeImg);
});