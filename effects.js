'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   EFFECTS — Cyber Runner & Arena
   Moteur d'effets visuels : particules 3D, secousse caméra, flash écran,
   glitch, vignette, lignes de vitesse canvas, scan de transition de monde.
   ═══════════════════════════════════════════════════════════════════════════ */
class EffectsManager {
  constructor(scene, camera) {
    this.scene    = scene;
    this.camera   = camera;
    this.particles = [];

    // Shake
    this.shakeMag     = 0;
    this.shakeDecay   = 0.86;
    this._camOffset   = new THREE.Vector3();
    this._camBaseSet  = false;
    this._camBase     = new THREE.Vector3();

    // Speed-lines canvas (2D overlay)
    this._canvas = null;
    this._ctx    = null;
    this._setupCanvas();
  }

  // ── Canvas 2D (speed lines + vignette dynamique) ──────────────────────
  _setupCanvas() {
    this._canvas = document.createElement('canvas');
    this._canvas.style.cssText =
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:6;';
    document.body.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
  }

  _resizeCanvas() {
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }

  /** Dessine les lignes de vitesse radiales selon le ratio 0-1. */
  drawSpeedLines(ratio) {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    if (ratio < 0.05) return;

    const cx = this._canvas.width  / 2;
    const cy = this._canvas.height / 2;
    const alpha = Math.min(ratio * 0.3, 0.25);
    const count = 28;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.04;
      const r0 = 160 + Math.random() * 40;
      const r1 = r0 + 70 + ratio * 260 + Math.random() * 60;
      const x0 = cx + Math.cos(angle) * r0, y0 = cy + Math.sin(angle) * r0;
      const x1 = cx + Math.cos(angle) * r1, y1 = cy + Math.sin(angle) * r1;
      const grad = ctx.createLinearGradient(x0, y0, x1, y1);
      grad.addColorStop(0, `rgba(0,255,204,0)`);
      grad.addColorStop(1, `rgba(0,255,204,${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 0.8 + Math.random() * 1.5;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }

  // ── Screen Shake ──────────────────────────────────────────────────────
  shake(magnitude = 0.35) {
    if (!this._camBaseSet) { this._camBase.copy(this.camera.position); this._camBaseSet = true; }
    this.shakeMag = Math.max(this.shakeMag, magnitude);
  }

  // ── Screen Flash ──────────────────────────────────────────────────────
  flash(color = 'rgba(0,255,204,0.3)', ms = 180) {
    const el = document.getElementById('screen-flash');
    if (!el) return;
    el.style.background = color;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, ms);
  }

  // ── Glitch Effect ─────────────────────────────────────────────────────
  glitch(ms = 600) {
    const el = document.getElementById('glitch-overlay');
    if (!el) return;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), ms);
  }

  // ── Danger Vignette ───────────────────────────────────────────────────
  vignette(color = '#ff0055', ms = 900) {
    const el = document.getElementById('danger-vignette');
    if (!el) return;
    el.style.boxShadow = `inset 0 0 140px ${color}`;
    el.style.opacity   = '1';
    setTimeout(() => { el.style.opacity = '0'; }, ms);
  }

  // ── World Scan Line ───────────────────────────────────────────────────
  worldScan(accentHex) {
    const el = document.getElementById('world-scan');
    if (!el) return;
    const col = '#' + accentHex.toString(16).padStart(6, '0');
    el.style.borderBottomColor = col;
    el.style.boxShadow = `0 0 24px ${col}`;
    el.classList.add('scanning');
    setTimeout(() => el.classList.remove('scanning'), 1400);
  }

  // ── Particle Burst 3D ─────────────────────────────────────────────────
  burst(pos, color = 0xffcc00, count = 10) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const p   = new THREE.Mesh(geo, mat);
      p.position.copy(pos);
      const a   = Math.random() * Math.PI * 2;
      const b   = Math.random() * Math.PI;
      const spd = 2.5 + Math.random() * 5;
      p.userData.vel = new THREE.Vector3(
        Math.sin(b) * Math.cos(a) * spd,
        1.5 + Math.abs(Math.cos(b)) * spd,
        Math.sin(b) * Math.sin(a) * spd
      );
      p.userData.life    = 0.6 + Math.random() * 0.5;
      p.userData.maxLife = p.userData.life;
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  /** Flash d'activation de power-up (couleur hexadécimale entière). */
  powerFlash(colorHex) {
    const r = (colorHex >> 16 & 0xff), g = (colorHex >> 8 & 0xff), b = (colorHex & 0xff);
    this.flash(`rgba(${r},${g},${b},0.22)`, 250);
    this.vignette(`rgb(${r},${g},${b})`, 700);
  }

  // ── UPDATE (appelé chaque frame) ──────────────────────────────────────
  update(dt) {
    // Shake camera
    if (this.shakeMag > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeMag;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeMag * 0.6;
      this.shakeMag *= this.shakeDecay;
    } else {
      this.shakeMag = 0;
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.vel.y -= 9.8 * dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.life -= dt;
      p.material.opacity = Math.max(0, p.userData.life / p.userData.maxLife);
      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose(); p.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }
}
