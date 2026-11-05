/* =========================================================
   CONSULT NAMU — 3D product viewer for "What we make" (needs vendor/three.min.js)
   Pick a project to see it, drag to turn it.
   It only animates while it is on screen.
   If WebGL is not available, the sections still show all their text.
   ========================================================= */
(function () {
  if (!window.THREE) return;
  var THREE = window.THREE;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Shared helpers ---------- */
  function makeRenderer(host) {
    var r;
    try { r = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' }); }
    catch (e) { return null; }
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setClearColor(0x000000, 0);
    r.outputEncoding = THREE.sRGBEncoding;
    host.insertBefore(r.domElement, host.firstChild);
    return r;
  }
  function runWhenVisible(host, frame) {
    var on = false, raf = 0;
    function loop(t) { frame(t); raf = requestAnimationFrame(loop); }
    function start() { if (!on) { on = true; raf = requestAnimationFrame(loop); } }
    function stop() { on = false; cancelAnimationFrame(raf); }
    if (reduce) { frame(0); return { kick: function () { frame(0); } }; }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }).observe(host);
    } else start();
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });
    return { kick: function () {} };
  }
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return t;
  }
  function damp(a, b, k) { return a + (b - a) * k; }
  /* Drag to turn: returns an object whose .y is the extra rotation */
  function dragTurn(el) {
    var st = { y: 0, v: 0, down: false, x: 0, last: 0 };
    el.addEventListener('pointerdown', function (e) { st.down = true; st.x = e.clientX; st.last = performance.now(); el.classList.add('grabbing'); });
    window.addEventListener('pointerup', function () { st.down = false; el.classList.remove('grabbing'); });
    window.addEventListener('pointermove', function (e) {
      if (!st.down) return;
      var dx = e.clientX - st.x; st.x = e.clientX; st.v = dx * 0.008; st.y += st.v; st.last = performance.now();
    });
    st.tick = function () { if (!st.down) { st.v *= 0.93; st.y += st.v; } };
    return st;
  }

  /* =========================================================
     WHAT WE MAKE: product viewer
     ========================================================= */
  (function () {
    var host = document.getElementById('products');
    if (!host) return;
    var renderer = makeRenderer(host);
    if (!renderer) return;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.3, 7.2);
    camera.lookAt(0, 0.05, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 0.45));
    var key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(3, 4, 4); scene.add(key);
    var fill = new THREE.DirectionalLight(0xffffff, 0.25); fill.position.set(-4, 1, 3); scene.add(fill);
    var rim = new THREE.DirectionalLight(0xffffff, 0.75); rim.position.set(-3, 3, -5); scene.add(rim);

    /* Pedestal: a soft shadow and a thin ring */
    var shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({
      map: canvasTex(128, 128, function (g, w) {
        var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, w);
      }), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.0; scene.add(shadow);
    var ring = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.362, 96), new THREE.MeshBasicMaterial({ color: 0x3a3a3a, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -1.0; scene.add(ring);

    var GOLD = 0xC9A65A;
    function std(color, o) { var m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.75, metalness: 0 }); for (var k in o) m[k] = o[k]; return m; }

    /* ---------- The six products ---------- */
    var builders = {
      bag: function () {
        var g = new THREE.Group();
        var front = canvasTex(256, 320, function (c, w, h) {
          c.fillStyle = '#D9D2C5'; c.fillRect(0, 0, w, h);
          c.strokeStyle = '#C9A65A'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h * 0.48, 44, 0, Math.PI * 2); c.stroke();
          c.fillStyle = '#C9A65A'; c.font = '600 20px Syne, Inter, sans-serif'; c.textAlign = 'center'; c.fillText('LOGO', w / 2, h * 0.48 + 7);
        });
        var paper = std(0xD6CFC2), face = new THREE.MeshStandardMaterial({ map: front, roughness: 0.8 });
        var body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.6), [paper, paper, paper, paper, face, paper]);
        g.add(body);
        var rib = std(0x1E1E1E, { roughness: 0.55 });
        [-0.32, 0.32].forEach(function (z) {
          var h = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 10, 40, Math.PI), rib);
          h.position.set(0, 0.9, z * 0.55); g.add(h);
        });
        return g;
      },
      box: function () {
        var g = new THREE.Group();
        var suede = std(0x1C1A18, { roughness: 1 });
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 64), suede); body.position.y = -0.3; g.add(body);
        var band = new THREE.Mesh(new THREE.CylinderGeometry(0.805, 0.805, 0.06, 64, 1, true), std(GOLD, { metalness: 0.8, roughness: 0.3 }));
        band.position.y = -0.55; g.add(band);
        var lid = new THREE.Group();
        lid.add(new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.36, 64), suede));
        var mark = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 48), std(GOLD, { metalness: 0.8, roughness: 0.3 }));
        mark.rotation.x = Math.PI / 2; mark.position.y = 0.185; lid.add(mark);
        lid.position.y = 0.55; g.add(lid);
        g.userData.tick = function (s) { lid.position.y = 0.55 + (reduce ? 0.12 : (Math.sin(s * 1.4) * 0.5 + 0.5) * 0.28); };
        return g;
      },
      ornament: function () {
        var g = new THREE.Group();
        var glass = new THREE.Mesh(new THREE.SphereGeometry(0.85, 64, 48), std(0xBDBDBD, { roughness: 0.2, metalness: 0.35 }));
        g.add(glass);
        var band = new THREE.Mesh(new THREE.TorusGeometry(0.851, 0.05, 12, 96), std(GOLD, { metalness: 0.8, roughness: 0.3 }));
        band.rotation.x = Math.PI / 2; g.add(band);
        var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.2, 24), std(0xB8B8B8, { metalness: 0.9, roughness: 0.3 }));
        cap.position.y = 0.92; g.add(cap);
        var loop = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 8, 24), std(0xB8B8B8, { metalness: 0.9, roughness: 0.3 }));
        loop.position.y = 1.08; g.add(loop);
        g.userData.tick = function (s) { g.rotation.z = reduce ? 0 : Math.sin(s * 1.6) * 0.08; };
        return g;
      },
      ribbon: function () {
        var g = new THREE.Group();
        var stripe = canvasTex(512, 64, function (c, w, h) {
          c.fillStyle = '#161616'; c.fillRect(0, 0, w, h);
          c.fillStyle = '#C9A65A'; c.font = '600 26px Syne, Inter, sans-serif'; c.textBaseline = 'middle';
          for (var x = 10; x < w; x += 128) c.fillText('LOGO ·', x, h / 2 + 2);
        });
        stripe.wrapS = THREE.RepeatWrapping;
        var wound = stripe.clone(); wound.needsUpdate = true; wound.repeat.set(3, 1);
        var spool = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.42, 64), [new THREE.MeshStandardMaterial({ map: wound, roughness: 0.6 }), std(0x1C1C1C), std(0x1C1C1C)]);
        spool.rotation.x = Math.PI / 2; spool.position.set(-0.45, 0.2, 0); g.add(spool);
        var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.44, 32), std(0x8A8A8A));
        hub.rotation.x = Math.PI / 2; hub.position.copy(spool.position); g.add(hub);
        var tail = new THREE.PlaneGeometry(2.4, 0.4, 60, 1);
        var tailMat = new THREE.MeshStandardMaterial({ map: stripe, side: THREE.DoubleSide, roughness: 0.6 });
        var strip = new THREE.Mesh(tail, tailMat); g.add(strip);
        var base = tail.attributes.position.array.slice();
        g.userData.tick = function (s) {
          var p = tail.attributes.position.array;
          for (var k = 0; k < p.length; k += 3) {
            var x = base[k], u = (x + 1.2) / 2.4;
            p[k] = x + 0.75; p[k + 1] = 0.2 - 0.72 + u * 0.05 + Math.sin(u * 5 - s * 2) * 0.12 * u;
            p[k + 2] = base[k + 1] + Math.cos(u * 4 - s * 1.5) * 0.18 * u;
          }
          tail.attributes.position.needsUpdate = true; tail.computeVertexNormals();
        };
        return g;
      },
      ring: function () {
        var g = new THREE.Group();
        var mat = std(0x8FB8FF, { roughness: 0.4 });
        var torus = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.22, 32, 96), mat);
        torus.rotation.x = -0.35; g.add(torus);
        var cold = new THREE.Color(0x8FB8FF), warm = new THREE.Color(0xFF9EC4);
        g.userData.tick = function (s) { var k = reduce ? 0.5 : Math.sin(s * 0.9) * 0.5 + 0.5; mat.color.copy(cold).lerp(warm, k); };
        return g;
      },
      ceramic: function () {
        var g = new THREE.Group();
        var glaze = std(0xCFC8BB, { roughness: 0.3 });
        function smooth(pts) { return new THREE.SplineCurve(pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); })).getPoints(60); }
        var prof = smooth([[0.001, -0.95], [0.4, -0.95], [0.56, -0.7], [0.62, -0.3], [0.52, 0.2], [0.32, 0.55], [0.27, 0.75], [0.33, 0.88]]);
        var vase = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshStandardMaterial({ color: 0xCFC8BB, roughness: 0.3, side: THREE.DoubleSide })); vase.position.x = -0.58; g.add(vase);
        var bowlProf = smooth([[0.001, -0.95], [0.32, -0.94], [0.56, -0.78], [0.7, -0.52]]);
        var bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProf, 72), std(0x9C9488, { roughness: 0.4, side: THREE.DoubleSide }));
        bowl.scale.setScalar(0.82); bowl.position.set(0.62, -0.17, 0.28); g.add(bowl); /* close to the vase, with a small gap */
        return g;
      }
    };

    var objs = {}, shown = 'bag', next = 'bag', grow = 0;
    function get(k) { if (!objs[k]) { objs[k] = builders[k](); objs[k].visible = false; scene.add(objs[k]); } return objs[k]; }

    window.NAMU_setProduct = function (k) { if (builders[k]) next = k; if (reduce) frame(0); };

    var drag = dragTurn(host);
    function resize() {
      var w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();

    function frame(t) {
      var sec = t / 1000;
      drag.tick();
      /* Swap: shrink the old product away, then grow the new one in */
      if (shown !== next) {
        grow = reduce ? 0 : grow - 0.09;
        if (grow <= 0) { get(shown).visible = false; shown = next; grow = reduce ? 1 : 0; }
      } else {
        grow = Math.min(1, grow + 0.05);
      }
      var o = get(shown);
      o.visible = true;
      var k = Math.max(0, grow), s = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2); /* ease out with a little overshoot */
      o.scale.setScalar(Math.max(0.0001, k >= 1 ? 1 : s));
      o.rotation.y = (reduce ? 0.6 : sec * 0.45) + drag.y;
      o.position.y = reduce ? 0 : Math.sin(sec * 1.2) * 0.05;
      if (o.userData.tick) o.userData.tick(sec);
      renderer.render(scene, camera);
    }
    get('bag');
    runWhenVisible(host, frame);
    host.classList.add('ready');
  })();
})();
