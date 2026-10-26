import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { esc, has, seedOf, renderBody, shell, css } from './templates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const OUT = path.join(root, 'public');
   const SITE_URL = 'https://glp-strength-coach.vercel.app';

const dna = JSON.parse(readFileSync(path.join(root, 'site.dna.json'), 'utf-8'));
const manifest = JSON.parse(readFileSync(path.join(root, 'images.manifest.json'), 'utf-8'));

// Protocol Guard: verify v9 manifest schema
for (const [slug, img] of Object.entries(manifest.images)) {
  if (img.kind === 'photo' && (!img.alt || !img.license || !img.width || !img.height)) {
    throw new Error('Image manifest incomplete for ' + slug + ' (missing alt/license/width/height)');
  }
}

const raw = readFileSync(path.join(root, 'data', 'matrix.txt'), 'utf-8');
const lines = raw.split('\n').filter(l => l.trim() !== '');
const header = lines[0].split('|');
const rows = lines.slice(1).map(line => {
  const cols = line.split('|');
  const o = {};
  header.forEach((h, i) => { o[h] = (cols[i] || '').trim(); });
  return o;
});

const FOLDER = { EXERCISE: 'exercises', FOOD: 'foods', SITUATION: 'days', SESSION: 'plans', MEDICATION: 'medications', GLOSSARY: 'glossary' };
const LABEL = { EXERCISE: 'Exercises', FOOD: 'Foods', SITUATION: 'Low-Energy Days', SESSION: 'Sessions', MEDICATION: 'Medications', GLOSSARY: 'Glossary' };
const TIER = { LOW: 'Low — fine on a rough day', MODERATE: 'Moderate — needs a decent day', HIGH: 'High — only on strong days' };
const ROLE = { STIMULUS: 'Strength stimulus', PROTEIN_DELIVERY: 'Protein delivery', RECOVERY: 'Recovery', GUARDRAIL: 'Safety guardrail', STRUCTURE: 'Programming structure' };
const EQUIP = { BODYWEIGHT: 'Bodyweight', LIGHT_DUMBBELLS: 'Light dumbbells', BOTH: 'Bodyweight or light dumbbells', HOUSEHOLD: 'Household items', NONE: 'No equipment' };
const PROFILE = { FIRST_TIME: 'first-time lifters', RETURNING: 'returning after a break', TRAINED_50P: 'trained adults over 50' };
const REL_HEAD = {
  EXERCISE: 'Read next: related movements and fuel',
  FOOD: 'Read next: pair it with these',
  SITUATION: 'Read next: for the days around this one',
  SESSION: 'Read next: fuel and fallbacks',
  MEDICATION: 'Read next: what to plan around it',
  GLOSSARY: 'Read next: related terms and practice'
};
const HUB_INTRO = {
  EXERCISE: 'Every movement here uses bodyweight or light dumbbells, and every one has a named low-energy swap. Nothing on this site is "push through it".',
  FOOD: 'Protein-first foods ranked by how much protein they deliver per calorie — because on a GLP-1 your appetite budget is small.',
  SITUATION: 'Playbooks for the days that do not go to plan: nausea, injection-day fatigue, poor sleep, travel, heat, illness.',
  SESSION: 'Complete sessions built by energy tier. Pick the one that matches how you actually feel this morning.',
  MEDICATION: 'Context pages for the medications themselves — what the escalation schedule means for how you train.',
  GLOSSARY: 'Plain-English definitions of every term used across this site, each linked to a public source.'
};

