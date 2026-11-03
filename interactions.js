/* =========================================================
   CONSULT NAMU — small homepage effects
   Everything here is optional: if this file is missing,
   the page still shows all the text and links.
   ========================================================= */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }

  /* ---------- Fade-in as sections scroll into view ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target, sibs = [].filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 80 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Header hides when scrolling down, comes back when scrolling up ---------- */
  var header = $('.header'), lastY = window.scrollY;
  var cta = $('#mobileCta'), hero = $('#hero'), contact = $('#contact');
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('scrolled', y > 10);
    header.classList.toggle('hide', y > lastY && y > 300);
    lastY = y;
    if (cta && hero && contact) {
      var pastHero = hero.getBoundingClientRect().bottom < 0;
      var atContact = contact.getBoundingClientRect().top < window.innerHeight;
      cta.classList.toggle('show', pastHero && !atContact);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Hero: dots light up around the cursor ---------- */
  var lit = $('.hero-dots-lit');
  if (hero && lit) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      lit.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      lit.style.setProperty('--my', (e.clientY - r.top) + 'px');
      lit.style.opacity = 1;
    });
    hero.addEventListener('pointerleave', function () { lit.style.opacity = ''; });
  }

  /* ---------- Hero: "I'm a brand" / "I'm an agency" ---------- */
  var line = $('#heroLine'), heroCta = $('#heroCta');
  $$('.audience button').forEach(function (b) {
    b.addEventListener('click', function () {
      var aud = b.dataset.aud;
      $$('.audience button').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      line.classList.add('swap');
      setTimeout(function () {
        line.textContent = line.dataset[aud];
        heroCta.textContent = heroCta.dataset[aud + 'Text'];
        heroCta.href = heroCta.dataset[aud + 'Href'];
        line.classList.remove('swap');
      }, reduce ? 0 : 180);
    });
  });

  /* ---------- Drag to compare ---------- */
  var box = $('#compareBox');
  if (box) {
    var range = $('.compare-range', box);
    range.addEventListener('input', function () { box.style.setProperty('--pos', range.value + '%'); box.classList.add('touched'); });
    /* A small hint movement the first time it appears, so people know it moves */
    if (!reduce && 'IntersectionObserver' in window) {
      var hint = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting || box.classList.contains('touched')) return;
        hint.disconnect();
        var t0 = null;
        function step(t) {
          if (box.classList.contains('touched')) return;
          t0 = t0 || t;
          var k = (t - t0) / 1600;
          if (k > 1) { box.style.setProperty('--pos', '50%'); range.value = 50; return; }
          var v = 50 + Math.sin(k * Math.PI * 2) * 22;
          box.style.setProperty('--pos', v + '%'); range.value = v;
          requestAnimationFrame(step);
        }
        setTimeout(function () { requestAnimationFrame(step); }, 500);
      }, { threshold: 0.6 });
      hint.observe(box);
    }
  }

  /* ---------- Open / close rows (services and FAQ) ---------- */
  $$('.acc').forEach(function (list) {
    $$('.row-btn', list).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.parentNode, open = !item.classList.contains('open');
        $$('.open', list).forEach(function (o) { o.classList.remove('open'); $('.row-btn', o).setAttribute('aria-expanded', 'false'); });
        item.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open);
      });
    });
  });

  /* ---------- Spec sheet ticks off row by row ---------- */
  var spec = $('#spec');
  if (spec) {
    var oks = $$('.spec-ok', spec);
    function finish(i) {
      oks[i].textContent = oks[i].dataset.ok;
      oks[i].classList.add('done');
      if (i === oks.length - 1) spec.classList.add('signed');
    }
    if (reduce || !('IntersectionObserver' in window)) { oks.forEach(function (o, i) { finish(i); }); }
    else {
      var so = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        so.disconnect();
        oks.forEach(function (o, i) { setTimeout(function () { finish(i); }, 500 + i * 450); });
      }, { threshold: 0.5 });
      so.observe(spec);
    }
  }

  /* ---------- Count up "10+" ---------- */
  $$('.count').forEach(function (c) {
    if (reduce || !('IntersectionObserver' in window)) return;
    var to = +c.dataset.to; c.textContent = '0';
    var co = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      co.disconnect();
      var t0 = null;
      function step(t) { t0 = t0 || t; var k = Math.min(1, (t - t0) / 1200); c.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); }
      requestAnimationFrame(step);
    }, { threshold: 0.6 });
    co.observe(c);
  });
})();
