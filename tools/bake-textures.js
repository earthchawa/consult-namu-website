/* Pre-renders the printed textures for the 3D products into assets/3d/*.jpg
   so the website only has to load images (no heavy drawing in the visitor's browser).

   Run from the repository root after changing the print style:
     node tools/bake-textures.js
   Needs Node and Playwright with Chromium. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'assets', '3d');
const toileSrc = fs.readFileSync(path.join(__dirname, 'toile.js'), 'utf8');

/* Bag: same print on every side, at the same scale (PX canvas pixels per 3D unit) */
const BAG = { W: 1.9, H: 1.5, D: 0.62, C: 0.16, PX: 540, BG: '#EFE9DC', INK: '#8E6A5F' };
const BAG_STYLE = { k: 1.05, alpha: 0.9, density: 1.25, scenery: true, sceneryEvery: 200, big: 1.5, tree: 1.5, bushy: true };
/* Coaster: 12 scallops, the bag's print style in rose-brown around the edge, green inset line */
const COASTER = { R: 0.8, N: 12, SIZE: 1024, BG: '#F8F6F1', INK: '#A87A6E', LINE: '#1E3A2A' };

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: toileSrc });

  async function bake(name, w, h, drawSrc, args) {
    const dataUrl = await page.evaluate(({ w, h, drawSrc, args }) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const draw = new Function('c', 'w', 'h', 'args', drawSrc);
      draw(c.getContext('2d'), w, h, args);
      return c.toDataURL('image/jpeg', 0.86);
    }, { w, h, drawSrc, args });
    const file = path.join(outDir, name);
    fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('wrote', path.relative(root, file), w + 'x' + h);
  }

  const bagDraw = `
    c.fillStyle = args.BG; c.fillRect(0, 0, w, h);
    toile(c, w, h, args.INK, args.seed, args.style);
    c.strokeStyle = 'rgba(0,0,0,.10)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, h * 0.06); c.lineTo(w, h * 0.06); c.stroke();`;
  const W = Math.round(BAG.W * BAG.PX), H = Math.round(BAG.H * BAG.PX);
  const sideW = Math.round(Math.hypot(BAG.C, BAG.D / 2) * 2 * BAG.PX);
  await bake('bag-front.jpg', W, H, bagDraw, { ...BAG, seed: 11, style: BAG_STYLE });
  await bake('bag-back.jpg', W, H, bagDraw, { ...BAG, seed: 37, style: BAG_STYLE });
  await bake('bag-side-1.jpg', sideW, H, bagDraw, { ...BAG, seed: 23, style: BAG_STYLE });
  await bake('bag-side-2.jpg', sideW, H, bagDraw, { ...BAG, seed: 29, style: BAG_STYLE });

  await bake('coaster.jpg', COASTER.SIZE, COASTER.SIZE, `
    const R = args.R, N = args.N;
    function scallop(t) { return 0.87 + 0.13 * Math.abs(Math.cos(N * t / 2)); }
    c.fillStyle = args.BG; c.fillRect(0, 0, w, h);
    toile(c, w, h, args.INK, 5, { k: 1.15, alpha: 0.92, density: 1.6, scenery: true, sceneryEvery: 190, big: 1.3, tree: 1.4, bushy: true, edge: 0.15 });
    const fade = c.createRadialGradient(w / 2, w / 2, w * 0.1, w / 2, w / 2, w * 0.3);
    fade.addColorStop(0, args.BG); fade.addColorStop(0.55, 'rgba(248,246,241,.9)'); fade.addColorStop(1, 'rgba(248,246,241,0)');
    c.fillStyle = fade; c.fillRect(0, 0, w, h);
    c.strokeStyle = args.LINE; c.lineWidth = 4.5; c.beginPath();
    for (let j = 0; j <= 480; j++) {
      const a = j / 480 * Math.PI * 2, r = R * scallop(a) * 0.82;
      const px = (Math.cos(a) * r / (2 * R) + 0.5) * w, py = (0.5 - Math.sin(a) * r / (2 * R)) * w;
      if (j === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.stroke();`, COASTER);

  await browser.close();
})();
