// world.js — simulasi dunia murni (tanpa DOM): pemain, tilemap, musuh, koin, mover.
// Semua waktu dalam detik; langkah tetap 1/120 dipanggil dari game loop.
import { CFG } from '../core/config.js';
import { TILE, BONUS, BONUS_USED, EMPTY, ONEWAY, SPIKE } from './level.js';

const P = CFG.PCFG;
export const ST_PLAY = 'play';
export const ST_HURT = 'hurt';
export const ST_DEAD = 'dead';
export const ST_WIN = 'win';

const SOLID_IDS = new Set(['G', 'B', '?', 'X']);
function cellId(L, tx, ty) {
  if (tx < 0 || tx >= L.w) return 'B';
  if (ty < 0 || ty >= L.h) return EMPTY;
  return L.tiles[ty * L.w + tx];
}
function isSolid(id) { return SOLID_IDS.has(id); }
function cellSolid(L, tx, ty) { return isSolid(cellId(L, tx, ty)); }
function rectHit(a, b, pad = 0) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}
function moveToward(v, target, d) { return v < target ? Math.min(v + d, target) : Math.max(v - d, target); }
function triangleWave(p) { const x = p % 1; return x < 0.5 ? x * 2 : 2 - x * 2; }

export class World {
  constructor(level, charId) {
    this.level = level;
    this.entities = [];
    this.events = [];
    this.time = 0;
    this.score = 0;
    this.coins = 0;
    this.starCoins = 0;
    this.deaths = 0;
    this.hearts = CFG.HEARTS;
    this.state = ST_PLAY;           // dunia: play | dead (keluar level)
    this.totalCoins = level.coinSpawns.length;
    this.totalStars = level.starSpawns.length;
    this.activeCheckpoint = null;
    this._needCleanup = false;
    this._build();
    this.player.charId = charId;
    this.respawn(true);
  }

  _build() {
    const L = this.level;
    for (const c of L.coinSpawns) this.entities.push({ kind: 'coin', tx: c.x, ty: c.y, x: c.x * TILE + TILE / 2, y: c.y * TILE + TILE / 2, taken: false });
    for (const s of L.starSpawns) this.entities.push({ kind: 'star', tx: s.x, ty: s.y, x: s.x * TILE + TILE / 2, y: s.y * TILE + TILE / 2, taken: false });
    L.checkpoints.forEach((c, i) => this.entities.push({ kind: 'checkpoint', idx: i, tx: c.x, ty: c.y, active: false }));
    for (const s of L.signs) this.entities.push({ kind: 'sign', tx: s.x, ty: s.y, key: s.key, near: 0 });
    for (const d of L.decor) if (d.kind === 'npc') this.entities.push({ kind: 'npc', tx: d.x, ty: d.y, text: d.text, t: Math.random() * 6 });
    for (const m of L.movers) {
      this.entities.push({
        kind: 'mover', axis: m.axis, wpx: m.w * TILE, hpx: 20,
        ox: m.x * TILE, oy: m.y * TILE, rangePx: m.range * TILE, speed: m.speed,
        x: m.x * TILE, y: m.y * TILE, prevX: m.x * TILE, prevY: m.y * TILE, phase: m.phase ?? 0
      });
    }
    for (const e of L.enemySpawns) {
      if (e.kind === 'slime') this.entities.push({
        kind: 'slime', w: 38, h: 30, dir: e.dir ?? 1, vx: 0, vy: 0, onGround: false,
        x: e.x * TILE, y: (e.y + 1) * TILE - 30, speed: e.speed ?? 62, hopT: 0.5, deadT: 0, squish: -1, stompable: true
      });
      else if (e.kind === 'walker') this.entities.push({
        kind: 'walker', w: 36, h: 32, dir: e.dir ?? -1, vx: 0, vy: 0, onGround: false,
        x: e.x * TILE, y: (e.y + 1) * TILE - 32, speed: e.speed ?? 52, deadT: 0, squish: -1, stompable: true
      });
      else if (e.kind === 'roller') this.entities.push({
        kind: 'roller', w: 40, h: 40, dir: e.dir ?? 1, spin: 1.2,
        x: e.x * TILE, y: (e.y + 1) * TILE - 40,
        min: e.min * TILE, max: (e.max + 1) * TILE, speed: e.speed ?? 130, deadT: 0, stompable: false
      });
    }
    this.goal = { tx: L.goal.x, ty: L.goal.y, t: 0 };
    this.player = {
      x: 0, y: 0, w: P.W, h: P.H, vx: 0, vy: 0,
      onGround: false, facing: 1, anim: 'fall', animT: 0,
      coyote: 0, jumpBuf: 0, holdingJump: false,
      iframes: 0, dashT: 0, dashCD: 0, dashDir: 1, dashIF: 0,
      squash: 0, stretch: 0, state: ST_PLAY, hurtT: 0, winT: 0,
      charId: 'naruto', standOnMover: null, prevBottom: 0, prevTop: 0,
      yMin: 0
    };
  }

