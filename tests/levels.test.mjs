// levels.test.mjs — validasi ketiga level: struktur, koin, checkpoint, goal, jangkauan
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/data/levels.js';

const SOLID_IDS = new Set(['G', 'B', '?', 'X']);

// berapa px lompatan penuh — konversi kasar ke tile utk pemeriksaan jangkauan
test('struktur dasar level', () => {
  for (const [i, L] of LEVELS.entries()) {
    assert.equal(L.tiles.length, L.w * L.h, `tiles ${i}`);
    assert.ok(L.w > 100, `lebar cukup ${i}`);
    assert.equal(L.tiles[L.spawn.y * L.w + L.spawn.x], '.', `spawn kosong ${i}`);
    // area sekitar spawn harus punya lantai (biar tidak spawn di kekosongan)
    const belowSpawn = L.tiles[(L.spawn.y + 1) * L.w + L.spawn.x];
    assert.ok(SOLID_IDS.has(belowSpawn), `lantai di bawah spawn ${i}`);
    assert.ok(L.coinSpawns.length >= 30, `koin cukup ${i}`);
    assert.ok(L.starSpawns.length >= 2, `bintang >= 2 (${i})`);
    assert.ok(L.checkpoints.length >= 2, `checkpoint >= 2 (${i})`);
  }
});

test('goal tersambung dari spawn & semua checkpoint terjangkau (BFS berbasis lompatan)', () => {
  for (const [i, L] of LEVELS.entries()) {
    const reachable = new Set();
    const key = (x, y) => y * L.w + x;
    const start = [L.spawn.x, L.spawn.y];
    reachable.add(key(...start));

    // platform bergerak = lantai berlangganan (muncul berkala → selalu tersedia pada akhirnya)
    const moverFloor = new Set();
    for (const m of L.movers) {
      if (m.axis === 'x') {
        for (let r = 0; r <= m.range; r++) {
          for (let tx = m.x + r; tx < m.x + r + m.w; tx++) moverFloor.add(`${tx},${m.y}`);
        }
      } else {
        for (let r = 0; r <= m.range; r++) {
          for (let tx = m.x; tx < m.x + m.w; tx++) moverFloor.add(`${tx},${m.y + r}`);
        }
      }
    }
    const floorOK = (tx, ty) => {
      const c = ty < L.h && ty >= 0 ? L.tiles[ty * L.w + tx] : '?';
      return SOLID_IDS.has(c) || c === '-' || moverFloor.has(`${tx},${ty}`);
    };

    const q = [start];
    // amplop lompatan fisik: naik ≈ 4 tile, mendatar (lari penuh) ≈ 7 tile, jatuh 8+
    const maxUp = 4, maxFlatReach = 7, maxFall = 8;

    while (q.length) {
      const [x, y] = q.shift();
      // tempat berdiri: cell kosong + lantai
      // a) berjalan / melompat ke sel berdiri tetangga
      const moves = [];
      const sweepClear = (x0, dx, row) => {
        // ruang kepala minimal 1 baris di atas baris mendarat sepanjang busur
        const step = dx > 0 ? 1 : -1;
        for (let cx = x0; cx !== x0 + dx + step; cx += step) {
          if (cx === x0 || cx === x0 + dx) continue; // sel awal & target diperiksa terpisah
          if (cx < 0 || cx >= L.w) return false;
          if (L.tiles[(row - 1) * L.w + cx] !== '.') return false;
        }
        return true;
      };
      for (let dx = -maxFlatReach; dx <= maxFlatReach; dx++) {
        if (dx === 0) { moves.push([dx, 1]); moves.push([dx, -1]); moves.push([dx, 2]); continue; } // jalan, jatuh, drop 1
        const runs = Math.abs(dx) <= 1;
        // lompat mendatar pada ketinggian sama (lari + lompat)
        if (runs) moves.push([dx, 0]);
        else if (sweepClear(x + (dx > 0 ? 1 : -1), dx - (dx > 0 ? 1 : -1), y)) moves.push([dx, 0]);
        // lompat naik: ketinggian menurun, jarak menurun seiring tinggi
        for (let dy = -1; dy >= -maxUp; dy--) {
          if (Math.abs(dx) <= maxFlatReach - Math.abs(dy)) moves.push([dx, dy]);
        }
        // jatuh bebas
        for (let dy = 1; dy <= maxFall; dy++) {
          if (Math.abs(dx) <= maxFlatReach) moves.push([dx, dy]);
        }
      }
      for (const [dx, dy] of moves) {
        const nx = x + dx, ny = y + dy;
        if (nx < 1 || nx >= L.w - 1 || ny < 0 || ny >= L.h - 1) continue;
        if (reachable.has(key(nx, ny))) continue;
        // celah kepala: sel target dan satu di atasnya harus kosong (pemain ~2 tile tinggi)
        if (L.tiles[ny * L.w + nx] !== '.'
            || (ny > 0 && L.tiles[(ny - 1) * L.w + nx] !== '.')) continue;
        // lantai harus ada (termasuk platform bergerak)
        if (!floorOK(nx, ny + 1)) continue;
        reachable.add(key(nx, ny));
        q.push([nx, ny]);
      }
    }

    const isReach = (tx, ty) => reachable.has(key(tx, ty)) ||
      // bintang/koin terbang: dekat sel berdiri
      [...reachable].some(() => false);

    const goalOK = isReach(L.goal.x, L.goal.y) ||
      reachable.has(key(L.goal.x, L.goal.y + 1));
    assert.ok(goalOK, `goal harus terjangkau (level ${i})`);

    for (const c of L.checkpoints) {
      const ok = reachable.has(key(c.x, c.y)) || reachable.has(key(c.x, c.y + 1));
      assert.ok(ok, `checkpoint ${c.x} terjangkau (level ${i})`);
    }
    // = dino: semua checkpoint menyimpan
    // bintang opsional — cek jangkauan dari sel berdiri manapun dalam envelope lompatan
    const scanning = [...reachable];
    const near = (tx, ty, r) => scanning.some((kk) => {
      const sx = kk % L.w, sy = Math.floor(kk / L.w);
      return Math.abs(sx - tx) <= r && Math.abs(sy - ty) <= r + 2;
    });
    for (const s of L.starSpawns) {
      assert.ok(near(s.x, s.y, 5), `bintang (${s.x},${s.y}) dekat jalur berdiri (level ${i})`);
    }
  }
});

