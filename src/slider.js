/* ============================================================
   slider.js — testimonials slider (shared by home + about)
   Native scroll-snap track; JS wires arrows, dots, active state
   and autoplay-while-visible.
   ============================================================ */
export function initTestiSlider(reducedMotion) {
  const testiTrack = document.getElementById('testiTrack');
  if (!testiTrack) return;

  const cards = Array.from(testiTrack.children);
  const dotsWrap = document.getElementById('testiDots');
  const prevBtn = document.getElementById('testiPrev');
  const nextBtn = document.getElementById('testiNext');
  let current = 0;

  // one dot per card
  const dots = cards.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'testi-dot';
    dot.setAttribute('aria-label', `Go to review ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  const stepPx = () =>
    cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : cards[0].offsetWidth;

  function goTo(i) {
    const idx = Math.max(0, Math.min(cards.length - 1, i));
    testiTrack.scrollTo({
      left: cards[idx].offsetLeft - cards[0].offsetLeft,
      behavior: 'smooth',
    });
  }

  function syncActive() {
    const maxScroll = testiTrack.scrollWidth - testiTrack.clientWidth;
    current =
      testiTrack.scrollLeft >= maxScroll - 2
        ? cards.length - 1
        : Math.round(testiTrack.scrollLeft / stepPx());
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  let ticking = false;
  testiTrack.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          syncActive();
          ticking = false;
        });
      }
    },
    { passive: true }
  );

  prevBtn.addEventListener('click', () => goTo(current === 0 ? cards.length - 1 : current - 1));
  nextBtn.addEventListener('click', () => goTo(current >= cards.length - 1 ? 0 : current + 1));

  // autoplay — only while visible, and never with reduced motion
  let timer = null;
  const stop = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
  const play = () => {
    if (reducedMotion || timer) return;
    timer = setInterval(() => goTo(current >= cards.length - 1 ? 0 : current + 1), 5000);
  };

  ['mouseenter', 'touchstart', 'focusin'].forEach((ev) =>
    testiTrack.addEventListener(ev, stop, { passive: true })
  );
  ['mouseleave', 'touchend'].forEach((ev) =>
    testiTrack.addEventListener(ev, play, { passive: true })
  );

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? play() : stop())),
      { threshold: 0.3 }
    ).observe(testiTrack);
  } else {
    play();
  }

  syncActive();
}
