// physics.test.mjs — uji fisika & mekanika inti tanpa browser (headless)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LevelBuilder } from '../src/sim/level.js';
import { World } from '../src/sim/world.js';
import { TILE } from '../src/sim/level.js';

const NO_SIG = { left: false, right: false, jumpHeld: false, jumpEdge: false, specialEdge: false, pauseEdge: false };
const SIG = (o) => ({ ...NO_SIG, ...o });
const DT = 1 / 120;

function run(w, sigFn, seconds) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    const s = typeof sigFn === 'function' ? sigFn(w, i) : (sigFn ?? NO_SIG);
    w.step(s, DT);
    if (w.state === 'dead') break;
  }
}

function miniLevel(extra = () => {}) {
  const b = new LevelBuilder('uji', 'village', { w: 40, h: 24, music: 'village' });
  b.ground(0, 39, 20);
  b.spawn(4, 19);
  b.goal(37, 19);
  extra(b);
  return b.build();
}

test('jatuh ke tanah & berdiri stabil', () => {
  const L = miniLevel();
  const w = new World(L, 'naruto');
  run(w, NO_SIG, 2);
  const pl = w.player;
  assert.equal(pl.state, 'play');
  assert.ok(pl.onGround, 'harus berdiri');
  // bawah kaki pas di atas baris-20
  assert.ok(Math.abs((pl.y + pl.h) - 20 * TILE) < 1.5, `feet=${pl.y + pl.h}`);
  // tidak bisa menembus tanah
  assert.ok(pl.y + pl.h <= 20 * TILE + 0.1);
});

test('tahan lompat memberi tinggi lebih besar daripada sekejap', () => {
  const tryRun = (hold) => {
    const L = miniLevel();
    const w = new World(L, 'naruto');
    let minY = Infinity;
    run(w, (_, i) => {
      if (w.player) minY = Math.min(minY, w.player.y);
      return SIG({ jumpEdge: i === 0, jumpHeld: hold && i < 70 });
    }, 1.2);
    return minY;
  };
  const high = tryRun(true);
  const low = tryRun(false);
  assert.ok(high < low - 30, `lompat penuh harus lebih tinggi (${high} < ${low - 30})`);
});

test('dinding padat tidak bisa ditembus', () => {
  const L = miniLevel((b) => { b.block(20, 15, 1, 5); });
  const w = new World(L, 'naruto');
  run(w, () => SIG({ right: true }), 3);
  assert.ok(Math.abs(w.player.x + w.player.w - (20 * TILE)) < 2, `x=${w.player.x}`);
  assert.ok(w.player.x + w.player.w <= 20 * TILE + 0.5);
});

test('platform one-way: jatuh dari atas mendarat, naik dari bawah tidak menghalangi', () => {
  const L = miniLevel((b) => { b.plat(10, 17, 4); });
  // jatuh dari atas
  const w1 = new World(L, 'naruto');
  w1.player.x = 11 * TILE;
  w1.player.y = 14 * TILE;
  run(w1, NO_SIG, 1);
  assert.ok(Math.abs((w1.player.y + w1.player.h) - 17 * TILE) < 1.5, `harus mendarat di papan: ${w1.player.y + w1.player.h}`);
  // naik dari bawah: harus bisa menembus papan saat melompat dari bawah
  const w2 = new World(L, 'naruto');
  w2.player.x = 11 * TILE;
  w2.player.y = 20 * TILE - 42; // kaki sedikit di atas tanah → mendarat lalu lompat
  run(w2, (_, i) => SIG({ jumpEdge: i === 0, jumpHeld: i < 80 }), 1.0);
  // mnaikkan kepala melewati baris papan (tidak tertahan di 17*TILE saat naik)
  assert.ok(w2.player.yMin < 17 * TILE - TILE / 2, `kepala lewat papan: minY=${w2.player.yMin} (17*T=${17*TILE})`);
});

test('bonus block: ketuk dari bawah → koin tepat sekali & blok jadi dipakai', () => {
  const L = miniLevel((b) => { b.bonus(6, 16); });
  const w = new World(L, 'naruto');
  w.player.x = 6 * TILE + 10;
  w.player.y = 20 * TILE - 42; // kaki di tanah → mendarat lalu lompat mengetuk blok
  run(w, (_, i) => SIG({ jumpEdge: i === 0, jumpHeld: true }), 1.2);
  assert.equal(L.tiles[16 * L.w + 6], 'X', 'blok dipakai');
  assert.equal(w.coins, 1, `koin tepat sekali: ${w.coins}`);
  // ketuk lagi — tidak menambah
  const w2 = new World(L, 'naruto');
  w2.player.x = 6 * TILE + 10;
  w2.player.y = 20 * TILE - 42;
  run(w2, (_, i) => SIG({ jumpEdge: i === 0, jumpHeld: true }), 1.2);
  assert.equal(L.tiles[16 * L.w + 6], 'X', 'blok bekas tetap dipakai');
  assert.equal(w2.coins, 0, 'blok bekas tidak memberi koin lagi');
});

