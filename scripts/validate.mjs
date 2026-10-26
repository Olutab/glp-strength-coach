import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '../data/matrix.txt');

console.log("🔍 Reading data/matrix.txt...");
const raw = readFileSync(dataPath, 'utf-8');
const lines = raw.split('\n').filter(line => line.trim() !== '');

if (lines.length < 2) {
    console.error("❌ File is empty or only has a header!");
    process.exit(1);
}

const header = lines[0].split('|');
console.log(`✅ Found ${lines.length - 1} data rows.`);
console.log(`✅ Found ${header.length} columns in the header.`);

const slugs = new Set();
let errors = 0;

for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('|');
    const rowNum = i + 1;

    // Check column count
    if (cols.length !== 22) {
        console.error(`❌ Row ${rowNum}: Expected 22 columns, found ${cols.length}.`);
        errors++;
        continue;
    }

    // Check for empty required fields
    const slug = cols[1];
    const entityName = cols[2];
    const category = cols[4];

    if (!slug || !entityName || !category) {
        console.error(`❌ Row ${rowNum}: Missing slug, entity_name, or category.`);
        errors++;
    }

    // Check duplicate slugs
    if (slugs.has(slug)) {
        console.error(`❌ Row ${rowNum}: Duplicate slug found: "${slug}"`);
        errors++;
    } else {
        slugs.add(slug);
    }
}

if (errors === 0) {
    console.log("🎉 VALIDATION PASSED! Data looks perfectly clean.");
} else {
    console.log(`⚠️  VALIDATION FAILED: Found ${errors} error(s). Check the messages above.`);
}