  step(sig, dt) {
    this.time += dt;
    const pl = this.player;
    for (const e of this.entities) {
      if (e.kind === 'mover') { stepMover(e, dt); continue; }
      if (e.kind === 'npc') { e.t += dt; continue; }
      if (e.deadT > 0) { e.deadT += dt; continue; }
      if (e.kind === 'slime' || e.kind === 'walker') stepEnemy(this, e, dt);
      else if (e.kind === 'roller') stepRoller(e, dt);
    }

    if (this.state === ST_DEAD) return;
    if (pl.state === ST_HURT) {
      pl.hurtT -= dt;
      if (pl.hurtT <= 0) this.respawn(false);
      return;
    }

    if (pl.state === ST_PLAY) {
      this._stepPlayer(sig, dt);
      this._collideEnemies();
      this._collidePickups();
      this._collideCheckpoint();
      this._collideGoal();
      this._spikeCheck();
      if (pl.y > this.level.ph + 60) this._hurt('fall');
    }

    if (this._needCleanup) {
      this.entities = this.entities.filter((e) => e.kind === 'coin' || e.kind === 'star' || e.kind === 'mover' || e.kind === 'sign' || e.kind === 'checkpoint' || e.kind === 'npc' || !(e.deadT !== undefined && e.deadT > 1.2));
      this._needCleanup = false;
    }
  }

  emit(type, x, y, extra = {}) {
    this.events.push(Object.assign({ type, x, y }, extra));
    if (this.events.length > 160) this.events.splice(0, this.events.length - 160);
  }
  drainEvents() { const e = this.events; this.events = []; return e; }

