// Business request form. FormSubmit e-mails it (with the logo as attachment) to info@zoetgebaar.be
// and sends the visitor back here with ?verzonden=1.
(() => {
  const form = document.getElementById('business-form');
  if (!form) return;
  const success = document.getElementById('business-success');
  const other = document.getElementById('other-color');
  const otherInput = document.getElementById('kleur-anders');
  const logo = document.getElementById('logo');
  const logoError = document.getElementById('logo-error');
  const submit = document.getElementById('business-submit');
  const MAX_BYTES = 5 * 1024 * 1024;

  if (new URLSearchParams(location.search).get('verzonden') === '1') {
    form.hidden = true;
    success.hidden = false;
    success.focus();
  }

  form.addEventListener('change', event => {
    if (event.target.name === 'Lintkleur') {
      const custom = event.target.value === 'Andere kleur';
      other.hidden = !custom;
      otherInput.required = custom;
      if (custom) otherInput.focus();
    }
  });

  const logoTooBig = () => Boolean(logo.files?.[0] && logo.files[0].size > MAX_BYTES);
  logo.addEventListener('change', () => { logoError.hidden = !logoTooBig(); });

  form.addEventListener('submit', event => {
    if (logoTooBig()) {
      event.preventDefault();
      logoError.hidden = false;
      logo.focus();
      return;
    }
    const next = new URL(location.href);
    next.search = '?verzonden=1';
    next.hash = 'aanvraag';
    form.elements._next.value = next.href;
    submit.disabled = true;
    submit.firstChild.textContent = 'Bezig met versturen ';
  });

  // When the visitor comes back with the browser's back button, the form must work again.
  window.addEventListener('pageshow', () => {
    submit.disabled = false;
    submit.firstChild.textContent = 'Aanvraag versturen ';
  });
})();
