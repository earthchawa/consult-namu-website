/* =========================================================
   CONSULT NAMU — small effects for both pages
   Everything here is optional: if this file is missing,
   the pages still show all the text and links.
   ========================================================= */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Fade-in as things scroll into view ---------- */
  var reveals = $$('.reveal');
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var sibs = [].filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
        el.style.transitionDelay = Math.min(sibs.indexOf(el), 5) * 80 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Header hides when scrolling down, returns when scrolling up ---------- */
  var header = $('.header'), lastY = window.scrollY;
  var cta = $('#mobileCta'), hero = $('#hero'), contact = $('#contact');
  function onScroll() {
    var y = window.scrollY;
    if (header) header.classList.toggle('hide', y > lastY && y > 300);
    lastY = y;
    if (cta && hero && contact) {
      var pastHero = hero.getBoundingClientRect().bottom < 0;
      var atContact = contact.getBoundingClientRect().top < window.innerHeight;
      cta.classList.toggle('show', pastHero && !atContact);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Drag to compare ---------- */
  var box = $('#compareBox');
  if (box) {
    var range = $('.compare-range', box);
    range.addEventListener('input', function () { box.style.setProperty('--pos', range.value + '%'); box.classList.add('touched'); });
    /* One small hint movement the first time it appears */
    if (!reduce && hasIO) {
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

  /* ---------- Spec sheet ticks off row by row ---------- */
  var spec = $('#spec');
  if (spec) {
    var oks = $$('.spec-ok', spec);
    function finish(i) {
      oks[i].textContent = oks[i].dataset.ok;
      oks[i].classList.add('done');
      if (i === oks.length - 1) spec.classList.add('signed');
    }
    if (reduce || !hasIO) { oks.forEach(function (o, i) { finish(i); }); }
    else {
      var so = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        so.disconnect();
        oks.forEach(function (o, i) { setTimeout(function () { finish(i); }, 500 + i * 450); });
      }, { threshold: 0.5 });
      so.observe(spec);
    }
  }

  /* ---------- Services: panel shows the service in the middle of the screen ---------- */
  var svcItems = $$('.svc-item'), svcIcon = $('#svcIcon'), svcNum = $('#svcNum'), ticks = $$('.svc-ticks i');
  function setSvc(i) {
    svcItems.forEach(function (it, k) { it.classList.toggle('active', k === i); });
    ticks.forEach(function (t, k) { t.classList.toggle('on', k <= i); });
    if (svcNum) svcNum.textContent = ('0' + (i + 1)).slice(-2);
    if (svcIcon) svcIcon.innerHTML = $('svg', svcItems[i]).outerHTML;
  }
  if (svcItems.length) {
    setSvc(0);
    if (hasIO) {
      var sio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) setSvc(svcItems.indexOf(e.target)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      svcItems.forEach(function (it) { sio.observe(it); });
    }
  }

  /* ---------- FAQ: open / close ---------- */
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

  /* ---------- About page: the route line fills, stops light up ---------- */
  var story = $('#story');
  if (story) {
    var line = $('.story-line', story), chapters = $$('.chapter', story), minis = $$('.mini-stops li', story);
    function track() {
      var vh = window.innerHeight, mark = vh * 0.6;
      var r = line.getBoundingClientRect();
      var p = reduce ? 1 : Math.min(1, Math.max(0, (mark - r.top) / (r.height || 1)));
      line.style.setProperty('--prog', p);
      chapters.forEach(function (c) { c.classList.toggle('lit', reduce || $('.stop', c).getBoundingClientRect().top < mark); });
      minis.forEach(function (m) { m.classList.toggle('lit', reduce || m.getBoundingClientRect().top < mark); });
    }
    window.addEventListener('scroll', track, { passive: true });
    window.addEventListener('resize', track);
    track();
  }
})();
