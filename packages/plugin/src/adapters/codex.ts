import { BaseAdapter } from './base.js';
import type { UnifiedCommand } from './types.js';

export class CodexAdapter extends BaseAdapter {
  generate(command: UnifiedCommand): string {
    const lines = [`# ${command.name}`, '', `> ${command.description}`, ''];

    lines.push(command.instructions);

    if (command.arguments) {
      lines.push('');
      lines.push('## Arguments');
      lines.push('');
      lines.push(`Usage: /${command.name} ${command.arguments}`);
    }

    return lines.join('\n');
  }
}