  // ---------- pemain ----------
  _stepPlayer(sig, dt) {
    const pl = this.player;
    pl.prevBottom = pl.y + pl.h;
    pl.prevTop = pl.y;

    pl.dashCD = Math.max(0, pl.dashCD - dt);
    pl.dashIF = Math.max(0, pl.dashIF - dt);
    pl.iframes = Math.max(0, pl.iframes - dt);
    pl.squash = Math.max(0, pl.squash - dt);
    pl.stretch = Math.max(0, pl.stretch - dt);

    if (sig.jumpEdge) pl.jumpBuf = P.BUFFER;
    else pl.jumpBuf = Math.max(0, pl.jumpBuf - dt);
    pl.holdingJump = sig.jumpHeld;

    // jurus khusus (dash)
    if (sig.specialEdge && pl.dashCD <= 0 && pl.dashT <= 0) {
      const ch = CFG.CHARACTERS[pl.charId];
      pl.dashT = ch.dashTime;
      pl.dashCD = P.DASH_COOLDOWN;
      pl.dashDir = sig.left ? -1 : sig.right ? 1 : pl.facing;
      pl.dashIF = P.DASH_IFRAMES + ch.dashTime;
      pl.iframes = Math.max(pl.iframes, P.DASH_IFRAMES);
      pl.facing = pl.dashDir;
      this.emit('dash', pl.x + pl.w / 2, pl.y + pl.h / 2, { dir: pl.dashDir, char: pl.charId });
    }

    // horizontal
    if (pl.dashT > 0) {
      pl.dashT = Math.max(0, pl.dashT - dt);
      pl.vx = pl.dashDir * CFG.CHARACTERS[pl.charId].dashSpeed;
      pl.vy = 0;
      if (pl.dashT === 0) pl.vx *= 0.6;
    } else {
      const runMul = CFG.CHARACTERS[pl.charId].runMul;
      const acc = (pl.onGround ? P.ACC_G : P.ACC_A) * dt;
      const fr = (pl.onGround ? P.FRICTION_G : P.FRICTION_A) * dt;
      let target = 0;
      if (sig.left && !sig.right) target = -P.RUN * runMul;
      else if (sig.right && !sig.left) target = P.RUN * runMul;
      if (target !== 0) { pl.vx = moveToward(pl.vx, target, acc); pl.facing = target > 0 ? 1 : -1; }
      else pl.vx = moveToward(pl.vx, 0, fr);
    }

    // gravitasi: rendah saat menahan lompat & naik; cepat saat jatuh
    const rising = pl.vy < 0;
    const g = (pl.onGround || pl.dashT > 0) ? P.GRAVITY : (rising ? (pl.holdingJump ? P.GRAVITY_HOLD : P.GRAVITY) : P.GRAVITY_FALL);

    // lompatan (dengan coyote & buffer)
    if (pl.onGround) pl.coyote = P.COYOTE;
    else pl.coyote = Math.max(0, pl.coyote - dt);
    if (pl.jumpBuf > 0 && (pl.onGround || pl.coyote > 0) && pl.dashT <= 0) {
      pl.jumpBuf = 0; pl.coyote = 0;
      pl.vy = P.JUMP_V;
      pl.onGround = false;
      pl.standOnMover = null;
      pl.stretch = 0.16;
      this.emit('jump', pl.x + pl.w / 2, pl.y + pl.h);
    }
    // potongan lompatan: lepaskan tombol di awali naik → lompatan pendek
    if (!pl.holdingJump && pl.vy < -240 && pl._cutAllowed !== false) {
      pl.vy = P.JUMP_V * P.JUMP_CUT_MULT;
      pl._cutAllowed = false;
    }
    if (pl.onGround) pl._cutAllowed = true;

    // integrasi + tabrakan
    pl.vy = Math.min(pl.vy + g * dt, P.MAX_FALL); // tangkap jatuh
    this._moveAndCollide(dt);
    this._updateAnim(dt);
    pl.yMin = Math.min(pl.yMin, pl.y);
  }

  _moveAndCollide(dt) {
    const pl = this.player, L = this.level;
    pl.x += pl.vx * dt;
    this._collideX(pl);
    pl.y += pl.vy * dt;
    const wasGround = pl.onGround;
    const landed = this._collideY(pl);

    if (pl.standOnMover) {
      const m = pl.standOnMover;
      pl.x += m.x - m.prevX;
      if (Math.abs((pl.y + pl.h) - m.y) < 14) pl.y = m.y - pl.h;
      if (pl.x + pl.w < m.x - 4 || pl.x > m.x + m.wpx + 4) pl.standOnMover = null;
    }

    if (landed && !wasGround && pl.vy > 0.01) { /* tidak dipakai */ }
    if (landed && !wasGround) {
      pl.squash = 0.16;
      this.emit('land', pl.x + pl.w / 2, pl.y + pl.h, { vy: 1 });
    }
    if (pl.x < 0) { pl.x = 0; pl.vx = 0; }
    if (pl.x + pl.w > L.pw) { pl.x = L.pw - pl.w; pl.vx = 0; }
  }

  _collideX(pl) {
    const L = this.level;
    const t0 = Math.max(0, Math.floor(pl.y / TILE)), t1 = Math.floor((pl.y + pl.h - 0.01) / TILE);
    if (pl.vx > 0) {
      const tx = Math.floor((pl.x + pl.w) / TILE);
      for (let ty = t0; ty <= t1; ty++) {
        if (cellSolid(L, tx, ty)) { pl.x = tx * TILE - pl.w - 0.01; if (pl.dashT > 0) { pl.dashT = 0; pl.vx = -60; } else pl.vx = 0; break; }
      }
    } else if (pl.vx < 0) {
      const tx = Math.floor(pl.x / TILE);
      for (let ty = t0; ty <= t1; ty++) {
        if (cellSolid(L, tx, ty)) { pl.x = (tx + 1) * TILE + 0.01; if (pl.dashT > 0) { pl.dashT = 0; pl.vx = 60; } else pl.vx = 0; break; }
      }
    }
  }

