// spritekit.js — painter kanvas kecil (art-resolusi) + cache; dipakai art/sprites.js
export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

// Kanvas piksel logis (array warna)
export class PixGrid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Array(w * h).fill(null);
  }
  px(x, y, col) {
    x |= 0; y |= 0;
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    this.data[y * this.w + x] = col;
  }
  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col);
  }
  // persegi dengan outline 1px, isi col, outline colO (untuk definisi bentuk)
  box(x, y, w, h, col, colO) {
    this.rect(x, y, w, h, colO);
    if (w > 2 && h > 2) this.rect(x + 1, y + 1, w - 2, h - 2, col);
  }
  hline(x, y, w, col) { this.rect(x, y, w, 1, col); }
  vline(x, y, h, col) { this.rect(x, y, 1, h, col); }
  dot(x, y, col) { this.px(x, y, col); }
  // elips kasar (untuk kepala/badan bulat)
  ellipse(cx, cy, rx, ry, col) {
    for (let y = -ry; y <= ry; y++) {
      const yy = cy + y;
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      for (let x = -w; x <= w; x++) this.px(cx + x, yy, col);
    }
  }
  mirrorLeftToRight(from = 0, to = null) {
    to = to ?? this.w;
    const mid = from + Math.floor((to - 1 - from) / 2);
    for (let x = from; x <= mid; x++) {
      for (let y = 0; y < this.h; y++) {
        const col = this.data[y * this.w + x];
        if (col) this.px(from + (to - 1 - x), y, col);
      }
    }
  }
  toCanvas(scale = 1) {
    const { c, ctx } = makeCanvas(this.w * scale, this.h * scale);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const col = this.data[y * this.w + x];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return c;
  }
}

// keluar palet standar warna karakter
export const PAL = {
  outline: '#2b2436',
  skin: '#ffd9b8', skinShade: '#efb795',
  white: '#ffffff',
  eye: '#332a44',
  hairN: '#ffd044', hairNS: '#e8a92c',   // naruto
  suitN: '#ff8b24', suitNS: '#e0681a', suitNL: '#ffa94e',
  trimN: '#2c63a8',                       // strip biru jaket
  hairS: '#3c4468', hairSS: '#242a44',   // sasuke
  suitS: '#33406a', suitSS: '#273153', suitSL: '#46548c',
  trimS: '#7e6bcf',                       // kasa ungu
  steel: '#cfd8e3', steelD: '#93a4b5',
  red: '#c44b4b',
  gray: '#9aa4ae',
  wood: '#a9743f', woodD: '#82552a',
  leaf: '#46b350'
};
