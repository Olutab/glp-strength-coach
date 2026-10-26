import { readdirSync, readFileSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const OUT = path.join(root, 'public');
const MANIFEST_PATH = path.join(root, 'images.manifest.json');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
const manifestImages = manifest.images || {};

let errors = 0;
let warnings = 0;

function checkFile(filePath, context) {
  if (!filePath.startsWith('/images/')) {
    console.error(`❌ RELATIVE PATH: ${context} uses ${filePath}`);
    errors++;
    return;
  }
  const localPath = path.join(OUT, filePath);
  if (!statSync(localPath, { throwIfNoEntry: false })?.isFile()) {
    console.error(`❌ MISSING FILE: ${filePath} referenced in ${context}`);
    errors++;
  } else if (statSync(localPath).size === 0) {
    console.error(`❌ EMPTY FILE: ${filePath} referenced in ${context}`);
    errors++;
  }
}

// Walk public directory for HTML files
function walk(dir) {
  const files = readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      walk(fullPath);
    } else if (file.name.endsWith('.html')) {
      const html = readFileSync(fullPath, 'utf-8');
      const pageSlug = fullPath.replace(OUT, '').replace(/\\/g, '/').replace('/index.html', '').replace('.html', '') || '/';
      
      // Check for <img> tags
      const imgMatches = html.match(/<img[^>]+>/g) || [];
      if (imgMatches.length === 0 && !pageSlug.includes('credits') && !pageSlug.includes('hub-')) {
        // Allow hub/credits to have no img, but entity pages should have one
        if (!pageSlug.match(/\/[a-z-]+\/$/)) { 
           // Only warn for entity pages
        }
      }

      for (const img of imgMatches) {
        const srcMatch = img.match(/src="([^"]+)"/);
        if (srcMatch) checkFile(srcMatch[1], `${pageSlug} <img src>`);
        
        const srcsetMatch = img.match(/srcset="([^"]+)"/);
        if (srcsetMatch) {
          const urls = srcsetMatch[1].split(',').map(s => s.trim().split(' ')[0]);
          urls.forEach(u => checkFile(u, `${pageSlug} <img srcset>`));
        }

        if (!img.includes('alt="')) {
          console.warn(`⚠️  MISSING ALT: <img> in ${pageSlug} lacks alt attribute`);
          warnings++;
        }
        if (!img.includes('width="') || !img.includes('height="')) {
          console.warn(`⚠️  MISSING DIMENSIONS: <img> in ${pageSlug} lacks width/height`);
          warnings++;
        }
      }

      // Check og:image
      const ogMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      // Note: we haven't added og:image to the builder yet, so we skip this check for now 
      // until Step 12 adds it, to avoid false failures.
    }
  }
}

console.log('🔍 Running post-build image verifier...\n');
walk(OUT);

console.log('\n--- VERIFIER SUMMARY ---');
if (errors === 0 && warnings === 0) {
  console.log('✅ PASS: All referenced images exist, are non-empty, have absolute paths, and include alt/dimensions.');
} else {
  console.log(`❌ FAIL: ${errors} error(s), ${warnings} warning(s). Fix before deploying.`);
  process.exit(1);
}