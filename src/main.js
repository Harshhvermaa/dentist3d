/* ============================================================
   main.js — scroll orchestration, nav, progress bar, form
   ============================================================ */
// NOTE: style.css is loaded via a <link> in index.html (render-blocking) so the
// page is styled instantly instead of waiting for this JS bundle (Three.js) to load.
import './layout.js'; // injects the shared nav + footer (and wires nav border)
import { createToothScene } from './tooth.js';
import { initTestiSlider } from './slider.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- boot the 3D tooth ---------- */
const canvas = document.getElementById('tooth-canvas');
let toothScene = null;
try {
  toothScene = createToothScene(canvas, { reducedMotion });
} catch (err) {
  // If WebGL is unavailable, hide the canvas gracefully — content still works.
  console.warn('3D tooth disabled:', err);
  canvas.style.display = 'none';
}

/* ---------- element refs ---------- */
const progressFill = document.getElementById('progressFill');

/* ---------- scroll handler ---------- */
// The tooth is driven across the first 3 full-viewport scenes.
// After that it fades out and the normal content takes over.
function onScroll() {
  const vh = window.innerHeight;
  const scrollY = window.scrollY;

  // ----- global progress bar (whole page) -----
  const docHeight = document.documentElement.scrollHeight - vh;
  const pageProgress = docHeight > 0 ? scrollY / docHeight : 0;
  if (progressFill) progressFill.style.width = (pageProgress * 100).toFixed(2) + '%';

  // ----- tooth scene progress (0..1 across scenes 1-3) -----
  if (toothScene) {
    const sceneSpan = vh * 3; // three 100vh scenes
    const p = Math.min(scrollY / (sceneSpan - vh), 1);

    // fade the canvas out as we leave scene 3 into the Services section
    const fadeStart = vh * 2.4;
    const fadeEnd = vh * 3.0;
    let fade = 1;
    if (scrollY > fadeStart) {
      fade = 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart);
    }
    fade = Math.max(0, Math.min(1, fade));

    toothScene.setProgress(p, fade);
  }
}

let ticking = false;
function requestScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }
}
window.addEventListener('scroll', requestScroll, { passive: true });
window.addEventListener('resize', requestScroll);
onScroll(); // set initial state

/* (scroll-reveal is handled site-wide by src/reveal.js via layout.js) */

/* ---------- Meet the dentists — interactive 3D stage ----------
   1) reveal (spring chips in) + count-up when the section scrolls in
   2) mouse-move parallax: tilt the scene, drift each layer by its depth */
const meet = document.querySelector('.meet');
if (meet) {
  const stage = document.getElementById('meetStage');
  const scene = document.getElementById('meetScene');
  const layers = scene ? scene.querySelectorAll('[data-depth]') : [];
  const counts = meet.querySelectorAll('.count');

  // count a number up from 0 → data-to with an ease-out
  function runCount(el) {
    const to = parseInt(el.dataset.to, 10) || 0;
    if (reducedMotion) {
      el.textContent = to.toLocaleString();
      return;
    }
    const dur = 1600;
    let start;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function revealMeet() {
    meet.classList.add('in');
    counts.forEach(runCount);
  }

  if ('IntersectionObserver' in window) {
    const meetIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            revealMeet();
            meetIO.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    meetIO.observe(meet);
  } else {
    revealMeet();
  }

  // 3D parallax — only on real pointer devices, and not for reduced motion
  const hoverable = window.matchMedia('(hover: hover)').matches;
  if (stage && scene && !reducedMotion && hoverable) {
    let raf = 0;
    let nx = 0;
    let ny = 0;

    const apply = () => {
      raf = 0;
      // subtle depth drift only — a tiny scene tilt, small per-layer shift
      // (keeps it smooth; the big rotate felt laggy)
      scene.style.transform = `rotateY(${nx * 1.6}deg) rotateX(${-ny * 1.6}deg)`;
      layers.forEach((el) => {
        const d = parseFloat(el.dataset.depth) || 0;
        el.style.setProperty('--px', (nx * d * 12).toFixed(1) + 'px');
        el.style.setProperty('--py', (ny * d * 12).toFixed(1) + 'px');
      });
    };

    stage.addEventListener(
      'mousemove',
      (e) => {
        const r = stage.getBoundingClientRect();
        nx = ((e.clientX - r.left) / r.width - 0.5) * 2; // -1..1
        ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
        if (!raf) raf = requestAnimationFrame(apply);
      },
      { passive: true }
    );

    stage.addEventListener('mouseleave', () => {
      nx = 0;
      ny = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    });
  }
}

/* ---------- Testimonials slider (shared module) ---------- */
initTestiSlider(reducedMotion);
