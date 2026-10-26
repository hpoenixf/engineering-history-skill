import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const bin = fileURLToPath(new URL('../bin/engineering-history.mjs', import.meta.url));
const cli = (root, command, ...args) => spawnSync(process.execPath, [bin, command, '--root', root, ...args], { encoding: 'utf8', timeout: 10000 });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'history-consumer-'));
  return { root, close: () => rmSync(root, { recursive: true, force: true }) };
}

test('init is independently runnable and preserves existing manual content', () => {
  const f = fixture();
  try {
    assert.equal(cli(f.root, 'init').status, 0);
    const target = join(f.root, 'docs/history/README.md');
    writeFileSync(target, '# Human-owned history index\n');
    assert.equal(cli(f.root, 'init').status, 0);
    assert.equal(readFileSync(target, 'utf8'), '# Human-owned history index\n');
    assert.equal(cli(f.root, 'validate').status, 0);
  } finally { f.close(); }
});

test('candidate dates honor timezone and event identity survives retries across days', () => {
  const f = fixture();
  try {
    const base = ['--task', 'Review useful finding', '--summary', 'Synthetic reusable decision', '--source-id', 'synthetic:event-1'];
    const first = cli(f.root, 'candidate', ...base, '--timestamp', '2026-01-01T23:30:00Z', '--timezone', 'Asia/Shanghai');
    assert.equal(first.status, 0);
    const record = JSON.parse(first.stdout);
    assert.match(record.path, /2026-01-02/);
    assert.equal(JSON.parse(readFileSync(join(f.root, record.path), 'utf8')).sync, false);
    const retry = JSON.parse(cli(f.root, 'candidate', ...base, '--timestamp', '2026-01-03T00:00:00Z').stdout);
    assert.equal(retry.status, 'deduplicated');
    assert.equal(retry.path, record.path);
    assert.equal(cli(f.root, 'candidate', ...base, '--event-date', '2026-02-30').status, 1);
    assert.equal(readdirSync(join(f.root, '.work/history-candidates')).filter(x => x.endsWith('.jsonl')).length, 1);
  } finally { f.close(); }
});

test('manual-region protection permits generated edits and detects changed or missing manual bytes', () => {
  const f = fixture();
  try {
    assert.equal(cli(f.root, 'init').status, 0);
    const page = join(f.root, 'docs/history/daily/README.md');
    assert.equal(cli(f.root, 'snapshot', '--out', 'before.json').status, 0);
    const text = readFileSync(page, 'utf8');
    writeFileSync(page, text.replace('<!-- BEGIN AUTO-REFINE -->', '<!-- BEGIN AUTO-REFINE -->\nGenerated card.'));
    assert.equal(cli(f.root, 'verify', '--snapshot', 'before.json').status, 0);
    writeFileSync(page, readFileSync(page, 'utf8') + '\nHuman change.\n');
    assert.equal(cli(f.root, 'verify', '--snapshot', 'before.json').status, 1);
    rmSync(page);
    assert.equal(cli(f.root, 'verify', '--snapshot', 'before.json').status, 1);
  } finally { f.close(); }
});

test('local-link validation reports broken links without modifying the tree', () => {
  const f = fixture();
  try {
    assert.equal(cli(f.root, 'init').status, 0);
    const target = join(f.root, 'docs/history/time/README.md');
    writeFileSync(target, '# Index\n[Missing](missing.md)\n');
    assert.equal(cli(f.root, 'validate').status, 1);
    assert.equal(readFileSync(target, 'utf8'), '# Index\n[Missing](missing.md)\n');
  } finally { f.close(); }
});

test('a custom history directory and previous local day work without repository defaults', () => {
  const f = fixture();
  try {
    assert.equal(cli(f.root, 'init', '--history-dir', 'notes/engineering').status, 0);
    assert.equal(cli(f.root, 'validate', '--history-dir', 'notes/engineering').status, 0);
    assert.equal(JSON.parse(cli(f.root, 'previous-day', '--timestamp', '2024-03-01T02:00:00+08:00', '--timezone', 'Asia/Shanghai').stdout).date, '2024-02-29');
    assert.notEqual(cli(f.root, 'init', '--history-dir', '../escape').status, 0);
  } finally { f.close(); }
});

test('candidate writes preserve existing files reached through a symlink', () => {
  const f = fixture();
  try {
    const args = ['--task', 'Decision', '--summary', 'Synthetic', '--source-id', 'example-event'];
    const first = JSON.parse(cli(f.root, 'candidate', ...args).stdout);
    const target = join(f.root, first.path);
    const human = join(f.root, 'human.jsonl');
    writeFileSync(human, '{"task":"human"}\n');
    rmSync(target);
    symlinkSync(human, target);
    assert.equal(cli(f.root, 'candidate', ...args).status, 1);
    assert.equal(readFileSync(human, 'utf8'), '{"task":"human"}\n');
  } finally { f.close(); }
});

test('a required index replaced by a directory is an invalid history tree', () => {
  const f = fixture();
  try {
    assert.equal(cli(f.root, 'init').status, 0);
    const target = join(f.root, 'docs/history/time/README.md');
    rmSync(target);
    mkdirSync(target);
    assert.equal(cli(f.root, 'validate').status, 1);
  } finally { f.close(); }
});
