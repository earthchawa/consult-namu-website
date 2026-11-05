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
    function std(color, o) {
      var m = new THREE.MeshStandardMaterial({ color: color, roughness: 0.75, metalness: 0 });
      for (var k in o) {
        if (k === 'color') continue;
        if (k === 'emissive') m.emissive.setHex(o[k]); else m[k] = o[k];
      }
      return m;
    }

    /* ---------- Toile pattern, drawn on a canvas (no logos, no text) ----------
       Trees, buildings, arches and birds in thin brown line work, like the client's bags and coasters. */
    function toile(c, w, h, ink, seed) {
      var s = seed || 7;
      function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
      c.strokeStyle = ink; c.fillStyle = ink; c.lineCap = 'round'; c.lineJoin = 'round';
      function tree(x, y, k) {
        c.lineWidth = 1.4 * k;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2 * k, y - 34 * k); c.stroke();
        for (var i = 0; i < 9; i++) {
          var a = rnd() * Math.PI * 2, d = rnd() * 16 * k;
          c.beginPath(); c.arc(x + Math.cos(a) * d, y - 42 * k + Math.sin(a) * d * 0.8, (6 + rnd() * 7) * k, 0, Math.PI * 2); c.stroke();
        }
        for (var j = 0; j < 7; j++) { var hx = x - 14 * k + rnd() * 28 * k, hy = y - 52 * k + rnd() * 22 * k; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 5 * k, hy + 3 * k); c.stroke(); }
      }
      function building(x, y, k) {
        var bw = (30 + rnd() * 26) * k, bh = (40 + rnd() * 34) * k;
        c.lineWidth = 1.2 * k; c.strokeRect(x, y - bh, bw, bh);
        for (var wy = y - bh + 6 * k; wy < y - 8 * k; wy += 9 * k)
          for (var wx = x + 4 * k; wx < x + bw - 5 * k; wx += 8 * k) c.strokeRect(wx, wy, 3.5 * k, 5 * k);
        c.beginPath(); c.moveTo(x - 3 * k, y - bh); c.lineTo(x + bw / 2, y - bh - 14 * k); c.lineTo(x + bw + 3 * k, y - bh); c.stroke();
      }
      function arch(x, y, k) {
        c.lineWidth = 1.3 * k;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 26 * k); c.arc(x + 14 * k, y - 26 * k, 14 * k, Math.PI, 0); c.lineTo(x + 28 * k, y); c.stroke();
        c.strokeRect(x - 6 * k, y - 44 * k, 40 * k, 44 * k);
      }
      function birds(x, y, k) {
        c.lineWidth = 1 * k;
        for (var i = 0; i < 3; i++) { var bx = x + i * 12 * k, by = y + rnd() * 8 * k; c.beginPath(); c.moveTo(bx - 4 * k, by); c.quadraticCurveTo(bx, by - 4 * k, bx, by); c.quadraticCurveTo(bx, by - 4 * k, bx + 4 * k, by); c.stroke(); }
      }
      function grass(x, y, k) { c.lineWidth = 1 * k; for (var i = 0; i < 6; i++) { c.beginPath(); c.moveTo(x + i * 4 * k, y); c.lineTo(x + i * 4 * k + (rnd() - 0.5) * 6 * k, y - (6 + rnd() * 8) * k); c.stroke(); } }
      var k = w / 512 * 0.78, cell = 74 * k;
      var rows = Math.ceil(h / cell) + 1, cols = Math.ceil(w / cell) + 1;
      c.lineWidth = 1.6 * k;
      for (var row = 0; row < rows; row++) {
        var by = (row + 1) * cell - 4 * k;
        for (var col = 0; col < cols; col++) {
          var bx = col * cell - cell * 0.5 + (row % 2 ? cell / 2 : 0) + rnd() * 14 * k, pick = rnd();
          if (pick < 0.45) tree(bx + 20 * k, by, k * (0.9 + rnd() * 0.5));
          else if (pick < 0.7) building(bx, by, k);
          else arch(bx + 6 * k, by, k);
          grass(bx + 40 * k, by + 2 * k, k);
          if (rnd() < 0.35) birds(bx + 30 * k, by - 80 * k, k);
        }
      }
    }
    function toileTex(w, h, bg, ink, seed) {
      return canvasTex(w, h, function (c) { c.fillStyle = bg; c.fillRect(0, 0, w, h); toile(c, w, h, ink, seed); });
    }
    var FOIL = { color: 0xD6B46A, metalness: 0.35, roughness: 0.35, emissive: 0x2A1E08 };
    var GREEN = 0x0A2A17;

    /* ---------- The products ---------- */
    var builders = {
      /* Printed paper bag: toile print, green grosgrain ribbon handles, a plain gold foil mark */
      bag: function () {
        var g = new THREE.Group();
        var W = 1.8, H = 1.42, D = 0.56;
        var printFront = toileTex(1024, 820, '#ECE5D8', '#6F4B44', 11);
        var printSide = toileTex(320, 820, '#ECE5D8', '#6F4B44', 23);
        var front = new THREE.MeshStandardMaterial({ map: printFront, roughness: 0.85 });
        var back = new THREE.MeshStandardMaterial({ map: toileTex(1024, 820, '#ECE5D8', '#6F4B44', 37), roughness: 0.85 });
        var side = new THREE.MeshStandardMaterial({ map: printSide, roughness: 0.85 });
        var inside = std(0xC9BFAE, { roughness: 0.9 }), bottom = std(0xD8D0C2);
        var body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [side, side, inside, bottom, front, back]);
        g.add(body);
        /* turned-down top cuff */
        var cuff = new THREE.Mesh(new THREE.BoxGeometry(W + 0.004, 0.16, D + 0.004), std(0xE6DECF, { roughness: 0.85 }));
        cuff.position.y = H / 2 - 0.08; g.add(cuff);
        /* gold foil mark in place of the logo: a thin rule with a small diamond */
        var foil = std(FOIL.color, FOIL);
        var rule = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.012, 0.004), foil); rule.position.set(0, -0.02, D / 2 + 0.003); g.add(rule);
        var dia = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.004), foil); dia.rotation.z = Math.PI / 4; dia.position.set(0, -0.02, D / 2 + 0.004); g.add(dia);
        var rule2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.004), foil); rule2.position.set(0, -0.1, D / 2 + 0.003); g.add(rule2);
        /* ribbon handles, flat and slightly glossy */
        var rib = std(GREEN, { roughness: 0.38 });
        [D / 2 - 0.06, -D / 2 + 0.06].forEach(function (z) {
          var curve = new THREE.CubicBezierCurve3(new THREE.Vector3(-0.42, H / 2 - 0.12, 0), new THREE.Vector3(-0.44, H / 2 + 0.75, 0), new THREE.Vector3(0.44, H / 2 + 0.75, 0), new THREE.Vector3(0.42, H / 2 - 0.12, 0));
          var hm = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.05, 10, false), rib);
          hm.scale.z = 0.14; hm.position.z = z; g.add(hm);
          [-0.42, 0.42].forEach(function (x) {
            var knot = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), std(0x2A2A2A)); knot.position.set(x, H / 2 - 0.12, z + (z > 0 ? 0.03 : -0.03)); if (z < 0) knot.rotation.y = Math.PI; g.add(knot);
          });
        });
        g.position.y = -0.25;
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
        var green = ball(std(0x0E2F1E, { roughness: 0.6, metalness: 0 }), -0.66);
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
      /* Coasters: scalloped die-cut paper, toile border, plain center (no logo) */
      coaster: function () {
        var g = new THREE.Group();
        var R = 0.72, N = 16;
        var shape = new THREE.Shape();
        for (var i = 0; i <= 256; i++) {
          var t = i / 256 * Math.PI * 2, rr = R * (0.93 + 0.07 * Math.abs(Math.cos(N * t / 2)));
          var x = Math.cos(t) * rr, y = Math.sin(t) * rr;
          if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
        }
        var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false, curveSegments: 4 });
        var top = canvasTex(1024, 1024, function (c, w) {
          c.fillStyle = '#F1EBDF'; c.fillRect(0, 0, w, w);
          /* toile only in the outer ring */
          c.save(); c.beginPath(); c.arc(w / 2, w / 2, w * 0.5, 0, Math.PI * 2); c.arc(w / 2, w / 2, w * 0.3, 0, Math.PI * 2, true); c.clip();
          c.globalAlpha = 0.9; toile(c, w, w, '#9A6F66', 5); c.restore();
          c.strokeStyle = '#9A6F66'; c.lineWidth = 3;
          c.beginPath(); c.arc(w / 2, w / 2, w * 0.3, 0, Math.PI * 2); c.stroke();
          c.lineWidth = 1.5; c.beginPath(); c.arc(w / 2, w / 2, w * 0.285, 0, Math.PI * 2); c.stroke();
          c.beginPath(); c.arc(w / 2, w / 2, w * 0.44, 0, Math.PI * 2); c.stroke();
        });
        top.repeat.set(1 / (2 * R), 1 / (2 * R)); top.offset.set(0.5, 0.5);
        var face = new THREE.MeshStandardMaterial({ map: top, roughness: 0.9 });
        var edgeM = std(0xE4DCCD, { roughness: 0.95 });
        function coaster(x, y, z, rx, rz) {
          var m = new THREE.Mesh(geo, [face, edgeM]);
          m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m;
        }
        /* a short stack, and one standing up so the print is visible */
        for (var k = 0; k < 4; k++) coaster(0.5 + k * 0.012, -0.95 + k * 0.04, 0.1 - k * 0.01, -Math.PI / 2, k * 0.25);
        var up = coaster(-0.35, -0.2, 0.05, -0.18, 0.05);
        g.userData.tick = function (s) { if (!reduce) up.rotation.x = -0.18 + Math.sin(s * 1.1) * 0.05; };
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
