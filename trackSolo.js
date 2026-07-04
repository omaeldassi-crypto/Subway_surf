'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   TRACK SOLO MANAGER — Cyber Runner
   Génération procédurale infinie, 15 environnements, obstacles, power-ups,
   crédits, vent, ondulation, et synchronisation serveur multijoueur.
   ═══════════════════════════════════════════════════════════════════════════ */
class TrackSoloManager {
  constructor(scene) {
    this.scene = scene;

    // Arrays d'objets actifs
    this.obstacles     = [];  // collidables
    this.powerUps      = [];  // ramassables
    this.credits       = [];  // ramassables
    this.trackSegments = [];  // {mesh, centerZ, isDecor}

    // Génération
    this.SEG          = CONFIG.TRACK.SEGMENT_LENGTH;
    this.LOOKAHEAD    = CONFIG.TRACK.LOOKAHEAD;
    this.CLEANUP      = CONFIG.TRACK.CLEANUP;
    this.generatedFront = 0;  // bord avant le + négatif déjà généré

    // Mondes
    this.currentWorldIdx   = -1; // -1 force l'init au 1er frame
    this.worldChangeDist   = this.SEG * CONFIG.TRACK.WORLD_BLOCKS; // 250 unités
    this._scannerTriggered = false;

    // Physique environnementale
    this.windForce  = 0;
    this.windTarget = 0;

    // Mode réseau (true = pas de génération locale d'obstacles)
    this.serverObstacleMode = false;

    // Génération initiale
    this._generateUntil(-this.LOOKAHEAD);
    this._switchWorld(0, true);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GÉNÉRATION DE PISTE
  // ═══════════════════════════════════════════════════════════════════════
  _generateUntil(targetZ) {
    while (this.generatedFront > targetZ) this._generateSegment();
  }

  _generateSegment() {
    const cz = this.generatedFront - this.SEG / 2;
    const w  = CONFIG.WORLDS[Math.max(0, this.currentWorldIdx)];

    // Plancher
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.4, this.SEG),
      new THREE.MeshStandardMaterial({ color: w.track, metalness:0.55, roughness:0.38 })
    );
    floor.position.set(0, -0.2, cz);
    if (w.undulation)
      floor.position.y = -0.2 + Math.sin(cz * 0.09) * 0.55;

    this.scene.add(floor);
    this.trackSegments.push({ mesh: floor, centerZ: cz });

    // Marqueurs de voie
    this._addLaneMarkers(cz, w);

    // Décors latéraux selon le monde
    if (Math.random() < 0.4) this._addWorldDecor(cz, w);

    // Obstacles (solo)
    if (!this.serverObstacleMode && cz < CONFIG.TRACK.OBS_START_Z && Math.random() < CONFIG.TRACK.OBS_RATE) {
      this._spawnObstacle(cz);
    }

    // Power-ups
    if (cz < -40 && Math.random() < CONFIG.TRACK.POWERUP_RATE) {
      this._spawnPowerUp(cz);
    }

    // Crédits
    if (cz < -20 && Math.random() < CONFIG.TRACK.CREDIT_RATE) {
      this._spawnCredits(cz);
    }

