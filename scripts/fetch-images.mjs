import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const IMG = path.join(root, 'public', 'images');
const MANIFEST_PATH = path.join(root, 'images.manifest.json');
const dna = JSON.parse(readFileSync(path.join(root, 'site.dna.json'), 'utf-8'));
const UA = 'GLP1StrengthCoach-image-bot/1.0 (personal education project; contact: site owner)';

const raw = readFileSync(path.join(root, 'data', 'matrix.txt'), 'utf-8');
const lines = raw.split('\n').filter(l => l.trim() !== '');
const header = lines[0].split('|');
const rows = lines.slice(1).map(line => {
  const cols = line.split('|');
  const o = {};
  header.forEach((h, i) => { o[h] = (cols[i] || '').trim(); });
  return o;
});

mkdirSync(IMG, { recursive: true });
const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) : { images: {}, queries_with_no_photo: [] };
manifest.images = manifest.images || {};
const used = new Set(Object.values(manifest.images).filter(i => i.kind === 'photo').map(i => i.originalUrl));

// ---------- licence ----------
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
function licenseAccept(lic) {
  const n = norm(lic);
  if (!n) return { ok: false, n };
  if (n.includes('-nc') || n.includes('-nd')) return { ok: false, n };
  const ok = n === 'cc0' || n.startsWith('cc0-') || n === 'public-domain' || n.startsWith('public-domain-') || n.startsWith('pd-') ||
    n === 'cc-by' || /^cc-by-\d/.test(n) || n === 'cc-by-sa' || /^cc-by-sa-\d/.test(n);
  return { ok, n };
}
function licenseUrl(n) {
  if (!n) return '';
  if (n === 'cc0' || n.startsWith('cc0-')) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  if (n.startsWith('public-domain') || n.startsWith('pd-')) return 'https://creativecommons.org/publicdomain/mark/1.0/';
  let m = n.match(/^cc-by-sa-(\d)/); if (m) return 'https://creativecommons.org/licenses/by-sa/' + m[1] + '.0/';
  m = n.match(/^cc-by-(\d)/); if (m) return 'https://creativecommons.org/licenses/by/' + m[1] + '.0/';
  if (n === 'cc-by-sa') return 'https://creativecommons.org/licenses/by-sa/4.0/';
  if (n === 'cc-by') return 'https://creativecommons.org/licenses/by/4.0/';
  return '';
}

