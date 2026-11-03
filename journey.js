/* =========================================================
   CONSULT NAMU — scroll journey map (homepage section 3)
   Moves an order from Thailand & China, through Hong Kong,
   across the Pacific to clients in the US as the visitor scrolls.
   No libraries needed.
   ========================================================= */
(function () {
  var root = document.getElementById('journey');
  if (!root) return;

  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function $(id) { return document.getElementById(id); }

  /* ---------- Dotted world map: stylised land shapes, not to scale ---------- */
  var land = [
    /* Mainland Asia */
    [[30,100],[300,50],[560,45],[640,70],[662,110],[640,122],[652,166],[626,172],[612,130],[588,150],[566,195],[548,240],[512,290],[478,322],[458,346],[410,360],[384,352],[372,384],[392,422],[362,470],[332,472],[322,512],[302,516],[300,472],[272,442],[250,428],[214,442],[198,470],[180,430],[140,410],[118,382],[90,422],[70,470],[48,420],[30,350]],
    /* Japan */
    [[684,96],[712,84],[730,110],[722,150],[700,196],[676,214],[662,196],[688,160],[700,120]],
    /* Taiwan */
    [[548,296],[562,290],[566,320],[552,330]],
    /* Philippines */
    [[574,348],[600,342],[612,402],[590,432],[568,396]],
    /* Borneo */
    [[420,498],[470,480],[522,498],[514,520],[428,520]],
    /* United States */
    [[980,128],[1120,122],[1180,126],[1228,148],[1250,170],[1268,150],[1300,140],[1340,128],[1392,120],[1396,156],[1372,186],[1350,226],[1326,262],[1318,300],[1298,330],[1306,372],[1314,404],[1296,416],[1282,372],[1260,346],[1222,338],[1192,356],[1162,364],[1124,340],[1068,330],[1020,314],[996,270],[984,210]],
    /* Mexico */
    [[1024,330],[1100,346],[1150,382],[1128,424],[1080,402],[1044,362]]
  ];
  function inside(x, y, poly) {
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  var frag = document.createDocumentFragment();
  var landDots = [];
  var GRID = 11;
  for (var y = GRID; y < 520; y += GRID) {
    for (var x = GRID; x < 1400; x += GRID) {
      var onLand = land.some(function (p) { return inside(x, y, p); });
      var d = el('circle', { cx: x, cy: y, r: onLand ? 1.55 : 0.75, 'class': onLand ? 'j-land' : 'j-sea' });
      frag.appendChild(d);
      if (onLand) landDots.push({ x: x, y: y, el: d });
    }
  }
  $('j-matrix').appendChild(frag);

  /* Land near each place glows when that place lights up */
  var nodes = [].slice.call(root.querySelectorAll('.j-node'));
  nodes.forEach(function (n) {
    var nx = +n.dataset.x, ny = +n.dataset.y, R = n.classList.contains('j-dest') ? 34 : 54;
    n._dots = landDots.filter(function (d) { var dx = d.x - nx, dy = d.y - ny; return dx * dx + dy * dy < R * R; });
  });
  function syncGlow() {
    landDots.forEach(function (d) { d.lit = false; });
    nodes.forEach(function (n) { if (n.classList.contains('on')) n._dots.forEach(function (d) { d.lit = true; }); });
    landDots.forEach(function (d) { if (d.lit !== d.was) { d.el.classList.toggle('lit', d.lit); d.was = d.lit; } });
  }

  /* ---------- Routes: dotted guide, soft glow, bright line, moving streak ---------- */
  var routesG = $('j-routes');
  var shapes = JSON.parse(routesG.getAttribute('data-d'));
  var guideG = el('g', { fill: 'none', stroke: '#3A3A3A', 'stroke-width': 1.1, 'stroke-dasharray': '2 6' }, routesG);
  var glowG = el('g', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 7, opacity: 0.16, filter: 'url(#j-soft)' }, routesG);
  var lineG = el('g', { fill: 'none', stroke: '#F5F5F5', 'stroke-width': 1.5, 'stroke-linecap': 'round' }, routesG);
  var cometG = el('g', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2.6, 'stroke-linecap': 'round' }, routesG);
  var shipsG = $('j-ships');
  var R = {};
  Object.keys(shapes).forEach(function (k) {
    el('path', { d: shapes[k] }, guideG);
    var glow = el('path', { d: shapes[k], 'class': 'j-leg' }, glowG);
    var line = el('path', { d: shapes[k], 'class': 'j-leg' }, lineG);
    var comet = el('path', { d: shapes[k], 'class': 'j-comet' }, cometG);
    var L = line.getTotalLength();
    [glow, line].forEach(function (p) { p.style.strokeDasharray = L + ' ' + L; p.style.strokeDashoffset = L; });
    var ship = el('circle', { r: k.charAt(0) === 'f' ? 4.5 : 6, fill: '#FFFFFF', filter: 'url(#j-glow)', opacity: 0 }, shipsG);
    R[k] = { L: L, glow: glow, line: line, comet: comet, ship: ship };
  });

  var finale = false;
  function drawLeg(k, t, showShip) {
    var r = R[k], L = r.L, len = L * t;
    r.glow.style.strokeDashoffset = L - len;
    r.line.style.strokeDashoffset = L - len;
    var past = t >= 1 && !finale;
    r.glow.classList.toggle('past', past);
    r.line.classList.toggle('past', past);
    var tail = Math.min(70, len);
    r.comet.style.strokeDasharray = tail + ' ' + (L + 100);
    r.comet.style.strokeDashoffset = -(len - tail);
    r.comet.style.opacity = t > 0 && t < 1 ? 1 : 0;
    var pt = r.line.getPointAtLength(len);
    r.ship.setAttribute('cx', pt.x); r.ship.setAttribute('cy', pt.y);
    r.ship.setAttribute('opacity', showShip ? 1 : 0);
  }

  /* ---------- Steps: edit the wording here ---------- */
  var steps = [
    { from: 0.00, city: 'Thailand & China', what: 'Suppliers vetted in person. Samples approved.' },
    { from: 0.18, city: 'On the factory floor', what: 'Production checked on site. Final inspection passed.' },
    { from: 0.36, city: 'Hong Kong', what: 'Orders consolidated. Shipment coordinated.' },
    { from: 0.52, city: 'Across the Pacific', what: 'In transit to Los Angeles. Documents in order.' },
    { from: 0.80, city: 'United States', what: 'Delivered coast to coast: Los Angeles, Chicago, New York, Boston, Miami.' }
  ];

  var map = root.querySelector('.j-map');
  var dests = [].slice.call(root.querySelectorAll('.j-dest'));
  var nTH = $('j-nTH'), nCN = $('j-nCN'), nHK = $('j-nHK'), nLA = $('j-nLA');
  var rUS = $('j-rUS'), rAsia = $('j-rAsia');
  var meter = root.querySelectorAll('#j-meter span');
  var stepNo = $('j-stepNo'), stepCity = $('j-stepCity'), stepWhat = $('j-stepWhat');
  var done = $('j-done');

  function clamp(v) { return Math.min(1, Math.max(0, v)); }
  function phase(p, a, b) { return clamp((p - a) / (b - a)); }
  function ease(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Phones: a zoomed-in view that slides along with the shipment */
  var narrow = window.matchMedia('(max-width: 640px)');
  function camera(p) {
    if (!narrow.matches) { map.setAttribute('viewBox', '0 0 1400 520'); return; }
    var box = map.getBoundingClientRect();
    var aspect = box.height > 0 ? box.width / box.height : 0.8;
    var w = 470, h = w / aspect;
    var cx = p < 0.52
      ? lerp(390, 440, ease(phase(p, 0.36, 0.50)))
      : lerp(440, 1190, ease(phase(p, 0.52, 0.82)));
    var vx = Math.min(1400 - w, Math.max(0, cx - w / 2));
    var vy = 270 - h / 2;
    map.setAttribute('viewBox', vx.toFixed(1) + ' ' + vy.toFixed(1) + ' ' + w + ' ' + h.toFixed(1));
  }

  var current = -1;
  function update() {
    var r = root.getBoundingClientRect();
    var span = root.offsetHeight - window.innerHeight;
    var p = span > 0 ? clamp(-r.top / span) : 0;
    camera(p);

    var tAsia = ease(phase(p, 0.36, 0.50));
    var tPac = ease(phase(p, 0.52, 0.78));
    var tFan = ease(phase(p, 0.82, 0.95));
    finale = tFan >= 1;

    drawLeg('th', tAsia, tPac === 0);
    drawLeg('cn', tAsia, tAsia < 1);
    drawLeg('pac', tPac, tPac > 0 && tFan === 0);
    ['f0', 'f1', 'f2', 'f3'].forEach(function (k, i) {
      drawLeg(k, tFan, tFan > 0 && tFan < 1);
      dests[i].classList.toggle('on', tFan >= 1);
    });

    var idx = 0;
    for (var i = 0; i < steps.length; i++) if (p >= steps[i].from) idx = i;

    nTH.classList.toggle('check', idx === 1);
    nCN.classList.toggle('check', idx === 1);
    rAsia.classList.add('on');
    nHK.classList.toggle('on', tAsia >= 1);
    nLA.classList.toggle('on', tPac >= 1);
    rUS.classList.toggle('on', tPac >= 1);
    [].forEach.call(meter, function (m, i) { m.classList.toggle('on', i <= idx); });
    done.classList.toggle('on', tFan >= 1);
    syncGlow();

    if (idx !== current) {
      current = idx;
      stepNo.textContent = 'Step ' + (idx + 1) + ' of ' + steps.length;
      stepCity.textContent = steps[idx].city;
      stepWhat.textContent = steps[idx].what;
    }
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; update(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  if (narrow.addEventListener) narrow.addEventListener('change', onScroll);
  update();
})();
