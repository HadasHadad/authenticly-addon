chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

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

  if (request.action === "hashImage") {
    fetch(request.url)
      .then(res => res.blob())
      .then(blob => createImageBitmap(blob))
      .then(bitmap => {
        const SIZE = 64; // match content.js
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

        // Reject degenerate hashes — all white (CORS block) or all black
        const ones = hash.split('1').length - 1;
        if (ones < 200 || ones > 3896) {
          sendResponse({ hash: null });
          return;
        }
        sendResponse({ hash });
      })
      .catch(err => {
        console.error('[Authenticly background] hashImage error:', err.message);
        sendResponse({ hash: null });
      });
    return true;
  }

});