const bySlug = new Map(rows.map(r => [r.slug, r]));
function pairingSlug(v) {
  if (!has(v)) return null;
  const token = v.split(/[ (]/)[0].trim();
  return bySlug.has(token) ? token : null;
}
function relatedFor(r) {
  const scored = [];
  const myPair = pairingSlug(r.best_pairing);
  for (const o of rows) {
    if (o.slug === r.slug) continue;
    let s = 0;
    if (o.category === r.category) s += 1;
    if (o.demand_tier === r.demand_tier) s += 1;
    if (o.muscle_role === r.muscle_role) s += 2;
    if (o.equipment === r.equipment) s += 1;
    if (myPair === o.slug) s += 3;
    if (pairingSlug(o.best_pairing) === r.slug) s += 3;
    if (s > 0) scored.push([s, o]);
  }
  scored.sort((a, b) => b[0] - a[0] || (a[1].slug < b[1].slug ? -1 : 1));
  return scored.slice(0, 4).map(x => x[1]);
}
for (const r of rows) {
  r._related = relatedFor(r);
  r._pairing = pairingSlug(r.best_pairing);
}

function clampDesc(d) {
  if (d.length > 160) { d = d.slice(0, 157); d = d.slice(0, d.lastIndexOf(' ')) + '…'; }
  if (d.length < 120) {
    d = d.slice(0, -1) + ' — evidence-referenced guidance for adults over 50 training on GLP-1 medication.';
    if (d.length > 160) d = d.slice(0, 157) + '…';
  }
  return d;
}
function makeTitle(r) {
  const suffix = ' — ' + dna.siteName;
  let t = r.entity_name + suffix;
  if (t.length > 60) t = r.entity_name;
  if (t.length > 60) t = t.slice(0, 57).trimEnd() + '…';
  return t;
}
function makeDescription(r) {
  let d = r.summary_fact.replace(/\.$/, '') + '. ';
  if (has(r.deload_variant) && r.category !== 'GLOSSARY') d += 'Low-energy day: ' + r.deload_variant.replace(/\.$/, '') + '. ';
  d += 'Part of the GLP-1 Strength Coach library.';
  return clampDesc(d);
}

function heroHtml(slug) {
  const img = manifest.images[slug];
  if (!img) return '';
  if (img.kind === 'photo') {
    const srcset = Object.entries(img.files).map(([w, p]) => `${p} ${w}w`).join(', ');
    const fallback = img.files['1280'] || Object.values(img.files).pop();
    return `<figure class="hero">
<div class="hero-frame" style="aspect-ratio:${img.width}/${img.height};background-color:var(--surface)">
<picture>
<source type="image/webp" srcset="${srcset}" sizes="100vw">
<img src="${fallback}" width="${img.width}" height="${img.height}" alt="${esc(img.alt)}" fetchpriority="high">
</picture>
</div>
<figcaption>Photo: <a href="${img.originalUrl}" rel="noopener">${esc(img.artist)}</a> / ${esc(img.source)} · <a href="${img.licenseUrl || '#'}" rel="license">${esc(img.license)}</a></figcaption>
</figure>\n`;
  }
  return `<figure class="hero">
<img src="${img.base}" width="${img.width}" height="${img.height}" alt="${esc(img.alt)}" fetchpriority="high">
<figcaption>${esc(img.credit || 'Original illustration')}</figcaption>
</figure>\n`;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'style.css'), css(dna));

const counts = {};
for (const r of rows) counts[r.category] = (counts[r.category] || 0) + 1;
const ctxBase = { bySlug, FOLDER, LABEL, TIER, ROLE, EQUIP, PROFILE, REL_HEAD };

for (const r of rows) {
  const folder = FOLDER[r.category];
  const dir = path.join(OUT, folder, r.slug);
  mkdirSync(dir, { recursive: true });
  const c = Object.assign({ seed: seedOf(r.slug), related: r._related, pairing: r._pairing }, ctxBase);

  const schema = [
    { "@context": "https://schema.org", "@type": "Article", "headline": r.entity_name, "description": makeDescription(r), "dateModified": r.last_checked, "audience": { "@type": "Audience", "audienceType": "Adults over 50 using GLP-1 medications" }, "publisher": { "@type": "Organization", "name": dna.siteName } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL }, { "@type": "ListItem", "position": 2, "name": LABEL[r.category], "item": `${SITE_URL}/${folder}/` }, { "@type": "ListItem", "position": 3, "name": r.entity_name } ] }
  ];

  let body = renderBody(r, c);
  body = body.replace('</h1>', '</h1>\n' + heroHtml(r.slug));

  const html = shell({ title: makeTitle(r), description: makeDescription(r), canonical: `${SITE_URL}/${folder}/${r.slug}/`, asOf: r.last_checked, robots: r.auditing_status === 'UNVERIFIED-DRAFT' ? 'noindex,nofollow' : 'index,follow', body, schema, dna });
  writeFileSync(path.join(dir, 'index.html'), html);
}

for (const cat of Object.keys(FOLDER)) {
  const folder = FOLDER[cat];
  const dir = path.join(OUT, folder);
  mkdirSync(dir, { recursive: true });
  const items = rows.filter(r => r.category === cat);
  const list = items.map(r => `<li><a href="/${folder}/${r.slug}/">${esc(r.entity_name)}</a><span class="sum">${esc(r.summary_fact)}</span></li>`).join('\n');
  const intro = HUB_INTRO[cat];
  const body = `<article>\n  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">›</span> ${LABEL[cat]}</nav>\n  <h1>${LABEL[cat]}</h1>\n  <p>${esc(intro)}</p>\n  <p><strong>${items.length} entries.</strong> Each page states whether its numbers are SOURCED or ESTIMATED.</p>\n  <ul class="hublist">\n${list}\n  </ul>\n</article>`;
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", "name": LABEL[cat], "description": clampDesc(intro) };
  const html = shell({ title: `${LABEL[cat]} — ${dna.siteName}`, description: clampDesc(intro + ` ${items.length} entries, each with a linked public source or a labeled estimate.`), canonical: `${SITE_URL}/${folder}/`, asOf: '2025-09-15', robots: 'index,follow', body, schema, dna });
  writeFileSync(path.join(dir, 'index.html'), html);
}

