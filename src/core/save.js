// save.js — model progres & pengaturan yang persisten
import { readJSON, writeJSON, removeKey } from './storage.js';

export const CHAR_IDS = ['naruto', 'sasuke'];

const DEFAULT_SAVE = {
  unlocked: 1,                       // jumlah level yang terbuka (1..3)
  best: { 1: null, 2: null, 3: null } // per level: { score, coins, stars, deaths, time }
};

const DEFAULT_SETTINGS = {
  charId: 'naruto',
  sfxOn: true,
  musicOn: true,
  volume: 0.8,
  reduceFx: false,
  touchMode: 'auto'                  // 'auto' | 'on' | 'off'
};

export class SaveStore {
  constructor() {
    this.progress = { ...DEFAULT_SAVE, best: { ...DEFAULT_SAVE.best } };
    this.settings = { ...DEFAULT_SETTINGS };
    this.load();
  }

  load() {
    const p = readJSON('progress', DEFAULT_SAVE);
    if (p && typeof p.unlocked === 'number' && p.unlocked >= 1 && p.unlocked <= 3) {
      this.progress.unlocked = Math.floor(p.unlocked);
      for (const k of [1, 2, 3]) {
        const b = p.best && p.best[k];
        if (b && typeof b.score === 'number') {
          this.progress.best[k] = {
            score: b.score | 0,
            coins: b.coins | 0,
            stars: b.stars | 0,
            deaths: b.deaths | 0,
            time: +b.time || 0
          };
        }
      }
    }
    const s = readJSON('settings', DEFAULT_SETTINGS);
    if (s) {
      this.settings.charId = CHAR_IDS.includes(s.charId) ? s.charId : DEFAULT_SETTINGS.charId;
      this.settings.sfxOn = !!s.sfxOn;
      this.settings.musicOn = !!s.musicOn;
      this.settings.volume = Math.min(1, Math.max(0, +s.volume || 0));
      this.settings.reduceFx = !!s.reduceFx;
      this.settings.touchMode = ['auto', 'on', 'off'].includes(s.touchMode) ? s.touchMode : 'auto';
    }
  }

  saveProgress() { writeJSON('progress', this.progress); }
  saveSettings() { writeJSON('settings', this.settings); }

  unlockLevel(n) {
    if (n > this.progress.unlocked && n <= 3) {
      this.progress.unlocked = n;
      this.saveProgress();
      return true;
    }
    return false;
  }

  recordLevelResult(level, res) {
    const prev = this.progress.best[level];
    const cur = { score: res.score, coins: res.coins, stars: res.stars, deaths: res.deaths, time: res.time };
    if (!prev || cur.score > prev.score) {
      this.progress.best[level] = cur;
      this.saveProgress();
      return true;
    }
    return false;
  }

  bestOf(level) { return this.progress.best[level]; }

  resetProgress() {
    removeKey('progress');
    this.progress = { unlocked: 1, best: { 1: null, 2: null, 3: null } };
    this.saveProgress();
  }

  setChar(id) {
    if (CHAR_IDS.includes(id) && id !== this.settings.charId) {
      this.settings.charId = id;
      this.saveSettings();
      return true;
    }
    return false;
  }

  get charId() { return this.settings.charId; }
}
