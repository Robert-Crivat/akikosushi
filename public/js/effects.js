(function () {
  'use strict';

  // Rete di sicurezza: se per qualsiasi motivo un elemento armato non viene
  // mai marcato visibile dall'observer (bug, tab in background, edge case
  // del browser), dopo un po' lo forziamo comunque visibile. Il contenuto
  // non deve MAI restare bloccato invisibile.
  function armWithFallback(el) {
    el.classList.add('reveal-armed');
    window.setTimeout(function () {
      el.classList.add('is-visible');
    }, 4000);
  }

  function initReveal() {
    const targets = document.querySelectorAll('.reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    targets.forEach(function (el) {
      armWithFallback(el);
      observer.observe(el);
    });
  }

  function observeReveal(el, delayMs) {
    if (!el) return;
    el.classList.add('reveal');
    if (delayMs) el.style.setProperty('--reveal-delay', delayMs / 1000 + 's');
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-visible');
      return;
    }
    if (!observeReveal._observer) {
      observeReveal._observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observeReveal._observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
      );
    }
    armWithFallback(el);
    observeReveal._observer.observe(el);
  }

  function initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    let ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    }
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  function runCount(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = '1';
    const target = Number(el.dataset.countTo) || 0;
    const duration = 1400;
    const start = performance.now();
    el.classList.add('is-counting');
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target).toString();
      if (progress < 1) window.requestAnimationFrame(tick);
      else el.textContent = String(target);
    }
    window.requestAnimationFrame(tick);
  }

  function initCounters() {
    const counters = document.querySelectorAll('[data-count-to]');
    if (!counters.length) return;
    // Rete di sicurezza: il numero finale deve comparire comunque, anche se
    // l'observer non scatta mai (tab in background, bug del browser, ecc.).
    counters.forEach(function (el) {
      window.setTimeout(function () {
        if (!el.dataset.counted) {
          el.dataset.counted = '1';
          el.textContent = String(Number(el.dataset.countTo) || 0);
        }
      }, 4000);
    });
    if (!('IntersectionObserver' in window)) {
      counters.forEach(runCount);
      return;
    }
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          runCount(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) { observer.observe(el); });
  }

  let toastTimer = null;
  function toast(message) {
    let node = document.querySelector('.akiko-toast');
    if (node) node.remove();
    node = document.createElement('div');
    node.className = 'akiko-toast';
    node.textContent = message;
    document.body.appendChild(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.remove();
    }, 2200);
  }

  function bump(el) {
    if (!el) return;
    el.classList.remove('is-bumped');
    void el.offsetWidth;
    el.classList.add('is-bumped');
  }

  // Sezione "showcase" stile Apple: mentre la sezione scorre sotto la sticky,
  // la foto si ingrandisce e il testo sfuma, guidato dal progresso di scroll.
  function initShowcase() {
    const section = document.querySelector('[data-showcase]');
    if (!section) return;
    const frame = section.querySelector('[data-showcase-frame]');
    const label = section.querySelector('[data-showcase-label]');
    const sticky = section.querySelector('[data-showcase-sticky]');
    if (!frame || !label || !sticky) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;
    function update() {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const scrollDistance = Math.max(1, section.offsetHeight - vh);

      // Il trucco anti-buco: "fixed" solo mentre siamo dentro il range di
      // scroll, "absolute" ancorato al bordo alto/basso del contenitore
      // appena fuori range, cosi' il contenuto e' sempre visibile da
      // qualche parte, senza mai uno schermo vuoto in mezzo.
      if (rect.top > 0) {
        sticky.style.position = 'absolute';
        sticky.style.top = '0px';
      } else if (rect.bottom < vh) {
        sticky.style.position = 'absolute';
        sticky.style.top = scrollDistance + 'px';
      } else {
        sticky.style.position = 'fixed';
        sticky.style.top = '0px';
      }

      const progress = Math.min(1, Math.max(0, -rect.top / scrollDistance));
      const scale = 0.75 + progress * 0.25;
      const radius = 26 - progress * 26;
      frame.style.transform = 'scale(' + scale.toFixed(3) + ')';
      frame.style.borderRadius = radius.toFixed(1) + 'px';
      label.style.opacity = String(Math.max(0, 1 - progress * 1.6));
      label.style.transform = 'translateY(' + (progress * -50).toFixed(1) + 'px)';
    }
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', update);
    update();
  }

  window.AkikoFX = {
    observeReveal: observeReveal,
    toast: toast,
    bump: bump,
  };

  document.addEventListener('DOMContentLoaded', function () {
    initReveal();
    initHeaderScroll();
    initCounters();
    initShowcase();
  });
})();
