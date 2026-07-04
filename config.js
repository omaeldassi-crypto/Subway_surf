'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   CONFIG — Cyber Runner & Arena
   Toutes les constantes de jeu en un seul endroit.
   Modifiez ici pour re-tuner sans toucher à la logique.
   ═══════════════════════════════════════════════════════════════════════════ */
const CONFIG = Object.freeze({

  PLAYER: {
    BASE_SPEED:      8,
    MAX_SPEED:       24,
    SPEED_RAMP:      0.0015,   // gain de vitesse par frame
    GRAVITY:        -26,
    JUMP_FORCE:      13,
    LANE_WIDTH:      2,
    LANE_SNAP:       0.18,     // lerp vers la voie cible
    WIND_SCALE:      0.38,     // force du vent sur X
    ARENA_SPEED:     11,
    MAGNET_RADIUS:   9,
    JETPACK_HEIGHT:  6,
  },

  TRACK: {
    SEGMENT_LENGTH:    10,
    LOOKAHEAD:        180,
    CLEANUP:           70,
    WORLD_BLOCKS:      25,    // segments avant changement de monde
    OBS_RATE:        0.27,
    POWERUP_RATE:    0.075,
    CREDIT_RATE:     0.44,
    OBS_START_Z:      -30,   // première zone sans obstacle
  },

  POWERUP: {
    DURATION: 10_000,         // ms — tous les power-ups temporaires
  },

  ARENA: {
    SIZE:          32,
    CATCH_RADIUS:   1.8,
    TRAP_RADIUS:    1.5,
    TRAP_DURATION: 10_000,
    STUN_DURATION:  3_000,
    RESPAWN_DELAY:  3_000,
  },

  UI: {
    NOTIF_DURATION:        2800,
    WORLD_NOTIF_DURATION:  3200,
    SCANNER_ALERT_DURATION:3500,
  },

  WORLDS: [
    { name:'Abysses Marins',       icon:'🌊', fog:0x001133, sky:0x001122, track:0x003355, accent:0x0066aa, wind:true,  undulation:true  },
    { name:'Néon Cyberpunk',        icon:'🌆', fog:0x050510, sky:0x050510, track:0x1a0033, accent:0xff0055, wind:false, undulation:false },
    { name:'Forge Volcanique',      icon:'🌋', fog:0x110500, sky:0x110300, track:0x330800, accent:0xff4400, wind:false, undulation:false },
    { name:'Temple Céleste',        icon:'☁️', fog:0xaaccff, sky:0x88aaff, track:0xddeeff, accent:0xffffff, wind:false, undulation:false },
    { name:'Mine de Cristal',       icon:'💎', fog:0x110022, sky:0x110022, track:0x220044, accent:0xaa00ff, wind:false, undulation:false },
    { name:'Désert Tempétueux',     icon:'🏜️', fog:0x221100, sky:0x331100, track:0x443300, accent:0xcc8800, wind:true,  undulation:false },
    { name:'Cité Horlogère',        icon:'⚙️', fog:0x111111, sky:0x111111, track:0x222222, accent:0x888888, wind:false, undulation:false },
    { name:'Forêt Bioluminescente', icon:'🍄', fog:0x001100, sky:0x001100, track:0x002200, accent:0x00ff44, wind:false, undulation:false },
    { name:'Station Orbitale',      icon:'🚀', fog:0x000011, sky:0x000011, track:0x000033, accent:0x4444ff, wind:false, undulation:false },
    { name:'Banquise Brisée',       icon:'❄️', fog:0xaaddff, sky:0xaaccff, track:0x88ccff, accent:0xffffff, wind:false, undulation:true  },
    { name:'Nécropole Maudite',     icon:'💀', fog:0x110011, sky:0x110011, track:0x220022, accent:0x9900cc, wind:false, undulation:false },
    { name:'Jungle de Corail',      icon:'🪸', fog:0x001122, sky:0x001122, track:0x002233, accent:0xff6644, wind:false, undulation:true  },
    { name:'Laboratoire Toxique',   icon:'🧪', fog:0x001100, sky:0x001100, track:0x003300, accent:0x00ff00, wind:false, undulation:false },
    { name:'Canyon du Vent',        icon:'🌪️', fog:0x221100, sky:0x221100, track:0x443300, accent:0xffaa00, wind:true,  undulation:false },
    { name:'Néant Numérique',       icon:'👾', fog:0x000000, sky:0x000000, track:0x001100, accent:0x00ff00, wind:false, undulation:false },
  ],

  RUNNER_POWERUPS: {
    magnet:     { icon:'🧲', label:'Aimant Crédits', color:'#ff6600' },
    jetpack:    { icon:'🚀', label:'Jetpack Plasma',  color:'#0066ff' },
    shield:     { icon:'🛡️', label:'Bouclier EM',     color:'#00ff88' },
    multiplier: { icon:'✖2', label:'Score ×2',        color:'#ffff00' },
    hack:       { icon:'👁️', label:'Prévoyance',       color:'#ff00cc' },
  },

  ARENA_POWERS: {
    sprint:     { name:'Sprint Cybernétique',      icon:'⚡', key:'1', color:'#ffff00', cooldown:15000, duration: 5000 },
    camo:       { name:'Camouflage Holographique', icon:'👻', key:'2', color:'#aaaaff', cooldown:20000, duration: 8000 },
    forcefield: { name:'Champ de Force',           icon:'🔵', key:'3', color:'#0099ff', cooldown:12000, duration: 4000 },
    trap:       { name:'Piège Magnétique',         icon:'🔴', key:'4', color:'#ff0000', cooldown:18000, duration:10000 },
    radar:      { name:'Détecteur de Présence',    icon:'📡', key:'5', color:'#00ff44', cooldown:25000, duration:10000 },
    teleport:   { name:'Téléportation Urgence',    icon:'🌀', key:'6', color:'#ff00ff', cooldown:30000, duration:  500 },
    emp:        { name:'Disruption EMP',           icon:'💥', key:'7', color:'#ff6600', cooldown:35000, duration: 5000 },
  },
});
