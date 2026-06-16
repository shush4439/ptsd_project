/**
 * Add Contact Screen Script
 */
(() => {
  const submitBtn = document.getElementById('add-contact-submit-btn');
  const nameInput = document.getElementById('contact-name');
  const phoneInput = document.getElementById('contact-phone');
  const relationInput = document.getElementById('contact-relation');

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      AudioEngine.resume();

      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const relation = relationInput.value.trim() || 'איש קשר תומך';

      if (!name || !phone) {
        window.showToastMessage('שגיאה', 'אנא מלאו גם שם וגם מספר טלפון.', true);
        AudioEngine.playPopSound(180);
        return;
      }

      // Simple phone validation: at least 7 digits, allowed characters like +, -, spaces, numbers
      const phoneRegex = /^[\d\s\-+]{7,15}$/;
      if (!phoneRegex.test(phone)) {
        window.showToastMessage('שגיאה', 'מספר טלפון לא תקין.', true);
        AudioEngine.playPopSound(180);
        return;
      }

      const newContact = {
        id: 'c' + Date.now(),
        name,
        phone,
        relation
      };

      window.apiSaveContact(newContact);
      
      AudioEngine.playPopSound(550); // Uplifting tone
      window.showToastMessage('איש קשר נוסף', `${name} נוסף/ה בהצלחה למעגל התמיכה שלכם.`);

      // Navigate back to support screen
      setTimeout(() => {
        window.navigate('support');
      }, 1000);
    });
  }
})();
