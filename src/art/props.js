// props.js — properti dunia: checkpoint, goal, papan tanda, rumah, pohon, bambu, dll
import { makeCanvas, PAL } from './spritekit.js';

function mk(w, h, draw) {
  const { c, ctx } = makeCanvas(w, h);
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  return c;
}

// ---- torii checkpoint (aktif = merah terang) ----
export function checkpointSprite(active, glowT = 0) {
  return mk(48, 96, (x) => {
    const red = active ? '#e04b3f' : '#b6a99c';
    const dark = active ? '#a8342c' : '#8d8177';
    // kaki
    x.fillStyle = dark;
    x.fillRect(8, 34, 8, 62); x.fillRect(32, 34, 8, 62);
    // palang atas (katana?? torii beams)
    x.fillStyle = red;
    x.fillRect(2, 26, 44, 8);
    x.fillRect(6, 38, 36, 6);
    // lampu status di atas
    // flash saat aktif (t ambil)
    if (active) {
      x.globalAlpha = 0.35 + 0.3 * Math.sin(glowT * 6);
      x.fillStyle = '#ffd44d';
      x.fillRect(18, 12, 12, 12);
      x.globalAlpha = 1;
      x.fillStyle = '#ffd44d';
      x.beginPath(); x.arc(24, 18, 6, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff2ae';
      x.beginPath(); x.arc(24, 18, 3, 0, Math.PI * 2); x.fill();
    } else {
      x.fillStyle = '#cfc5b8';
      x.beginPath(); x.arc(24, 16, 5, 0, Math.PI * 2); x.fill();
    }
  });
}

// ---- goal: gardu merah dengan banner "SELESAI" ----
export function goalSprite(wave = 0) {
  return mk(72, 120, (x) => {
    x.fillStyle = '#8a5a34';
    x.fillRect(10, 16, 7, 104); x.fillRect(55, 16, 7, 104);
    x.fillStyle = '#ff5a4e';
    x.fillRect(4, 4, 64, 12);
    x.fillStyle = '#ffd23e';
    x.fillRect(8, 5, 56, 9);
    x.fillStyle = '#a33f36';
    x.font = 'bold 11px sans-serif'; x.textAlign = 'center';
    x.fillText('S E L E S A I', 36, 13);
    // banner bergelar gondola
    x.fillStyle = '#ffd23e';
    const sway = Math.sin(wave * 2) * 3;
    x.beginPath();
    x.moveTo(20, 16); x.quadraticCurveTo(36 + sway, 30, 20 + sway, 48);
    x.quadraticCurveTo(12 + sway * 0.5, 30, 20, 16);
    x.fill();
    x.fillStyle = '#fff2ae';
    x.beginPath(); x.arc(23 + sway * 0.4, 24, 3, 0, Math.PI * 2); x.fill();
  });
}

// ---- papan tanda tutorial ----
export function signSprite(icon = '?') {
  return mk(40, 46, (x) => {
    x.fillStyle = '#8a5a34'; x.fillRect(17, 20, 6, 26);
    x.fillStyle = PAL.wood; x.fillRect(2, 2, 36, 26);
    x.fillStyle = PAL.woodD; x.fillRect(2, 2, 36, 4);
    x.fillStyle = '#5d3a1c';
    x.font = 'bold 15px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(icon, 20, 16);
  });
}

// ---- rumah desa kecil ----
export function houseSprite() {
  return mk(112, 96, (x) => {
    // atap
    x.fillStyle = '#4a6a8c';
    x.beginPath(); x.moveTo(4, 34); x.lineTo(56, 2); x.lineTo(108, 34);
    x.lineTo(100, 40); x.lineTo(56, 16); x.lineTo(12, 40); x.closePath(); x.fill();
    x.fillStyle = '#395672';
    x.fillRect(12, 38, 88, 4);
    // dinding
    x.fillStyle = '#e8dcc4'; x.fillRect(14, 42, 84, 50);
    x.fillStyle = '#cfc2a6'; x.fillRect(14, 42, 84, 6);
    // pintu & jendela
    x.fillStyle = '#7a4a28'; x.fillRect(46, 56, 20, 36);
    x.fillStyle = '#9a6c42'; x.fillRect(48, 58, 16, 34);
    x.fillStyle = '#7fc8e8'; x.fillRect(22, 54, 14, 14); x.fillRect(76, 54, 14, 14);
    x.fillStyle = '#4a6a8c'; x.fillRect(28, 60, 2, 8); x.fillRect(82, 60, 2, 8);
    // gapura lambang
    x.fillStyle = '#e04b3f';
    x.beginPath(); x.arc(28, 78, 5, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffe08a'; x.fillRect(25, 76, 6, 4);
    // palang papan nama
    x.fillStyle = '#8a5a34'; x.fillRect(2, 88, 108, 8);
  });
}

// ---- rumah miring dekoratif tambahan ----
export function toriiDecor() {
  return mk(96, 110, (x) => {
    const red = '#d95040';
    x.fillStyle = '#a33f36';
    x.fillRect(10, 30, 10, 80); x.fillRect(76, 30, 10, 80);
    x.fillStyle = red;
    x.fillRect(4, 18, 88, 12);
    x.fillRect(10, 38, 76, 8);
    x.fillStyle = '#7a2e26';
    x.fillRect(4, 28, 88, 3);
  });
}

// ---- pohon rindang ----
export function treeSprite() {
  return mk(96, 128, (x) => {
    x.fillStyle = '#7a4a28';
    x.fillRect(42, 76, 12, 52);
    x.fillStyle = '#5d3a1c';
    x.fillRect(42, 76, 4, 52);
    const leaf = '#3f9a48', leafL = '#57bd5c', leafD = '#2f7c38';
    for (const [cx, cy, r] of [[48, 56, 34], [30, 70, 24], [66, 70, 24], [48, 76, 26]]) {
      x.fillStyle = leafD;
      x.beginPath(); x.arc(cx + 3, cy + 3, r, 0, Math.PI * 2); x.fill();
      x.fillStyle = leaf;
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = leafL;
    x.beginPath(); x.arc(40, 48, 14, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(60, 52, 10, 0, Math.PI * 2); x.fill();
  });
}

// ---- batang bambu ----
export function bambooSprite(h = 128) {
  return mk(28, Math.max(64, h), (x) => {
    const H = Math.max(64, h);
    x.fillStyle = '#8ac463';
    x.fillRect(10, 0, 8, H);
    x.fillStyle = '#5f9b3d';
    x.fillRect(15, 0, 3, H);
    x.fillStyle = '#b8e08a';
    x.fillRect(11, 0, 2, H);
    // segmen
    x.fillStyle = '#5f9b3d';
    for (let y = 10; y < H; y += 18) x.fillRect(9, y, 10, 3);
    // daun atas
    x.fillStyle = '#6fae4c';
    for (const [dx, dy, w2, h2] of [[-10, 6, 14, 5], [16, 10, 14, 5], [-8, 18, 12, 4], [18, 26, 12, 4]]) {
      x.beginPath(); x.ellipse(14 + dx, dy + 8, w2, h2, -0.4, 0, Math.PI * 2); x.fill();
    }
  });
}

export function bushSprite() {
  return mk(56, 36, (x) => {
    x.fillStyle = '#2f7c38';
    x.beginPath(); x.arc(18, 24, 14, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(38, 24, 16, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#3f9a48';
    x.beginPath(); x.arc(14, 20, 10, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(34, 18, 13, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#57bd5c';
    x.beginPath(); x.arc(30, 12, 8, 0, Math.PI * 2); x.fill();
  });
}

export function flowerSprite(color = '#ff7fa5') {
  return mk(14, 18, (x) => {
    x.fillStyle = '#3f9a48'; x.fillRect(6, 8, 2, 10);
    x.fillStyle = color;
    for (const [dx, dy] of [[0, -4], [-4, 0], [4, 0], [0, 4]]) {
      x.beginPath(); x.arc(7 + dx, 6 + dy, 3, 0, Math.PI * 2); x.fill();
    }
    x.fillStyle = '#ffe37a';
    x.beginPath(); x.arc(7, 6, 2, 0, Math.PI * 2); x.fill();
  });
}

export function rockSprite() {
  return mk(36, 26, (x) => {
    x.fillStyle = '#8f8b84';
    x.beginPath(); x.moveTo(3, 24); x.lineTo(8, 8); x.lineTo(20, 3); x.lineTo(32, 10); x.lineTo(33, 24); x.closePath(); x.fill();
    x.fillStyle = '#b3ae9f';
    x.beginPath(); x.moveTo(8, 8); x.lineTo(20, 3); x.lineTo(26, 8); x.lineTo(12, 14); x.closePath(); x.fill();
  });
}

export function mushroomSprite() {
  return mk(26, 26, (x) => {
    x.fillStyle = '#f2e6d0'; x.fillRect(9, 14, 8, 10);
    x.fillStyle = '#e0574f';
    x.beginPath(); x.arc(13, 14, 11, Math.PI, 0); x.fill();
    x.fillStyle = '#fff';
    x.beginPath(); x.arc(9, 9, 2.5, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(17, 8, 2, 0, Math.PI * 2); x.fill();
  });
}

export function lanternSprite() {
  return mk(30, 60, (x) => {
    x.fillStyle = '#3a3f52'; x.fillRect(13, 28, 4, 32);
    x.fillStyle = '#e0524d';
    x.beginPath(); x.ellipse(15, 16, 10, 12, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffd23e';
    x.beginPath(); x.ellipse(15, 16, 7, 9, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#3a3f52';
    x.fillRect(11, 2, 8, 4); x.fillRect(11, 26, 8, 4);
    x.globalAlpha = 0.45;
    x.fillStyle = '#ffe37a';
    x.beginPath(); x.arc(15, 16, 14, 0, Math.PI * 2); x.fill();
  });
}

export function wellSprite() {
  return mk(60, 52, (x) => {
    x.fillStyle = '#9a9288'; x.beginPath(); x.ellipse(30, 40, 22, 8, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#6e8c9a'; x.beginPath(); x.ellipse(30, 37, 17, 6, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#9a9288'; x.fillRect(8, 40, 8, 12); x.fillRect(44, 40, 8, 12);
    x.fillStyle = '#8a5a34'; x.fillRect(8, 12, 5, 30); x.fillRect(47, 12, 5, 30);
    x.fillStyle = '#4a6a8c';
    x.beginPath(); x.moveTo(2, 14); x.lineTo(30, 2); x.lineTo(58, 14); x.lineTo(52, 18); x.lineTo(30, 9); x.lineTo(8, 18); x.closePath(); x.fill();
  });
}
