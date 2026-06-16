/**
 * Grounding Screen Script
 */
(() => {
  const grid = document.getElementById('grounding-items-grid');
  const nextBtn = document.getElementById('grounding-next-btn');
  const stepCard = document.getElementById('grounding-step-card');
  const stepDots = document.querySelectorAll('.step-progress .progress-dot');
  
  let currentStep = 5; // Start with 5 (See)
  
  const stepData = {
    5: {
      title: 'ראייה',
      desc: 'התמקדו בסביבה שלכם. זהו ולחצו על 5 דברים שונים שאתם יכולים לראות.',
      items: [
        'חלון, דלת או מקור אור',
        'חפץ עשוי עץ או מתכת',
        'חפץ בצבע כחול או ירוק',
        'דוגמה או מרקם על משטח (שטיח, קיר)',
        'צל או השתקפות'
      ]
    },
    4: {
      title: 'מגע',
      desc: 'התמקדו בתחושות הפיזיות. זהו ולחצו על 4 דברים שאתם מרגישים בגוף או במגע.',
      items: [
        'התמיכה היציבה של הכיסא או הרצפה',
        'מרקם הבד של הבגדים שלכם',
        'טמפרטורת האוויר על העור שלכם',
        'המשקל החלק של המכשיר ביד שלכם'
      ]
    },
    3: {
      title: 'שמיעה',
      desc: 'הקשיבו למרחב סביבכם. זהו ולחצו על 3 צלילים שונים שאתם שומעים.',
      items: [
        'צליל בתוך החדר (שעון, מזגן, זמזום)',
        'צליל מחוץ לחדר (ציפורים, רוח, כביש)',
        'הקול העדין של השאיפה שלכם'
      ]
    },
    2: {
      title: 'ריח',
      desc: 'שימו לב לריחות סביבכם. זהו ולחצו על 2 ריחות שונים.',
      items: [
        'ריח בסביבה המיידית (סבון, כביסה, כוס תה)',
        'ריח נייטרלי (האוויר, כף היד, דף נייר)'
      ]
    },
    1: {
      title: 'טעם',
      desc: 'החזירו את המיקוד אל הגוף. זהו ולחצו על דבר אחד שאתם יכולים לטעום.',
      items: [
        'הטעם הנוכחי בפה (מים, מנטה, טעם נייטרלי)'
      ]
    }
  };

  const renderStep = () => {
    if (!grid || !nextBtn) return;
    
    const data = stepData[currentStep];
    
    // Update step dots
    stepDots.forEach(dot => {
      const stepVal = parseInt(dot.getAttribute('data-step'));
      dot.classList.remove('active', 'completed');
      
      if (stepVal === currentStep) {
        dot.classList.add('active');
      } else if (stepVal > currentStep) {
        dot.classList.add('completed');
        dot.innerHTML = `<i data-lucide="check" style="width:14px; height:14px; stroke-width:3px;"></i>`;
      } else {
        dot.textContent = stepVal; // Restore number
      }
    });
    
    if (window.lucide) window.lucide.createIcons();

    // Update Card Text
    document.getElementById('step-number-title').textContent = `שלב ${currentStep}`;
    document.getElementById('step-instruction-title').textContent = data.title;
    document.getElementById('step-description').textContent = data.desc;

    // Clear and build items list
    grid.innerHTML = '';
    const checkedStates = new Array(data.items.length).fill(false);
    
    // Disable next button initially
    nextBtn.disabled = true;
    nextBtn.querySelector('span').textContent = `אשרו את כל הפריטים (${data.items.length}) להמשך`;

    data.items.forEach((itemText, idx) => {
      const card = document.createElement('div');
      card.className = 'grounding-item-card';
      card.innerHTML = `
        <div class="grounding-checkbox">
          <i data-lucide="check"></i>
        </div>
        <span class="grounding-item-text">${itemText}</span>
      `;

      card.addEventListener('click', () => {
        AudioEngine.resume();

        checkedStates[idx] = !checkedStates[idx];
        card.classList.toggle('checked', checkedStates[idx]);

        // Synthesize calming pop feedback
        if (checkedStates[idx]) {
          AudioEngine.playPopSound(350 + idx * 60); // Ascending calm tones
        } else {
          AudioEngine.playPopSound(250); // Lower tone on uncheck
        }

        // Check completion
        const allChecked = checkedStates.every(state => state === true);
        if (allChecked) {
          nextBtn.disabled = false;
          nextBtn.querySelector('span').textContent = currentStep === 1 ? 'סיום התרגיל' : 'המשך';
        } else {
          nextBtn.disabled = true;
          const remaining = checkedStates.filter(s => !s).length;
          nextBtn.querySelector('span').textContent = `אשרו את כל הפריטים (${remaining}) להמשך`;
        }
      });

      grid.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  };

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep--;
        renderStep();
      } else {
        // Grounding finished!
        if (stepCard) {
          stepCard.innerHTML = `
            <div style="text-align: center; margin: auto; padding: 40px 0; display:flex; flex-direction:column; align-items:center; gap:20px;">
              <div style="width: 72px; height: 72px; border-radius:50%; background-color:var(--color-success-light); color:var(--color-success); display:flex; justify-content:center; align-items:center;">
                <i data-lucide="check-circle-2" style="width: 48px; height: 48px;"></i>
              </div>
              <h1 style="font-size:26px; font-weight:700;">הקרקוע הושלם</h1>
              <p style="color:var(--text-secondary); max-width:240px; font-size:14px; line-height:1.5;">תרגלתם בצורה נהדרת. כעת נתמקד בשמירה על היציבות הזו.</p>
            </div>
          `;
          if (window.lucide) window.lucide.createIcons();
        }
        
        if (nextBtn) nextBtn.style.display = 'none';

        setTimeout(() => {
          window.navigate('recovery'); // Go to Recovery checklist to settle down
        }, 2500);
      }
    });
  }

  // Render first step
  renderStep();
})();
