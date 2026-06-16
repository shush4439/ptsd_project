/**
 * Breathing Screen Script
 */
(() => {
  const orb = document.getElementById('breathing-orb');
  const instructionEl = document.getElementById('breath-instruction');
  const subInstructionEl = document.getElementById('breath-sub-instruction');
  const timerEl = document.getElementById('breath-timer');
  const toggleBtn = document.getElementById('breath-toggle-btn');
  const rhythmBtns = document.querySelectorAll('.rhythm-btn');

  let activeRhythm = 'box';
  let isPlaying = false;
  let cycleInterval = null;
  let countdownInterval = null;
  let currentStepIndex = 0;

  const rhythmConfigs = {
    box: [
      { phase: 'שאיפה', duration: 4, scale: 1.7, instruction: 'שאפו אוויר פנימה בהדרגה' },
      { phase: 'עצירה', duration: 4, scale: 1.7, instruction: 'עצרו את הנשימה והירגעו' },
      { phase: 'נשיפה', duration: 4, scale: 1.0, instruction: 'שחררו את כל המתח החוצה' },
      { phase: 'עצירה', duration: 4, scale: 1.0, instruction: 'הישארו ברגיעה ללא אוויר' }
    ],
    calm: [
      { phase: 'שאיפה', duration: 4, scale: 1.7, instruction: 'שאפו אוויר פנימה' },
      { phase: 'עצירה', duration: 7, scale: 1.7, instruction: 'החזיקו את האוויר והירגעו' },
      { phase: 'נשיפה', duration: 8, scale: 1.0, instruction: 'שחררו את האוויר במלואו' }
    ],
    equal: [
      { phase: 'שאיפה', duration: 5, scale: 1.7, instruction: 'שאיפה איטית' },
      { phase: 'נשיפה', duration: 5, scale: 1.0, instruction: 'נשיפה עדינה' }
    ]
  };

  const stopBreathing = () => {
    isPlaying = false;
    currentStepIndex = 0;
    
    // Clear intervals
    if (cycleInterval) clearTimeout(cycleInterval);
    if (countdownInterval) clearInterval(countdownInterval);
    
    // Reset DOM
    if (toggleBtn) {
      toggleBtn.innerHTML = `<i data-lucide="play"></i><span>התחל</span>`;
      toggleBtn.classList.remove('btn-secondary');
      toggleBtn.classList.add('btn-primary');
      if (window.lucide) window.lucide.createIcons();
    }
    
    if (instructionEl) instructionEl.textContent = 'מוכנים';
    if (subInstructionEl) subInstructionEl.textContent = 'לחצו על הכפתור למטה כדי להתחיל מחזור נשימה';
    if (timerEl) timerEl.textContent = '--';
    
    // Reset orb style
    if (orb) {
      orb.style.transition = 'transform 1.5s ease';
      orb.style.transform = 'scale(1)';
    }
  };

  const runPhase = () => {
    const config = rhythmConfigs[activeRhythm][currentStepIndex];
    if (!config) return;

    // Update Text
    if (instructionEl) instructionEl.textContent = config.phase;
    if (subInstructionEl) subInstructionEl.textContent = config.instruction;
    
    // Set breathing pace transitions on Orb
    if (orb) {
      orb.style.transition = `transform ${config.duration}s cubic-bezier(0.35, 0.45, 0.45, 1)`;
      orb.style.transform = `scale(${config.scale})`;
    }

    // Secondary Timer Display
    let secondsLeft = config.duration;
    if (timerEl) timerEl.textContent = secondsLeft;

    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        if (timerEl) timerEl.textContent = secondsLeft;
      } else {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // Schedule next phase
    cycleInterval = setTimeout(() => {
      currentStepIndex = (currentStepIndex + 1) % rhythmConfigs[activeRhythm].length;
      runPhase();
    }, config.duration * 1000);
  };

  const startBreathing = () => {
    AudioEngine.resume();
    
    isPlaying = true;
    currentStepIndex = 0;
    
    if (toggleBtn) {
      toggleBtn.innerHTML = `<i data-lucide="square"></i><span>השהה</span>`;
      toggleBtn.classList.remove('btn-primary');
      toggleBtn.classList.add('btn-secondary');
      if (window.lucide) window.lucide.createIcons();
    }

    runPhase();
  };

  rhythmBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selected = btn.getAttribute('data-rhythm');
      if (selected === activeRhythm) return;

      activeRhythm = selected;
      rhythmBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      stopBreathing();
    });
  });

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (isPlaying) {
        stopBreathing();
      } else {
        startBreathing();
      }
    });
  }

  // Register cleanup hook
  window.activeScreenCleanup = () => {
    stopBreathing();
  };
})();
