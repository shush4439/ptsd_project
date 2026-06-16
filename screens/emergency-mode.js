/**
 * Emergency Interaction Mode Screen Script
 */
(() => {
  const calmBtn = document.getElementById('em-calm-btn');
  const focusBtn = document.getElementById('em-focus-btn');
  const supportBtn = document.getElementById('em-support-btn');
  const exitBtn = document.getElementById('em-exit-btn');

  // Play audio response & navigate
  const triggerAction = (route, pitch = 440) => {
    AudioEngine.resume();
    AudioEngine.playPopSound(pitch);
    window.navigate(route);
  };

  if (calmBtn) {
    calmBtn.addEventListener('click', () => {
      triggerAction('breathing', 523.25);
    });
  }

  if (focusBtn) {
    focusBtn.addEventListener('click', () => {
      triggerAction('focus', 392.00);
    });
  }

  if (supportBtn) {
    supportBtn.addEventListener('click', () => {
      triggerAction('support', 329.63);
    });
  }

  const exitWrapper = document.getElementById('em-exit-wrapper');
  const exitProgressCircle = exitBtn ? exitBtn.querySelector('.exit-progress-fg') : null;
  const exitTextEl = document.getElementById('em-exit-text');
  
  // Calculate exact border path perimeter dynamically
  let exitCircumference = 0;
  if (exitProgressCircle) {
    exitCircumference = exitProgressCircle.getTotalLength();
    exitProgressCircle.style.strokeDasharray = exitCircumference;
    exitProgressCircle.style.strokeDashoffset = exitCircumference;
  }

  // Initialize button text based on unlock status
  if (exitTextEl && window.AppState && window.AppState.allowHomeAccess) {
    exitTextEl.textContent = 'נרגענו אפשר להמשיך';
  }

  if (exitBtn && exitWrapper && exitProgressCircle) {
    let exitTimer = null;
    let exitAnimId = null;
    let isExitPressed = false;
    let startX = 0;
    let startY = 0;
    const holdDuration = 1000;

    const resetExitHoldingState = () => {
      exitBtn.classList.remove('holding');
      exitWrapper.classList.remove('holding-active');
      if (exitAnimId) {
        cancelAnimationFrame(exitAnimId);
        exitAnimId = null;
      }
      if (exitProgressCircle) {
        exitProgressCircle.style.strokeDashoffset = exitCircumference;
      }
    };

    const startExitPress = (e) => {
      if (isExitPressed) return;
      if (e.type === 'mousedown' && e.button !== 0) return; // Left click only

      isExitPressed = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;

      // Active state
      exitBtn.classList.add('holding');
      exitWrapper.classList.add('holding-active');
      const startTime = performance.now();

      const updateExitProgress = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / holdDuration, 1);
        if (exitProgressCircle) {
          exitProgressCircle.style.strokeDashoffset = exitCircumference * (1 - progress);
        }
        if (progress < 1) {
          exitAnimId = requestAnimationFrame(updateExitProgress);
        }
      };

      exitAnimId = requestAnimationFrame(updateExitProgress);

      exitTimer = setTimeout(() => {
        isExitPressed = false;
        resetExitHoldingState();
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        // Allow home screen access
        if (window.AppState) {
          window.AppState.allowHomeAccess = true;
          if (typeof window.apiSaveSettings === 'function') {
            window.apiSaveSettings({ allow_home_access: true });
          }
        }
        // Update button text to state: נרגענו אפשר להמשיך
        if (exitTextEl) {
          exitTextEl.textContent = 'נרגענו אפשר להמשיך';
        }
        triggerAction('home', 261.63);
      }, holdDuration);
    };

    const endExitPress = (e) => {
      if (!isExitPressed) return;
      isExitPressed = false;
      clearTimeout(exitTimer);
      resetExitHoldingState();
    };

    const cancelExitPress = (e) => {
      if (!isExitPressed) return;
      isExitPressed = false;
      clearTimeout(exitTimer);
      resetExitHoldingState();
    };

    const moveExitPress = (e) => {
      if (!isExitPressed) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = Math.abs(clientX - startX);
      const deltaY = Math.abs(clientY - startY);
      if (deltaX > 10 || deltaY > 10) {
        cancelExitPress(e);
      }
    };

    // Attach event listeners
    exitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    exitBtn.addEventListener('mousedown', startExitPress);
    exitBtn.addEventListener('mouseup', endExitPress);
    exitBtn.addEventListener('mousemove', moveExitPress);
    exitBtn.addEventListener('mouseleave', cancelExitPress);

    exitBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startExitPress(e);
    }, { passive: false });
    exitBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      endExitPress(e);
    }, { passive: false });
    exitBtn.addEventListener('touchmove', (e) => {
      e.preventDefault();
      moveExitPress(e);
    }, { passive: false });
    exitBtn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      cancelExitPress(e);
    }, { passive: false });
  }
})();
