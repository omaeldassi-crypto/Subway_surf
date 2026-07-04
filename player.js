'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   PLAYER — Cyber Runner & Arena
   ─ Runner : avance auto, 3 voies, gravité, sauts, physique vent
   ─ Arène  : déplacement libre WASD, pas de gravité
   ─ Équipements permanents + 5 power-ups temporaires
   ═══════════════════════════════════════════════════════════════════════════ */
class Player {
  constructor(scene, characterName = 'Chaser-01') {
    this.scene         = scene;
    this.characterName = characterName;
    this.name          = characterName;
    this.mode          = 'runner'; // 'runner' | 'arena'

    // ── Physique runner ────────────────────────────────────────────────
    this.speed       = CONFIG.PLAYER.BASE_SPEED;
    this.velocityY   = 0;
    this.isGrounded  = true;
    this.currentLane = 0;
    this.targetLaneX = 0;

    // ── Équipements permanents ─────────────────────────────────────────
    this.equipped = { body:'none', boots:'none', scanner:'none' };

    // ── Power-ups actifs {type:{active,timer,...}} ─────────────────────
    this.activePowerUps = {};
    this.shieldMesh     = null;

    // ── Contrôles ─────────────────────────────────────────────────────
    this.keys = {};

    // ── Mesh ──────────────────────────────────────────────────────────
    this.mesh = this._buildMesh();
    scene.add(this.mesh);
    this._bindControls();
    this._loadEquipment();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  MESH — personnage cyberpunk angulaire
  // ═══════════════════════════════════════════════════════════════════════
  _buildMesh() {
    const g   = new THREE.Group();
    const M   = (col, em = 0x000000, ei = 0) =>
      new THREE.MeshStandardMaterial({ color:col, emissive:em, emissiveIntensity:ei, metalness:0.75, roughness:0.2 });

    // Jambes
    [[-0.22, 0.3], [0.22, 0.3]].forEach(([x, y]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.6, 0.21), M(0x003355));
      leg.position.set(x, y, 0); g.add(leg);
    });

