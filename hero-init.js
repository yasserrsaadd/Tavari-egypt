/* Tavari Egypt — hero background video bootstrap
   Extracted from index.html so the page runs under a strict CSP (no inline scripts).
   Loaded synchronously right after the <video> element, exactly where the old
   inline block used to be, so iOS still gets a direct src during parse. */
(function () {
  var v = document.getElementById("heroBgVideo");
  if (!v) return;
  var mq = window.matchMedia("(min-width: 768px)");

  v.muted = true;
  v.setAttribute("muted", "");
  v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute("playsinline", "");

  /* iOS honours preload/autoplay reliably when the source is a direct
     src on the element rather than <source> children. */
  if (!mq.matches && /iP(hone|ad|od)/.test(navigator.userAgent)) {
    v.src = "Videos/mobileHero.mp4";
  }

  function setPlayingClass() {
    if (v.parentNode && v.parentNode.classList) v.parentNode.classList.add("is-playing");
  }

  function forcePlay() {
    v.muted = true;
    v.setAttribute("muted", "");
    if (v.networkState === 3) v.load();
    try {
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    } catch (err) {}
  }

  window.__heroDataSource = mq.matches ? "desktop" : "mobile";
  forcePlay();

  var tries = 0;
  var timer = setInterval(function () {
    if (!v.paused) { clearInterval(timer); return; }
    forcePlay();
    if (++tries > 240) clearInterval(timer);
  }, 500);

  v.addEventListener("loadeddata", function () {
    v.removeAttribute("poster");
    setPlayingClass();
    forcePlay();
  });
  v.addEventListener("canplay", function () { setPlayingClass(); forcePlay(); });
  v.addEventListener("playing", function () { setPlayingClass(); clearInterval(timer); });
  v.addEventListener("error", function () { if (v.networkState === 3) v.load(); });

  ["touchstart", "touchmove", "touchend", "pointerdown", "pointermove", "click", "scroll", "wheel", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, forcePlay, { passive: true });
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) forcePlay();
  }, true);
  window.addEventListener("pageshow", function () { forcePlay(); });

  if (mq.addEventListener) mq.addEventListener("change", function () { window.__heroDataSource = mq.matches ? "desktop" : "mobile"; forcePlay(); });
  else if (mq.addListener) mq.addListener(function () { window.__heroDataSource = mq.matches ? "desktop" : "mobile"; forcePlay(); });

  /* Bootstrap-icons stylesheet is loaded with media="print" + this flip so it never
     blocks first paint (replaces the old inline onload= attribute). */
  var icons = document.getElementById("bootstrapIconsCss");
  if (icons) icons.media = "all";
})();
