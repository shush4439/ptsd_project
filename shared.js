/**
 * HelpP - PTSD Crisis Support App
 * Shared JavaScript Engine (Router, State, and Audio Synth)
 */

// Global App State
const AppState = {
  userMode: 'guest', // 'guest' or 'logged_in'
  accessibilityMode: false, // high contrast
  savedContacts: [],
  currentRoute: '',
  allowHomeAccess: false, // home screen restriction
  navigationSource: 'home', // Tracks entry origin for emergency mode ('home' | 'emergencyMode')
  audio: {
    ctx: null,
    rain: { node: null, gain: null, playing: false, volume: 0.5 },
    ocean: { node: null, gain: null, playing: false, volume: 0.5 },
    wind: { node: null, gain: null, playing: false, volume: 0.5 },
    binaural: { leftOsc: null, rightOsc: null, gain: null, playing: false, volume: 0.5 },
    masterGain: null
  }
};
window.AppState = AppState;

// Default Contacts to pre-populate (for prototype presentation quality)
const DEFAULT_CONTACTS = [
  { id: 'c1', name: 'ד״ר שרה ג׳נקינס', phone: '555-0199', relation: 'מטפלת' },
  { id: 'c2', name: 'אלכס ריברה', phone: '555-0143', relation: 'בן זוג' },
  { id: 'c3', name: 'אמא', phone: '555-0188', relation: 'משפחה' }
];

// Screen initializers registry
window.screenInitializers = {};

// Initialize application on load
document.addEventListener('DOMContentLoaded', () => {
  initAppState();
  initRouter();
  initDeviceTime();
  initGlobalEvents();
});

// Update mockup device clock
function initDeviceTime() {
  const timeElement = document.getElementById('status-time');
  if (!timeElement) return;
  
  const updateClock = () => {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    timeElement.textContent = `${hours}:${minutes}`;
  };
  
  updateClock();
  setInterval(updateClock, 30000);
}

// Initialize LocalStorage state and trigger background API sync
function initAppState() {
  // Load mode from cache
  AppState.userMode = localStorage.getItem('userMode') || 'guest';
  
  // Load accessibility setting from cache
  const hc = localStorage.getItem('accessibilityMode') === 'true';
  AppState.accessibilityMode = hc;
  if (hc) {
    document.body.classList.add('high-contrast');
  } else {
    document.body.classList.remove('high-contrast');
  }

  // Load contacts from cache
  const saved = localStorage.getItem('savedContacts');
  if (saved) {
    AppState.savedContacts = JSON.parse(saved);
  } else {
    AppState.savedContacts = [...DEFAULT_CONTACTS];
    localStorage.setItem('savedContacts', JSON.stringify(AppState.savedContacts));
  }

  // Asynchronously synchronize user profile, settings, and contacts from PostgreSQL
  syncAppStateWithBackend();
}

// Asynchronously sync local cache with the PostgreSQL backend
async function syncAppStateWithBackend() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Auth check failed');
    const data = await res.json();
    
    if (data.authenticated) {
      AppState.userMode = data.user.login_method === 'guest' ? 'guest' : 'logged_in';
      localStorage.setItem('userMode', AppState.userMode);

      // Sync settings from backend
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const settings = settingsData.settings;
        if (settings) {
          AppState.accessibilityMode = settings.accessibility_mode;
          localStorage.setItem('accessibilityMode', settings.accessibility_mode);
          if (settings.accessibility_mode) {
            document.body.classList.add('high-contrast');
          } else {
            document.body.classList.remove('high-contrast');
          }
          
          AppState.allowHomeAccess = settings.allow_home_access;
        }
      }

      // Sync contacts from backend
      const contactsRes = await fetch('/api/contacts');
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const dbContacts = contactsData.contacts;
        if (dbContacts && dbContacts.length > 0) {
          AppState.savedContacts = dbContacts.map(c => ({
            id: c.id,
            name: c.name,
            phone: c.phone,
            relation: c.relation
          }));
          localStorage.setItem('savedContacts', JSON.stringify(AppState.savedContacts));
          
          // Trigger re-render of support screen list if active
          document.dispatchEvent(new CustomEvent('contactsSynced'));
        }
      }

      // Execute offline queue sync
      await syncOfflineQueue();

      // If we are currently on the login screen, automatically redirect to emergency-mode
      const currentHash = window.location.hash;
      if (!currentHash || currentHash === '#/login' || currentHash === '') {
        window.navigate('emergency-mode');
      }
    } else {
      // If not authenticated and we are not on the login screen, redirect to login
      const currentHash = window.location.hash;
      if (currentHash && currentHash !== '#/login') {
        window.navigate('login');
      }
    }
  } catch (err) {
    console.warn('[Sync] Offline or backend unreachable. Running with local cache fallback.', err.message);
  }
}

