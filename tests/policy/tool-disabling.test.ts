import { describe, it, expect } from 'vitest';
import { manifest } from '@openclawworld/plugin';

describe('Tool Disabling Policy Tests', () => {
  describe('Optional Tools Disabled by Default', () => {
    it('has move_to disabled by default', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.move_to');
      expect(tool?.defaultEnabled).toBe(false);
      expect(tool?.required).toBe(false);
    });

    it('has interact disabled by default', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.interact');
      expect(tool?.defaultEnabled).toBe(false);
      expect(tool?.required).toBe(false);
    });

    it('has chat_send disabled by default', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.chat_send');
      expect(tool?.defaultEnabled).toBe(false);
      expect(tool?.required).toBe(false);
    });
  });

  describe('Required Tools Always Accessible', () => {
    it('ensures status cannot be disabled', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.status');
      expect(tool?.required).toBe(true);
      expect(tool?.defaultEnabled).toBe(true);
    });

    it('ensures observe cannot be disabled', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.observe');
      expect(tool?.required).toBe(true);
      expect(tool?.defaultEnabled).toBe(true);
    });

    it('ensures poll_events cannot be disabled', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.poll_events');
      expect(tool?.required).toBe(true);
      expect(tool?.defaultEnabled).toBe(true);
    });
  });

  describe('Tool Enablement Structure', () => {
    it('tracks required vs optional tool counts', () => {
      const requiredCount = manifest.tools.filter(t => t.required).length;
      const optionalCount = manifest.tools.filter(t => !t.required).length;

      expect(requiredCount).toBe(3);
      expect(optionalCount).toBe(3);
      expect(requiredCount + optionalCount).toBe(manifest.tools.length);
    });

    it('validates defaultEnabled matches required status for required tools', () => {
      const requiredTools = manifest.tools.filter(t => t.required);
      for (const tool of requiredTools) {
        expect(tool.defaultEnabled).toBe(true);
      }
    });

    it('validates defaultEnabled is false for all optional tools', () => {
      const optionalTools = manifest.tools.filter(t => !t.required);
      for (const tool of optionalTools) {
        expect(tool.defaultEnabled).toBe(false);
      }
    });
  });

  describe('World Effect Tools', () => {
    it('marks world effect tools as requiring explicit enablement', () => {
      const worldTools = manifest.tools.filter(t => t.sideEffects === 'world');

      for (const tool of worldTools) {
        expect(tool.defaultEnabled).toBe(false);
        expect(tool.required).toBe(false);
      }
    });

    it('documents side effects for world tools', () => {
      const worldTools = manifest.tools.filter(t => t.sideEffects === 'world');

      for (const tool of worldTools) {
        expect(tool.description.toLowerCase()).toContain('idempotent');
      }
    });
  });

  describe('Chat Effect Tools', () => {
    it('marks chat effect tool as requiring explicit enablement', () => {
      const chatTool = manifest.tools.find(t => t.sideEffects === 'chat');

      expect(chatTool?.defaultEnabled).toBe(false);
      expect(chatTool?.required).toBe(false);
    });

    it('documents idempotency for chat tool', () => {
      const chatTool = manifest.tools.find(t => t.sideEffects === 'chat');

      expect(chatTool?.description.toLowerCase()).toContain('idempotent');
    });
  });

  describe('Configuration Schema', () => {
    it('defines config schema as object type', () => {
      expect(manifest.configSchema.type).toBe('object');
    });

    it('has additionalProperties false in config schema', () => {
      expect(manifest.configSchema.additionalProperties).toBe(false);
    });

    it('requires baseUrl in config', () => {
      expect(manifest.configSchema.required).toContain('baseUrl');
    });

    it('has optional apiKey in config', () => {
      const hasApiKey = manifest.configSchema.properties?.apiKey !== undefined;
      expect(hasApiKey).toBe(true);
    });

    it('has optional defaultRoomId in config', () => {
      const hasRoomId = manifest.configSchema.properties?.defaultRoomId !== undefined;
      expect(hasRoomId).toBe(true);
    });

    it('has optional defaultAgentId in config', () => {
      const hasAgentId = manifest.configSchema.properties?.defaultAgentId !== undefined;
      expect(hasAgentId).toBe(true);
    });
  });

  describe('Tool Schema References', () => {
    it('references AIC schemas for input/output', () => {
      const observeTool = manifest.tools.find(t => t.name === 'ocw.observe');
      const inputRef = observeTool?.inputSchema?.$ref;
      const outputRef = observeTool?.outputSchema?.$ref;

      expect(inputRef).toContain('openclawworld.local/schemas/aic');
      expect(outputRef).toContain('openclawworld.local/schemas/aic');
    });

    it('uses consistent schema references across tools', () => {
      const aicTools = [
        'ocw.observe',
        'ocw.move_to',
        'ocw.interact',
        'ocw.chat_send',
        'ocw.poll_events',
      ];

      for (const toolName of aicTools) {
        const tool = manifest.tools.find(t => t.name === toolName);
        const inputRef = tool?.inputSchema?.$ref || '';
        const outputRef = tool?.outputSchema?.$ref || '';

        if (inputRef) {
          expect(inputRef).toContain('openclawworld.local/schemas/aic');
        }
        if (outputRef) {
          expect(outputRef).toContain('openclawworld.local/schemas/aic');
        }
      }
    });
  });
});
