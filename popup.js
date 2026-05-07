function markImageAsVoted(imageUrl) {
    const cleanUrl = new URL(imageUrl).origin + new URL(imageUrl).pathname;

    const data = {};
    data[cleanUrl] = { voted: true };

    chrome.storage.local.set(data, () => {
        console.log("Saved:", imageUrl);
    });
}

function checkIfVoted(imageUrl, callback) {
    const cleanUrl = new URL(imageUrl).origin + new URL(imageUrl).pathname;

    chrome.storage.local.get([cleanUrl], (result) => {

        console.log("Result:", result[cleanUrl]);

        if (result[cleanUrl] && result[cleanUrl].voted === true) {
            callback(true);
        } else {
            callback(false);
        }
    });
}



markImageAsVoted("https://example.com/image.jpg");

checkIfVoted("https://example.com/image.jpg", (alreadyVoted) => {

    if (alreadyVoted) {
        console.log("Already voted -> show graph");
    } else {
        console.log("Not voted yet -> show voting buttons");
    }

});