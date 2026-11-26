// Business request form. api/send.php mails it (with the logo as attachment) to info@zoetgebaar.be.
// With JavaScript the form is sent in the background; without it, the server redirects back with ?verzonden=1.
(() => {
  const form = document.getElementById('business-form');
  if (!form) return;
  const success = document.getElementById('business-success');
  const other = document.getElementById('other-color');
  const otherInput = document.getElementById('kleur-anders');
  const logo = document.getElementById('logo');
  const logoError = document.getElementById('logo-error');
  const error = document.getElementById('business-error');
  const submit = document.getElementById('business-submit');
  const label = submit.firstChild;
  const MAX_BYTES = 5 * 1024 * 1024;

  const showSuccess = () => {
    form.hidden = true;
    success.hidden = false;
    success.focus();
  };
  if (new URLSearchParams(location.search).get('verzonden') === '1') showSuccess();

  form.addEventListener('change', event => {
    if (event.target.name === 'lintkleur') {
      const custom = event.target.value === 'Andere kleur';
      other.hidden = !custom;
      otherInput.required = custom;
      if (custom) otherInput.focus();
    }
  });

  const logoTooBig = () => Boolean(logo.files?.[0] && logo.files[0].size > MAX_BYTES);
  logo.addEventListener('change', () => { logoError.hidden = !logoTooBig(); });

  const busy = on => {
    submit.disabled = on;
    label.textContent = on ? 'Bezig met versturen ' : 'Aanvraag versturen ';
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.hidden = true;
    if (logoTooBig()) { logoError.hidden = false; logo.focus(); return; }
    if (!form.reportValidity()) return;
    busy(true);
    let message = 'Je aanvraag kon niet worden verstuurd. Probeer het opnieuw of mail ons via info@zoetgebaar.be.';
    try {
      const response = await fetch(form.action, {method: 'POST', body: new FormData(form), headers: {Accept: 'application/json'}});
      const result = await response.json().catch(() => ({}));
      if (typeof result.message === 'string' && result.message) message = result.message;
      if (!response.ok || !result.ok) throw new Error('not sent');
      showSuccess();
    } catch {
      error.textContent = message;
      error.hidden = false;
      busy(false);
    }
  });

  // When the visitor comes back with the browser's back button, the form must work again.
  window.addEventListener('pageshow', () => busy(false));
})();
