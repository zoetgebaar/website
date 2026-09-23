// Shared content contract. Prices are integer cents; product IDs and order stay stable.
(() => {
  const ids = ['klein-gewoon', 'klein-zonder-gelatine', 'groot-gewoon', 'groot-zonder-gelatine'];
  function validate(data) {
    const text = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
    if (!data || data.version !== 1 || !text(data.announcement, 180) || !text(data.intro, 500) || !text(data.shopNote, 600)) throw new Error('De algemene teksten zijn ongeldig.');
    if (!Array.isArray(data.products) || data.products.length !== 4) throw new Error('De vier doosjes moeten behouden blijven.');
    data.products.forEach((p, i) => {
      if (p.id !== ids[i] || !text(p.name, 70) || !text(p.description, 250) || p.mix !== (i % 2 ? 'gelatinevrij' : 'gewoon') || p.size !== (i > 1 ? 'groot' : 'klein') || typeof p.available !== 'boolean' || !(p.priceCents === null || (Number.isInteger(p.priceCents) && p.priceCents >= 1 && p.priceCents <= 100000))) throw new Error('Controleer de naam, omschrijving en prijs van elk doosje.');
    });
    return data;
  }
  const money = cents => new Intl.NumberFormat('nl-BE', {style: 'currency', currency: 'EUR'}).format(cents / 100);
  const price = product => product.priceCents === null ? 'Prijs volgt' : money(product.priceCents);
  const ready = fetch('data/content.json', {cache: 'no-cache'})
    .then(response => { if (!response.ok) throw new Error('De collectie kon niet worden geladen. Probeer opnieuw.'); return response.json(); })
    .then(validate)
    .then(data => {
      if (new URLSearchParams(window.location.search).get('demo') !== '1') return data;
      let preview = data;
      try {
        const stored = localStorage.getItem('zoet-gebaar-demo-content-v1');
        if (stored) preview = validate(JSON.parse(stored));
      } catch { /* Invalid drafts fall back to the published content. */ }
      const banner = document.createElement('div');
      banner.className = 'demo-preview-banner';
      banner.textContent = 'Demovoorbeeld · Je ziet lokale aanpassingen. De live website is niet gewijzigd. ';
      const exit = document.createElement('a');
      exit.href = window.location.pathname; exit.textContent = 'Demo verlaten';
      banner.append(exit); document.body.prepend(banner);
      document.querySelectorAll('a[href]').forEach(link => {
        if (link === exit) return;
        const url = new URL(link.href, window.location.href);
        if (url.origin === window.location.origin && /\/(index|webshop|over-ons|bestellen)\.html$/.test(url.pathname)) {
          url.searchParams.set('demo', '1'); link.href = url.href;
        }
      });
      return preview;
    });
  window.ZoetContent = {validate, money, price, ready};
  // Leave the static content readable if the content request fails.
  ready.then(data => {
    document.querySelectorAll('.announcement').forEach(el => { el.textContent = data.announcement; });
    const intro = document.querySelector('.hero .lede');
    if (intro) intro.textContent = data.intro;
    const note = document.querySelector('#assortiment .note-box');
    if (note) note.textContent = data.shopNote;
    document.querySelectorAll('.shop-card').forEach((card, i) => {
      const p = data.products[i];
      card.querySelector('h3').textContent = p.name;
      card.querySelector('.desc').textContent = p.description;
      card.querySelector('.price').textContent = p.available ? price(p) : 'Tijdelijk niet beschikbaar';
    });
    document.querySelectorAll('.product-preview').forEach((card, i) => {
      const p = data.products[i];
      card.querySelector('h3').textContent = p.name;
      const caption = card.querySelector('.product-caption p');
      caption.textContent = `${p.mix === 'gewoon' ? 'Gewone mix' : 'Zonder gelatine'} · ${p.available ? price(p) : 'Tijdelijk niet beschikbaar'}`;
    });
  }).catch(() => {});
})();
