import type { UnifiedCommand, AdapterConfig } from './types.js';

export abstract class BaseAdapter {
  constructor(public config: AdapterConfig) {}

  abstract generate(command: UnifiedCommand): string;

  protected sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  }

  protected formatTools(tools: string[]): string {
    return tools.join(', ');
  }
}
