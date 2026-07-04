'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   UI MANAGER — Cyber Runner & Arena
   Centralise toutes les mises à jour DOM du HUD.
   Instancié dans main.js → window.ui
   ═══════════════════════════════════════════════════════════════════════════ */
class UIManager {
  constructor() {
    this._q = id => document.getElementById(id);

    // Refs fréquentes
    this._scoreEl  = this._q('hud-score-val');
    this._multEl   = this._q('score-multiplier');
    this._credEl   = this._q('hud-credits-val');
    this._speedBar = this._q('hud-speed-bar');
    this._worldEl  = this._q('world-badge');
    this._puEl     = this._q('powerup-slots');
    this._scanEl   = this._q('scanner-alert');
    this._lbEl     = this._q('leaderboard-list');
    this._notifEl  = this._q('notif-stack');
  }

  // ── Score ──────────────────────────────────────────────────────────────
  setScore(score, multiplier = 1) {
    if (this._scoreEl) this._scoreEl.textContent = score.toLocaleString();
    if (this._multEl)  this._multEl.style.display = multiplier > 1 ? 'inline' : 'none';
  }

  // ── Crédits ────────────────────────────────────────────────────────────
  setCredits(n) {
    if (this._credEl) this._credEl.textContent = n;
  }

  /** Incrémente le compteur de crédits et l'anime brièvement. */
  addCredit() {
    const el = this._q('hud-credits-val');
    if (!el) return;
    el.textContent = parseInt(el.textContent || 0) + 1;
    el.classList.remove('credit-pop');
    void el.offsetWidth; // reflow
    el.classList.add('credit-pop');
  }

  // ── Vitesse ────────────────────────────────────────────────────────────
  setSpeed(speed, maxSpeed) {
    if (!this._speedBar) return;
    const ratio = Math.min(speed / maxSpeed, 1);
    this._speedBar.style.width = ratio * 100 + '%';
    // cyan → rouge selon la vitesse
    const r = Math.floor(ratio * 255);
    const g = Math.floor((1 - ratio * 0.7) * 255);
    this._speedBar.style.background =
      `linear-gradient(90deg, rgb(0,${g},${255 - r}), rgb(${r},${g},0))`;
  }

  // ── Monde ──────────────────────────────────────────────────────────────
  setWorldBadge(world) {
    if (this._worldEl)
      this._worldEl.innerHTML = `${world.icon} <span>${world.name.toUpperCase()}</span>`;
  }

  showWorldChange(world, effects) {
    const el = this._q('world-change-overlay');
    if (!el) return;
    const idx = CONFIG.WORLDS.indexOf(world) + 1;
    el.innerHTML = `
      <div class="wc-icon">${world.icon}</div>
      <div class="wc-name">${world.name}</div>
      <div class="wc-sub">MONDE ${idx} / 15</div>`;
    el.classList.add('show');
    if (effects) effects.worldScan(world.accent);
    setTimeout(() => el.classList.remove('show'), CONFIG.UI.WORLD_NOTIF_DURATION);
  }

  // ── Scanner ────────────────────────────────────────────────────────────
  showScannerAlert(world) {
    if (!this._scanEl) return;
    this._scanEl.innerHTML = `⚠️ SCANNER — ${world.icon} <em>${world.name}</em> dans 2s`;
    this._scanEl.classList.add('active');
    setTimeout(() => this._scanEl.classList.remove('active'), CONFIG.UI.SCANNER_ALERT_DURATION);
  }

  // ── Power-ups actifs (runner) ──────────────────────────────────────────
  setPowerUps(activeMap) {
    if (!this._puEl) return;
    const info = CONFIG.RUNNER_POWERUPS;
    this._puEl.innerHTML = Object.keys(activeMap)
      .map(t => {
        const p = info[t] || { icon:'⚡', label: t, color:'#fff' };
        return `<div class="pu-slot" style="--col:${p.color}">
          <span class="pu-icon">${p.icon}</span>
          <span class="pu-label">${p.label}</span>
        </div>`;
      }).join('');
  }

  // ── Leaderboard ────────────────────────────────────────────────────────
  updateLeaderboard(lb, myName) {
    if (!this._lbEl) return;
    this._lbEl.innerHTML = lb.map((p, i) => `
      <div class="lb-row${p.name === myName ? ' me' : ''}">
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${p.name}</span>
        <span class="lb-score">${p.score}m</span>
      </div>`).join('');
  }

  // ── Notifications empilées ─────────────────────────────────────────────
  /**
   * @param {string} text   — HTML court
   * @param {'info'|'warn'|'danger'|'power'|'credit'} type
   */
  notify(text, type = 'info') {
    if (!this._notifEl) return;
    const el = document.createElement('div');
    el.className = `notif-item notif-${type}`;
    el.innerHTML = text;
    this._notifEl.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show'); el.classList.add('hide');
      setTimeout(() => el.remove(), 400);
    }, CONFIG.UI.NOTIF_DURATION);
  }

  // ── Arène ──────────────────────────────────────────────────────────────
  setArenaRole(role) {
    const el = this._q('arena-role');
    if (!el) return;
    el.className = `arena-role-badge visible ${role}`;
    el.innerHTML  = role === 'gendarme' ? '🚔 GENDARME' : '🏃 VOLEUR';
  }

  setArenaScore(data) {
    const el = this._q('arena-score');
    if (!el) return;
    el.className = 'visible';
    el.innerHTML = `🚔 ${data.gendarmes} — 🏃 ${data.voleurs}`;
  }

  // ── Affiche / masque les éléments multijoueur ──────────────────────────
  showMultiElements(show) {
    this._q('leaderboard-box')?.classList.toggle('visible', show);
    this._q('chat-help')?.classList.toggle('visible', show);
  }

  // ── Arena powers HUD ───────────────────────────────────────────────────
  showPowersHUD(show) {
    this._q('powers-hud')?.classList.toggle('visible', show);
  }

  buildPowersHUD() {
    const container = this._q('powers-hud');
    if (!container) return;
    container.innerHTML = Object.entries(CONFIG.ARENA_POWERS)
      .map(([id, p]) => `
        <div class="power-slot" id="ps-${id}" style="--col:${p.color}">
          <span class="ps-icon">${p.icon}</span>
          <span class="ps-key">[${p.key}]</span>
        </div>`).join('');
  }

  setPowerSlotState(id, state) {
    const el = this._q(`ps-${id}`);
    if (!el) return;
    el.className = 'power-slot ' + state;
    el.style.setProperty('--col', CONFIG.ARENA_POWERS[id]?.color || '#fff');
  }
}

/** Compatibilité : appelable depuis player.js, trackSolo.js etc. */
function createTmpNotification(text, type = 'info') {
  if (window.ui) window.ui.notify(text, type);
}
