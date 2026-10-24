// fx.js — partikel & efek visual (hanya renderer, tidak memengaruhi gameplay)
import { rand } from '../core/util.js';

export class Fx {
  constructor() {
    this.parts = [];
    this.texts = [];
    this.arcs = [];       // kilat (Sasuke dash)
    this.ghosts = [];     // bayangan klon (Naruto dash): menyimpan pose & pos
    this.max = 260;       // batas performa
  }

  spawn(p) {
    if (this.parts.length >= this.max) this.parts.shift();
    this.parts.push(p);
  }

  dust(x, y, n = 5, col = '#e8dcc8') {
    for (let i = 0; i < n; i++) {
      this.spawn({ t: 'dust', x, y, vx: rand(-50, 50), vy: rand(-70, -10), life: rand(0.25, 0.5), age: 0, size: rand(2, 5), col });
    }
  }

  coin(x, y) {
    for (let i = 0; i < 7; i++) {
      const a = rand(0, Math.PI * 2);
      this.spawn({ t: 'spark', x, y, vx: Math.cos(a) * rand(30, 110), vy: Math.sin(a) * rand(30, 110) - 40, life: rand(0.3, 0.6), age: 0, size: rand(2, 4), col: i % 2 ? '#ffd44d' : '#fff3b0' });
    }
    this.text(x, y - 14, '+10', '#ffd23e');
  }