// Queue for offline mutations
async function syncOfflineQueue() {
  if (!navigator.onLine) return;
  const queue = JSON.parse(localStorage.getItem('pendingSync') || '[]');
  if (queue.length === 0) return;

  console.log(`[Sync] Processing ${queue.length} offline operations...`);
  const failedOps = [];

  for (const op of queue) {
    try {
      if (op.type === 'save_contact') {
        await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
      } else if (op.type === 'delete_contact') {
        await fetch(`/api/contacts/${op.data}`, { method: 'DELETE' });
      } else if (op.type === 'save_settings') {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(op.data)
        });
      }
    } catch (err) {
      console.error('[Sync] Operational sync failed, preserving in queue:', err.message);
      failedOps.push(op);
    }
  }

  localStorage.setItem('pendingSync', JSON.stringify(failedOps));
  if (failedOps.length === 0) {
    console.log('[Sync] Offline sync successfully completed!');
  }
}

// Global API syncing helpers
window.apiSaveContact = async (contact) => {
  // Update local AppState
  const idx = AppState.savedContacts.findIndex(c => c.id === contact.id);
  if (idx > -1) {
    AppState.savedContacts[idx] = contact;
  } else {
    AppState.savedContacts.push(contact);
  }
  localStorage.setItem('savedContacts', JSON.stringify(AppState.savedContacts));

  // Sync to database
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contact)
      });
      if (res.ok) return;
    } catch (err) {
      console.warn('[API Sync] Save contact failed, queuing...', err.message);
    }
  }

  // Offline Fallback
  const queue = JSON.parse(localStorage.getItem('pendingSync') || '[]');
  queue.push({ type: 'save_contact', data: contact });
  localStorage.setItem('pendingSync', JSON.stringify(queue));
};

window.apiDeleteContact = async (contactId) => {
  // Update local AppState
  AppState.savedContacts = AppState.savedContacts.filter(c => c.id !== contactId);
  localStorage.setItem('savedContacts', JSON.stringify(AppState.savedContacts));
  
  // Sync to database
  if (navigator.onLine) {
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (res.ok) return;
    } catch (err) {
      console.warn('[API Sync] Delete contact failed, queuing...', err.message);
    }
  }

  // Offline Fallback
  const queue = JSON.parse(localStorage.getItem('pendingSync') || '[]');
  queue.push({ type: 'delete_contact', data: contactId });
  localStorage.setItem('pendingSync', JSON.stringify(queue));
};

window.apiSaveSettings = async (settings) => {
  // Update local AppState
  if (settings.accessibility_mode !== undefined) {
    AppState.accessibilityMode = settings.accessibility_mode;
    localStorage.setItem('accessibilityMode', settings.accessibility_mode);
  }
  if (settings.allow_home_access !== undefined) {
    AppState.allowHomeAccess = settings.allow_home_access;
  }

  // Sync to database
  if (navigator.onLine) {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) return;
    } catch (err) {
      console.warn('[API Sync] Save settings failed, queuing...', err.message);
    }
  }

  // Offline Fallback
  const queue = JSON.parse(localStorage.getItem('pendingSync') || '[]');
  queue.push({ type: 'save_settings', data: settings });
  localStorage.setItem('pendingSync', JSON.stringify(queue));
};

// Monitor online state to fire background synchronization
window.addEventListener('online', syncOfflineQueue);


