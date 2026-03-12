const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public');
const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));

const existing = new Set(htmlFiles);
const issues = [];

for (const file of htmlFiles) {
  const fullPath = path.join(root, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const hrefMatches = [...content.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);

  for (const href of hrefMatches) {
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.startsWith('javascript:')) continue;

    const cleaned = href.split('?')[0].split('#')[0].replace(/^\.\//, '');
    if (!cleaned) continue;

    if (cleaned.endsWith('.html') && !existing.has(cleaned)) {
      issues.push(`${file}: missing internal page ${cleaned}`);
    }
  }
}

if (issues.length) {
  console.error('Link check failed:');
  issues.forEach((i) => console.error(` - ${i}`));
  process.exit(1);
}

console.log(`Link check passed for ${htmlFiles.length} pages.`);
