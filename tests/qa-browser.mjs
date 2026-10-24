// qa-browser.mjs — QA visual & fungsional penuh lewat Playwright (chromium)
// Jalankan: node tests/qa-browser.mjs  (butuh `npx vite --port 5173` berjalan)
// Bisa juga diarahkan ke build produksi: BASE=http://localhost:4173/ node tests/qa-browser.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:5173/';
const SHOTS = path.resolve('tests/qa-shots');
mkdirSync(SHOTS, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
let failures = 0;
const pass = (name) => console.log(`  PASS ${name}`);
const fail = (name, detail = '') => { failures++; console.log(`  FAIL ${name} ${detail}`); };
const check = (name, cond, detail = '') => (cond ? pass(name) : fail(name, detail));
const shot = async (page, name) => { await page.screenshot({ path: path.join(SHOTS, name), fullPage: false }); console.log(`  shot ${name}`); };

function watch(page, tag) {
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(`[${tag}] ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => pageErrors.push(`[${tag}] ${e.message.split('\n')[0].slice(0, 200)}`));
}

const browser = await chromium.launch();

// ============ DESKTOP ============
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  watch(page, 'desktop');

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  console.log('— Boot & menu —');
  check('no boot-error screen', await page.locator('#boot-error').isHidden());
  check('menu terlihat', await page.locator('#screen-menu').isVisible());
  await shot(page, '01-menu.png');

  console.log('— Pilih karakter —');
  await page.click('#btn-play');
  await page.waitForTimeout(300);
  check('layar char terbuka', await page.locator('#screen-char').isVisible());
  const prevN = await page.locator('#prev-naruto canvas').count();
  const prevS = await page.locator('#prev-sasuke canvas').count();
  check('preview Naruto tergambar', prevN === 1);
  check('preview Sasuke tergambar', prevS === 1);
  await page.click('#char-pick-sasuke');
  await page.waitForTimeout(150);
  check('sasuke terpilih (save)', await page.evaluate(() => __adf.save.settings.charId === 'sasuke'));
  await shot(page, '02-char.png');
  await page.click('#char-start');
  await page.waitForTimeout(700);

  console.log('— Gameplay dipicu & HUD —');
  check('mode level', await page.evaluate(() => __adf.game.mode === 'level'));
  check('HUD tampil', await page.locator('#hud').isVisible());
  const lvlName = await page.locator('#hud-level').textContent();
  check('HUD nama level terisi', /Desa|Hutan|Lembah/.test(lvlName || ''), lvlName);
  check('HUD karakter = S', (await page.locator('#hud-char').textContent()) === 'S');
  const heartCount = await page.locator('#hud-hearts .heart.full').count();
  check('HUD 3 hati penuh', heartCount === 3, `full=${heartCount}`);
  await shot(page, '03-gameplay.png');

  console.log('— Gerak, lompat, jurus —');
  const startX = await page.evaluate(() => __adf.game.world.player.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  const runX = await page.evaluate(() => __adf.game.world.player.x);
  check('jalan ke kanan', runX > startX + 80, `x ${startX} → ${runX}`);
  const yBefore = await page.evaluate(() => __adf.game.world.player.y);
  await page.keyboard.down('Space');
  // polling min-y supaya tahan terhadap jeda input/rAF saat muat pertama
  let yMin = yBefore;
  for (let i = 0; i < 7; i++) {
    await page.waitForTimeout(60);
    const y = await page.evaluate(() => __adf.game.world.player.y);
    if (y < yMin) yMin = y;
  }
  check('lompat naik', yMin < yBefore - 60, `y ${yBefore} → min ${yMin}`);
  await shots_snap(page, '04-jump.png');
  await page.waitForTimeout(500); // mendarat
  await page.keyboard.up('Space');

  const dashCd0 = await page.evaluate(() => __adf.game.world.player.dashCD);
  await page.keyboard.down('KeyJ');
  await page.waitForTimeout(90);
  await page.keyboard.up('KeyJ');
  const dashing = await page.evaluate(() => __adf.game.world.player.dashT > 0 || __adf.game.world.player.dashCD > dashCd0);
  check('jurus khusus aktif + cooldown', dashing);
  await shot(page, '04a-dash.png');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');

  console.log('— Jeda & resume (Esc) —');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  check('layar jeda terbuka', await page.locator('#screen-pause').isVisible());
  await shot(page, '05-pause.png');
  // ganti karakter lewat jeda
  await page.click('#btn-swap-naruto');
  await page.waitForTimeout(200);
  check('swap ke naruto di jeda', await page.evaluate(() => __adf.game.world.player.charId === 'naruto'));
  await shot(page, '05b-swap.png');
  await page.click('#btn-resume');
  await page.waitForTimeout(250);
  check('jeda tertutup', await page.locator('#screen-pause').isHidden());

  console.log('— Tombol jeda HUD —');
  await page.click('#btn-pause');
  await page.waitForTimeout(200);
  check('tombol ⏸ membuka jeda', await page.locator('#screen-pause').isVisible());
  await page.click('#btn-restart');
  await page.waitForTimeout(500);
  check('ulangi level kembali ke mode level', await page.evaluate(() => __adf.game.mode === 'level' && !__adf.game.paused));

  console.log('— Menyelesaikan level (posisi ke goal, via debug) —');
  await page.evaluate(() => {
    const g = __adf.game, w = g.world;
    const pl = w.player;
    pl.x = w.goal.tx * 48 + 14;      // di dalam area banner
    pl.y = (w.goal.ty + 1) * 48 - pl.h - 2;
    pl.vx = 0;
  });
  await page.waitForTimeout(2600);
  check('layar hasil muncul', await page.locator('#screen-result').isVisible());
  const resTitle = await page.locator('#res-title').textContent();
  check('hasil = menang', /Selesai/.test(resTitle || ''), resTitle);
  const resStats = await page.locator('#res-stats').innerHTML();
  check('statistik hasil terisi', /<b>/.test(resStats), resStats.slice(0, 80));
  const unlockedAfter = await page.evaluate(() => __adf.save.progress.unlocked);
  check('level 2 terbuka', unlockedAfter >= 2, `unlocked=${unlockedAfter}`);
  await shot(page, '06-result.png');

  console.log('— Persistensi setelah reload —');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  check('unlocked bertahan setelah reload', await page.evaluate(() => __adf.save.progress.unlocked >= 2));
  await page.click('#btn-levels');
  await page.waitForTimeout(250);
  const lock1Off = await page.evaluate(() => {
    const el = document.getElementById('lv-lock-1');
    return el && !el.classList.contains('on');
  });
  check('kartu level 2 tidak terkunci', lock1Off);
  await shot(page, '07-levels.png');

  console.log('— Pengaturan —');
  await page.click('#levels-back');
  await page.waitForTimeout(150);
  await page.click('#btn-settings');
  await page.waitForTimeout(150);
  const sfxChecked = await page.locator('#set-sfx').isChecked();
  check('setelan SFX terbaca (checkbox terisi)', sfxChecked === true);
  await page.click('#set-music'); // matikan musik
  await page.waitForTimeout(100);
  check('toggle musik tersimpan', await page.evaluate(() => __adf.save.settings.musicOn === false));
  await shot(page, '08-settings.png');
  await page.click('#settings-close');

  await ctx.close();
}

// ============ MOBILE (sentuh) ============
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  watch(page, 'mobile');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  console.log('— MOBILE: menu & kontrol sentuh —');
  check('mobile: menu terlihat', await page.locator('#screen-menu').isVisible());
  await page.click('#btn-play');
  await page.waitForTimeout(250);
  await page.click('#char-start'); // pakai default terpilih
  await page.waitForTimeout(700);

  const tcVisible = await page.evaluate(() => {
    const el = document.getElementById('touch-controls');
    return el.classList.contains('on') && getComputedStyle(el).visibility !== 'hidden';
  });
  check('mobile: tombol sentuh tampil otomatis', tcVisible);
  await shot(page, 'm1-gameplay-touch.png');

  // tahan tombol kanan (touchstart/touchend nyata, jalur yang sama seperti perangkat)
  await page.evaluate(() => {
    const b = document.querySelector('[data-btn="right"]');
    const t = new Touch({ identifier: 7, target: b, clientX: 100, clientY: 800, pageX: 100, pageY: 800 });
    b.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(500);
  const heldRight = await page.evaluate(() => __adf.game.input.right);
  const vxTouch = await page.evaluate(() => __adf.game.world.player.vx);
  await page.evaluate(() => {
    const b = document.querySelector('[data-btn="right"]');
    const t = new Touch({ identifier: 7, target: b, clientX: 100, clientY: 800, pageX: 100, pageY: 800 });
    b.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true, cancelable: true }));
  });
  const heldRightAfter = await page.evaluate(() => __adf.game.input.right);
  check('mobile: tahan kanan menggerakkan', heldRight === true && vxTouch > 100, `right=${heldRight} vx=${vxTouch}`);
  check('mobile: lepas tombol berhenti', heldRightAfter === false);

  // lompat lewat sentuh
  await page.evaluate(() => {
    const b = document.querySelector('[data-btn="jump"]');
    const t = new Touch({ identifier: 8, target: b, clientX: 320, clientY: 760, pageX: 320, pageY: 760 });
    b.dispatchEvent(new TouchEvent('touchstart', { touches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(160);
  await page.evaluate(() => {
    const b = document.querySelector('[data-btn="jump"]');
    const t = new Touch({ identifier: 8, target: b, clientX: 320, clientY: 760, pageX: 320, pageY: 760 });
    b.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t], bubbles: true, cancelable: true }));
  });
  const wentUp = await page.evaluate(() => __adf.game.world.player.y < 920 - 8);
  check('mobile: tombol LOMPAT membuat melompat', wentUp);

  // tombol sentuh harus tidak memicu gesture peramban: periksa touch-action pada tombol
  const touchAction = await page.evaluate(() => getComputedStyle(document.querySelector('[data-btn="right"]')).touchAction);
  check('mobile: touch-action none', touchAction === 'none', touchAction);
  await ctx.close();
}

// ringkasan console error (digrup agar ringkas)
console.log('\n— Log konsol (error/warning) —');
const uniqErr = [];
for (const e of consoleErrors) {
  const k = e.replace(/\d+/g, '#');
  const found = uniqErr.find((u) => u.k === k);
  if (found) found.n++; else uniqErr.push({ k: e, n: 1 });
}
const uniqPage = [];
for (const e of pageErrors) {
  const found = uniqPage.find((u) => u.k === e);
  if (found) found.n++; else uniqPage.push({ k: e, n: 1 });
}
if (uniqErr.length === 0) pass('tidak ada console error/warning');
else {
  fail(`${consoleErrors.length} console error/warning`);
  uniqErr.slice(0, 10).forEach((u) => console.log(`   x${u.n} ${u.k}`));
}
if (uniqPage.length === 0) pass('tidak ada page error (exception JS)');
else {
  fail(`${pageErrors.length} page error`);
  uniqPage.slice(0, 10).forEach((u) => console.log(`   x${u.n} ${u.k}`));
}

await browser.close();
console.log(failures === 0 ? '\nQA BROWSER: SEMUA LOLOS ✔' : `\nQA BROWSER: ${failures} GAGAL ✖`);
process.exitCode = failures === 0 ? 0 : 1;

async function shots_snap(page, name) { await shot(page, name); }
