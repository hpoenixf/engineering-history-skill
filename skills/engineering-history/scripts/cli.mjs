#!/usr/bin/env node
import { candidate, initialize, previousDay, snapshot, validate, verifyProtection } from './history.mjs';

const help = `engineering-history <init|candidate|validate|snapshot|verify|previous-day> [options]

  --root <directory>       Selected project root (default: current directory)
  --history-dir <relative> History tree (default: docs/history)
  --task <text> --summary <text>  Candidate material
  --source-id <identity>   Stable event identity for deduplication
  --event-date <date|unknown>    Original event date
  --timestamp <ISO> --timezone <IANA>  Recording time (timezone default: UTC)
  --material-value <context|interview|share|both>  Explicit advisory label
  --out <file>             New protection snapshot path, relative to root
  --snapshot <file>        Prior snapshot for verify
  --help                  Show this help

All commands return JSON. Exit 0: operation passed; 1: diagnostic/error.
Promotion into canonical history remains a human/model decision.
`;

try {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) console.log(help);
  else {
    const command = args.shift();
    const commands = { init: initialize, candidate, validate, snapshot, verify: verifyProtection, 'previous-day': previousDay };
    if (!Object.hasOwn(commands, command)) throw new Error('unknown command');
    const names = { '--root': 'root', '--history-dir': 'historyDir', '--task': 'task', '--summary': 'summary', '--source-id': 'sourceId',
      '--event-date': 'eventDate', '--timestamp': 'timestamp', '--timezone': 'timezone', '--material-value': 'materialValue', '--out': 'out', '--snapshot': 'snapshot' };
    const common = ['root', 'historyDir'];
    const allowed = { init: common, validate: common, snapshot: [...common, 'out'], verify: [...common, 'snapshot'],
      candidate: [...common, 'task', 'summary', 'sourceId', 'eventDate', 'timestamp', 'timezone', 'materialValue'],
      'previous-day': ['root', 'timestamp', 'timezone'] };
    const options = {};
    for (let index = 0; index < args.length; index++) {
      const key = args[index];
      const name = names[key];
      if (!name || !allowed[command].includes(name) || Object.hasOwn(options, name)) throw new Error(`unsupported or duplicate option: ${key}`);
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`missing value: ${key}`);
      options[name] = value;
    }
    const result = commands[command](options);
    console.log(JSON.stringify(result, null, 2));
    if (result.issues?.length) process.exitCode = 1;
  }
} catch (error) {
  console.error(JSON.stringify({ error: error.message }));
  process.exitCode = 1;
}
