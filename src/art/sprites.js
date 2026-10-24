// sprites.js — chibi pixel-art: karakter, musuh, objek (dibangun runtime, tanpa file aset)
import { PixGrid, PAL } from './spritekit.js';

const GW = 18, GH = 24;

const CHAR_PAL = {
  naruto: {
    hair: PAL.hairN, hairShade: PAL.hairNS,
    suit: PAL.suitN, suitShade: PAL.suitNS, suitLight: PAL.suitNL,
    trim: PAL.trimN, whiskers: true
  },
  sasuke: {
    hair: PAL.hairS, hairShade: PAL.hairSS,
    suit: PAL.suitS, suitShade: PAL.suitSS, suitLight: PAL.suitSL,
    trim: PAL.trimS, whiskers: false
  }
};

// offset sepatu per fase animasi: [xKiri, yKiri, xKanan, yKanan]
const LEG_POSES = {
  idle:  [5, 21, 10, 21],
  run0:  [5, 21, 10, 21],
  run1:  [4, 22, 11, 21],
  run2:  [5, 21, 10, 21],
  run3:  [5, 21, 12, 22],
  jump:  [5, 19, 10, 19],
  fall:  [3, 21, 12, 21],
  dash:  [3, 20, 11, 20],
  win:   [5, 21, 10, 21],
  hurt:  [5, 21, 10, 21]
};