// Router Implementation
function initRouter() {
  const container = document.getElementById('screen-container');
  const styleLink = document.getElementById('screen-styles');

  // Load screen HTML and CSS
  const loadScreen = async (screenName) => {
    // Auth Guard: unauthenticated users must stay on login screen
    const mode = localStorage.getItem('userMode');
    const isAuthenticated = (mode === 'guest' || mode === 'logged_in');
    if (!isAuthenticated && screenName !== 'login') {
      window.navigate('login');
      return;
    }

    // Home Restricted Access Guard
    if (screenName === 'home' && !AppState.allowHomeAccess) {
      window.navigate('emergency-mode');
      return;
    }

    try {
      // Clean up previous screen events if active
      if (typeof window.activeScreenCleanup === 'function') {
        try {
          window.activeScreenCleanup();
        } catch (e) {
          console.error("Screen cleanup error:", e);
        }
        window.activeScreenCleanup = null;
      }

      // 1. Fetch stylesheet and apply it
      styleLink.href = `screens/${screenName}.css`;
      
      // 2. Fetch screen HTML
      const response = await fetch(`screens/${screenName}.html`);
      if (!response.ok) throw new Error(`Could not load screens/${screenName}.html`);
      const htmlContent = await response.text();

      // 3. Apply animation transition classes
      container.classList.add('screen-slide-out-left');
      
      // Short delay for slide out
      setTimeout(() => {
        container.innerHTML = htmlContent;
        container.classList.remove('screen-slide-out-left');
        container.classList.add('screen-slide-in-right');
        
        // Re-trigger Lucide icon replacement for newly injected HTML
        if (window.lucide) {
          window.lucide.createIcons();
        }

        // 4. Load screen JavaScript dynamically
        const oldScript = document.getElementById('screen-script');
        if (oldScript) oldScript.remove();

        const script = document.createElement('script');
        script.id = 'screen-script';
        script.src = `screens/${screenName}.js`;
        document.body.appendChild(script);

        AppState.currentRoute = screenName;
        
        // Update body class for route-specific layout rules
        if (document.body) {
          const classesToRemove = [];
          document.body.classList.forEach(cls => {
            if (cls.startsWith('route-')) {
              classesToRemove.push(cls);
            }
          });
          classesToRemove.forEach(cls => document.body.classList.remove(cls));
          document.body.classList.add(`route-${screenName}`);
        }

        // Save last route
        localStorage.setItem('lastRoute', screenName);

        // Update context source origin state
        if (screenName === 'emergency-mode') {
          AppState.navigationSource = 'emergencyMode';
        } else if (screenName === 'home' || screenName === 'login') {
          AppState.navigationSource = 'home';
        }
        
        // Remove animation class after completion
        setTimeout(() => {
          container.classList.remove('screen-slide-in-right');
        }, 400);

      }, 200);

      updateNavbarActiveState(screenName);
      
      // Emergency-mode screen and login screen hides/customizes some navigation
      const navBar = document.getElementById('bottom-nav');
      const sosBtn = document.getElementById('floating-sos-btn');
      
      if (screenName === 'login') {
        sosBtn.style.display = 'none';
        navBar.style.display = 'none';
      } else if (screenName === 'home') {
        sosBtn.style.display = 'flex';
        navBar.style.display = 'flex';
      } else {
        sosBtn.style.display = 'flex';
        navBar.style.display = 'none';
      }

    } catch (err) {
      console.error('Routing Error:', err);
      container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
          <h2 style="color:var(--color-accent); margin-bottom:12px;">שגיאה בטעינת המסך</h2>
          <p style="color:var(--text-secondary); margin-bottom:24px;">אנא נסו לרענן את הדף או לחצו למטה כדי לחזור לדף הבית.</p>
          <button onclick="navigate('home')" class="btn btn-primary">חזרה לדף הבית</button>
        </div>
      `;
    }
  };

  // Global navigate function
  window.navigate = (route) => {
    if (route === 'login') {
      // Clear session / logout
      localStorage.removeItem('userMode');
      AppState.userMode = 'guest'; // Reset to default guest mode
      AppState.allowHomeAccess = false; // Reset home access
      
      // Call backend logout
      fetch('/api/auth/logout', { method: 'POST' }).catch(err => {
        console.warn('[API Sync] Backend logout call failed:', err.message);
      });
    }
    history.pushState({ route }, '', `#/${route}`);
    loadScreen(route);
  };

  // Intercept click events for SPA links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-link]');
    if (link) {
      e.preventDefault();
      let route = link.getAttribute('href');
      
      // Dynamic back button redirection context override
      if (link.classList.contains('back-btn') && route === 'home') {
        if (AppState.navigationSource === 'emergencyMode') {
          route = 'emergency-mode';
        }
      }
      
      window.navigate(route);
    }
  });

  // Handle browser back/forward buttons
  window.addEventListener('popstate', (e) => {
    let route = 'login';
    if (e.state && e.state.route) {
      route = e.state.route;
    } else {
      const hash = window.location.hash;
      if (hash.startsWith('#/')) {
        route = hash.replace('#/', '');
      } else {
        // Fallback to saved or default
        route = localStorage.getItem('lastRoute') || 'login';
      }
    }
    loadScreen(route);
  });

  // Floating SOS Button: Long Press vs Short Tap Logic
  const sosBtn = document.getElementById('floating-sos-btn');
  if (sosBtn) {
    let pressTimer = null;
    let isLongPress = false;
    let isPressed = false;
    let startX = 0;
    let startY = 0;
    const longPressDuration = 1000; // Strictly 1000ms

    // Drag-to-edge constraint state variables
    let isDragging = false;
    let initialLeft = 20;
    let initialTop = 0;
    let parentWidth = 0;
    let parentHeight = 0;
    let btnWidth = 0;
    let btnHeight = 0;

    // Circular progress tracking
    let animationFrameId = null;
    const progressCircle = sosBtn.querySelector('.sos-progress-fg');
    const circumference = 185.4;

    const resetHoldingState = () => {
      sosBtn.classList.remove('holding');
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (progressCircle) {
        progressCircle.style.strokeDashoffset = circumference;
      }
    };

    // Calculate boundary and snap the button to left/right edge
    const snapToEdge = () => {
      const parent = sosBtn.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const currentLeft = sosBtn.offsetLeft;
      const leftBound = 20;
      const rightBound = parentRect.width - btnWidth - 20;
      const midpoint = (parentRect.width - btnWidth) / 2;

      // Snapping strictly to the left edge or right edge
      const targetLeft = currentLeft < midpoint ? leftBound : rightBound;

      // Animate movement smoothly on snap release (both X and Y)
      sosBtn.style.transition = 'left 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2), top 0.3s cubic-bezier(0.25, 0.8, 0.25, 1.2)';
      sosBtn.style.left = `${targetLeft}px`;

      // Clear the transition property after animation completes
      setTimeout(() => {
        sosBtn.style.transition = '';
      }, 300);
    };

    const startPress = (e) => {
      if (isPressed) return;
      if (e.type === 'mousedown' && e.button !== 0) return; // Left click only

      isPressed = true;
      isLongPress = false;
      isDragging = false;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX = clientX;
      startY = clientY;

      // Cache size variables dynamically for responsive viewports
      const parent = sosBtn.parentElement;
      parentWidth = parent ? parent.getBoundingClientRect().width : 412;
      parentHeight = parent ? parent.getBoundingClientRect().height : 732;
      btnWidth = sosBtn.offsetWidth || 62;
      btnHeight = sosBtn.offsetHeight || 62;
      initialLeft = sosBtn.offsetLeft;
      initialTop = sosBtn.offsetTop;

      // Visual holding state
      sosBtn.classList.add('holding');
      const startTime = performance.now();

      const updateProgress = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / longPressDuration, 1);
        if (progressCircle) {
          progressCircle.style.strokeDashoffset = circumference * (1 - progress);
        }
        if (progress < 1) {
          animationFrameId = requestAnimationFrame(updateProgress);
        }
      };

      animationFrameId = requestAnimationFrame(updateProgress);

      pressTimer = setTimeout(() => {
        isLongPress = true;
        isPressed = false;
        resetHoldingState();
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        window.navigate('emergency-mode');
      }, longPressDuration);
    };

    const endPress = (e) => {
      if (!isPressed) return;
      isPressed = false;
      clearTimeout(pressTimer);
      resetHoldingState();

      if (isDragging) {
        snapToEdge();
        isDragging = false;
      }
    };

    const cancelPress = (e) => {
      if (!isPressed) return;
      isPressed = false;
      clearTimeout(pressTimer);
      resetHoldingState();

      if (isDragging) {
        snapToEdge();
        isDragging = false;
      }
    };

    const movePress = (e) => {
      if (!isPressed) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      // Trigger dragging mode if dragging exceeds 10px threshold in either direction
      if (!isDragging && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isDragging = true;
        clearTimeout(pressTimer);
        resetHoldingState();
      }

      if (isDragging) {
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;
        
        const leftBound = 20;
        const rightBound = parentWidth - btnWidth - 20;
        const topBound = 20;
        const bottomBound = parentHeight - btnHeight - 20;
        
        // Keep button strictly constrained within bounds
        newLeft = Math.max(leftBound, Math.min(newLeft, rightBound));
        newTop = Math.max(topBound, Math.min(newTop, bottomBound));
        
        sosBtn.style.left = `${newLeft}px`;
        sosBtn.style.top = `${newTop}px`;
        sosBtn.style.bottom = 'auto';
        sosBtn.style.right = 'auto';
      }
    };

    sosBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    // Desktop mouse dragging support: Bind to document to prevent drag interruption when cursor leaves button bounds
    const moveDragMouse = (e) => {
      movePress(e);
    };

    const endDragMouse = (e) => {
      endPress(e);
      document.removeEventListener('mousemove', moveDragMouse);
      document.removeEventListener('mouseup', endDragMouse);
    };

    sosBtn.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      e.preventDefault(); // Prevent text selection/drag ghosting
      startPress(e);
      document.addEventListener('mousemove', moveDragMouse);
      document.addEventListener('mouseup', endDragMouse);
    });

    sosBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startPress(e);
    }, { passive: false });
    sosBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      endPress(e);
    }, { passive: false });
    sosBtn.addEventListener('touchmove', (e) => {
      e.preventDefault();
      movePress(e);
    }, { passive: false });
    sosBtn.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      cancelPress(e);
    }, { passive: false });
  }

  // Initial Route Load
  const initialHash = window.location.hash;
  let startRoute = 'login';
  const mode = localStorage.getItem('userMode');
  const isAuthenticated = (mode === 'guest' || mode === 'logged_in');

  if (initialHash.startsWith('#/')) {
    const requestedRoute = initialHash.replace('#/', '');
    // Enforce auth check on startup
    if (!isAuthenticated && requestedRoute !== 'login') {
      startRoute = 'login';
    } else if (requestedRoute === 'home') {
      // Home is never a landing page. Redirect to emergency-mode on startup
      startRoute = 'emergency-mode';
    } else {
      startRoute = requestedRoute;
    }
  } else {
    if (isAuthenticated) {
      startRoute = 'emergency-mode';
    }
  }
  
  // Set initial state
  history.replaceState({ route: startRoute }, '', `#/${startRoute}`);
  loadScreen(startRoute);
}

