// Shared navigation, the product filter and a local wishlist. The order itself is sent from bestellen.html.
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('.links');
  const header = document.querySelector('.site-header');
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
    if (!event.target.closest?.('.nav')) closeMenu();
  });
  links?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && links?.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', closeMenu);

  // The header steps aside while scrolling down and returns when scrolling up.
  if (header) {
    let last = window.scrollY;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 40);
      const menuOpen = links?.classList.contains('open');
      header.classList.toggle('is-hidden', !menuOpen && y > 240 && y > last && !header.contains(document.activeElement));
      last = y;
    };
    window.addEventListener('scroll', update, {passive: true});
    update();
  }

  // Partner logos only appear once their file has been added to assets/.
  document.querySelectorAll?.('img[data-optional-logo]').forEach(img => {
    const show = () => { if (img.naturalWidth) img.hidden = false; };
    if (img.complete) show(); else img.addEventListener('load', show);
  });

  const cards = [...document.querySelectorAll('.shop-card')];
  if (!cards.length) return;
  const groups = [...document.querySelectorAll('.shop-group')];
  const chips = [...document.querySelectorAll('.filter-chip')];
  const count = document.querySelector('.product-count');
  function filterProducts(filter, animate) {
    const value = chips.some(chip => chip.dataset.filter === filter) ? filter : 'alle';
    const flip = animate && window.Flip && window.gsap && document.documentElement.classList.contains('has-motion');
    const state = flip ? Flip.getState([...groups, ...cards]) : null;
    chips.forEach(chip => chip.setAttribute('aria-pressed', String(chip.dataset.filter === value)));
    cards.forEach(card => { card.hidden = value !== 'alle' && card.dataset.mix !== value; });
    groups.forEach(group => { group.hidden = value !== 'alle' && group.dataset.mix !== value; });
    const visible = cards.filter(card => !card.hidden).length;
    count.textContent = `${visible} ${visible === 1 ? 'doosje' : 'doosjes'}`;
    if (state) {
      Flip.from(state, {
        duration: .8, ease: 'power3.inOut', absolute: true, nested: true, prune: true,
        onEnter: els => gsap.fromTo(els, {opacity: 0, y: 40}, {opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: .06}),
        onLeave: els => gsap.to(els, {opacity: 0, duration: .3}),
        onComplete: () => window.ScrollTrigger?.refresh(),
      });
    }
  }
  chips.forEach(chip => chip.addEventListener('click', () => filterProducts(chip.dataset.filter, true)));
  filterProducts(new URLSearchParams(location.search).get('mix'), false);

  // The wishlist stores product IDs. Older visits stored positions in the previous product order.
  const key = 'zoet-gebaar-wishlist-v2';
  const legacyKey = 'zoet-gebaar-wishlist-v1';
  const legacyOrder = ['klein-gewoon', 'klein-zonder-gelatine', 'middel-gewoon', 'middel-zonder-gelatine', 'groot-gewoon', 'groot-zonder-gelatine'];
  const known = cards.map(card => card.dataset.product);
  let saved = [];
  try {
    let data = JSON.parse(localStorage.getItem(key) || 'null');
    if (data === null) data = JSON.parse(localStorage.getItem(legacyKey) || '[]').map(i => legacyOrder[i]);
    if (Array.isArray(data)) saved = [...new Set(data.filter(id => known.includes(id)))];
  } catch { /* The wishlist also works in memory when browser storage is unavailable. */ }
  const pill = document.querySelector('.cart-pill');
  const status = document.querySelector('#shop-status');
  function render() {
    pill.querySelector('.count').textContent = saved.length;
    cards.forEach(card => {
      const button = card.querySelector('.add-btn');
      const selected = saved.includes(card.dataset.product);
      button.dataset.added = String(selected);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? 'In je lijstje' : 'Bewaar in je lijstje';
    });
  }
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* Keep current-session choices. */ }
    render();
  }
  cards.forEach(card => card.querySelector('.add-btn').addEventListener('click', () => {
    const id = card.dataset.product;
    const exists = saved.includes(id);
    saved = exists ? saved.filter(value => value !== id) : [...saved, id];
    persist();
    const name = card.querySelector('.name')?.textContent ?? '';
    const variant = card.querySelector('.variant')?.textContent ?? '';
    status.textContent = `${name}, ${variant.toLowerCase()}, ${exists ? 'verwijderd uit' : 'bewaard in'} je lijstje.`;
    if (!exists && window.gsap && document.documentElement.classList.contains('has-motion')) {
      gsap.fromTo(pill, {scale: 1}, {scale: 1.08, duration: .18, yoyo: true, repeat: 1, ease: 'power2.out'});
    }
  }));
  render();
});
