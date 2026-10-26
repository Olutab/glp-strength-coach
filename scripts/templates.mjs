// templates.mjs — writing + design module (v4)
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const has = v => !!v && v.length > 0 && v !== 'None' && !/^None\s*—/.test(v);
export const lc = s => s.charAt(0).toLowerCase() + s.slice(1);

export function seedOf(slug) { let h = 7; for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
export function pick(pool, seed, salt = 0) { return pool[(seed + salt) % pool.length]; }

const H2 = {
  facts: ['Key facts', 'At a glance', 'The quick read'],
  howto: ['How to run it today', 'Running it well', 'Your session, step by step'],
  math: ['The protein math', 'What it costs your appetite', 'Portion math'],
  day: ['What today looks like', 'A plan for the day', 'Hour by hour'],
  flow: ["If / then: choosing today's version", 'The two-minute decision', "Pick today's version"],
  wrong: ['When this is the wrong choice', 'When to skip it', 'Not the right tool if'],
  neighbors: ['How it compares', 'Side by side', 'Neighbors in the library'],
  stop: ['When to stop and check with a clinician', 'Stop signals', 'Check with a clinician if'],
  mistake: ['The mistake to avoid', 'Where people go wrong', 'The common trap'],
  pairs: ['Pairs well with', 'Complete it with', 'Works well beside'],
  changes: ['What it changes for training', 'What this means in practice', 'The practical read'],
  source: ['Source', 'Where the numbers come from', 'Evidence on this page']
};

function tierAdvice(t) {
  if (t === 'LOW') return 'it fits almost any day, including a rough one';
  if (t === 'MODERATE') return 'save it for days when you feel reasonably good';
  return 'reserve it for strong days only';
}
const ROLEPHRASE = { STIMULUS: 'a strength stimulus', PROTEIN_DELIVERY: 'protein delivery', RECOVERY: 'recovery', GUARDRAIL: 'a safety guardrail', STRUCTURE: 'programming structure' };

function bits(r) {
  const sf = r.summary_fact.replace(/\.$/, '');
  const dv = has(r.deload_variant) ? lc(r.deload_variant.replace(/\.$/, '')) : 'the named lighter version on this page';
  return { sf, dv };
}

// ---------- Opener pools: 5 sentence patterns per category role ----------
const OPEN = {
  EXERCISE: [
    (r) => { const { sf, dv } = bits(r); return `${r.entity_name} is a ${r.demand_tier.toLowerCase()}-energy movement: ${lc(sf)}. On a morning when the log says low, the planned swap is ${dv} — written in advance so there is nothing to decide when you feel rough. That swap is part of the programme, not a consolation prize.`; },
    (r) => { const { sf, dv } = bits(r); return `Short version first: ${lc(sf)}. Energy cost sits at ${r.demand_tier.toLowerCase()}, which means ${tierAdvice(r.demand_tier)}. When energy dips, ${dv} — the lighter version is scheduled, never improvised, so a rough day still counts as training.`; },
    (r) => { const { sf, dv } = bits(r); return `The honest summary of ${r.entity_name}: ${lc(sf)}. We rate it ${r.demand_tier.toLowerCase()} for energy, so ${tierAdvice(r.demand_tier)}. The deload is named on purpose: ${dv}. Planning the easier version before you need it is what keeps training weeks connected.`; },
    (r, c) => { const { sf, dv } = bits(r); return `${r.entity_name} earns its slot because it delivers ${ROLEPHRASE[r.muscle_role] || 'a useful training effect'} without demanding a good day. In practice: ${lc(sf)}. Cost: ${r.demand_tier.toLowerCase()} (${tierAdvice(r.demand_tier)}). Rough-day answer, already decided: ${dv}.`; },
    (r) => { const { sf, dv } = bits(r); return `If you read one paragraph, make it this: ${lc(sf)}. Energy cost ${r.demand_tier.toLowerCase()} — ${tierAdvice(r.demand_tier)}; on a low day, ${dv}. Everything further down the page is detail; this is the whole decision.`; }
  ],
  FOOD: [
    (r) => { const { sf, dv } = bits(r); return `${r.entity_name} is protein first: ${lc(sf)}. When appetite is small, the move is ${dv}. Nothing here promises outcomes; the goal is hitting protein with the least appetite spend on a day the medication has already capped.`; },
    (r) => { const { sf, dv } = bits(r); return `Start with the number that matters on a GLP-1: ${lc(sf)}. Portion strategy for a low-appetite day: ${dv}. Treat the figure as a planning anchor, sourced below, and adjust to what your prescriber and your body agree on.`; },
    (r) => { const { sf, dv } = bits(r); return `The quick read on ${r.entity_name}: ${lc(sf)}. On days when eating feels like work, ${dv}. Protein per calorie is the metric that matters when the appetite budget is small, and this page ranks it honestly.`; },
    (r) => { const { sf, dv } = bits(r); return `${r.entity_name} answers one question: how much protein can I bank for the least appetite spend? Answer: ${lc(sf)}. Low-appetite version: ${dv}. The source link below shows exactly where the number comes from.`; },
    (r) => { const { sf, dv } = bits(r); return `One paragraph, no fluff: ${lc(sf)}. When the plate looks too big, ${dv}. Everything else on this page — pairings, mistakes, comparisons — supports that single trade-off between protein and appetite.`; }
  ],
  SITUATION: [
    (r) => { const { sf, dv } = bits(r); return `Today's plan in one breath: ${lc(sf)}. The default move is ${dv}. A low-energy day is information about the medication working, not a character flaw, and the session simply shrinks to match it.`; },
    (r) => { const { sf, dv } = bits(r); return `${r.entity_name} happens to most people on a GLP-1 at some point. What we know: ${lc(sf)}. What to do: ${dv}. Decide once, write it down, and stop re-litigating it every morning.`; },
    (r) => { const { sf, dv } = bits(r); return `The short version for a rough day: ${lc(sf)}. Planned response: ${dv}. Consistency on this medication is built from adjustable sessions, not heroic ones.`; },
    (r) => { const { sf, dv } = bits(r); return `When ${lc(r.entity_name)} shows up, the question is not "push or quit" — it is "which version of today?" Facts: ${lc(sf)}. Default: ${dv}. The schedule below turns that into a day you can actually run.`; },
    (r) => { const { sf, dv } = bits(r); return `Read this first on a hard morning: ${lc(sf)}. The programme's answer: ${dv}. Nothing about this day cancels your training; it resizes it.`; }
  ],
  SESSION: [
    (r) => { const { sf, dv } = bits(r); return `${r.entity_name} is a complete, timed plan: ${lc(sf)}. If energy shifts mid-session, ${dv}. Sessions are chosen by how you feel at 7am, not by what the calendar insists.`; },
    (r) => { const { sf, dv } = bits(r); return `Pick this session when the morning matches its tier (${r.demand_tier.toLowerCase()}). Structure: ${lc(sf)}. Built-in escape hatch: ${dv}. A finished light session beats an abandoned hard one, every time.`; },
    (r, c) => { const { sf, dv } = bits(r); return `The whole session in one paragraph: ${lc(sf)}. Mid-session downgrade, pre-decided: ${dv}. Equipment needed: ${(c.EQUIP[r.equipment] || r.equipment).toLowerCase()}. Total commitment is the time listed, rests included.`; },
    (r) => { const { sf, dv } = bits(r); return `This is the version to run when ${tierAdvice(r.demand_tier)}. What it contains: ${lc(sf)}. If the day turns: ${dv}. Log it as a win either way — attendance is the metric that compounds.`; },
    (r) => { const { sf, dv } = bits(r); return `One decision, then execute: ${lc(sf)}. Energy cost ${r.demand_tier.toLowerCase()}; fallback ${dv}. The exercises inside are linked below, each with its own lighter swap.`; }
  ],
  MEDICATION: [
    (r) => { const { sf, dv } = bits(r); return `${r.entity_name}, in training terms: ${lc(sf)}. The practical rule: ${dv}. This page is context for planning sessions, not dosing advice — dose questions belong to your prescriber.`; },
    (r) => { const { sf, dv } = bits(r); return `What ${r.entity_name} means for training: ${lc(sf)}. Plan around it by ${dv}. Escalation weeks change appetite and energy on a schedule, and training should follow that schedule, not fight it.`; },
    (r) => { const { sf, dv } = bits(r); return `The plain-English read on ${r.entity_name}: ${lc(sf)}. For training weeks: ${dv}. Everything here is drawn from the public label linked at the bottom of this page.`; },
    (r) => { const { sf, dv } = bits(r); return `${r.entity_name} sets the rhythm your training has to respect: ${lc(sf)}. Concretely: ${dv}. Treat side-effect windows as scheduling data, not as setbacks.`; },
    (r) => { const { sf, dv } = bits(r); return `Short and useful: ${lc(sf)}. Training implication: ${dv}. If anything here seems to conflict with your prescriber's instructions, follow your prescriber.`; }
  ],
  GLOSSARY: [
    (r) => { const { sf } = bits(r); const cm = has(r.common_mistake) ? lc(r.common_mistake.replace(/\.$/, '')) : 'see the related pages below'; return `${r.entity_name}, defined plainly: ${lc(sf)}. Where it bites in practice: ${cm}. Definitions on this site always carry a public source or a stated method.`; },
    (r) => { const { sf } = bits(r); const cm = has(r.common_mistake) ? lc(r.common_mistake.replace(/\.$/, '')) : 'treating it as optional'; return `One-paragraph definition: ${lc(sf)}. The trap people fall into: ${cm}. Keep the term and the practice linked — the related pages below show it in use.`; },
    (r) => { const { sf } = bits(r); const cm = has(r.common_mistake) ? lc(r.common_mistake.replace(/\.$/, '')) : 'using it loosely'; return `${r.entity_name} in a sentence: ${lc(sf)}. In practice, watch for: ${cm}. The source for this definition is linked at the foot of the page.`; },
    (r) => { const { sf } = bits(r); const cm = has(r.common_mistake) ? lc(r.common_mistake.replace(/\.$/, '')) : 'none worth naming'; return `If a coach says ${lc(r.entity_name)}, here is what they mean: ${lc(sf)}. Common misuse: ${cm}. Precision here prevents bad training decisions later.`; },
    (r) => { const { sf } = bits(r); const cm = has(r.common_mistake) ? 'avoid ' + lc(r.common_mistake.replace(/\.$/, '')) : 'see related pages'; return `The working definition we use site-wide: ${lc(sf)}. Applied to ${r.entity_name}: ${cm}. Every term page links its evidence, including this one.`; }
  ]
};

// ---------- Section builders ----------
function factsFor(r, c) {
  const f = [];
  if (has(r.alias)) f.push(['Also known as', r.alias]);
  f.push(['Energy cost', c.TIER[r.demand_tier] || r.demand_tier]);
  f.push(['Role in the plan', c.ROLE[r.muscle_role] || r.muscle_role]);
  if ((r.category === 'EXERCISE' || r.category === 'SESSION') && has(r.equipment)) f.push(['Equipment', c.EQUIP[r.equipment] || r.equipment]);
  if (has(r.fit_profile)) f.push(['Best for', r.fit_profile.split(';').map(p => c.PROFILE[p.trim()] || p).join(', ')]);
  if (has(r.deload_variant)) f.push(['Low-energy swap', r.deload_variant]);
  if (r.category === 'EXERCISE' && has(r.joint_caution_50p)) f.push(['Joint caution (50+)', r.joint_caution_50p]);
  if (has(r.key_number_unit)) f.push([r.category === 'FOOD' ? 'Protein density' : 'Typical structure', r.key_number_unit]);
  return f;
}

const answerSec = (r, c) => `<section class="answer"><p>${esc(pick(OPEN[r.category] || OPEN.GLOSSARY, c.seed, 11)(r, c))}</p></section>\n`;

const factsSec = (r, c) => `<section><h2>${pick(H2.facts, c.seed, 0)}</h2><div class="tablewrap"><table><tbody>\n${factsFor(r, c).map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('\n')}\n</tbody></table></div></section>\n`;

const stopSec = (r, c) => has(r.pause_flags) ? `<section class="callout warning"><h3>${pick(H2.stop, c.seed, 7)}</h3><p>${esc(r.pause_flags)}</p></section>\n` : '';

const mistakeSec = (r, c) => (has(r.common_mistake) && r.category !== 'GLOSSARY') ? `<section class="callout"><h3>${pick(H2.mistake, c.seed, 8)}</h3><p>${esc(r.common_mistake)}</p></section>\n` : '';

const pairsSec = (r, c) => {
  if (!has(r.best_pairing)) return '';
  let inner;
  if (c.pairing) {
    const t = c.bySlug.get(c.pairing);
    const m = r.best_pairing.match(/\(([^)]*)\)/);
    inner = `<a href="/${c.FOLDER[t.category]}/${t.slug}/">${esc(t.entity_name)}</a>${m ? ' — ' + esc(m[1]) : ''}`;
  } else inner = esc(r.best_pairing);
  return `<section class="callout"><h3>${pick(H2.pairs, c.seed, 9)}</h3><p>${inner}</p></section>\n`;
};

