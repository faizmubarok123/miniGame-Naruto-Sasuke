// ui.js — seluruh layar menu/HUD/toast dalam DOM + tombol sentuh multitouch
import { T } from '../core/strings.js';
import { CFG } from '../core/config.js';
import { ninjaFrame } from '../art/sprites.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor({ save, audio, game, onAction }) {
    this.save = save;
    this.audio = audio;
    this.game = game;
    this.onAction = onAction; // (action, arg) => void — semua keputusan antar-layar
    this.toastTimer = null;
    this._bindMenu();
    this._bindSettings();
    this._bindPause();
    this._bindTouch();
    this._refreshCharCards();
    this._bindCharPreviews();
  }

  _bindCharPreviews() {
    const poses = ['idle', 'idle', 'run0', 'run1', 'run2', 'run3', 'jump', 'win'];
    const cards = [];
    for (const [id, elId] of [['naruto', 'prev-naruto'], ['sasuke', 'prev-sasuke']]) {
      const host = $(elId);
      const c = document.createElement('canvas');
      c.width = 72; c.height = 96;
      host.appendChild(c);
      cards.push({ c, ctx: c.getContext('2d'), id, i: 0 });
    }
    setInterval(() => {
      for (const card of cards) {
        card.i = (card.i + 1) % poses.length;
        const img = ninjaFrame(card.id, poses[card.i]);
        const { ctx: g, c } = card;
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, c.width, c.height);
        const s = Math.min(c.width / img.width, c.height / img.height) * 0.92;
        g.drawImage(img, (c.width - img.width * s) / 2, c.height - img.height * s, img.width * s, img.height * s);
      }
    }, 250);
  }

  show(screenId) {
    for (const s of document.querySelectorAll('.screen')) s.classList.remove('open');
    if (screenId) $(screenId).classList.add('open');
  }

  hideAll() { this.show(null); }

  toast(msg, ms = 1900) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  // ---------- layar utama ----------
  toMenu() {
    this.hideAll();
    $('screen-menu').classList.add('open');
    $('hud').classList.remove('on');
    this._refreshBestLabels();
  }

  _refreshBestLabels() {
    for (let i = 0; i < 3; i++) {
      const best = this.save.bestOf(i + 1);
      const el = $(`best-${i}`);
      el.textContent = best ? `${T.levels.bestScore} ${best.score} · ${T.levels.bestCoins} ${best.coins}` : T.levels.notPlayed;
    }
  }

  // ---------- pemilihan level ----------
  openLevelSelect() {
    this.hideAll();
    const unlocked = this.save.progress.unlocked;
    for (let i = 0; i < 3; i++) {
      const card = $(`lv-card-${i}`);
      const locked = i + 1 > unlocked;
      card.classList.toggle('locked', locked);
      $(`lv-lock-${i}`).classList.toggle('on', locked);
    }
    $('screen-levels').classList.add('open');
    this._refreshBestLabels();
  }

  clickLevel(i) {
    if (i + 1 > this.save.progress.unlocked) {
      this.toast(T.toast.lockedLevel);
      this.audio.play('ui');
      const card = $(`lv-card-${i}`);
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      return;
    }
    this.audio.play('ui');
    this.onAction('startLevel', i);
  }

  // ---------- pemilihan karakter ----------
  openCharSelect(fromResult = false) {
    this.hideAll();
    this._charFromResult = fromResult;
    $('screen-char').classList.add('open');
    this._refreshCharCards();
  }

  _refreshCharCards() {
    for (const id of ['naruto', 'sasuke']) {
      const sel = this.save.charId === id;
      $(`char-card-${id}`).classList.toggle('selected', sel);
      const btn = $(`char-pick-${id}`);
      btn.textContent = sel ? T.charSelect.ready : 'Pilih';
      btn.classList.toggle('is-selected', sel);
    }
  }

  pickChar(id) {
    if (this.save.setChar(id)) this.audio.play('ui');
    this._refreshCharCards();
  }

  // ---------- HUD ----------
  hudOn(on) {
    $('hud').classList.toggle('on', on);
    $('touch-controls').classList.toggle('on', on && this._touchVisible());
  }

  hudUpdate(world) {
    if (!world || this._lastHUDFrame === world.time) return;
    this._lastHUDFrame = world.time;
    const pl = world.player;
    // hearts
    const hearts = $('hud-hearts');
    if (this._lastHearts !== world.hearts) {
      this._lastHearts = world.hearts;
      let html = '';
      for (let i = 0; i < CFG.HEARTS; i++) html += `<span class="heart ${i < world.hearts ? 'full' : 'empty'}"></span>`;
      hearts.innerHTML = html;
    }
    // skor/koin (hanya saat berubah)
    setTextIf($('hud-score'), `${world.score}`);
    setTextIf($('hud-coins'), `${world.coins}/${world.totalCoins}`);
    setTextIf($('hud-level'), `Lv ${this.game.levelIdx + 1} · ${world.level.name}`);
    // jurus: ring cooldown
    const ready = pl.dashCD <= 0;
    $('hud-ability').classList.toggle('ready', ready);
    $('hud-ability').style.setProperty('--cd', `${Math.max(0, pl.dashCD)}s`);
    $('hud-ability').setAttribute('title', CFG.CHARACTERS[pl.charId].abilityName);
    $('hud-char').className = `ch-chip ${pl.charId}`;
    setTextIf($('hud-char'), pl.charId === 'naruto' ? 'N' : 'S');
  }

  // ---------- jeda ----------
  pauseOpen(p) {
    $('screen-pause').classList.toggle('open', p);
    $('pause-scrim').classList.toggle('on', p);
  }

  pauseToggle() {
    const open = !$('screen-pause').classList.contains('open');
    this.pauseOpen(open);
    this.audio.play('ui');
    this.onAction(open ? 'pause' : 'resume');
  }

  // ---------- hasil level ----------
  showResult(world, won, nextUnlocked) {
    this.hudOn(false);
    this.pauseOpen(false);
    const res = $('screen-result');
    const st = T.result;
    if (!won) {
      $('res-title').textContent = T.death.title;
      $('res-sub').textContent = T.death.text;
      $('res-stats').innerHTML = '';
      $('btn-next').style.display = 'none';
      $('btn-retry').textContent = T.death.retry;
    } else {
      $('res-title').textContent = this.game.levelIdx === 2 ? st.finishTitle : st.title;
      $('res-sub').textContent = this.game.levelIdx === 2 ? st.finishText : '';
      const mins = Math.floor(world.time / 60), secs = Math.floor(world.time % 60);
      $('res-stats').innerHTML = `
        <div><span>${st.score}</span><b>${world.score}</b></div>
        <div><span>${st.coins}</span><b>${world.coins}/${world.totalCoins}</b></div>
        <div><span>${st.stars}</span><b>${world.starCoins}/${world.totalStars}</b></div>
        <div><span>${st.deaths}</span><b>${world.deaths}</b></div>
        <div><span>${st.time}</span><b>${mins}:${String(secs).padStart(2, '0')}</b></div>`;
      $('res-newbest').style.display = 'none';
      if (nextUnlocked) {
        $('res-newbest').textContent = `${T.result.best} ${T.toast.unlocked.replace('{n}', String(this.game.levelIdx + 2))}`;
        $('res-newbest').style.display = 'block';
      }
      $('btn-next').style.display = this.game.levelIdx < 2 ? '' : 'none';
      $('btn-retry').textContent = T.result.replay;
    }
    res.classList.add('open');
    if (won) setTimeout(() => this.game.fx.confetti(world.goal.tx * 48, (world.goal.ty - 3) * 48, 40), 120);
  }

  // ---------- pengaturan ----------
  openSettings(from = 'menu') {
    this._settingsFrom = from;
    const s = this.save.settings;
    $('set-sfx').checked = s.sfxOn;
    $('set-music').checked = s.musicOn;
    $('set-vol').value = s.volume * 100;
    $('set-reducefx').checked = s.reduceFx;
    document.querySelectorAll('input[name="touchmode"]').forEach((r) => { r.checked = r.value === s.touchMode; });
    $('screen-settings').classList.add('open');
    const backLabel = $('settings-back-label');
    if (backLabel) backLabel.textContent = from === 'pause' ? T.pause.title : T.menu.settings;
  }

  closeSettings() {
    $('screen-settings').classList.remove('open');
    if (this._settingsFrom === 'pause') $('screen-pause').classList.add('open');
    else if (this._settingsFrom === 'menu') this.show('screen-menu');
  }

  resetProgressFlow() {
    const btn = $('btn-reset');
    if (btn.dataset.confirm === '1') {
      this.save.resetProgress();
      btn.dataset.confirm = '';
      btn.textContent = T.settings.reset;
      this.toast(T.settings.resetDone);
      this._refreshBestLabels();
    } else {
      btn.dataset.confirm = '1';
      btn.textContent = 'Tekan lagi untuk konfirmasi…';
      setTimeout(() => { btn.dataset.confirm = ''; btn.textContent = T.settings.reset; }, 2600);
    }
  }

  _bindSettings() {
    const s = this.save.settings;
    $('set-sfx').addEventListener('change', () => { s.sfxOn = $('set-sfx').checked; this.save.saveSettings(); this.game.applySettings(); this.audio.play('ui'); });
    $('set-music').addEventListener('change', () => { s.musicOn = $('set-music').checked; this.save.saveSettings(); this.game.applySettings(); if (s.musicOn && this.game.mode === 'level') this.audio.startMusic(LEVEL_MUSIC[this.game.levelIdx]); });
    $('set-vol').addEventListener('input', () => { s.volume = $('set-vol').value / 100; this.save.saveSettings(); this.game.applySettings(); });
    $('set-reducefx').addEventListener('change', () => { s.reduceFx = $('set-reducefx').checked; this.save.saveSettings(); this.game.applySettings(); });
    document.querySelectorAll('input[name="touchmode"]').forEach((r) => r.addEventListener('change', () => {
      s.touchMode = document.querySelector('input[name="touchmode"]:checked').value;
      this.save.saveSettings();
      $('touch-controls').classList.toggle('on', $('hud').classList.contains('on') && this._touchVisible());
    }));
    $('settings-close').addEventListener('click', () => { this.audio.play('ui'); this.closeSettings(); });
    $('btn-reset').addEventListener('click', () => { this.audio.play('ui'); this.resetProgressFlow(); });
  }

  _touchVisible() {
    const mode = this.save.settings.touchMode;
    if (mode === 'on') return true;
    if (mode === 'off') return false;
    return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  // ---------- kontrol layar sentuh ----------
  _bindTouch() {
    const zone = $('touch-controls');
    for (const btn of zone.querySelectorAll('[data-btn]')) {
      const name = btn.dataset.btn;
      const press = (ev) => {
        ev.preventDefault();
        if (ev.changedTouches) { for (const t of ev.changedTouches) this._pt.set(t.identifier, name); }
        else this._pt.set(ev.pointerId ?? 1, name);
        btn.classList.add('active');
        this.game.input.setButton(name, true);
      };
      const release = (ev) => {
        ev.preventDefault();
        const ids = ev.changedTouches ? [...ev.changedTouches].map((t) => t.identifier) : [ev.pointerId ?? 1];
        for (const id of ids) if (this._pt.get(id) === name) this._pt.delete(id);
        if (![...this._pt.values()].includes(name)) {
          btn.classList.remove('active');
          this.game.input.setButton(name, false);
        }
      };
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('touchcancel', release, { passive: false });
      btn.addEventListener('mousedown', press);
      btn.addEventListener('mouseup', release);
      btn.addEventListener('mouseleave', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    // gerak halaman kunci saat bermain di layar sentuh
    const stopScroll = (e) => { if (e.cancelable) e.preventDefault(); };
    $('game-root').addEventListener('touchmove', stopScroll, { passive: false });
  }

  _pt = new Map();

  _bindPause() {
    $('btn-pause').addEventListener('click', () => this.pauseToggle());
    $('btn-resume').addEventListener('click', () => { this.audio.play('ui'); this.pauseToggle(); });
    $('btn-restart').addEventListener('click', () => { this.audio.play('ui'); this.onAction('restart'); });
    $('btn-pmenu').addEventListener('click', () => { this.audio.play('ui'); this.onAction('quit'); });
    $('btn-swap-naruto').addEventListener('click', () => { this.audio.play('ui'); this.onAction('swap', 'naruto'); });
    $('btn-swap-sasuke').addEventListener('click', () => { this.audio.play('ui'); this.onAction('swap', 'sasuke'); });
    $('btn-p-settings').addEventListener('click', () => {
      this.audio.play('ui');
      $('screen-pause').classList.remove('open');
      this.openSettings('pause');
    });
    $('btn-help').addEventListener('click', () => {
      this.audio.play('ui');
      $('screen-help').classList.add('open');
    });
    $('help-close').addEventListener('click', () => {
      this.audio.play('ui');
      $('screen-help').classList.remove('open');
    });
  }

  _bindMenu() {
    $('btn-play').addEventListener('click', () => { this.audio.play('ui'); this.openCharSelect(false); });
    $('btn-levels').addEventListener('click', () => { this.audio.play('ui'); this.openLevelSelect(); });
    $('btn-settings').addEventListener('click', () => { this.audio.play('ui'); this.openSettings('menu'); });
    $('btn-credits').addEventListener('click', () => { this.audio.play('ui'); this.show('screen-credits'); });
    $('btn-help-menu').addEventListener('click', () => { this.audio.play('ui'); $('screen-help').classList.add('open'); });
    $('credits-close').addEventListener('click', () => { this.audio.play('ui'); this.show('screen-menu'); });

    for (const id of ['naruto', 'sasuke']) {
      $(`char-card-${id}`).addEventListener('click', () => this.pickChar(id));
    }
    $('char-start').addEventListener('click', () => { this.audio.play('ui'); this.onAction('startFromChar'); });
    $('char-back').addEventListener('click', () => { this.audio.play('ui'); this.show('screen-menu'); });

    for (let i = 0; i < 3; i++) $(`lv-card-${i}`).addEventListener('click', () => this.clickLevel(i));
    $('levels-back').addEventListener('click', () => { this.audio.play('ui'); this.show('screen-menu'); });

    $('btn-retry').addEventListener('click', () => { this.audio.play('ui'); this.onAction('retryLevel'); });
    $('btn-next').addEventListener('click', () => { this.audio.play('ui'); this.onAction('nextLevel'); });
    $('btn-res-menu').addEventListener('click', () => { this.audio.play('ui'); this.onAction('quit'); });
  }
}

function setTextIf(el, v) {
  if (el && el.textContent !== v) el.textContent = v;
}

const LEVEL_MUSIC = ['village', 'bamboo', 'storm'];
