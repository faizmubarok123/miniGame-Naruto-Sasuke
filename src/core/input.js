// input.js — keyboard + tombol sentuh, edge-trigger untuk lompat/jurus/pause
import { CFG } from './config.js';

// Event name yang dikirim UI untuk menekan tombol
export const BTN = {
  left: 'left', right: 'right', jump: 'jump', special: 'special', pause: 'pause'
};

export class Input {
  constructor() {
    this.left = false;
    this.right = false;
    this.jumpHeld = false;

    // sinyal sekali-tekan (dikonsumsi game)
    this.jumpEdge = false;
    this.specialEdge = false;
    this.pauseEdge = false;

    this._jumpPressed = false; // anti auto-repeat
    this._kbJump = false;
    this._touchJump = false;

    this._bindKeys();
  }

  _bindKeys() {
    const down = (e) => {
      if (e.repeat) { e.preventDefault(); return; }
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') { this.left = true; this._block(e); }
      else if (code === 'ArrowRight' || code === 'KeyD') { this.right = true; this._block(e); }
      else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        if (!this._jumpPressed) { this._jumpPressed = true; this.jumpEdge = true; }
        this._kbJump = true;
        this.jumpHeld = true;
        this._block(e);
      }
      else if (code === 'KeyJ') { this.specialEdge = true; this._block(e); }
      else if (code === 'Escape' || code === 'KeyP') { this.pauseEdge = true; this._block(e); }
    };
    const up = (e) => {
      const code = e.code;
      if (code === 'ArrowLeft' || code === 'KeyA') this.left = false;
      else if (code === 'ArrowRight' || code === 'KeyD') this.right = false;
      else if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        this._kbJump = false;
        this._jumpPressed = false;
        this.jumpHeld = !!this._touchJump;
      }
    };
    addEventListener('keydown', down, { passive: false });
    addEventListener('keyup', up);
    // Jangan biarkan input "nyangkut" saat window kehilangan fokus
    addEventListener('blur', () => this.clear());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.clear(); });
  }

  _block(e) {
    // cegah scroll halaman dengan spasi/arrow saat bermain
    const tag = e.target && e.target.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') e.preventDefault();
  }

  // dipanggil overlay tombol sentuh; dikombinasikan dengan keyboard (OR)
  setButton(name, on) {
    if (name === BTN.jump) {
      this._touchJump = on;
      if (on && !this._jumpPressed) { this._jumpPressed = true; this.jumpEdge = true; }
      if (!on && !this._kbJump) this._jumpPressed = false;
      this.jumpHeld = on || !!this._kbJump;
    } else {
      this[name] = on;
    }
  }

  clear() {
    this.left = this.right = this.jumpHeld = false;
    this._jumpPressed = false;
  }

  // dipanggil oleh game setiap frame untuk mengubah sinyal menjadi aksi dengan buffering di sim
  consume() {
    const sig = {
      left: this.left,
      right: this.right,
      jumpHeld: this.jumpHeld,
      jumpEdge: this.jumpEdge,
      specialEdge: this.specialEdge,
      pauseEdge: this.pauseEdge
    };
    this.jumpEdge = this.specialEdge = this.pauseEdge = false;
    return sig;
  }

  // ambang untuk konstanta config
  get p() { return CFG.PCFG; }
}
