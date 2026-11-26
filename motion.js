// Motion with GSAP (ScrollTrigger, SplitText, Flip). Everything stays readable without it:
// the inline script in <head> only adds .has-motion when the visitor allows motion, and removes it again
// if this file does not start in time.
(() => {
  const root = document.documentElement;
  const off = () => root.classList.remove('has-motion');
  window.ZoetMotion = {reveal() {}};
  if (!root.classList.contains('has-motion')) return;
  if (!window.gsap || !window.ScrollTrigger) return off();
  window.__zoetMotion = true;

  const plugins = [ScrollTrigger, window.SplitText, window.Flip].filter(Boolean);
  gsap.registerPlugin(...plugins);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const ready = el => el.classList.add('is-ready');

  window.ZoetMotion.reveal = nodes => {
    gsap.from([...nodes], {autoAlpha: 0, y: 30, duration: .9, ease: 'power3.out', stagger: .08});
  };

  // Headings rise line by line out of a mask.
  function splitLines(el, {delay = 0, immediate = false} = {}) {
    ready(el);
    if (!window.SplitText) {
      return gsap.from(el, {autoAlpha: 0, y: 40, duration: 1, delay, scrollTrigger: immediate ? undefined : {trigger: el, start: 'top 88%', once: true}});
    }
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: self => gsap.from(self.lines, {
        yPercent: 135, duration: 1.25, ease: 'expo.out', stagger: .09, delay,
        scrollTrigger: immediate ? undefined : {trigger: el, start: 'top 88%', once: true},
      }),
    });
  }

  function heroIntro() {
    const hero = document.querySelector('[data-hero]');
    if (!hero) return;
    const title = hero.querySelector('h1');
    if (title) splitLines(title, {immediate: true, delay: .1});
    const items = $$('[data-hero-item]', hero);
    items.forEach(ready);
    gsap.from(items, {autoAlpha: 0, y: 28, duration: 1, ease: 'power3.out', stagger: .1, delay: .45});
    const photos = $$('.hero-photo', hero);
    photos.forEach((photo, i) => {
      ready(photo);
      gsap.fromTo(photo, {clipPath: 'inset(100% 0% 0% 0%)'}, {clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', delay: .2 + i * .18});
      gsap.from(photo.querySelector('img'), {scale: 1.35, duration: 2, ease: 'expo.out', delay: .2 + i * .18});
      gsap.to(photo, {yPercent: i ? -16 : -6, ease: 'none', scrollTrigger: {trigger: hero, start: 'top top', end: 'bottom top', scrub: true}});
    });
  }

  function reveals() {
    const els = $$('[data-reveal]').filter(el => !el.closest('[data-hero]'));
    els.forEach(el => { gsap.set(el, {autoAlpha: 0, y: 36}); ready(el); });
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: batch => gsap.to(batch, {autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .1, overwrite: true}),
    });
    $$('[data-split]').filter(el => !el.closest('[data-hero]')).forEach(el => splitLines(el));
  }

  // Images open from the bottom like a curtain, then settle.
  function clips() {
    $$('[data-clip]').forEach(el => {
      ready(el);
      const img = el.querySelector('img');
      const tl = gsap.timeline({scrollTrigger: {trigger: el, start: 'top 86%', once: true}});
      tl.fromTo(el, {clipPath: 'inset(100% 0% 0% 0%)'}, {clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut'});
      if (img) tl.from(img, {scale: 1.3, duration: 1.8, ease: 'expo.out'}, 0);
    });
    $$('[data-parallax]').forEach(img => {
      gsap.fromTo(img, {yPercent: -10}, {yPercent: 0, ease: 'none', scrollTrigger: {trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true}});
    });
  }

  // Endless marquee at one calm, steady pace (one loop every 38 seconds).
  function marquees() {
    $$('[data-marquee]').forEach(marquee => {
      const track = marquee.querySelector('.marquee-track');
      const group = track?.querySelector('.marquee-group');
      if (!group) return;
      const clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.append(clone);
      gsap.to(track, {xPercent: -50, duration: 38, ease: 'none', repeat: -1});
    });
  }

  // Buttons lean gently towards the pointer.
  function magnetic() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    $$('.btn').forEach(btn => {
      const x = gsap.quickTo(btn, 'x', {duration: .5, ease: 'power3.out'});
      const y = gsap.quickTo(btn, 'y', {duration: .5, ease: 'power3.out'});
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * .22);
        y((e.clientY - r.top - r.height / 2) * .3);
      });
      btn.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  const fontsReady = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise(r => setTimeout(r, 1200))]);
  const start = () => fontsReady.then(() => {
    try {
      heroIntro(); reveals(); clips(); marquees(); magnetic();
      window.addEventListener('load', () => ScrollTrigger.refresh());
    } catch (error) {
      console.error(error);
      off();
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
