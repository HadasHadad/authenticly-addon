function markImageAsVoted(imageUrl) {
    const cleanUrl = new URL(imageUrl).origin + new URL(imageUrl).pathname;
  const data = {};
  data[imageUrl] = { voted: true };

  chrome.storage.local.set(data, () => {
    console.log("Saved:", imageUrl);
  });
}
function checkIfVoted(imageUrl) {
  const cleanUrl = new URL(imageUrl).origin + new URL(imageUrl).pathname;

  chrome.storage.local.get([cleanUrl], (result) => {
    console.log("Result:", result[cleanUrl]);
  });
}
markImageAsVoted("https://example.com/image.jpg");
checkIfVoted("https://example.com/image.jpg");
