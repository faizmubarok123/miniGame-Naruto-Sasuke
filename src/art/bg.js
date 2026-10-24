// bg.js — latar parallax per tema: langit, awan, pegunungan, perbukitan, desa/bambu
import { makeCanvas } from './spritekit.js';

function mk(w, h, draw) {
  const { c, ctx } = makeCanvas(w, h);
  ctx.imageSmoothingEnabled = true;
  draw(ctx, w, h);
  return c;
}

const STRIP_W = 1200;

// strip yang bisa tile: fitur digambar di x, x-W, x+W agar mulus
function tileStrip(w, h, features) {
  return mk(w, h, (x) => {
    for (const f of features) {
      for (const dx of [0, -w, w]) {
        x.save();
        x.translate(dx, 0);
        f(x);
        x.restore();
      }
    }
  });
}

export function buildCloudSprites() {
  const puffs = [
    (r) => [[10, 12, 16], [30, 10, 20], [52, 12, 15], [26, 18, 22], [44, 20, 16]],
    (r) => [[8, 12, 12], [24, 8, 16], [44, 10, 19], [60, 14, 10], [30, 18, 20], [48, 20, 14]],
    (r) => [[12, 14, 13], [28, 10, 17], [46, 13, 14], [22, 20, 15], [40, 20, 13], [56, 18, 9]]
  ];
  return puffs.map((gen, i) => mk(150 + i * 60, 120, (x) => {
    const parts = gen();
    // geser +24 ke bawah agar arc tidak terpotong tepi atas kanvas (u, sudut pemotongan rata)
    x.save(); x.translate(0, 24);
    for (const [px, py, pr] of parts) {
      x.fillStyle = 'rgba(190,225,250,0.9)';
      x.beginPath(); x.arc(px + 3, py + 4, pr, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#ffffff';
      x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.75)';
      x.beginPath(); x.arc(px - pr * 0.35, py - pr * 0.4, pr * 0.6, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }));
}

export function buildBackdrop(theme) {
  const t = theme;

  // ---- pegunungan jauh ----
  const mountains = tileStrip(STRIP_W, 260, [
    (x) => {
      // ridges lembut dengan haze
      const peaks = [];
      let px = 0;
      while (px < STRIP_W) {
        const w = 90 + ((px * 7919) % 130);
        const h = 90 + ((px * 104729) % 130);
        peaks.push([px, w, h]);
        px += w * 0.72;
      }
      for (const [px, w, h] of peaks) {
        x.fillStyle = t.hillFar;
        x.globalAlpha = 0.85;
        x.beginPath();
        x.moveTo(px - w * 0.6, 260);
        x.moveTo(px - w * 0.55, 260);
        x.quadraticCurveTo(px, 260 - h * 1.15, px + w * 0.55, 260);
        x.closePath(); x.fill();
        x.globalAlpha = 0.4;
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.moveTo(px, 260 - h * 1.0);
        x.lineTo(px + w * 0.18, 260 - h * 0.62);
        x.lineTo(px - w * 0.18, 260 - h * 0.62);
        x.closePath(); x.fill();
        x.globalAlpha = 1;
      }
    }
  ]);

  // ---- perbukitan tengah + ikon tema ----
  const midHeights = 300;
  const mid = tileStrip(STRIP_W, midHeights, [
    (x) => {
      if (t.id === 'bamboo') {
        // hutan bambu siluet
        let px = 20;
        while (px < STRIP_W) {
          const h = 110 + ((px * 15485863) % 120);
          x.fillStyle = t.hillMid;
          x.globalAlpha = 0.9;
          x.fillRect(px, midHeights - h, 9, h);
          x.fillRect(px + 3, midHeights - h - 8, 3, 8);
          x.fillStyle = '#3d7c3f';
          for (let y = midHeights - h + 14; y < midHeights; y += 16) x.fillRect(px, y, 9, 2);
          px += 34 + ((px * 40503) % 46);
        }
        x.globalAlpha = 1;
      } else {
        // rolling hills
        x.fillStyle = t.hillMid;
        for (const [hx, hw, hh] of [[80, 420, 120], [520, 520, 150], [1000, 420, 110]]) {
          x.beginPath();
          x.ellipse(hx, midHeights + 40, hw, hh, 0, Math.PI, 0);
          x.fill();
        }
        if (t.id === 'village') {
          // pagoda siluet + rumah
          x.fillStyle = '#6d9a71';
          const pagoda = (bx, by, s) => {
            for (let i = 0; i < 3; i++) {
              const w2 = s * (1 - i * 0.22);
              x.beginPath();
              x.moveTo(bx - w2, by - i * s * 0.55);
              x.quadraticCurveTo(bx, by - i * s * 0.55 - s * 0.32, bx + w2, by - i * s * 0.55);
              x.quadraticCurveTo(bx, by - i * s * 0.55 - s * 0.18, bx - w2 * 0.86, by - i * s * 0.55 + s * 0.1);
              x.quadraticCurveTo(bx, by - i * s * 0.55 + s * 0.04, bx + w2 * 0.86, by - i * s * 0.55 + s * 0.1);
              x.closePath(); x.fill();
            }
            x.fillRect(bx - 3, by - s * 1.5, 6, s * 0.4);
          };
          pagoda(320, midHeights - 118, 60);
          pagoda(880, midHeights - 128, 50);
          // rooftops desa kecil
          for (const [hx, hy] of [[560, midHeights - 96], [640, midHeights - 88], [1080, midHeights - 86]]) {
            x.beginPath();
            x.moveTo(hx - 34, hy + 22); x.lineTo(hx, hy - 20); x.lineTo(hx + 34, hy + 22);
            x.closePath(); x.fill();
            x.fillRect(hx - 26, hy + 20, 52, 40);
          }
        } else if (t.id === 'storm') {
          // tebing berundak
          x.fillStyle = '#5d9a68';
          for (const [bx, bh] of [[180, 150], [420, 210], [700, 170], [950, 220]]) {
            x.fillRect(bx, midHeights - bh / 2, 90, bh);
            x.fillRect(bx + 16, midHeights - bh / 2 - 24, 58, 30);
          }
        }
      }
    }
  ]);

  // ---- waterfall untuk tema storm (dipakai renderer sebagai ornamen) ----
  const falls = t.id === 'storm' ? mk(80, 230, (x) => {
    x.fillStyle = 'rgba(120,190,235,0.55)';
    x.fillRect(6, 0, 40, 230);
    x.fillStyle = 'rgba(250,255,255,0.5)';
    for (let i = 0; i < 8; i++) x.fillRect(10 + i * 4, (i * 67) % 210, 3, 30);
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.beginPath(); x.ellipse(26, 226, 30, 8, 0, 0, Math.PI * 2); x.fill();
  }) : null;

  // ---- layer semak-bunga dekat (parallax besar, warna lembut) ----
  const near = tileStrip(STRIP_W, 150, [
    (x) => {
      x.fillStyle = t.id === 'village' ? '#66b96b' : t.hillMid;
      const step = t.id === 'village' ? 90 : 60;
      for (let i = 0; i * step < STRIP_W; i++) {
        const bxx = i * step + 8;
        x.beginPath(); x.arc(bxx, 150, 26, Math.PI, 0); x.fill();
        x.beginPath(); x.arc(bxx + 22, 150, 20, Math.PI, 0); x.fill();
        x.fillRect(bxx - 26, 150 - 4, 74, 12);
      }
      x.fillRect(0, 146, STRIP_W, 8);
    }
  ]);

  return { mountains, mid, near, falls };
}