// Update Active Navbar Link
function updateNavbarActiveState(screenName) {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => {
    item.classList.remove('active');
    const href = item.getAttribute('href');
    if (href === screenName) {
      item.classList.add('active');
    }
    // Handle focus screen mapping (Zen Pop or Tracing)
    if (screenName === 'focus' && href === 'focus') {
      item.classList.add('active');
    }
    // Map login screen to Logout tab
    if (screenName === 'login' && href === 'login') {
      item.classList.add('active');
    }
  });
}

// Handle global system dialogs (e.g. Call simulator)
function initGlobalEvents() {
  const overlay = document.getElementById('global-overlay');
  const endCallBtn = document.getElementById('close-overlay-btn');
  let callTimer = null;

  endCallBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    clearInterval(callTimer);
  });

  window.showCallSimulation = (name, number) => {
    overlay.classList.remove('hidden');
    document.getElementById('overlay-title').textContent = `מחייג...`;
    document.getElementById('overlay-subtitle').textContent = `${name} (${number})`;
    
    let seconds = 0;
    const timerEl = document.getElementById('overlay-timer');
    timerEl.textContent = "00:00";
    
    clearInterval(callTimer);
    callTimer = setInterval(() => {
      seconds++;
      let m = Math.floor(seconds / 60);
      let s = seconds % 60;
      timerEl.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
    }, 1000);
  };

  // Toast Notification System
  window.showToastMessage = (title, message, isError = false) => {
    const phoneFrame = document.querySelector('.phone-frame');
    if (!phoneFrame) return;

    // Check if toast already exists, remove it immediately
    const existing = phoneFrame.querySelector('.toast-notification');
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'toast-error' : ''}`;
    
    const iconName = isError ? 'alert-triangle' : 'check-circle';
    
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
    `;

    phoneFrame.appendChild(toast);

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Slide out and remove after delay
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards';
      setTimeout(() => {
        toast.remove();
      }, 450);
    }, 3200);
  };
}

