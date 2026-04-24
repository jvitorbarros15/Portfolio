/* ── Portfolio Script ── */
(function () {
    'use strict';

    /* ── Always start at top ── */
    if (history.scrollRestoration) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    /* ── DOM refs (declared first to avoid TDZ) ── */
    const splash    = document.getElementById('splash');
    const nav       = document.getElementById('nav');
    const toggle    = document.querySelector('.nav-toggle');
    const mobileNav = document.getElementById('navMobile');
    const sections  = document.querySelectorAll('section[id]');
    const navLinks  = document.querySelectorAll('.nav-link');
    const revealEls = document.querySelectorAll('.reveal');
    const form      = document.getElementById('contactForm');
    const successMsg = document.getElementById('formSuccess');

    /* ── Splash ── */
    if (splash) {
        window.addEventListener('load', () => {
            setTimeout(() => splash.classList.add('hidden'), 2000);
        });
    }

    /* ── Nav active highlight ── */
    function highlightNav() {
        let current = '';
        sections.forEach(sec => {
            if (window.scrollY >= sec.offsetTop - 100) current = sec.id;
        });
        navLinks.forEach(l => {
            l.classList.toggle('active', l.getAttribute('href') === '#' + current);
        });
    }

    /* ── Nav scroll ── */
    function onScroll() {
        if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
        highlightNav();
        checkReveal();
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ── Mobile nav ── */
    if (toggle && mobileNav) {
        toggle.addEventListener('click', () => {
            const open = mobileNav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
            toggle.children[0].style.transform = open ? 'rotate(45deg) translate(5px, 5px)' : '';
            toggle.children[1].style.opacity   = open ? '0' : '';
            toggle.children[2].style.transform = open ? 'rotate(-45deg) translate(5px, -5px)' : '';
        });
        document.querySelectorAll('.nav-mobile-link').forEach(l => {
            l.addEventListener('click', () => {
                mobileNav.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.children[0].style.transform = '';
                toggle.children[1].style.opacity   = '';
                toggle.children[2].style.transform = '';
            });
        });
    }

    /* ── Scroll reveal ── */
    function checkReveal() {
        const vh = window.innerHeight;
        revealEls.forEach(el => {
            if (el.classList.contains('visible')) return;
            if (el.getBoundingClientRect().top < vh * 0.93) {
                el.classList.add('visible');
            }
        });
    }

    window.addEventListener('resize', checkReveal, { passive: true });
    checkReveal();
    requestAnimationFrame(checkReveal);
    setTimeout(checkReveal, 200);
    setTimeout(checkReveal, 2300);

    /* ── Smooth scroll ── */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href').slice(1);
            const target = document.getElementById(id);
            if (!target) return;
            e.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - (nav ? nav.offsetHeight : 0);
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    /* ── Contact form ── */
    if (form) {
        form.addEventListener('submit', e => {
            e.preventDefault();
            const name    = form.querySelector('#c-name').value.trim();
            const email   = form.querySelector('#c-email').value.trim();
            const message = form.querySelector('#c-message').value.trim();
            if (!name || !email || !message || !email.includes('@')) return;

            if (window.gtag) gtag('event', 'form_submit', { event_category: 'contact', event_label: 'contact_form' });
            if (window.dataLayer) dataLayer.push({ event: 'form_submit', form_type: 'contact' });

            if (successMsg) {
                successMsg.classList.add('show');
                form.reset();
                setTimeout(() => successMsg.classList.remove('show'), 5000);
            }
        });
    }

    /* ── Initial nav state ── */
    onScroll();

})();
