(() => {
  'use strict';
  const form = document.querySelector('[data-signup]');
  if (!form || !form.dataset.endpoint) return;
  const email = form.elements.email;
  const button = form.querySelector('button[type="submit"]');
  const fields = form.querySelector('.updates-fields');
  const status = form.querySelector('[role="status"]');
  let pending = false;
  button.disabled = false;

  email.addEventListener('input', () => email.setCustomValidity(''));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    email.value = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      email.setCustomValidity('Please enter a valid email address.');
      email.reportValidity();
      return;
    }
    if (!form.reportValidity()) return;
    if (form.elements.website.value) return;
    pending = true;
    button.disabled = true;
    button.textContent = 'Subscribing…';
    form.setAttribute('aria-busy', 'true');
    form.dataset.state = 'pending';
    status.textContent = '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    try {
      await fetch(form.dataset.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams({'entry.310653663': email.value, fvv: '1', pageHistory: '0'}),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller.signal
      });
      // Google Forms does not expose its response across origins. Confirm only
      // that the request was sent; verify collection in the private response sheet.
      form.dataset.state = 'success';
      form.reset();
      fields.hidden = true;
      status.textContent = 'Request sent. Thank you.';
      status.focus();
    } catch (error) {
      form.dataset.state = 'error';
      status.textContent = 'Couldn’t subscribe. Please try again.';
    } finally {
      clearTimeout(timeout);
      pending = false;
      button.disabled = false;
      button.textContent = 'Subscribe';
      form.removeAttribute('aria-busy');
    }
  });
})();
