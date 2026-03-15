import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const conductorSkillRoot = '/Users/matteobernardini/.codex/skills/conductor';
const statusScriptPath = path.join(conductorSkillRoot, 'scripts', 'status_tracks.py');
const newTrackScriptPath = path.join(conductorSkillRoot, 'scripts', 'new_track.py');
const archiveTracksScriptPath = path.join(conductorSkillRoot, 'scripts', 'archive_tracks.py');
const projectRoot = path.resolve(__dirname, '..');
const conductorReportPath = path.join(projectRoot, 'conductor', 'conductor-skill-operational-feedback.md');

function makeTempRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fantaf1-conductor-'));
}

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function writeFile(targetPath, content) {
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, 'utf8');
}

function writeJson(targetPath, value) {
  writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}

function runPython(scriptPath, repoPath, extraArgs = []) {
  return spawnSync(
    'python3',
    [scriptPath, '--repo', repoPath, ...extraArgs],
    {
      cwd: repoPath,
      encoding: 'utf8',
    },
  );
}

function createLegacyWorkspace(repoPath) {
  const conductorRoot = path.join(repoPath, 'conductor');
  const activeTrack = path.join(conductorRoot, 'tracks', 'fix_local_startup_20260315');
  const archivedTrack = path.join(conductorRoot, 'archive', 'verify_workflow_20260314');

  ensureDir(path.join(conductorRoot, 'tracks'));
  ensureDir(path.join(conductorRoot, 'archive'));

  writeJson(path.join(activeTrack, 'metadata.json'), {
    track_id: 'fix_local_startup_20260315',
    type: 'bug',
    status: 'completed',
    created_at: '2026-03-15T13:45:00Z',
    updated_at: '2026-03-15T13:45:00Z',
    description: "l'applicazione in locale non si sta piu' avviando",
  });
  writeFile(path.join(activeTrack, 'spec.md'), '# Spec\n');
  writeFile(path.join(activeTrack, 'plan.md'), '# Plan\n');
  writeFile(path.join(activeTrack, 'review.md'), '# Review\n');
  writeFile(path.join(activeTrack, 'verify.md'), '# Verify\n');

  writeJson(path.join(archivedTrack, 'metadata.json'), {
    id: 'verify_workflow_20260314',
    title: "Verifica e certificazione del workflow Conductor",
    status: 'archived',
    createdAt: '2026-03-14T12:00:00Z',
    updatedAt: '2026-03-14T12:00:00Z',
    archivedAt: '2026-03-14T16:00:00Z',
    path: 'conductor/archive/verify_workflow_20260314',
    relatedTrackIds: [],
    activeTask: 'Archived',
  });
  writeFile(path.join(archivedTrack, 'spec.md'), '# Spec\n');
  writeFile(path.join(archivedTrack, 'plan.md'), '# Plan\n');
  writeFile(path.join(archivedTrack, 'review.md'), '# Review\n');
  writeFile(path.join(archivedTrack, 'verify.md'), '# Verify\n');
}

function createBootstrappedWorkspace(repoPath) {
  const conductorRoot = path.join(repoPath, 'conductor');
  ensureDir(path.join(conductorRoot, 'tracks'));
  ensureDir(path.join(conductorRoot, 'archive'));
  writeFile(path.join(repoPath, 'README.md'), '# FantaF1\n');
  writeFile(path.join(repoPath, 'AGENTS.md'), '### Main Technologies\n- Frontend: React\n- Backend: ASP.NET Core 10 (C#)\n');
}

