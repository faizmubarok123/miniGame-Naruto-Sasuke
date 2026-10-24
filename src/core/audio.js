// audio.js — SFX & musik prosedural via WebAudio, tanpa file aset (bebas hak cipta)
import { clamp } from './util.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.unlocked = false;       // dibuka pada interaksi pengguna pertama
    this.state = { sfxOn: true, musicOn: true, volume: 0.8 };
  }

  apply(s) {
    this.state = { sfxOn: s.sfxOn, musicOn: s.musicOn, volume: s.volume };
    if (this.master) this.master.gain.value = clamp(s.volume, 0, 1);
    if (this.musicGain) {
      this.musicGain.gain.value = s.musicOn ? 0.16 : 0;
      if (!s.musicOn) this.stopMusic();
    }
  }

  // Panggil pada gesture pertama (tap/klik/tekan) untuk obey autoplay policy
  unlock() {
    if (this.unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = clamp(this.state.volume, 0, 1);
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.state.sfxOn ? 1 : 0;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.state.musicOn ? 0.16 : 0;
      this.musicGain.connect(this.master);
      this.unlocked = true;
      if (this.state.musicOn && this._pendingMusic !== undefined) this.startMusic(this._pendingMusic);
    } catch {
      this.unlocked = false; // audio tidak tersedia: game tetap main tanpa suara
    }
  }

  // ---------- SFX builder ----------
  _tone({ type = 'sine', f0 = 440, f1 = null, t = 0.15, v = 0.5, delay = 0, curve = 'exp' }) {
    if (!this.unlocked || !this.state.sfxOn || !this.ctx) return;
    const c = this.ctx;
    const at = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, f0), at);
    if (f1 != null) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + t);
      else osc.frequency.linearRampToValueAtTime(Math.max(20, f1), at + t);
    }
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + t);
    osc.connect(g); g.connect(this.sfxGain);
    osc.start(at); osc.stop(at + t + 0.05);
  }

  _noise({ t = 0.15, v = 0.3, f = 1200, q = 1, delay = 0, sweepTo = null }) {
    if (!this.unlocked || !this.state.sfxOn || !this.ctx) return;
    const c = this.ctx;
    const len = Math.max(1, Math.floor(c.sampleRate * t));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), c.currentTime + delay + t);
    const g = c.createGain();
    g.gain.value = v;
    src.connect(bp); bp.connect(g); g.connect(this.sfxGain);
    src.start(c.currentTime + delay);
  }

  play(name) {
    if (!this.unlocked || !this.ctx || !this.state.sfxOn) return;
    switch (name) {
      case 'jump': this._tone({ type: 'square', f0: 240, f1: 620, t: 0.16, v: 0.22 }); this._noise({ t: 0.08, v: 0.05, f: 900 }); break;
      case 'land': this._noise({ t: 0.1, v: 0.16, f: 300, q: 0.8 }); break;
      case 'coin': this._tone({ type: 'sine', f0: 988, t: 0.09, v: 0.35 }); this._tone({ type: 'sine', f0: 1319, t: 0.22, v: 0.3, delay: 0.07 }); break;
      case 'star':
        [660, 880, 1108, 1318].forEach((f, i) => this._tone({ type: 'triangle', f0: f, t: 0.18, v: 0.3, delay: i * 0.07 }));
        break;
      case 'stomp': this._tone({ type: 'triangle', f0: 320, f1: 90, t: 0.14, v: 0.4, curve: 'exp' }); this._noise({ t: 0.09, v: 0.2, f: 500 }); break;
      case 'hurt': this._tone({ type: 'sawtooth', f0: 380, f1: 110, t: 0.28, v: 0.3 }); break;
      case 'checkpoint': this._tone({ type: 'triangle', f0: 523, t: 0.14, v: 0.3 }); this._tone({ type: 'triangle', f0: 784, t: 0.3, v: 0.3, delay: 0.12 }); break;
      case 'goal':
        [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
          this._tone({ type: 'triangle', f0: f, t: 0.3, v: 0.28, delay: i * 0.1 }));
        this._tone({ type: 'sine', f0: 261, f1: 130, t: 0.7, v: 0.2, delay: 0.5 });
        break;
      case 'block': this._tone({ type: 'square', f0: 190, f1: 120, t: 0.09, v: 0.28 }); this._noise({ t: 0.06, v: 0.12, f: 700 }); break;
      case 'dash':
        this._noise({ t: 0.22, v: 0.3, f: 2200, sweepTo: 300, q: 2 });
        this._tone({ type: 'sawtooth', f0: 180, f1: 720, t: 0.2, v: 0.16 });
        break;
      case 'zap': this._tone({ type: 'sawtooth', f0: 1400, f1: 220, t: 0.16, v: 0.2 }); this._noise({ t: 0.14, v: 0.2, f: 3000, sweepTo: 600, q: 3 }); break;
      case 'ui': this._tone({ type: 'sine', f0: 740, t: 0.06, v: 0.18 }); break;
      case 'unlock': [784, 1046, 1318].forEach((f, i) => this._tone({ type: 'sine', f0: f, t: 0.16, v: 0.25, delay: i * 0.08 })); break;
      case 'swoosh': this._noise({ t: 0.12, v: 0.08, f: 1600, sweepTo: 400, q: 1.5 }); break;
    }
  }

  // ---------- Musik: sekuens pentatonik ringan, per-level tinta warna ----------
  startMusic(scaleKey = 'village') {
    if (!this.unlocked || !this.ctx) { this._pendingMusic = scaleKey; return; }
    if (this._musicTimer) return;
    this._pendingMusic = scaleKey;
    const scales = {
      village: { root: 220.0, notes: [0, 2, 4, 7, 9, 12, 14, 16, 19], bpm: 96 },   // penta mayor
      bamboo: { root: 196.0, notes: [0, 3, 5, 7, 10, 12, 15, 17, 19], bpm: 88 },   // penta minor lembut
      storm: { root: 233.08, notes: [0, 2, 5, 7, 9, 12, 14, 17], bpm: 104 }
    };
    const sc = scales[scaleKey] || scales.village;
    const beat = 60 / sc.bpm;
    let step = 0;
    let nextTime = this.ctx.currentTime + 0.1;

    const noteFreq = (i) => sc.root * Math.pow(2, sc.notes[i % sc.notes.length] / 12);

    // pola melodik 2-wadah (embel penta) — masuk lewat index acak yang konsisten per step
    const melody = [0, 4, 2, 4, 0, 5, 4, 2, 3, 4, 5, 7, 5, 4, 2, 4];

    const schedule = () => {
      if (!this.ctx) { this.stopMusic(); return; }
      while (nextTime < this.ctx.currentTime + 0.25) {
        const at = nextTime;
        const s = step % 16;
        // melodi pluck lembut (koto-like) tiap dua nada decide
        if (s % 2 === 0) {
          this._pluck(noteFreq(melody[step % 16]), at, beat * 0.9, this.musicGain);
        }
        // bass tiap 4 step
        if (s % 4 === 0) {
          const b = noteFreq(s === 8 ? 0 : (s === 12 ? 2 : 0)) / 2;
          this._pluck(b, at, beat * 1.6, this.musicGain, 0.5, 'sine');
        }
        // keherangan hidup: blok kayu ringan
        if (s === 4 || s === 12) this._tick(at);
        nextTime += beat / 2;
        step++;
      }
      this._musicTimer = setTimeout(schedule, 80);
    };
    schedule();
  }

  _pluck(freq, at, dur, dest, vel = 1, type = 'triangle') {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.5 * vel, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest || this.musicGain);
    o.start(at); o.stop(at + dur + 0.05);
  }

  _tick(at) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = 1900;
    const g = c.createGain();
    g.gain.setValueAtTime(0.03, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    o.connect(g); g.connect(this.musicGain);
    o.start(at); o.stop(at + 0.06);
  }

  stopMusic() {
    this._pendingMusic = undefined;
    if (this._musicTimer) { clearTimeout(this._musicTimer); this._musicTimer = null; }
  }
}