const relatedSec = (r, c) => {
  const items = (c.related || []).map(o => `<li><a href="/${c.FOLDER[o.category]}/${o.slug}/">${esc(o.entity_name)}</a><span class="sum">${esc(o.summary_fact)}</span></li>`).join('\n');
  if (!items) return '';
  return `<section class="related"><h2>${c.REL_HEAD[r.category]}</h2><ul class="hublist">\n${items}\n</ul><p><a href="/${c.FOLDER[r.category]}/">Browse all ${c.LABEL[r.category]} →</a></p></section>\n`;
};

const sourceSec = (r, c) => {
  const est = r.auditing_status === 'ESTIMATED';
  const h = `<h3>${pick(H2.source, c.seed, 10)}</h3>`;
  if (has(r.source_url)) return `<section class="source">${h}<p>${est ? 'This figure is an estimate; method basis: ' : ''}<a href="${esc(r.source_url)}" rel="noopener">${esc(r.source_name)}</a> · last checked ${esc(r.last_checked)}</p></section>`;
  return `<section class="source">${h}<p>ESTIMATED — derived from our own dataset; method stated on this page. No external source exists for this row.</p></section>`;
};

function neighborTable(r, c) {
  const ns = (c.related || []).slice(0, 3);
  if (!ns.length) return '';
  const rowsHtml = ns.map(o => {
    let diff;
    const pg = parseFloat(r.protein_g), og = parseFloat(o.protein_g);
    if (r.category === 'FOOD' && o.category === 'FOOD' && pg && og) diff = `${o.protein_g} g vs ${r.protein_g} g protein per reference serving`;
    else if (o.demand_tier !== r.demand_tier) diff = `${o.demand_tier.toLowerCase()} energy cost vs ${r.demand_tier.toLowerCase()} here`;
    else if (o.equipment !== r.equipment && o.equipment !== 'NONE') diff = `${(c.EQUIP[o.equipment] || o.equipment).toLowerCase()} vs ${(c.EQUIP[r.equipment] || r.equipment).toLowerCase()}`;
    else diff = `same tier and role; different ${o.category === r.category ? 'movement pattern' : 'use case'}`;
    return `<tr><td><a href="/${c.FOLDER[o.category]}/${o.slug}/">${esc(o.entity_name)}</a></td><td>${esc(c.TIER[o.demand_tier] || o.demand_tier)}</td><td>${esc(diff)}</td></tr>`;
  }).join('\n');
  return `<section><h2>${pick(H2.neighbors, c.seed, 1)}</h2><div class="tablewrap"><table><thead><tr><th scope="col">Page</th><th scope="col">Energy cost</th><th scope="col">How it differs from this page</th></tr></thead><tbody>\n${rowsHtml}\n</tbody></table></div><p class="muted">Neighbors are chosen by shared energy tier, role and equipment — not by similar names.</p></section>\n`;
}

