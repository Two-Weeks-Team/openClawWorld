import { BaseAdapter } from './base.js';
import type { UnifiedCommand } from './types.js';

export class OpenCodeAdapter extends BaseAdapter {
  generate(command: UnifiedCommand): string {
    const frontmatterLines = ['---', `description: ${command.description}`];

    if (command.arguments) {
      frontmatterLines.push(`argument-hint: ${command.arguments}`);
    }

    frontmatterLines.push('---');

    const content = [
      frontmatterLines.join('\n'),
      '',
      `<command-name>${command.name}</command-name>`,
      '',
      '<command-instruction>',
      command.instructions,
      '</command-instruction>',
      '',
      '<allowed-tools>',
      command.tools.map(t => `  <tool>${t}</tool>`).join('\n'),
      '</allowed-tools>',
    ];

    return content.join('\n');
  }
}
