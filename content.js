<<<<<<< HEAD
const SERVER_URL = "http://localhost:3000";
=======
// ===== AI Image Scanner Extension - Content Script (FIXED FOR YNET & CSP) =====

const SERVER_URL = "http://127.0.0.1:3000";
>>>>>>> main

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

<<<<<<< HEAD
=======
// פונקציה שמזריקה את הבועה
>>>>>>> main
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
<<<<<<< HEAD

=======
    
>>>>>>> main
    function updatePosition() {
        const rect = imageElement.getBoundingClientRect();
        host.style.top = (rect.top + window.scrollY + 15) + 'px';
        host.style.left = (rect.left + window.scrollX + 15) + 'px';
    }
<<<<<<< HEAD

=======
>>>>>>> main
    updatePosition();
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
<<<<<<< HEAD
        :host { direction: rtl; }
        .trust-bubble {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            padding: 12px 16px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            border: 1px solid rgba(255,255,255,0.4);
            min-width: 140px;
        }
        .btn { background:#eee; border:none; padding:8px 16px; border-radius:12px; cursor:pointer; }
        .btn-real { background:#e8f5e9; color:#2e7d32; }
        .btn-ai { background:#fce4ec; color:#c2185b; }
        .results { display:flex; gap:15px; }
        .circle { width:48px; height:48px; border-radius:50%; display:flex; align-items:center; justify-content:center; }
        .percent { font-size:12px; font-weight:bold; }
        .res-name { font-size:10px; }
=======
        :host { direction: rtl; pointer-events: auto; }
        .trust-bubble { background: rgba(255, 255, 255, 0.95); padding: 12px 16px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); display: flex; flex-direction: column; align-items: center; gap: 10px; transition: all 0.3s ease; opacity: 0; transform: scale(0.9); min-width: 140px; }
        .trust-bubble.visible { opacity: 1; transform: scale(1); }
        .vote-label { font-size: 13px; font-weight: bold; color: #222; }
        .vote-options { display: flex; gap: 8px; }
        .btn { background: #eee; border: none; padding: 8px 16px; border-radius: 12px; cursor: pointer; font-weight: 800; font-size: 13px; }
        .btn-real { background: #e8f5e9; color: #2e7d32; }
        .btn-ai { background: #fce4ec; color: #c2185b; }
        .results { display: none; gap: 15px; }
        .voted .vote-options, .voted .vote-label { display: none; }
        .voted .results { display: flex; }
        .result-item { display: flex; flex-direction: column; align-items: center; }
        .circle { width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: #eee; font-size: 10px; font-weight: bold; }
>>>>>>> main
    `;

    const bubble = document.createElement('div');
    bubble.className = 'trust-bubble';
<<<<<<< HEAD
    bubble.innerHTML = `<span>טוען...</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);

    document.body.appendChild(host);

    chrome.storage.local.get(cleanUrl, (storageResult) => {
        const hasVotedLocally = !!storageResult[cleanUrl];

        fetch(`${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`)
            .then(res => res.json())
            .then(serverData => {

                const total = (serverData.real || 0) + (serverData.ai || 0);
                const confidenceLevel = serverData.confidenceLevel;

                let realPercent = 0;
                let aiPercent = 0;

                if (total > 0) {
                    realPercent = Math.round((serverData.real / total) * 100);
                    aiPercent = 100 - realPercent;
                }

                if (hasVotedLocally) {
                    showResultsUI(bubble, realPercent, aiPercent, confidenceLevel);
                } else {
                    showVoteOptionsUI(bubble, cleanUrl, realPercent, aiPercent);
                }
=======
    bubble.innerHTML = `<span class="loading">טוען...</span>`;
    shadow.appendChild(style);
    shadow.appendChild(bubble);
    document.body.appendChild(host);
    setTimeout(() => bubble.classList.add('visible'), 50);

    // קריאה דרך ה-Background Script במקום fetch ישיר
    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`
    }, (response) => {
        if (response && response.data) {
            const { real, ai } = response.data;
            const total = real + ai;
            const realPercent = total > 0 ? Math.round((real / total) * 100) : 0;
            const aiPercent = 100 - realPercent;
            
            chrome.storage.local.get(cleanUrl, (s) => {
                if (s[cleanUrl]) showResultsUI(bubble, realPercent, aiPercent);
                else showVoteOptionsUI(bubble, cleanUrl, realPercent, aiPercent);
>>>>>>> main
            });
        } else {
            bubble.innerHTML = `<span class="loading">שגיאת שרת</span>`;
        }
    });
}

function showVoteOptionsUI(bubble, cleanUrl, realPercent, aiPercent) {
    bubble.innerHTML = `
<<<<<<< HEAD
        <div>
            <button class="btn btn-real" id="vote-real">Real</button>
            <button class="btn btn-ai" id="vote-ai">AI</button>
        </div>
    `;

=======
        <span class="vote-label">אמיתי או AI?</span>
        <div class="vote-options">
            <button class="btn btn-real" id="vote-real">Real</button>
            <button class="btn btn-ai" id="vote-ai">AI</button>
        </div>
        <div class="results">
            <div class="result-item"><div class="circle" id="c-real">${realPercent}%</div>Real</div>
            <div class="result-item"><div class="circle" id="c-ai">${aiPercent}%</div>AI</div>
        </div>
    `;
>>>>>>> main
    bubble.querySelector('#vote-real').onclick = () => sendVote(cleanUrl, 'real', bubble);
    bubble.querySelector('#vote-ai').onclick = () => sendVote(cleanUrl, 'ai', bubble);
}

<<<<<<< HEAD
=======
// שליחת הצבעה דרך ה-Background
>>>>>>> main
function sendVote(cleanUrl, voteType, bubble) {
    chrome.runtime.sendMessage({
        action: "fetchData",
        url: `${SERVER_URL}/vote`,
        method: "POST",
<<<<<<< HEAD
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl, voteType })
    })
    .then(res => res.json())
    .then(updatedData => {

        const total = (updatedData.real || 0) + (updatedData.ai || 0);
        const realPercent = total ? Math.round((updatedData.real / total) * 100) : 0;
        const aiPercent = 100 - realPercent;

        chrome.storage.local.set({ [cleanUrl]: true });

        showResultsUI(bubble, realPercent, aiPercent, updatedData.confidenceLevel);
    });
}

function showResultsUI(bubble, realPercent, aiPercent, confidenceLevel) {

    let confidenceHTML = '';

    if (confidenceLevel === 'low') {
        confidenceHTML = `<div style="color:gray;font-size:11px;">אמינות נמוכה</div>`;
    }

    if (confidenceLevel === 'high') {
        confidenceHTML = `<div style="color:green;font-size:11px;font-weight:bold;">✓ אמינות גבוהה</div>`;
    }

    if (aiPercent > realPercent) {
        bubble.style.border = '3px solid darkred';
    } else {
        bubble.style.border = '3px solid green';
    }

    bubble.innerHTML = `
        <div class="results">
            <div>
                <div>${realPercent}%</div>
                <div>Real</div>
            </div>

            <div>
                <div>${aiPercent}%</div>
                <div>AI</div>
            </div>
        </div>

        ${confidenceHTML}
    `;
}

function scanImages() {
    document.querySelectorAll('img').forEach(img => {
        if (img.complete) injectTrustTool(img);
        else img.onload = () => injectTrustTool(img);
    });
}

const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
        m.addedNodes.forEach(node => {
            if (node.tagName === 'IMG') injectTrustTool(node);
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });

scanImages();
=======
        body: { url: cleanUrl, voteType: voteType }
    }, (response) => {
        if (response && response.data) {
            chrome.storage.local.set({ [cleanUrl]: { voted: true } }, () => showResultsUI(bubble, response.data.real, response.data.ai));
        } else {
            alert("שגיאה בשליחה!");
        }
    });
}

// הצגת הגרפים
function showResultsUI(bubble, real, ai) {
    const total = real + ai;
    const rP = total > 0 ? Math.round((real / total) * 100) : 0;
    const aP = 100 - rP;
    bubble.innerHTML = `
        <div class="results" style="display: flex;">
            <div class="result-item"><div class="circle" style="background:conic-gradient(#4caf50 ${rP}%, #eee 0)">${rP}%</div>Real</div>
            <div class="result-item"><div class="circle" style="background:conic-gradient(#f44336 ${aP}%, #eee 0)">${aP}%</div>AI</div>
        </div>
    `;
    bubble.classList.add('voted');
}

// סריקה והתחלה
const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
            if (node.tagName === 'IMG') injectTrustTool(node);
            node.querySelectorAll('img').forEach(injectTrustTool);
        }
    }));
});
observer.observe(document.body, { childList: true, subtree: true });
>>>>>>> main
