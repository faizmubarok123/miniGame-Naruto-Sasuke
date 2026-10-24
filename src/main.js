// main.js — bootstrap: kanvas, loop utama, jembatan UI ↔ Game ↔ Input ↔ Audio
import { CFG } from './core/config.js';
import { SaveStore } from './core/save.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { Game } from './core/game.js';
import { UI } from './core/ui.js';
import { T } from './core/strings.js';

function fail(msg) {
  const el = document.getElementById('boot-error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
  const b = document.getElementById('boot');
  if (b) b.style.display = 'none';
}

try {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas tidak tersedia di browser ini.');

  const save = new SaveStore();
  const audio = new AudioEngine();
  const input = new Input();

  const game = new Game({ save, audio, input, canvas });
  let ui = null;

  // ---- ukuran kanvas & skala logis ----
  const root = document.getElementById('game-root');
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cw = root.clientWidth, ch = root.clientHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    // skala logis: pastikan lebar ≥ MIN_VIEW_W dan tinggi ≥ BASE_VIEW_H dalam parameter wajar
    let z = Math.min(ch / CFG.BASE_VIEW_H, cw / CFG.MIN_VIEW_W);
    z = Math.min(z, CFG.MAX_SCALE);
    const vw = cw / z, vh = ch / z;
    game.cam.z = dpr * z;
    game.viewW = vw; game.viewH = vh; // agar startLevel bisa mengukur renderer baru
    if (game.renderer) game.renderer.resize(vw, vh);
    if (game.world && game.mode === 'menu') {
      try { game.snapCam(); } catch { /* diam */ }
    }
  }
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe(root);

  // buka audio pada interaksi pertama (autoplay policy)
  const unlock = () => { audio.unlock(); game.applySettings(); };
  addEventListener('pointerdown', unlock, { once: false });
  addEventListener('keydown', unlock, { once: false });

  // jeda otomatis saat tab disembunyikan
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.mode === 'level' && game.world && game.world.player.state === 'play') {
      if (!document.getElementById('screen-pause').classList.contains('open')) {
        ui.pauseToggle();
      }
    }
  });

  game.onLevelEnd = (world, won) => {
    let nextUnlocked = false;
    if (won) {
      const res = {
        score: world.score, coins: world.coins, stars: world.starCoins,
        deaths: world.deaths, time: Math.round(world.time)
      };
      nextUnlocked = save.recordLevelResult(game.levelIdx + 1, res);
      if (game.levelIdx < 2) {
        nextUnlocked = save.unlockLevel(game.levelIdx + 2) || nextUnlocked;
      }
    }
    audio.stopMusic();
    ui.showResult(world, won, nextUnlocked);
  };

  game.applySettings();
  game.enterMenu();

  ui = new UI({
    save,
    audio,
    game,
    onAction: (action, arg) => {
      switch (action) {
        case 'startLevel': ui.hideAll(); ui.hudOn(true); game.startLevel(arg); break;
        case 'startFromChar': {
          // dari layar karakter: lanjutkan ke level masih terkunci terakhir terbuka
          const lastOpen = save.progress.unlocked - 1; // indeks
          ui.hideAll(); ui.hudOn(true);
          game.startLevel(Math.min(2, lastOpen));
          break;
        }
        case 'pause': game.paused = true; break;
        case 'resume': game.paused = false; break;
        case 'restart': ui.hideAll(); ui.pauseOpen(false); game.paused = false; game.startLevel(game.levelIdx); ui.hudOn(true); break;
        case 'swap': {
          game.swapCharacter(arg);
          save.setChar(arg);
          ui.toast(T.pause.charSwapped);
          break;
        }
        case 'retryLevel': ui.hideAll(); game.startLevel(game.levelIdx); ui.hudOn(true); break;
        case 'nextLevel': {
          const n = Math.min(2, game.levelIdx + 1);
          ui.hideAll();
          game.startLevel(n);
          ui.hudOn(true);
          break;
        }
        case 'quit': ui.pauseOpen(false); game.paused = false; audio.stopMusic(); ui.hudOn(false); game.enterMenu(); ui.toMenu(); break;
      }
    }
  });

  ui.toMenu();

  // ---- loop utama ----
  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    const paused = !!game.paused;
    game.frame(dt, paused);
    if (game.mode === 'level') ui.hudUpdate(game.world);
  }
  requestAnimationFrame(tick);

  // pasangkan tombol Esc/P (dibaca dari input) untuk menyela — lebih berlaku tetap
  addEventListener('keydown', (e) => {
    if ((e.code === 'Escape' || e.code === 'KeyP') && game.mode === 'level') {
      e.preventDefault();
      ui.pauseToggle();
    }
  });

  // sembunyikan layar pembuka
  const boot = document.getElementById('boot');
  if (boot) {
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 450);
  }
  resize();

  window.__adf = { game, ui, save, audio }; // koneksi debug ringan
} catch (err) {
  console.error(err);
  fail('Terjadi kegagalan saat menyiapkan permainan: ' + (err && err.message ? err.message : err));
}