  star(x, y) {
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.spawn({ t: 'spark', x, y, vx: Math.cos(a) * rand(60, 170), vy: Math.sin(a) * rand(60, 170), life: rand(0.4, 0.8), age: 0, size: rand(2, 5), col: i % 2 ? '#ffe982' : '#fff' });
    }
    this.text(x, y - 16, '+200', '#ffe982');
  }

  poof(x, y, col = '#f5f0e6', n = 10) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      const sp = rand(40, 130);
      this.spawn({ t: 'poof', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, life: rand(0.35, 0.6), age: 0, size: rand(4, 9), col });
    }
  }

  dashClone(x, y, dir, img, normX, normY, anim) {
    this.ghosts.push({ x, y, dir, img, age: 0, life: 0.36, normX, normY, anim });
  }

  lightning(x, y, dir, col = '#a68cff') {
    const pts = [{ x, y }];
    let cx = x, cy = y;
    const n = 6 + ((Math.random() * 3) | 0);
    for (let i = 1; i <= n; i++) {
      cx += dir * rand(18, 30);
      cy += rand(-14, 14);
      pts.push({ x: cx, y: cy });
    }
    this.arcs.push({ pts, age: 0, life: 0.3, col });
    for (let i = 0; i < 8; i++) {
      this.spawn({ t: 'spark', x: cx + rand(-8, 8), y: cy + rand(-8, 8), vx: rand(-60, 60), vy: rand(-60, 30), life: rand(0.2, 0.5), age: 0, size: rand(2, 4), col: col });
    }
  }

  confetti(x, y, n = 26, cols = ['#ff8d2a', '#ffd23e', '#7ecbff', '#8ffb9d', '#ff7fb5']) {
    for (let i = 0; i < n; i++) {
      this.spawn({ t: 'confetti', x, y, vx: rand(-160, 160), vy: rand(-260, -60), life: rand(0.8, 1.6), age: 0, size: rand(3, 6), col: cols[(Math.random() * cols.length) | 0], rot: rand(0, 6), vr: rand(-8, 8) });
    }
  }

  heal(x, y) {
    this.spawn({ t: 'heart', x, y, vx: 0, vy: -60, life: 0.9, age: 0, size: 10, col: '#ff7f9e' });
  }

  text(x, y, str, col = '#fff') {
    if (this.texts.length > 40) this.texts.shift();
    this.texts.push({ x, y, str, col, age: 0, life: 0.8 });
  }

  update(dt) {
    for (const p of this.parts) {
      p.age += dt;
      if (p.t === 'confetti' || p.t === 'heart') p.vy += (p.t === 'confetti' ? 150 : 240) * dt;
      if (p.t === 'poof') { p.vx *= 0.92; p.vy *= 0.92; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
    for (const t of this.texts) { t.age += dt; t.y -= 32 * dt; }
    this.texts = this.texts.filter((t) => t.age < t.life);
    for (const a of this.arcs) a.age += dt;
    this.arcs = this.arcs.filter((a) => a.age < a.life);
    for (const g of this.ghosts) g.age += dt;
    this.ghosts = this.ghosts.filter((g) => g.age < g.life);
  }

  draw(ctx, cam) {
    // bayangan klon
    for (const g of this.ghosts) {
      const al = (1 - g.age / g.life) * 0.55;
      ctx.save();
      ctx.globalAlpha = al;
      ctx.drawImage(g.img, (g.x - cam.x) * cam.z - g.img.width * g.normX, (g.y - cam.y) * cam.z - g.img.height * g.normY, g.img.width * cam.z, g.img.height * cam.z);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    // kilat
    for (const a of this.arcs) {
      ctx.save();
      ctx.globalAlpha = (1 - a.age / a.life);
      ctx.strokeStyle = a.col;
      ctx.lineWidth = 3 * cam.z;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      a.pts.forEach((p, i) => { const sx = (p.x - cam.x) * cam.z, sy = (p.y - cam.y) * cam.z; i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
      ctx.stroke();
      ctx.lineWidth = 1.4 * cam.z;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    }
    // partikel
    for (const p of this.parts) {
      const a = 1 - p.age / p.life;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.col;
      if (p.t === 'confetti') {
        ctx.translate((p.x - cam.x) * cam.z, (p.y - cam.y) * cam.z);
        ctx.rotate(p.rot + p.age * p.vr);
        ctx.fillRect(-p.size / 2 * cam.z, -p.size / 2 * cam.z, p.size * cam.z, p.size * 0.6 * cam.z);
      } else if (p.t === 'heart') {
        ctx.globalAlpha = a;
        ctx.font = `${(p.size * 2) | 0}px sans-serif`;
        ctx.fillText('♥', (p.x - cam.x) * cam.z, (p.y - cam.y) * cam.z);
      } else {
        const r = p.size * (p.t === 'poof' ? (0.6 + a) : a) * cam.z;
        ctx.beginPath();
        ctx.arc((p.x - cam.x) * cam.z, (p.y - cam.y) * cam.z, Math.max(1, r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // teks melayang
    for (const t of this.texts) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - t.age / t.life) * 1.6);
      ctx.font = `bold ${Math.round(16 * cam.z)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(35,28,50,0.8)';
      ctx.fillText(t.str, (t.x - cam.x) * cam.z + 1.5, (t.y - cam.y) * cam.z + 1.5);
      ctx.fillStyle = t.col;
      ctx.fillText(t.str, (t.x - cam.x) * cam.z, (t.y - cam.y) * cam.z);
      ctx.restore();
    }
  }
}

// ambient: kupu-kupu, burung, daun (terpisah karena hidup terus tanpa event)
export class Ambient {
  constructor(theme) {
    this.theme = theme;
    this.bugs = [];
    this.birds = [];
    this.t = 0;
    this.nextBird = 3;
  }

  update(dt, camWorld) {
    this.t += dt;
    // kupu-kupu mengikuti area kamera
    if (Math.random() < dt * 2 && this.bugs.length < 7) {
      this.bugs.push({
        x: camWorld.x + rand(-360, 660), y: camWorld.y + rand(-60, -10),
        phase: rand(0, 6), col: Math.random() < 0.5 ? '#ffb3d9' : '#8fd0ff', age: 0
      });
    }
    for (const b of this.bugs) {
      b.age += dt; b.phase += dt * 6;
      b.x += Math.sin(b.phase * 0.7) * 26 * dt;
      b.y += Math.cos(b.phase * 1.3) * 34 * dt;
    }
    this.bugs = this.bugs.filter((b) => b.age < 20 && Math.abs(b.x - camWorld.x) < 560);
    // burung lewat
    this.nextBird -= dt;
    if (this.nextBird <= 0) {
      this.nextBird = rand(6, 14);
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.birds.push({ x: camWorld.x - dir * 500, y: camWorld.y + rand(-260, -80), dir, speed: rand(70, 120), phase: rand(0, 5) });
    }
    for (const b of this.birds) {
      b.x += b.dir * b.speed * dt;
      b.y += Math.sin(this.t * 2 + b.phase) * 14 * dt;
      b.phase += dt;
    }
    this.birds = this.birds.filter((b) => Math.abs(b.x - camWorld.x) < 700);
  }

  draw(ctx, cam, viewW, viewH) {
    // burung (di lapisan langit, dipanggil sebelum world)
    ctx.save();
    ctx.strokeStyle = 'rgba(60,60,90,0.75)';
    ctx.lineWidth = Math.max(1.5, 2 * cam.z);
    for (const b of this.birds) {
      const sx = (b.x - cam.x) * cam.z, sy = (b.y - cam.y) * cam.z;
      if (sx < -60 * cam.z || sx > (viewW + 60) * cam.z) continue;
      const f = Math.sin(b.phase * 10) * 4;
      ctx.beginPath();
      ctx.moveTo(sx - 6 * cam.z, sy + f * cam.z);
      ctx.quadraticCurveTo(sx - 2 * cam.z, sy - 4 * cam.z, sx, sy);
      ctx.quadraticCurveTo(sx + 2 * cam.z, sy - 4 * cam.z, sx + 6 * cam.z, sy + f * cam.z);
      ctx.stroke();
    }
    // kupu-kupu (di atas dunia)
    for (const b of this.bugs) {
      const sx = (b.x - cam.x) * cam.z, sy = (b.y - cam.y) * cam.z;
      if (sy > (viewH + 30) * cam.z) continue;
      const flap = Math.abs(Math.sin(b.phase * 3));
      ctx.fillStyle = b.col;
      ctx.beginPath();
      ctx.ellipse(sx - 3 * cam.z, sy, 3 * cam.z * flap + 1, 3 * cam.z, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + 3 * cam.z, sy, 3 * cam.z * flap + 1, 3 * cam.z, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a4438';
      ctx.fillRect(sx - 0.6 * cam.z, sy - 2 * cam.z, 1.2 * cam.z, 4 * cam.z);
    }
    ctx.restore();
  }
}
