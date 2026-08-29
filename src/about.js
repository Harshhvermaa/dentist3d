/* about.html entry — shared chrome + count-up + timeline + testimonials slider */
import './layout.js';
import { initTestiSlider } from './slider.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initTestiSlider(reduced);

/* ---------- count-up numbers ([data-to]) ---------- */
function runCount(el) {
  const to = parseInt(el.dataset.to, 10) || 0;
  if (reduced) {
    el.textContent = to.toLocaleString();
    return;
  }
  const dur = 1600;
  let start;
  const step = (t) => {
    if (start === undefined) start = t;
    const p = Math.min((t - start) / dur, 1);
    el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counts = document.querySelectorAll('.count[data-to]');
if (counts.length) {
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            runCount(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.6 }
    );
    counts.forEach((el) => io.observe(el));
  } else {
    counts.forEach(runCount);
  }
}

/* ---------- profile card: 3D tilt toward the cursor + glare ---------- */
const dpCard = document.getElementById('dpCard');
if (dpCard && !reduced && window.matchMedia('(hover: hover)').matches) {
  const inner = dpCard.querySelector('.dp-card__inner');
  const shine = dpCard.querySelector('.dp-card__shine');
  let raf = 0;
  let px = 0.5;
  let py = 0.5;

  const apply = () => {
    raf = 0;
    inner.style.transform = `rotateY(${(px - 0.5) * 16}deg) rotateX(${-(py - 0.5) * 16}deg)`;
    if (shine) {
      shine.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      shine.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }
  };

  dpCard.addEventListener(
    'mousemove',
    (e) => {
      const r = inner.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (shine) shine.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(apply);
    },
    { passive: true }
  );

  dpCard.addEventListener('mouseleave', () => {
    inner.style.transform = '';
    if (shine) shine.style.opacity = '0';
  });
}

/* ---------- timeline: fill the centre line as it scrolls past ---------- */
const timeline = document.getElementById('timeline');
const fill = document.getElementById('tlFill');
if (timeline && fill) {
  let ticking = false;
  const update = () => {
    ticking = false;
    const r = timeline.getBoundingClientRect();
    const vh = window.innerHeight;
    // 0 when the timeline top hits ~55% down the viewport, 1 once it's scrolled through
    const p = Math.max(0, Math.min(1, (vh * 0.55 - r.top) / r.height));
    fill.style.height = (p * 100).toFixed(1) + '%';
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  window.addEventListener('resize', update);
  update();
}
