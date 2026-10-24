// levels.js — ketiga babak, dibangun dengan LevelBuilder
import { LevelBuilder } from '../sim/level.js';

// ================= BABAK 1 : Desa Konoha yang Ceria =================
function level1() {
  const b = new LevelBuilder('Desa Konoha yang Ceria', 'village', { w: 232, h: 24, music: 'village' });
  b.ground(0, 22, 20);
  b.spawn(3, 19);
  // desa: rumah, sumur, pohon, bunga
  b.deco('house', 7, 19);
  b.deco('house', 16, 19);
  b.deco('well', 12, 19);
  b.deco('tree', 19, 19);
  b.deco('bush', 5, 19);
  b.deco('flower', 4, 19, { variant: 0 });
  b.deco('flower', 11, 19, { variant: 1 });
  b.deco('flower', 14, 19, { variant: 2 });
  b.deco('lantern', 10, 19);
  b.npc(8, 19, 'Selamat datang di Konoha!');
  b.sign(5, 19, 'move');
  b.sign(11, 19, 'jump');
  b.coinRow(6, 17, 3, 2);
  b.bonus(10, 16);

  // celah pertama (mudah)
  // x23..25 kosong → jatuh = respawn
  b.coin(23, 17); b.coin(24, 16); b.coin(25, 17);
  b.ground(26, 44, 20);
  b.deco('tree', 28, 19);
  b.deco('bush', 38, 19);
  b.deco('flower', 35, 19, { variant: 0 });
  b.deco('flower', 41, 19, { variant: 1 });
  b.slime(32, 19, { speed: 48 });
  b.coinRow(34, 17, 3, 2);
  b.bonus(37, 16);

  // jalur bintang rahasia 1
  b.plat(58, 17, 3);
  b.plat(62, 14, 3);
  b.star(63, 11);

  b.coin(46, 18); b.coin(47, 17); b.coin(48, 18);
  b.ground(49, 68, 20);
  b.deco('rock', 51, 19);
  b.deco('bush', 55, 19);
  b.walker(57, 19, { speed: 42 });
  b.sign(50, 19, 'coin');
  b.checkpoint(66, 19);
  b.coinRow(52, 19, 3, 2);

  b.coin(69, 17);
  b.ground(72, 92, 20);
  b.plat(72, 17, 3);
  b.coinRow(72, 16, 3, 1);
  b.deco('house', 82, 19);
  b.deco('lantern', 78, 19);
  b.deco('flower', 76, 19, { variant: 0 });
  b.npc(80, 19, 'Semangat! Bentar lagi sampai!');
  b.bonus(84, 16); b.bonus(85, 16);

  // jalur bintang rahasia 2
  b.plat(92, 17, 2);
  b.plat(89, 14, 2);
  b.star(89, 11);

  b.ground(96, 118, 20);
  b.deco('rock', 99, 19);
  b.deco('tree', 108, 19);
  b.deco('bush', 104, 19);
  b.walker(106, 19, { speed: 46 });
  b.checkpoint(114, 19);
  b.bonus(102, 16);
  b.coinRow(112, 19, 3, 2);

  b.coin(119, 18); b.coin(120, 17); b.coin(121, 18);
  b.ground(122, 148, 20);
  b.block(126, 19, 2, 1);
  b.deco('torii', 138, 19);
  b.deco('bush', 130, 19);
  b.deco('flower', 134, 19, { variant: 2 });
  b.deco('flower', 144, 19, { variant: 0 });
  b.deco('lantern', 146, 19);
  b.slime(132, 19, { speed: 52 });
  b.slime(141, 19, { speed: 58 });
  b.coinRow(128, 18, 4, 2);

  b.coin(149, 18); b.coin(150, 17); b.coin(151, 18);
  b.ground(153, 172, 20);
  b.plat(155, 17, 4);
  b.coinRow(155, 16, 4, 1);
  b.deco('bush', 160, 19);
  b.walker(166, 19, { speed: 50 });
  b.deco('tree', 161, 19);
  b.sign(169, 19, 'goal');
  b.coinRow(161, 19, 3, 2);

  b.coin(173, 18); b.coin(174, 17); b.coin(175, 18);
  b.ground(177, 231, 20);
  b.deco('tree', 182, 19);
  b.deco('house', 190, 19);
  b.deco('well', 198, 19);
  b.deco('torii', 220, 19);
  b.deco('flower', 203, 19, { variant: 0 });
  b.deco('flower', 205, 19, { variant: 1 });
  b.deco('flower', 207, 19, { variant: 2 });
  b.deco('lantern', 211, 19);
  b.deco('lantern', 215, 19);
  b.npc(206, 19, 'Flag di ujung sana!');
  b.coinArc(216, 17, 5, 1, 1);
  b.goal(226, 19);
  return b.build();
}

