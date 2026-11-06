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

    /* Studio reflections: a few soft light panels baked into an environment map */
    (function () {
      var pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
      env.background = new THREE.Color(0x0c0c0c);
      function panel(w, h, c, k, p) {
        var m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide }));
        m.position.set(p[0], p[1], p[2]); m.lookAt(0, 0, 0); env.add(m);
      }
      panel(8, 4, 0xffffff, 2.2, [0, 7, 5]); panel(4, 7, 0xfff1dc, 1.6, [-7, 2, 3]); panel(4, 6, 0xffffff, 1.0, [7, 2, -2]); panel(12, 3, 0x2a2a2a, 1, [0, -6, 0]);
      scene.environment = pm.fromScene(env, 0.04).texture; pm.dispose();
    })();
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

    /* ---------- Toile pattern, drawn on a canvas (no logos, no text) ----------
       Engraving-style trees: branching lines with small leaf marks and hatched ground,
       in a soft rose-brown, like the print on the client's bags and coasters. */
    function toile(c, w, h, ink, seed, opts) {
      opts = opts || {};
      var s = seed || 7;
      function rnd() { s = (s * 16807) % 2147483647; return s / 2147483647; }
      var k = opts.k || (opts.scale || 1) * w / 1024;
      c.save();
      c.strokeStyle = ink; c.fillStyle = ink; c.lineCap = 'round'; c.lineJoin = 'round';
      c.globalAlpha = opts.alpha || 0.9;
      /* everything is collected into three paths (thin / medium / thick) and stroked once each: fast */
      var thin = new Path2D(), mid = new Path2D(), thick = new Path2D();
      function pathFor(wd) { return wd > 2.2 * k ? thick : wd > 1.2 * k ? mid : thin; }
      function leaves(x, y, size) {
        var n = 7 + Math.floor(rnd() * 7);
        for (var i = 0; i < n; i++) {
          var a = rnd() * Math.PI * 2, d = rnd() * size, lx = x + Math.cos(a) * d, ly = y + Math.sin(a) * d * 0.75;
          thin.moveTo(lx + Math.cos(a) * 2.6 * k, ly + Math.sin(a) * 2.6 * k);
          thin.ellipse(lx, ly, 2.6 * k, 1.3 * k, a, 0, Math.PI * 2);
        }
      }
      function branch(x, y, len, ang, depth, width) {
        var bend = (rnd() - 0.5) * 0.5;
        var mx = x + Math.cos(ang + bend) * len * 0.5, my = y + Math.sin(ang + bend) * len * 0.5;
        var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
        var bp = pathFor(width); bp.moveTo(x, y); bp.quadraticCurveTo(mx, my, ex, ey);
        /* bark hatching on thicker limbs */
        if (width > 2.2 * k) for (var hh = 0.2; hh < 0.9; hh += 0.18) {
          var hx = x + (ex - x) * hh, hy = y + (ey - y) * hh;
          thin.moveTo(hx - 2 * k, hy); thin.lineTo(hx + 2 * k, hy + 1.5 * k);
        }
        if (depth <= 0) { leaves(ex, ey, 9 * k); return; }
        var kids = 2 + (rnd() < 0.45 ? 1 : 0);
        for (var i = 0; i < kids; i++) {
          var spread = (i - (kids - 1) / 2) * (0.45 + rnd() * 0.25);
          branch(ex, ey, len * (0.66 + rnd() * 0.12), ang + spread, depth - 1, width * 0.62);
        }
        if (depth <= 2) { leaves(ex, ey, 9 * k); if (opts.bushy) leaves(ex, ey, 14 * k); }
      }
      function ground(x, y, wd) {
        for (var i = 0; i < 9; i++) {
          var gx = x + rnd() * wd, gy = y + rnd() * 8 * k;
          thin.moveTo(gx, gy); thin.lineTo(gx + (6 + rnd() * 10) * k, gy);
        }
        for (var j = 0; j < 6; j++) {
          var tx = x + rnd() * wd; thin.moveTo(tx, y); thin.lineTo(tx + (rnd() - 0.5) * 4 * k, y - (5 + rnd() * 7) * k);
        }
      }
      /* architecture, like the print on the client's bag: a block with rows of windows, an archway, palms */
      function building(x, y) {
        var bw = (70 + rnd() * 50) * k * (opts.big || 1), bh = (80 + rnd() * 60) * k * (opts.big || 1);
        mid.rect(x, y - bh, bw, bh);
        for (var fy = y - bh + 8 * k; fy < y - 6 * k; fy += 10 * k) {
          thin.moveTo(x, fy); thin.lineTo(x + bw, fy);
          for (var fx = x + 4 * k; fx < x + bw - 6 * k; fx += 9 * k) thin.rect(fx, fy + 2 * k, 4 * k, 5 * k);
        }
        thin.moveTo(x - 4 * k, y - bh); thin.lineTo(x + bw + 4 * k, y - bh);
      }
      function archway(x, y) {
        var aw = (34 + rnd() * 14) * k, ah = (46 + rnd() * 16) * k;
        mid.moveTo(x, y); mid.lineTo(x, y - ah * 0.6); mid.arc(x + aw / 2, y - ah * 0.6, aw / 2, Math.PI, 0); mid.lineTo(x + aw, y);
        mid.rect(x - 9 * k, y - ah - 6 * k, aw + 18 * k, ah + 6 * k);
        for (var r = 0; r < 4; r++) { thin.moveTo(x + 3 * k + r * 3 * k, y - 4 * k); thin.lineTo(x + 3 * k + r * 3 * k, y - ah * 0.5); }
      }
      function palm(x, y) {
        var th = (50 + rnd() * 30) * k;
        mid.moveTo(x, y); mid.quadraticCurveTo(x + 6 * k, y - th / 2, x + 2 * k, y - th);
        for (var f = 0; f < 9; f++) {
          var a = -Math.PI / 2 + (f - 4) * 0.38, len = (22 + rnd() * 12) * k;
          var ex = x + 2 * k + Math.cos(a) * len, ey = y - th + Math.sin(a) * len * 0.8 + len * 0.25;
          thin.moveTo(x + 2 * k, y - th); thin.quadraticCurveTo(x + 2 * k + Math.cos(a) * len * 0.5, y - th + Math.sin(a) * len * 0.6, ex, ey);
          for (var l = 0.3; l < 1; l += 0.15) { var lx = x + 2 * k + (ex - x - 2 * k) * l, ly = y - th + (ey - y + th) * l; thin.moveTo(lx, ly); thin.lineTo(lx + 3 * k, ly + 4 * k); }
        }
      }
      if (opts.scenery) {
        var nb = Math.round((w * h) / (opts.sceneryEvery || 420) / (opts.sceneryEvery || 420) / (k * k));
        for (var q = 0; q < nb; q++) {
          var bx = rnd() * w, by = rnd() * h + 60 * k, pick = rnd();
          if (pick < 0.4) building(bx, by); else if (pick < 0.7) archway(bx, by); else palm(bx, by);
          ground(bx - 30 * k, by + 2 * k, 90 * k);
        }
      }
      var density = opts.density || 1;
      var n = Math.round((w * h) / (190 * 190 * k * k) * density);
      for (var t = 0; t < n; t++) {
        var x = rnd() * w, y = rnd() * h + 40 * k, size = (34 + rnd() * 30) * k;
        if (opts.edge) { /* keep trees toward the outside of a round piece */
          var dx = x - w / 2, dy = y - h / 2; if (Math.sqrt(dx * dx + dy * dy) < w * opts.edge) continue;
        }
        branch(x, y, size * (opts.tree || 1), -Math.PI / 2 + (rnd() - 0.5) * 0.35, opts.bushy ? 4 : 3, 3.2 * k * (opts.tree || 1));
        ground(x - 24 * k, y + 2 * k, 50 * k);
      }
      c.lineWidth = 0.8 * k; c.stroke(thin);
      c.lineWidth = 1.5 * k; c.stroke(mid);
      c.lineWidth = 2.6 * k; c.stroke(thick);
      c.restore();
    }
    function toileTex(w, h, bg, ink, seed, opts) {
      return canvasTex(w, h, function (c) { c.fillStyle = bg; c.fillRect(0, 0, w, h); toile(c, w, h, ink, seed, opts); });
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
        var BG = '#EFE9DC', INK = '#8E6A5F', PX = 540;       /* PX: canvas pixels per unit, same everywhere */
        var K = 1.05;
        function print(wu, hu, seed) {
          var w = Math.round(wu * PX), h = Math.round(hu * PX);
          return canvasTex(w, h, function (c) {
            c.fillStyle = BG; c.fillRect(0, 0, w, h);
            toile(c, w, h, INK, seed, { k: K, alpha: 0.9, density: 1.25, scenery: true, sceneryEvery: 200, big: 1.5, tree: 1.5, bushy: true });
            c.strokeStyle = 'rgba(0,0,0,.10)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, h * 0.06); c.lineTo(w, h * 0.06); c.stroke();
          });
        }
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
          { p: [[-x, y0, z], [x, y0, z], [x, y1, z], [-x, y1, z]], t: print(W, H, 11), u: [0, 1] },            /* front */
          { p: [[x, y0, -z], [-x, y0, -z], [-x, y1, -z], [x, y1, -z]], t: print(W, H, 37), u: [0, 1] }         /* back */
        ];
        [1, -1].forEach(function (sgn, i) {     /* each gusset: two panels meeting at a fold */
          var t = print(sideLen * 2, H, 23 + i * 6);
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
        var geo = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 4 });
        var top = canvasTex(1024, 1024, function (c, w) {
          c.fillStyle = '#F8F6F1'; c.fillRect(0, 0, w, w);
          toile(c, w, w, '#A87A6E', 5, { alpha: 0.92, scale: 1, density: 3.2, edge: 0.16 });
          var fade = c.createRadialGradient(w / 2, w / 2, w * 0.1, w / 2, w / 2, w * 0.3);
          fade.addColorStop(0, 'rgba(248,246,241,1)'); fade.addColorStop(0.55, 'rgba(248,246,241,.9)'); fade.addColorStop(1, 'rgba(248,246,241,0)');
          c.fillStyle = fade; c.fillRect(0, 0, w, w);
          c.strokeStyle = '#1E3A2A'; c.lineWidth = 4.5; c.beginPath();
          for (var j = 0; j <= 480; j++) {
            var a = j / 480 * Math.PI * 2, r = R * scallop(a) * 0.82;
            var px = (Math.cos(a) * r / (2 * R) + 0.5) * w, py = (0.5 - Math.sin(a) * r / (2 * R)) * w;
            if (j === 0) c.moveTo(px, py); else c.lineTo(px, py);
          }
          c.stroke();
        });
        top.repeat.set(1 / (2 * R), 1 / (2 * R)); top.offset.set(0.5, 0.5);
        var face = new THREE.MeshStandardMaterial({ map: top, roughness: 0.9, envMapIntensity: 0.35 });
        var edgeM = std(0xEFECE6, { roughness: 0.95, envMapIntensity: 0.3 });
        function piece(x, y, z, rx, rz) {
          var m = new THREE.Mesh(geo, [face, edgeM]); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m;
        }
        /* a neat stack behind, and the hero coaster leaning toward the viewer */
        for (var k = 0; k < 5; k++) piece(0.35, -0.98 + k * 0.052, -0.35, -Math.PI / 2, k * 0.21);
        piece(-0.12, -0.25, 0.25, -0.62, 0.08);
        g.userData.sway = true;
        return g;
      },
      /* Stainless steel ornament: a 2 mm cut-out letterform (one arc crossing one long
         stroke, like the client's "X"), polished gold finish, hung on a satin ribbon. No brand. */
      xorn: function () {
        var g = new THREE.Group();
        function stroke(p0, p1, p2, wMax) {
          var curve = new THREE.QuadraticBezierCurve(new THREE.Vector2(p0[0], p0[1]), new THREE.Vector2(p1[0], p1[1]), new THREE.Vector2(p2[0], p2[1]));
          var n = 72, left = [], right = [];
          for (var i = 0; i <= n; i++) {
            var t = i / n, p = curve.getPoint(t), d = curve.getTangent(t);
            var w = wMax * Math.pow(Math.sin(Math.PI * t), 0.55);   /* tapers to sharp points */
            left.push(new THREE.Vector2(p.x - d.y * w, p.y + d.x * w));
            right.push(new THREE.Vector2(p.x + d.y * w, p.y - d.x * w));
          }
          return new THREE.ExtrudeGeometry(new THREE.Shape(left.concat(right.reverse())),
            { depth: 0.035, bevelEnabled: false, curveSegments: 12 });   /* crisp cut edges */
        }
        var metal = std(0xF0D18C, { metalness: 0.75, roughness: 0.18, envMapIntensity: 2.4, emissive: 0x241A06, flatShading: true });
        var x = new THREE.Group();
        x.add(new THREE.Mesh(stroke([-0.92, 0.5], [0.0, 0.42], [0.78, -0.56], 0.11), metal));
        var b = new THREE.Mesh(stroke([0.7, 1.0], [0.06, 0.1], [-0.7, -1.04], 0.1), metal); b.position.z = 0.001; x.add(b);
        x.position.set(0, -0.15, -0.015); g.add(x);
        /* satin ribbon: two thin strips meeting at a small hole near the crossing */
        var sat = std(0xCDAE6A, { roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide, envMapIntensity: 0.8 });
        g.add(ribbonStrip([new THREE.Vector3(0.02, 0.05, 0.02), new THREE.Vector3(0.0, 0.5, 0.01), new THREE.Vector3(-0.02, 1.1, 0)], 0.045, sat));
        g.add(ribbonStrip([new THREE.Vector3(0.02, 0.05, -0.02), new THREE.Vector3(0.04, 0.5, -0.01), new THREE.Vector3(0.0, 1.1, 0)], 0.045, sat));
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
    function boot() { if (started) return; started = true; get(shown); runWhenVisible(host, frame); host.classList.add('ready'); }
    if ('IntersectionObserver' in window) {
      var bio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { bio.disconnect(); boot(); } }, { rootMargin: '400px 0px' });
      bio.observe(host);
    } else boot();
  })();
})();
