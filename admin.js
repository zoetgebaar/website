(() => {
  const $ = id => document.getElementById(id);
  const repo = 'https://api.github.com/repos/zoetgebaar/website';
  const endpoint = `${repo}/contents/data/content.json`;
  let token = '', sha = '', content = null, dirty = false, busy = false;
  async function api(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'X-GitHub-Api-Version': '2026-03-10', ...(options.body ? {'Content-Type': 'application/json'} : {})},
      cache: 'no-store',
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) {
      const error = new Error(response.status === 401 ? 'Deze toegangscode is ongeldig of verlopen. Log opnieuw in.' : response.status === 403 ? 'Geen schrijftoegang of tijdelijk te veel verzoeken. Controleer de rechten van je toegangscode.' : response.status === 409 || response.status === 422 ? 'De inhoud is intussen gewijzigd of GitHub blokkeert deze publicatie. Je aanpassingen zijn nog niet opgeslagen.' : 'GitHub kon dit niet uitvoeren. Controleer je toegang en probeer opnieuw.');
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
  const decode = base64 => new TextDecoder().decode(Uint8Array.from(atob(base64.replace(/\s/g, '')), char => char.charCodeAt(0)));
  const encode = text => btoa(Array.from(new TextEncoder().encode(text), byte => String.fromCharCode(byte)).join(''));
  function field(labelText, tag, id, value, attributes = {}) {
    const label = document.createElement('label'); label.htmlFor = id; label.textContent = labelText;
    const input = document.createElement(tag); input.id = id; input.value = value ?? '';
    Object.entries(attributes).forEach(([key, val]) => input.setAttribute(key, val));
    return [label, input];
  }
  function setDirty(value) {
    dirty = value;
    $('dirty-status').textContent = value ? 'Niet-gepubliceerde wijzigingen' : 'Alles is opgeslagen';
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
    setDirty(false); $('reload-content').hidden = true;
  }
  async function loadContent() {
    const file = await api(`${endpoint}?ref=main`);
    const parsed = window.ZoetContent.validate(JSON.parse(decode(file.content)));
    sha = file.sha; content = parsed; showContent();
  }
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    token = $('access-code').value.trim(); $('access-code').value = '';
    $('login-status').textContent = 'Toegang controleren…';
    try {
      const user = await api('https://api.github.com/user');
      const repository = await api(repo);
      if (!repository.permissions?.push) throw new Error('Dit GitHub-account heeft geen schrijftoegang tot de website.');
      await loadContent();
      $('admin-name').textContent = user.name || user.login;
      $('login-panel').hidden = true; $('editor-panel').hidden = false;
      $('announcement').focus(); $('login-status').textContent = '';
    } catch (error) {
      token = ''; $('login-status').textContent = error.message; $('access-code').focus();
    } finally { button.disabled = false; }
  });
  $('editor-form').addEventListener('input', () => setDirty(true));
  $('editor-form').addEventListener('submit', async event => {
    event.preventDefault(); if (!dirty || busy || !token) return;
    const next = structuredClone(content);
    next.announcement = $('announcement').value.trim(); next.intro = $('intro').value.trim(); next.shopNote = $('shop-note').value.trim();
    next.products.forEach((p, i) => {
      p.name = $(`name-${i}`).value.trim(); p.description = $(`description-${i}`).value.trim();
      p.priceCents = $(`price-${i}`).value === '' ? null : Math.round(Number($(`price-${i}`).value) * 100);
      p.available = $(`available-${i}`).checked;
    });
    try { window.ZoetContent.validate(next); } catch (error) { $('save-status').textContent = error.message; return; }
    busy = true; $('publish').disabled = true; $('logout').disabled = true;
    // Freeze the form so edits made during the request cannot be lost on success.
    const controls = [...$('editor-form').querySelectorAll('input, textarea, button')];
    controls.forEach(control => { control.disabled = true; });
    $('save-status').textContent = 'Bezig met publiceren…';
    try {
      const result = await api(endpoint, {method: 'PUT', body: JSON.stringify({message: 'Update website content via team admin', content: encode(JSON.stringify(next, null, 2) + '\n'), sha, branch: 'main'})});
      sha = result.content.sha; content = next; setDirty(false);
      $('reload-content').hidden = true;
      $('save-status').textContent = 'Opgeslagen in GitHub! Het kan enkele minuten duren voordat de wijzigingen op de website staan.';
    } catch (error) {
      $('save-status').textContent = error.message + ' Je invoer blijft hier staan.';
      // A lost response may still mean the commit succeeded. Reload before retrying a conflict.
      $('reload-content').hidden = false;
    } finally {
      busy = false; controls.forEach(control => { control.disabled = false; });
      $('logout').disabled = false; setDirty(dirty); $('save-status').focus();
    }
  });
  $('reload-content').addEventListener('click', async () => {
    if (dirty && !confirm('De nieuwste versie laden? Je niet-gepubliceerde wijzigingen worden vervangen.')) return;
    $('reload-content').disabled = true;
    try { await loadContent(); $('save-status').textContent = 'De nieuwste versie is geladen.'; }
    catch (error) { $('save-status').textContent = error.message; }
    finally { $('reload-content').disabled = false; }
  });
  $('logout').addEventListener('click', () => {
    if (dirty && !confirm('Uitloggen zonder je wijzigingen te publiceren?')) return;
    token = ''; sha = ''; content = null; setDirty(false);
    $('editor-form').reset(); $('product-editors').replaceChildren(); $('save-status').textContent = '';
    $('editor-panel').hidden = true; $('login-panel').hidden = false; $('access-code').focus();
  });
  window.addEventListener('beforeunload', event => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } });
})();
