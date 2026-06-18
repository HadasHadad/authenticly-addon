// Runs on every page — detects when the tab IS the image itself
// (e.g. user opened https://cdn.site.com/photo.jpg directly)
// In that case Chrome wraps the image in a bare <html><body><img></body></html>
// with no other content. We detect this and inject the chip.

(function () {
  const isRawImageTab = () => {
    const imgs = document.querySelectorAll('img');
    if (imgs.length !== 1) return false;
    const img = imgs[0];
    // Chrome raw image tab: the single img fills the whole body
    return (
      img.src === location.href ||
      document.title === document.location.pathname.split('/').pop()
    );
  };

  if (!isRawImageTab()) return;

  // content.js is also injected, so just let it handle the img naturally.
  // But raw image tabs have no scrolling wrapper — make sure the img
  // has position:relative so the chip can anchor to it.
  const img = document.querySelector('img');
  if (img) {
    document.body.style.margin = '0';
    img.style.display = 'block';
  }
})();