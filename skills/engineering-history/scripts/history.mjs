import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmdirSync, appendFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const digest = value => createHash('sha256').update(value).digest('hex');
const inside = (root, target) => {
  const part = relative(root, target);
  return part === '' || (part !== '..' && !part.startsWith(`..${sep}`) && !isAbsolute(part));
};

function localPath(root, value) {
  const target = resolve(root, value);
  if (!inside(root, target)) throw new Error('path is outside the selected root');
  for (let cursor = target; cursor !== root; cursor = dirname(cursor)) {
    if (lstatSync(cursor, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('selected files must not traverse symlinks');
  }
  let ancestor = target;
  while (!existsSync(ancestor)) {
    if (lstatSync(ancestor, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('unresolved symlink');
    ancestor = dirname(ancestor);
  }
  if (!inside(realpathSync(root), realpathSync(ancestor))) throw new Error('path resolves outside the selected root');
  return target;
}

function context(options) {
  const root = realpathSync(resolve(options.root ?? '.'));
  const history = localPath(root, options.historyDir ?? 'docs/history');
  return { root, history };
}

const region = body => `<!-- BEGIN AUTO-REFINE -->\n${body}\n<!-- END AUTO-REFINE -->\n\n## Manual notes\n\n`;
export function initialize(options) {
  const { root, history } = context(options);
  const files = {
    'README.md': '# Engineering history\n\n[Decisions](time/README.md) · [Daily](daily/README.md) · [Topics](type/README.md)\n',
    'time/README.md': '# Canonical decisions\n\nAdd links to evidence-backed decisions here.\n',
    'daily/README.md': '# Daily reading\n\n' + region('Keep a short topic-based index here.'),
    'type/README.md': '# Topic evolution\n\n' + region('Summarize durable changes in understanding, with links to canonical decisions.'),
    'type/interview.md': '# Interview cases\n\n' + region('Select representative cases only when they have independent interview value.')
  };
  const written = [];
  for (const [name, content] of Object.entries(files)) {
    const target = localPath(root, join(history, name));
    mkdirSync(dirname(target), { recursive: true });
    try { writeFileSync(target, content, { flag: 'wx' }); written.push(relative(root, target)); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  return { status: 'initialized', written, preservedExisting: true };
}

export function localDate(timestamp, timezone = 'UTC') {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) throw new Error('invalid timestamp');
  return new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function previousDay(options) {
  const today = localDate(options.timestamp ?? new Date().toISOString(), options.timezone);
  return { date: new Date(Date.parse(`${today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10) };
}

/** Explicit invocation records material; prose never decides whether it deserves promotion. */
export function candidate(options) {
  const { root } = context(options);
  if (!options.task?.trim() || !options.summary?.trim()) throw new Error('--task and --summary are required');
  const materialValue = options.materialValue ?? 'context';
  if (!['context', 'interview', 'share', 'both'].includes(materialValue)) throw new Error('invalid material value');
  const timestamp = options.timestamp ?? new Date().toISOString();
  const recordedDate = localDate(timestamp, options.timezone);
  const eventDate = options.eventDate ?? recordedDate;
  if (eventDate !== 'unknown' && (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(Date.parse(eventDate)) || new Date(eventDate).toISOString().slice(0, 10) !== eventDate)) throw new Error('invalid event date');
  const sourceId = options.sourceId?.trim();
  if (options.sourceId !== undefined && (!sourceId || sourceId.length > 300 || /[\r\n]/.test(sourceId))) throw new Error('invalid source ID');
  const directory = localPath(root, '.work/history-candidates');
  mkdirSync(directory, { recursive: true });
  const lock = join(directory, '.writer-lock');
  try { mkdirSync(lock); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('candidate writer is active or a previous lock needs inspection'); throw error; }
  try {
    const rows = file => readFileSync(localPath(root, file), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
    if (sourceId) {
      for (const file of readdirSync(directory).filter(name => name.endsWith('.jsonl'))) {
        const target = join(directory, file);
        if (rows(target).some(row => row.sourceId === sourceId)) return { status: 'deduplicated', path: relative(root, target) };
      }
    }
    const identity = digest(sourceId ?? `${options.task.trim()}\0${options.summary.trim()}`).slice(0, 24);
    const file = localPath(root, join(directory, `${eventDate === 'unknown' ? recordedDate : eventDate}-${identity}.jsonl`));
    if (existsSync(file) && rows(file).some(row => row.task === options.task.trim() && row.summary === options.summary.trim())) return { status: 'deduplicated', path: relative(root, file) };
    const record = { timestamp, eventDate, timezone: options.timezone ?? 'UTC', task: options.task.trim(), summary: options.summary.trim(),
      materialValue, sync: materialValue !== 'context', ...(sourceId ? { sourceId } : {}) };
    appendFileSync(file, `${JSON.stringify(record)}\n`, 'utf8');
    return { status: 'written', path: relative(root, file) };
  } finally { rmdirSync(lock); }
}

function markdownFiles(root, directory) {
  localPath(root, directory);
  if (!existsSync(directory)) throw new Error('missing history directory');
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('history tree contains a symlink; inspect it before maintenance');
    if (entry.isDirectory()) return markdownFiles(root, target);
    return entry.isFile() && entry.name.endsWith('.md') ? [target] : [];
  });
}

export function validate(options) {
  const { root, history } = context(options);
  const issues = [];
  for (const required of ['README.md', 'time/README.md', 'daily/README.md', 'type/README.md', 'type/interview.md']) {
    if (!lstatSync(localPath(root, join(history, required)), { throwIfNoEntry: false })?.isFile()) issues.push(`missing file ${required}`);
  }
  const files = markdownFiles(root, history);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = match[1].trim().split(/\s+["']/)[0].replace(/^<|>$/g, '').split('#')[0].split('?')[0];
      if (!raw || /^(?:https?:|mailto:)/.test(raw)) continue;
      try {
        const target = localPath(root, resolve(dirname(file), decodeURIComponent(raw)));
        if (!existsSync(target)) issues.push(`broken link: ${relative(history, file)} -> ${raw}`);
      } catch { issues.push(`invalid or out-of-root link: ${relative(history, file)}`); }
    }
  }
  return { status: issues.length ? 'invalid' : 'valid', files: files.length, issues, semanticQuality: 'unverified' };
}

function protectedBytes(text) {
  const begin = '<!-- BEGIN AUTO-REFINE -->';
  const end = '<!-- END AUTO-REFINE -->';
  const start = text.indexOf(begin);
  const stop = text.indexOf(end);
  if (start < 0 && stop < 0) return { mode: 'whole-file', digest: digest(text) };
  if (start < 0 || stop <= start || text.indexOf(begin, start + 1) >= 0 || text.indexOf(end, stop + 1) >= 0) throw new Error('expected one ordered AUTO-REFINE region');
  return { mode: 'regions', digest: digest(JSON.stringify([text.slice(0, start + begin.length), text.slice(stop)])) };
}

function protection(options) {
  const { root, history } = context(options);
  const files = {};
  for (const directory of ['daily', 'type']) {
    for (const file of markdownFiles(root, join(history, directory))) files[relative(history, file).split(sep).join('/')] = protectedBytes(readFileSync(file, 'utf8'));
  }
  if (!Object.keys(files).length) throw new Error('no history files to protect');
  return { schemaVersion: 'engineering-history-protection@1', files };
}

export function snapshot(options) {
  const { root } = context(options);
  if (!options.out) throw new Error('--out is required');
  const file = localPath(root, options.out);
  const state = protection(options);
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, { flag: 'wx' });
  return { status: 'written', path: relative(root, file), files: Object.keys(state.files).length };
}

export function verifyProtection(options) {
  const { root } = context(options);
  if (!options.snapshot) throw new Error('--snapshot is required');
  const before = JSON.parse(readFileSync(localPath(root, options.snapshot), 'utf8'));
  if (before?.schemaVersion !== 'engineering-history-protection@1' || !before.files || typeof before.files !== 'object' || Array.isArray(before.files) || !Object.keys(before.files).length
    || Object.entries(before.files).some(([name, value]) => !['regions', 'whole-file'].includes(value?.mode) || !/^[a-f0-9]{64}$/.test(value.digest ?? '') || name.startsWith('/') || name.split('/').includes('..'))) throw new Error('invalid protection snapshot');
  const after = protection(options);
  const issues = Object.entries(before.files).filter(([file, expected]) => JSON.stringify(after.files[file]) !== JSON.stringify(expected)).map(([file]) => `protected content changed or file missing: ${file}`);
  return { status: issues.length ? 'changed' : 'unchanged', protectedFiles: Object.keys(before.files).length,
    addedFiles: Object.keys(after.files).filter(file => !Object.hasOwn(before.files, file)), issues };
}
