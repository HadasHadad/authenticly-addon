chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ─── fetchData: קריאות רגילות לשרת ───────────────────────────────────────
  if (request.action === "fetchData") {
    const method = request.method || 'GET';
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (method !== 'GET' && request.body) {
      options.body = JSON.stringify(request.body);
    }
    fetch(request.url, options)
      .then(response => {
        if (!response.ok) return response.text().then(t => { throw new Error(`HTTP ${response.status}: ${t}`); });
        return response.json();
      })
      .then(data => sendResponse({ data }))
      .catch(error => {
        console.error('[Authenticly background] Fetch error:', error.message);
        sendResponse({ error: error.message });
      });
    return true;
  }

  // ─── hashImage: מוריד תמונה ומחשב pHash — עוקף CORS ─────────────────────
  if (request.action === "hashImage") {
    fetch(request.url)
      .then(res => res.blob())
      .then(blob => createImageBitmap(blob))
      .then(bitmap => {
        const SIZE = 32;
        const canvas = new OffscreenCanvas(SIZE, SIZE);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bitmap, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

        const grays = [];
        for (let i = 0; i < data.length; i += 4) {
          grays.push(Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]));
        }
        const avg = grays.reduce((a, b) => a + b, 0) / grays.length;
        const hash = grays.map(v => v >= avg ? '1' : '0').join('');
        sendResponse({ hash });
      })
      .catch(err => {
        console.error('[Authenticly background] hashImage error:', err.message);
        sendResponse({ hash: null });
      });
    return true;
  }

});