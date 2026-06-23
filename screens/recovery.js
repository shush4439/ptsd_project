/**
 * Recovery Plan Screen Script
 */
(() => {
  const checkboxes = document.querySelectorAll('.checklist-cb');
  const progressBar = document.getElementById('recovery-progress-bar');
  const percentEl = document.getElementById('recovery-percent');
  const tipEl = document.getElementById('recovery-tip');

  // Load saved checklist state
  const loadSavedChecklist = () => {
    const saved = localStorage.getItem('recoveryChecklist');
    let checkedStates = [false, false, false, false, false];
    
    if (saved) {
      checkedStates = JSON.parse(saved);
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

    // Save states
    localStorage.setItem('recoveryChecklist', JSON.stringify(checkedStates));

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

  // Initial load
  loadSavedChecklist();
})();
