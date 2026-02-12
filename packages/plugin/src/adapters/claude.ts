import { BaseAdapter } from './base.js';
import type { UnifiedCommand } from './types.js';

export class ClaudeAdapter extends BaseAdapter {
  generate(command: UnifiedCommand): string {
    const frontmatterLines = [
      '---',
      `description: "${command.description}"`,
      `allowed-tools: ${this.formatTools(command.tools)}`,
    ];

    if (command.arguments) {
      frontmatterLines.push(`argument-hint: ${command.arguments}`);
    }

    frontmatterLines.push('---');

    const content = [
      frontmatterLines.join('\n'),
      '',
      `# /${command.name}`,
      '',
      command.instructions,
    ];

    return content.join('\n');
  }
}