const cards = Object.keys(FOLDER).map(cat => `<div class="card"><a href="/${FOLDER[cat]}/">${LABEL[cat]}</a><p>${counts[cat] || 0} pages — ${esc(HUB_INTRO[cat])}</p></div>`).join('\n');
const homeBody = `<article>\n  <h1>Strength training that respects your medication</h1>\n  <p>Most fitness sites assume you feel the same every day. On a GLP-1, you don't. Every page in this library starts from one question: <strong>given the energy you actually have today, what is the right amount?</strong> Low-energy days get a named, planned lighter option — a deload, not a failure.</p>\n  <p>Built for adults over 50 using bodyweight or light dumbbells, with protein guidance designed for a small appetite.</p>\n  <h2>Browse the library</h2>\n  <div class="cards">\n${cards}\n  </div>\n  <h2>How this site stays honest</h2>\n  <ul>\n    <li>Every number is linked to a public source, or clearly labeled <strong>ESTIMATED</strong> with its method stated.</li>\n    <li>This is training guidance, not medical advice. Medication questions go to your prescriber.</li>\n    <li>No before/after promises, no outcome guarantees — the goal is muscle preservation and consistency.</li>\n  </ul>\n</article>`;
writeFileSync(path.join(OUT, 'index.html'), shell({ title: `${dna.siteName} — Strength Training on GLP-1s`, description: clampDesc('Adaptive, energy-aware strength training for adults over 50 on GLP-1 medications. Named deloads for low-energy days, protein targets for small appetites, bodyweight or light dumbbells only.'), canonical: `${SITE_URL}/`, asOf: '2025-09-15', robots: 'index,follow', body: homeBody, schema: { "@context": "https://schema.org", "@type": "WebSite", "name": dna.siteName, "url": SITE_URL, "description": "Adaptive, energy-aware strength training for adults over 50 on GLP-1 medications." }, dna }));

const photos = Object.entries(manifest.images).filter(([s, i]) => i.kind === 'photo');
let creditsBody = `<article>\n  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">›</span> Image credits</nav>\n  <h1>Image credits</h1>\n  <p>Every photograph on this site is used under a permissive license and credited here and under the image. Illustrations are original works drawn in the site style.</p>\n  <ul class="hublist">\n${photos.map(([slug, img]) => `<li><a href="/${FOLDER[rows.find(r => r.slug === slug)?.category || 'foods']}/${slug}/">${esc(slug)}</a> — ${esc(img.artist)} / ${esc(img.source)} · <a href="${img.licenseUrl || '#'}" rel="license">${esc(img.license)}</a> · <a href="${img.originalUrl}" rel="noopener">source</a></li>`).join('\n')}\n  </ul>\n</article>`;
writeFileSync(path.join(OUT, 'credits.html'), shell({ title: `Image credits — ${dna.siteName}`, description: 'Credits and licenses for all photographs and illustrations used on this site.', canonical: `${SITE_URL}/credits.html`, asOf: '2025-09-15', robots: 'index,follow', body: creditsBody, schema: { "@context": "https://schema.org", "@type": "WebPage", "name": "Image credits" }, dna }));

function generateSitemap() {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += `  <url><loc>${SITE_URL}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;
  for (const cat of Object.keys(FOLDER)) xml += `  <url><loc>${SITE_URL}/${FOLDER[cat]}/</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>\n`;
  for (const r of rows) { if (r.auditing_status !== 'UNVERIFIED-DRAFT') xml += `  <url><loc>${SITE_URL}/${FOLDER[r.category]}/${r.slug}/</loc><lastmod>${r.last_checked}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`; }
  xml += `  <url><loc>${SITE_URL}/credits.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>\n`;
  return xml + '</urlset>';
}
writeFileSync(path.join(OUT, 'sitemap.xml'), generateSitemap());
writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
let md = `# ${dna.siteName}\n\n> Adaptive, energy-aware strength training for adults over 50 on GLP-1 medications. Named deloads for low-energy days, protein targets for small appetites.\n\n## Site Structure\n`;
for (const cat of Object.keys(FOLDER)) md += `- **${LABEL[cat]}**: ${HUB_INTRO[cat]}\n`;
md += `\n## Data Integrity\nEvery data point is either linked to a public source (FDA, USDA, ACSM) or labeled as an estimate with its method stated. This site is strictly training and nutrition guidance, not medical advice.`;
writeFileSync(path.join(OUT, 'llms.txt'), md);

console.log('✅ Pages written: ' + rows.length);
console.log('✅ Hubs written: ' + Object.keys(FOLDER).length);
console.log('✅ Credits page written');
const missing = rows.filter(r => !manifest.images[r.slug]).map(r => r.slug);
console.log(missing.length ? '⚠️  Pages without an image: ' + missing.join(', ') : '✅ Every page has an image');
// ---------- Emit lightweight matrix.json for the interactive coach ----------
const coachData = rows.map(r => ({
  slug: r.slug,
  entity_name: r.entity_name,
  category: r.category,
  demand_tier: r.demand_tier,
  equipment: r.equipment,
  summary_fact: r.summary_fact,
  deload_variant: r.deload_variant
}));
writeFileSync(path.join(OUT, 'matrix.json'), JSON.stringify(coachData, null, 2));
console.log('🎉 Done. Refresh http://localhost:8899');