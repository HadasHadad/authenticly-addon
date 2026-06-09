chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchData") {
        fetch(request.url, {
            method: request.method || 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: request.body ? JSON.stringify(request.body) : null
        })
        .then(response => response.json())
        .then(data => sendResponse({ data }))
        .catch(error => {
            console.error("Error:", error);
            sendResponse({ error: error.message });
        });
        return true; 
    }
});