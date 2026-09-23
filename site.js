// Shared navigation and a local wishlist. No orders or payments are submitted.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.links');
  const closeMenu = () => {
    links?.classList.remove('open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Menu openen');
  };
  toggle?.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.nav')) closeMenu();
  });
  links?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links?.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 761px)').addEventListener('change', closeMenu);

  const cards = [...document.querySelectorAll('.shop-card')];
  if (!cards.length) return;
  const chips = [...document.querySelectorAll('.filter-chip')];
  const count = document.querySelector('.product-count');
  function filterProducts(filter) {
    const value = chips.some(chip => chip.dataset.filter === filter) ? filter : 'alle';
    chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.filter === value)));
    cards.forEach(card => { card.hidden = value !== 'alle' && card.dataset.mix !== value; });
    count.textContent = `${cards.filter(card => !card.hidden).length} producten`;
  }
  chips.forEach(chip => chip.addEventListener('click', () => filterProducts(chip.dataset.filter)));
  filterProducts(new URLSearchParams(location.search).get('mix'));

  const key = 'zoet-gebaar-wishlist-v1';
  let saved = [];
  try {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(data)) saved = [...new Set(data.filter(id => Number.isInteger(id) && id >= 0 && id < cards.length))];
  } catch { /* The wishlist also works in memory when browser storage is unavailable. */ }
  const pill = document.querySelector('.cart-pill');
  const dialog = document.querySelector('.wishlist-dialog');
  const items = document.querySelector('.wishlist-items');
  const status = document.querySelector('#shop-status');
  function render() {
    pill.querySelector('.count').textContent = saved.length;
    pill.classList.toggle('show', saved.length > 0);
    cards.forEach((card, id) => {
      const button = card.querySelector('.add-btn');
      const selected = saved.includes(id);
      button.dataset.added = String(selected);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? 'Bewaard in je lijstje ✓' : 'Bewaar in je lijstje';
    });
    items.replaceChildren();
    if (!saved.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-list';
      empty.textContent = 'Je lijstje is nog leeg. Welk doosje maakt jou blij?';
      items.append(empty);
    }
    saved.forEach(id => {
      const card = cards[id];
      const row = document.createElement('div');
      row.className = 'wishlist-item';
      const photo = card.querySelector('img').cloneNode();
      photo.alt = '';
      const info = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = card.querySelector('h3').textContent;
      const mix = document.createElement('p');
      mix.textContent = `${card.dataset.mix === 'gewoon' ? 'Gewone mix' : 'Zonder gelatine'} · prijs volgt`;
      info.append(title, mix);
      const remove = document.createElement('button');
      remove.className = 'remove-item';
      remove.textContent = 'Verwijder';
      remove.setAttribute('aria-label', `${title.textContent}, ${mix.textContent}, verwijderen`);
      remove.addEventListener('click', () => {
        saved = saved.filter(value => value !== id);
        persist();
        dialog.querySelector('.close-dialog').focus();
      });
      row.append(photo, info, remove);
      items.append(row);
    });
    dialog.querySelector('.clear-list').hidden = saved.length === 0;
  }
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* Keep current-session choices. */ }
    render();
  }
  cards.forEach((card, id) => card.querySelector('.add-btn').addEventListener('click', () => {
    const exists = saved.includes(id);
    saved = exists ? saved.filter(value => value !== id) : [...saved, id];
    persist();
    status.textContent = `${card.querySelector('h3').textContent} ${exists ? 'verwijderd uit' : 'bewaard in'} je lijstje.`;
  }));
  pill.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (!saved.length) cards.find(card => !card.hidden)?.querySelector('.add-btn').focus();
  });
  dialog.querySelector('.clear-list').addEventListener('click', () => {
    saved = [];
    persist();
    dialog.querySelector('.close-dialog').focus();
  });
  render();
});
