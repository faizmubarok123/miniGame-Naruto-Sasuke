// tiles.js — tekstur tile per tema (48x48 px), dibangun sekali saat init
import { TILE } from '../sim/level.js';
import { makeCanvas, PAL } from './spritekit.js';

function rand(seedStr) {
  let a = 0;
  for (let i = 0; i < seedStr.length; i++) a = (a * 31 + seedStr.charCodeAt(i)) | 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildTiles(theme) {
  const t = theme;
  const rnd = rand(t.id);
  const mk = (w, h, draw) => {
    const { c, ctx } = makeCanvas(w, h);
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
    return c;
  };
  const S = TILE;

  // ---- tanah: rumput di atas, tanah di bawah ----
  const grass = mk(S, S, (x) => {
    x.fillStyle = t.dirt; x.fillRect(0, 0, S, S);
    // speckle tanah
    x.fillStyle = t.dirtDot;
    for (let i = 0; i < 6; i++) {
      const px = 4 + rnd() * (S - 10), py = 20 + rnd() * (S - 26);
      x.fillRect(px | 0, py | 0, 4, 3);
    }
    x.fillStyle = t.dirtDark;
    x.fillRect(0, S - 3, S, 3); x.fillRect(S - 3, 0, 3, S);
    // band rumput
    x.fillStyle = t.grass; x.fillRect(0, 0, S, 16);
    x.fillStyle = t.grassLight; x.fillRect(0, 0, S, 5);
    // gerigi rumput
    x.fillStyle = t.grassDark;
    for (let i = 0; i < 6; i++) {
      const gx = 2 + i * 8 + (rnd() * 4 | 0);
      x.fillRect(gx, 14, 5, 3);
    }
    x.fillStyle = t.grassLight;
    for (let i = 0; i < 4; i++) x.fillRect(4 + i * 12 + (rnd() * 4 | 0), 8, 2, 5);
  });

  const dirt = mk(S, S, (x) => {
    x.fillStyle = t.dirt; x.fillRect(0, 0, S, S);
    x.fillStyle = t.dirtDot;
    for (let i = 0; i < 7; i++) x.fillRect(3 + rnd() * (S - 12) | 0, 3 + rnd() * (S - 12) | 0, 5, 4);
    x.fillStyle = t.dirtDark;
    x.fillRect(0, S - 3, S, 3); x.fillRect(S - 3, 0, 3, S); x.fillRect(0, 0, 3, S);
  });

  // ---- balok batu ----
  const stone = mk(S, S, (x) => {
    x.fillStyle = t.blockEdge; x.fillRect(0, 0, S, S);
    x.fillStyle = t.block; x.fillRect(2, 2, S - 5, S - 5);
    x.fillStyle = t.blockHi; x.fillRect(2, 2, S - 5, 6);
    x.fillStyle = t.blockEdge;
    x.fillRect(2, S - 9, S - 5, 3);
    x.fillStyle = t.blockHi;
    x.fillRect(8, 14, 10, 4);
  });

  // ---- platform kayu (one-way) ----
  const wood = mk(S, 20, (x) => {
    x.fillStyle = PAL.woodD; x.fillRect(0, 0, S, 20);
    x.fillStyle = PAL.wood; x.fillRect(0, 0, S, 14);
    x.fillStyle = '#c08a52';
    for (let i = 0; i < 3; i++) x.fillRect(1 + i * 16, 2, 13, 3);
    x.fillStyle = PAL.woodD;
    x.fillRect(0, 14, S, 2);
    x.fillRect(11, 0, 2, 12);
    x.fillRect(33, 0, 2, 12);
    x.fillStyle = t.grassLight; // lumut tipis di tepi
    x.fillRect(0, 0, 5, 2); x.fillRect(S - 6, 0, 5, 2);
  });

  // ---- platform bambu (one-way) ----
  const bamboo = mk(S, 20, (x) => {
    x.fillStyle = t.bambooDark; x.fillRect(0, 2, S, 16);
    x.fillStyle = t.bamboo; x.fillRect(0, 2, S, 12);
    x.fillStyle = '#b8e08a';
    x.fillRect(0, 3, S, 2);
    for (const seg of [12, 30]) {
      x.fillStyle = t.bambooDark; x.fillRect(seg, 2, 3, 14);
    }
    x.fillStyle = '#3f5b28';
    x.fillRect(0, 17, S, 2);
  });

  // ---- blok bonus ----
  const bonus = mk(S, S, (x) => {
    x.fillStyle = '#c58a2d'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#ffd75e'; x.fillRect(3, 3, S - 6, S - 6);
    x.fillStyle = '#ffe9a0'; x.fillRect(3, 3, S - 6, 5);
    x.fillStyle = '#e8a83c'; x.fillRect(3, S - 9, S - 6, 3);
    // tanda tanya
    x.fillStyle = '#a3601d';
    x.font = 'bold 26px monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('?', S / 2 + 1, S / 2 + 2);
    // kancing divid
    x.fillStyle = '#8a5721';
    x.fillRect(2, 2, 4, 4); x.fillRect(S - 6, 2, 4, 4);
    x.fillRect(2, S - 6, 4, 4); x.fillRect(S - 6, S - 6, 4, 4);
  });

  const bonusUsed = mk(S, S, (x) => {
    x.fillStyle = '#8a6a3a'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#a98a54'; x.fillRect(3, 3, S - 6, S - 6);
    x.fillStyle = '#8a6a3a';
    for (const [dx, dy] of [[10, 10], [S - 16, 10], [10, S - 16], [S - 16, S - 16]]) x.fillRect(dx, dy, 6, 6);
  });

  // ---- duri ----
  const spike = mk(S, S, (x) => {
    x.fillStyle = '#b6bec8';
    for (let i = 0; i < 3; i++) {
      const bx = i * 16;
      x.beginPath();
      x.moveTo(bx + 2, S); x.lineTo(bx + 8, 8); x.lineTo(bx + 14, S);
      x.closePath(); x.fill();
      x.fillStyle = '#8d97a2';
      x.beginPath(); x.moveTo(bx + 8, 8); x.lineTo(bx + 14, S); x.lineTo(bx + 8, S); x.closePath(); x.fill();
      x.fillStyle = '#c9524e';
      x.fillRect(bx + 6, 8, 4, 5); // ujung merah peringatan
    }
    x.fillStyle = '#77808a'; x.fillRect(0, S - 6, S, 6);
  });

  // ---- jembatan bambu (untuk di atas air), pagar aksesoris ----
  return { grass, dirt, stone, wood, bamboo, bonus, bonusUsed, spike };
}
