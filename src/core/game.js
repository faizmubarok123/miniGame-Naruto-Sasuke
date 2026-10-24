// game.js — pengatur sesi permainan: loop tetap, event→efek/suara, mode level & menu
import { World, ST_WIN, ST_DEAD } from '../sim/world.js';
import { Renderer } from '../render/renderer.js';
import { Fx, Ambient } from '../art/fx.js';
import { LEVELS } from '../data/levels.js';

export const FIXED_DT = 1 / 120;

export class Game {
  constructor({ save, audio, input, canvas }) {
    this.save = save;
    this.audio = audio;
    this.input = input;
    this.canvas = canvas;
    this.mode = 'menu';          // menu | level
    this.world = null;
    this.renderer = null;
    this.cam = { x: 0, y: 0, z: 1, sx: 0, sy: 0 };
    this.fx = new Fx();
    this.ambient = null;
    this.acc = 0;
    this.endTimer = 0;
    this._ended = false;
    this.onHUD = null;
    this.onLevelEnd = null;      // (world, won) => {}
    this.levelIdx = 0;
    this.charId = save.charId;
  }

  applySettings() {
    this.audio.apply(this.save.settings);
    if (this.renderer) this.renderer.reduceFx = this.save.settings.reduceFx;
  }

  // ---- mode menu: level 1 sebagai panggung atraksi ----
  enterMenu() {
    this.charId = this.save.charId;
    this.mode = 'menu';
    const lw = new World(LEVELS[0], this.charId);
    lw.attract = { companionChar: this.charId === 'naruto' ? 'sasuke' : 'naruto' };
    lw.player.iframes = 0;
    this.world = lw;
    this.renderer = new Renderer(this.canvas, LEVELS[0].themeCfg ?? LEVELS[0].theme_cfg ?? themeOf(LEVELS[0]), lw.level);
    if (this.viewW) this.renderer.resize(this.viewW, this.viewH);
    this.renderer.signText = null;
    this.ambient = new Ambient(LEVELS[0].theme);
    this.cam = { x: 0, y: 0, z: this.cam.z, sx: 0, sy: 0 };
    this.snapCam();
  }

  startLevel(idx, charId = this.save.charId) {
    this.levelIdx = idx;
    this.charId = charId;
    const level = LEVELS[idx];
    this.mode = 'level';
    this.world = new World(level, charId);
    this.renderer = new Renderer(this.canvas, level.themeCfg, level);
    if (this.viewW) this.renderer.resize(this.viewW, this.viewH);
    this.renderer.signText = SIGN_TEXT;
    this.renderer.reduceFx = this.save.settings.reduceFx;
    this.ambient = new Ambient(level.theme);
    this.fx = new Fx();
    this.cam = { x: 0, y: 0, z: this.cam.z, sx: 0, sy: 0 };
    this._ended = false;
    this.endTimer = 0;
    this.snapCam();
    this.audio.startMusic(level.music);
  }

  swapCharacter(charId) {
    if (!this.world) return;
    this.charId = charId;
    this.world.player.charId = charId;
    if (this.world.attract) this.world.attract.companionChar = charId === 'naruto' ? 'sasuke' : 'naruto';
  }

  snapCam() {
    const pl = this.world.player;
    const vw = this.renderer.vw, vh = this.renderer.vh;
    this.cam.x = Math.max(0, Math.min(this.world.level.pw - vw, pl.x + pl.w / 2 - vw / 2));
    this.cam.y = Math.max(Math.min(0, this.world.level.ph - vh), Math.min(this.world.level.ph - vh, Math.max(0, pl.y + pl.h / 2 - vh / 2)));
    this.cam.x = Math.max(0, this.cam.x);
    this.cam.y = Math.max(0, this.cam.y);
    if (this.world.level.ph - vh <= 0) this.cam.y = 0;
  }

  setViewSize(vw, vh) {
    this.renderer.resize(vw, vh);
  }