  _collideY(pl) {
    const L = this.level;
    let landed = false;
    pl.onGround = false;
    if (pl.standOnMover && pl.vy > 0) pl.standOnMover = null;
    if (pl.vy > 0) {
      const ty = Math.floor((pl.y + pl.h) / TILE);
      const tx0 = Math.floor((pl.x + 3) / TILE), tx1 = Math.floor((pl.x + pl.w - 3) / TILE);
      for (let tx = tx0; tx <= tx1; tx++) {
        const id = cellId(L, tx, ty);
        const top = ty * TILE;
        if (id === ONEWAY) {
          if (pl.prevBottom <= top + 6) { pl.y = top - pl.h; pl.vy = 0; pl.onGround = true; landed = true; break; }
        } else if (SOLID_IDS.has(id)) {
          if (pl.prevBottom <= top + 12) { pl.y = top - pl.h; pl.vy = 0; pl.onGround = true; landed = true; break; }
        }
      }
      // platform bergerak (dianggap lantai satu-arah)
      if (!landed) {
        for (const m of this.entities) {
          if (m.kind !== 'mover') continue;
          const bottom = pl.y + pl.h;
          if (bottom >= m.y && bottom <= m.y + m.hpx + 24 && pl.prevBottom <= m.y + 10 && pl.x + pl.w > m.x + 3 && pl.x < m.x + m.wpx - 3) {
            pl.y = m.y - pl.h; pl.vy = 0; pl.onGround = true; landed = true;
            pl.standOnMover = m;
            break;
          }
        }
      }
    } else if (pl.vy < 0) {
      // kepala menabrak
      const ty = Math.floor(pl.y / TILE);
      const tx0 = Math.floor((pl.x + 4) / TILE), tx1 = Math.floor((pl.x + pl.w - 4) / TILE);
      for (let tx = tx0; tx <= tx1; tx++) {
        const id = cellId(L, tx, ty);
        const cellBottom = (ty + 1) * TILE;
        // jendela lintas yang "maaf": kepala baru melewati tepi bawah sel langkah ini
        const cross = pl.y < cellBottom - 2 && pl.prevTop >= cellBottom - 12;
        if (id === BONUS) {
          if (cross) {
            this._bumpBonus(tx, ty);
            pl.y = cellBottom; pl.vy = 40;
            break;
          }
        } else if (SOLID_IDS.has(id)) {
          if (cross) {
            pl.y = cellBottom; pl.vy = 40;
            this.emit('bump', tx * TILE + TILE / 2, cellBottom);
            break;
          }
        }
      }
    }
    return landed;
  }

  _spikeCheck() {
    const pl = this.player;
    if (pl.iframes > 0) return;
    const L = this.level;
    const bx0 = Math.floor((pl.x + 7) / TILE), bx1 = Math.floor((pl.x + pl.w - 7) / TILE);
    const by0 = Math.floor((pl.y + 10) / TILE), by1 = Math.floor((pl.y + pl.h - 3) / TILE);
    for (let ty = by0; ty <= by1; ty++) {
      for (let tx = bx0; tx <= bx1; tx++) {
        if (cellId(L, tx, ty) === SPIKE) { this._hurt('spike'); return; }
      }
    }
  }

  _bumpBonus(tx, ty) {
    this.level.tiles[ty * this.level.w + tx] = BONUS_USED;
    this.coins += 1;
    this.score += CFG.SCORE_COIN;
    this._needCleanup = false;
    this.emit('bonus', tx * TILE + TILE / 2, ty * TILE + TILE / 2);
  }

  _collideEnemies() {
    const pl = this.player;
    for (const e of this.entities) {
      if ((e.kind !== 'slime' && e.kind !== 'walker' && e.kind !== 'roller') || e.deadT > 0) continue;
      if (!rectHit({ x: pl.x, y: pl.y, w: pl.w, h: pl.h }, e)) continue;

      const fromAbove = pl.vy > 0 && pl.prevBottom <= e.y + 14;
      const dashing = pl.dashT > 0;

      if (fromAbove && e.stompable) {
        this._defeat(e, pl);
        pl.vy = P.STOMP_V;
      } else if (dashing && e.stompable) {
        this._defeat(e, pl);
      } else if (pl.iframes <= 0) {
        this._hurt(e.kind);
      }
    }
  }

