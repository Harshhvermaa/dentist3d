/* about.html entry — shared chrome + count-up + timeline + testimonials slider */
import './layout.js';
import { initTestiSlider } from './slider.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

initTestiSlider(reduced);

/* ---------- the team — one surgeon's profile at a time ----------
   Without JS every panel stays visible and they simply stack. */
const teamTabs = Array.from(document.querySelectorAll('.team-tab'));
if (teamTabs.length) {
  const panelFor = (tab) => document.getElementById(tab.getAttribute('aria-controls'));

  function selectTab(tab, focus) {
    teamTabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      const panel = panelFor(t);
      panel.hidden = !on;
      panel.classList.toggle('is-entering', on && !reduced);
    });
    if (focus) tab.focus();
  }

  teamTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(tab));
    // arrow keys move between tabs (standard tablist pattern)
    tab.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      selectTab(teamTabs[(i + step + teamTabs.length) % teamTabs.length], true);
    });
  });

  selectTab(teamTabs.find((t) => t.getAttribute('aria-selected') === 'true') || teamTabs[0]);
}

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

/* ---------- journey: pin the section and turn vertical scroll into
     horizontal travel, so all five steps pass 3-at-a-time before the page
     moves on. Disabled on narrow screens / reduced motion, where the track
     is just a normal swipe list (see .timeline:not(.is-pinned) in the CSS). */
const journey = document.getElementById('journey');
const jTrack = document.getElementById('tlTrack');
const jFill = document.getElementById('tlFill');

if (journey && jTrack && jFill) {
  let overflow = 0; // how far the track has to travel, in px
  let ticking = false;

  // Pin at every width — phones included — so the steps always pass
  // horizontally before the page moves on. Only reduced motion opts out.
  const canPin = () => !reduced;

  function measure() {
    if (!canPin()) {
      journey.classList.remove('is-pinned');
      journey.style.height = '';
      jTrack.style.transform = '';
      jFill.style.width = '0%';
      overflow = 0;
      return;
    }
    journey.classList.add('is-pinned');
    // measure with the track un-translated, or scrollWidth is misread
    jTrack.style.transform = 'none';
    overflow = Math.max(0, jTrack.scrollWidth - jTrack.clientWidth);
    // 1px of extra page height per 1px of horizontal travel
    journey.style.height = window.innerHeight + overflow + 'px';
    update();
  }

  function update() {
    ticking = false;
    if (!overflow) return;
    const top = journey.getBoundingClientRect().top;
    const total = journey.offsetHeight - window.innerHeight;
    const p = total > 0 ? Math.min(Math.max(-top / total, 0), 1) : 0;
    jTrack.style.transform = `translate3d(${(-p * overflow).toFixed(1)}px, 0, 0)`;
    jFill.style.width = (p * 100).toFixed(1) + '%';
  }

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', measure);
  // fonts landing later can change card heights / track width
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
}
