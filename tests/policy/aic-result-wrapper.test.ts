import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

function readText(filePath: string): string {
  return readFileSync(resolve(process.cwd(), filePath), 'utf-8');
}

describe('AIC Result Wrapper Contract', () => {
  it('uses status-based AicResult in shared types', () => {
    const sharedTypes = readText('packages/shared/src/types.ts');

    expect(sharedTypes).toMatch(/export type AicResult<T>/);
    expect(sharedTypes).toMatch(/status:\s*'ok'/);
    expect(sharedTypes).toMatch(/status:\s*'error'/);
    expect(sharedTypes).toMatch(/AicErrorObject/);
  });

  it('keeps AIC guide docs aligned to status/data/error wrapper', () => {
    const guidePaths = [
      'AGENTS.md',
      'packages/server/src/AGENTS.md',
      'packages/server/src/aic/AGENTS.md',
      'README.md',
    ];

    for (const guidePath of guidePaths) {
      const content = readText(guidePath);

      expect(content).not.toMatch(/\{\s*success\s*:\s*boolean/);
      expect(content).toMatch(/status:\s*'ok'/);
    }
  });
});