test('koin dikumpulkan tepat satu kali', () => {
  const L = miniLevel((b) => { b.coin(8, 19); });
  const w = new World(L, 'naruto');
  w.player.x = 8 * TILE + 8;
  run(w, NO_SIG, 2);
  assert.equal(w.coins, 1);
  assert.equal(w.score, 10);
});

test('menginjak musuh (stomp) membunuh musuh & memantulkan pemain', () => {
  const L = miniLevel((b) => { b.slime(10, 19, { speed: 40 }); });
  const w = new World(L, 'naruto');
  const slime0 = w.entities.find((e) => e.kind === 'slime');
  // jatuh tepat di atas slime
  w.player.x = slime0.x + 6;
  w.player.y = 14 * TILE;
  run(w, NO_SIG, 1.0);
  assert.ok(slime0.deadT > 0, 'slime mati');
  assert.ok(w.score >= 50);
  assert.ok(w.player.onGround === false || w.player.vy <= 0);
  assert.equal(w.hearts, 3, 'tidak kena damage');
});

test('kena musuh dari samping: hati berkurang, i-frame mencegah spam', () => {
  const L = miniLevel((b) => { b.slime(10, 19, { speed: 0 }); });
  const w = new World(L, 'naruto');
  run(w, NO_SIG, 1.5); // bakar i-frame spawn dulu (kebal sesaat saat muncul)
  run(w, () => SIG({ right: true }), 1.2);
  assert.equal(w.hearts, 2, `hati berkurang sekali lalu i-frame: ${w.hearts}`);
});

test('dash (jurus) berjalu dengan cooldown & musuh tersapu', () => {
  const L = miniLevel((b) => { b.slime(14, 19, { speed: 0 }); });
  const w = new World(L, 'naruto');
  w.player.facing = 1;
  const slime0 = w.entities.find((e) => e.kind === 'slime');
  w.player.x = 10 * TILE;
  run(w, (_, i) => SIG({ specialEdge: i === 0, right: true }), 0.8);
  assert.ok(slime0.deadT > 0, 'musuh terkena dash harus mati');
  assert.ok(w.player.dashCD > 0, 'cooldown aktif');
  // mencoba dash lagi saat cooldown tidak efektif
  const prevDash = w.player.dashT;
  run(w, (_, i) => SIG({ specialEdge: i === 0 }), 0.2);
  assert.ok(w.player.dashT <= prevDash + 1e-9, 'tidak boleh dash ulang saat cooldown');
  assert.ok(w.player.dashCD > 0 || w.player.dashT === 0, 'cooldown terisi');
});

test('checkpoint menyimpan & jatuh → respawn di checkpoint', () => {
  const L = miniLevel((b) => { b.checkpoint(18, 19); b.ground(0, 39, 20); });
  const w = new World(L, 'naruto');
  run(w, (_, ) => SIG({ right: true }), 3);
  const cp = w.entities.find((e) => e.kind === 'checkpoint');
  assert.ok(cp.active, 'checkpoint aktif');
  // jatuhkan pemain ke jurang: buat pemain jatuh via posisi
  w.player.x = 39.6 * TILE; // luar kanan? dunia menahan tembok — turun via bawah dunia
  w.player.y = (L.h + 1) * TILE;
  w.player.vy = 100;
  const before = w.deaths;
  run(w, NO_SIG, 1);
  assert.equal(w.deaths, before + 1, 'tercatat korban');
  assert.ok(w.hearts > 0, 'hati tetap ada (kembali penuh)');
  assert.ok(
    Math.abs(w.player.x - (18 * TILE + 9)) < 10,
    `respawn di checkpoint: x=${w.player.x}`
  );
});

test('kehilangan tiga hati → dunia mati (layar game over)', () => {
  const L = miniLevel();
  const w = new World(L, 'naruto');
  w.hearts = 1;
  w.player.y = (L.h + 2) * TILE;
  w.player.vy = 50;
  run(w, NO_SIG, 1);
  assert.equal(w.state, 'dead');
});

test('goal memberi kemenangan', () => {
  const L = miniLevel((b) => { b.goal(30, 19); });
  const w = new World(L, 'naruto');
  run(w, () => SIG({ right: true }), 5);
  assert.equal(w.player.state, 'win');
  assert.ok(w.score >= 300);
});

test('departemen jurus sasuke menghasilkan aliran kilat event', () => {
  const L = miniLevel();
  const w = new World(L, 'sasuke');
  w.player.facing = 1;
  run(w, (_, i) => SIG({ specialEdge: i === 0 }), 0.2);
  const evs = w.drainEvents();
  assert.ok(evs.some((e) => e.type === 'dash' && e.char === 'sasuke'));
});

test('mover horizontal membawa pemain', () => {
  const L = miniLevel((b) => {
    b.ground(0, 39, 20);
    b.moverPlate(10, 19, { w: 3, axis: 'x', range: 4, speed: 90 });
  });
  const w = new World(L, 'naruto');
  w.player.x = 11 * TILE;
  w.player.y = 17 * TILE;  // di atas mover
  run(w, NO_SIG, 1.2);
  assert.ok(w.player.x > 11 * TILE + 10, `harus terbawa: ${w.player.x}`);
});