    // Torse
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.75, 0.38), M(0x00aacc, 0x003344, 0.45));
    torso.position.y = 0.9; g.add(torso);

    // Bras
    [[-0.53, 0.88], [0.53, 0.88]].forEach(([x, y]) => {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 0.19), M(0x005577));
      arm.position.set(x, y, 0); g.add(arm);
    });

    // Tête
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.46), M(0x00ccff, 0x002233, 0.22));
    head.position.y = 1.56; g.add(head);

    // Visière néon (identité visuelle forte)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.12, 0.08), M(0xff0055, 0xff0055, 2.8));
    visor.position.set(0, 1.56, 0.25); g.add(visor);

    // Sac à dos tech
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.13), M(0x004455, 0x00ffcc, 0.15));
    pack.position.set(0, 0.94, -0.25); g.add(pack);

    // Lumière portée (glow subtil sur la piste)
    this._glow = new THREE.PointLight(0x00ffcc, 0.8, 5);
    this._glow.position.set(0, 0.5, 0);
    g.add(this._glow);

    return g;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CONTRÔLES
  // ═══════════════════════════════════════════════════════════════════════
  _bindControls() {
    window.addEventListener('keydown', e => {
      if (this.keys[e.code]) return;
      this.keys[e.code] = true;
      if (this.mode === 'runner') this._onRunnerKey(e.code);
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  _onRunnerKey(code) {
    const LW = CONFIG.PLAYER.LANE_WIDTH;
    if ((code === 'ArrowLeft'  || code === 'KeyA') && this.currentLane > -1) {
      this.currentLane--; this.targetLaneX = this.currentLane * LW;
    }
    if ((code === 'ArrowRight' || code === 'KeyD') && this.currentLane < 1) {
      this.currentLane++; this.targetLaneX = this.currentLane * LW;
    }
    if ((code === 'Space' || code === 'ArrowUp' || code === 'KeyW') && this.isGrounded) {
      this._jump();
    }
  }

  _jump() {
    this.isGrounded = false;
    const boost = this.equipped.boots === 'gravity_boots' ? 1.45 : 1;
    this.velocityY = CONFIG.PLAYER.JUMP_FORCE * boost;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ÉQUIPEMENTS
  // ═══════════════════════════════════════════════════════════════════════
  _loadEquipment() {
    try {
      const s = localStorage.getItem('playerEquipment');
      if (s) Object.assign(this.equipped, JSON.parse(s));
    } catch (_) {}
    window.playerEquipment = this.equipped;
  }

  equip(slot, item) {
    this.equipped[slot] = item;
    window.playerEquipment = this.equipped;
    try { localStorage.setItem('playerEquipment', JSON.stringify(this.equipped)); } catch (_) {}
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  POWER-UPS
  // ═══════════════════════════════════════════════════════════════════════
  activatePowerUp(type) {
    // Réinitialise le timer existant
    if (this.activePowerUps[type]) {
      clearTimeout(this.activePowerUps[type].timer);
      this._clearPowerFx(type);
    }

    const entry = { active: true, timer: null };

    switch (type) {
      case 'shield':
        this._addShieldFx();
        break;
      case 'multiplier':
        window.scoreMultiplier = 2;
        break;
      case 'jetpack':
        entry.targetY = CONFIG.PLAYER.JETPACK_HEIGHT;
        break;
    }

    entry.timer = setTimeout(() => {
      this._clearPowerFx(type);
      delete this.activePowerUps[type];
      if (window.ui) window.ui.setPowerUps(this.activePowerUps);
    }, CONFIG.POWERUP.DURATION);

    this.activePowerUps[type] = entry;
    if (window.ui) {
      window.ui.setPowerUps(this.activePowerUps);
      window.ui.notify(`${CONFIG.RUNNER_POWERUPS[type]?.icon || '⚡'} <b>${CONFIG.RUNNER_POWERUPS[type]?.label || type}</b> activé !`, 'power');
    }
  }

  _clearPowerFx(type) {
    if (type === 'shield')     this._removeShieldFx();
    if (type === 'multiplier') window.scoreMultiplier = 1;
  }

  hasPowerUp(type) { return !!this.activePowerUps[type]?.active; }

  /** Absorbe une collision avec le bouclier. Retourne true si consommé. */
  consumeShield() {
    if (!this.hasPowerUp('shield')) return false;
    clearTimeout(this.activePowerUps['shield'].timer);
    this._clearPowerFx('shield');
    delete this.activePowerUps['shield'];
    if (window.ui) window.ui.setPowerUps(this.activePowerUps);
    return true;
  }

  _addShieldFx() {
    this._removeShieldFx();
    const mat = new THREE.MeshStandardMaterial({
      color:0x00ffcc, emissive:0x00ffcc, emissiveIntensity:0.8,
      transparent:true, opacity:0.2, wireframe:true
    });
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 14), mat);
    this.shieldMesh.position.y = 0.85;
    this.mesh.add(this.shieldMesh);
  }

  _removeShieldFx() {
    if (this.shieldMesh) { this.mesh.remove(this.shieldMesh); this.shieldMesh = null; }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UPDATE — appelé chaque frame
  // ═══════════════════════════════════════════════════════════════════════
  update(windForce = 0, dt = 0.016, credits = []) {
    if (!this.mesh) return;
    this.mode === 'runner'
      ? this._updateRunner(windForce, dt, credits)
      : this._updateArena(dt);

    // Glow couleur selon équipement
    if (this._glow) {
      this._glow.intensity = 0.6 + Math.sin(Date.now() * 0.003) * 0.15;
    }

    // Animation bouclier
    if (this.shieldMesh) {
      this.shieldMesh.rotation.y += 0.03;
      this.shieldMesh.material.opacity = 0.16 + Math.sin(Date.now() * 0.005) * 0.07;
    }
  }

  _updateRunner(wind, dt, credits) {
    const GROUND = 0;

    // Jetpack : lévitation
    if (this.hasPowerUp('jetpack')) {
      const tY = this.activePowerUps.jetpack?.targetY ?? CONFIG.PLAYER.JETPACK_HEIGHT;
      this.mesh.position.y += (tY - this.mesh.position.y) * 0.1;
      this.velocityY = 0; this.isGrounded = false;
    } else {
      // Gravité
      this.velocityY += CONFIG.PLAYER.GRAVITY * dt;
      // Boots de gravité : chute ralentie
      if (this.equipped.boots === 'gravity_boots' && this.velocityY < 0)
        this.velocityY *= 0.9;
      this.mesh.position.y += this.velocityY * dt;
      if (this.mesh.position.y <= GROUND) {
        this.mesh.position.y = GROUND; this.velocityY = 0; this.isGrounded = true;
      }
    }

    // Changement de voie (lissé)
    this.mesh.position.x +=
      (this.targetLaneX - this.mesh.position.x) * CONFIG.PLAYER.LANE_SNAP;

    // Vent
    if (wind) {
      this.mesh.position.x = THREE.MathUtils.clamp(
        this.mesh.position.x + wind * dt * CONFIG.PLAYER.WIND_SCALE, -2.4, 2.4
      );
    }

    // Avance automatique
    this.mesh.position.z -= this.speed * dt;

    // Aimant : attire les crédits vers le joueur
    if (this.hasPowerUp('magnet') && credits.length) {
      credits.forEach(c => {
        const dx = this.mesh.position.x - c.position.x;
        const dz = this.mesh.position.z - c.position.z;
        if (Math.sqrt(dx * dx + dz * dz) < CONFIG.PLAYER.MAGNET_RADIUS) {
          c.position.x += dx * 0.1;
          c.position.z += dz * 0.1;
        }
      });
    }

    // Bob de course
    if (this.isGrounded && this.mesh.children[0]) {
      this.mesh.children[0].position.y = 0.3 + Math.sin(Date.now() * 0.013) * 0.035;
    }
  }

  _updateArena(dt) {
    const s = CONFIG.PLAYER.ARENA_SPEED * dt;
    let dx = 0, dz = 0;
    if (this.keys['ArrowUp']    || this.keys['KeyW']) dz -= s;
    if (this.keys['ArrowDown']  || this.keys['KeyS']) dz += s;
    if (this.keys['ArrowLeft']  || this.keys['KeyA']) dx -= s;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += s;
    this.mesh.position.x += dx;
    this.mesh.position.z += dz;
    if (dx || dz) this.mesh.rotation.y = Math.atan2(-dx, -dz);
  }
}
