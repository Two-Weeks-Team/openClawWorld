import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

function readText(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8');
}

describe('AIC Result Wrapper Contract', () => {
  it('uses status-based AicResult in shared types', () => {
    const sharedTypes = readText('packages/shared/src/types.ts');

    expect(sharedTypes).toMatch(
      /export type AicResult<T>\s*=\s*\{ status: 'ok'; data: T \}\s*\|\s*\{ status: 'error'; error: AicErrorObject \};/
    );
  });

  it('keeps AIC guide docs aligned to status/data/error wrapper', () => {
    const guidePaths = [
      'AGENTS.md',
      'packages/server/src/AGENTS.md',
      'packages/server/src/aic/AGENTS.md',
      'README.md',
    ];

    for (const path of guidePaths) {
      const content = readText(path);

      expect(content).not.toMatch(/\{\s*success\s*:\s*boolean/);
      expect(content).toMatch(/status/);
    }
  });
});