// ---------- filters ----------
const PERSON = /\b(man|woman|men|women|person|people|girl|boy|face|portrait|selfie|crowd)\b/i;
const BADTITLE = /svg|map|logo|diagram/i;
const MILGOV = /military|air force|navy|army|marines|department of defense|government|usda|u\.s\. department|nasa|jpl|museum/i;
const STOPW = new Set(['a','an','the','of','with','on','in','at','for','and','or','person','people','doing','older','showing','holding','next','to','into','over','under','plain','spoon','scoop','desk','nightstand','stack','sliced','cooked','canned','raw','baked','whole','firm','dry','shelled','low','fat','deli','sugar','light','sodium','water','drained','skinless','brown','green','young','fermented']);
const SYN = { shrimp: ['prawn'], yogurt: ['yoghurt'], sardine: ['pilchard'], edamame: ['soy'], tofu: ['bean','curd'] };
const stem = w => w.replace(/s$/, '');
const hasWord = (t, k) => new RegExp('\\b' + k + 's?\\b').test(t);
function foodRelevant(title, r) {
  const t = (title || '').toLowerCase();
  return r.slug.split('-').filter(x => x && !STOPW.has(x)).map(stem).every(k => hasWord(t, k) || (SYN[k] || []).some(s => hasWord(t, s)));
}
function needOk(title, need) {
  const t = (title || '').toLowerCase();
  return need.every(ph => {
    const words = ph.split(' ');
    const last = words[words.length - 1];
    return new RegExp('\\b' + words.slice(0, -1).concat(last + 's?').join(' ') + '\\b').test(t);
  });
}
function seedOf(slug) { let h = 7; for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- adjusted phrases (codified manual searches) ----------
const ADJUSTED = {
  'greek-yogurt': [{ q: 'greek yogurt' }, { q: 'yogurt bowl' }],
  'cottage-cheese': [{ q: 'cottage cheese' }, { q: 'bowl of low fat cottage cheese' }],
  'canned-tuna': [{ q: 'canned tuna' }, { q: 'tuna fillet' }],
  'chicken-breast': [{ q: 'chicken breast' }, { q: 'grilled chicken breast' }],
  'edamame': [{ q: 'edamame' }, { q: 'soy beans' }],
  'tempeh': [{ q: 'tempeh' }],
  'lentils-cooked': [{ q: 'lentils' }, { q: 'lentil dish' }],
  'tofu-firm': [{ q: 'tofu' }, { q: 'bean curd' }],
  'sardines-canned': [{ q: 'canned sardines' }, { q: 'sardines' }],
  'whey-protein': [{ q: 'protein powder' }, { q: 'whey powder' }],
  'eggs-whole': [{ q: 'boiled eggs' }, { q: 'eggs' }],
  'shrimp-cooked': [{ q: 'cooked shrimp' }, { q: 'prawns' }],
  'turkey-breast-deli': [{ q: 'sliced turkey breast' }, { q: 'turkey breast' }],
  'hemp-seeds': [{ q: 'hemp seeds' }],
  'chia-seeds': [{ q: 'chia seeds' }],
  'nutritional-yeast': [{ q: 'nutritional yeast' }],
  'black-beans-canned': [{ q: 'black beans' }],
  'seitan': [{ q: 'seitan' }],
  'pumpkin-seeds': [{ q: 'pumpkin seeds' }],
  'pumpkin-seeds': [{ q: 'pumpkin seeds' }, { q: 'pepitas' }],
  'almonds-raw': [{ q: 'almonds' }],
  'peanut-butter-powder': [{ q: 'peanut butter powder' }, { q: 'peanut butter' }],
  'peanut-butter-powder': [{ q: 'peanut butter' }, { q: 'peanut flour' }],
  'salmon-baked': [{ q: 'baked salmon' }, { q: 'salmon fillet' }],
   'salmon-baked': [{ q: 'salmon fillet' }, { q: 'cooked salmon' }],
  'protein-bar-low-sugar': [{ q: 'protein bar' }],
  'protein-bar-low-sugar': [{ q: 'protein bar' }, { q: 'energy bar' }],
  'nausea-day': [{ q: 'ginger tea', need: ['tea'] }, { q: 'glass of water', need: ['water'] }],
  'injection-day-fatigue': [{ q: 'weekly planner', need: ['planner'] }, { q: 'calendar', need: ['calendar'] }],
  'early-satiety-day': [{ q: 'small portion plate', need: ['plate'] }, { q: 'dinner plate food', need: ['plate'] }],
  'low-appetite-morning': [{ q: 'coffee cup', need: ['cup'] }, { q: 'breakfast table', need: ['breakfast'] }],
  'dining-out-protein': [{ q: 'restaurant table', need: ['restaurant'] }],
  'week-1-vs-week-12': [{ q: 'calendar', need: ['calendar'] }, { q: 'planner notebook', need: ['planner'] }],
  'constipation-day': [{ q: 'glass of water', need: ['water'] }],
  'travel-day': [{ q: 'suitcase', need: ['suitcase'] }, { q: 'packed luggage', need: ['luggage'] }],
  'sleep-deprived-morning': [{ q: 'alarm clock', need: ['clock'] }, { q: 'bedroom morning', need: ['bed'] }],
  'hot-weather-day': [{ q: 'glass of water', need: ['water'] }],
  'stressful-work-day': [{ q: 'tea cup desk', need: ['cup'] }, { q: 'office desk', need: ['desk'] }],
  'cold-flu-day': [{ q: 'thermometer', need: ['thermometer'] }, { q: 'tissue box', need: ['tissue'] }]
};
function sceneAttempts(r) {
  if (r.category === 'EXERCISE') {
    if (r.equipment === 'LIGHT_DUMBBELLS') return [{ q: 'dumbbells', need: ['dumbbell'] }, { q: 'dumbbell pair', need: ['dumbbell'] }];
    if (r.equipment === 'BOTH') return [{ q: 'resistance band', need: ['resistance band'] }, { q: 'exercise band', need: ['exercise band'] }];
    return [{ q: 'yoga mat', need: ['mat'] }, { q: 'exercise mat', need: ['mat'] }];
  }
  if (r.category === 'SESSION') return [{ q: 'yoga mat', need: ['mat'] }, { q: 'exercise mat rolled', need: ['mat'] }];
  return [];
}
function attemptsFor(r) {
  if (ADJUSTED[r.slug]) return ADJUSTED[r.slug];
  const scene = sceneAttempts(r);
  if (scene.length) return scene;
  return [];
}
function ladder(q) {
  const words = q.toLowerCase().split(/[^a-z]+/).filter(w => w && !STOPW.has(w));
  const steps = [];
  const push = s => { if (s && !steps.includes(s)) steps.push(s); };
  push(words.join(' '));
  if (words.length > 4) push(words.slice(0, 4).join(' '));
  if (words.length > 3) push(words.slice(0, 3).join(' '));
  if (words.length > 2) push(words.slice(0, 2).join(' '));
  if (words.length > 3) push(words.slice(-3).join(' '));
  if (words.length > 2) push(words.slice(-2).join(' '));
  return steps.filter(Boolean);
}

// ---------- polite search with retry ----------
let networkFailures = 0;
let lastStatus = '';
let lastReq = 0;
async function searchCommons(q) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=' +
    encodeURIComponent('filetype:bitmap ' + q) +
    '&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url%7Csize%7Cmime%7Cextmetadata&iiurlwidth=1600';
  for (let attempt = 0; attempt < 2; attempt++) {
    const wait = Math.max(0, 350 - (Date.now() - lastReq));
    if (wait) await sleep(wait);
    lastReq = Date.now();
    let res;
    try { res = await fetch(url, { headers: { 'User-Agent': UA } }); }
    catch (e) { lastStatus = 'NETFAIL'; continue; }
    lastStatus = res.status;
    if (res.status === 429 || res.status >= 500) { await sleep(2500); continue; }
    if (!res.ok) { networkFailures++; return { status: res.status, results: [] }; }
    const j = await res.json();
    const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
    const out = [];
    for (const p of pages) {
      const ii = p.imageinfo && p.imageinfo[0];
      if (!ii) continue;
      const em = ii.extmetadata || {};
      const clean = v => (v && v.value ? String(v.value).replace(/<[^>]+>/g, ' ').trim() : '');
      out.push({
        title: p.title || '', mime: ii.mime || '', width: ii.width || 0, height: ii.height || 0,
        thumb: ii.thumburl || '', originalUrl: ii.descriptionurl || '',
        artist: cleanArtist(clean(em.Artist)), lic: clean(em.LicenseShortName)
      });
    }
    return { status: res.status, results: out };
  }
  networkFailures++;
  return { status: lastStatus || 'NETFAIL', results: [] };
}
function cleanArtist(s) {
  return String(s || '').replace(/\s+/g, ' ').split(/Email|Also see|This image was made/)[0].trim() || 'Unknown photographer';
}

