// Order preview: the boxes saved in the local wishlist, with quantities, a card message and a delivery preference. Nothing is ordered, sent or stored elsewhere.
(() => {
  const $ = id => document.getElementById(id);
  const key = 'zoet-gebaar-wishlist-v1';
  const photo = {klein: 'assets/doosje-roze.jpg', middel: 'assets/doosje-kerst.jpg', groot: 'assets/doosje-zwart.jpg'};
  let all = [];
  let saved = [];
  const listed = () => all.filter((p, i) => saved.includes(i));
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* Keep the in-memory list when storage is unavailable. */ }
  }
  function selectedItems() {
    return listed().flatMap(p => {
      const value = Number($(`quantity-${p.id}`).value);
      return p.available && Number.isInteger(value) && value > 0 && value <= 50 ? [{product: p, quantity: value}] : [];
    });
  }
  function updateSummary() {
    $('order-confirmation').hidden = true;
    const selected = selectedItems();
    const lines = $('summary-items'); lines.replaceChildren();
    selected.forEach(({product: p, quantity}) => {
      const row = document.createElement('div'); row.className = 'summary-row';
      const name = document.createElement('span'); name.textContent = `${quantity} × ${p.name} · ${p.weightGrams} g`;
      const price = document.createElement('span'); price.textContent = p.priceCents === null ? 'Prijs volgt' : ZoetContent.money(p.priceCents * quantity);
      row.append(name, price); lines.append(row);
    });
    if (!selected.length) { const empty = document.createElement('p'); empty.textContent = 'Kies hierboven minstens één doosje.'; lines.append(empty); }
    const unknown = selected.some(({product}) => product.priceCents === null);
    const subtotal = selected.reduce((total, {product, quantity}) => total + (product.priceCents ?? 0) * quantity, 0);
    $('summary-total').replaceChildren();
    const label = document.createElement('span'); label.textContent = 'Subtotaal';
    const amount = document.createElement('span'); amount.textContent = !selected.length ? '—' : unknown ? 'Prijs volgt' : ZoetContent.money(subtotal);
    $('summary-total').append(label, amount);
    $('price-note').textContent = unknown ? 'Nog niet alle prijzen zijn bekend. Een totaal kan nog niet worden berekend.' : 'Prijzen voor de doosjes. Eventuele bezorgkosten zijn nog niet bekend.';
    const message = $('gift-message').value.trim();
    $('summary-message').textContent = message; $('summary-message').hidden = !message;
    const shipping = $('delivery').value === 'shipping';
    $('delivery-note').textContent = shipping ? 'Bezorgkosten en levertermijn worden later bekendgemaakt.' : 'Afhaallocaties en momenten worden later bekendgemaakt.';
    $('summary-delivery').textContent = shipping ? 'Voorkeur: bezorgen · kosten volgen' : 'Voorkeur: afhalen';
    $('review-order').disabled = selected.length === 0;
  }
  function render() {
    const products = listed();
    $('order-products').replaceChildren();
    $('order-empty').hidden = products.length > 0;
    $('order-form').hidden = products.length === 0;
    products.forEach(p => {
      const row = document.createElement('div'); row.className = 'order-product';
      const image = document.createElement('img'); image.src = photo[p.size]; image.alt = '';
      const info = document.createElement('div'); const name = document.createElement('h3'); name.textContent = `${p.name} · ${p.weightGrams} g`;
      const details = document.createElement('p'); details.textContent = p.available ? `${ZoetContent.price(p)} per doosje` : 'Tijdelijk niet beschikbaar';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-item'; remove.textContent = 'Verwijderen';
      remove.setAttribute('aria-label', `${p.name} ${p.weightGrams} gram, ${ZoetContent.mixLabel(p).toLowerCase()} verwijderen uit je lijstje`);
      remove.addEventListener('click', () => { saved = saved.filter(i => all[i] !== p); persist(); render(); });
      info.append(name, details, remove);
      const field = document.createElement('div'); const label = document.createElement('label'); label.htmlFor = `quantity-${p.id}`; label.textContent = 'Aantal';
      const input = document.createElement('input'); Object.assign(input, {id: label.htmlFor, type: 'number', min: '0', max: '50', step: '1', required: true, value: p.available ? '1' : '0', disabled: !p.available});
      input.setAttribute('aria-label', `Aantal ${p.name} ${p.weightGrams} gram, ${ZoetContent.mixLabel(p).toLowerCase()}`); field.append(label, input); row.append(image, info, field); $('order-products').append(row);
    });
    if (products.length) updateSummary();
  }
  ZoetContent.ready.then(content => {
    all = content.products;
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(data)) saved = [...new Set(data.filter(i => Number.isInteger(i) && i >= 0 && i < all.length))];
    } catch {}
    $('order-load-status').hidden = true;
    render();
  }).catch(() => { $('order-load-status').textContent = 'De collectie kon niet worden geladen. Vernieuw de pagina om opnieuw te proberen.'; });
  $('order-form').addEventListener('input', updateSummary);
  $('order-form').addEventListener('change', updateSummary);
  $('order-form').addEventListener('submit', event => {
    event.preventDefault();
    if (!$('order-form').reportValidity() || !selectedItems().length) return;
    $('order-confirmation').hidden = false; $('order-confirmation').focus();
  });
  $('clear-list').addEventListener('click', () => { saved = []; persist(); render(); });
})();
