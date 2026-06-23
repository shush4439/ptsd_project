/**
 * Recovery Plan Screen Script
 */
(() => {
  const checkboxes = document.querySelectorAll('.checklist-cb');
  const progressBar = document.getElementById('recovery-progress-bar');
  const percentEl = document.getElementById('recovery-percent');
  const tipEl = document.getElementById('recovery-tip');
  const checklistWrapper = document.getElementById('recovery-checklist');

  const activeModeBtn = document.getElementById('mode-active-btn');
  const guidedModeBtn = document.getElementById('mode-guided-btn');

  let currentMode = localStorage.getItem('recoveryMode') || 'active';

  // Load saved checklist state depending on the mode
  const loadSavedChecklist = () => {
    if (!checklistWrapper) return;
    const savedActive = localStorage.getItem('recoveryChecklist_active');
    const savedGuided = localStorage.getItem('recoveryChecklist_guided');
    
    let checkedStates = [];
    if (currentMode === 'guided') {
      checkedStates = savedGuided ? JSON.parse(savedGuided) : [true, true, true, true, true];
      checklistWrapper.classList.add('guided-mode');
      if (guidedModeBtn) guidedModeBtn.classList.add('active');
      if (activeModeBtn) activeModeBtn.classList.remove('active');
    } else {
      checkedStates = savedActive ? JSON.parse(savedActive) : [false, false, false, false, false];
      checklistWrapper.classList.remove('guided-mode');
      if (activeModeBtn) activeModeBtn.classList.add('active');
      if (guidedModeBtn) guidedModeBtn.classList.remove('active');
    }
    
    checkboxes.forEach((cb, idx) => {
      cb.checked = checkedStates[idx] || false;
      const card = cb.closest('.checklist-item');
      if (card) {
        if (cb.checked) {
          card.classList.add('checked');
        } else {
          card.classList.remove('checked');
        }
      }
    });

    updateProgress(false);
  };

  const updateProgress = (playAudio = true) => {
    let checkedCount = 0;
    const checkedStates = [];

    checkboxes.forEach((cb) => {
      checkedStates.push(cb.checked);
      if (cb.checked) checkedCount++;
    });

    // Save states for the current mode
    if (currentMode === 'guided') {
      localStorage.setItem('recoveryChecklist_guided', JSON.stringify(checkedStates));
    } else {
      localStorage.setItem('recoveryChecklist_active', JSON.stringify(checkedStates));
    }

    const total = checkboxes.length;
    const percent = Math.round((checkedCount / total) * 100);
    
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${percent}%`;

    // Calming tips based on progress
    if (tipEl) {
      if (percent === 0) {
        tipEl.textContent = "קחו את הזמן. התמקדו בעדינות בשלב הראשון.";
      } else if (percent < 40) {
        tipEl.textContent = "התקדמות מצוינת. קחו נשימה איטית ועמוקה.";
      } else if (percent < 80) {
        tipEl.textContent = "אתם עושים עבודה נהדרת. חושו את הקרקע מתחת לרגליים.";
      } else if (percent < 100) {
        tipEl.textContent = "כמעט שם. סירקו את השרירים שלכם ושחררו מתח.";
      } else {
        tipEl.textContent = "השלבים הושלמו בהצלחה. אתם בטוחים. עברתם את זה.";
      }
    }

    if (playAudio) {
      AudioEngine.playPopSound(300 + checkedCount * 45); // Ascending chimes
    }
  };

  // Bind change events to checkboxes
  checkboxes.forEach((cb) => {
    cb.addEventListener('change', () => {
      AudioEngine.resume();
      
      const card = cb.closest('.checklist-item');
      if (card) {
        if (cb.checked) {
          card.classList.add('checked');
        } else {
          card.classList.remove('checked');
        }
      }
      updateProgress(true);
    });
  });

  // Bind mode toggle buttons
  const setMode = (mode) => {
    AudioEngine.resume();
    currentMode = mode;
    localStorage.setItem('recoveryMode', mode);
    loadSavedChecklist();
    AudioEngine.playPopSound(400);
  };

  if (activeModeBtn) {
    activeModeBtn.addEventListener('click', () => setMode('active'));
  }
  if (guidedModeBtn) {
    guidedModeBtn.addEventListener('click', () => setMode('guided'));
  }

  // Initial load
  loadSavedChecklist();
})();