function acceptCandidate(c, r, need) {
  if (used.has(c.originalUrl)) return { ok: false, reason: 'already a hero on another page' };
  if (!c.mime.startsWith('image/') || c.mime === 'image/svg+xml') return { ok: false, reason: 'not a raster photo (' + c.mime + ')' };
  if (c.width < 1000) return { ok: false, reason: 'under 1000px wide (' + c.width + ')' };
  if (c.width <= c.height) return { ok: false, reason: 'not landscape (' + c.width + 'x' + c.height + ')' };
  if (BADTITLE.test(c.title)) return { ok: false, reason: 'title suggests svg/map/logo/diagram' };
  if (PERSON.test(c.title)) return { ok: false, reason: 'person words in title (safety rule)' };
  const la = licenseAccept(c.lic);
  if (!la.ok) return { ok: false, reason: 'licence rejected (' + (c.lic || 'none') + ')' };
  if (r.category === 'FOOD' && !foodRelevant(c.title, r)) return { ok: false, reason: 'title does not name this food' };
  if (r.category !== 'FOOD' && need && need.length && !needOk(c.title, need)) return { ok: false, reason: 'title lacks required object (' + need.join(' ') + ')' };
  return { ok: true, milgov: MILGOV.test(c.title + ' ' + c.artist) };
}