  // panggil per frame rAF
  frame(dt, pauseGate) {
    if (!this.world || !this.renderer) return;

    if (this.mode === 'menu') {
      // atraksi: pemain diam-diam idup, kamera pan sinus sangat lambat
      this.world.step({ left: false, right: false, jumpHeld: false, jumpEdge: false, specialEdge: false, pauseEdge: false }, dt * 0.85);
      const L = this.world.level;
      const t = performance.now() / 1000;
      const pan = (Math.sin(t * 0.06) * 0.5 + 0.5) * Math.min(700, Math.max(0, L.pw - this.renderer.vw));
      this.cam.x = pan;
      this.cam.y = Math.max(0, L.ph - this.renderer.vh);
      this.ambient?.update(dt, { x: this.cam.x + this.renderer.vw / 2, y: this.cam.y });
      this.renderer.draw(this.world, this.cam, this.fx, this.ambient);
      return;
    }

    if (pauseGate) {
      this.renderer.draw(this.world, this.cam, this.fx, this.ambient); // beku saat jeda
      return;
    }

    // langkah fisika tetap
    const sig = this.input.consume();
    this.acc = Math.min(this.acc + dt, 0.12);
    while (this.acc >= FIXED_DT) {
      this.world.step(sig, FIXED_DT);
      this.acc -= FIXED_DT;
    }
    this.fx.update(dt);
    this.ambient?.update(dt, { x: this.cam.x + this.renderer.vw / 2, y: this.cam.y });

    // tangani event dunia → suara & efek
    for (const e of this.world.drainEvents()) this.handleEvent(e);

    // kamera
    this.renderer.updateCam(this.cam, this.world.player, dt);
    this.renderer.draw(this.world, this.cam, this.fx, this.ambient);

    // akhir level (menang sekali / kalah sekali)
    if (this.world.player.state === ST_WIN && !this._ended) {
      if (this.endTimer === 0) this.endTimer = 1.6;
    }
    if (this.endTimer > 0) {
      this.endTimer -= dt;
      if (this.endTimer <= 0) {
        this.endTimer = 0;
        this._ended = true;
        this.onLevelEnd?.(this.world, true);
        return;
      }
    }
    if (this.world.state === ST_DEAD && !this._ended) {
      this._ended = true;
      this.onLevelEnd?.(this.world, false);
    }
  }

  handleEvent(e) {
    const fx = this.fx;
    switch (e.type) {
      case 'jump': fx.dust(e.x, e.y, 6); this.audio.play('jump'); break;
      case 'land': if (!this.save.settings.reduceFx) fx.dust(e.x, e.y, 7); this.audio.play('land'); break;
      case 'coin': fx.coin(e.x, e.y); this.audio.play('coin'); break;
      case 'star': fx.star(e.x, e.y); this.audio.play('star'); break;
      case 'heal': fx.heal(e.x, e.y); break;
      case 'stomp': fx.poof(e.x, e.y, '#ffffff', 9); this.audio.play('stomp'); break;
      case 'hurt': this.audio.play('hurt'); this.renderer.triggerShake(6, 0.25); break;
      case 'dead': this.audio.play('hurt'); this.renderer.triggerShake(9, 0.4); break;
      case 'checkpoint':
        this.audio.play('checkpoint');
        for (let i = 0; i < 10; i++) fx.spawn({ t: 'spark', x: e.x, y: e.y - 60 - i * 6, vx: Math.cos(i) * 40, vy: -40, life: 0.7, age: 0, size: 3, col: '#ffd44d' });
        break;
      case 'bump': this.audio.play('block'); if (this.world) { /* tile index unknown di sini; renderer pista: bonus event */ } break;
      case 'bonus':
        fx.poof(e.x, e.y - 20, '#ffe9a0', 8);
        this.audio.play('coin');
        break;
      case 'dash':
        if (e.char === 'sasuke') { this.audio.play('zap'); fx.lightning(e.x, e.y, e.dir, '#9f86ff'); }
        else { this.audio.play('dash'); }
        break;
      case 'respawn': fx.poof(e.x, e.y, '#d8ecff', 8); break;
      case 'goal':
        this.audio.play('goal');
        this.renderer.triggerShake(2, 0.15);
        fx.confetti(e.x, e.y - 60, 34);
        break;
    }
  }
}

// seg (sinyal) boleh dipakai ulang semua substep; edge dipakai sekali di substep pertama
// teks papan tutorial (dipasangkan world → tanda)
export const SIGN_TEXT = {
  move: 'Tombol KIRI / KANAN\nuntuk berjalan!',
  jump: 'Tekan LOMPAT untuk melompat.\nTahan = lebih tinggi!',
  coin: 'Kumpulkan koin\nuntuk poin!',
  ability: 'Tekan tombol JURUS\ndi celah ini!',
  goal: 'Menuju banner\nujung jalur!',
  danger: 'Awas duri & sesuatu\nyang menggelinding!'
};

function themeOf(level) {
  return level.themeCfg || level.theme_cfg;
}
