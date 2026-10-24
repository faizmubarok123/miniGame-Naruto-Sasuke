// level.js — LevelBuilder DSL + struktur level & query tile (module murni, tanpa DOM)
import { CFG } from '../core/config.js';

export const TILE = CFG.TILE;
export const CHAR_IDS = ['naruto', 'sasuke'];

// id tile
export const SOLID = 'G';      // tanah/batu padat
export const BLOCK = 'B';      // balok padat
export const BONUS = '?';      // blok bonus (ketuk dari bawah)
export const BONUS_USED = 'X'; // blok bonus yang sudah dipakai (tetap solid)
export const ONEWAY = '-';     // platform kayu/bambu (bisa dilompati dari bawah)
export const SPIKE = 'x';      // duri
export const EMPTY = '.';
const SOLID_IDS = new Set([SOLID, BLOCK, BONUS, BONUS_USED]);
const HAZARD_IDS = new Set([SPIKE]);

export function isSolid(id) { return SOLID_IDS.has(id); }
export function isHazard(id) { return HAZARD_IDS.has(id); }

export class Level {
  constructor(meta) {
    // meta: {name, theme, music, spawn:{x,y}, goal, checkpoints[], tiles, w, h, signs[], decor[], enemies[], coins[], stars[], movers[]}
    this.name = meta.name;
    this.theme = meta.theme;
    this.music = meta.music || 'village';
    this.w = meta.w;
    this.h = meta.h;
    this.tiles = meta.tiles;             // row-major char grid
    this.spawn = meta.spawn;
    this.goal = meta.goal;
    this.signs = meta.signs;             // {tileX, tileY, key}
    this.decor = meta.decor;             // dekorasi visual, tidak solid
    this.enemySpawns = meta.enemySpawns; // {kind, tileX, tileY, ...}
    this.movers = meta.movers;           // platform bergerak
    this.coinSpawns = meta.coinSpawns;   // {tileX, tileY}
    this.starSpawns = meta.starSpawns;
    this.checkpoints = meta.checkpoints; // {tileX, tileY}
    this.waterRow = meta.waterRow ?? null;
    this.themeCfg = THEMES[meta.theme];
    this.pw = this.w * TILE;             // lebar dunia px
    this.ph = this.h * TILE;
  }

  tileAt(tx, ty) {
    if (tx < 0 || tx >= this.w) return BLOCK;   // tembok kiri/kanan dunia
    if (ty < 0) return EMPTY;
    if (ty >= this.h) return EMPTY;             // jatuh di bawah = void (diurus sim)
    const i = ty * this.w + tx;
    return this.tiles[i];
  }

  solidAt(tx, ty) { return isSolid(this.tileAt(tx, ty)); }
  hazardAt(tx, ty) { return isHazard(this.tileAt(tx, ty)); }

  // iterasi kolom padat rentang (untuk dekor otomatis)
  rowScan(row) { return [].slice.call(this.tiles, row * this.w, row * this.w + this.w); }
}

export const THEMES = {
  village: {
    id: 'village',
    skyTop: '#8ed7ff', skyMid: '#bfeaff', skyLow: '#eafbe8',
    sun: '#fff3b0',
    hillFar: '#a8d8a0', hillMid: '#7cc47f',
    cloud: '#ffffff',
    grass: '#58c15e', grassLight: '#8ee08a', grassDark: '#3fa24c',
    dirt: '#a86f45', dirtDark: '#8a5a38', dirtDot: '#c08a5c',
    block: '#c9b28c', blockHi: '#e8d5b0', blockEdge: '#9a7f58',
    water: '#4aa8dd', waterDeep: '#2e7fbe',
    accent: '#e8663c',
    bamboo: '#7fbf57', bambooDark: '#5e9e3f'
  },
  bamboo: {
    id: 'bamboo',
    skyTop: '#7ec9f0', skyMid: '#a9e2f2', skyLow: '#dcf5d8',
    sun: '#fff5c2',
    hillFar: '#8fbf7f', hillMid: '#66a862',
    cloud: '#ffffff',
    grass: '#57b45a', grassLight: '#83d47e', grassDark: '#3f9448',
    dirt: '#7a8a4e', dirtDark: '#5f7038', dirtDot: '#95a661',
    block: '#9ec06d', blockHi: '#c6e09a', blockEdge: '#79954c',
    water: '#57b3de', waterDeep: '#3c8cb8',
    accent: '#3b7a4e',
    bamboo: '#8ac463', bambooDark: '#5f9b3d'
  },
  storm: {
    id: 'storm',
    skyTop: '#6fb7e8', skyMid: '#a3d6ee', skyLow: '#e7f5e4',
    sun: '#ffe7a0',
    hillFar: '#93c79b', hillMid: '#6daf7d',
    cloud: '#ffffff',
    grass: '#5cb566', grassLight: '#86d884', grassDark: '#419a50',
    dirt: '#8d7562', dirtDark: '#6f5a4a', dirtDot: '#a98f79',
    block: '#a8b4bd', blockHi: '#cdd8de', blockEdge: '#7d8b95',
    water: '#46a3d8', waterDeep: '#2b7aa8',
    accent: '#7d64d8',
    bamboo: '#79b85a', bambooDark: '#568a3c'
  }
};

