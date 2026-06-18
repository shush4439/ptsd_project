/**
 * Focus Tools Screen Script
 */
(() => {
  // --- Tab Navigation Setup ---
  const tabZenPop = document.getElementById('tab-zen-pop');
  const tabCalmMaze = document.getElementById('tab-calm-maze');
  const zenContainer = document.getElementById('zen-pop-container');
  const mazeContainer = document.getElementById('calm-maze-container');

  const switchTab = (activeTab) => {
    if (!tabZenPop || !tabCalmMaze || !zenContainer || !mazeContainer) return;
    tabZenPop.classList.remove('active');
    tabCalmMaze.classList.remove('active');
    zenContainer.classList.add('hidden');
    mazeContainer.classList.add('hidden');

    if (activeTab === 'zen') {
      tabZenPop.classList.add('active');
      zenContainer.classList.remove('hidden');
      stopMaze();
    } else {
      tabCalmMaze.classList.add('active');
      mazeContainer.classList.remove('hidden');
      stopZenPop();
      initMaze();
    }
  };

  if (tabZenPop) tabZenPop.addEventListener('click', () => switchTab('zen'));
  if (tabCalmMaze) tabCalmMaze.addEventListener('click', () => switchTab('maze'));

  // --- Zen Pop Bubble Game Implementation ---
  const playfield = document.getElementById('pop-playfield');
  const startOverlay = document.getElementById('game-start-overlay');
  const startBtn = document.getElementById('start-game-btn');
  const resetBtn = document.getElementById('reset-game-btn');
  const scoreEl = document.getElementById('pop-score');

  let popScore = 0;
  let isGameRunning = false;
  let bubbleSpawner = null;
  let animFrameId = null;
  let activeBubbles = [];

  const pentatonicScale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];

  const startZenPop = () => {
    isGameRunning = true;
    popScore = 0;
    if (scoreEl) scoreEl.textContent = popScore;
    if (startOverlay) startOverlay.style.display = 'none';
    
    // Start Spawner
    bubbleSpawner = setInterval(spawnBubble, 1000);
    // Start Anim Loop
    updateBubbles();
  };

  const stopZenPop = () => {
    isGameRunning = false;
    clearInterval(bubbleSpawner);
    if (animFrameId) cancelAnimationFrame(animFrameId);
    
    // Clear DOM bubbles
    activeBubbles.forEach(b => {
      if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
    });
    activeBubbles = [];

    if (startOverlay) startOverlay.style.display = 'flex';
  };

  const spawnBubble = () => {
    if (!isGameRunning || !playfield) return;
    
    const size = Math.floor(Math.random() * 25) + 45; // 45px to 70px
    const startX = Math.floor(Math.random() * (playfield.clientWidth - size * 2)) + size;
    const startY = playfield.clientHeight + size; // off bottom screen

    const bubbleEl = document.createElement('div');
    bubbleEl.className = 'bubble';
    bubbleEl.style.width = `${size}px`;
    bubbleEl.style.height = `${size}px`;
    bubbleEl.style.left = `${startX}px`;
    bubbleEl.style.top = `${startY}px`;

    // Click handler for popping
    bubbleEl.addEventListener('mousedown', (e) => popBubble(bubbleEl, startX, e.clientY));
    bubbleEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = playfield.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      popBubble(bubbleEl, x, y);
    });

    playfield.appendChild(bubbleEl);
    
    activeBubbles.push({
      el: bubbleEl,
      size: size,
      x: startX,
      y: startY,
      vy: Math.random() * 0.8 + 0.8, // Speed float up
      swingSpeed: Math.random() * 0.02 + 0.015,
      swingAmp: Math.random() * 1.5 + 0.8,
      seed: Math.random() * 100
    });
  };

  const popBubble = (bubbleEl, x, y) => {
    const idx = activeBubbles.findIndex(b => b.el === bubbleEl);
    if (idx === -1) return;

    const bubbleObj = activeBubbles[idx];
    activeBubbles.splice(idx, 1);
    
    if (bubbleEl.parentNode) bubbleEl.parentNode.removeChild(bubbleEl);

    // Audio tone
    const randPitch = pentatonicScale[Math.floor(Math.random() * pentatonicScale.length)];
    AudioEngine.playPopSound(randPitch);

    spawnParticles(x, y);

    popScore++;
    if (scoreEl) scoreEl.textContent = popScore;
  };

  const spawnParticles = (x, y) => {
    if (!playfield) return;
    const numParticles = 8;
    const particles = [];
    
    for (let i = 0; i < numParticles; i++) {
      const p = document.createElement('div');
      p.className = 'bubble-particle';
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      playfield.appendChild(p);

      const angle = (i / numParticles) * Math.PI * 2 + Math.random() * 0.4;
      const speed = Math.random() * 3 + 2;
      
      particles.push({
        el: p,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1
      });
    }

    const updateParticles = () => {
      let activeParticles = false;
      particles.forEach(p => {
        if (p.alpha <= 0) {
          if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
          return;
        }
        activeParticles = true;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.alpha -= 0.035;
        p.el.style.left = `${p.x}px`;
        p.el.style.top = `${p.y}px`;
        p.el.style.opacity = p.alpha;
      });

      if (activeParticles) {
        requestAnimationFrame(updateParticles);
      }
    };
    
    requestAnimationFrame(updateParticles);
  };

  const updateBubbles = () => {
    if (!isGameRunning) return;
    
    const time = Date.now();
    activeBubbles.forEach((bubble, idx) => {
      bubble.y -= bubble.vy;
      bubble.x += Math.sin((time * bubble.swingSpeed) + bubble.seed) * bubble.swingAmp * 0.4;
      
      bubble.el.style.top = `${bubble.y}px`;
      bubble.el.style.left = `${bubble.x}px`;

      if (bubble.y < -bubble.size) {
        if (bubble.el.parentNode) bubble.el.parentNode.removeChild(bubble.el);
        activeBubbles.splice(idx, 1);
      }
    });

    animFrameId = requestAnimationFrame(updateBubbles);
  };

  if (startBtn) startBtn.addEventListener('click', startZenPop);
  if (resetBtn) resetBtn.addEventListener('click', () => {
    stopZenPop();
    startZenPop();
  });

  // --- Calm Path Tracing Implementation ---
  const playfieldMaze = document.getElementById('maze-playfield');
  const mazeSvg = document.getElementById('maze-svg');
  const mazePathBg = document.getElementById('maze-path-bg');
  const mazePathTrack = document.getElementById('maze-path-track');
  const mazePathDraw = document.getElementById('maze-path-draw');
  const mazeStatus = document.getElementById('maze-status');
  const mazeStart = document.getElementById('maze-start');
  const mazeEnd = document.getElementById('maze-end');
  const mazeCursor = document.getElementById('maze-cursor');

  let isTracing = false;
  let reachedEnd = false;
  let maxProgressReached = 0; // Value between 0 and 1
  let lastPlayedPercent = 0; // Tones tracking (0 to 10)
  
  // Stages config
  const calmPaths = [
    {
      level: 1,
      d: "M 50,150 C 120,50 180,250 250,150",
      start: { x: 50, y: 150 },
      end: { x: 250, y: 150 },
      bgWidth: 36,
      trackWidth: 54
    },
    {
      level: 2,
      d: "M 150,50 C 250,50 250,250 150,250 C 50,250 50,100 150,100 C 210,100 210,190 150,190",
      start: { x: 150, y: 50 },
      end: { x: 150, y: 190 },
      bgWidth: 32,
      trackWidth: 48
    },
    {
      level: 3,
      d: "M 50,70 C 50,250 120,250 120,150 C 120,50 190,50 190,150 C 190,250 250,250 250,150",
      start: { x: 50, y: 70 },
      end: { x: 250, y: 150 },
      bgWidth: 28,
      trackWidth: 44
    },
    {
      level: 4,
      d: "M 60,120 C 60,60 140,60 150,150 C 160,240 240,240 240,180 C 240,120 160,120 150,150 C 140,240 60,240 60,180",
      start: { x: 60, y: 120 },
      end: { x: 60, y: 180 },
      bgWidth: 26,
      trackWidth: 42
    },
    {
      level: 5,
      d: "M 40,50 C 250,20 250,120 150,120 C 50,120 50,200 260,200 C 150,200 50,220 260,260",
      start: { x: 40, y: 50 },
      end: { x: 260, y: 260 },
      bgWidth: 24,
      trackWidth: 40
    }
  ];
  let currentLevelIndex = 0;

  // Supportive messages when straying
  const encourageMessages = [
    "לאט ובקצב שלך",
    "אפשר לחזור למסלול בכל רגע",
    "הכול בסדר"
  ];
  let messageIndex = 0;

  // Dynamic overlay function
  const showCalmPathOverlay = (title, subtitle, buttonText, onClick) => {
    if (!playfieldMaze) return;
    
    // Remove existing overlay if any
    const existing = playfieldMaze.querySelector('.calm-path-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'game-start-overlay calm-path-overlay';
    overlay.style.animation = 'fadeIn 0.4s ease forwards';
    overlay.style.position = 'absolute';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(255, 255, 255, 0.9)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.padding = '24px';
    overlay.style.textAlign = 'center';
    overlay.style.gap = '16px';
    overlay.style.zIndex = '100';

    overlay.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:16px;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background-color: var(--color-success-light); color: var(--color-success); display: flex; justify-content: center; align-items: center; margin-bottom: 8px;">
          <i data-lucide="check-circle-2" style="width: 38px; height: 38px;"></i>
        </div>
        <h3 style="font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0;">${title}</h3>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin: 0; max-width: 250px;">${subtitle}</p>
        <button class="btn btn-primary" style="margin-top: 12px; min-width: 160px; padding: 12px 24px; border-radius: var(--border-radius-md); font-weight:600; cursor:pointer;">${buttonText}</button>
      </div>
    `;

    // Attach button event
    overlay.querySelector('button').addEventListener('click', () => {
      overlay.remove();
      onClick();
    });

    // Prevent touch/mouse events from bubbling up to playfieldMaze, which intercepts and prevents click activation on mobile
    ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup'].forEach(evt => {
      overlay.addEventListener(evt, (e) => {
        e.stopPropagation();
      });
    });

    playfieldMaze.appendChild(overlay);
    if (window.lucide) window.lucide.createIcons();
  };

  const initMaze = () => {
    reachedEnd = false;
    maxProgressReached = 0;
    lastPlayedPercent = 0;

    if (!playfieldMaze) return;

    // Remove any leftover overlays
    const existing = playfieldMaze.querySelector('.calm-path-overlay');
    if (existing) existing.remove();

    // Get current path config
    const pathConfig = calmPaths[currentLevelIndex];
    
    // Update SVG Path Attributes
    if (mazePathBg) {
      mazePathBg.setAttribute('d', pathConfig.d);
      mazePathBg.setAttribute('stroke-width', pathConfig.bgWidth);
    }
    if (mazePathTrack) {
      mazePathTrack.setAttribute('d', pathConfig.d);
      mazePathTrack.setAttribute('stroke-width', pathConfig.trackWidth);
    }
    if (mazePathDraw) {
      mazePathDraw.setAttribute('d', pathConfig.d);
      mazePathDraw.style.strokeDasharray = '';
      mazePathDraw.style.strokeDashoffset = '';
      mazePathDraw.setAttribute('class', 'maze-path-draw');
      
      // Calculate length
      try {
        const pathLength = mazePathTrack.getTotalLength();
        mazePathDraw.style.strokeDasharray = pathLength;
        mazePathDraw.style.strokeDashoffset = pathLength;
      } catch (e) {
        // Fallback lengths
        const fallbacks = [320, 320, 420, 480, 520];
        const len = fallbacks[currentLevelIndex] || 320;
        mazePathDraw.style.strokeDasharray = len;
        mazePathDraw.style.strokeDashoffset = len;
      }
    }

    // Update Start and End Circles
    if (mazeStart) {
      mazeStart.setAttribute('cx', pathConfig.start.x);
      mazeStart.setAttribute('cy', pathConfig.start.y);
    }
    if (mazeEnd) {
      mazeEnd.setAttribute('cx', pathConfig.end.x);
      mazeEnd.setAttribute('cy', pathConfig.end.y);
    }

    // Reset Cursor position
    if (mazeCursor) {
      mazeCursor.setAttribute('cx', pathConfig.start.x);
      mazeCursor.setAttribute('cy', pathConfig.start.y);
      mazeCursor.classList.add('hidden');
    }

    // Update level instruction indicators
    const instructionsEl = document.querySelector('.maze-instructions');
    if (instructionsEl) {
      instructionsEl.textContent = `שלב ${pathConfig.level} מתוך 5: הוליכו את האצבע מתחילת השביל ועד סופו.`;
    }

    if (mazeStatus) {
      mazeStatus.textContent = 'הניחו את האצבע על עיגול ההתחלה הירוק כדי להתחיל';
    }
  };

  const stopMaze = () => {
    isTracing = false;
  };

  const handleTraceStart = (clientX, clientY) => {
    if (reachedEnd || !mazeSvg || !mazePathTrack) return;
    
    AudioEngine.resume();
    
    const rect = mazeSvg.getBoundingClientRect();
    const x = (clientX - rect.left) * (300 / rect.width);
    const y = (clientY - rect.top) * (300 / rect.height);

    const pathConfig = calmPaths[currentLevelIndex];
    const distToStart = Math.hypot(x - pathConfig.start.x, y - pathConfig.start.y);
    
    let canStart = false;
    let pathLength = 320;
    try {
      pathLength = mazePathTrack.getTotalLength();
    } catch(e){}

    const currentPoint = mazePathTrack.getPointAtLength(maxProgressReached * pathLength);
    const distToCurrent = Math.hypot(x - currentPoint.x, y - currentPoint.y);

    if (distToStart < 45) { // Forgiving start area
      canStart = true;
      maxProgressReached = 0;
      lastPlayedPercent = 0;
    } else if (maxProgressReached > 0 && distToCurrent < 45) { // Forgiving resume area
      canStart = true;
    }

    if (canStart) {
      isTracing = true;
      if (mazePathDraw) {
        mazePathDraw.setAttribute('class', 'maze-path-draw');
      }
      
      if (mazeCursor) {
        const pt = mazePathTrack.getPointAtLength(maxProgressReached * pathLength);
        mazeCursor.setAttribute('cx', pt.x);
        mazeCursor.setAttribute('cy', pt.y);
        mazeCursor.classList.remove('hidden');
      }

      if (mazeStatus) mazeStatus.textContent = 'התקדמו לאורך השביל בנחת ובאיטיות...';
      AudioEngine.playPopSound(261.63);
    }
  };

  const handleTraceMove = (clientX, clientY) => {
    if (!isTracing || reachedEnd || !mazeSvg || !mazePathTrack) return;

    const rect = mazeSvg.getBoundingClientRect();
    const x = (clientX - rect.left) * (300 / rect.width);
    const y = (clientY - rect.top) * (300 / rect.height);

    let pathLength = 320;
    try {
      pathLength = mazePathTrack.getTotalLength();
    } catch(e){}

    let closestLength = 0;
    let minDistance = Infinity;

    for (let l = 0; l <= pathLength; l += 4) {
      const pt = mazePathTrack.getPointAtLength(l);
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist < minDistance) {
        minDistance = dist;
        closestLength = l;
      }
    }

    const isOnPath = minDistance < 45; // Forgiving width

    if (!isOnPath) {
      if (mazeStatus && !mazeStatus.textContent.includes(encourageMessages[0]) && !mazeStatus.textContent.includes(encourageMessages[1]) && !mazeStatus.textContent.includes(encourageMessages[2])) {
        mazeStatus.textContent = encourageMessages[messageIndex];
        messageIndex = (messageIndex + 1) % encourageMessages.length;
      }
      return;
    }

    const progress = closestLength / pathLength;

    if (progress > maxProgressReached) {
      // Prevent cheating/jumping to close segments of different path parts
      if (progress - maxProgressReached > 0.20) {
        return;
      }
      
      maxProgressReached = progress;

      if (mazePathDraw) {
        mazePathDraw.style.strokeDashoffset = pathLength * (1 - maxProgressReached);
      }

      const currentPercent = Math.floor(maxProgressReached * 10);
      if (currentPercent > lastPlayedPercent) {
        lastPlayedPercent = currentPercent;
        const tones = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
        const tone = tones[Math.min(currentPercent, tones.length - 1)];
        AudioEngine.playPopSound(tone);
      }
    }

    if (mazeCursor) {
      const pt = mazePathTrack.getPointAtLength(maxProgressReached * pathLength);
      mazeCursor.setAttribute('cx', pt.x);
      mazeCursor.setAttribute('cy', pt.y);
    }

    if (mazeStatus) {
      mazeStatus.textContent = 'שאיפה... נשיפה... המשיכו לאורך המסלול.';
    }

    if (maxProgressReached >= 0.96) {
      isTracing = false;
      reachedEnd = true;

      if (mazePathDraw) {
        mazePathDraw.setAttribute('class', 'maze-path-draw complete');
      }

      if (mazeCursor) {
        mazeCursor.classList.add('hidden');
      }

      // Check if it's the last level
      if (currentLevelIndex < 4) {
        // Play level success chimes
        AudioEngine.playPopSound(523.25);
        setTimeout(() => AudioEngine.playPopSound(659.25), 150);

        // Display transition screen
        const nextLevelNum = currentLevelIndex + 2;
        const subtextOptions = [
          "התקדמות נהדרת! המשיכו בקצב שנוח לכם.",
          "נשימה עמוקה וממשיכים בנחת.",
          "אתם מתקדמים נהדר. קחו נשימה עמוקה.",
          "המשך בקצב שנוח לך, ללא שום לחץ."
        ];
        
        showCalmPathOverlay(
          "מצוין!",
          subtextOptions[currentLevelIndex],
          `המשך לשלב ${nextLevelNum}`,
          () => {
            currentLevelIndex++;
            initMaze();
          }
        );
      } else {
        // Final completion screen!
        AudioEngine.playPopSound(523.25);
        setTimeout(() => AudioEngine.playPopSound(659.25), 150);
        setTimeout(() => AudioEngine.playPopSound(783.99), 300);
        setTimeout(() => AudioEngine.playPopSound(1046.50), 450);

        showCalmPathOverlay(
          "כל הכבוד",
          "השלמת את התרגיל בהצלחה.<br>קח רגע לשים לב לנשימה שלך.",
          "תרגול מחדש",
          () => {
            currentLevelIndex = 0;
            initMaze();
          }
        );
      }
    }
  };

  const handleTraceEnd = () => {
    if (isTracing) {
      isTracing = false;
      if (mazeStatus) {
        if (reachedEnd) return;
        mazeStatus.textContent = 'אפשר להמשיך מהנקודה האחרונה בכל עת';
      }
    }
  };

  // Bind mouse/touch events for Calm Path
  if (playfieldMaze) {
    playfieldMaze.addEventListener('mousedown', (e) => handleTraceStart(e.clientX, e.clientY));
    playfieldMaze.addEventListener('mousemove', (e) => handleTraceMove(e.clientX, e.clientY));
    
    playfieldMaze.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleTraceStart(touch.clientX, touch.clientY);
    }, { passive: false });
    
    playfieldMaze.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handleTraceMove(touch.clientX, touch.clientY);
    }, { passive: false });
  }

  // Global listeners for mouse release and touch cancel to prevent interaction locks
  window.addEventListener('mouseup', handleTraceEnd);
  window.addEventListener('touchend', handleTraceEnd);
  window.addEventListener('touchcancel', handleTraceEnd);

  // Start Zen Pop initially
  startZenPop();

  // Screen cleanup hook
  window.activeScreenCleanup = () => {
    stopZenPop();
    stopMaze();
    window.removeEventListener('mouseup', handleTraceEnd);
    window.removeEventListener('touchend', handleTraceEnd);
    window.removeEventListener('touchcancel', handleTraceEnd);
  };
})();