    this.generatedFront -= this.SEG;
  }

  _addLaneMarkers(cz, w) {
    const mat = new THREE.MeshStandardMaterial({
      color: w.accent, emissive: w.accent, emissiveIntensity: 0.45
    });
    [-2, 2].forEach(x => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, this.SEG * 0.82), mat.clone());
      m.position.set(x, 0.05, cz);
      this.scene.add(m);
      this.trackSegments.push({ mesh: m, centerZ: cz, isDecor: true });
    });
  }

  _addWorldDecor(cz, w) {
    const side = Math.random() < 0.5 ? -4.5 : 4.5;
    const h    = 1 + Math.random() * 3;
    const geo  = Math.random() < 0.5
      ? new THREE.BoxGeometry(0.4 + Math.random() * 0.6, h, 0.4 + Math.random() * 0.6)
      : new THREE.CylinderGeometry(0.15, 0.25, h, 6);
    const mat  = new THREE.MeshStandardMaterial({
      color: w.accent, emissive: w.accent, emissiveIntensity: 0.1 + Math.random() * 0.3
    });
    const decor = new THREE.Mesh(geo, mat);
    decor.position.set(side, h / 2, cz + (Math.random() - 0.5) * this.SEG * 0.7);
    this.scene.add(decor);
    this.trackSegments.push({ mesh: decor, centerZ: cz, isDecor: true });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  OBSTACLES
  // ═══════════════════════════════════════════════════════════════════════
  _spawnObstacle(cz) {
    const w        = CONFIG.WORLDS[this.currentWorldIdx] || CONFIG.WORLDS[0];
    const isHigh   = Math.random() < 0.28;
    const twoLanes = Math.random() < 0.14;
    const h        = isHigh ? 2.8 : 1.3;
    const wid      = twoLanes ? 5.0 : 1.7;
    const laneX    = twoLanes ? 0 : (Math.floor(Math.random() * 3) - 1) * 2;

    const obs = new THREE.Mesh(
      new THREE.BoxGeometry(wid, h, 0.9),
      new THREE.MeshStandardMaterial({
        color: w.accent, emissive: w.accent, emissiveIntensity: 0.2, metalness: 0.8
      })
    );
    obs.position.set(laneX, h / 2, cz);
    obs.userData.type = isHigh ? 'barrière_haute' : 'bloc_standard';
    this.scene.add(obs);
    this.obstacles.push(obs);
  }

  /** ─ API réseau : obstacle provenant du serveur (identique sur tous les clients). */
  spawnServerObstacle(x, z, type) {
    const w    = CONFIG.WORLDS[this.currentWorldIdx] || CONFIG.WORLDS[0];
    const isH  = type === 'barrière_haute';
    const h    = isH ? 2.8 : 1.3;
    const obs  = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, h, 0.9),
      new THREE.MeshStandardMaterial({ color: w.accent, emissive: w.accent, emissiveIntensity: 0.2 })
    );
    obs.position.set(x, h / 2, z);
    obs.userData.type       = type;
    obs.userData.fromServer = true;
    this.scene.add(obs);
    this.obstacles.push(obs);
  }

  /** ─ API réseau : passe en mode obstacle serveur (supprime les locaux). */
  clearLocalObstacles() {
    const local = this.obstacles.filter(o => !o.userData.fromServer);
    local.forEach(o => this.scene.remove(o));
    this.obstacles = this.obstacles.filter(o => o.userData.fromServer);
    this.serverObstacleMode = true;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  POWER-UPS ET CRÉDITS
  // ═══════════════════════════════════════════════════════════════════════
  _spawnPowerUp(cz) {
    const keys   = Object.keys(CONFIG.RUNNER_POWERUPS);
    const type   = keys[Math.floor(Math.random() * keys.length)];
    const info   = CONFIG.RUNNER_POWERUPS[type];
    const laneX  = (Math.floor(Math.random() * 3) - 1) * 2;
    const colorN = parseInt(info.color.replace('#',''), 16);

    const pu = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({ color: colorN, emissive: colorN, emissiveIntensity: 1.2 })
    );
    pu.position.set(laneX, 1.1, cz);
    pu.userData.type = type;

    // Lumière de halo
    const halo = new THREE.PointLight(colorN, 2, 5);
    halo.position.copy(pu.position);
    this.scene.add(halo);
    pu.userData.halo = halo;

    this.scene.add(pu);
    this.powerUps.push(pu);
  }

  _spawnCredits(cz) {
    const laneX = (Math.floor(Math.random() * 3) - 1) * 2;
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const c = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.06, 8),
        new THREE.MeshStandardMaterial({ color:0xffcc00, emissive:0xffcc00, emissiveIntensity:0.6 })
      );
      c.rotation.x = Math.PI / 2;
      c.position.set(laneX, 0.55, cz - i * 1.5);
      c.userData.isCredit = true;
      this.scene.add(c);
      this.credits.push(c);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  MONDES
  // ═══════════════════════════════════════════════════════════════════════
  _switchWorld(idx, silent = false) {
    if (idx === this.currentWorldIdx) return;
    this.currentWorldIdx = idx;
    this._scannerTriggered = false;
    const w = CONFIG.WORLDS[idx];

    if (this.scene.fog)        this.scene.fog.color.setHex(w.fog);
    if (this.scene.background) this.scene.background.setHex(w.sky);

    this.windTarget = w.wind
      ? (Math.random() < 0.5 ? 1 : -1) * (2.2 + Math.random() * 2.8)
      : 0;

    if (!silent) {
      if (window.ui)      window.ui.showWorldChange(w, window.effects);
      if (window.effects) window.effects.flash(`rgba(${(w.accent>>16)&0xff},${(w.accent>>8)&0xff},${w.accent&0xff},0.18)`, 600);
      if (window.ui)      window.ui.setWorldBadge(w);
    } else {
      if (window.ui)      window.ui.setWorldBadge(w);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UPDATE — appelé chaque frame depuis main.js
  // ═══════════════════════════════════════════════════════════════════════
  update(playerZ, elapsed) {
    const dist     = Math.abs(playerZ);
    const worldIdx = Math.min(Math.floor(dist / this.worldChangeDist), 14);
    this._switchWorld(worldIdx);

    // Scanner : alerte 2s avant prochain monde
    const nextThreshold = (worldIdx + 1) * this.worldChangeDist;
    const remaining     = nextThreshold - dist;
    if (remaining < 16 && remaining > 0 && !this._scannerTriggered) {
      const equipped = window.playerEquipment;
      if (equipped?.scanner === 'tactical_scanner') {
        const nextWorld = CONFIG.WORLDS[Math.min(worldIdx + 1, 14)];
        if (window.ui) window.ui.showScannerAlert(nextWorld);
      }
      this._scannerTriggered = true;
    }

    // Génération continue
    this._generateUntil(playerZ - this.LOOKAHEAD);

    // Nettoyage
    this._cleanup(playerZ);

    // Vent (transition lisse)
    this.windForce += (this.windTarget - this.windForce) * 0.007;

    // Animations power-ups
    this.powerUps.forEach(p => {
      p.rotation.y += 0.06;
      p.position.y  = 1.1 + Math.sin(elapsed * 3 + p.position.z * 0.3) * 0.22;
      if (p.userData.halo) p.userData.halo.position.y = p.position.y;
    });

    // Rotation des crédits
    this.credits.forEach(c => { c.rotation.z += 0.07; });

    // Ondulation visuelle sur segments existants
    const w = CONFIG.WORLDS[this.currentWorldIdx];
    if (w?.undulation) {
      this.trackSegments.forEach(s => {
        if (!s.isDecor)
          s.mesh.position.y = -0.2 + Math.sin(s.centerZ * 0.09 + elapsed * 0.9) * 0.55;
      });
    }
  }

  _cleanup(playerZ) {
    const threshold = playerZ + this.CLEANUP;
    const rm = (arr, getZ) => {
      const dead = []; const live = arr.filter(o => {
        if (getZ(o) > threshold) { dead.push(o); return false; } return true;
      });
      dead.forEach(o => {
        const m = o.mesh || o;
        this.scene.remove(m);
        if (m.userData?.halo) this.scene.remove(m.userData.halo);
        m.geometry?.dispose(); m.material?.dispose();
      });
      return live;
    };
    this.trackSegments = rm(this.trackSegments, s => s.centerZ);
    this.obstacles     = rm(this.obstacles,     o => o.position.z);
    this.powerUps      = rm(this.powerUps,      p => p.position.z);
    this.credits       = rm(this.credits,        c => c.position.z);
  }
}