  _defeat(e, pl) {
    e.deadT = 0.01; e.squish = 0.01;
    this.score += CFG.SCORE_STOMP;
    this._needCleanup = true;
    this.emit('stomp', e.x + e.w / 2, e.y + e.h, { kind: e.kind });
  }

  _collidePickups() {
    const pl = this.player;
    const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
    for (const e of this.entities) {
      if ((e.kind !== 'coin' && e.kind !== 'star') || e.taken) continue;
      const dx = cx - e.x, dy = cy - e.y;
      const r = e.kind === 'coin' ? CFG.COIN_RADIUS : CFG.STAR_RADIUS;
      if (dx * dx + dy * dy < r * r) {
        e.taken = true;
        if (e.kind === 'coin') { this.coins++; this.score += CFG.SCORE_COIN; this.emit('coin', e.x, e.y); }
        else {
          this.starCoins++;
          this.score += CFG.SCORE_STAR;
          if (this.hearts < CFG.HEARTS) { this.hearts++; this.emit('heal', e.x, e.y); }
          this.emit('star', e.x, e.y);
        }
      }
    }
  }

  _collideCheckpoint() {
    const pl = this.player;
    for (const c of this.entities) {
      if (c.kind !== 'checkpoint' || c.active) continue;
      const r = { x: c.tx * TILE - 10, y: (c.ty - 2) * TILE, w: TILE + 20, h: 3 * TILE };
      if (rectHit({ x: pl.x, y: pl.y, w: pl.w, h: pl.h }, r)) {
        c.active = true;
        this.activeCheckpoint = c;
        this.emit('checkpoint', c.tx * TILE + TILE / 2, (c.ty + 1) * TILE);
      }
    }
  }

  _collideGoal() {
    const pl = this.player;
    if (pl.state !== ST_PLAY) return;
    const g = this.goal;
    const r = { x: g.tx * TILE + 6, y: (g.ty - 4) * TILE, w: TILE - 12, h: 5 * TILE };
    if (rectHit({ x: pl.x, y: pl.y, w: pl.w, h: pl.h }, r)) {
      pl.state = ST_WIN;
      pl.winT = 0;
      pl.vx = 0;
      this.score += CFG.SCORE_LEVEL_CLEAR;
      this.emit('goal', g.tx * TILE + TILE / 2, g.ty * TILE);
    }
  }

  _hurt(cause) {
    const pl = this.player;
    if (pl.state !== ST_PLAY || this.state === ST_DEAD) return;
    this.deaths++;
    this.hearts--;
    pl.anim = 'hurt';
    this.emit('hurt', pl.x + pl.w / 2, pl.y + 10, { cause, hearts: this.hearts });
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.state = ST_DEAD;
      pl.state = ST_DEAD;
      this.emit('dead', pl.x, pl.y);
      return;
    }
    if (cause === 'fall') {
      // jatuh: pulihkan sebentar lalu muncul di checkpoint
      pl.state = ST_HURT;
      pl.hurtT = 0.45;
      pl.dashT = 0;
    } else {
      // musuh/duri: tetap di tempat, dorongan kecil + kebalikan sesaat
      pl.vy = -280;
      pl.vx = -pl.facing * P.HURT_KNOCK_X * 0.4;
      pl.dashT = 0;
      pl.onGround = false;
      pl.iframes = P.IFRAMES;
    }
  }

  respawn() {
    const cp = this.activeCheckpoint;
    const tx = cp ? cp.tx : this.level.spawn.x;
    const ty = cp ? cp.ty : this.level.spawn.y;
    const pl = this.player;
    pl.x = tx * TILE + (TILE - pl.w) / 2;
    pl.y = (ty + 1) * TILE - pl.h - 1;
    pl.yMin = pl.y;
    pl.vx = 0; pl.vy = 0;
    pl.state = ST_PLAY;
    pl.hurtT = 0;
    pl.dashT = 0; pl.dashCD = 0;
    pl.iframes = 1.2;
    pl.onGround = false;
    pl.anim = 'fall';
    pl.standOnMover = null;
    this.hearts = CFG.HEARTS;                 // ramah anak: penuh lagi tiap respawn
    this.emit('respawn', pl.x + pl.w / 2, pl.y + 20);
  }

  _updateAnim(dt) {
    const pl = this.player;
    pl.animT += dt;
    if (pl.dashT > 0) pl.anim = 'special';
    else if (!pl.onGround) pl.anim = pl.vy < -40 ? 'jump' : 'fall';
    else if (Math.abs(pl.vx) > 30) pl.anim = 'run';
    else pl.anim = 'idle';
  }
}

