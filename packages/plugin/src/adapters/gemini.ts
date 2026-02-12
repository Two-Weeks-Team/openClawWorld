import { BaseAdapter } from './base.js';
import type { UnifiedCommand } from './types.js';

export class GeminiAdapter extends BaseAdapter {
  generate(command: UnifiedCommand): string {
    const lines = [`name = "${command.name}"`, `description = "${command.description}"`];

    if (command.arguments) {
      lines.push(`arguments = "${command.arguments}"`);
    }

    lines.push('');
    const tomlArrayLiteral = command.tools.map(t => `"${t}"`).join(', ');
    lines.push(`tools = [${tomlArrayLiteral}]`);
    lines.push('');
    lines.push('prompt = """');
    lines.push(command.instructions);
    lines.push('"""');

    return lines.join('\n');
  }
}
