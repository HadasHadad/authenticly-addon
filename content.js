const SERVER_URL = "http://127.0.0.1:3000";

let activeHost = null;
let positionHandler = null;

/* ---------------- URL ---------------- */
function normalizeUrl(url) {
    try {
        const u = new URL(url);
        return u.origin + u.pathname;
    } catch {
        return url;
    }
}

/* ---------------- VALID IMAGE ---------------- */
function isValid(img) {
    return img && img.tagName === "IMG" && img.src && img.naturalWidth > 100;
}

/* ---------------- CLOSE ---------------- */
function closeBox() {

    if (activeHost) {
        activeHost.remove();
        activeHost = null;
    }

    if (positionHandler) {
        window.removeEventListener("scroll", positionHandler);
        window.removeEventListener("resize", positionHandler);
        positionHandler = null;
    }
}

/* ---------------- OPEN ---------------- */
function openBox(img) {

    if (!isValid(img)) return;

    closeBox();

    const url = normalizeUrl(img.src);

    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.zIndex = "999999999";
    host.style.pointerEvents = "none";

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
        .box {
            font-family: Arial;
            direction: rtl;
            background: white;
            border-radius: 14px;
            padding: 12px;
            width: 200px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            pointer-events: auto;
        }

        .top {
            display:flex;
            justify-content:space-between;
            margin-bottom:8px;
        }

        .x {
            cursor:pointer;
            border:none;
            background:transparent;
        }

        .btns {
            display:flex;
            gap:8px;
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
        }

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

        .voted .btns { display:none; }
        .voted .results { display:flex; }
    `;

    const box = document.createElement("div");
    box.className = "box";

    shadow.appendChild(style);
    shadow.appendChild(box);
    document.body.appendChild(host);

    activeHost = host;

    /* ---------------- POSITION (SAFE SINGLE HANDLER) ---------------- */
    function position() {
        const r = img.getBoundingClientRect();
        host.style.top = window.scrollY + r.top + 10 + "px";
        host.style.left = window.scrollX + r.left + 10 + "px";
    }

    position();

    positionHandler = position;
    window.addEventListener("scroll", positionHandler);
    window.addEventListener("resize", positionHandler);

    renderVote();

    /* ---------------- VOTE UI ---------------- */
    function renderVote() {

        box.classList.remove("voted");

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

        box.querySelector(".real").onclick = () => vote("real");
        box.querySelector(".ai").onclick = () => vote("ai");
        box.querySelector(".x").onclick = closeBox;
    }

    /* ---------------- RESULTS ---------------- */
    function renderResults(real, ai) {

        const total = real + ai || 1;
        const r = Math.round((real / total) * 100);
        const a = 100 - r;

        box.classList.add("voted");

        box.innerHTML = `
            <div class="top">
                <b>Authenticly</b>
                <button class="x">✕</button>
            </div>

            <div class="results">
                <div class="circle">${r}%</div>
                <div class="circle">${a}%</div>
            </div>

            <div style="margin-top:8px;font-size:12px;">
                ${total} votes
            </div>
        `;

        box.querySelector(".x").onclick = closeBox;
    }

    /* ---------------- VOTE ---------------- */
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
}

/* ---------------- CLICK ---------------- */
document.addEventListener("click", (e) => {
    const img = e.target.closest("img");
    if (!img) return;
    openBox(img);
});