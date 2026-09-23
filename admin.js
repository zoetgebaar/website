(() => {
  const $ = id => document.getElementById(id);
  const demoKey = 'zoet-gebaar-demo-content-v1';
  let loggedIn = false, content = null, dirty = false, busy = false;
  function field(labelText, tag, id, value, attributes = {}) {
    const label = document.createElement('label'); label.htmlFor = id; label.textContent = labelText;
    const input = document.createElement(tag); input.id = id; input.value = value ?? '';
    Object.entries(attributes).forEach(([key, val]) => input.setAttribute(key, val));
    return [label, input];
  }
  function setDirty(value) {
    dirty = value;
    $('dirty-status').textContent = value ? 'Niet-opgeslagen wijzigingen' : 'Demo is opgeslagen';
    $('publish').disabled = !value || busy;
  }
  function showContent() {
    $('announcement').value = content.announcement;
    $('intro').value = content.intro;
    $('shop-note').value = content.shopNote;
    $('product-editors').replaceChildren();
    content.products.forEach((p, i) => {
      const box = document.createElement('fieldset'); box.className = 'workspace-panel product-editor';
      const legend = document.createElement('legend'); legend.textContent = `${p.size === 'klein' ? 'Klein' : 'Groot'} · ${p.mix === 'gewoon' ? 'Gewone mix' : 'Zonder gelatine'}`;
      box.append(legend, ...field('Productnaam', 'input', `name-${i}`, p.name, {required: '', maxlength: '70'}), ...field('Omschrijving', 'textarea', `description-${i}`, p.description, {required: '', maxlength: '250', rows: '3'}), ...field('Prijs in euro (leeg = prijs volgt)', 'input', `price-${i}`, p.priceCents === null ? '' : (p.priceCents / 100).toFixed(2), {type: 'number', min: '0.01', max: '1000', step: '0.01', inputmode: 'decimal'}));
      const label = document.createElement('label'); label.className = 'check-label';
      const check = document.createElement('input'); check.type = 'checkbox'; check.id = `available-${i}`; check.checked = p.available;
      label.append(check, document.createTextNode('Beschikbaar in de collectie'));
      box.append(label); $('product-editors').append(box);
    });
    setDirty(false);
  }
  async function loadContent() {
    content = structuredClone(await window.ZoetContent.ready);
    try {
      const stored = localStorage.getItem(demoKey);
      if (stored) content = window.ZoetContent.validate(JSON.parse(stored));
    } catch { /* Ignore unavailable or invalid local drafts. Saving reports storage failures. */ }
    showContent();
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    const valid = $('username').value.trim().toLowerCase() === 'demo' && $('access-code').value === 'zoetgebaar';
    $('access-code').value = '';
    if (!valid) {
      $('login-status').textContent = 'Gebruik demo als gebruikersnaam en zoetgebaar als wachtwoord.';
      button.disabled = false; $('access-code').focus(); return;
    }
    $('login-status').textContent = 'Demo laden…';
    try {
      await loadContent(); loggedIn = true;
      $('admin-name').textContent = 'meisjes';
      $('login-panel').hidden = true; $('editor-panel').hidden = false;
      $('announcement').focus(); $('login-status').textContent = '';
    } catch {
      loggedIn = false; $('login-status').textContent = 'De demo kon niet worden geladen. Vernieuw de pagina en probeer opnieuw.';
    } finally { button.disabled = false; }
  });
  $('editor-form').addEventListener('input', () => setDirty(true));
  $('editor-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!dirty || busy || !loggedIn) return;
    const next = structuredClone(content);
    next.announcement = $('announcement').value.trim(); next.intro = $('intro').value.trim(); next.shopNote = $('shop-note').value.trim();
    next.products.forEach((p, i) => {
      p.name = $(`name-${i}`).value.trim(); p.description = $(`description-${i}`).value.trim();
      p.priceCents = $(`price-${i}`).value === '' ? null : Math.round(Number($(`price-${i}`).value) * 100);
      p.available = $(`available-${i}`).checked;
    });
    try { window.ZoetContent.validate(next); } catch (error) { $('save-status').textContent = error.message; return; }
    try {
      localStorage.setItem(demoKey, JSON.stringify(next));
      content = next; setDirty(false);
      $('save-status').textContent = 'Demo opgeslagen in deze browser. Bekijk het resultaat via de voorbeeldlinks hieronder. De live website is niet gewijzigd.';
    } catch {
      $('save-status').textContent = 'Opslaan lukt niet: browseropslag is geblokkeerd of vol. Je invoer blijft hier staan.';
    }
    $('save-status').focus();
  });
  $('reset-demo').addEventListener('click', async () => {
    if (!confirm('Alle lokale demo-aanpassingen wissen en de originele inhoud terugzetten?')) return;
    try {
      localStorage.removeItem(demoKey);
      content = structuredClone(await window.ZoetContent.ready); showContent();
      $('save-status').textContent = 'De demo is teruggezet naar de originele inhoud.';
    } catch { $('save-status').textContent = 'Terugzetten lukt niet. Probeer opnieuw.'; }
  });
  $('logout').addEventListener('click', () => {
    if (dirty && !confirm('Uitloggen zonder je wijzigingen op te slaan?')) return;
    loggedIn = false; content = null; setDirty(false);
    $('editor-form').reset(); $('product-editors').replaceChildren(); $('save-status').textContent = '';
    $('editor-panel').hidden = true; $('login-panel').hidden = false; $('access-code').focus();
  });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
})();
