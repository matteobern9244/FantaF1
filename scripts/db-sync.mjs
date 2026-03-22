import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import dotenv from 'dotenv';

dotenv.config();

const PROTECTED_TARGETS = new Set(['fantaf1', 'fantaf1_ci']);

function parseArgs(argv) {
  const args = { source: null, target: null, confirm: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i + 1]) args.source = argv[++i];
    else if (argv[i] === '--target' && argv[i + 1]) args.target = argv[++i];
    else if (argv[i] === '--confirm') args.confirm = true;
  }
  return args;
}

function rewriteMongoUri(uri, databaseName) {
  const match = uri.match(/^(mongodb(?:\+srv)?:\/\/[^/]+\/)([^?]*)(\?.*)?$/i);
  if (!match) return uri;
  const [, prefix, , query = ''] = match;
  return `${prefix}${databaseName}${query}`;
}

function maskUri(uri) {
  return uri.replace(/:([^@]+)@/, ':****@');
}

function run() {
  const { source, target, confirm } = parseArgs(process.argv);
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('ERRORE: MONGODB_URI non definita nel file .env');
    process.exit(1);
  }

  if (!source || !target) {
    console.error('Uso: node scripts/db-sync.mjs --source <db> --target <db> --confirm');
    console.error('Esempio: node scripts/db-sync.mjs --source fantaf1 --target fantaf1_dev --confirm');
    process.exit(1);
  }

  if (PROTECTED_TARGETS.has(target)) {
    console.error(`ERRORE: "${target}" e' un database protetto e non puo' essere usato come target.`);
    console.error(`Database protetti: ${[...PROTECTED_TARGETS].join(', ')}`);
    process.exit(1);
  }

  if (!confirm) {
    console.error(`ERRORE: Operazione distruttiva (drop + restore su "${target}").`);
    console.error('Aggiungi --confirm per procedere.');
    process.exit(1);
  }

  const sourceUri = rewriteMongoUri(uri, source);
  const targetUri = rewriteMongoUri(uri, target);
  const dumpDir = mkdtempSync(join(tmpdir(), 'fantaf1-db-sync-'));

  console.log(`Source: ${source} (${maskUri(sourceUri)})`);
  console.log(`Target: ${target} (${maskUri(targetUri)})`);
  console.log(`Dump directory: ${dumpDir}`);
  console.log();

  try {
    console.log(`[1/3] mongodump da "${source}"...`);
    execFileSync('mongodump', [
      `--uri=${sourceUri}`,
      `--db=${source}`,
      `--out=${dumpDir}`,
    ], { stdio: 'inherit' });

    console.log();
    console.log(`[2/3] mongorestore su "${target}" (con --drop)...`);
    execFileSync('mongorestore', [
      `--uri=${targetUri}`,
      `--db=${target}`,
      '--drop',
      `--dir=${join(dumpDir, source)}`,
    ], { stdio: 'inherit' });

    console.log();
    console.log(`[3/3] Pulizia directory temporanea...`);
    rmSync(dumpDir, { recursive: true, force: true });

    console.log();
    console.log(`Sync completato: ${source} -> ${target}`);
  } catch (error) {
    console.error('Errore durante il sync:', error.message);
    rmSync(dumpDir, { recursive: true, force: true });
    process.exit(1);
  }
}

run();
