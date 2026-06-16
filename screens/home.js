/**
 * Home Screen Script
 */
(() => {
  const greetingEl = document.getElementById('home-greeting');
  if (greetingEl) {
    if (AppState.userMode === 'logged_in') {
      greetingEl.textContent = "ברוכים השבים.";
    } else {
      greetingEl.textContent = "נשמו. אתם בטוחים.";
    }
  }
})();
