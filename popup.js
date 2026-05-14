function normalizeUrl(imageUrl) {
    const url = new URL(imageUrl);
    return url.origin + url.pathname;
}


// שליחה לשרת (AI / REAL)
function vote(imageUrl, isAI) {

    const cleanUrl = normalizeUrl(imageUrl);

    fetch("http://localhost:3000/vote", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            url: cleanUrl,
            vote: isAI
        })
    })
    .then(res => res.json())
    .then(data => {

        console.log("Vote sent:", data);

        // שמירה מקומית למניעת הצבעה כפולה
        chrome.storage.local.set({
            [cleanUrl]: { voted: true }
        });

    })
    .catch(err => console.error("Vote error:", err));
}


// קבלת סטטיסטיקות מהשרת
function getImageStats(imageUrl, callback) {

    const cleanUrl = normalizeUrl(imageUrl);

    fetch(`http://localhost:3000/front?url=${encodeURIComponent(cleanUrl)}`)
        .then(res => res.json())
        .then(data => {

            callback({
                aiCount: data.aiPercentage,
                realCount: data.realPercentage,
                total: data.totalVotes,
                mostVoted: data.mostVoted
            });

        })
        .catch(err => {

            console.error("Stats error:", err);

            callback({
                aiCount: 0,
                realCount: 0,
                total: 0,
                mostVoted: "unknown"
            });

        });
}


// בדיקה אם כבר הצביע
function checkIfVoted(imageUrl, callback) {

    const cleanUrl = normalizeUrl(imageUrl);

    chrome.storage.local.get(cleanUrl, (result) => {
        callback(!!result[cleanUrl]);
    });

}


// ניקוי היסטוריה
document.getElementById("clearVotes").addEventListener("click", () => {

    chrome.storage.local.clear(() => {
        alert("נמחק הכל");
    });

});