function worked(r, c) {
  if (r.category === 'FOOD') {
    const pg = parseFloat(r.protein_g);
    if (!pg) return '';
    const two = Math.round(pg * 2);
    const pct = Math.min(100, Math.round((two / 60) * 100));
    return `<section><h2>${pick(H2.math, c.seed, 2)}</h2><p>Worked example, using this page's own number (${r.protein_g} g protein per reference serving): two reference servings give about ${two} g of protein. Against a 60 g daily target split over three meals, that covers roughly ${pct}% of the day in two small eats. The arithmetic is ours; the grams per serving come from the source below.</p></section>\n`;
  }
  if (r.category === 'EXERCISE' || r.category === 'SESSION') {
    return `<section><h2>${pick(H2.howto, c.seed, 2)}</h2><p>Planning estimate (labeled, not measured): budget about 7 minutes per movement including 60–90 s rests${r.category === 'SESSION' ? '' : ', so three sets land inside a 20–30 minute session'}. Structure listed on this page: ${esc(r.key_number_unit)}. If the clock or your energy runs out early, stop after the last completed set — a partial session still logs.</p></section>\n`;
  }
  return '';
}

function wrong(r, c) {
  let lead;
  if (r.category === 'FOOD') lead = `Skip ${r.entity_name} today if ${has(r.pause_flags) ? lc(r.pause_flags) : 'it disagrees with you'}; on a zero-appetite day a shake may beat any plate.`;
  else if (r.category === 'EXERCISE') lead = `Swap ${r.entity_name} out today if ${has(r.joint_caution_50p) ? lc(r.joint_caution_50p).split(';')[0] : 'sharp pain shows up early in the first set'}; the named deload exists for exactly this.`;
  else if (r.category === 'SESSION') lead = `Do not run this session if your last two morning logs read LOW — take the deload week instead and come back refreshed.`;
  else if (r.category === 'SITUATION') lead = `This playbook is the wrong tool if symptoms escalate: ${has(r.pause_flags) ? lc(r.pause_flags) : 'contact a clinician'}.`;
  else lead = has(r.common_mistake) ? `The term is misapplied when: ${lc(r.common_mistake)}` : '';
  if (!lead) return '';
  return `<section class="callout"><h3>${pick(H2.wrong, c.seed, 3)}</h3><p>${esc(lead)}</p></section>\n`;
}

