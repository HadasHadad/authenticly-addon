const SERVER_URL = "https://sparkling-presence-production-cc79.up.railway.app";

// ─── URL normalization (fallback only) ────────────────────────────────────────
function normalizeUrl(imageUrl) {
  try {
    const url = new URL(imageUrl);
    let path = url.pathname;
    path = path
      .replace(/[@_-](small|medium|large|thumb|thumbnail|preview|xl|xs|2x|3x|hd|sd|low|high)/gi, '')
      .replace(/\/\d+x\d+\//g, '/')
      .replace(/\.\w+$/, '')
      .replace(/[-_]+/g, '-')
      .toLowerCase();
    const keepParams = ['id', 'photo_id', 'image_id'];
    const cleanParams = new URLSearchParams();
    for (const [k, v] of url.searchParams.entries()) {
      if (keepParams.includes(k.toLowerCase())) cleanParams.set(k, v);
    }
    const host = url.hostname.replace(/^(i\d+\.|cdn\d*\.|static\d*\.|img\d*\.|media\d*\.)/, '');
    const paramStr = cleanParams.toString() ? '?' + cleanParams.toString() : '';
    return `${host}${path}${paramStr}`;
  } catch (e) { return imageUrl; }
}

// ─── Hash via background (bypasses CORS completely) ──────────────────────────
// Hash an already-loaded img element directly (no fetch, no CORS issues)
function hashImgElement(imgEl) {
  try {
    const SIZE = 64;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const grays = [];
    for (let i = 0; i < data.length; i += 4) {
      grays.push(Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]));
    }
    const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
    const hash = grays.map(v => v >= avg ? '1' : '0').join('');
    const ones = hash.split('1').length - 1;
    if (ones < 200 || ones > 3896) return null; // degenerate = failed read
    return hash;
  } catch (e) { return null; }
}

function computeImageHash(imageUrl, imgElement) {
  // For data: URLs — use the existing element directly (already decoded, no CORS)
  if (imageUrl.startsWith('data:') && imgElement) {
    return Promise.resolve(hashImgElement(imgElement));
  }
  // Regular URLs — fetch via background to bypass CORS
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'hashImage', url: imageUrl }, (res) => {
      if (chrome.runtime.lastError || !res) { resolve(null); return; }
      const hash = res.hash || null;
      if (hash) {
        const ones = hash.split('1').length - 1;
        if (ones < 200 || ones > 3896) { resolve(null); return; }
      }
      resolve(hash);
    });
  });
}

// In-memory cache so we never hash the same URL twice
const hashCache = {};

// Tracks normalized URLs already injected — prevents duplicate chips
const injectedSrcs = new Set();

// hashBitsCache stores raw bits separately so we can send them to the server
const hashBitsCache = {};

async function getImageKey(imgElement) {
  const src = imgElement.src;
  if (hashCache[src]) return hashCache[src];
  const hash = await computeImageHash(src, imgElement);
  if (hash) hashBitsCache[src] = hash;
  const key = hash ? 'hash:' + hash : 'url:' + normalizeUrl(src);
  hashCache[src] = key;
  console.log("[Authenticly] URL:", src.substring(0,100));
  console.log("[Authenticly] hash:", hash ? hash.substring(0,40)+"..." : "NULL - CORS blocked");
  console.log("[Authenticly] key:", key.substring(0,60));
  return key;
}

