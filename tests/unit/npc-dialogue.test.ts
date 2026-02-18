import { describe, it, expect } from 'vitest';
import type { DialogueTree, NpcDefinition } from '@openclawworld/shared';

describe('NPC Dialogue System', () => {
  describe('DialogueTree type', () => {
    it('supports dialogue tree structure', () => {
      const dialogueTree: DialogueTree = {
        greeting: {
          id: 'greeting',
          text: 'Welcome! How can I help you?',
          options: [
            { text: 'Tell me about this place', next: 'about' },
            { text: 'Goodbye', next: null },
          ],
        },
        about: {
          id: 'about',
          text: 'This is Grid-Town, a vibrant community!',
          options: [{ text: 'Thanks!', next: null }],
        },
      };

      expect(dialogueTree.greeting).toBeDefined();
      expect(dialogueTree.greeting.options).toHaveLength(2);
      expect(dialogueTree.greeting.options[0].next).toBe('about');
      expect(dialogueTree.greeting.options[1].next).toBeNull();
    });

    it('supports branching dialogue paths', () => {
      const dialogueTree: DialogueTree = {
        greeting: {
          id: 'greeting',
          text: 'Hello traveler!',
          options: [
            { text: 'About the town', next: 'town-info' },
            { text: 'About NPCs', next: 'npc-info' },
            { text: 'Leave', next: null },
          ],
        },
        'town-info': {
          id: 'town-info',
          text: 'The town has 8 zones.',
          options: [
            { text: 'Tell me more', next: 'town-details' },
            { text: 'Back', next: 'greeting' },
          ],
        },
        'npc-info': {
          id: 'npc-info',
          text: 'There are 9 NPCs here.',
          options: [{ text: 'Interesting!', next: null }],
        },
        'town-details': {
          id: 'town-details',
          text: 'We have offices, parks, arcades, and more!',
          options: [{ text: 'Cool!', next: null }],
        },
      };

      expect(Object.keys(dialogueTree)).toHaveLength(4);
      expect(dialogueTree['town-info'].options[1].next).toBe('greeting');
    });
  });

  describe('NpcDefinition with dialogue', () => {
    it('supports NpcDefinition with DialogueTree', () => {
      const npcDef: NpcDefinition = {
        id: 'greeter',
        name: 'Sam the Greeter',
        zone: 'lobby',
        defaultPosition: { x: 160, y: 128 },
        dialogue: {
          greeting: {
            id: 'greeting',
            text: 'Welcome to Grid-Town!',
            options: [
              { text: 'What is this place?', next: 'about-town' },
              { text: 'Just passing through!', next: null },
            ],
          },
          'about-town': {
            id: 'about-town',
            text: 'Grid-Town is a vibrant community hub!',
            options: [{ text: 'Sounds great!', next: null }],
          },
        },
      };

      expect(npcDef.dialogue).toBeDefined();
      expect(typeof npcDef.dialogue).toBe('object');
      expect(Array.isArray(npcDef.dialogue)).toBe(false);
    });

    it('supports NpcDefinition with string array dialogue (legacy)', () => {
      const npcDef: NpcDefinition = {
        id: 'guard',
        name: 'Security Guard',
        zone: 'lobby',
        defaultPosition: { x: 200, y: 128 },
        dialogue: ['Stay safe!', 'Move along.', 'No trouble here.'],
      };

      expect(npcDef.dialogue).toBeDefined();
      expect(Array.isArray(npcDef.dialogue)).toBe(true);
      expect(npcDef.dialogue as string[]).toHaveLength(3);
    });
  });

  describe('Dialogue state tracking', () => {
    type DialogueState = {
      npcId: string;
      currentNodeId: string;
    };

    it('tracks dialogue state per agent', () => {
      const dialogueStates = new Map<string, DialogueState>();

      dialogueStates.set('agent-1', { npcId: 'greeter', currentNodeId: 'greeting' });
      dialogueStates.set('agent-2', { npcId: 'barista', currentNodeId: 'menu' });

      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('greeting');
      expect(dialogueStates.get('agent-2')?.currentNodeId).toBe('menu');
    });

    it('clears dialogue state on conversation end', () => {
      const dialogueStates = new Map<string, DialogueState>();
      dialogueStates.set('agent-1', { npcId: 'greeter', currentNodeId: 'greeting' });

      dialogueStates.delete('agent-1');

      expect(dialogueStates.has('agent-1')).toBe(false);
    });
  });

  describe('Dialogue traversal logic', () => {
    function handleNpcTalk(
      agentId: string,
      npcName: string,
      dialogue: DialogueTree | string[] | undefined,
      dialogueStates: Map<string, { npcId: string; currentNodeId: string }>,
      npcId: string,
      optionIndex?: number
    ):
      | { nodeId: string; text: string; options: { index: number; text: string }[] }
      | { action: 'end' }
      | string {
      if (!dialogue) {
        return `${npcName}: "Hello there!"`;
      }

      if (Array.isArray(dialogue)) {
        const randomIndex = Math.floor(Math.random() * dialogue.length);
        return `${npcName}: "${dialogue[randomIndex]}"`;
      }

      const dialogueState = dialogueStates.get(agentId);

      if (optionIndex !== undefined && dialogueState && dialogueState.npcId === npcId) {
        const currentNode = dialogue[dialogueState.currentNodeId];
        if (currentNode && currentNode.options[optionIndex]) {
          const selectedOption = currentNode.options[optionIndex];
          const nextNodeId = selectedOption.next;

          if (nextNodeId === null) {
            dialogueStates.delete(agentId);
            return { action: 'end' };
          }

          const nextNode = dialogue[nextNodeId];
          if (nextNode) {
            dialogueStates.set(agentId, { npcId, currentNodeId: nextNodeId });
            return {
              nodeId: nextNodeId,
              text: nextNode.text,
              options: nextNode.options.map((opt, idx) => ({ index: idx, text: opt.text })),
            };
          }
        }
      }

      const greetingNode = dialogue['greeting'];
      if (greetingNode) {
        dialogueStates.set(agentId, { npcId, currentNodeId: 'greeting' });
        return {
          nodeId: 'greeting',
          text: greetingNode.text,
          options: greetingNode.options.map((opt, idx) => ({ index: idx, text: opt.text })),
        };
      }

      return `${npcName}: "..."`;
    }

    it('starts dialogue at greeting node', () => {
      const dialogueStates = new Map<string, { npcId: string; currentNodeId: string }>();
      const dialogue: DialogueTree = {
        greeting: {
          id: 'greeting',
          text: 'Welcome!',
          options: [{ text: 'Hi!', next: null }],
        },
      };

      const result = handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter');

      expect(result).toEqual({
        nodeId: 'greeting',
        text: 'Welcome!',
        options: [{ index: 0, text: 'Hi!' }],
      });
      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('greeting');
    });

    it('navigates to next node when option selected', () => {
      const dialogueStates = new Map<string, { npcId: string; currentNodeId: string }>();
      const dialogue: DialogueTree = {
        greeting: {
          id: 'greeting',
          text: 'Welcome!',
          options: [{ text: 'Tell me more', next: 'info' }],
        },
        info: {
          id: 'info',
          text: 'This is the info!',
          options: [{ text: 'Thanks', next: null }],
        },
      };

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter');

      const result = handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter', 0);

      expect(result).toEqual({
        nodeId: 'info',
        text: 'This is the info!',
        options: [{ index: 0, text: 'Thanks' }],
      });
      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('info');
    });

    it('ends conversation when option.next is null', () => {
      const dialogueStates = new Map<string, { npcId: string; currentNodeId: string }>();
      const dialogue: DialogueTree = {
        greeting: {
          id: 'greeting',
          text: 'Welcome!',
          options: [{ text: 'Bye', next: null }],
        },
      };

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter');

      const result = handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter', 0);

      expect(result).toEqual({ action: 'end' });
      expect(dialogueStates.has('agent-1')).toBe(false);
    });

    it('returns random string for array dialogue', () => {
      const dialogueStates = new Map<string, { npcId: string; currentNodeId: string }>();
      const dialogue = ['Hello!', 'Hi there!', 'Greetings!'];

      const result = handleNpcTalk('agent-1', 'Guard', dialogue, dialogueStates, 'guard');

      expect(typeof result).toBe('string');
      expect(result).toMatch(/Guard: ".+"/);
    });

    it('returns default greeting for undefined dialogue', () => {
      const dialogueStates = new Map<string, { npcId: string; currentNodeId: string }>();

      const result = handleNpcTalk('agent-1', 'Stranger', undefined, dialogueStates, 'unknown');

      expect(result).toBe('Stranger: "Hello there!"');
    });

    it('supports multi-turn conversations', () => {
      const dialogueStates = new Map<string, { npcId: string; currentNodeId: string }>();
      const dialogue: DialogueTree = {
        greeting: {
          id: 'greeting',
          text: 'Hello!',
          options: [
            { text: 'About town', next: 'town' },
            { text: 'About you', next: 'about-me' },
          ],
        },
        town: {
          id: 'town',
          text: 'The town is great!',
          options: [
            { text: 'More details', next: 'town-details' },
            { text: 'Back', next: 'greeting' },
          ],
        },
        'about-me': {
          id: 'about-me',
          text: 'I am the greeter!',
          options: [{ text: 'Nice!', next: null }],
        },
        'town-details': {
          id: 'town-details',
          text: '8 zones, 9 NPCs!',
          options: [{ text: 'Amazing!', next: null }],
        },
      };

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter');
      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('greeting');

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter', 0);
      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('town');

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter', 1);
      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('greeting');

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter', 1);
      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('about-me');

      const endResult = handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter', 0);
      expect(endResult).toEqual({ action: 'end' });
      expect(dialogueStates.has('agent-1')).toBe(false);
    });

    it('isolates dialogue state between agents', () => {
      const dialogueStates = new Map<string, { npcId: string; currentNodeId: string }>();
      const dialogue: DialogueTree = {
        greeting: {
          id: 'greeting',
          text: 'Hello!',
          options: [{ text: 'Info', next: 'info' }],
        },
        info: {
          id: 'info',
          text: 'Here is info!',
          options: [{ text: 'Thanks', next: null }],
        },
      };

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter');
      handleNpcTalk('agent-2', 'Sam', dialogue, dialogueStates, 'greeter');

      handleNpcTalk('agent-1', 'Sam', dialogue, dialogueStates, 'greeter', 0);

      expect(dialogueStates.get('agent-1')?.currentNodeId).toBe('info');
      expect(dialogueStates.get('agent-2')?.currentNodeId).toBe('greeting');
    });
  });
});
