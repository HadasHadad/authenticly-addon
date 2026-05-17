
function normalizeUrl(imageUrl) {
    try {
        const url = new URL(imageUrl);
        return url.origin + url.pathname;
    } catch (e) {
        return imageUrl;
    }
}

document.getElementById("clearVotes").addEventListener("click", () => {
    chrome.storage.local.clear(() => {
        alert("כל הצבעות המשתמש נמחקו מהזיכרון המקומי! כעת ניתן להצביע מחדש.");
    });
});