function getHashBits(src) {
  return hashBitsCache[src] || null;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const BUBBLE_CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: system-ui, sans-serif; }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(255,255,255,0.92);
    backdrop-filter: blur(8px);
    border: 0.5px solid rgba(0,0,0,0.12);
    border-radius: 20px;
    padding: 5px 10px 5px 7px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    user-select: none;
    white-space: nowrap;
  }
  .chip:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.18); }
  .chip-icon { font-size: 13px; line-height: 1; }
  .chip-text { font-size: 11px; font-weight: 600; color: #444; }
  .chip-close {
    margin-left: 4px; font-size: 10px; color: #aaa;
    cursor: pointer; padding: 1px 3px; border-radius: 50%;
  }
  .chip-close:hover { color: #666; background: rgba(0,0,0,0.07); }

  .bubble {
    display: none;
    background: #ffffff;
    border: 0.5px solid rgba(0,0,0,0.15);
    border-radius: 16px;
    width: 192px;
    padding: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.13);
    position: relative;
    overflow: hidden;
  }
  .bubble.open { display: block; }
  .bubble::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, #1D9E75, #7F77DD);
  }

  .b-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 10px; cursor: grab; user-select: none;
  }
  .b-header:active { cursor: grabbing; }
  .b-title { font-size: 10px; font-weight: 600; letter-spacing: 0.6px; text-transform: uppercase; color: #888; }
  .b-close {
    width: 18px; height: 18px; border-radius: 50%;
    border: 0.5px solid #ddd; background: #f5f5f5;
    cursor: pointer; display: flex; align-items: center;
    justify-content: center; font-size: 10px; color: #666; padding: 0;
  }
  .b-close:hover { background: #eee; }

  .vote-question { font-size: 12px; font-weight: 600; color: #1a1a1a; text-align: center; margin-bottom: 8px; }
  .vote-btns { display: flex; gap: 7px; }
  .v-btn {
    flex: 1; padding: 7px 0; border-radius: 8px;
    border: 0.5px solid #ddd; font-size: 11px; font-weight: 600;
    cursor: pointer; background: #f8f8f8;
    transition: background 0.12s, transform 0.1s;
  }
  .v-btn:hover { background: #efefef; }
  .v-btn:active { transform: scale(0.96); }
  .v-btn.real { color: #0F6E56; }
  .v-btn.ai   { color: #534AB7; }

  /* vote-area and results always take up the same space to prevent size jump */
  #vote-area { min-height: 58px; }
  .results { display: none; }
  .results.show { display: block; }

  .bar-row { margin-bottom: 8px; }
  .bar-top { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
  .bar-name { font-weight: 600; }
  .bar-name.real { color: #0F6E56; }
  .bar-name.ai   { color: #534AB7; }
  .bar-pct { font-weight: 600; color: #1a1a1a; }
  .track { height: 5px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(.4,0,.2,1); }
  .fill.real { background: #1D9E75; }
  .fill.ai   { background: #7F77DD; }
  .bar-sub { font-size: 9px; color: #aaa; text-align: right; margin-top: 1px; }

  .footer {
    margin-top: 8px; padding-top: 7px;
    border-top: 0.5px solid #eee;
    font-size: 9px; color: #aaa; text-align: center;
  }
  .my-badge {
    display: inline-block; font-size: 9px;
    padding: 2px 6px; border-radius: 10px; font-weight: 600; margin-top: 4px;
  }
  .my-badge.real { background: #E1F5EE; color: #0F6E56; }
  .my-badge.ai   { background: #EEEDFE; color: #3C3489; }
  .loading { font-size: 11px; color: #aaa; text-align: center; padding: 6px 0; }
`;

function buildResultsHTML(data, myVote) {
  if (!data) return `<div class="loading">Error loading results</div>`;
  const total = data.real + data.ai;
  const realPct = total === 0 ? 50 : Math.round((data.real / total) * 100);
  const aiPct = 100 - realPct;
  return `
    <div class="bar-row">
      <div class="bar-top"><span class="bar-name real">Real</span><span class="bar-pct">${realPct}%</span></div>
      <div class="track"><div class="fill real" style="width:${realPct}%"></div></div>
      <div class="bar-sub">${data.real.toLocaleString()} votes</div>
    </div>
    <div class="bar-row">
      <div class="bar-top"><span class="bar-name ai">AI</span><span class="bar-pct">${aiPct}%</span></div>
      <div class="track"><div class="fill ai" style="width:${aiPct}%"></div></div>
      <div class="bar-sub">${data.ai.toLocaleString()} votes</div>
    </div>
    <div class="footer">
      ${total.toLocaleString()} votes total
      ${myVote ? `<br><span class="my-badge ${myVote}">You voted: ${myVote === 'real' ? 'Real' : 'AI'}</span>` : ''}
    </div>`;
}

// ─── Dragging (clamped inside image bounds) ───────────────────────────────────
function makeDraggable(host, dragHandle, imgElement) {
  let dragging = false, startX, startY, startLeft, startTop;

  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('b-close')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = parseInt(host.style.left) || 0;
    startTop  = parseInt(host.style.top)  || 0;
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const imgRect  = imgElement.getBoundingClientRect();
    const hostEl   = host.shadowRoot ? host : host;
    const hostW    = 200; // approximate bubble width
    const hostH    = 160; // approximate bubble height

    let newLeft = startLeft + (e.clientX - startX);
    let newTop  = startTop  + (e.clientY - startY);

    const minLeft = imgRect.left + window.scrollX;
    const minTop  = imgRect.top  + window.scrollY;
    const maxLeft = minLeft + imgRect.width  - hostW;
    const maxTop  = minTop  + imgRect.height - hostH;

    newLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
    newTop  = Math.max(minTop,  Math.min(maxTop,  newTop));

    host.style.left = newLeft + 'px';
    host.style.top  = newTop  + 'px';
  });

  document.addEventListener('mouseup', () => { dragging = false; });
}

// ─── Inject ───────────────────────────────────────────────────────────────────
function injectTrustTool(imageElement) {
  if (imageElement.dataset.trustInjected === 'true') return;
  if (!imageElement.src || imageElement.naturalWidth < 200 || imageElement.naturalHeight < 200) return;

<<<<<<< HEAD
    if (imageElement.src.startsWith('data:')) return;

    if (!isValidImage(imageElement) || imageElement.dataset.trustInjected) return;
=======
  // Dedupe by normalized src — prevents two chips on same image (thumbnail + full)
  const normalizedSrc = normalizeUrl(imageElement.src);
  if (injectedSrcs.has(normalizedSrc)) {
    imageElement.dataset.trustInjected = 'true'; // mark so observer skips it
    return;
  }
  injectedSrcs.add(normalizedSrc);
  imageElement.dataset.trustInjected = 'true';
>>>>>>> main

  // Show chip right away at image position — no waiting for hash
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(host);

<<<<<<< HEAD
    const cleanUrl = normalizeUrl(imageElement.src);

    const id = generateId(imageElement.src);

    // מונע כפילויות
    if (document.getElementById(id)) return;

    const host = document.createElement('div');

    host.id = id;

    host.className = 'trust-tool-container';

    host.style.position = 'absolute';

    host.style.zIndex = '2147483647';

    // לא חוסם קליקים על הדף
    host.style.pointerEvents = 'none';

    function updatePosition() {
=======
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>${BUBBLE_CSS}</style>
    <div class="chip" id="chip" style="pointer-events:auto">
      <span class="chip-icon">🤔</span>
      <span class="chip-text">Is it AI?</span>
      <span class="chip-close" id="chip-close">✕</span>
    </div>
    <div class="bubble" id="bubble" style="pointer-events:auto">
      <div class="b-header" id="drag-handle">
        <span class="b-title">Authenticly</span>
        <button class="b-close" id="b-close">✕</button>
      </div>
      <div id="vote-area">
        <div class="loading">Loading...</div>
      </div>
      <div class="results" id="results"></div>
    </div>`;

  // Position chip at top-left of image
  const placeAtImage = () => {
    const rect = imageElement.getBoundingClientRect();
    if (rect.width === 0) return;
    host.style.top  = (rect.top  + window.scrollY + 8) + 'px';
    host.style.left = (rect.left + window.scrollX + 8) + 'px';
  };
  placeAtImage();

  let pinned = false; // true once user opens bubble — stop auto-repositioning
  const posInterval = setInterval(() => { if (!pinned) placeAtImage(); }, 500);

  const chipEl   = shadow.getElementById('chip');
  const bubbleEl = shadow.getElementById('bubble');
>>>>>>> main

  shadow.getElementById('chip-close').onclick = () => {
    clearInterval(posInterval);
    host.remove();
  };
  shadow.getElementById('b-close').onclick = () => {
    clearInterval(posInterval);
    host.remove();
  };

<<<<<<< HEAD
        let top = rect.top + window.scrollY + 15;

        let left = rect.left + window.scrollX + 15;

        const bubbleWidth = 220;

        if (left + bubbleWidth > window.innerWidth) {

            left = window.innerWidth - bubbleWidth - 20;
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
        pointer-events: auto;
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

    @media (max-width: 600px) {

        .trust-bubble {

            min-width: 160px;
            padding: 12px;
        }

        .circle {

            width: 60px;
            height: 60px;
            font-size: 15px;
        }

        .btn {

            padding: 6px 10px;
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

                    showResultsUI(
                        bubble,
                        real,
                        ai
                    );

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

            bubble.innerHTML =
                `<span class="loading">שגיאת שרת</span>`;
        }
    });
}

function attachCloseEvent(bubble) {

    const closeBtn = bubble.querySelector('.close-btn');

    if (!closeBtn) return;

    closeBtn.onclick = () => {

        bubble.style.opacity = '0';

        bubble.style.transform = 'scale(0.8)';

        setTimeout(() => {

            const shadowRoot = bubble.parentNode;

            if (shadowRoot && shadowRoot.host) {

                shadowRoot.host.remove();
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

    bubble.innerHTML = `

        <div class="top-bar">

            <span class="brand">
                Authenticly
            </span>

            <button class="close-btn">
                ✕
            </button>

        </div>

        <span class="vote-label">
            אמיתי או AI?
        </span>

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

            alert("שגיאה בשליחה!");
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

                if (node.querySelectorAll) {

                    node.querySelectorAll('img')
                        .forEach(injectTrustTool);
                }
            }
        })
=======
  makeDraggable(host, shadow.getElementById('drag-handle'), imageElement);

  // ── showResults / vote helpers ──
  const showResults = (data, myVote) => {
    const voteArea = shadow.getElementById('vote-area');
    if (voteArea) voteArea.style.display = 'none';
    const resultsEl = shadow.getElementById('results');
    resultsEl.innerHTML = buildResultsHTML(data, myVote);
    resultsEl.classList.add('show');
  };

  const fetchAndShowResults = (myVote) => {
    const hashBits = getHashBits(imageElement.src);
    const hashParam = hashBits ? '&hash=' + encodeURIComponent(hashBits) : '';
    chrome.runtime.sendMessage(
      { action: 'fetchData', url: `${SERVER_URL}/front?url=${encodeURIComponent(imageKey)}${hashParam}` },
      (res) => {
        if (chrome.runtime.lastError) { showResults(null, myVote); return; }
        // If server returned a canonical key different from ours, save it locally too
        // so next time we see this image we skip the vote screen immediately
        if (res && res.data && res.data.key && res.data.key !== imageKey) {
          const canonicalKey = res.data.key;
          if (myVote) {
            // Save vote under both keys so any URL variant is recognized
            chrome.storage.local.set({ [imageKey]: myVote, [canonicalKey]: myVote });
          }
          imageKey = canonicalKey;
        }
        showResults(res ? res.data : null, myVote);
      }
>>>>>>> main
    );
  };

<<<<<<< HEAD
observer.observe(document.body, {

    childList: true,
    subtree: true
});
=======
  let imageKey = null; // will be set once hash is ready
  let voted = false;   // guard against double-voting

  const vote = (type) => {
    if (voted || !imageKey) return; // prevent double-vote
    voted = true;
    const voteArea = shadow.getElementById('vote-area');
    voteArea.innerHTML = '<div class="loading">Sending...</div>';
    chrome.runtime.sendMessage(
      { action: 'fetchData', url: `${SERVER_URL}/vote`, method: 'POST', body: { url: imageKey, hash: getHashBits(imageElement.src), voteType: type } },
      (res) => {
        if (chrome.runtime.lastError || res?.error) {
          voted = false; // allow retry on error
          const va = shadow.getElementById('vote-area');
          if (va) va.innerHTML = '<div class="loading">Connection error — try again</div>';
          return;
        }
        chrome.storage.local.set({ [imageKey]: type }, () => {
          if (res?.data?.real !== undefined) showResults(res.data, type);
          else fetchAndShowResults(type);
        });
      }
    );
  };

  // ── Open bubble: compute key first, then decide what to show ──
  const openBubble = () => {
    pinned = true;
    chipEl.style.display = 'none';
    bubbleEl.classList.add('open');

    if (imageKey) {
      // Key already computed (cached) — instant
      setupVoteUI();
    } else {
      // Still computing — show spinner, wait
      getImageKey(imageElement).then((key) => {
        imageKey = key;
        setupVoteUI();
      });
    }
  };

  const setupVoteUI = () => {
    chrome.storage.local.get(imageKey, (stored) => {
      const myVote = stored[imageKey];
      if (myVote) {
        // Already voted locally — go straight to results
        fetchAndShowResults(myVote);
      } else {
        // Check server first — maybe we voted on a different URL of the same image
        const hashBits = getHashBits(imageElement.src);
        const hashParam = hashBits ? '&hash=' + encodeURIComponent(hashBits) : '';
        chrome.runtime.sendMessage(
          { action: 'fetchData', url: `${SERVER_URL}/front?url=${encodeURIComponent(imageKey)}${hashParam}` },
          (res) => {
            if (res && res.data && res.data.key && res.data.key !== imageKey) {
              // Server found a canonical match — check if we voted on that key
              const canonicalKey = res.data.key;
              chrome.storage.local.get(canonicalKey, (stored2) => {
                const prevVote = stored2[canonicalKey];
                if (prevVote) {
                  // We already voted under the canonical key — save locally and show results
                  chrome.storage.local.set({ [imageKey]: prevVote });
                  imageKey = canonicalKey;
                  showResults(res.data, prevVote);
                } else {
                  showVoteButtons();
                }
              });
            } else {
              showVoteButtons();
            }
          }
        );
      }
    });
  };

  const showVoteButtons = () => {
    const voteArea = shadow.getElementById('vote-area');
    if (!voteArea) return;
    voteArea.innerHTML = `
      <div class="vote-question">Real image or AI?</div>
      <div class="vote-btns">
        <button class="v-btn real" id="btn-real">📷 Real</button>
        <button class="v-btn ai" id="btn-ai">🤖 AI</button>
      </div>`;
    shadow.getElementById('btn-real').onclick = () => vote('real');
    shadow.getElementById('btn-ai').onclick   = () => vote('ai');
  };

  chipEl.addEventListener('click', (e) => {
    if (e.target.id === 'chip-close') return;
    openBubble();
  });

  // Pre-compute key in background while chip is visible — so opening is instant
  getImageKey(imageElement).then((key) => { imageKey = key; });
}

const observer = new MutationObserver(() => {
  document.querySelectorAll('img').forEach(injectTrustTool);
});
observer.observe(document.body, { childList: true, subtree: true });
document.querySelectorAll('img').forEach(injectTrustTool);
>>>>>>> main
