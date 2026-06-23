/**
 * Add Contact Screen Script
 */
(() => {
  const submitBtn = document.getElementById('add-contact-submit-btn');
  const nameInput = document.getElementById('contact-name');
  const phoneInput = document.getElementById('contact-phone');
  const relationInput = document.getElementById('contact-relation');

  // Input validation regex & logic
  const isNameValid = (val) => val.trim().length >= 2;
  const isPhoneValid = (val) => /^0[2-9]-?\d{7,8}$/.test(val.trim());
  const isRelationValid = (val) => val.trim().length >= 2;

  const validateField = (inputEl, validatorFunc) => {
    if (!inputEl) return false;
    const isValid = validatorFunc(inputEl.value);
    if (isValid) {
      inputEl.classList.add('is-valid');
    } else {
      inputEl.classList.remove('is-valid');
    }
    return isValid;
  };

  const validateAll = () => {
    validateField(nameInput, isNameValid);
    validateField(phoneInput, isPhoneValid);
    validateField(relationInput, isRelationValid);
    if (window.lucide) window.lucide.createIcons();
  };

  if (nameInput) nameInput.addEventListener('input', () => validateField(nameInput, isNameValid));
  if (phoneInput) phoneInput.addEventListener('input', () => validateField(phoneInput, isPhoneValid));
  if (relationInput) relationInput.addEventListener('input', () => validateField(relationInput, isRelationValid));

  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      AudioEngine.resume();

      const name = nameInput.value.trim();
      const phone = phoneInput.value.trim();
      const relation = relationInput.value.trim() || 'איש קשר תומך';

      const validName = isNameValid(name);
      const validPhone = isPhoneValid(phone);

      if (!validName || !validPhone) {
        window.showToastMessage('שגיאה', 'אנא מלאו שם תקין ומספר טלפון תקין (05X-XXXXXXX).', true);
        AudioEngine.playPopSound(180);
        
        // Highlight validation issues immediately
        validateAll();
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

  // Run initial validation state on load (in case values are pre-filled)
  validateAll();
})();