// ---------- pools ----------
const poolCache = new Map();
const queriesWithNoPhoto = new Set();
async function resolvePool(r, att) {
  const key = att.q + '::' + (r.category === 'FOOD' ? r.slug : (att.need || []).join(','));
  if (poolCache.has(key)) return poolCache.get(key);
  const pool = [];
  const { results } = await searchCommons(att.q);
  for (const c of results) {
    if (pool.length >= 4) break;
    const a = acceptCandidate(c, r, att.need);
    if (a.ok && !pool.some(p => p.originalUrl === c.originalUrl)) pool.push(Object.assign({ milgov: a.milgov }, c));
  }
  pool.sort((a, b) => (a.milgov ? 1 : 0) - (b.milgov ? 1 : 0));
  poolCache.set(key, pool);
  return pool;
}

async function downloadPhoto(sel, slug) {
  const res = await fetch(sel.thumb);
  if (!res.ok) throw new Error('download HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  const widths = [1280, 800, 480].filter(w => w <= (meta.width || 0));
  if (!widths.length) throw new Error('source smaller than 480px');
  const files = {};
  for (const w of widths) {
    files[w] = '/images/' + slug + '-' + w + '.webp';
    await sharp(buf).rotate().resize(w).webp({ quality: 78 }).toFile(path.join(IMG, slug + '-' + w + '.webp'));
  }
  const wMax = widths[0];
  return {
    kind: 'photo', provider: 'commons', files,
    width: wMax, height: Math.round(wMax * meta.height / meta.width),
    artist: sel.artist, license: sel.lic, licenseUrl: licenseUrl(norm(sel.lic)),
    source: 'Wikimedia Commons', originalUrl: sel.originalUrl, alt: ''
  };
}

function svgFor(r, seed) {
  const ink = dna.palette.ink, accent = dna.palette.accent, surface = dna.palette.surface, warn = dna.palette.warning;
  const icons = {
    EXERCISE: '<path d="M430 360h420" stroke-width="18"/><rect x="360" y="300" width="50" height="120" rx="12"/><rect x="870" y="300" width="50" height="120" rx="12"/><rect x="310" y="325" width="34" height="70" rx="10"/><rect x="936" y="325" width="34" height="70" rx="10"/>',
    FOOD: '<circle cx="640" cy="360" r="170" stroke-width="16"/><circle cx="640" cy="360" r="105" stroke-width="16"/><path d="M790 470l70 70" stroke-width="16"/>',
    SESSION: '<circle cx="640" cy="360" r="170" stroke-width="16"/><path d="M640 250v110l75 45" stroke-width="16"/><path d="M575 165h130" stroke-width="16"/>',
    SITUATION: '<path d="M640 190l170 300H470z" stroke-width="16"/><path d="M640 300v70" stroke-width="16"/><circle cx="640" cy="420" r="10" fill="' + ink + '" stroke="none"/>',
    MEDICATION: '<rect x="565" y="230" width="150" height="260" rx="24" stroke-width="16"/><path d="M640 230v-60" stroke-width="16"/><rect x="600" y="300" width="70" height="110" rx="10" fill="' + accent + '" stroke="none"/>',
    GLOSSARY: '<path d="M450 260h150a40 40 0 0 1 40 40v180a40 40 0 0 0-40-40H450z" stroke-width="16"/><path d="M830 260H680a40 40 0 0 0-40 40v180a40 40 0 0 1 40-40h150z" stroke-width="16"/>'
  };
  const icon = icons[r.category] || icons.GLOSSARY;
  const rot = (seed % 7) - 3;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="' + surface + '"/><g transform="rotate(' + rot + ' 640 360)" stroke="' + ink + '" fill="none" stroke-linecap="round" stroke-linejoin="round">' + icon + '</g><circle cx="' + (200 + (seed % 5) * 40) + '" cy="620" r="12" fill="' + warn + '"/></svg>';
}
function writeSvg(r) {
  writeFileSync(path.join(IMG, r.slug + '.svg'), svgFor(r, seedOf(r.slug)));
  manifest.images[r.slug] = {
    kind: 'svg', files: {}, base: '/images/' + r.slug + '.svg', width: 1280, height: 720,
    artist: 'Original illustration', license: 'Original work, site-owned', licenseUrl: '',
    source: dna.siteName, originalUrl: '',
    alt: 'Line illustration for the ' + r.entity_name + ' page, drawn in the site style.'
  };
}

async function diagnose(q) {
  console.log('DIAGNOSE: "' + q + '"');
  for (const step of ladder(q)) {
    const { status, results } = await searchCommons(step);
    console.log('\n— ladder step: "' + step + '" | HTTP ' + status + ' | results: ' + results.length);
    for (const c of results.slice(0, 10)) {
      const a = acceptCandidate(c, { category: 'X', slug: 'x' }, []);
      console.log((a.ok ? 'ACCEPT' : 'REJECT') + ' | ' + c.title + ' | ' + c.width + 'x' + c.height + ' | ' + (c.lic || 'no licence') + ' | ' + (a.ok ? 'milgov=' + a.milgov : a.reason));
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--diagnose') { await diagnose(args.slice(1).join(' ')); return; }

  let photos = 0, svgs = 0, skipped = 0;
  const policy = [];
  for (const r of rows) {
    if (manifest.images[r.slug]) { skipped++; continue; }
    if (r.category === 'MEDICATION' || r.category === 'GLOSSARY') { writeSvg(r); policy.push(r.slug); svgs++; continue; }

    const attempts = attemptsFor(r).concat(ladder(r.image_query).map(q => ({ q, need: (attemptsFor(r)[0] || {}).need })));
    let done = null;
    for (const att of attempts) {
      const pool = await resolvePool(r, att);
      if (pool.length) { done = { sel: pool[seedOf(r.slug) % pool.length], q: att.q }; break; }
    }
    if (done) {
      try {
        const entry = await downloadPhoto(done.sel, r.slug);
        used.add(done.sel.originalUrl);
        entry.alt = 'Reference photo for ' + r.entity_name + ', a ' + (r.category || '').toLowerCase() + ' entry in the ' + dna.siteName + ' library.';
        manifest.images[r.slug] = entry;
        photos++;
        console.log('📷 ' + r.slug + ' → ' + entry.license + ' by ' + entry.artist + '  [query: ' + done.q + ']');
        continue;
      } catch (e) {
        networkFailures++;
        console.log('⚠️  download/write failed for ' + r.slug + ': ' + e.message + '  (network/proxy or disk — NOT "no photo found")');
      }
    }
    console.log('⚠️  no photo found for ' + r.slug + ' — illustration used, flagged');
    queriesWithNoPhoto.add(r.image_query);
    writeSvg(r);
    svgs++;
  }

  manifest.queries_with_no_photo = [...queriesWithNoPhoto];
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  const total = rows.length;
  const withImage = Object.keys(manifest.images).length;
  const pct = Math.round((withImage / total) * 100);
  const photoTotal = Object.values(manifest.images).filter(i => i.kind === 'photo').length;
  console.log('coverage: ' + withImage + '/' + total + ' (' + pct + '%)');
  console.log('photos total: ' + photoTotal + ' (new this run: ' + photos + ') | illustrations: ' + (withImage - photoTotal) + ' (policy: ' + policy.length + ')');
  console.log('network/proxy failures: ' + networkFailures);
  console.log(queriesWithNoPhoto.size ? 'queries with no photo: ' + [...queriesWithNoPhoto].join(' | ') : 'queries with no photo: none');
  if (withImage / total < 0.9) { console.error('❌ coverage under 90% — exiting non-zero'); process.exit(1); }
  console.log('🎉 manifest written. Commit public/images/ and images.manifest.json when you next commit.');
}

main().catch(e => { console.error('❌ ' + e.message); process.exit(1); });