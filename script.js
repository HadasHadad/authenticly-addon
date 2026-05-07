(function() {
    // 1. הגדרת הפונקציה המרכזית להזרקה
    function injectTrustTool(imageElement) {
        if (!imageElement || imageElement.dataset.trustInjected) return;
        imageElement.dataset.trustInjected = "true";

        // יצירת אלמנט "מארח" (Host) שעליו נלביש את ה-Shadow DOM
        const host = document.createElement('div');
        host.className = 'trust-tool-container';
        
        // מיקום ראשוני מעל התמונה
        host.style.position = 'absolute';
        host.style.zIndex = '10000';
        host.style.top = '15px';
        host.style.left = '15px';
        host.style.pointerEvents = 'none'; // מאפשר לחיצה על מה שמתחת במידת הצורך

        // 2. יצירת Shadow Root (מצב פתוח)
        const shadow = host.attachShadow({ mode: 'open' });

        // 3. הגדרת ה-CSS בתוך ה-Shadow DOM (מבודד לחלוטין מהאתר)
        const style = document.createElement('style');
        style.textContent = `
            :host {
                direction: rtl;
                pointer-events: auto;
            }
            .trust-bubble {
                background: rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(12px);
                -webkit-backdrop-filter: blur(12px);
                padding: 12px 16px;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 1px solid rgba(255,255,255,0.4);
                opacity: 0;
                transform: scale(0.9) translateY(-10px);
                min-width: 140px;
            }
            .trust-bubble.visible {
                opacity: 1;
                transform: scale(1) translateY(0);
            }
            .vote-label {
                font-size: 13px;
                font-weight: bold;
                color: #222;
                margin-bottom: 4px;
            }
            .vote-options {
                display: flex;
                gap: 8px;
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .btn {
                border: none;
                padding: 8px 16px;
                border-radius: 12px;
                cursor: pointer;
                font-weight: 800;
                font-size: 13px;
                transition: all 0.2s ease;
            }
            .btn:hover {
                transform: scale(1.08);
            }
            .btn-real { background: #e8f5e9; color: #2e7d32; }
            .btn-ai { background: #fce4ec; color: #c2185b; }

            /* מצב תוצאות (אחרי הצבעה) */
            .results {
                display: none;
                gap: 15px;
                opacity: 0;
                transform: translateY(5px);
                transition: all 0.4s ease;
            }
            .voted .vote-options, .voted .vote-label {
                display: none;
            }
            .voted .results {
                display: flex;
                opacity: 1;
                transform: translateY(0);
            }
            .result-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            .circle {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                background: #eee;
                position: relative;
                transition: background 1s ease-out;
            }
            .circle::after {
                content: "";
                position: absolute;
                width: 38px;
                height: 38px;
                background: white;
                border-radius: 50%;
            }
            .percent {
                position: relative;
                z-index: 1;
                font-size: 12px;
                font-weight: 900;
            }
            .res-name { font-size: 9px; font-weight: bold; color: #666; text-transform: uppercase; }
        `;

        // 4. מבנה ה-HTML
        const bubble = document.createElement('div');
        bubble.className = 'trust-bubble';
        bubble.innerHTML = `
            <span class="vote-label">הצבע:</span>
            <div class="vote-options">
                <button class="btn btn-real">Real</button>
                <button class="btn btn-ai">AI</button>
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

        // 5. לוגיקת הצבעה ואנימציה
        bubble.querySelectorAll('.btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const real = Math.floor(Math.random() * 30) + 65; // 65-95%
                const ai = 100 - real;

                // עדכון ויזואלי
                bubble.querySelector('#t-real').innerText = real + '%';
                bubble.querySelector('#t-ai').innerText = ai + '%';
                bubble.querySelector('#c-real').style.background = `conic-gradient(#4caf50 ${real}%, #eee 0)`;
                bubble.querySelector('#c-ai').style.background = `conic-gradient(#f44336 ${ai}%, #eee 0)`;

                // מעבר למצב "הצבעתי"
                bubble.classList.add('voted');
            };
        });

        // 6. הזרקה לדף ובדיקת קצוות (Edge Detection)
        shadow.appendChild(style);
        shadow.appendChild(bubble);
        
        // מוודא שהאלמנט האב של התמונה מאפשר מיקום אבסולוטי
        const parent = imageElement.parentElement;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
        parent.appendChild(host);

        // הפעלה של האנימציה הראשונית
        setTimeout(() => {
            bubble.classList.add('visible');
            handleEdgeDetection(host);
        }, 50);
    }

    // פונקציית זיהוי קצוות
    function handleEdgeDetection(el) {
        const rect = el.getBoundingClientRect();
        const windowWidth = window.innerWidth;

        // אם הבועה חורגת מצד ימין של המסך
        if (rect.right > windowWidth - 20) {
            el.style.left = 'auto';
            el.style.right = '15px';
        }
    }

    // הפעלה על תמונה קיימת בדף לבדיקה
    window.addEventListener('load', () => {
        const firstImg = document.querySelector('img');
        if (firstImg) injectTrustTool(firstImg);
    });

    // ייצוא הפונקציה לשימוש גלובלי
    window.injectTrustTool = injectTrustTool;
})();