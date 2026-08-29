/* ============================================================
   layout.js — shared site chrome (nav + footer)
   Injected into every page so the header/footer live in ONE place.
   Each page sets <body data-page="home|about|services|blog|contact">
   to get the correct active-link highlight.
   ============================================================ */

import './reveal.js'; // scroll-reveal for every page

// '/' in dev, '/dentist3d/' in the GitHub Pages build (see vite.config.js).
// Every link below is built from it so the site works at either root.
const B = import.meta.env.BASE_URL;

const LINKS = [
  { href: B, page: 'home', label: 'Home' },
  { href: `${B}about.html`, page: 'about', label: 'About Us' },
  { href: `${B}services.html`, page: 'services', label: 'Services' },
  { href: `${B}blog.html`, page: 'blog', label: 'Blog' },
  { href: `${B}contact.html`, page: 'contact', label: 'Contact Us' },
];

function navHTML(active) {
  const links = LINKS.map(
    (l) =>
      `<a href="${l.href}" data-page="${l.page}"${
        l.page === active ? ' class="is-active" aria-current="page"' : ''
      }>${l.label}</a>`
  ).join('');

  return `
  <header class="nav" id="nav">
    <div class="nav__inner">
      <a href="${B}" class="nav__brand" aria-label="Srivastava Multispeciality Dental Clinic">
        <span class="nav__mark">🦷</span>
        <span>Srivastava<span class="nav__brand-accent"> Dental</span></span>
      </a>

      <nav class="nav__links" id="navLinks" aria-label="Primary">${links}</nav>

      <a href="${B}contact.html" class="btn btn--pill btn--primary nav__cta">Book a visit</a>

      <button class="nav__burger" id="navBurger" type="button" aria-label="Menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>`;
}

function footerHTML() {
  return `
  <footer class="footer">
    <div class="wrap footer__grid">
      <div>
        <a href="${B}" class="nav__brand footer__brand">
          <span class="nav__mark">🦷</span>
          <span>Srivastava<span class="nav__brand-accent"> Dental</span></span>
        </a>
        <p class="footer__tag">World-class dental treatment at affordable rates — our motto since day one.</p>
        <p class="footer__iso">🏅 ISO 9001:2008 Certified Clinic</p>
      </div>
      <nav class="footer__col" aria-label="Footer">
        <span class="footer__h">Explore</span>
        <a href="${B}about.html">About Us</a>
        <a href="${B}services.html">Services</a>
        <a href="${B}blog.html">Blog</a>
        <a href="${B}contact.html">Contact Us</a>
      </nav>
      <div class="footer__col">
        <span class="footer__h">Contact</span>
        <span>Agra, Uttar Pradesh</span>
        <a href="tel:+915622526465">0562-2526465</a>
        <a href="tel:+915622527375">0562-2527375</a>
        <a href="mailto:info@srivastavadental.in">info@srivastavadental.in</a>
      </div>
    </div>
    <div class="footer__bar">
      <span>© Srivastava Multispeciality Dental Clinic (SMDC), Agra.</span>
      <span>
        3D model “Mouth” by
        <a href="https://sketchfab.com/TaddySouza" target="_blank" rel="noopener nofollow">TaddyModels</a>
        on
        <a href="https://sketchfab.com/3d-models/mouth-fdbda2b6e59d4c75b77f8997b1f944cb" target="_blank" rel="noopener nofollow">Sketchfab</a>
        (CC-BY).
      </span>
    </div>
  </footer>`;
}

function mount() {
  const active = document.body.dataset.page || '';

  const navSlot = document.getElementById('site-nav');
  if (navSlot) navSlot.outerHTML = navHTML(active);

  const footSlot = document.getElementById('site-footer');
  if (footSlot) footSlot.outerHTML = footerHTML();

  const nav = document.getElementById('nav');
  const burger = document.getElementById('navBurger');
  const links = document.getElementById('navLinks');

  // border/blur once you scroll down a touch
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // mobile menu
  if (burger && nav && links) {
    const close = () => {
      nav.classList.remove('nav--open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('nav--open');
      burger.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') close();
    });
  }
}

// module scripts are deferred, so the DOM is already parsed here
mount();
