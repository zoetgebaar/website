// Order page: the boxes saved in the wishlist, with quantities, a card message and contact details.
// The order is e-mailed to info@zoetgebaar.be through FormSubmit; nothing is paid online.
(() => {
  const $ = id => document.getElementById(id);
  const ENDPOINT = 'https://formsubmit.co/ajax/info@zoetgebaar.be';
  const key = 'zoet-gebaar-wishlist-v2';
  const legacyKey = 'zoet-gebaar-wishlist-v1';
  const legacyOrder = ['klein-gewoon', 'klein-zonder-gelatine', 'middel-gewoon', 'middel-zonder-gelatine', 'groot-gewoon', 'groot-zonder-gelatine'];
  const photo = {klein: 'assets/doosje-kerst.jpg', middel: 'assets/doosje-zwart.jpg', groot: 'assets/doosje-roze.jpg'};
  let all = [];
  let saved = [];
  let sending = false;
  let sent = false;
  const listed = () => all.filter(p => saved.includes(p.id));
  const label = p => `${p.name}, ${ZoetContent.mixLabel(p).toLowerCase()}, ${p.weightGrams} gram`;
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* Keep the in-memory list when storage is unavailable. */ }
  }
  function selectedItems() {
    return listed().flatMap(p => {
      const value = Number($(`quantity-${p.id}`).value);
      return p.available && Number.isInteger(value) && value > 0 && value <= 50 ? [{product: p, quantity: value}] : [];
    });
  }
  function totals(selected) {
    const unknown = selected.some(({product}) => product.priceCents === null);
    const cents = selected.reduce((total, {product, quantity}) => total + (product.priceCents ?? 0) * quantity, 0);
    return {unknown, cents, text: !selected.length ? 'Nog niets gekozen' : unknown ? 'Prijs volgt' : ZoetContent.money(cents)};
  }
  function updateSummary() {
    $('order-confirmation').hidden = !sent;
    $('order-error').hidden = true;
    const selected = selectedItems();
    const lines = $('summary-items'); lines.replaceChildren();
    selected.forEach(({product: p, quantity}) => {
      const row = document.createElement('div'); row.className = 'summary-row';
      const name = document.createElement('span'); name.textContent = `${quantity} x ${p.name}`;
      const variant = document.createElement('small'); variant.textContent = `${ZoetContent.mixLabel(p)}, ${p.weightGrams} gram`;
      name.append(variant);
      const price = document.createElement('span'); price.textContent = p.priceCents === null ? 'Prijs volgt' : ZoetContent.money(p.priceCents * quantity);
      row.append(name, price); lines.append(row);
    });
    if (!selected.length) { const empty = document.createElement('p'); empty.textContent = 'Kies hierboven minstens één doosje.'; lines.append(empty); }
    const total = totals(selected);
    $('summary-total').replaceChildren();
    const caption = document.createElement('span'); caption.textContent = 'Totaal';
    const amount = document.createElement('span'); amount.textContent = total.text;
    $('summary-total').append(caption, amount);
    $('price-note').textContent = total.unknown ? 'Nog niet alle prijzen zijn bekend. We bevestigen het totaal per mail.' : '';
    const message = $('gift-message').value.trim();
    $('summary-message').textContent = message; $('summary-message').hidden = !message;
    $('review-order').disabled = sent || sending || selected.length === 0;
  }
  function render() {
    const products = listed();
    $('order-products').replaceChildren();
    $('order-empty').hidden = products.length > 0;
    $('order-form').hidden = products.length === 0;
    products.forEach(p => {
      const row = document.createElement('div'); row.className = 'order-product';
      const image = document.createElement('img'); image.src = photo[p.size]; image.alt = '';
      const info = document.createElement('div');
      const name = document.createElement('h3'); name.textContent = p.name;
      const variant = document.createElement('span'); variant.className = 'variant'; variant.textContent = `${ZoetContent.mixLabel(p)}, ${p.weightGrams} gram`;
      name.append(variant);
      const details = document.createElement('p'); details.textContent = p.available ? `${ZoetContent.price(p)} per doosje` : 'Tijdelijk niet beschikbaar';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-item'; remove.textContent = 'Verwijderen';
      remove.setAttribute('aria-label', `${label(p)} verwijderen uit je lijstje`);
      remove.addEventListener('click', () => { saved = saved.filter(id => id !== p.id); persist(); render(); });
      info.append(name, details, remove);
      const field = document.createElement('div'); const qtyLabel = document.createElement('label'); qtyLabel.htmlFor = `quantity-${p.id}`; qtyLabel.textContent = 'Aantal';
      const input = document.createElement('input'); Object.assign(input, {id: qtyLabel.htmlFor, type: 'number', min: '0', max: '50', step: '1', value: p.available ? '1' : '0', disabled: !p.available});
      input.setAttribute('aria-label', `Aantal ${label(p)}`); field.append(qtyLabel, input); row.append(image, info, field); $('order-products').append(row);
    });
    if (products.length) updateSummary();
  }
  function showError(text) {
    $('order-error').textContent = text;
    $('order-error').hidden = false;
  }
  function payload(selected) {
    const total = totals(selected);
    return {
      _subject: 'Nieuwe bestelling via de website',
      _template: 'table',
      _captcha: 'false',
      Naam: $('order-name').value.trim(),
      email: $('order-email').value.trim(),
      Telefoon: $('order-phone').value.trim() || 'Niet opgegeven',
      Bestelling: selected.map(({product, quantity}) => `${quantity} x ${label(product)}`).join('\n'),
      Totaal: total.text,
      Kaartje: $('gift-message').value.trim() || 'Geen boodschap',
      Afhalen: $('order-pickup').value.trim() || 'Nog af te spreken',
    };
  }

  ZoetContent.ready.then(content => {
    all = content.products;
    try {
      let data = JSON.parse(localStorage.getItem(key) || 'null');
      if (data === null) data = JSON.parse(localStorage.getItem(legacyKey) || '[]').map(i => legacyOrder[i]);
      const known = all.map(p => p.id);
      if (Array.isArray(data)) saved = [...new Set(data.filter(id => known.includes(id)))];
    } catch {}
    $('order-load-status').hidden = true;
    render();
  }).catch(() => { $('order-load-status').textContent = 'De collectie kon niet worden geladen. Vernieuw de pagina om opnieuw te proberen.'; });
  $('order-form').addEventListener('input', updateSummary);
  $('order-form').addEventListener('change', updateSummary);
  $('order-form').addEventListener('submit', async event => {
    event.preventDefault();
    const selected = selectedItems();
    if (!selected.length || sending || sent) return;
    const name = $('order-name'), email = $('order-email');
    if (!name.value.trim()) { showError('Vul je naam in.'); name.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { showError('Vul een geldig mailadres in.'); email.focus(); return; }
    if ($('order-honey').value) { $('order-confirmation').hidden = false; return; }
    sending = true; updateSummary();
    $('review-order').textContent = 'Bezig met versturen';
    try {
      const response = await fetch(ENDPOINT, {method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json'}, body: JSON.stringify(payload(selected))});
      const result = await response.json().catch(() => ({}));
      if (!response.ok || String(result.success) !== 'true') throw new Error('not sent');
      sent = true;
      try { localStorage.setItem(key, '[]'); } catch {}
      $('order-confirmation').hidden = false; $('order-confirmation').focus();
    } catch {
      showError('Je bestelling kon niet worden verstuurd. Probeer het opnieuw of mail ons via info@zoetgebaar.be.');
    } finally {
      sending = false;
      $('review-order').textContent = 'Bestelling versturen';
      $('review-order').disabled = sent || !selectedItems().length;
    }
  });
  $('clear-list').addEventListener('click', () => { saved = []; persist(); render(); });
})();
