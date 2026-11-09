// Shared content contract. Prices are integer cents; product IDs and order stay stable.
(() => {
  const ids = ['klein-gewoon', 'klein-zonder-gelatine', 'middel-gewoon', 'middel-zonder-gelatine', 'groot-gewoon', 'groot-zonder-gelatine'];
  const sizes = ['klein', 'klein', 'middel', 'middel', 'groot', 'groot'];
  function validate(data) {
    const text = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
    if (!data || data.version !== 2 || !text(data.announcement, 180) || !text(data.intro, 500) || !text(data.shopNote, 600)) throw new Error('De algemene teksten zijn ongeldig.');
    if (!Array.isArray(data.products) || data.products.length !== ids.length) throw new Error('De zes doosjes moeten behouden blijven.');
    data.products.forEach((p, i) => {
      const weight = Number.isInteger(p.weightGrams) && p.weightGrams >= 1 && p.weightGrams <= 5000;
      const price = p.priceCents === null || (Number.isInteger(p.priceCents) && p.priceCents >= 1 && p.priceCents <= 100000);
      if (p.id !== ids[i] || !text(p.name, 70) || !text(p.description, 250) || p.mix !== (i % 2 ? 'gelatinevrij' : 'gewoon') || p.size !== sizes[i] || typeof p.available !== 'boolean' || !weight || !price) throw new Error('Controleer de naam, omschrijving, inhoud en prijs van elk doosje.');
    });
    return data;
  }
  const money = cents => new Intl.NumberFormat('nl-BE', {style: 'currency', currency: 'EUR'}).format(cents / 100);
  const price = product => product.priceCents === null ? 'Prijs volgt' : money(product.priceCents);
  const mixLabel = product => product.mix === 'gewoon' ? 'Gewone mix' : 'Zonder gelatine';
  const ready = fetch('data/content.json', {cache: 'no-cache'})
    .then(response => { if (!response.ok) throw new Error('De collectie kon niet worden geladen. Probeer opnieuw.'); return response.json(); })
    .then(validate);
  window.ZoetContent = {validate, money, price, mixLabel, ready};
  // Leave the static content readable if the content request fails.
  ready.then(data => {
    const byId = new Map(data.products.map(p => [p.id, p]));
    const set = (root, selector, value) => { const el = root.querySelector(selector); if (el) el.textContent = value; };
    document.querySelectorAll('.announcement').forEach(el => { el.textContent = data.announcement; });
    const intro = document.querySelector('.hero .lede');
    if (intro) intro.textContent = data.intro;
    const note = document.querySelector('#assortiment .note-box');
    if (note) note.textContent = data.shopNote;
    document.querySelectorAll('[data-product]').forEach(card => {
      const p = byId.get(card.dataset.product);
      if (!p) return;
      const shown = p.available ? price(p) : 'Tijdelijk niet beschikbaar';
      set(card, 'h3', p.name);
      set(card, '.desc', p.description);
      set(card, '.weight', `${p.weightGrams} g`);
      set(card, '.price', shown);
      set(card, '.product-caption p', `${p.weightGrams} gram · ${shown}`);
    });
  }).catch(() => {});
})();
