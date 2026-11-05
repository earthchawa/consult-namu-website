/* =========================================================
   CONSULT NAMU — 3D globe for the homepage hero
   Needs vendor/three.min.js and globe-land.js loaded first.
   Orders travel from Bangkok and Shanghai, through Hong Kong,
   across the Pacific to Los Angeles, then out to US cities.
   If WebGL is not available the hero simply shows no globe.
   ========================================================= */
(function () {
  var host = document.getElementById('globe');
  if (!host || !window.THREE || !window.NAMU_LAND) return;
  var THREE = window.THREE;

  /* ---------- Places (edit names or coordinates here) ---------- */
  var P = {
    bkk: { lat: 13.75, lon: 100.50, name: 'Bangkok' },
    sha: { lat: 31.23, lon: 121.47, name: 'Shanghai' },
    hkg: { lat: 22.32, lon: 114.17, name: 'Hong Kong' },
    lax: { lat: 34.05, lon: -118.24, name: 'Los Angeles' },
    chi: { lat: 41.88, lon: -87.63, name: 'Chicago', at: 't' },
    nyc: { lat: 40.71, lon: -74.01, name: 'New York', at: 'b' },
    mia: { lat: 25.76, lon: -80.19, name: 'Miami' },
    bos: { lat: 42.36, lon: -71.06, name: 'Boston' }
    /* at: where the label sits next to the dot. r = right (default), l = left, t = above, b = below */
  };
  /* Each leg: from, to, start time and end time (seconds into the loop) */
  var LEGS = [
    ['bkk', 'hkg', 0.0, 1.2], ['sha', 'hkg', 0.0, 1.2],
    ['hkg', 'lax', 1.4, 4.0],
    ['lax', 'chi', 4.2, 5.2], ['lax', 'nyc', 4.2, 5.4], ['lax', 'mia', 4.2, 5.2], ['lax', 'bos', 4.2, 5.5]
  ];
  var LOOP = 12;           // seconds per full journey (the globe turns with the order)
  var R = 1;               // globe radius

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 4.4);

  var tilt = new THREE.Group();      // leans the globe toward the viewer
  var spin = new THREE.Group();      // turns around the earth's axis
  tilt.rotation.x = 0.36;
  tilt.add(spin); scene.add(tilt);

  var D = Math.PI / 180;
  function ll(lat, lon, r) {
    var phi = (90 - lat) * D, th = (lon + 180) * D;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  }

  /* ---------- Solid dark core so dots on the far side are hidden ---------- */
  spin.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x0b0b0b })
  ));

  /* ---------- Round dot texture ---------- */
  function dotTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,1)'); grd.addColorStop(0.55, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    var t = new THREE.CanvasTexture(c); return t;
  }
  var dotTex = dotTexture();

  /* ---------- Faint dots over the whole sphere, so its shape reads ---------- */
  var NO = 5200, oc = new Float32Array(NO * 3), GA = Math.PI * (3 - Math.sqrt(5));
  for (var o = 0; o < NO; o++) {
    var yy = 1 - (o / (NO - 1)) * 2, rr = Math.sqrt(1 - yy * yy), tt = GA * o;
    oc[o * 3] = Math.cos(tt) * rr * R; oc[o * 3 + 1] = yy * R; oc[o * 3 + 2] = Math.sin(tt) * rr * R;
  }
  var ocGeo = new THREE.BufferGeometry();
  ocGeo.setAttribute('position', new THREE.BufferAttribute(oc, 3));
  var ocMat;
  spin.add(new THREE.Points(ocGeo, ocMat = new THREE.PointsMaterial({
    size: 0.016, map: dotTex, color: 0x232323, transparent: true, alphaTest: 0.3, sizeAttenuation: true
  })));

  /* ---------- Land made of dots ---------- */
  var L = window.NAMU_LAND, pos = new Float32Array(L.length / 2 * 3);
  for (var i = 0, j = 0; i < L.length; i += 2, j += 3) {
    var v = ll(L[i] / 10, L[i + 1] / 10, R);
    pos[j] = v.x; pos[j + 1] = v.y; pos[j + 2] = v.z;
  }
  var landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  var landMat;
  spin.add(new THREE.Points(landGeo, landMat = new THREE.PointsMaterial({
    size: 0.034, map: dotTex, color: 0x8c8c8c, transparent: true, alphaTest: 0.3, sizeAttenuation: true
  })));

  /* ---------- Thin outline ring around the globe ---------- */
  var ring = new THREE.Mesh(new THREE.RingGeometry(R * 1.002, R * 1.008, 128), new THREE.MeshBasicMaterial({ color: 0x2a2a2a }));
  scene.add(ring);

  /* ---------- Cities: dot + pulsing ring ---------- */
  var cities = {};
  Object.keys(P).forEach(function (k) {
    var p = P[k], v = ll(p.lat, p.lon, R * 1.003);
    var dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 20), new THREE.MeshBasicMaterial({ color: 0x8a8a8a, transparent: true }));
    var halo = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.022, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    [dot, halo].forEach(function (m) { m.position.copy(v); m.lookAt(v.clone().multiplyScalar(2)); spin.add(m); });
    cities[k] = { v: v, dot: dot, halo: halo, lit: 0, name: p.name, at: p.at || 'r' };
  });

  /* ---------- Routes ---------- */
  var SEG = 80;
  function arcPoints(a, b) {
    var va = ll(P[a].lat, P[a].lon, 1), vb = ll(P[b].lat, P[b].lon, 1);
    var ang = va.angleTo(vb), pts = [];
    for (var s = 0; s <= SEG; s++) {
      var t = s / SEG;
      var v = va.clone().multiplyScalar(Math.sin((1 - t) * ang)).add(vb.clone().multiplyScalar(Math.sin(t * ang))).divideScalar(Math.sin(ang));
      var lift = 1 + Math.sin(Math.PI * t) * (0.02 + ang * 0.085);
      pts.push(v.multiplyScalar(R * lift));
    }
    return pts;
  }
  var legs = LEGS.map(function (l) {
    var pts = arcPoints(l[0], l[1]);
    var guide = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: 0x3a3a3a, dashSize: 0.012, gapSize: 0.02, transparent: true }));
    guide.computeLineDistances();
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.8 }));
    line.geometry.setDrawRange(0, 0);
    var head = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffffff, transparent: true, depthWrite: false }));
    head.scale.set(0.045, 0.045, 1);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color: 0xffffff, transparent: true, opacity: 0.18, depthWrite: false }));
    glow.scale.set(0.12, 0.12, 1);
    spin.add(guide); spin.add(line); spin.add(glow); spin.add(head);
    return { from: l[0], to: l[1], t0: l[2], t1: l[3], pts: pts, line: line, head: head, glow: glow };
  });

  /* ---------- Small labels (HTML, so they stay sharp) ---------- */
  var labelBox = document.createElement('div');
  labelBox.className = 'globe-labels';
  host.appendChild(labelBox);
  Object.keys(cities).forEach(function (k) {
    if (!cities[k].name) return;
    var el = document.createElement('span');
    el.textContent = cities[k].name;
    el.className = 'at-' + cities[k].at;
    labelBox.appendChild(el);
    cities[k].label = el;
  });

  /* ---------- Size ---------- */
  var W = 1, H = 1;
  function resize() {
    W = host.clientWidth || 1; H = host.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    /* Small screens: slightly bigger dots so the continents still read */
    var k = Math.min(1.7, Math.max(1, 640 / H));
    landMat.size = 0.034 * k; ocMat.size = 0.016 * k;
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------- Drag to turn the globe ---------- */
  var drag = 0, dragV = 0, down = false, lastX = 0;
  host.addEventListener('pointerdown', function (e) { down = true; lastX = e.clientX; host.classList.add('grabbing'); });
  window.addEventListener('pointerup', function () { down = false; host.classList.remove('grabbing'); });
  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    dragV = dx * 0.006; drag += dragV;
  });

  /* ---------- Animation ---------- */
  /* Which longitude faces the viewer at each moment: it follows the order east */
  var VIEW = [[0, 112], [1.4, 112], [4.0, 238], [5.6, 262], [8.0, 262], [12, 472]];
  function viewLon(t) {
    for (var i = 1; i < VIEW.length; i++) {
      if (t <= VIEW[i][0]) {
        var a = VIEW[i - 1], b = VIEW[i], k = (t - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * ease(k);
      }
    }
    return VIEW[VIEW.length - 1][1];
  }
  var tmp = new THREE.Vector3(), camDir = new THREE.Vector3();
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function frame(time) {
    var sec = time / 1000;
    var lt = reduce ? LOOP * 0.7 : sec % LOOP;

    /* Gentle sway between Asia and the US, plus any dragging */
    if (!down) { dragV *= 0.94; drag += dragV; }
    var lon = reduce ? 185 : viewLon(lt);
    spin.rotation.y = -(lon + 90) * D + drag;

    /* Fade everything out at the end of the loop, then start again */
    var fade = lt > 8 ? Math.max(0, 1 - (lt - 8) / 1.2) : 1;

    Object.keys(cities).forEach(function (k) { cities[k].lit = 0; });
    legs.forEach(function (g) {
      var t = Math.min(1, Math.max(0, (lt - g.t0) / (g.t1 - g.t0)));
      var e = ease(t);
      var n = Math.floor(e * SEG) + 1;
      g.line.geometry.setDrawRange(0, t > 0 ? n : 0);
      g.line.material.opacity = 0.75 * fade;
      var moving = t > 0 && t < 1;
      var p = g.pts[Math.min(SEG, Math.round(e * SEG))];
      g.head.position.copy(p); g.glow.position.copy(p);
      g.head.material.opacity = moving ? 1 : 0;
      g.glow.material.opacity = moving ? 0.22 : 0;
      if (t > 0) cities[g.from].lit = Math.max(cities[g.from].lit, fade);
      if (t >= 1) cities[g.to].lit = Math.max(cities[g.to].lit, fade);
    });

    var pulse = (sec % 2) / 2;
    Object.keys(cities).forEach(function (k) {
      var c = cities[k];
      c.dot.material.color.setScalar(0.35 + 0.6 * c.lit);
      var s = 1 + pulse * 2.4;
      c.halo.scale.set(s, s, s);
      c.halo.material.opacity = reduce ? 0 : c.lit * (1 - pulse) * 0.7;
    });

    /* Labels follow their city and hide on the far side */
    scene.updateMatrixWorld();
    camDir.copy(camera.position).normalize();
    Object.keys(cities).forEach(function (k) {
      var c = cities[k]; if (!c.label) return;
      tmp.copy(c.v); c.dot.parent.localToWorld(tmp);
      var facing = tmp.clone().normalize().dot(camDir);
      tmp.project(camera);
      var x = (tmp.x * 0.5 + 0.5) * W, y = (-tmp.y * 0.5 + 0.5) * H;
      var shift = { r: '', l: ' translateX(-100%)', t: ' translate(-50%,-140%)', b: ' translate(-50%,120%)' }[c.at];
      c.label.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)' + shift;
      c.label.style.opacity = facing > 0.25 ? (0.35 + 0.65 * c.lit) : 0;
    });

    renderer.render(scene, camera);
  }

  /* Only animate while the globe is on screen */
  var running = false, raf = 0;
  function loop(t) { frame(t); raf = requestAnimationFrame(loop); }
  function start() { if (!running && !reduce) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(host);
  } else { start(); }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  window.addEventListener('pageshow', function () { if (!document.hidden) { stop(); start(); } });
  frame(performance.now());
  if (reduce) window.addEventListener('resize', function () { frame(performance.now()); });
  host.classList.add('ready');
})();