describe('conductor skill compatibility', () => {
  const tempRepos = [];

  afterEach(() => {
    for (const repoPath of tempRepos.splice(0)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }
  });

  it('status handles legacy metadata without crashing and reports normalized fields', () => {
    const repoPath = makeTempRepo();
    tempRepos.push(repoPath);
    createLegacyWorkspace(repoPath);

    const result = runPython(statusScriptPath, repoPath);

    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('fix_local_startup_20260315');
    expect(result.stdout).toContain('completed');
    expect(result.stdout).toContain('| completed | Completed |');
    expect(result.stdout).toContain('verify_workflow_20260314');
  });

  it('newTrack creates the canonical conductor files and updates indexes', () => {
    const repoPath = makeTempRepo();
    tempRepos.push(repoPath);
    createBootstrappedWorkspace(repoPath);

    const result = runPython(newTrackScriptPath, repoPath, ['--title', 'Conductor compatibility smoke']);

    expect(result.status).toBe(0);
    const createdTrackPath = result.stdout.trim();
    const metadata = JSON.parse(fs.readFileSync(path.join(createdTrackPath, 'metadata.json'), 'utf8'));

    expect(metadata.id).toMatch(/^track-\d+$/);
    expect(metadata.phase).toBe('spec');
    expect(metadata.activeTask).toBe('Draft and confirm the track spec');
    expect(fs.existsSync(path.join(createdTrackPath, 'index.md'))).toBe(true);
    expect(fs.existsSync(path.join(createdTrackPath, 'review.md'))).toBe(true);
    expect(fs.existsSync(path.join(createdTrackPath, 'verify.md'))).toBe(true);
    expect(fs.readFileSync(path.join(repoPath, 'conductor', 'index.md'), 'utf8')).toContain(metadata.id);
  });

  it('archive treats completed legacy tracks as archivable and refreshes their metadata', () => {
    const repoPath = makeTempRepo();
    tempRepos.push(repoPath);
    createLegacyWorkspace(repoPath);

    const result = runPython(archiveTracksScriptPath, repoPath);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('archived');

    const archivedTrackPath = path.join(repoPath, 'conductor', 'archive', 'fix_local_startup_20260315');
    const archivedMetadata = JSON.parse(fs.readFileSync(path.join(archivedTrackPath, 'metadata.json'), 'utf8'));

    expect(archivedMetadata.status).toBe('archived');
    expect(archivedMetadata.phase).toBe('archived');
    expect(archivedMetadata.archivedAt).toMatch(/Z$/);
    expect(fs.existsSync(path.join(archivedTrackPath, 'index.md'))).toBe(true);
  });

  it('archive force-completes every active track before moving all of them to archive', () => {
    const repoPath = makeTempRepo();
    tempRepos.push(repoPath);
    const conductorRoot = path.join(repoPath, 'conductor');
    const newTrack = path.join(conductorRoot, 'tracks', 'track-new');
    const inProgressTrack = path.join(conductorRoot, 'tracks', 'track-progress');
    const unknownTrack = path.join(conductorRoot, 'tracks', 'track-unknown');

    ensureDir(path.join(conductorRoot, 'tracks'));
    ensureDir(path.join(conductorRoot, 'archive'));

    for (const [trackPath, metadata] of [
      [newTrack, { id: 'track-new', title: 'Track New', status: 'new', phase: 'new', createdAt: '2026-03-14T00:00:00Z', updatedAt: '2026-03-14T00:00:00Z', archivedAt: null, path: 'conductor/tracks/track-new', relatedTrackIds: [], activeTask: 'No active task' }],
      [inProgressTrack, { id: 'track-progress', title: 'Track Progress', status: 'in_progress', phase: 'in_progress', createdAt: '2026-03-14T00:00:00Z', updatedAt: '2026-03-14T00:00:00Z', archivedAt: null, path: 'conductor/tracks/track-progress', relatedTrackIds: [], activeTask: 'No active task' }],
      [unknownTrack, { id: 'track-unknown', title: 'Track Unknown', status: 'unknown', phase: 'unknown', createdAt: '2026-03-14T00:00:00Z', updatedAt: '2026-03-14T00:00:00Z', archivedAt: null, path: 'conductor/tracks/track-unknown', relatedTrackIds: [], activeTask: 'No active task' }],
    ]) {
      writeJson(path.join(trackPath, 'metadata.json'), metadata);
      writeFile(path.join(trackPath, 'spec.md'), '# Spec\n');
      writeFile(path.join(trackPath, 'plan.md'), '# Plan\n');
      writeFile(path.join(trackPath, 'review.md'), '# Review\n\n## Decision\n');
      writeFile(path.join(trackPath, 'verify.md'), '# Verify\n\n## Commands Run\n');
    }

    const result = runPython(archiveTracksScriptPath, repoPath);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('archived');
    expect(fs.readdirSync(path.join(conductorRoot, 'tracks')).filter((entry) => !entry.startsWith('.'))).toEqual([]);

    for (const archivedDirectoryName of ['track-new', 'track-progress', 'track-unknown']) {
      const archivedTrackPath = path.join(conductorRoot, 'archive', archivedDirectoryName);
      const archivedMetadata = JSON.parse(fs.readFileSync(path.join(archivedTrackPath, 'metadata.json'), 'utf8'));
      const review = fs.readFileSync(path.join(archivedTrackPath, 'review.md'), 'utf8');
      const verify = fs.readFileSync(path.join(archivedTrackPath, 'verify.md'), 'utf8');

      expect(archivedMetadata.status).toBe('archived');
      expect(archivedMetadata.phase).toBe('archived');
      expect(archivedMetadata.activeTask).toBe('Archived');
      expect(archivedMetadata.path).toBe(`conductor/archive/${archivedDirectoryName}`);
      expect(archivedMetadata.archivedAt).toMatch(/Z$/);
      expect(review).toContain('Administrative archive decision');
      expect(verify).toContain('Administrative archive executed');
    }

    const tracksIndex = fs.readFileSync(path.join(conductorRoot, 'tracks.md'), 'utf8');
    expect(tracksIndex).toContain('No active tracks currently registered.');
    expect(tracksIndex).toContain('track-new');
    expect(tracksIndex).toContain('track-progress');
    expect(tracksIndex).toContain('track-unknown');
  });

  it('keeps the repository conductor workspace aligned with the skill contract and operational report', () => {
    const requiredMetadataKeys = [
      'id',
      'slug',
      'title',
      'status',
      'phase',
      'createdAt',
      'updatedAt',
      'archivedAt',
      'path',
      'relatedTrackIds',
      'activeTask',
    ];
    const requiredTrackFiles = ['index.md', 'metadata.json', 'spec.md', 'plan.md', 'review.md', 'verify.md'];
    const conductorRoots = [
      path.join(projectRoot, 'conductor', 'tracks'),
      path.join(projectRoot, 'conductor', 'archive'),
    ];

    for (const conductorRoot of conductorRoots) {
      for (const entry of fs.readdirSync(conductorRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
          continue;
        }
        if (entry.name.startsWith('_')) {
          continue;
        }

        const trackPath = path.join(conductorRoot, entry.name);
        const metadata = JSON.parse(fs.readFileSync(path.join(trackPath, 'metadata.json'), 'utf8'));

        for (const key of requiredMetadataKeys) {
          expect(metadata, `${trackPath} is missing ${key}`).toHaveProperty(key);
        }

        expect(Array.isArray(metadata.relatedTrackIds), `${trackPath} relatedTrackIds must be an array`).toBe(true);

        for (const requiredFile of requiredTrackFiles) {
          expect(fs.existsSync(path.join(trackPath, requiredFile)), `${trackPath} is missing ${requiredFile}`).toBe(true);
        }
      }
    }

    const report = fs.readFileSync(conductorReportPath, 'utf8');
    expect(report).toContain('# Conductor Skill Operational Feedback');
    expect(report).toContain('## Problems Observed');
    expect(report).toContain('## Fixes Applied');
    expect(report).toContain('## Legacy To Canonical Metadata Mapping');
    expect(report).toContain('## Verification Commands');

    const archivedRootPlansDir = path.join(projectRoot, 'conductor', 'archive', '_root-plans');
    const archivedRootPlans = [
      'enforce-commit-docs-rule.md',
      'feature-standings.md',
      'fix-mappa.md',
      'fix-scroll-jank.md',
      'subphase-11-plan.md',
    ];

    for (const fileName of archivedRootPlans) {
      expect(
        fs.existsSync(path.join(projectRoot, 'conductor', fileName)),
        `${fileName} should no longer remain at conductor root`,
      ).toBe(false);
      expect(
        fs.existsSync(path.join(archivedRootPlansDir, fileName)),
        `${fileName} should be archived under conductor/archive/_root-plans`,
      ).toBe(true);
    }
  });
});
