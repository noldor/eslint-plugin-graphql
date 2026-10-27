import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const revision = 'f081149470d2a5da628e5619165a0fa3afcc1247';
const workflow = readFileSync(new URL('../.github/workflows/quality-and-release.yml', import.meta.url), 'utf8');
const publishStep = workflow.split('      - name: Publish and verify the checked revision\n')[1];
const script = publishStep.split('        run: |\n')[1].replace(/^ {10}/gm, '');

function release(context, scenario) {
  const directory = mkdtempSync(join(tmpdir(), 'graphql-release-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const cli = `#!${process.execPath}
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');
const { basename, join } = require('node:path');
const command = basename(process.argv[1]);
const args = process.argv.slice(2);
const path = name => join(process.env.RELEASE_TEST_DIRECTORY, name);
appendFileSync(path('calls'), JSON.stringify({ command, args }) + '\\n');
if (command === 'git') {
  console.log(process.env.GITHUB_SHA + '\\trefs/heads/master');
} else if (command === 'npm' && args[0] === 'publish') {
  if (process.env.RELEASE_TEST_SCENARIO === 'publish-error') process.exit(1);
  writeFileSync(path('published'), 'true');
} else if (command === 'npm' && args[0] === 'view') {
  const scenario = process.env.RELEASE_TEST_SCENARIO;
  if (scenario === 'existing') {
    console.log(process.env.GITHUB_SHA);
  } else if (scenario === 'mismatch') {
    console.log('765247d486025f54fef207ec063ca4fad7e1ea9f');
  } else {
    const reads = existsSync(path('reads')) ? Number(readFileSync(path('reads'), 'utf8')) : 0;
    if (existsSync(path('published'))) writeFileSync(path('reads'), String(reads + 1));
    if (!existsSync(path('published')) || scenario === 'unavailable' || reads < 2) {
      console.error('npm error code E404: version is still being processed');
      process.exit(1);
    }
    console.log(process.env.GITHUB_SHA);
  }
}
`;
  for (const command of ['git', 'npm', 'sleep']) {
    writeFileSync(join(directory, command), cli, { mode: 0o755 });
  }
  const result = spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', script], {
    encoding: 'utf8',
    timeout: 10000,
    env: {
      PATH: `${directory}:${process.env.PATH}`,
      GITHUB_SHA: revision,
      RELEASE_TAG: 'v0.0.2',
      RELEASE_TEST_DIRECTORY: directory,
      RELEASE_TEST_SCENARIO: scenario,
    },
  });
  assert.ifError(result.error);
  const calls = readFileSync(join(directory, 'calls'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  return { ...result, calls };
}

test('release waits for registry processing after publishing exactly once', context => {
  const result = release(context, 'delayed');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.filter(call => call.command === 'npm' && call.args[0] === 'publish').length, 1);
  assert.equal(result.calls.filter(call => call.command === 'sleep').length, 2);
});

test('release verifies an existing version without publishing it again', context => {
  const result = release(context, 'existing');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.filter(call => call.command === 'npm' && call.args[0] === 'publish').length, 0);
  assert.equal(result.calls.filter(call => call.command === 'sleep').length, 0);
});

test('release rejects an existing version from another revision without retrying or publishing', context => {
  const result = release(context, 'mismatch');
  assert.equal(result.status, 1);
  assert.equal(result.calls.filter(call => call.command === 'npm' && call.args[0] === 'publish').length, 0);
  assert.equal(result.calls.filter(call => call.command === 'sleep').length, 0);
});

test('release fails after a bounded wait if the version stays unavailable', context => {
  const result = release(context, 'unavailable');
  assert.equal(result.status, 1);
  assert.equal(result.calls.filter(call => call.command === 'npm' && call.args[0] === 'publish').length, 1);
  const waits = result.calls.filter(call => call.command === 'sleep').length;
  assert.ok(waits > 0 && waits < 30, `Expected a bounded wait, got ${waits} sleeps`);
});

test('release propagates publication failures without retrying publication', context => {
  const result = release(context, 'publish-error');
  assert.equal(result.status, 1);
  assert.equal(result.calls.filter(call => call.command === 'npm' && call.args[0] === 'publish').length, 1);
  assert.equal(result.calls.filter(call => call.command === 'sleep').length, 0);
});