// ================= BABAK 2 : Hutan Bambu =================
function level2() {
  const b = new LevelBuilder('Hutan Bambu', 'bamboo', { w: 248, h: 24, music: 'bamboo' });
  b.ground(0, 26, 20);
  b.spawn(3, 19);
  b.deco('bamboo', 6, 19);
  b.deco('bamboo', 13, 19);
  b.deco('bush', 20, 19);
  b.deco('flower', 15, 19, { variant: 0 });
  b.deco('flower', 17, 19, { variant: 1 });
  b.deco('lantern', 9, 19);
  b.sign(10, 19, 'ability');
  b.slime(16, 19, { speed: 55 });
  b.slime(23, 19, { speed: 60 });
  b.coinRow(19, 17, 3, 2);

  // celah setelah tanda jurus (tetap bisa dilompat biasa; jurus membantu pemula)
  b.coin(28, 16); b.coin(30, 15); b.coin(31, 16);
  b.ground(32, 58, 20);
  b.deco('bamboo', 36, 19);
  b.deco('bamboo', 46, 19);
  b.deco('bamboo', 52, 19);
  b.walker(54, 19, { speed: 46 });
  b.plat(37, 17, 3);
  b.coinRow(37, 16, 3, 1);
  b.plat(43, 14, 3);
  b.bonus(44, 13);
  b.plat(49, 11, 3);
  b.star(50, 8);
  b.coinRow(41, 19, 4, 2);

  // sungai 1 — jembatan bambu + bintang di dasar sungai
  b.water(21);
  b.plat(59, 20, 5);
  b.ground(61, 63, 23);
  b.star(62, 22);
  b.coin(60, 19); b.coin(62, 18);

  b.ground(65, 90, 20);
  b.deco('bamboo', 68, 19);
  b.deco('bamboo', 73, 19);
  b.deco('bamboo', 84, 19);
  b.deco('flower', 70, 19, { variant: 2 });
  b.slime(70, 19, { speed: 58 });
  b.walker(77, 19, { speed: 46 });
  b.plat(82, 17, 3);
  b.coinRow(82, 16, 3, 1);
  b.coinRow(74, 19, 3, 2);

  // sungai lebar + dua platform bergerak penyambung
  b.moverPlate(92, 19, { w: 3, axis: 'x', range: 5, speed: 55 });
  b.moverPlate(99, 17, { w: 3, axis: 'x', range: 4, speed: 60 });
  b.coin(94, 16); b.coin(97, 15); b.coin(101, 14);

  b.ground(105, 128, 20);
  b.checkpoint(108, 19);
  b.deco('bamboo', 112, 19);
  b.deco('bamboo', 126, 19);
  b.deco('flower', 110, 19, { variant: 0 });
  b.slime(114, 19, { speed: 62 });
  b.slime(120, 19, { speed: 66 });
  b.bonus(122, 16); b.bonus(123, 16);
  b.coinRow(116, 19, 4, 2);

  // dataran tinggi bambu
  b.block(129, 19, 2, 1);
  b.ground(129, 152, 18);
  b.deco('bamboo', 132, 17);
  b.deco('bamboo', 140, 17);
  b.deco('bamboo', 148, 17);
  b.walker(136, 17, { speed: 48 });
  b.walker(146, 17, { speed: 52 });
  b.plat(134, 15, 3);
  b.plat(139, 12, 3);
  b.star(145, 9);
  b.coinRow(130, 17, 4, 2);

  // sungai 2 — platform vertikal naik-turun
  b.moverPlate(156, 20, { w: 3, axis: 'y', range: 3, speed: 45 });
  b.coin(154, 18); b.coin(157, 16); b.coin(159, 18);

  b.ground(161, 190, 20);
  b.checkpoint(163, 19);
  b.deco('bamboo', 167, 19);
  b.deco('bamboo', 186, 19);
  b.deco('bush', 171, 19);
  b.slime(168, 19, { speed: 60 });
  b.slime(175, 19, { speed: 58 });
  b.walker(183, 19, { speed: 50 });
  b.bonus(179, 16);
  b.coinRow(172, 19, 4, 2);

  // celah akhir
  b.coin(192, 17); b.coin(194, 16); b.coin(195, 17);
  b.ground(196, 247, 20);
  b.deco('torii', 216, 19);
  b.deco('bamboo', 200, 19);
  b.deco('bamboo', 224, 19);
  b.deco('flower', 204, 19, { variant: 1 });
  b.deco('flower', 206, 19, { variant: 2 });
  b.deco('lantern', 208, 19);
  b.npc(205, 19, 'Mantap! Kaleidoskop itu!');
  b.coinRow(210, 19, 4, 2);
  b.goal(240, 19);
  return b.build();
}

