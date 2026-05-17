// ===== AI Image Scanner Extension - Content Script (FIXED FLOATING OVERLAY) =====

const SERVER_URL = "http://localhost:3000";

// פונקציית עזר לניקוי ה-URL
function normalizeUrl(imageUrl) {
    try {
        const url = new URL(imageUrl);
        return url.origin + url.pathname;
    } catch (e) {
        return imageUrl;
    }
}

// יצירת מפתח ייחודי לאלמנט
function generateId(src) {
    return 'img-btn-' + btoa(encodeURIComponent(src)).replace(/[^a-zA-Z0-9]/g, '');
}

// בדיקה אם התמונה רלוונטית לסריקה
function isValidImage(img) {
    return (
        img.src &&
        img.src.startsWith('http') &&
        img.naturalWidth > 150 &&
        img.naturalHeight > 150
    );
}

// פונקציה שמזריקה את הבועה המעוצבת ישירות ל-Body וממקמת אותה מעל התמונה
function injectTrustTool(imageElement) {
    if (!isValidImage(imageElement) || imageElement.dataset.trustInjected) return;
    imageElement.dataset.trustInjected = "true";

    const cleanUrl = normalizeUrl(imageElement.src);
    const id = generateId(imageElement.src);

    // יצירת המארח של ה-Shadow DOM כאלמנט צף מוחלט במסך
    const host = document.createElement('div');
    host.id = id;
    host.className = 'trust-tool-container';
    host.style.position = 'absolute';
    host.style.zIndex = '2147483647'; // ה-Z-Index הכי גבוה האפשרי בדפדפן
    
    // פונקציה לעדכון המיקום הפיזי של הבועה ביחס לתמונה
    function updatePosition() {
        const rect = imageElement.getBoundingClientRect();
        // חישוב המיקום כולל הגלילה של העמוד
        host.style.top = (rect.top + window.scrollY + 15) + 'px';
        host.style.left = (rect.left + window.scrollX + 15) + 'px';
    }

    // מיקום ראשוני
    updatePosition();

    const shadow = host.attachShadow({ mode: 'open' });

    // ה-CSS של המעצב (חניך 7)
    const style = document.createElement('style');
    style.textContent = `
        :host { direction: rtl; pointer-events: auto; }
        .trust-bubble {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            padding: 12px 16px;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.4);
            opacity: 0;
            transform: scale(0.9);
            min-width: 140px;
        }
        .trust-bubble.visible { opacity: 1; transform: scale(1); }
        .vote-label { font-size: 13px; font-weight: bold; color: #222; margin-bottom: 4px; }
        .vote-options { display: flex; gap: 8px; }
        .btn { 
            background: #eee; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 12px; 
            cursor: pointer; 
            font-weight: 800; 
            font-size: 13px; 
            transition: all 0.2s ease; 
            user-select: none;
        }
        .btn:hover { transform: scale(1.08); }
        .btn-real { background: #e8f5e9; color: #2e7d32; }
        .btn-ai { background: #fce4ec; color: #c2185b; }
        .results { display: none; gap: 15px; opacity: 0; transition: all 0.3s ease; }
        .voted .vote-options, .voted .vote-label { display: none; }
        .voted .results { display: flex; opacity: 1; }
        .result-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .circle { width: 48px; height: 48px; border-radius: 50%; display: flex; justify-content: center; align-items: center; background: #eee; position: relative; }
        .circle::after { content: ""; position: absolute; width: 38px; height: 38px; background: white; border-radius: 50%; }
        .percent { position: relative; z-index: 1; font-size: 12px; font-weight: 900; }
        .res-name { font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; }
        .loading { font-size: 12px; color: #666; font-family: Arial; }
    `;

    const bubble = document.createElement('div');
    bubble.className = 'trust-bubble';
    bubble.innerHTML = `<span class="loading">טוען...</span>`;

    shadow.appendChild(style);
    shadow.appendChild(bubble);

    // הזרקה ישירות לתוך ה-BODY (מחוץ לכל הלינקים והאלמנטים המשבשים של האתר)
    document.body.appendChild(host);

    setTimeout(() => bubble.classList.add('visible'), 50);

    // עדכון מיקום מחדש אם חלון הדפדפן משתנה
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    // שלב א': בדיקה ב-Storage המקומי
    chrome.storage.local.get(cleanUrl, (storageResult) => {
        const hasVotedLocally = !!storageResult[cleanUrl];

        // שלב ב': משיכת הנתונים מהשרת
        fetch(`${SERVER_URL}/front?url=${encodeURIComponent(cleanUrl)}`)
            .then(res => res.json())
            .then(serverData => {
                const total = (serverData.real || 0) + (serverData.ai || 0);
                let realPercent = 0;
                let aiPercent = 0;

                if (total > 0) {
                    realPercent = Math.round((serverData.real / total) * 100);
                    aiPercent = 100 - realPercent;
                }

                if (hasVotedLocally) {
                    showResultsUI(bubble, realPercent, aiPercent);
                } else {
                    showVoteOptionsUI(bubble, cleanUrl, realPercent, aiPercent);
                }
            })
            .catch(err => {
                console.error("Error fetching stats:", err);
                bubble.innerHTML = `<span class="loading">שגיאה בשרת</span>`;
            });
    });
}