function dayPlan(r, c) {
  if (r.category !== 'SITUATION') return '';
  const sess = c.bySlug.get('session-low-energy-20min');
  const food = (c.pairing && c.bySlug.get(c.pairing)) || c.bySlug.get('whey-protein');
  const items = [
    ['Morning', `Log energy before deciding anything. If LOW, today's session is already chosen: ${sess ? `<a href="/${c.FOLDER[sess.category]}/${sess.slug}/">${esc(sess.entity_name)}</a>` : 'the low-energy session'}.`],
    ['Training window', has(r.deload_variant) ? esc(r.deload_variant) : 'Keep it short and finish feeling better than you started.'],
    ['Food anchor', food ? `Protein first, small portion: <a href="/${c.FOLDER[food.category]}/${food.slug}/">${esc(food.entity_name)}</a>.` : 'Protein first, small portion.'],
    ['Evening', 'Hydrate, note one line in the log (energy 1–5, session done yes/no). Two data points beat two hours of worry.']
  ];
  const lis = items.map(([k, v]) => `<li><strong>${k}.</strong> ${v}</li>`).join('\n');
  return `<section><h2>${pick(H2.day, c.seed, 4)}</h2><ol class="timeline">\n${lis}\n</ol></section>\n`;
}

function flow(r, c) {
  if (r.category !== 'SESSION') return '';
  const low = c.bySlug.get('session-low-energy-20min');
  const mod = c.bySlug.get('session-moderate-30min');
  const high = c.bySlug.get('session-high-energy-40min');
  const link = o => o ? `<a href="/${c.FOLDER[o.category]}/${o.slug}/">${esc(o.entity_name)}</a>` : 'the matching session';
  const lis = [
    ['your morning log reads LOW', link(low)],
    ['your morning log reads MODERATE', link(mod)],
    ['you have logged HIGH two mornings in a row', link(high)]
  ].map(([k, v]) => `<li><strong>If ${k}:</strong> run ${v}.</li>`).join('\n');
  return `<section><h2>${pick(H2.flow, c.seed, 5)}</h2><ul class="flow">\n${lis}\n</ul><p class="muted">Until the logging tool ships, a one-tap note on your phone counts as a log.</p></section>\n`;
}

