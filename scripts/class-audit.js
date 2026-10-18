/* Class audit: which classes used in HTML/JS are missing from theme.css? */
const fs = require('fs');
const path = require('path');

function walk(d, ext, out = []) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p, ext, out);
    else if (ext.includes(path.extname(f))) out.push(p);
  }
  return out;
}

const files = [...walk('public', ['.html']), ...walk(path.join('public', 'js'), ['.js'])];
const used = new Set();
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  let m;
  const re = /class="([^"]*)"/g;
  while ((m = re.exec(t))) {
    m[1]
      .replace(/\$\{[^}]*\}/g, ' ')
      .split(/\s+/)
      .filter((c) => c && /^[a-z][a-z0-9-]*$/.test(c))
      .forEach((c) => used.add(c));
  }
  const re2 = /classList\.(?:add|toggle|remove)\('([a-z0-9-]+)'/g;
  while ((m = re2.exec(t))) used.add(m[1]);
  const re3 = /className\s*=\s*'([^']+)'/g;
  while ((m = re3.exec(t))) m[1].split(/\s+/).filter(Boolean).forEach((c) => used.add(c));
}

const theme = fs.readFileSync(path.join('public', 'css', 'theme.css'), 'utf8');
const legacy = fs.readFileSync(path.join('public', 'css', 'style.css'), 'utf8');
const missing = [];
const legacyOnly = [];
for (const c of [...used].sort()) {
  const esc = c.replace(/-/g, '\\-');
  if (new RegExp('\\.' + esc + '(?![a-z0-9-])').test(theme)) continue;
  missing.push(c);
  if (new RegExp('\\.' + esc + '(?![a-z0-9-])').test(legacy)) legacyOnly.push(c);
}
console.log('USED BUT NOT IN theme.css (' + missing.length + '):');
console.log(missing.join(', '));
console.log();
console.log('OF THOSE, DEFINED IN style.css (' + legacyOnly.length + '):');
console.log(legacyOnly.join(', '));
