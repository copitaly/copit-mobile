import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const localeRoot = join(process.cwd(), 'src', 'app', 'core', 'localization', 'locales');
const mojibakeMatchers = [
  /Â/,
  /Ã/,
  /â€™/,
  /â€œ/,
  /â€/,
  /â€”/,
  /â€“/,
  /â€¦/,
  /�/,
  /\?(?=[A-Za-zÀ-ÿ])/u,
];

const files = readdirSync(localeRoot)
  .map((name) => join(localeRoot, name))
  .filter((path) => statSync(path).isFile() && path.endsWith('.json'));

const failures = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  for (const matcher of mojibakeMatchers) {
    const match = content.match(matcher);
    if (match) {
      failures.push({
        file,
        pattern: matcher.toString(),
        snippet: content.slice(Math.max(0, match.index - 20), Math.min(content.length, match.index + 40)).replace(/\s+/g, ' '),
      });
      break;
    }
  }
}

if (failures.length) {
  console.error('Locale encoding validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure.file}`);
    console.error(`  pattern: ${failure.pattern}`);
    console.error(`  snippet: ${failure.snippet}`);
  }
  process.exit(1);
}

console.log(`Locale encoding validation passed for ${files.length} locale files.`);