function changes(r, c) {
  if (r.category !== 'MEDICATION' && r.category !== 'GLOSSARY') return '';
  const lis = [];
  if (has(r.deload_variant)) lis.push(`<li>${esc(r.deload_variant)}</li>`);
  if (has(r.common_mistake)) lis.push(`<li>Avoid: ${esc(lc(r.common_mistake))}</li>`);
  if (c.pairing && c.bySlug.get(c.pairing)) { const t = c.bySlug.get(c.pairing); lis.push(`<li>See it in practice: <a href="/${c.FOLDER[t.category]}/${t.slug}/">${esc(t.entity_name)}</a></li>`); }
  if (!lis.length) return '';
  return `<section><h2>${pick(H2.changes, c.seed, 6)}</h2><ul>\n${lis.join('\n')}\n</ul></section>\n`;
}

// ---------- Template variants: section order per category ----------
export function renderBody(r, c) {
  const head = `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span aria-hidden="true">›</span> <a href="/${c.FOLDER[r.category]}/">${c.LABEL[r.category]}</a> <span aria-hidden="true">›</span> ${esc(r.entity_name)}</nav>\n<p class="kicker">${c.LABEL[r.category]}<span class="badge${r.auditing_status === 'ESTIMATED' ? ' est' : ''}">${esc(r.auditing_status)}</span></p>\n<h1>${esc(r.entity_name)}</h1>\n`;
  const A = answerSec(r, c), F = factsSec(r, c), W = worked(r, c), X = wrong(r, c), M = mistakeSec(r, c), S = stopSec(r, c), N = neighborTable(r, c), P = pairsSec(r, c), R = relatedSec(r, c), SRC = sourceSec(r, c), D = dayPlan(r, c), FL = flow(r, c), CH = changes(r, c);
  let order;
  switch (r.category) {
    case 'EXERCISE': order = [A, F, W, X, M, S, N, P, R, SRC]; break;
    case 'FOOD':     order = [A, F, W, X, M, N, P, R, SRC]; break;
    case 'SITUATION':order = [A, D, X, S, N, P, R, SRC]; break;
    case 'SESSION':  order = [A, F, FL, W, X, S, N, P, R, SRC]; break;
    default:         order = [A, F, CH, M, S, N, R, SRC]; break;
  }
  return `<article>\n${head}${order.join('')}</article>`;
}