// הצגת כפתורי הצבעה
function showVoteOptionsUI(bubble, cleanUrl, realPercent, aiPercent) {
    bubble.innerHTML = `
        <span class="vote-label">האם התמונה אמיתית?</span>
        <div class="vote-options">
            <button class="btn btn-real" id="vote-real">Real</button>
            <button class="btn btn-ai" id="vote-ai">AI</button>
        </div>
        <div class="results">
            <div class="result-item">
                <div class="circle" id="c-real"><span class="percent" id="t-real">0%</span></div>
                <span class="res-name">Real</span>
            </div>
            <div class="result-item">
                <div class="circle" id="c-ai"><span class="percent" id="t-ai">0%</span></div>
                <span class="res-name">AI</span>
            </div>
        </div>
    `;

    // ביטול מוחלט של בעבוע האירועים מעבר לבועה שלנו
    bubble.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    bubble.querySelector('#vote-real').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendVote(cleanUrl, 'real', bubble);
    });

    bubble.querySelector('#vote-ai').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendVote(cleanUrl, 'ai', bubble);
    });
}

// שליחת הצבעה לשרת
function sendVote(cleanUrl, voteType, bubble) {
    fetch(`${SERVER_URL}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl, voteType: voteType })
    })
    .then(res => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
    })
    .then(updatedData => {
        const total = (updatedData.real || 0) + (updatedData.ai || 0);
        const realPercent = total > 0 ? Math.round((updatedData.real / total) * 100) : 0;
        const aiPercent = 100 - realPercent;

        chrome.storage.local.set({ [cleanUrl]: { voted: true } }, () => {
            showResultsUI(bubble, realPercent, aiPercent);
        });
    })
    .catch(err => {
        console.error("Error sending vote:", err);
        alert("שגיאה בשליחת ההצבעה!");
    });
}

// הצגת הגרפים המעוצבים
function showResultsUI(bubble, realPercent, aiPercent) {
    if (bubble.querySelector('.results')) {
        bubble.querySelector('#t-real').innerText = realPercent + '%';
        bubble.querySelector('#t-ai').innerText = aiPercent + '%';
        bubble.querySelector('#c-real').style.background = `conic-gradient(#4caf50 ${realPercent}%, #eee 0)`;
        bubble.querySelector('#c-ai').style.background = `conic-gradient(#f44336 ${aiPercent}%, #eee 0)`;
        bubble.classList.add('voted');
    } else {
        bubble.innerHTML = `
            <div class="results" style="display: flex; opacity: 1;">
                <div class="result-item">
                    <div class="circle" id="c-real" style="background: conic-gradient(#4caf50 ${realPercent}%, #eee 0)"><span class="percent">${realPercent}%</span></div>
                    <span class="res-name">Real</span>
                </div>
                <div class="result-item">
                    <div class="circle" id="c-ai" style="background: conic-gradient(#f44336 ${aiPercent}%, #eee 0)"><span class="percent">${aiPercent}%</span></div>
                    <span class="res-name">AI</span>
                </div>
            </div>
        `;
    }
}

// סורק התמונות
function scanImages() {
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
        if (img.complete) {
            injectTrustTool(img);
        } else {
            img.onload = () => injectTrustTool(img);
        }
    });
}

// המעקב אחרי שינויים בדף
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.tagName === 'IMG') {
                if (node.complete) injectTrustTool(node);
                else node.onload = () => injectTrustTool(node);
            }
            const images = node.querySelectorAll('img');
            images.forEach((img) => {
                if (img.complete) injectTrustTool(img);
                else img.onload = () => injectTrustTool(img);
            });
        });
    });
});

observer.observe(document.body, { childList: true, subtree: true });
scanImages();