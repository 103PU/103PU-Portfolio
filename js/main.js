/* 103PU Portfolio - page behaviour.
   No scroll event listeners anywhere: everything positional uses
   IntersectionObserver, and the WebGL scene runs its own frame loop. */

(() => {
  'use strict';

  const LANG_KEY = 'portfolio-lang';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- language ---------------- */

  const langButtons = Array.from(document.querySelectorAll('.lang-btn'));

  function applyLanguage(lang) {
    document.querySelectorAll('[data-en]').forEach((el) => {
      const next = el.getAttribute('data-' + lang);
      if (next !== null) el.innerHTML = next;
    });
    document.documentElement.setAttribute('lang', lang);
    langButtons.forEach((b) => b.classList.toggle('active', b.dataset.lang === lang));
    try { localStorage.setItem(LANG_KEY, lang); } catch (_) { /* private mode */ }
  }

  let stored = 'vi';
  try { stored = localStorage.getItem(LANG_KEY) || 'vi'; } catch (_) { /* private mode */ }
  applyLanguage(stored === 'en' ? 'en' : 'vi');

  langButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });

  /* ---------------- reveal on enter ---------------- */

  const revealTargets = document.querySelectorAll('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((el) => el.classList.add('in'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    revealTargets.forEach((el) => revealObserver.observe(el));
  }

  /* ---------------- nav: lift the pill once the top scrolls away ---------------- */

  const sentinel = document.querySelector('.nav-sentinel');
  if (sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      document.body.classList.toggle('nav-lifted', !entry.isIntersecting);
    }, { threshold: 0, rootMargin: '-56px 0px 0px 0px' }).observe(sentinel);
  }

  /* ---------------- nav: active section ---------------- */

  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const sections = Array.from(document.querySelectorAll('main section[id]'));

  if (navLinks.length && sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((e) => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let bestId = null;
      let bestRatio = 0;
      visible.forEach((ratio, id) => {
        if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
      });
      navLinks.forEach((l) => l.classList.toggle('active', bestId !== null && l.hash === '#' + bestId));
    }, { threshold: [0, 0.15, 0.35, 0.6] });

    sections.forEach((s) => sectionObserver.observe(s));
  }

  /* ---------------- brief form -> local mail draft ----------------
     There is no server behind this page. Rather than pretend a POST
     succeeded, the form validates locally and hands the composed text
     to the visitor's own mail client. */

  const form = document.getElementById('brief');
  const status = document.getElementById('brief-status');

  if (form && status) {
    const MSG = {
      vi: { bad: 'Vui lòng điền họ tên, email hợp lệ và lời nhắn.', ok: 'Đã mở email soạn sẵn. Kiểm tra ứng dụng mail của bạn.' },
      en: { bad: 'Please fill in a name, a valid email and a message.', ok: 'Mail draft opened. Check your mail app.' }
    };

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const lang = document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'vi';
      const data = new FormData(form);
      const name = String(data.get('name') || '').trim();
      const mail = String(data.get('email') || '').trim();
      const kind = String(data.get('kind') || '').trim();
      const body = String(data.get('message') || '').trim();

      const mailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail);
      if (!name || !mailOk || !body) {
        status.dataset.state = 'bad';
        status.textContent = MSG[lang].bad;
        return;
      }

      const subject = '[Portfolio] ' + kind + ' - ' + name;
      const lines = [body, '', 'From: ' + name, 'Reply to: ' + mail];
      window.location.href = 'mailto:dungbd2005@gmail.com'
        + '?subject=' + encodeURIComponent(subject)
        + '&body=' + encodeURIComponent(lines.join('\n'));

      status.dataset.state = 'ok';
      status.textContent = MSG[lang].ok;
    });
  }

  /* ---------------- WebGL glass form, loaded only when needed ---------------- */

  const stage = document.getElementById('stage');
  if (!stage) return;

  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
    } catch (_) {
      return false;
    }
  }

  if (reduceMotion || !webglAvailable()) {
    stage.dataset.fallback = 'on';
    return;
  }

  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    import('./scene.js')
      .then((mod) => mod.mount(stage))
      .catch(() => { stage.dataset.fallback = 'on'; });
  };

  if ('IntersectionObserver' in window) {
    const stageObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { boot(); stageObserver.disconnect(); }
    }, { rootMargin: '200px' });
    stageObserver.observe(stage);
  } else {
    boot();
  }
})();
