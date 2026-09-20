// Applies a saved explicit theme before first paint. Without one, the system theme applies.
(function () {
  try {
    var saved = localStorage.getItem("jev-theme");
    if (saved === "light" || saved === "dark") document.documentElement.dataset.theme = saved;
  } catch (e) {
    /* storage unavailable: keep the system theme */
  }
})();
