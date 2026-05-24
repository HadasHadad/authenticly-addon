// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchData") {
        fetch(request.url, {
            method: request.method || "GET",
            headers: { "Content-Type": "application/json" },
            body: request.body ? JSON.stringify(request.body) : null
        })
        .then(res => res.json())
        .then(data => sendResponse({ data }))
        .catch(err => sendResponse({ error: err.message }));
        
        return true; // חובה כדי להחזיר תשובה אסינכרונית
    }
});