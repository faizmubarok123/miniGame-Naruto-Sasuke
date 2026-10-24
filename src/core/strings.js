// strings.js — semua teks UI dalam Bahasa Indonesia
export const T = {
  title: 'Ninja Adventure',
  subtitle: 'Naruto & Sasuke',
  tagline: 'Petualangan platform ninja yang ceria!',

  menu: {
    play: 'Mulai Bermain',
    levels: 'Pilih Level',
    settings: 'Pengaturan',
    credits: 'Kredit',
    help: 'Cara Bermain'
  },

  settings: {
    title: 'Pengaturan',
    sfx: 'Efek Suara',
    music: 'Musik',
    volume: 'Kekuatan Suara',
    reduceFx: 'Kurangi Efek Kilau & Guncangan',
    touch: 'Tombol Sentuh',
    touchAuto: 'Otomatis',
    touchOn: 'Selalu Tampil',
    touchOff: 'Sembunyikan',
    reset: 'Hapus Semua Progres',
    resetYes: 'Ya, Hapus',
    resetNo: 'Batal',
    done: 'Selesai',
    resetDone: 'Progres telah dihapus.'
  },

  charSelect: {
    title: 'Pilih Ninjamu',
    start: 'Mulai Petualangan',
    ready: 'Siap!'
  },

  levels: {
    title: 'Pilih Level',
    locked: 'Terkunci',
    lockedHint: 'Selesaikan babak sebelumnya untuk membuka',
    best: 'Skor Terbaik',
    bestScore: 'Skor',
    bestCoins: 'Koin',
    bestStars: 'Bintang',
    notPlayed: 'Belum dimainkan'
  },

  hud: {
    pause: 'Jeda',
    abilityReady: 'Jurus siap!'
  },

  pause: {
    title: 'Jeda',
    resume: 'Lanjutkan',
    restart: 'Ulangi Level',
    charSwap: 'Ganti Karakter',
    controls: 'Kontrol',
    menu: 'Menu Utama',
    charSwapped: 'Karakter diganti! Posisimu dipertahankan.'
  },

  signs: {
    move: 'Tekan tombol KIRI / KANAN untuk berjalan!',
    jump: 'Tekan LOMPAT untuk melompat. Tahan lebih lama = lompat lebih tinggi!',
    coin: 'Kumpulkan koin untuk skor!',
    ability: 'Tekan tombol JURUS untuk melesat cepat!',
    checkpoint: 'Gapura ini menyimpan posisi terakhirmu.',
    goal: 'Menuju banner di akhir jalur!',
    stars: 'Ada bintang tersembunyi di sekitar sini…',
    danger: 'Awas! Yang bergerak dan berduri — lompati atau lewati!'
  },

  result: {
    title: 'Babak Selesai!',
    score: 'Skor',
    coins: 'Koin',
    stars: 'Bintang',
    deaths: 'Tersandung',
    time: 'Waktu',
    best: 'Skor Terbaik Baru!',
    replay: 'Main Lagi',
    next: 'Level Berikutnya',
    menu: 'Menu Utama',
    finishTitle: 'Seluruh Babak Selesai!',
    finishText: 'Semua babak tuntas. Benar-benar ninja hebat!'
  },

  death: {
    title: 'Kehabisan Hati…',
    text: 'Tenang saja, ninja selalu bisa belajar! Coba lagi?',
    retry: 'Coba Lagi',
    menu: 'Menu Utama'
  },

  controls: {
    desktopTitle: 'Desktop',
    desktop: [
      ['← / A', 'Berjalan ke kiri'],
      ['→ / D', 'Berjalan ke kanan'],
      ['Spasi / ↑ / W', 'Lompat (tahan = lebih tinggi)'],
      ['J', 'Jurus khusus'],
      ['Esc / P', 'Jeda']
    ],
    mobileTitle: 'Layar Sentuh',
    mobile: [
      ['Kiri / Kanan', 'Berjalan (cukup tahan)'],
      ['LOMPAT', 'Melompat'],
      ['JURUS', 'Keahlian khusus'],
      ['⏸', 'Jeda']
    ],
    generalTitle: 'Lainnya',
    general: [
      ['Saklar lompat', 'Tekan sekejap untuk lompat pendek'],
      ['Cek titik', 'Gapura oranye = posisi aman']
    ]
  },

  toast: {
    unlocked: 'Level baru terbuka!',
    lockedLevel: 'Selesaikan babak sebelumnya untuk membuka!'
  }
};
