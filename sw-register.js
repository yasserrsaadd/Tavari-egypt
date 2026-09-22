/* Tavari Egypt — service worker registration
   Extracted from index.html so the page runs under a strict CSP (no inline scripts). */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {});
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (navigator.serviceWorker.controller) window.location.reload();
      });
    }
  });
}
