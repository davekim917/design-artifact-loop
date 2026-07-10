/**
 * Bundle freshness guard: marketplace installs run the COMMITTED
 * server/dist/index.mjs, while this repo's tests exercise the TS sources —
 * nothing else fails if you edit server/*.ts and forget `bun run build`.
 * This test rebuilds the bundle to a temp path and byte-compares it.
 *
 * Note: compares output of THIS machine's bun version; a bun upgrade that
 * changes codegen will flag here — that's a signal to rebuild + commit, not
 * a false positive.
 */
import { describe, it, expect } from 'bun:test';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('committed dist bundle', () => {
  it('matches a fresh build of the TS sources', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dal-bundle-')), 'index.mjs');
    execFileSync('bun', ['build', path.join(import.meta.dir, 'index.ts'), '--target=node', `--outfile=${tmp}`], {
      stdio: 'pipe',
    });
    const fresh = fs.readFileSync(tmp);
    const committed = fs.readFileSync(path.join(import.meta.dir, 'dist', 'index.mjs'));
    expect(committed.equals(fresh), 'server/dist/index.mjs is stale — run `bun run build` and commit it').toBe(true);
  });
});