// ---------- Page shell + stylesheet ----------
export function shell({ title, description, canonical, asOf, robots, body, schema, dna }) {
  let schemaTag = '';
  if (schema) {
    const safeJson = JSON.stringify(schema).replace(/</g, '\\u003c');
    schemaTag = `<script type="application/ld+json">${safeJson}</script>`;
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="${robots}">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${dna.fonts.display}:wght@600;700&family=${dna.fonts.body}:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
${schemaTag}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="topbar">
  <a class="brand" href="/">GLP-1 <strong>Strength Coach</strong></a>
  <nav aria-label="Main">
  <a href="/">Home</a>
  <a href="/coach.html" style="color:var(--accent);font-weight:600">Coach</a>
  <a href="/exercises/">Exercises</a>
  <a href="/foods/">Foods</a>
  <a href="/days/">Low-energy days</a>
  <a href="/plans/">Sessions</a>
  <a href="/medications/">Medications</a>
  <a href="/glossary/">Glossary</a>
</nav>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <p class="limits"><strong>Limits of this page.</strong> Training and food guidance for adults over 50 using GLP-1 medications. Not medical advice, and it does not predict results. Medication decisions belong to your prescriber. Stop and contact a clinician for chest pain, fainting, persistent vomiting, or rapid unintentional weight loss.</p>
  <p class="method"><strong>How this page was built.</strong> Every number is either linked to a public source (FDA labels, USDA FoodData Central, published trials, ACSM/NHS guidance) or labeled ESTIMATED with its method stated on the page. Data last checked: ${asOf}.</p>
  <p class="fine">© ${new Date().getFullYear()} ${esc(dna.siteName)}. Links to equipment or food products may be affiliate links; we may earn a commission. This never changes what the data says.</p>
</footer>
</body>
</html>`;
}

export function css(dna) {
  return `:root{
  --bg:${dna.palette.bg}; --surface:${dna.palette.surface}; --ink:${dna.palette.ink};
  --accent:${dna.palette.accent}; --warning:${dna.palette.warning};
  --display:'${dna.fonts.display}',Georgia,serif; --body:'${dna.fonts.body}',system-ui,sans-serif;
  --maxw:46rem;
}
@media (prefers-color-scheme:dark){
  :root{ --bg:#1E1B16; --surface:#2A2620; --ink:#F2EDE3; --accent:#8FCBA9; --warning:#E8A07B; }
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--body);font-size:1.0625rem;line-height:1.65}
a{color:var(--accent)}
a:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:2px}
.skip{position:absolute;left:-9999px}
.skip:focus{left:1rem;top:1rem;background:var(--surface);padding:.5rem 1rem;z-index:10}
.topbar{display:flex;flex-wrap:wrap;gap:1rem;align-items:baseline;justify-content:space-between;padding:1rem 1.25rem;border-bottom:1px solid var(--surface)}
.brand{font-family:var(--display);font-size:1.15rem;text-decoration:none;color:var(--ink)}
.topbar nav{display:flex;flex-wrap:wrap;gap:.9rem;font-size:.95rem}
.topbar nav a{text-decoration:none}
.topbar nav a:hover{text-decoration:underline}
main{max-width:var(--maxw);margin:0 auto;padding:1.5rem 1.25rem 3rem}
h1{font-family:var(--display);font-size:clamp(1.7rem,4vw,2.3rem);line-height:1.2;margin:.3rem 0 1rem}
h2{font-family:var(--display);font-size:1.3rem;margin:2.2rem 0 .6rem}
.crumbs{font-size:.85rem;margin-bottom:.5rem}
.crumbs a{text-decoration:none}
.kicker{font-size:.85rem;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);font-weight:600;margin:.2rem 0}
.badge{display:inline-block;font-size:.72rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;border:1px solid var(--accent);color:var(--accent);border-radius:999px;padding:.1rem .55rem;margin-left:.4rem;vertical-align:middle}
.badge.est{border-color:var(--warning);color:var(--warning)}
.answer{background:var(--surface);border-left:4px solid var(--accent);border-radius:0 8px 8px 0;padding:1rem 1.1rem;margin:1.2rem 0}
.answer p{margin:0}
.tablewrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;margin:.5rem 0 1rem}
th,td{text-align:left;padding:.55rem .5rem;border-bottom:1px solid var(--surface);vertical-align:top}
th{width:38%;font-weight:600}
.callout{border-radius:8px;padding:.9rem 1.1rem;margin:1rem 0;background:var(--surface)}
.callout p{margin:0}
.callout.warning{border-left:4px solid var(--warning)}
.callout h3,.source h3{font-size:1rem;margin:0 0 .3rem}
.source{font-size:.9rem;margin:1.5rem 0;padding-top:1rem;border-top:1px solid var(--surface)}
.related{margin-top:2.5rem}
.muted{font-size:.88rem;opacity:.85;margin:.2rem 0 1rem}
.timeline,.flow{padding-left:1.25rem;margin:.5rem 0 1rem}
.timeline li,.flow li{margin:.45rem 0}
.hublist{list-style:none;padding:0;margin:1rem 0}
.hublist li{border-bottom:1px solid var(--surface);padding:.7rem 0}
.hublist a{font-weight:600;text-decoration:none}
.hublist a:hover{text-decoration:underline}
.hublist .sum{display:block;font-size:.92rem;color:var(--ink);opacity:.85}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.8rem;margin:1.2rem 0}
.card{background:var(--surface);border-radius:8px;padding:1rem}
.card a{font-family:var(--display);font-weight:600;text-decoration:none}
.card p{margin:.3rem 0 0;font-size:.92rem}
.site-footer{border-top:1px solid var(--surface);background:var(--surface);margin-top:2rem;padding:1.5rem 1.25rem;font-size:.88rem}
.site-footer p{max-width:var(--maxw);margin:.4rem auto}
.fine{opacity:.8}
@media print{
  .topbar,.skip{display:none}
  body{background:#fff;color:#000}
  a{color:#000;text-decoration:underline}
}
figure.hero{margin:1.5rem 0 2rem;max-width:100%;overflow:hidden}
figure.hero .hero-frame{border-radius:14px;overflow:hidden;max-width:100%}
figure.hero picture,figure.hero img{display:block;width:100%;max-width:100%;height:auto;object-fit:cover;border-radius:14px}
figure.hero figcaption{font-size:.85rem;opacity:.75;margin-top:.5rem}
figure.hero figcaption a{color:inherit}
ul.hublist li{margin:.35rem 0}
`;
}