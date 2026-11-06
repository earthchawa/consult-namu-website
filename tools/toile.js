/* Toile pattern drawing (engraving-style trees, buildings, archways, palms).
   Used only by tools/bake-textures.js to pre-render the 3D print textures into assets/3d/.
   The website itself just loads those images. */
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

if (typeof window !== 'undefined') window.toile = toile;
