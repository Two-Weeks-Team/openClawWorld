import { describe, it, expect } from 'vitest';
import { manifest } from '@openclawworld/plugin';

describe('Tool Access Policy Tests', () => {
  describe('Required Tools', () => {
    it('has ocw.status as required tool', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.status');
      expect(tool).toBeDefined();
      expect(tool?.required).toBe(true);
      expect(tool?.defaultEnabled).toBe(true);
    });

    it('has ocw.observe as required tool', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.observe');
      expect(tool).toBeDefined();
      expect(tool?.required).toBe(true);
      expect(tool?.defaultEnabled).toBe(true);
    });

    it('has ocw.poll_events as required tool', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.poll_events');
      expect(tool).toBeDefined();
      expect(tool?.required).toBe(true);
      expect(tool?.defaultEnabled).toBe(true);
    });

    it('ensures all required tools have correct metadata', () => {
      const requiredTools = manifest.tools.filter(t => t.required);
      expect(requiredTools).toHaveLength(3);

      for (const tool of requiredTools) {
        expect(tool.defaultEnabled).toBe(true);
        expect(tool.sideEffects).toBe('none');
        expect(tool.name).toMatch(/^ocw\./);
      }
    });
  });

  describe('Optional Tools', () => {
    it('has ocw.move_to as optional tool', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.move_to');
      expect(tool).toBeDefined();
      expect(tool?.required).toBe(false);
      expect(tool?.defaultEnabled).toBe(false);
      expect(tool?.sideEffects).toBe('world');
    });

    it('has ocw.interact as optional tool', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.interact');
      expect(tool).toBeDefined();
      expect(tool?.required).toBe(false);
      expect(tool?.defaultEnabled).toBe(false);
      expect(tool?.sideEffects).toBe('world');
    });

    it('has ocw.chat_send as optional tool', () => {
      const tool = manifest.tools.find(t => t.name === 'ocw.chat_send');
      expect(tool).toBeDefined();
      expect(tool?.required).toBe(false);
      expect(tool?.defaultEnabled).toBe(false);
      expect(tool?.sideEffects).toBe('chat');
    });

    it('ensures optional tools have correct default state', () => {
      const optionalTools = manifest.tools.filter(t => !t.required);
      expect(optionalTools).toHaveLength(3);

      for (const tool of optionalTools) {
        expect(tool.defaultEnabled).toBe(false);
        expect(['world', 'chat']).toContain(tool.sideEffects);
      }
    });
  });

  describe('Tool Schemas', () => {
    it('validates all tools have input schemas', () => {
      for (const tool of manifest.tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
      }
    });

    it('validates all tools have output schemas', () => {
      for (const tool of manifest.tools) {
        expect(tool.outputSchema).toBeDefined();
        expect(typeof tool.outputSchema).toBe('object');
      }
    });

    it('validates all tools have descriptions', () => {
      for (const tool of manifest.tools) {
        expect(tool.description).toBeDefined();
        expect(tool.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tool Dependencies', () => {
    it('world effect tools depend on observe', () => {
      const worldTools = manifest.tools.filter(t => t.sideEffects === 'world');
      const observeTool = manifest.tools.find(t => t.name === 'ocw.observe');

      expect(observeTool).toBeDefined();
      expect(observeTool?.required).toBe(true);
      expect(worldTools).toHaveLength(2);
    });

    it('chat effect tools depend on poll_events', () => {
      const chatTools = manifest.tools.filter(t => t.sideEffects === 'chat');
      const pollEventsTool = manifest.tools.find(t => t.name === 'ocw.poll_events');

      expect(pollEventsTool).toBeDefined();
      expect(pollEventsTool?.required).toBe(true);
      expect(chatTools).toHaveLength(1);
    });
  });

  describe('Side Effects Classification', () => {
    it('classifies read-only tools as sideEffects: none', () => {
      const readTools = ['ocw.status', 'ocw.observe', 'ocw.poll_events'];
      for (const toolName of readTools) {
        const tool = manifest.tools.find(t => t.name === toolName);
        expect(tool?.sideEffects).toBe('none');
      }
    });

    it('classifies world modifying tools as sideEffects: world', () => {
      const worldTools = ['ocw.move_to', 'ocw.interact'];
      for (const toolName of worldTools) {
        const tool = manifest.tools.find(t => t.name === toolName);
        expect(tool?.sideEffects).toBe('world');
      }
    });

    it('classifies chat tools as sideEffects: chat', () => {
      const chatTool = manifest.tools.find(t => t.name === 'ocw.chat_send');
      expect(chatTool?.sideEffects).toBe('chat');
    });
  });

  describe('Manifest Structure', () => {
    it('has valid schema version', () => {
      expect(manifest.schemaVersion).toBe('1.0');
    });

    it('has correct plugin name', () => {
      expect(manifest.name).toBe('openclawworld');
    });

    it('has version defined', () => {
      expect(manifest.version).toBeDefined();
      expect(typeof manifest.version).toBe('string');
    });

    it('has config schema defined', () => {
      expect(manifest.configSchema).toBeDefined();
      expect(manifest.configSchema.type).toBe('object');
    });

    it('lists all 6 tools in manifest', () => {
      expect(manifest.tools).toHaveLength(6);
      const toolNames = manifest.tools.map(t => t.name).sort();
      expect(toolNames).toEqual([
        'ocw.chat_send',
        'ocw.interact',
        'ocw.move_to',
        'ocw.observe',
        'ocw.poll_events',
        'ocw.status',
      ]);
    });
  });
});
