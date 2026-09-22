// Zoet Gebaar — shared behaviour (mobile nav + webshop POC interactions)

document.addEventListener('DOMContentLoaded', () => {
  // One deliberate entrance moment on the hero jar — not repeated on every card.
  const jar = document.querySelector('.hero-art svg');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (jar && !reduceMotion) {
    jar.style.transformOrigin = '50% 100%';
    jar.style.animation = 'jar-settle 0.6s cubic-bezier(.2,.8,.2,1) both';
    if (!document.getElementById('jar-settle-kf')) {
      const style = document.createElement('style');
      style.id = 'jar-settle-kf';
      style.textContent = '@keyframes jar-settle{from{opacity:0;transform:translateY(14px) rotate(-2deg);}to{opacity:1;transform:translateY(0) rotate(0);}}';
      document.head.appendChild(style);
    }
  }

  const toggle = document.querySelector('.menu-toggle');
  const links = document.querySelector('nav.links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  // Webshop mix filter (client-side, cosmetic — no real inventory)
  const chips = document.querySelectorAll('.filter-chip');
  const cards = document.querySelectorAll('.shop-card');
  if (chips.length && cards.length) {
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
        chip.setAttribute('aria-pressed', 'true');
        const filter = chip.dataset.filter;
        cards.forEach(card => {
          const match = filter === 'alle' || card.dataset.mix === filter;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  }

  // Add-to-cart POC — local pill counter only, nothing is actually ordered
  const addButtons = document.querySelectorAll('.add-btn');
  const cartPill = document.querySelector('.cart-pill');
  let count = 0;
  if (addButtons.length && cartPill) {
    addButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        count += 1;
        btn.dataset.added = 'true';
        btn.textContent = 'Toegevoegd ✓';
        cartPill.querySelector('.count').textContent = count;
        cartPill.classList.add('show');
        setTimeout(() => {
          btn.dataset.added = 'false';
          btn.textContent = 'In winkelmandje';
        }, 1400);
      });
    });
  }
});
