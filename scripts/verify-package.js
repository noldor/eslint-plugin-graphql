import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const [archive] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' }));
const files = archive.files.map(file => file.path);
for (const path of files) {
  assert.match(path, /^(?:package\.json|LICENSE|README\.md|src\/[a-z-]+\.js|docs\/[a-z-]+\.md)$/u);
}
for (const path of ['package.json', 'LICENSE', 'README.md', 'src/index.js', 'src/deletion-result-id.js', 'src/prefer-id-scalars.js']) {
  assert.ok(files.includes(path), `Missing distribution file ${path}`);
}
console.log(`Verified ${files.length} public distribution files`);
