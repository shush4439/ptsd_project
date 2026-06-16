/**
 * Support Circle Screen Script
 */
(() => {
  const mountPoint = document.getElementById('contacts-list-mount');
  const countEl = document.getElementById('contacts-count');
  
  const addNavBtn = document.getElementById('add-contact-nav-btn');

  const dial988 = document.getElementById('dial-988-btn');
  const text988 = document.getElementById('text-988-btn');

  // Render Contacts
  const renderContacts = () => {
    if (!mountPoint) return;
    mountPoint.innerHTML = '';

    const contacts = AppState.savedContacts;
    if (countEl) countEl.textContent = contacts.length === 1 ? 'איש קשר אחד' : `${contacts.length} אנשי קשר`;

    if (contacts.length === 0) {
      mountPoint.innerHTML = `
        <div style="padding:20px; text-align:center; color:var(--text-secondary); background:var(--bg-card); border-radius:var(--border-radius-md); border:1.5px dashed rgba(0,0,0,0.06); font-size:13px;">
          מעגל התמיכה שלכם ריק. הוסיפו איש קשר קרוב למטה.
        </div>
      `;
      return;
    }

    contacts.forEach((contact) => {
      const card = document.createElement('div');
      card.className = 'contact-row-card';
      card.innerHTML = `
        <div class="contact-details">
          <h4>${contact.name}</h4>
          <span>${contact.relation || 'איש קשר'}</span>
        </div>
        <div class="contact-actions-row">
          <button class="contact-btn btn-call" title="חיוג אל ${contact.name}">
            <i data-lucide="phone"></i>
          </button>
          <button class="contact-btn btn-msg" title="שליחת הודעה אל ${contact.name}">
            <i data-lucide="message-square"></i>
          </button>
          <button class="contact-btn btn-del" title="הסרת איש קשר">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;

      // Wire buttons
      card.querySelector('.btn-call').addEventListener('click', () => {
        AudioEngine.resume();
        window.showCallSimulation(contact.name, contact.phone);
      });

      card.querySelector('.btn-msg').addEventListener('click', () => {
        AudioEngine.resume();
        AudioEngine.playPopSound(480);
        window.showToastMessage('הודעה נשלחה', `הודעת טקסט מדומה נשלחה אל ${contact.name}: "היי, אני מרגיש/ה מוצף/ת כרגע. אפשר ליצור איתי קשר?"`);
      });

      card.querySelector('.btn-del').addEventListener('click', () => {
        AudioEngine.resume();
        AudioEngine.playPopSound(200);
        window.apiDeleteContact(contact.id);
        renderContacts();
      });

      mountPoint.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  };

  // Add contact navigate
  if (addNavBtn) {
    addNavBtn.addEventListener('click', () => {
      AudioEngine.resume();
      window.navigate('add-contact');
    });
  }

  // Dial 1201
  if (dial988) {
    dial988.addEventListener('click', () => {
      AudioEngine.resume();
      window.showCallSimulation('1201 מוקד ער״ן לסיוע נפשי', '1201');
    });
  }

  // Text 1201
  if (text988) {
    text988.addEventListener('click', () => {
      AudioEngine.resume();
      AudioEngine.playPopSound(480);
      window.showToastMessage('הודעת חירום נשלחה', 'הודעת טקסט מדומה נשלחה למוקד 1201: "HELP". נציג מקצועי יחזור אליכם בהקדם.');
    });
  }

  // Listen to background database synchronization updates
  document.addEventListener('contactsSynced', renderContacts);

  // Initial render
  renderContacts();
})();