function stepMover(m, dt) {
  m.prevX = m.x; m.prevY = m.y;
  m.phase += (m.speed / Math.max(20, m.rangePx)) * dt;
  const tri = triangleWave(m.phase);           // 0..1..0
  const off = tri * m.rangePx;
  if (m.axis === 'x') { m.x = m.ox + off; }
  else { m.y = m.oy + off; }
}

function stepEnemy(world, e, dt) {
  const L = world.level;
  if (e.deadT > 0) return;
  if (e.kind === 'slime') {
    if (e.onGround) {
      e.vy = 0;
      e.hopT -= dt;
      if (e.hopT <= 0) { e.vy = -290; e.vx = e.dir * e.speed; e.hopT = 0.85; }
      else e.vx = moveToward(e.vx, 0, 400 * dt);
    } else e.vy = Math.min(e.vy + 1900 * dt, 700);
    integrateEnemy(world, e, dt);
    if (e.onGround && wallOrEdgeAhead(L, e)) { e.dir = -e.dir; e.vx = 0; }
  } else {
    e.vx = e.dir * e.speed;
    e.vy = Math.min(e.vy + 1900 * dt, 700);
    integrateEnemy(world, e, dt);
    if (wallOrEdgeAhead(L, e)) e.dir = -e.dir;
  }
}

function integrateEnemy(world, e, dt) {
  const L = world.level;
  e.x += e.vx * dt;
  {
    const t0 = Math.max(0, Math.floor(e.y / TILE)), t1 = Math.floor((e.y + e.h - 1) / TILE);
    if (e.vx > 0) {
      const tx = Math.floor((e.x + e.w) / TILE);
      for (let ty = t0; ty <= t1; ty++) if (cellSolid(L, tx, ty)) { e.x = tx * TILE - e.w - 0.01; e.vx = 0; e.dir = -1; break; }
    } else if (e.vx < 0) {
      const tx = Math.floor(e.x / TILE);
      for (let ty = t0; ty <= t1; ty++) if (cellSolid(L, tx, ty)) { e.x = (tx + 1) * TILE + 0.01; e.vx = 0; e.dir = 1; break; }
    }
  }
  e.onGround = false;
  e.y += e.vy * dt;
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h) / TILE);
    const tx0 = Math.floor((e.x + 3) / TILE), tx1 = Math.floor((e.x + e.w - 3) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      const id = cellId(L, tx, ty);
      const top = ty * TILE;
      if (id === ONEWAY) { if (e.y + e.h - e.vy * dt <= top + 6 && e.y + e.h >= top) { e.y = top - e.h; e.vy = 0; e.onGround = true; break; } }
      else if (SOLID_IDS.has(id)) { if (e.y + e.h >= top) { e.y = top - e.h; e.vy = 0; e.onGround = true; break; } }
    }
  }
  if (e.y > world.level.ph + 300) { e.deadT = 0.01; world._needCleanup = true; }
}

function wallOrEdgeAhead(L, e) {
  const aheadX = e.dir > 0 ? e.x + e.w + 6 : e.x - 6;
  const tx = Math.floor(aheadX / TILE);
  const tyWall = Math.floor((e.y + e.h - 14) / TILE);
  const wall = cellSolid(L, tx, tyWall);
  const tyFoot = Math.floor((e.y + e.h + 6) / TILE);
  const floorAhead = SOLID_IDS.has(cellId(L, tx, tyFoot)) || cellId(L, tx, tyFoot) === ONEWAY;
  return wall || !floorAhead;
}

function stepRoller(e, dt) {
  e.spin += e.dir * e.speed * dt / 24;
  e.x += e.dir * e.speed * dt;
  if (e.x <= e.min + 6) { e.x = e.min + 6; e.dir = 1; e.spin = 0; }
  const maxRight = e.max - e.w - 6;
  if (e.x >= maxRight) { e.x = maxRight; e.dir = -1; e.spin = 0; }
  e.spin += e.dir * e.speed * dt / 24;
}