// Web Audio API Synthesis Engine
const AudioEngine = {
  init() {
    if (AppState.audio.ctx) return;
    
    // Create audio context
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    AppState.audio.ctx = new AudioContextClass();
    
    // Create master gain
    AppState.audio.masterGain = AppState.audio.ctx.createGain();
    AppState.audio.masterGain.gain.setValueAtTime(0.8, AppState.audio.ctx.currentTime);
    AppState.audio.masterGain.connect(AppState.audio.ctx.destination);
  },

  resume() {
    this.init();
    if (AppState.audio.ctx.state === 'suspended') {
      AppState.audio.ctx.resume();
    }
  },

  // Noise Buffer Helper
  createNoiseBuffer(type = 'white') {
    const bufferSize = 2 * AppState.audio.ctx.sampleRate;
    const noiseBuffer = AppState.audio.ctx.createBuffer(1, bufferSize, AppState.audio.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    let lastOut = 0.0; // pink noise state variables
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; // pink
    
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      
      if (type === 'white') {
        output[i] = white;
      } else if (type === 'pink') {
        // Pink noise filter approximation
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; // rescue gain
        b6 = white * 0.115926;
      } else if (type === 'brown') {
        // Brown noise (integration of white noise)
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // compensation gain
      }
    }
    return noiseBuffer;
  },

  // Play Sound: Rain
  startRain() {
    this.resume();
    if (AppState.audio.rain.playing) return;

    const ctx = AppState.audio.ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer('pink');
    source.loop = true;

    // Filter to make it sound like rain (lowpass)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, ctx.currentTime);
    
    // Gain Node
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(AppState.audio.rain.volume, ctx.currentTime);

    // Chaining
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(AppState.audio.masterGain);

    source.start(0);

    AppState.audio.rain.node = source;
    AppState.audio.rain.gain = gainNode;
    AppState.audio.rain.playing = true;
  },

  stopRain() {
    if (AppState.audio.rain.node) {
      try { AppState.audio.rain.node.stop(); } catch(e){}
      AppState.audio.rain.node = null;
    }
    AppState.audio.rain.playing = false;
  },

  // Play Sound: Ocean
  startOcean() {
    this.resume();
    if (AppState.audio.ocean.playing) return;

    const ctx = AppState.audio.ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer('brown');
    source.loop = true;

    // Lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    // Ocean Waves Volume LFO
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);

    // Low Frequency Oscillator to modulate Ocean volume (wave cycle 6 seconds)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.15, ctx.currentTime); // 0.15 Hz = 6.6 second wave cycle

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(AppState.audio.ocean.volume * 0.45, ctx.currentTime); // mod depth

    // Modulate filter frequency too, for realistic wave roll
    const filterLfoGain = ctx.createGain();
    filterLfoGain.gain.setValueAtTime(250, ctx.currentTime); // sweep filter between 150Hz and 650Hz

    // Modulate connections
    lfo.connect(lfoGain);
    lfoGain.connect(gainNode.gain); // modulates wave volume

    lfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency); // modulates wave tone

    // Chains
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(AppState.audio.masterGain);

    source.start(0);
    lfo.start(0);

    AppState.audio.ocean.node = { source, lfo };
    AppState.audio.ocean.gain = gainNode;
    AppState.audio.ocean.playing = true;
  },

  stopOcean() {
    if (AppState.audio.ocean.node) {
      try { AppState.audio.ocean.node.source.stop(); } catch(e){}
      try { AppState.audio.ocean.node.lfo.stop(); } catch(e){}
      AppState.audio.ocean.node = null;
    }
    AppState.audio.ocean.playing = false;
  },

  // Play Sound: Wind
  startWind() {
    this.resume();
    if (AppState.audio.wind.playing) return;

    const ctx = AppState.audio.ctx;
    const source = ctx.createBufferSource();
    source.buffer = this.createNoiseBuffer('pink');
    source.loop = true;

    // Bandpass filter with high resonance to create howling wind
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.0, ctx.currentTime);
    filter.frequency.setValueAtTime(500, ctx.currentTime);

    // Wind modulation
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(AppState.audio.wind.volume, ctx.currentTime);

    // LFO for howling wind frequency shifts
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // Slow sweep

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(280, ctx.currentTime); // Sweep filter between 220Hz and 780Hz

    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(AppState.audio.masterGain);

    source.start(0);
    lfo.start(0);

    AppState.audio.wind.node = { source, lfo };
    AppState.audio.wind.gain = gainNode;
    AppState.audio.wind.playing = true;
  },

  stopWind() {
    if (AppState.audio.wind.node) {
      try { AppState.audio.wind.node.source.stop(); } catch(e){}
      try { AppState.audio.wind.node.lfo.stop(); } catch(e){}
      AppState.audio.wind.node = null;
    }
    AppState.audio.wind.playing = false;
  },

  // Play Sound: Binaural Beats (Entrainment - Alpha/Theta beat)
  startBinaural() {
    this.resume();
    if (AppState.audio.binaural.playing) return;

    const ctx = AppState.audio.ctx;
    
    // Left ear oscillator (200Hz)
    const leftOsc = ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(200, ctx.currentTime);

    // Right ear oscillator (210Hz) -> creates a 10Hz alpha entrainment beat
    const rightOsc = ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(210, ctx.currentTime);

    // Stereo Panners
    const leftPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const rightPanner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(AppState.audio.binaural.volume * 0.6, ctx.currentTime); // Softer defaults

    if (leftPanner && rightPanner) {
      leftPanner.pan.setValueAtTime(-1, ctx.currentTime);
      rightPanner.pan.setValueAtTime(1, ctx.currentTime);

      leftOsc.connect(leftPanner);
      leftPanner.connect(gainNode);

      rightOsc.connect(rightPanner);
      rightPanner.connect(gainNode);
    } else {
      // Fallback if Panners not supported (combine)
      leftOsc.connect(gainNode);
      rightOsc.connect(gainNode);
    }

    gainNode.connect(AppState.audio.masterGain);

    leftOsc.start(0);
    rightOsc.start(0);

    AppState.audio.binaural.leftOsc = leftOsc;
    AppState.audio.binaural.rightOsc = rightOsc;
    AppState.audio.binaural.gain = gainNode;
    AppState.audio.binaural.playing = true;
  },

  stopBinaural() {
    if (AppState.audio.binaural.leftOsc) {
      try { AppState.audio.binaural.leftOsc.stop(); } catch(e){}
      AppState.audio.binaural.leftOsc = null;
    }
    if (AppState.audio.binaural.rightOsc) {
      try { AppState.audio.binaural.rightOsc.stop(); } catch(e){}
      AppState.audio.binaural.rightOsc = null;
    }
    AppState.audio.binaural.playing = false;
  },

  // Bubble Pop Sound Synthesizer (Instant sine wave frequency decay)
  playPopSound(pitch = 300) {
    this.resume();
    const ctx = AppState.audio.ctx;
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Start pitch high, decay very rapidly
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, ctx.currentTime + 0.12);

    // Fast volume envelope decay
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(AppState.audio.masterGain);

    osc.start(0);
    osc.stop(ctx.currentTime + 0.16);
  },

  // Update Volumes
  updateVolume(soundName, volumeValue) {
    if (AppState.audio[soundName]) {
      AppState.audio[soundName].volume = volumeValue;
      if (AppState.audio[soundName].gain) {
        // Binaural beats adjustment
        const factor = soundName === 'binaural' ? 0.6 : 1.0;
        AppState.audio[soundName].gain.gain.setValueAtTime(volumeValue * factor, AppState.audio.ctx.currentTime);
      }
    }
  }
};

// Global exports
window.AppState = AppState;
window.AudioEngine = AudioEngine;