// ================= BABAK 3 : Lembah Petir =================
function level3() {
  const b = new LevelBuilder('Lembah Petir', 'storm', { w: 248, h: 24, music: 'storm' });
  b.ground(0, 20, 20);
  b.spawn(3, 19);
  b.deco('lantern', 6, 19);
  b.deco('flower', 4, 19, { variant: 0 });
  b.deco('flower', 9, 19, { variant: 1 });
  b.deco('rock', 12, 19);
  b.sign(8, 19, 'danger');
  b.coinRow(14, 17, 3, 2);

  b.coin(21, 17); b.coin(22, 16); b.coin(23, 17);
  b.ground(25, 48, 20);
  b.roller(30, 19, { min: 27, max: 44, speed: 120 });
  b.spikes(42, 19, 2);
  b.deco('tree', 36, 19);
  b.deco('rock', 39, 19);
  b.coinRow(32, 16, 4, 2);

  // tebing naik
  b.block(49, 19, 2, 1);
  b.ground(51, 78, 18);
  b.deco('bamboo', 52, 17);
  b.deco('bamboo', 60, 17);
  b.deco('bamboo', 72, 17);
  b.slime(56, 17, { speed: 60 });
  b.slime(70, 17, { speed: 64 });
  b.checkpoint(58, 17);
  b.plat(64, 15, 3);
  b.coinRow(64, 14, 3, 1);
  b.coinRow(54, 17, 4, 2);

  // celah mover
  b.moverPlate(80, 19, { w: 3, axis: 'x', range: 3, speed: 60 });
  b.plat(84, 19, 1);
  b.coin(81, 17);

  b.ground(86, 112, 18);
  b.walker(92, 17, { speed: 50 });
  b.walker(102, 17, { speed: 54 });
  b.spikes(96, 17, 2);
  b.bonus(99, 14); b.bonus(100, 14);
  b.deco('bamboo', 88, 17);
  b.deco('bamboo', 106, 17);
  b.deco('bush', 108, 17);
  b.coinRow(90, 17, 4, 2);

  // sungai dengan dua lintasan (atas: bintang; bawah: jalan aman)
  b.water(20);
  b.plat(113, 19, 4);
  b.ground(119, 121, 22);
  b.star(120, 21);
  b.moverPlate(118, 19, { w: 3, axis: 'x', range: 4, speed: 60 });
  b.coin(114, 17); b.coin(121, 17);

  b.ground(127, 150, 18);
  b.checkpoint(130, 17);
  b.roller(137, 17, { min: 133, max: 148, speed: 135 });
  b.deco('lantern', 131, 17);
  b.deco('bush', 149, 17);
  // area bonus langit
  b.plat(132, 14, 3);
  b.plat(138, 11, 3);
  b.star(139, 8);
  b.coinRow(128, 17, 4, 2);

  // celah lebar: dua mover bersambung
  b.moverPlate(152, 18, { w: 3, axis: 'x', range: 3, speed: 65 });
  b.moverPlate(157, 16, { w: 3, axis: 'x', range: 3, speed: 65 });
  b.coin(154, 15); b.coin(158, 13);

  b.ground(161, 184, 18);
  b.walker(168, 17, { speed: 52 });
  b.walker(178, 17, { speed: 56 });
  b.spikes(172, 17, 2);
  b.spikes(176, 17, 2);
  b.slime(166, 17, { speed: 64 });
  b.deco('bamboo', 163, 17);
  b.deco('lantern', 181, 17);
  b.checkpoint(183, 17);   // sebelum tolak terakhir
  b.coinRow(164, 16, 4, 2);

  b.ground(188, 247, 20);
  b.deco('torii', 222, 19);
  b.deco('house', 232, 19);
  b.deco('bamboo', 192, 19);
  b.deco('bamboo', 226, 19);
  b.deco('flower', 198, 19, { variant: 2 });
  b.deco('flower', 200, 19, { variant: 0 });
  b.deco('flower', 202, 19, { variant: 1 });
  b.deco('lantern', 210, 19);
  b.npc(218, 19, 'Petualanganmu tamat santai!');
  b.coinArc(214, 17, 5, 1, 1);
  b.goal(240, 19);
  return b.build();
}

export const LEVELS = [level1(), level2(), level3()];
