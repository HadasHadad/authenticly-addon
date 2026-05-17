const SERVER_URL = "http://localhost:3000";

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
        host.style.top = (rect.top + window.scrollY + 15) + 'px';
        host.style.left = (rect.left + window.scrollX + 15) + 'px';
    }

    updatePosition();

    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
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
    `;

    const bubble = document.createElement('div');
    bubble.className = 'trust-bubble';
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
            });
    });
}

function showVoteOptionsUI(bubble, cleanUrl, realPercent, aiPercent) {
    bubble.innerHTML = `
        <div>
            <button class="btn btn-real" id="vote-real">Real</button>
            <button class="btn btn-ai" id="vote-ai">AI</button>
        </div>
    `;

    bubble.querySelector('#vote-real').onclick = () => sendVote(cleanUrl, 'real', bubble);
    bubble.querySelector('#vote-ai').onclick = () => sendVote(cleanUrl, 'ai', bubble);
}

function sendVote(cleanUrl, voteType, bubble) {
    fetch(`${SERVER_URL}/vote`, {
        method: "POST",
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