// pose: idle|run0..3|jump|fall|dash|win|hurt ; t fase untuk idle breathing
export function ninjaFrame(charId, pose, t = 0) {
  const p = CHAR_PAL[charId];
  const g = new PixGrid(GW, GH);
  const cx = 9;

  // kunci gerak kaki & lengan
  let legs, bodyLift = 0, arm = 'down', face = 'norm';
  if (pose === 'run') pose = 'run' + (Math.floor(t) % 4);
  if (pose === 'idle') { legs = LEG_POSES.idle; bodyLift = Math.floor(t) % 2; }
  else if (LEG_POSES[pose]) legs = LEG_POSES[pose];
  else legs = LEG_POSES.idle;

  face = { jump: 'gasp', fall: 'gasp', dash: 'focus', win: 'happy', hurt: 'hurt' }[pose] || 'norm';
  arm = { jump: 'up', fall: 'up', dash: 'dash', win: 'win' }[pose] || 'down';

  // ---- badan ----
  const by = 15 + bodyLift;
  g.rect(5, by, 8, 6, p.suit);
  g.rect(5, by + 1, 2, 3, p.suitLight);           // kilau jepit
  g.vline(8, by + 1, 4, p.suitShade);             // resleting
  if (charId === 'naruto') {
    g.rect(5, by, 3, 2, PAL.trimN);               // bahu biru
    g.rect(10, by, 3, 2, PAL.trimN);
  } else {
    g.rect(5, by, 8, 2, p.suitShade);             // kerah tinggi
    g.px(8, by + 2, PAL.trimS);                   // j Jahitan ungu
  }
  g.hline(5, by + 5, 8, PAL.outline);             // ikat pinggang

  // lengan
  const armY = by + 1;
  if (arm === 'up') {
    g.rect(3, by - 3, 2, 4, p.suit); g.rect(13, by - 3, 2, 4, p.suit);
    g.rect(3, by - 5, 2, 2, PAL.skin); g.rect(13, by - 5, 2, 2, PAL.skin);
  } else if (arm === 'win') {
    g.rect(2, by - 4, 2, 5, p.suit); g.rect(14, by - 4, 2, 5, p.suit);
    g.rect(2, by - 6, 2, 2, PAL.skin); g.rect(14, by - 6, 2, 2, PAL.skin);
  } else if (arm === 'dash') {
    g.rect(13, armY, 4, 2, p.suit);               // siku ke depan
    g.rect(16, armY, 2, 2, PAL.skin);
    g.rect(3, armY + 2, 2, 3, p.suit); g.rect(3, armY + 4, 2, 2, PAL.skin);
  } else {
    g.rect(3, armY, 2, 3, p.suit); g.rect(13, armY, 2, 3, p.suit);
    g.rect(3, armY + 3, 2, 2, PAL.skin); g.rect(13, armY + 3, 2, 2, PAL.skin);
  }

  // ---- kaki + sepatu ----
  const [lx, ly, rx2, ry2] = legs;
  g.rect(lx, ly - 2, 3, 3, p.suitShade);          // paha celana
  g.rect(rx2, ry2 - 2, 3, 3, p.suitShade);
  g.rect(lx, ly, 3, 2, '#3a3f52');                // sandal
  g.rect(rx2, ry2, 3, 2, '#3a3f52');

  // ---- kepala ----
  g.ellipse(cx, 8, 7, 6, PAL.skin);               // bigot wajah dasar
  if (charId === 'naruto') {
    g.ellipse(cx, 6, 7, 5, p.hair);               // tampak mahkota
    // duri rambut
    for (const [sx, sy, sh] of [[3, 2, 3], [7, 0, 4], [11, 1, 3], [14, 3, 2]]) {
      g.rect(sx, sy, 2, sh, p.hair);
    }
    g.rect(2, 6, 2, 4, p.hair); g.rect(14, 6, 2, 4, p.hair); // sisi rambut
    g.rect(3, 4, 3, 2, p.hairShade);              // shading
  } else {
    g.ellipse(cx, 6, 7, 5, p.hair);
    g.rect(2, 3, 14, 2, p.hair);                  // sapu atas
    // poni menutupi dahi dua sisi
    g.rect(4, 5, 2, 5, p.hair);
    g.rect(12, 5, 2, 5, p.hair);
    g.rect(2, 5, 2, 4, p.hair); g.rect(14, 5, 2, 4, p.hair);
    g.rect(3, 3, 3, 2, p.hairShade);
  }

  // pelindung dahi
  g.rect(2, 8, 14, 2, PAL.steel);
  g.hline(2, 9, 14, PAL.steelD);
  g.px(8, 8, '#4a566b'); g.px(9, 8, '#5c6a7e');   // markah daun kecil

  // ---- wajah ----
  const ey = 11;
  if (face === 'hurt') {
    // mata X
    g.px(5, ey, PAL.eye); g.px(6, ey + 1, PAL.eye);
    g.px(6, ey, PAL.eye); g.px(5, ey + 1, PAL.eye);
    g.px(11, ey, PAL.eye); g.px(12, ey + 1, PAL.eye);
    g.px(12, ey, PAL.eye); g.px(11, ey + 1, PAL.eye);
    g.hline(7, ey + 3, 4, '#b26b4d');
  } else if (face === 'happy') {
    g.px(5, ey + 1, PAL.eye); g.px(6, ey, PAL.eye);
    g.px(11, ey + 1, PAL.eye); g.px(12, ey, PAL.eye);
    for (const b of [4, 13]) { g.rect(b, ey + 2, 2, 1, '#ff9d9d'); }
    g.rect(7, ey + 4, 4, 2, '#b26b4d');           // senyum lebar
  } else if (face === 'gasp') {
    g.rect(5, ey, 2, 2, PAL.eye); g.rect(11, ey, 2, 2, PAL.eye);
    g.px(5, ey, PAL.white); g.px(11, ey, PAL.white);
    g.rect(8, ey + 3, 2, 2, '#b26b4d');           // mulut "o"
  } else if (face === 'focus') {
    g.rect(5, ey, 2, 2, PAL.eye); g.rect(11, ey, 2, 2, PAL.eye);
    g.hline(4, ey - 1, 3, PAL.eye); g.hline(11, ey - 1, 3, PAL.eye);
    g.hline(7, ey + 3, 4, '#b26b4d');
  } else {
    g.rect(5, ey, 2, 2, PAL.eye); g.rect(11, ey, 2, 2, PAL.eye);
    g.px(5, ey, PAL.white); g.px(11, ey, PAL.white);
    g.hline(7, ey + 3, 4, '#b26b4d');
    if (p.whiskers) {
      g.px(3, ey + 1, PAL.skinShade); g.px(14, ey + 1, PAL.skinShade);
    } else {
      for (const b of [4, 13]) g.rect(b, ey + 2, 2, 1, '#f3c4cf');
    }
  }

  return g.toCanvas();
}

// ---------- musuh ----------
export function slimeFrame(squish = 0) {
  const g = new PixGrid(16, 12);
  const s = squish > 0 ? 1 : 0;
  g.ellipse(8, 8 + s, 7 - s, 5 - s, '#41b1e8');
  g.ellipse(8, 4 + s, 3, 2, '#9ad8f2');
  g.rect(5, 7, 2, 3, PAL.eye); g.rect(10, 7, 2, 3, PAL.eye);
  g.px(5, 7, PAL.white); g.px(10, 7, PAL.white);
  return g.toCanvas();
}

