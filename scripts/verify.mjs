// Smoke test of the built site in a real browser: pages load without errors, the layout holds
// on phone and desktop in both themes, and the TV keeps in step with the page.
// Prints a line per check and exits with 1 if any failed.
//
// usage: npm run verify            (builds, then serves dist/ on a spare port)
//        node scripts/verify.mjs   (checks the dist/ that's already there)
//
// Uses the Chrome installed on this machine (playwright-core downloads no browsers).
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 4329;
const BASE = `http://localhost:${PORT}`;
const PHONE = { width: 375, height: 812 };
const DESKTOP = { width: 1440, height: 900 };

let failed = 0;
function check(name, ok, detail = '') {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && detail ? `\n       ${detail}` : ''}`);
}

// --- serve dist/ ---------------------------------------------------------------------------
const server = spawn(`npx astro preview --port ${PORT}`, { shell: true, stdio: 'pipe' });
await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('astro preview did not start in 30 s')), 30_000);
  server.stdout.on('data', (d) => { if (String(d).includes(String(PORT))) { clearTimeout(timer); resolve(); } });
  server.on('exit', (code) => reject(new Error(`astro preview exited with ${code}`)));
});

const browser = await chromium.launch({
  channel: 'chrome',
  args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});

/** Opens a page and waits until the TV shows a picture. Collects errors into `errors`. */
async function open(path, { viewport = DESKTOP, colorScheme = 'dark' } = {}) {
  const context = await browser.newContext({ viewport, colorScheme });
  // the site is dark until the visitor switches: the light theme is a saved choice
  if (colorScheme === 'light') await context.addInitScript(() => localStorage.setItem('theme', 'light'));
  await context.route(/youtu|plarium|play\.google/, (r) => r.fulfill({ body: 'ok' }));   // links stay offline
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.tv-scene')?.dataset.signal === 'on', null, { timeout: 60_000 });
  await page.waitForTimeout(500);
  return { page, context, errors };
}

const tvState = (page) => page.evaluate(() => ({
  channel: Number(document.querySelector('[data-channel-number]').textContent),
  total: Number(document.querySelector('[data-channel-total]').textContent),
  highlighted: [...document.querySelectorAll('[data-project]')].findIndex((e) => e.classList.contains('is-on')) + 1,
}));

/** Scrolls so project i (0-based) sits just under the bar, the way one reads it. */
async function readProject(page, i) {
  await page.evaluate((i) => {
    const el = document.querySelectorAll('[data-project]')[i];
    const bar = document.querySelector('header.bar').offsetHeight;
    window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - bar - 40, behavior: 'instant' });
  }, i);
  await page.waitForTimeout(900);
}

async function clickTv(page) {
  const box = await page.locator('.tv-scene canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.45);   // the screen, inside the body
  await page.waitForTimeout(800);
}

try {
  // --- every page, phone and desktop, both themes --------------------------------------------
  for (const path of ['/', '/projects'])
    for (const viewport of [PHONE, DESKTOP])
      for (const colorScheme of ['dark', 'light']) {
        const { page, context, errors } = await open(path, { viewport, colorScheme });
        const where = `${path} ${viewport.width}px ${colorScheme}`;
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        check(`${where}: no horizontal scroll`, !overflow);
        check(`${where}: no errors`, errors.length === 0, errors.join(' | '));
        await context.close();
      }

  // --- links inside the page lead somewhere --------------------------------------------------
  {
    const { page, context } = await open('/');
    const missing = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h.length > 1 && !document.querySelector(h)));
    check('home: every #link has its target', missing.length === 0, missing.join(', '));
    await context.close();
  }

  // --- the bar is the same on both pages ------------------------------------------------------
  for (const width of [375, 800, 1440]) {
    const viewport = { width, height: 900 };
    const geometry = (page) => page.evaluate(() => [...document.querySelectorAll('header.bar :is(.bar-name, .bar-nav a, .theme)')]
      .map((e) => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round).join(','); }).join(' '));
    const home = await open('/', { viewport });
    await home.page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));   // the bar slides in
    await home.page.waitForTimeout(600);
    const projects = await open('/projects', { viewport });
    const [a, b] = [await geometry(home.page), await geometry(projects.page)];
    check(`bar at ${width}px: same place on both pages`, a === b, `home: ${a}\n       projects: ${b}`);
    await home.context.close();
    await projects.context.close();
  }

  // --- home: a click on the TV switches the channel -------------------------------------------
  {
    const { page, context } = await open('/');
    await clickTv(page);
    check('home: a click on the TV switches to channel 2', (await tvState(page)).channel === 2);
    await context.close();
  }

  // --- projects, desktop: the page drives the TV ----------------------------------------------
  {
    const { page, context } = await open('/projects');
    const count = await page.locator('[data-project]').count();
    check(`projects desktop: a channel per project (${count})`, (await tvState(page)).total === count);
    check('projects desktop: no "next" by the TV', !(await page.locator('[data-next]').isVisible()));
    const off = [];
    for (let i = 0; i < count; i++) {
      await readProject(page, i);
      const s = await tvState(page);
      if (s.channel !== i + 1 || s.highlighted !== i + 1) off.push(`project ${i + 1}: channel ${s.channel}, highlighted ${s.highlighted}`);
    }
    check('projects desktop: scrolling tunes the TV and highlights the project', off.length === 0, off.join('; '));
    await readProject(page, 0);
    const tabs = context.pages().length;
    await clickTv(page);
    check('projects desktop: a click on the TV opens the trailer', context.pages().length === tabs + 1);
    // gallery: the TV shows the screenshot under the cursor, a click opens the viewer
    const caption = () => page.locator('[data-channel-title]').textContent();
    await page.locator('.gallery').first().scrollIntoViewIfNeeded();
    await page.hover('.gallery [data-item="2"]');
    await page.waitForTimeout(600);
    check('projects desktop: hovering a screenshot puts it on the TV', /^SCREENSHOT 2\//.test(await caption()), await caption());
    await page.click('.gallery [data-item="2"]');
    await page.waitForTimeout(600);
    check('projects desktop: a click opens it full size', await page.evaluate(() => document.querySelector('.lightbox').open));
    await page.keyboard.press('Escape');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(500);
    check('projects desktop: the channel comes back after the gallery', !/^SCREENSHOT/.test(await caption()), await caption());
    await context.close();
  }

  // --- projects, phone: the TV is on its own, like on the home page ---------------------------
  {
    const { page, context } = await open('/projects', { viewport: PHONE });
    const withVideo = await page.evaluate(() => JSON.parse(document.querySelector('[data-tv-scene]').dataset.channels).filter((c) => c.video).length);
    check(`projects phone: only channels with a video (${withVideo})`, (await tvState(page)).total === withVideo);
    const tabs = context.pages().length;
    await clickTv(page);
    const s = await tvState(page);
    check('projects phone: a click switches the channel, opens nothing', s.channel === 2 && context.pages().length === tabs);
    await readProject(page, 3);
    check('projects phone: scrolling leaves the TV alone', (await tvState(page)).channel === 2);
    const bar = await page.evaluate(() => getComputedStyle(document.querySelector('[data-project]'), '::before').display);
    check('projects phone: no project marked as on the TV', bar === 'none');
    const before = await page.locator('[data-channel-title]').textContent();
    await page.locator('.gallery [data-item="1"]').first().click();
    await page.waitForTimeout(600);
    check('projects phone: a screenshot opens full size, the TV stays as it was',
      (await page.evaluate(() => document.querySelector('.lightbox').open)) && (await page.locator('[data-channel-title]').textContent()) === before);
    await context.close();
  }
} catch (err) {
  check('verify ran to the end', false, err.stack);
} finally {
  await browser.close();
  // the server runs under a shell: on Windows only killing the whole tree stops it
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], { stdio: 'ignore' });
  else server.kill();
}

console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
