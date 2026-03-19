// Theme initialization (runs before React hydration to prevent flash)
(function(){
  var m = localStorage.getItem("theme") || "system";
  var d = m === "dark" || (m === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  if (d) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
})();

// Service worker registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("/sw.js");
  });
}