// ---------- Builder ----------
export class LevelBuilder {
  constructor(name, theme, { w, h, music }) {
    this.w = w; this.h = h;
    this.name = name;
    this.theme = theme;
    this.music = music;
    this.tiles = new Array(w * h).fill(EMPTY);
    this.spawnPoint = null;
    this.goalPoint = null;
    this.waterRow = null;
    this.signs = []; this.decor = []; this.enemySpawns = [];
    this.movers = []; this.coinSpawns = []; this.starSpawns = []; this.checkpoints = [];
  }

  set(x, y, id) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    this.tiles[y * this.w + x] = id;
  }

  // tanah dari topRow sampai dasar
  ground(x0, x1, topRow) {
    for (let x = x0; x <= x1; x++) for (let y = topRow; y < this.h; y++) this.set(x, y, SOLID);
    return this;
  }

  block(x, y, w = 1, hgt = 1) {
    for (let i = 0; i < w; i++) for (let j = 0; j < hgt; j++) this.set(x + i, y + j, BLOCK);
    return this;
  }

  pillars(steps) {
    // steps: [{x, top}] — menara blok menaik
    for (const s of steps) {
      const hgt = (this.baseRow ?? this.h) - s.top;
      this.block(s.x, s.top, 1, Math.max(1, Math.min(hgt, this.h - s.top)));
    }
    return this;
  }

  plat(x, y, w = 3) {
    for (let i = 0; i < w; i++) this.set(x + i, y, ONEWAY);
    return this;
  }

  bonus(x, y) { this.set(x, y, BONUS); return this; }

  spikes(x, y, w = 1) {
    for (let i = 0; i < w; i++) this.set(x + i, y, SPIKE);
    return this;
  }

  coin(x, y) { this.coinSpawns.push({ x, y }); return this; }
  coinRow(x, y, n, stepX = 2) { for (let i = 0; i < n; i++) this.coin(x + stepX * i, y); return this; }
  coinArc(cx, cy, n = 5, spreadX = 2, dropY = 1) {
    // busur seperti CAPA: setengah lingkaran menghadap atas
    let idx = 0;
    for (let i = -(n >> 1); i <= n >> 1; i++, idx++) {
      const y = cy - Math.max(0, dropY * (1 - (Math.abs(i) / ((n >> 1) + 1))));
      this.coin(cx + i * spreadX, Math.round(y));
    }
    return this;
  }

  star(x, y) { this.starSpawns.push({ x, y }); return this; }

  slime(x, y, opts = {}) { this.enemySpawns.push({ kind: 'slime', x, y, ...opts }); return this; }
  walker(x, y, opts = {}) { this.enemySpawns.push({ kind: 'walker', x, y, ...opts }); return this; }
  roller(x, y, opts = {}) { this.enemySpawns.push({ kind: 'roller', x, y, min: opts.min ?? x, max: opts.max ?? x }); return this; }

  moverPlate(x, y, opts = {}) { this.movers.push({ x, y, w: opts.w ?? 3, axis: opts.axis ?? 'x', range: opts.range ?? 3, speed: opts.speed ?? 60 }); return this; }

  checkpoint(x, y) { this.checkpoints.push({ x, y }); return this; }
  goal(x, y) { this.goalPoint = { x, y }; return this; }
  spawn(x, y) { this.spawnPoint = { x, y }; return this; }

  sign(x, y, key) { this.signs.push({ x, y, key }); return this; }

  npc(x, y, text) { this.decor.push({ kind: 'npc', x, y, text }); return this; }
  deco(kind, x, y, opts = {}) { this.decor.push({ kind, x, y, ...opts }); return this; }

  build() {
    if (!this.spawnPoint) throw new Error('Level butuh spawn!');
    if (!this.goalPoint) throw new Error('Level butuh goal!');
    return new Level({
      name: this.name, theme: this.theme, music: this.music,
      w: this.w, h: this.h, tiles: this.tiles,
      spawn: this.spawnPoint, goal: this.goalPoint,
      signs: this.signs, decor: this.decor, enemySpawns: this.enemySpawns,
      movers: this.movers, coinSpawns: this.coinSpawns, starSpawns: this.starSpawns,
      checkpoints: this.checkpoints, waterRow: this.waterRow
    });
  }

  water(row) { this.waterRow = row; return this; }

  get baseRow() { return this.h; }
}
