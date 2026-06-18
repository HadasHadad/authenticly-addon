document.getElementById("clearVotes").addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    const status = document.getElementById("status");
    status.textContent = "Voting history cleared. You can vote again on all images.";
    setTimeout(() => { status.textContent = ""; }, 3000);
  });
});
