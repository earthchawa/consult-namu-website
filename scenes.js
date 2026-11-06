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
    var inView = !('IntersectionObserver' in window);
    if (!inView) {
      new IntersectionObserver(function (es) { inView = es[0].isIntersecting; inView && !document.hidden ? start() : stop(); }).observe(host);
    } else start();
    /* pause in a background tab, resume when the visitor comes back (also after Back/Forward) */
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (inView) { on = false; start(); } });
    window.addEventListener('pageshow', function () { if (inView && !document.hidden) { on = false; cancelAnimationFrame(raf); start(); } });
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); /* sharp enough for this size, much lighter on phones */

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.3, 7.2);
    camera.lookAt(0, 0.05, 0);

    /* Studio reflections: a few soft light panels baked into an environment map.
       Built when the viewer starts (see boot), not at page load. */
    function makeEnvironment() {
      var pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
      env.background = new THREE.Color(0x0c0c0c);
      function panel(w, h, c, k, p) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); env.add(m);
      }
      panel(8, 4, 0xffffff, 2.2, [0, 7, 5]); panel(4, 7, 0xfff1dc, 1.6, [-7, 2, 3]); panel(4, 6, 0xffffff, 1.0, [7, 2, -2]); panel(12, 3, 0x2a2a2a, 1, [0, -6, 0]);
      scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 0.3));
    var key = new THREE.DirectionalLight(0xffffff, 0.7); key.position.set(3, 4, 4); scene.add(key);
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
    function std(color, o) {
      var m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.75, metalness: 0 });
      for (var k in o) {
        if (k === 'color') continue;
        if (k === 'emissive') m.emissive.setHex(o[k]); else m[k] = o[k];
      }
      return m;
    }

    /* Printed textures (bag, coaster) are pre-rendered images in assets/3d/, made by
       tools/bake-textures.js. Loading an image is much lighter than drawing the print here. */
    var loader = new THREE.TextureLoader();
    function loadTex(url) {
      var t = loader.load(url); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
    }
    /* Flat ribbon strip that follows a curve (width lies in the plane of the curve) */
    function ribbonStrip(points, width, mat) {
      var curve = new THREE.CatmullRomCurve3(points);
      var n = 64, pos = [], idx = [];
      for (var i = 0; i <= n; i++) {
        var t = i / n, p = curve.getPoint(t), d = curve.getTangent(t);
        var nx = -d.y, ny = d.x, l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        pos.push(p.x + nx * width / 2, p.y + ny * width / 2, p.z, p.x - nx * width / 2, p.y - ny * width / 2, p.z);
        if (i < n) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      return new THREE.Mesh(geo, mat);
    }
    var FOIL = { color: 0xE2C27C, metalness: 0.9, roughness: 0.28 };
    var GREEN = 0x0B3320;

    /* ---------- The products ---------- */
    var builders = {
      /* Printed paper bag: uncoated stock, toile print with trees, buildings, archways and palms
         on every side, sides folded in (V-gusset), green grosgrain handles, small gold foil mark */
      bag: function () {
        var g = new THREE.Group();
        var W = 1.9, H = 1.5, D = 0.62, C = 0.16;           /* C: how far the gussets fold in */
        function quad(p, u0, u1, mat) {   /* p: bottom-left, bottom-right, top-right, top-left */
          var geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute([].concat(p[0], p[1], p[2], p[3]), 3));
          geo.setAttribute('uv', new THREE.Float32BufferAttribute([u0, 0, u1, 0, u1, 1, u0, 1], 2));
          geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
          return new THREE.Mesh(geo, mat);
        }
        var paper = function (t) { return new THREE.MeshStandardMaterial({ map: t, roughness: 0.92, envMapIntensity: 0.35 }); };
        var inner = new THREE.MeshStandardMaterial({ color: 0xE2DACB, roughness: 0.95, side: THREE.BackSide, envMapIntensity: 0.2 });
        var x = W / 2, z = D / 2, y0 = -H / 2, y1 = H / 2;
        var sideLen = Math.hypot(C, z);
        var panels = [
          { p: [[-x, y0, z], [x, y0, z], [x, y1, z], [-x, y1, z]], t: loadTex('assets/3d/bag-front.jpg'), u: [0, 1] },            /* front */
          { p: [[x, y0, -z], [-x, y0, -z], [-x, y1, -z], [x, y1, -z]], t: loadTex('assets/3d/bag-back.jpg'), u: [0, 1] }         /* back */
        ];
        [1, -1].forEach(function (sgn, i) {     /* each gusset: two panels meeting at a fold */
          var t = loadTex('assets/3d/bag-side-' + (i + 1) + '.jpg');
          panels.push({ p: [[sgn * x, y0, sgn * z], [sgn * (x - C), y0, 0], [sgn * (x - C), y1, 0], [sgn * x, y1, sgn * z]], t: t, u: [0, 0.5] });
          panels.push({ p: [[sgn * (x - C), y0, 0], [sgn * x, y0, -sgn * z], [sgn * x, y1, -sgn * z], [sgn * (x - C), y1, 0]], t: t, u: [0.5, 1] });
        });
        panels.forEach(function (pn) {
          var m = paper(pn.t); g.add(quad(pn.p, pn.u[0], pn.u[1], m)); g.add(quad(pn.p, pn.u[0], pn.u[1], inner));
        });
        /* bottom */
        g.add(quad([[-x, y0, -z], [x, y0, -z], [x, y0, z], [-x, y0, z]], 0, 1, std(0xDDD5C6, { roughness: 0.95, side: THREE.DoubleSide })));
        /* gold foil mark in place of the logo */
        var foil = std(FOIL.color, FOIL);
        [[0.5, 0.008, 0.02], [0.26, 0.006, -0.06]].forEach(function (r) {
          var m = new THREE.Mesh(new THREE.BoxGeometry(r[0], r[1], 0.003), foil); m.position.set(0, r[2], z + 0.002); g.add(m);
        });
        var dia = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.003), foil); dia.rotation.z = Math.PI / 4; dia.position.set(0, 0.02, z + 0.003); g.add(dia);
        /* grosgrain handles: flat ribbon, ends tucked inside the bag */
        var rib = std(0x08521F, { roughness: 0.5, side: THREE.DoubleSide, envMapIntensity: 0.5 });
        [z - 0.03, -z + 0.03].forEach(function (zz) {
          g.add(ribbonStrip([
            new THREE.Vector3(-0.4, y1 - 0.3, zz), new THREE.Vector3(-0.41, y1 + 0.12, zz), new THREE.Vector3(-0.3, y1 + 0.5, zz),
            new THREE.Vector3(0, y1 + 0.62, zz), new THREE.Vector3(0.3, y1 + 0.5, zz), new THREE.Vector3(0.41, y1 + 0.12, zz), new THREE.Vector3(0.4, y1 - 0.3, zz)
          ], 0.1, rib));
        });
        g.userData.y = -0.3; g.userData.sway = true;
        return g;
      },
      /* Suede cylinder gift box with a lift-off lid */
      box: function () {
        var g = new THREE.Group();
        var suede = std(0x221D19, { roughness: 1 });
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.3, 64), suede); body.position.y = -0.3; g.add(body);
        var band = new THREE.Mesh(new THREE.CylinderGeometry(0.805, 0.805, 0.06, 64, 1, true), std(FOIL.color, FOIL));
        band.position.y = -0.55; g.add(band);
        var lid = new THREE.Group();
        lid.add(new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.84, 0.36, 64), suede));
        var mark = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 48), std(FOIL.color, FOIL));
        mark.rotation.x = Math.PI / 2; mark.position.y = 0.185; lid.add(mark);
        lid.position.y = 0.55; g.add(lid);
        g.userData.tick = function (s) { lid.position.y = 0.55 + (reduce ? 0.12 : (Math.sin(s * 1.4) * 0.5 + 0.5) * 0.28); };
        return g;
      },
      /* Ornaments: a matte green glass ball and a pearl ball with green line art, gold caps */
      ornament: function () {
        var g = new THREE.Group();
        var art = canvasTex(1024, 512, function (c, w, h) {
          c.fillStyle = '#EFE8DA'; c.fillRect(0, 0, w, h);
          /* a botanical wreath in green line work, centered on the front of the ball */
          c.strokeStyle = '#1F5A38'; c.lineWidth = 3.5; c.lineCap = 'round';
          var cx = w * 0.75, cy = h * 0.5, r = 70;
          c.beginPath(); c.arc(cx, cy, r, Math.PI * 0.62, Math.PI * 2.38); c.stroke();
          for (var i = 0; i < 18; i++) {
            var a = Math.PI * 0.66 + i * (Math.PI * 1.68 / 17), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
            c.save(); c.translate(x, y); c.rotate(a + (i % 2 ? 0.9 : -0.9));
            c.beginPath(); c.ellipse(0, -12, 5, 12, 0, 0, Math.PI * 2); c.stroke(); c.restore();
          }
          c.beginPath(); c.moveTo(cx - 22, cy + 18); c.lineTo(cx, cy - 30); c.lineTo(cx + 22, cy + 18); c.closePath(); c.stroke();
          c.beginPath(); c.arc(cx, cy - 4, 9, 0, Math.PI * 2); c.stroke();
        });
        function ball(mat, x) {
          var b = new THREE.Group();
          var s = new THREE.Mesh(new THREE.SphereGeometry(0.62, 64, 48), mat); b.add(s);
          var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 24), std(FOIL.color, FOIL)); cap.position.y = 0.67; b.add(cap);
          var loop = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 24), std(FOIL.color, FOIL)); loop.position.y = 0.8; b.add(loop);
          b.position.x = x; g.add(b); return b;
        }
        var green = ball(std(0x061A10, { roughness: 0.6, metalness: 0, envMapIntensity: 0.3 }), -0.66);
        var pearl = ball(new THREE.MeshStandardMaterial({ map: art, roughness: 0.32, metalness: 0.18 }), 0.66);
        pearl.rotation.y = -Math.PI / 2;
        g.position.y = -0.15;
        g.userData.tick = function (s) {
          if (reduce) return;
          green.rotation.z = Math.sin(s * 1.5) * 0.06; pearl.rotation.z = Math.sin(s * 1.5 + 1) * 0.06;
        };
        return g;
      },
      /* Green satin ribbon on a roll, gold edges and a gold-stamped pattern (no lettering) */
      ribbon: function () {
        var g = new THREE.Group();
        var face = canvasTex(512, 96, function (c, w, h) {
          c.fillStyle = '#1C4D34'; c.fillRect(0, 0, w, h);
          var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.10)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.18)');
          c.fillStyle = gr; c.fillRect(0, 0, w, h);
          c.fillStyle = '#C9A65A'; c.fillRect(0, 4, w, 3); c.fillRect(0, h - 7, w, 3);
          for (var x = 32; x < w; x += 64) { c.save(); c.translate(x, h / 2); c.rotate(Math.PI / 4); c.fillRect(-6, -6, 12, 12); c.restore(); c.fillRect(x + 14, h / 2 - 1, 20, 2); }
        });
        face.wrapS = THREE.RepeatWrapping;
        var wound = face.clone(); wound.needsUpdate = true; wound.wrapS = THREE.RepeatWrapping; wound.repeat.set(4, 1);
        var edge = canvasTex(256, 256, function (c, w) {
          c.fillStyle = '#163E2A'; c.fillRect(0, 0, w, w);
          c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
          for (var r = 34; r < w / 2; r += 4) { c.beginPath(); c.arc(w / 2, w / 2, r, 0, Math.PI * 2); c.stroke(); }
          c.fillStyle = '#C8B08A'; c.beginPath(); c.arc(w / 2, w / 2, 34, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#0B0B0B'; c.beginPath(); c.arc(w / 2, w / 2, 24, 0, Math.PI * 2); c.fill();
        });
        var edgeMat = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.5 });
        var roll = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.5, 72), [new THREE.MeshStandardMaterial({ map: wound, roughness: 0.32 }), edgeMat, edgeMat]);
        roll.rotation.x = Math.PI / 2; roll.position.set(-0.4, 0.15, 0); g.add(roll);
        var tail = new THREE.PlaneGeometry(2.4, 0.5, 60, 1);
        var strip = new THREE.Mesh(tail, new THREE.MeshStandardMaterial({ map: face, side: THREE.DoubleSide, roughness: 0.32 })); g.add(strip);
        var base = tail.attributes.position.array.slice();
        g.userData.tick = function (s) {
          var p = tail.attributes.position.array;
          for (var k = 0; k < p.length; k += 3) {
            var x = base[k], u = (x + 1.2) / 2.4;
            p[k] = x + 0.8; p[k + 1] = 0.15 - 0.7 + u * 0.05 + Math.sin(u * 5 - s * 2) * 0.12 * u;
            p[k + 2] = base[k + 1] + Math.cos(u * 4 - s * 1.5) * 0.18 * u;
          }
          tail.attributes.position.needsUpdate = true; tail.computeVertexNormals();
        };
        return g;
      },
      /* Coasters: 12-scallop die-cut board, engraved toile around the edge, dark-green
         scalloped line set in from the edge, blank center (no wordmark) */
      coaster: function () {
        var g = new THREE.Group();
        var R = 0.8, N = 12;
        function scallop(t) { return 0.87 + 0.13 * Math.abs(Math.cos(N * t / 2)); }
        var shape = new THREE.Shape();
        for (var i = 0; i <= 480; i++) {
          var t = i / 480 * Math.PI * 2, rr = R * scallop(t);
          if (i === 0) shape.moveTo(Math.cos(t) * rr, Math.sin(t) * rr); else shape.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
        }
        var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 4 });   /* thin board */
        var top = loadTex('assets/3d/coaster.jpg');
        top.repeat.set(1 / (2 * R), 1 / (2 * R)); top.offset.set(0.5, 0.5);
        var face = new THREE.MeshStandardMaterial({ map: top, roughness: 0.9, envMapIntensity: 0.35 });
        var edgeM = std(0xEFECE6, { roughness: 0.95, envMapIntensity: 0.3 });
        function piece(x, y, z, rx, rz) {
          var m = new THREE.Mesh(geo, [face, edgeM]); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m;
        }
        /* a neat stack behind, and the hero coaster leaning toward the viewer */
        for (var k = 0; k < 6; k++) piece(0.35, -0.98 + k * 0.03, -0.35, -Math.PI / 2, k * 0.21);
        piece(-0.12, -0.25, 0.25, -0.62, 0.08);
        g.userData.sway = true;
        return g;
      },
      /* Stainless steel ornament: a 2 mm cut-out letterform (one arc crossing one long
         stroke, like the client's "X"), polished gold finish, hung on a satin ribbon. No brand. */
      xorn: function () {
        var g = new THREE.Group();
        /* Upright, symmetric letterform: two mirrored S-curves crossing in the middle, each end
           flaring out sideways (the infinity-like look). Tapers to sharp points, crisp cut edges. */
        var WMAX = 0.1;
        function widthAt(t) { return WMAX * Math.pow(Math.sin(Math.PI * t), 0.55); }
        function curveFor(sgn) {   /* sgn 1: top-left to bottom-right, -1: its mirror */
          return new THREE.CubicBezierCurve(
            new THREE.Vector2(-0.88 * sgn, 0.78), new THREE.Vector2(-0.3 * sgn, 0.8),
            new THREE.Vector2(0.3 * sgn, -0.8), new THREE.Vector2(0.88 * sgn, -0.78));
        }
        function stroke(curve) {
          var n = 96, left = [], right = [];
          for (var i = 0; i <= n; i++) {
            var t = i / n, p = curve.getPoint(t), d = curve.getTangent(t), w = widthAt(t);
            left.push(new THREE.Vector2(p.x - d.y * w, p.y + d.x * w));
            right.push(new THREE.Vector2(p.x + d.y * w, p.y - d.x * w));
          }
          return new THREE.ExtrudeGeometry(new THREE.Shape(left.concat(right.reverse())),
            { depth: 0.035, bevelEnabled: false, curveSegments: 12 });
        }
        var metal = std(0xF0D18C, { metalness: 0.75, roughness: 0.18, envMapIntensity: 2.4, emissive: 0x241A06, flatShading: true });
        var x = new THREE.Group();
        var cA = curveFor(1), cB = curveFor(-1);
        x.add(new THREE.Mesh(stroke(cA), metal));
        var b = new THREE.Mesh(stroke(cB), metal); b.position.z = 0.001; x.add(b);

        /* Ring, top center, sitting in the gap above the crossing and touching both strokes.
           Find the height where the clearance to the stroke edge equals the ring's outer radius. */
        var RO = 0.085, RI = 0.048;
        function clearance(yc) {
          var best = 1e9;
          for (var i = 0; i <= 200; i++) {
            var t = i / 200, p = cA.getPoint(t);
            best = Math.min(best, Math.hypot(p.x, p.y - yc) - widthAt(t));
          }
          return best;
        }
        var yc = 0.02;
        while (yc < 0.7 && clearance(yc) < RO) yc += 0.002;
        var ringShape = new THREE.Shape(); ringShape.absarc(0, 0, RO, 0, Math.PI * 2, false);
        var hole = new THREE.Path(); hole.absarc(0, 0, RI, 0, Math.PI * 2, true); ringShape.holes.push(hole);
        var ring = new THREE.Mesh(new THREE.ExtrudeGeometry(ringShape, { depth: 0.035, bevelEnabled: false, curveSegments: 40 }), metal);
        ring.position.set(0, yc - 0.004, 0); x.add(ring);      /* a hair lower so the ring meets the strokes */
        x.position.set(0, -0.12, -0.0175); g.add(x);

        /* Satin ribbon looped through the ring: one side in front of the sheet, one behind */
        var top = -0.12 + yc + RI * 0.4;
        var sat = std(0xCDAE6A, { roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide, envMapIntensity: 0.8 });
        g.add(ribbonStrip([new THREE.Vector3(0, top, 0.03), new THREE.Vector3(0, top + 0.45, 0.02), new THREE.Vector3(0, 1.2, 0)], 0.04, sat));
        g.add(ribbonStrip([new THREE.Vector3(0, top, -0.03), new THREE.Vector3(0, top + 0.45, -0.02), new THREE.Vector3(0, 1.2, 0)], 0.04, sat));
        var fold = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 8, 24, Math.PI), sat);
        fold.rotation.y = Math.PI / 2; fold.position.set(0, top, 0); g.add(fold);
        g.userData.sway = true;
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
      o.rotation.y = (reduce ? (o.userData.sway ? 0.25 : 0.6) : (o.userData.sway ? Math.sin(sec * 0.55) * 0.5 : sec * 0.45)) + drag.y;
      o.position.y = (o.userData.y || 0) + (reduce ? 0 : Math.sin(sec * 1.2) * 0.05);
      if (o.userData.tick) o.userData.tick(sec);
      renderer.render(scene, camera);
    }
    /* Build and start only when the section comes near the screen, so the page loads fast */
    var started = false;
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(function () { fn({ timeRemaining: function () { return 8; } }); }, 120); };
    function boot() {
      if (started) return; started = true;
      /* one step per frame so scrolling never stalls: reflections, first product, then start */
      requestAnimationFrame(function () {
        makeEnvironment();
        requestAnimationFrame(function () {
          get(shown);
          runWhenVisible(host, frame); host.classList.add('ready');
          /* build the remaining products one at a time when the browser has nothing else to do */
          var queue = Object.keys(builders).filter(function (k) { return k !== shown; });
          (function next() {
            if (!queue.length) return;
            idle(function () { var k = queue.shift(); get(k); renderer.compile(scene, camera); next(); }, { timeout: 2000 });
          })();
        });
      });
    }
    if ('IntersectionObserver' in window) {
      var bio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { bio.disconnect(); boot(); } }, { rootMargin: '400px 0px' });
      bio.observe(host);
    } else boot();
  })();
})();
