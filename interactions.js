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
  /* First time it appears: show the unchecked bag and its faults, then glide the
     handle to the middle to reveal the approved spec. "Replay" runs it again. */
  var box = $('#compareBox');
  if (box) {
    var range = $('.compare-range', box), timers = [], raf, userTook = false;
    function setPos(v) { box.style.setProperty('--pos', v + '%'); range.value = v; }
    function clear() { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); box.classList.remove('gliding'); }
    function counters() {
      $$('[data-count]', box).forEach(function (el) {
        var to = parseFloat(el.dataset.count), fmt = el.dataset.fmt, d = parseFloat(el.dataset.d) * 1000;
        el.textContent = fmt.replace('{v}', '0.0');
        timers.push(setTimeout(function () {
          var t0 = performance.now();
          (function step(n) {
            var k = Math.min(1, (n - t0) / 700);
            el.textContent = fmt.replace('{v}', (to * (1 - Math.pow(1 - k, 3))).toFixed(1));
            if (k < 1) requestAnimationFrame(step);
          })(t0);
        }, d));
      });
    }
    function glide(from, to, ms) {
      var t0 = performance.now(); box.classList.add('gliding');
      (function step(n) {
        if (userTook) { box.classList.remove('gliding'); return; }
        var k = Math.min(1, (n - t0) / ms), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        setPos(from + (to - from) * e);
        if (k < 1) raf = requestAnimationFrame(step); else box.classList.remove('gliding');
      })(t0);
    }
    function play() {
      clear(); userTook = false;
      if (reduce) { box.classList.add('play'); setPos(50); return; }
      box.classList.remove('play'); setPos(0); void box.offsetWidth; box.classList.add('play'); counters();
      timers.push(setTimeout(function () { glide(0, 50, 1200); }, 3500));
    }
    range.addEventListener('input', function () { box.style.setProperty('--pos', range.value + '%'); });
    ['pointerdown', 'touchstart', 'keydown'].forEach(function (ev) {
      range.addEventListener(ev, function () { userTook = true; clear(); box.classList.add('play'); }, { passive: true });
    });
    var replay = $('#replayInspect');
    if (replay) replay.addEventListener('click', play);
    if (hasIO) {
      var cio = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { play(); cio.disconnect(); }
      }, { threshold: 0.55 });
      cio.observe(box);
    } else { play(); }
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

  /* ---------- Services: the container for the service you are reading slides out ----------
     A service becomes active once its top passes 45% of the screen height.
     Pointing at a service also selects it. scenes.js draws the containers. */
  var svcItems = $$('.svc3-item'), svcNum = $('#svcNum'), svcName = $('#svcName');
  var svcNow = -1, svcHover = -1;
  function setSvc(i) {
    if (i === svcNow) return;
    svcNow = i;
    svcItems.forEach(function (it, k) { it.classList.toggle('active', k === i); });
    if (svcNum) svcNum.textContent = ('0' + (i + 1)).slice(-2);
    if (svcName) svcName.textContent = $('h3', svcItems[i]).textContent;
    if (window.NAMU_setService) window.NAMU_setService(i);
  }
  if (svcItems.length) {
    function svcTrack() {
      if (svcHover >= 0) return;
      var line = window.innerHeight * 0.45, idx = 0;
      svcItems.forEach(function (it, k) { if (it.getBoundingClientRect().top < line) idx = k; });
      setSvc(idx);
    }
    svcItems.forEach(function (it, k) {
      it.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { svcHover = k; setSvc(k); } });
      it.addEventListener('pointerleave', function () { svcHover = -1; });
    });
    window.addEventListener('scroll', svcTrack, { passive: true });
    window.addEventListener('resize', svcTrack);
    window.addEventListener('load', function () { var i = svcNow; svcNow = -1; setSvc(Math.max(0, i)); });
    svcTrack();
  }

  /* ---------- What we make: pick a project to see it in 3D ----------
     Cycles through the projects on its own until someone picks one. */
  var makeItems = $$('.make-item'), makeKind = $('#makeKind'), makeQty = $('#makeQty');
  if (makeItems.length) {
    var makeNow = 0, picked = false, cycle = null;
    function setMake(i) {
      makeNow = i;
      makeItems.forEach(function (b, k) { b.classList.toggle('active', k === i); b.setAttribute('aria-pressed', k === i); });
      if (makeKind) makeKind.textContent = $('.make-k', makeItems[i]).textContent;
      if (makeQty) makeQty.textContent = $('.make-q', makeItems[i]).textContent;
      if (window.NAMU_setProduct) window.NAMU_setProduct(makeItems[i].dataset.obj);
    }
    makeItems.forEach(function (b, k) {
      b.addEventListener('click', function () { picked = true; setMake(k); });
      b.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { picked = true; setMake(k); } });
      b.addEventListener('focus', function () { picked = true; setMake(k); });
    });
    var stage = $('#products');
    if (stage) stage.addEventListener('pointerdown', function () { picked = true; });
    setMake(0);
    if (!reduce && hasIO) {
      new IntersectionObserver(function (es) {
        clearInterval(cycle);
        if (es[0].isIntersecting) cycle = setInterval(function () { if (!picked) setMake((makeNow + 1) % makeItems.length); }, 4200);
      }, { threshold: 0.4 }).observe($('.make-body'));
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