export function walkerFrame(squish = 0) {
  const g = new PixGrid(16, 14);
  const w = squish > 0 ? 1 : 0;
  g.ellipse(8, 9 - w, 6, 5 - w, '#b0713d');
  g.ellipse(8, 7 - w, 4, 3, '#e2c193');
  g.rect(3, 3 - w, 2, 3, '#8a5a34'); g.rect(11, 3 - w, 2, 3, '#8a5a34');
  g.rect(5, 8 - w, 2, 2, PAL.eye); g.rect(10, 8 - w, 2, 2, PAL.eye);
  g.px(5, 8 - w, PAL.white); g.px(10, 8 - w, PAL.white);
  g.px(8, 10 - w, PAL.eye);
  if (!w) {
    g.rect(4, 12, 2, 2, '#8a5a34'); g.rect(10, 12, 2, 2, '#8a5a34');
  }
  return g.toCanvas();
}

export function rollerFrame() {
  const g = new PixGrid(20, 20);
  g.ellipse(10, 10, 8, 8, '#8a5a34');
  g.ellipse(10, 10, 5, 5, '#a9743f');
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const x = Math.round(10 + Math.cos(a) * 8), y = Math.round(10 + Math.sin(a) * 8);
    g.rect(x - 1, y - 1, 2, 2, '#5d3a1c');
    if (i % 2 === 0) g.px(x, y, '#d85757');
  }
  return g.toCanvas();
}

// ---------- objek ----------
export function coinFrames() {
  const out = [];
  for (const [w, h] of [[8, 8], [5, 8], [2, 8], [5, 8]]) {
    const g = new PixGrid(10, 10);
    g.ellipse(5, 5, Math.ceil(w / 2), Math.ceil(h / 2), '#f7c445');
    if (w > 2) { g.ellipse(5, 5, Math.floor(w / 2) - 1, 3, '#e8952f'); g.px(4, 3, '#fff3b0'); }
    out.push(g.toCanvas());
  }
  return out;
}

export function starFrame(twinkle = 0) {
  const g = new PixGrid(14, 14);
  const c = 7;
  const col = twinkle ? '#ffe982' : '#ffc93a';
  const out = twinkle ? '#fff6c8' : '#ffea9d';
  g.rect(c - 1, 1, 3, 12, col);
  g.rect(1, c - 1, 12, 3, col);
  g.rect(c - 1, c - 1, 3, 3, out);
  g.px(c - 2, 4, out); g.px(c + 2, 4, out);
  g.px(c - 2, 10, out); g.px(c + 2, 10, out);
  return g.toCanvas();
}

export function npcFrames(wave = 0) {
  const g = new PixGrid(16, 20);
  g.ellipse(8, 7, 5, 5, PAL.skin);
  g.ellipse(8, 5, 5, 3, '#4a4a55');
  g.rect(3, 6, 2, 5, '#4a4a55'); g.rect(11, 6, 2, 5, '#4a4a55');
  g.rect(6, 9, 2, 2, PAL.eye); g.rect(10, 9, 2, 2, PAL.eye);
  g.px(6, 9, PAL.white); g.px(10, 9, PAL.white);
  g.hline(7, 12, 3, '#b26b4d');
  g.rect(4, 14, 8, 4, '#4b8b3b');
  g.hline(4, 14, 8, '#356b28');
  g.rect(4, 18, 2, 2, '#3a3f52'); g.rect(10, 18, 2, 2, '#3a3f52');
  if (wave) {
    g.rect(12, 12, 2, 2, PAL.skin);    // tangan melambai
    g.rect(2, 12, 2, 3, PAL.skin);
  } else {
    g.rect(2, 14, 2, 3, '#4b8b3b');
    g.rect(12, 14, 2, 3, '#4b8b3b');
  }
  return g.toCanvas();
}

export function heartIcon(fill = true) {
  const g = new PixGrid(9, 8);
  const col = fill ? '#ef4a63' : '#c9ced6';
  g.ellipse(3, 3, 2, 2, col); g.ellipse(6, 3, 2, 2, col);
  g.rect(1, 3, 7, 3, col);
  g.px(2, 6, col); g.px(3, 6, col); g.px(4, 6, col);
  g.px(5, 6, col); g.px(6, 6, col);
  if (fill) g.px(3, 2, '#ff96a8');
  return g.toCanvas();
}
