/**
 * Login Screen Script
 */
(() => {
  const guestBtn = document.getElementById('guest-mode-btn');
  const appleBtn = document.getElementById('login-apple');
  const googleBtn = document.getElementById('login-google');
  const phoneBtn = document.getElementById('login-phone');

  if (guestBtn) {
    guestBtn.addEventListener('click', () => {
      guestBtn.disabled = true;
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'אורח', loginMethod: 'guest' })
      })
      .then(() => {
        AppState.userMode = 'guest';
        localStorage.setItem('userMode', 'guest');
        window.navigate('emergency-mode');
      })
      .catch(err => {
        console.warn('[Login] Offline guest login fallback:', err.message);
        AppState.userMode = 'guest';
        localStorage.setItem('userMode', 'guest');
        window.navigate('emergency-mode');
      })
      .finally(() => {
        guestBtn.disabled = false;
      });
    });
  }

  const simulateLogin = (buttonEl, providerName, loginMethod) => {
    buttonEl.disabled = true;
    const originalContent = buttonEl.innerHTML;
    buttonEl.innerHTML = `<span class="spinner"></span> מתחבר בצורה מאובטחת...`;
    
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `משתמש ${providerName}`, loginMethod })
    })
    .then(res => {
      if (!res.ok) throw new Error('API Login failed');
      return res.json();
    })
    .then(() => {
      AppState.userMode = 'logged_in';
      localStorage.setItem('userMode', 'logged_in');
      window.navigate('emergency-mode');
    })
    .catch(err => {
      console.warn('[Login] Staging/offline login fallback:', err.message);
      AppState.userMode = 'logged_in';
      localStorage.setItem('userMode', 'logged_in');
      window.navigate('emergency-mode');
    })
    .finally(() => {
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalContent;
    });
  };

  if (appleBtn) appleBtn.addEventListener('click', () => simulateLogin(appleBtn, 'אפל', 'apple'));
  if (googleBtn) googleBtn.addEventListener('click', () => simulateLogin(googleBtn, 'גוגל', 'google'));
  if (phoneBtn) phoneBtn.addEventListener('click', () => simulateLogin(phoneBtn, 'טלפון', 'phone'));


})();
