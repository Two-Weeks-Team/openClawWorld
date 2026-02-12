import { BaseAdapter } from './base.js';
import type { UnifiedCommand } from './types.js';

export class CodexAdapter extends BaseAdapter {
  generate(command: UnifiedCommand): string {
    const lines = [
      `# ${command.description}`,
      '',
      `## Command: /${command.name}`,
      '',
      '## Available Tools',
    ];

    for (const tool of command.tools) {
      lines.push(`- ${tool}`);
    }

    if (command.toolDetails && command.toolDetails.length > 0) {
      lines.push('');
      lines.push('### Tool Details');
      lines.push('');

      for (const tool of command.toolDetails) {
        lines.push(`#### ${tool.name}`);
        lines.push(`- **Description**: ${tool.description}`);
        lines.push(`- **Required**: ${tool.required ? 'Yes' : 'No'}`);
        lines.push(`- **Side Effects**: ${tool.sideEffects}`);

        if (tool.parameters && tool.parameters.length > 0) {
          lines.push('- **Parameters**: ');
          for (const param of tool.parameters) {
            lines.push(
              `  - ${param.name} (${param.type}${param.required ? ', required' : ', optional'}): ${param.description}`
            );
          }
        }
        lines.push('');
      }
    }

    lines.push('## Instructions');
    lines.push('');
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
