// config.js — judi semua tuning gameplay di satu tempat (satuan: px/s per detik, piksel logis)
export const CFG = {
  // Viewport
  MIN_VIEW_W: 720,
  MAX_VIEW_H: 900,
  BASE_VIEW_H: 540,
  MAX_SCALE: 2.6,

  // Tile
  TILE: 48,

  // Pemain
  PCFG: {
    W: 30, H: 40,              // hitbox (lebih kecil dari sprite = collision "generous")
    RUN: 300,
    ACC_G: 2600,
    ACC_A: 1700,
    FRICTION_G: 2800,
    FRICTION_A: 500,
    GRAVITY: 2000,
    GRAVITY_HOLD: 980,         // gravitasi rendah saat tombol lompat ditahan & sedang naik
    GRAVITY_FALL: 2350,        // jatuh sedikit lebih cepat (feel snappy)
    JUMP_V: -640,
    MAX_FALL: 980,
    JUMP_CUT_MULT: 0.45,       // lepas tombol di awal lompatan = lompatan pendek
    COYOTE: 0.13,
    BUFFER: 0.13,
    STOMP_V: -560,
    HURT_KNOCK_X: 240,
    HURT_KNOCK_Y: -320,
    IFRAMES: 1.4,
    DASH_TIME: 0.30,
    DASH_COOLDOWN: 2.4,
    DASH_SPEED: 640,
    DASH_IFRAMES: 0.45,
    STOMP_WINDOW: 0.1          // toleransi menimpa musuh
  },

  // Karakter (diferensiasi kecil tapi seimbang)
  CHARACTERS: {
    naruto: {
      name: 'Naruto',
      fullName: 'Naruto Uzumaki',
      abilityName: 'Jurus Bayangan Dupleks',
      abilityDesc: 'Melesat dengan bayangan dua klon menyala, menyerang musuh di jalurnya.',
      dashSpeed: 640,
      dashTime: 0.30,
      runMul: 1.0,
      color: '#ff9a3c'
    },
    sasuke: {
      name: 'Sasuke',
      fullName: 'Sasuke Uchiha',
      abilityName: 'Kilat Petir Ungu',
      abilityDesc: 'Menyambar cepat ke depan dengan jejak kilat ungu yang menyengat musuh.',
      dashSpeed: 700,
      dashTime: 0.32,
      runMul: 1.02,
      color: '#8f7bff'
    }
  },

  // Gameplay
  HEARTS: 3,
  SCORE_COIN: 10,
  SCORE_STAR: 200,
  SCORE_STOMP: 50,
  SCORE_LEVEL_CLEAR: 300,
  COIN_RADIUS: 30,
  STAR_RADIUS: 34,
  ENEMY_STOMP_PIN: 14,     // berapa px kaki pemain di atas kepala musuh agar dianggap menginjak

  // Kamera
  CAM_LERP_X: 9,
  CAM_LERP_Y: 6,
  CAM_LOOKAHEAD: 130,
  CAM_OFF_Y: -70,
  CAM_MAX_SHAKE: 10,

  // Audio
  MUSIC: true,
  SFX: true
};
