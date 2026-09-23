// shooter.mjs — load once, shoot many. Per SPEC-shooter.md.
// usage: node shooter.mjs jobs.txt   (one "<outfit> <pose> <framing> <out.png>" per line)
import { chromium } from 'playwright-core';
import { readFileSync, renameSync, mkdirSync, appendFileSync } from 'fs';
import { dirname } from 'path';
const exe = '/root/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell';

let jobs = [];
const arg2 = process.argv[2];
if (arg2 && arg2.endsWith('.txt')) {
  jobs = readFileSync(arg2,'utf8').split('\n').map(s=>s.trim()).filter(Boolean);
} else if (arg2) {
  jobs = [process.argv.slice(2).join(' ').trim()];
} else {
  console.error('usage: node shooter.mjs <jobsfile.txt>  |  node shooter.mjs "<outfit> <pose> <framing> <out.png>"'); process.exit(1);
}
const outfits = JSON.parse(readFileSync('outfits.json','utf8'));
const poses = JSON.parse(readFileSync('poses.json','utf8'));
const framings = JSON.parse(readFileSync('framings.json','utf8'));

const ALL_PIECES = ['Bikini Top','Bikini Bottom','Rindo BodySuit','Tops(Sleeveless)','Cardigan(Haruno Koromogae)','Casual dress 01','Casual dress 02','Casual dress 03','pants_low_hip','Rindo_shorts','Hip Piercing'];

const t0 = Date.now();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
browser.on('disconnected', () => { console.error('BROWSER DIED'); process.exit(2); });
const page = await browser.newPage({ viewport: { width: 960, height: 1080 } });
page.on('console', m => { const t = m.text(); if (!t.includes('boneNames')) console.log('[page]', t.slice(0,120)); });
await page.goto('http://127.0.0.1:8777/glb.html?model=rindo.glb');
await page.waitForFunction(() => window.__glbDebug && (window.__glbDebug.error || window.__glbDebug.error || window.__glbDebug.modelLoaded || window.__glbDebug.hairFlexDeg), null, { timeout: 120000 });
await page.waitForTimeout(3000);
console.log(`load: ${((Date.now()-t0)/1000).toFixed(1)}s`);

let ok = 0, failed = [];
for (const line of jobs) {
  const parts = line.split(/\s+/);
  const out = parts.pop();
  const framing = parts.pop();
  const pose = parts.pop();
  const outfit = parts.join(' ');
  const frame0 = await page.evaluate(() => window.__glbDebug.frame);
  try {
    // outfit: every piece off, then the set on
    for (const p of ALL_PIECES) await page.evaluate(p => window.__setClothing(p, false), p);
    for (const piece of outfits[outfit] || []) {
      await page.evaluate(name => window.__setClothing(name, true), piece);
    }
    // pose
    await page.evaluate(() => window.__setPose(null));
    if (pose && pose !== 'tpose') {
      for (const [bone, x, y, z] of poses[pose] || []) {
        await page.evaluate(([b, xx, yy, zz]) => window.__setPose(b, xx, yy, zz), [bone, x, y, z]);
      }
    }
    // framing
    if (framing && framings[framing]) await page.evaluate(f => window.__setCamera(f), framings[framing]);
    // freeze gate: frame must advance by >=3
    await page.waitForFunction((f0) => window.__glbDebug.frame >= f0 + 3, frame0, { polling: 250, timeout: 15000 });
    mkdirSync(dirname(out), { recursive: true });
    const tmp = out.replace(/\.png$/, '') + '.tmp.png';
    await page.screenshot({ path: tmp });
    renameSync(tmp, out);
    const frame1 = await page.evaluate(() => window.__glbDebug.frame);
    appendFileSync('shooter.log', `${line} f${frame0}->${frame1} OK\n`);
    console.log('SHOT:', out);
    ok++;
  } catch (e) {
    appendFileSync('shooter.log', `${line} FAIL ${String(e).slice(0,120)}\n`);
    console.error('FAIL:', line, String(e).slice(0,120));
    failed.push(line);
  }
}
console.log(`done: ${ok} ok, ${failed.length} failed`);
await browser.close().catch(()=>{});
process.exit(failed.length ? 1 : 0);