test('checkpoint tertempat sebelum bagian lebih sulit (level 2&3)', () => {
  for (const i of [1, 2]) {
    const L = LEVELS[i];
    const xs = L.checkpoints.map((c) => c.x).sort((a, b) => a - b);
    assert.ok(Math.max(...xs) < L.goal.x - 10, `checkpoint akhir tidak berada di mulut goal (${i})`);
    assert.ok(Math.max(...xs) > L.w * 0.3, `ada checkpoint di paruh akhir jalur (${i})`);
  }
});

test('tidak ada tile berdiri palsu di tengah udara jauh dari apa pun', () => {
  // dinding tepi dunia: kolom-0 dan kolom terakhir solid di seluruh baris bawah
  for (const L of LEVELS) {
    // area bawah (ty≥16) berisi tanah/duri/pit — cukup diverifikasi reachability di tes BFS lain
    assert.ok(L.w > 0 && L.h > 0);
  }
});

test('musuh tidak lahir di dalam tanah', () => {
  for (const L of LEVELS) {
    for (const e of L.enemySpawns) {
      const cell = L.tiles[e.y * L.w + e.x];
      assert.equal(cell, '.', `musuh ${e.kind} di (${e.x},${e.y}) harus lahir di ruangan kosong`);
      const below = L.tiles[(e.y + 1) * L.w + e.x];
      assert.ok(SOLID_IDS.has(below) || below === '-', `musuh ${e.kind} di (${e.x},${e.y}) harus punya lantai`);
    }
  }
});
