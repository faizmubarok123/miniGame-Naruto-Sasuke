// renderer.js â€” seluruh penggambaran: kamera, parallax, tile, entitas, efek
import { TILE, EMPTY, BONUS, BONUS_USED, SPIKE, BLOCK } from '../sim/level.js';
import { damp, clamp } from '../core/util.js';
import { CFG } from '../core/config.js';
import { buildTiles } from '../art/tiles.js';
import { buildBackdrop, buildCloudSprites } from '../art/bg.js';
import * as props from '../art/props.js';
import * as sprites from '../art/sprites.js';

const Z = 2; // skala art piksel untuk karakter (aj. px logis)

export class Renderer {
  constructor(canvas, theme, level) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.level = level;
    this.theme = theme;
    this.tiles = buildTiles(theme);
    this.backdrop = buildBackdrop(theme);
    this.clouds = buildCloudSprites();
    this.spr = {
      naruto: {}, sasuke: {},
      coin: sprites.coinFrames(),
      star: [sprites.starFrame(0), sprites.starFrame(1)],
      slime: [sprites.slimeFrame(0), sprites.slimeFrame(1)],
      walker: [sprites.walkerFrame(0), sprites.walkerFrame(1)],
      roller: sprites.rollerFrame(),
      npcA: sprites.npcFrames(0), npcB: sprites.npcFrames(1),
      heart: sprites.heartIcon(true)
    };
    for (const ch of ['naruto', 'sasuke']) {
      for (const pose of ['idle', 'run0', 'run1', 'run2', 'run3', 'jump', 'fall', 'dash', 'win', 'hurt']) {
        this.spr[ch][pose] = sprites.ninjaFrame(ch, pose);
      }
    }
    // props
    this.props = {
      checkpoint: [props.checkpointSprite(false), props.checkpointSprite(true, 0)],
      goal: props.goalSprite(0),
      sign: props.signSprite('i'),
      house: props.houseSprite(),
      torii: props.toriiDecor(),
      tree: props.treeSprite(),
      bamboo: props.bambooSprite(128),
      bambooBig: props.bambooSprite(196),
      bush: props.bushSprite(),
      flower: [props.flowerSprite('#ff7fa5'), props.flowerSprite('#ffd23e'), props.flowerSprite('#a5d8ff')],
      rock: props.rockSprite(),
      mushroom: props.mushroomSprite(),
      lantern: props.lanternSprite(),
      well: props.wellSprite()
    };
    this.t = 0;
    this.vw = 720; this.vh = 540; // aman: overslept sampai resize() dipanggil
    this.shakeT = 0; this.shakeMag = 0;
    this.reduceFx = false;
    this.bumpFx = new Map(); // index tile â†’ saat animasi lompatan bonus
    this.waterSegs = this._findWater();
  }

  _findWater() {
    // potongan kolom kosong pada satu baris pilihan per level (level.waterRow)
    const L = this.level;
    if (!L || L.waterRow == null) return null;
    const row = L.waterRow, segs = [];
    let x0 = -1;
    for (let x = 0; x <= L.w; x++) {
      const empty = x < L.w && L.tiles[row * L.w + x] === EMPTY;
      if (empty && x0 < 0) x0 = x;
      if (!empty && x0 >= 0) { segs.push([x0, x]); x0 = -1; }
    }
    return { y: row * TILE + 6, segs };
  }

  resize(vw, vh) {
    this.vw = vw; this.vh = vh;
  }

  triggerShake(mag = 6, time = 0.25) {
    if (this.reduceFx) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, time);
  }

  // kamera: mengikuti pemain dengan pandangan depan + clamp batas level
  updateCam(cam, pl, dt) {
    const L = this.level;
    const targetX = clamp(pl.x + pl.w / 2 + pl.facing * CFG.CAM_LOOKAHEAD - this.vw / 2, 0, Math.max(0, L.pw - this.vw));
    const targetY = clamp(pl.y + pl.h / 2 + CFG.CAM_OFF_Y - this.vh / 2, Math.min(0, L.ph - this.vh), Math.max(0, L.ph - this.vh));
    cam.x = damp(cam.x, targetX, CFG.CAM_LERP_X, dt);
    cam.y = damp(cam.y, targetY, CFG.CAM_LERP_Y, dt);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.min(1, this.shakeT / 0.25);
      cam.sx = (Math.random() * 2 - 1) * m;
      cam.sy = (Math.random() * 2 - 1) * m;
    } else { cam.sx = 0; cam.sy = 0; }
  }

  blink(bumpIdx) {
    this.bumpFx.set(bumpIdx, this.t);
  }

  noteWater() {} // segs sudah dihitung saat init level

  // ---------- frame penuh ----------
  draw(world, cam, fx, ambient) {
    const ctx = this.ctx, L = this.level;
    const vw = this.vw, vh = this.vh, z = cam.z;
    const camX = cam.x + (cam.sx || 0), camY = cam.y + (cam.sy || 0);
    this.t += 1 / 60;

    ctx.imageSmoothingEnabled = false;
    // ---- latar (ruang logis, diskalakan memenuhi kanvas penuh) ----
    ctx.save();
    ctx.setTransform(z, 0, 0, z, 0, 0);
    // langit
    this._sky(ctx, vw, vh, camY);

    // lapisan parallax
    const cloudOff = (this.t * 6) % (STRIPW);
    this._layerStrip(ctx, this.backdrop.mountains, 0.12, camX, camY, vh * 0.56, STRIPW);
    this._layerStrip(ctx, this.backdrop.mid, 0.3, camX, camY, vh * 0.6 - 20, STRIPW);
    this._layerStrip(ctx, this.backdrop.near, 0.5, camX, camY, vh * 0.62 + 40, STRIPW);
    this._clouds(ctx, vw, vh, camX, camY, cloudOff);
    // membara air (tema storm)
    if (this.backdrop.falls) {
      for (const fxp of [0.18, 0.48, 0.78]) {
        const fx0 = (fxp * L.pw - camX * 0.3) % (STRIPW * 4);
        const fx2 = ((fx0 % STRIPW) + STRIPW) % STRIPW;
        const sx = fx2, sy = vh * 0.6 - 190;
        if (sx < vw + 90) {
          ctx.globalAlpha = 0.8;
          ctx.drawImage(this.backdrop.falls, sx, sy);
          const shim = (this.t * 40) % 20;
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx + 10, sy + (shim % 220), 6, 18);
          ctx.globalAlpha = 1;
        }
      }
    }
    ctx.restore(); // kembali ke ruang perangkat

    // transform dunia
    ctx.save();
    ctx.translate(-camX * z, -camY * z);
    ctx.scale(z, z);

    // tile terlihat
    this._tiles(ctx, L, camX, camY, vw, vh, z);

    // dekor di belakang entitas
    this._decor(ctx, L);

    // air (di bawah entitas, transparan)
    this._water(ctx, camX, camY, vw, vh);

    // checkpoint, goal, sign, npc, mover, koin, musuh, bintang
    this._entities(ctx, world);

    // pemain
    this._player(ctx, world, camY);

    ctx.restore(); // kembali ke ruang perangkat

    // efek partikel & kupu-kupu (ruang perangkat — konversi kamera dilakukan di fx.js)
    fx.draw(ctx, { x: camX, y: camY, z });
    ambient.draw(ctx, { x: camX, y: camY, z }, vw, vh);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  _sky(ctx, vw, vh, camY) {
    void camY;
    const t = this.theme;
    // cache per tinggi layar (vh bisa NaN awal render pertama → tolak)
    const hOk = Number.isFinite(vh) && vh > 1;
    if (!this._skyGrad || (hOk && this._skyVh !== Math.round(vh))) {
      const g = ctx.createLinearGradient(0, 0, 0, Math.max(1, hOk ? vh : 1));
      g.addColorStop(0, t.skyTop);
      g.addColorStop(0.55, t.skyMid);
      g.addColorStop(1, t.skyLow);
      this._skyGrad = g;
      if (hOk) this._skyVh = Math.round(vh);
    }
    ctx.fillStyle = this._skyGrad;
    ctx.fillRect(0, 0, vw, (Number.isFinite(vh) ? vh : 400) + 4);
    // matahari dengan halo
    const sxx = vw * 0.78, syy = vh * 0.16;
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff8c9';
    ctx.beginPath(); ctx.arc(sxx, syy, 46, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = t.sun;
    ctx.beginPath(); ctx.arc(sxx, syy, 30, 0, Math.PI * 2); ctx.fill();
  }

  _layerStrip(ctx, strip, f, camX, camY, baseY, w) {
    const off = ((camX * f) % w + w) % w;
    const y = baseY - strip.height - camY * f * 0.18;
    ctx.drawImage(strip, -off, y);
    for (let x = w - off; x < this.vw; x += w) ctx.drawImage(strip, x, y);
  }

  _clouds(ctx, vw, vh, camX, camY, totalOff) {
    void totalOff;
    for (let i = 0; i < 6; i++) {
      const img = this.clouds[i % this.clouds.length];
      const seed = i * 2654435761;
      const baseX = ((seed % 1400) + this.t * (6 + (seed % 7)) - camX * 0.07) % (vw + 400) - 200;
      const px = ((baseX % (vw + 400)) + vw + 400) % (vw + 400) - 200;
      const py = 40 + ((seed >>> 8) % Math.max(1, (vh * 0.3) | 0)) - camY * 0.05;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(img, px, py);
      ctx.globalAlpha = 1;
    }
  }

  _tiles(ctx, L, camX, camY, vw, vh, z) {
    const tx0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const tx1 = Math.min(L.w - 1, Math.ceil((camX + vw / z) / TILE) + 1);
    const ty0 = Math.max(0, Math.floor(camY / TILE));
    const ty1 = Math.min(L.h - 1, Math.ceil((camY + vh / z) / TILE) + 1);
    const T = this.tiles, S = TILE;
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const id = L.tiles[ty * L.w + tx];
        if (id === EMPTY) continue;
        const px = tx * S, py = ty * S;
        if (id === 'G') {
          const above = ty > 0 ? L.tiles[(ty - 1) * L.w + tx] : EMPTY;
          if (above === EMPTY) {
            ctx.drawImage(T.grass, px, py);
            // bayangan tepi jika kiri/kanan telanjang (upaya tulisan: malas? gunakan garis)
            const left = tx > 0 ? L.tiles[ty * L.w + tx - 1] : 'G';
            const right = tx < L.w - 1 ? L.tiles[ty * L.w + tx + 1] : 'G';
            if (!SOLIDSET.has(left)) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px, py + 15, 4, S - 15); }
            if (!SOLIDSET.has(right)) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px + S - 4, py + 15, 4, S - 15); }
          } else {
            ctx.drawImage(T.dirt, px, py);
          }
        } else if (id === BLOCK) {
          ctx.drawImage(T.stone, px, py);
        } else if (id === ONE_WAY_ID) {
          const themePlat = this.theme.id === 'bamboo' ? T.bamboo : T.wood;
          ctx.drawImage(themePlat, px, py);
        } else if (id === BONUS) {
          const bump = this.bumpFx.get(ty * L.w + tx);
          const dy = (bump != null) ? Math.max(0, 1 - (this.t - bump) * 6) * -10 : 0;
          ctx.drawImage(T.bonus, px, py + dy);
        } else if (id === BONUS_USED) {
          ctx.drawImage(T.bonusUsed, px, py);
        } else if (id === SPIKE) {
          ctx.drawImage(T.spike, px, py);
        }
      }
    }
  }

  _decor(ctx, L) {
    const t = this.t;
    for (const d of L.decor) {
      if (d.kind === 'npc') continue; // entitas
      const px = d.x * TILE, py = d.y * TILE;
      const k = this.props;
      switch (d.kind) {
        case 'tree': ctx.drawImage(k.tree, px - 24, py - 80); break;
        case 'bamboo': ctx.drawImage(k.bamboo, px, py - 80); break;
        case 'house': ctx.drawImage(k.house, px - 32, py - 48); break;
        case 'torii': ctx.drawImage(k.torii, px - 24, py - 62); break;
        case 'lantern': ctx.drawImage(k.lantern, px + 9, py - 34); break;
        case 'well': ctx.drawImage(k.well, px - 6, py - 4); break;
        case 'bush': ctx.drawImage(k.bush, px - 14, py - 12); break;
        case 'rock': ctx.drawImage(k.rock, px - 6, py + 8); break;
        case 'mushroom': ctx.drawImage(k.mushroom, px, py + 6); break;
        case 'flower': {
          const img = k.flower[(d.variant ?? (d.x % 3)) % 3];
          const bob = Math.sin(t * 2 + d.x) * 1.5;
          ctx.drawImage(img, px, py + bob);
          break;
        }
      }
    }
  }

  _water(ctx, camX, camY, vw, vh) {
    const w = this.waterSegs;
    if (!w) return;
    ctx.save();
    ctx.globalAlpha = 0.72;
    for (const [a, b] of w.segs) {
      const x0 = a * TILE, x1 = b * TILE;
      if (x1 < camX - 50 || x0 > camX + vw + 50) continue;
      const y0 = w.y, depth = 400;
      const grd = ctx.createLinearGradient(0, y0, 0, y0 + depth);
      grd.addColorStop(0, '#5fb9e8');
      grd.addColorStop(0.25, this.theme.water);
      grd.addColorStop(1, this.theme.waterDeep);
      ctx.fillStyle = grd;
      ctx.fillRect(x0, y0, x1 - x0, depth);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let wx2 = x0; wx2 < x1; wx2 += 24) {
        const wave = Math.sin(this.t * 2.4 + wx2 * 0.06) * 2.5;
        ctx.fillRect(wx2 + ((wx2 % 3) === 0 ? 4 : 0), y0 + 2 + wave, 12, 2);
      }
      ctx.globalAlpha = 0.72;
    }
    ctx.restore();
  }

  _entities(ctx, world) {
    const pl = world.player;
    for (const e of world.entities) {
      switch (e.kind) {
        case 'coin': {
          if (e.taken) break;
          const bob = Math.sin(this.t * 3 + e.tx * 1.7) * 3;
          const f = this.spr.coin[Math.floor(this.t * 6 + e.tx) % 4];
          ctx.drawImage(f, e.x - f.width / 2 + 5, e.y - f.height / 2 + 5 + bob, f.width, f.height);
          break;
        }
        case 'star': {
          if (e.taken) break;
          const bob = Math.sin(this.t * 2.2 + e.tx) * 5;
          const f = this.spr.star[Math.floor(this.t * 4) % 2];
          // halo
          ctx.globalAlpha = 0.3 + 0.14 * Math.sin(this.t * 4);
          ctx.fillStyle = '#ffe982';
          ctx.beginPath(); ctx.arc(e.x, e.y + bob, 16, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.drawImage(f, e.x - f.width / 2, e.y + bob - f.height / 2);
          break;
        }
        case 'checkpoint': {
          const img = e.active ? this.props.checkpoint[1] : this.props.checkpoint[0];
          const px = e.tx * TILE - 5, py = (e.ty + 1) * TILE - 96;
          if (e.active) {
            const glow = Math.sin(this.t * 5) * 0.5 + 0.5;
            ctx.drawImage(img, px, py);
            ctx.globalAlpha = 0.35 + glow * 0.2;
            ctx.fillStyle = '#ffd44d';
            ctx.beginPath(); ctx.arc(px + 24, py + 16, 10, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
          } else ctx.drawImage(img, px, py);
          break;
        }
        case 'sign': {
          ctx.drawImage(this.props.sign, e.tx * TILE + 4, (e.ty + 1) * TILE - 46);
          // bubble bila dekat
          const dist = Math.abs(pl.x - (e.tx * TILE)) ;
          if (dist < TILE * 3.2) {
            e.near = Math.min(1, e.near + 0.1);
          } else e.near = Math.max(0, e.near - 0.06);
          if (e.near > 0.05 && this.signText) {
            const msg = this.signText[e.key] || '';
            drawBubble(ctx, e.tx * TILE + 24, (e.ty + 1) * TILE - 56, msg, e.near);
          }
          break;
        }
        case 'npc': {
          const wave = Math.floor(this.t * 1.4 + e.tx) % 6 === 0;
          const img = wave ? this.props.npcB || this.spr.npcA : this.spr.npcA;
          const px = e.tx * TILE, py = (e.ty + 1) * TILE;
          ctx.drawImage(img, px + 2, py - 40);
          if (Math.abs(pl.x - px) < TILE * 3 && e.text) {
            drawBubble(ctx, px + 24, py - 52, e.text, 1);
          }
          break;
        }
        case 'mover': {
          const plat = this.theme.id === 'bamboo' ? this.tiles.bamboo : this.tiles.wood;
          ctx.drawImage(plat, e.x, e.y + 2, e.wpx, 18);
          // tali & bayangan
          ctx.strokeStyle = 'rgba(60,40,20,0.35)';
          ctx.beginPath();
          ctx.moveTo(e.x + 4, e.y + 12); ctx.lineTo(e.x + 4, e.y + 18);
          ctx.moveTo(e.x + e.wpx - 4, e.y + 12); ctx.lineTo(e.x + e.wpx - 4, e.y + 18);
          ctx.stroke();
          break;
        }
        case 'slime': {
          const f = this.spr.slime[Math.floor(this.t * 6) % 2];
          const px = e.x, py = e.y + e.h - f.height * Z / 2;
          if (e.deadT > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - e.deadT / 1.1);
            const sq = Math.min(1, e.deadT * 3);
            ctx.drawImage(f, px + e.w / 2 - (f.width * Z) / 2, py + f.height * Z / 2 * (1 - sq), f.width * Z * (1 + sq * 0.4), f.height * Z * (1 - sq));
            ctx.restore();
          } else {
            drawEnemyShadow(ctx, e, Z);
            ctx.drawImage(f, px + e.w / 2 - (f.width * Z) / 2, e.y + e.h - f.height * Z);
          }
          break;
        }
        case 'walker': {
          const f = this.spr.walker[Math.floor(this.t * 6 + e.x * 0.02) % 2];
          drawEnemyShadow(ctx, e, Z);
          if (e.deadT > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - e.deadT / 1.1);
            ctx.scale(1, Math.max(0.1, 1 - e.deadT));
            ctx.drawImage(f, e.x - f.width * Z / 2 + e.w / 2, e.y + e.h - f.height * Z);
            ctx.restore();
          } else {
            ctx.save();
            ctx.translate(e.x + e.w / 2, 0);
            ctx.scale(e.dir < 0 ? -1 : 1, 1);
            ctx.drawImage(f, -f.width * Z / 2, e.y + e.h - f.height * Z);
            ctx.restore();
          }
          break;
        }
        case 'roller': {
          drawEnemyShadow(ctx, e, Z);
          ctx.save();
          ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
          ctx.rotate(e.spin);
          // glow merah peringatan
          ctx.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 6);
          ctx.scale(1, 1);
          ctx.globalAlpha = 1;
          ctx.drawImage(this.spr.roller, -20 * Z, -20 * Z, 40 * Z, 40 * Z);
          ctx.restore();
          // jalur peringatan
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#d85757';
          ctx.fillRect(e.min + 4, e.y + e.h - 4, e.max - e.min - 8, 3);
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
    // goal
    const g = world.goal;
    const wob = Math.sin(this.t * 3 + g.tx);
    ctx.drawImage(this.props.goal, g.tx * TILE - 12, (g.ty + 1) * TILE - 116 + wob);
  }

  _player(ctx, world, camY) {
    const pl = world.player;
    if (world_state_hidden(pl)) return;
    const ch = this.spr[pl.charId];
    let pose = 'idle';
    if (pl.state === 'win') { pose = 'win'; }
    else if (pl.state === 'hurt') pose = 'hurt';
    else if (pl.dashT > 0) pose = 'dash';
    else pose = pl.anim === 'run' ? ('run' + (Math.floor(pl.animT * 9) % 4)) : pl.anim === 'jump' ? 'jump' : pl.anim === 'fall' ? 'fall' : 'idle';
    const img = ch[pose] || ch.idle;
    const sw = img.width * Z, sh = img.height * Z;
    const squash = pl.squash > 0 ? 1 - pl.squash * 0.35 : 1;
    const stretch = pl.stretch > 0 ? 1 + pl.stretch * 0.5 : 1;
    const feetX = pl.x + pl.w / 2;
    const feetY = (pl.y + pl.h);
    ctx.save();
    ctx.translate(feetX, feetY);
    ctx.scale(pl.facing < 0 ? -1 : 1, 1);
    // squash & stretch
    if (squash !== 1 || stretch !== 1) { ctx.scale(squash, stretch); }
    if (pl.iframes > 0 && Math.floor(pl.iframes * 12) % 2 === 0) ctx.globalAlpha = 0.45;
    ctx.drawImage(img, -sw / 2, -sh, sw, sh);
    ctx.restore();
    // bintang kecil saat menang
    if (pl.state === 'win') {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#ffe982';
      for (let i = 0; i < 3; i++) {
        const a = this.t * 3 + i * 2.1;
        ctx.beginPath();
        ctx.arc(feetX + Math.cos(a) * 26, feetY - 40 + Math.sin(a) * 10, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // mode atraksi: gambar karakter sahabat di sampingnya
    if (world.attract && pl.state !== 'hurt' && pl.state !== 'win') {
      const img2 = this.spr[world.attract.companionChar]?.idle;
      if (img2) {
        const sw2 = img2.width * Z, sh2 = img2.height * Z;
        ctx.drawImage(img2, feetX + 120 - sw2 / 2, feetY - sh2, sw2, sh2);
      }
    }
  }
}

function world_state_hidden(pl) { return pl.state === 'dead'; }

// bayangan oval musuh
function drawEnemyShadow(ctx, e, z) {
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#2b2436';
  ctx.beginPath();
  ctx.ellipse(e.x + e.w / 2, e.y + e.h + 2, e.w * 0.42, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// gelembung tutorial / NPC
function drawBubble(ctx, cx, by, text, a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = '9px sans-serif';
  const lines = String(text).split('\n');
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
  const h = lines.length * 11 + 10;
  const bx = cx - w / 2, byy = by - h - 8;
  ctx.fillStyle = 'rgba(255, 252, 240, 0.96)';
  roundRect(ctx, bx, byy, w, h, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,55,40,0.5)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, bx, byy, w, h, 7);
  ctx.stroke();
  // ekor
  ctx.beginPath();
  ctx.moveTo(cx - 4, byy + h - 1);
  ctx.lineTo(cx, byy + h + 6);
  ctx.lineTo(cx + 4, byy + h - 1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 252, 240, 0.96)';
  ctx.fill();
  ctx.fillStyle = '#4a3b2a';
  ctx.textAlign = 'center';
  lines.forEach((l, i) => ctx.fillText(l, cx, byy + 13 + i * 11));
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const STRIPW = 1200;
const ONE_WAY_ID = '-';
const SOLIDSET = new Set(['G', 'B', '?', 'X']);

