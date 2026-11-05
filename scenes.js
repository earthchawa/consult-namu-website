/* =========================================================
   CONSULT NAMU — 3D scenes for the homepage (needs vendor/three.min.js)
   1. Services: a stack of five shipping containers, one per service.
      The container for the service being read slides out.
   2. What we make: a product viewer. Pick a project to see it, drag to turn it.
   Each scene only animates while it is on screen.
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
     1. SERVICES: shipping container stack
     ========================================================= */
  (function () {
    var host = document.getElementById('containers');
    if (!host) return;
    var renderer = makeRenderer(host);
    if (!renderer) return;

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(7, 5.2, 8);
    camera.lookAt(0, 0.1, 0);

    var yard = new THREE.Group(); scene.add(yard);
    var N = 5, L = 3.2, H = 0.86, D = 1.15, GAP = 0.06;

    /* Faces drawn on canvases: corrugated sides with the service number, door ends */
    function sideTex(n, on) {
      return canvasTex(512, 140, function (g, w, h) {
        g.fillStyle = on ? '#2B2B2B' : '#121212'; g.fillRect(0, 0, w, h);
        g.strokeStyle = on ? '#4A4A4A' : '#222'; g.lineWidth = 3;
        for (var x = 14; x < w; x += 18) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x, h - 8); g.stroke(); }
        g.fillStyle = on ? '#2B2B2B' : '#121212'; g.fillRect(24, h / 2 - 34, 132, 68);
        g.fillStyle = on ? '#F5F5F5' : '#5A5A5A';
        g.font = '600 52px Syne, Inter, sans-serif'; g.textBaseline = 'middle';
        g.fillText(n, 34, h / 2 + 3);
        g.font = '600 16px Inter, sans-serif';
        g.fillStyle = on ? '#BDBDBD' : '#3A3A3A';
        g.fillText('NAMU · ' + n + ' / 05', w - 150, h - 22);
      });
    }
    function endTex(on) {
      return canvasTex(160, 140, function (g, w, h) {
        g.fillStyle = on ? '#262626' : '#101010'; g.fillRect(0, 0, w, h);
        g.strokeStyle = on ? '#6A6A6A' : '#2A2A2A'; g.lineWidth = 3;
        g.strokeRect(8, 8, w - 16, h - 16);
        [w * .3, w * .45, w * .55, w * .7].forEach(function (x) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, h - 14); g.stroke(); });
        g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h - 10); g.stroke();
      });
    }
    var topMat = new THREE.MeshBasicMaterial({ color: 0x191919 });
    var topOn = new THREE.MeshBasicMaterial({ color: 0x3A3A3A });

    var boxes = [];
    for (var i = 0; i < N; i++) {
      var n = ('0' + (i + 1)).slice(-2);
      var mats = {
        off: [new THREE.MeshBasicMaterial({ map: endTex(false) }), new THREE.MeshBasicMaterial({ color: 0x0c0c0c }),
              topMat, topMat,
              new THREE.MeshBasicMaterial({ map: sideTex(n, false) }), new THREE.MeshBasicMaterial({ color: 0x0c0c0c })],
        on:  [new THREE.MeshBasicMaterial({ map: endTex(true) }), new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
              topOn, topOn,
              new THREE.MeshBasicMaterial({ map: sideTex(n, true) }), new THREE.MeshBasicMaterial({ color: 0x1a1a1a })]
      };
      var geo = new THREE.BoxGeometry(L, H, D);
      var mesh = new THREE.Mesh(geo, mats.off);
      var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x3a3a3a }));
      var c = new THREE.Group(); c.add(mesh); c.add(edges);
      /* 01 on top, 05 at the bottom, each slightly offset like a real stack */
      c.position.set((i % 2 ? 0.12 : -0.12), (N - 1 - i) * (H + GAP) - (N - 1) * (H + GAP) / 2, 0);
      c.userData = { mesh: mesh, edges: edges, mats: mats, x0: c.position.x, out: 0 };
      yard.add(c); boxes.push(c);
    }
    /* Faint ground grid */
    var grid = new THREE.GridHelper(9, 18, 0x1a1a1a, 0x151515);
    grid.material.transparent = true; grid.material.opacity = 0.55;
    grid.position.y = -(N - 1) * (H + GAP) / 2 - H / 2 - 0.02; yard.add(grid);

    var active = 0;
    window.NAMU_setService = function (i) { active = i; if (reduce) frame(0); };

    var drag = dragTurn(host);
    function resize() {
      var w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h, false);
      var s = 4.3, a = w / h;
      camera.left = -s * a; camera.right = s * a; camera.top = s; camera.bottom = -s;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', resize); resize();

    function frame(t) {
      var sec = t / 1000;
      drag.tick();
      yard.rotation.y = (reduce ? 0 : Math.sin(sec * 0.35) * 0.08) + drag.y;
      boxes.forEach(function (c, k) {
        var on = k === active, u = c.userData;
        u.out = reduce ? (on ? 1 : 0) : damp(u.out, on ? 1 : 0, 0.08);
        c.position.x = u.x0 + u.out * 1.35;
        c.position.z = u.out * 0.25;
        var want = on ? u.mats.on : u.mats.off;
        if (u.mesh.material !== want) u.mesh.material = want;
        u.edges.material.color.setScalar(0.23 + 0.73 * u.out);
      });
      renderer.render(scene, camera);
    }
    runWhenVisible(host, frame);
    host.classList.add('ready');
  })();

  /* =========================================================
     2. WHAT WE MAKE: product viewer
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
        var vase = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshStandardMaterial({ color: 0xCFC8BB, roughness: 0.3, side: THREE.DoubleSide })); vase.position.x = -0.45; g.add(vase);
        var bowlProf = smooth([[0.001, -0.95], [0.32, -0.94], [0.56, -0.78], [0.7, -0.52]]);
        var bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProf, 72), std(0x9C9488, { roughness: 0.4, side: THREE.DoubleSide }));
        bowl.position.set(0.75, 0, 0.2); g.add(bowl);
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
