import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORLD_PACK_PATH = path.resolve(__dirname, '../../world/packs/base');

describe('Integration: NPC Unified Map', () => {
  describe('NPC Index', () => {
    it('loads NPC index with at least 8 NPCs', () => {
      const indexPath = path.join(WORLD_PACK_PATH, 'npcs/index.json');
      expect(fs.existsSync(indexPath)).toBe(true);

      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      expect(Array.isArray(index.npcs)).toBe(true);
      expect(index.npcs.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe('NPC Definitions', () => {
    let npcIds: string[] = [];

    it('reads NPC IDs from index', () => {
      const indexPath = path.join(WORLD_PACK_PATH, 'npcs/index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      npcIds = index.npcs;
      expect(npcIds.length).toBeGreaterThanOrEqual(8);
    });

    it('all NPCs have required fields', () => {
      const indexPath = path.join(WORLD_PACK_PATH, 'npcs/index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

      for (const npcId of index.npcs) {
        const npcPath = path.join(WORLD_PACK_PATH, 'npcs', `${npcId}.json`);
        expect(fs.existsSync(npcPath), `NPC file missing: ${npcId}.json`).toBe(true);

        const npc = JSON.parse(fs.readFileSync(npcPath, 'utf8'));
        expect(npc.id, `NPC ${npcId} missing id`).toBeDefined();
        expect(npc.name, `NPC ${npcId} missing name`).toBeDefined();
        expect(npc.zone, `NPC ${npcId} missing zone`).toBeDefined();
      }
    });

    it('at least 8 NPCs have dialogue nodes', () => {
      const indexPath = path.join(WORLD_PACK_PATH, 'npcs/index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

      let npcsWithDialogue = 0;
      for (const npcId of index.npcs) {
        const npcPath = path.join(WORLD_PACK_PATH, 'npcs', `${npcId}.json`);
        if (!fs.existsSync(npcPath)) continue;

        const npc = JSON.parse(fs.readFileSync(npcPath, 'utf8'));
        if (npc.dialogue && Object.keys(npc.dialogue).length > 0) {
          npcsWithDialogue++;
        }
      }

      expect(npcsWithDialogue).toBeGreaterThanOrEqual(8);
    });

    it('NPCs are distributed across zones', () => {
      const indexPath = path.join(WORLD_PACK_PATH, 'npcs/index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

      const zonesWithNPCs = new Set<string>();
      for (const npcId of index.npcs) {
        const npcPath = path.join(WORLD_PACK_PATH, 'npcs', `${npcId}.json`);
        if (!fs.existsSync(npcPath)) continue;

        const npc = JSON.parse(fs.readFileSync(npcPath, 'utf8'));
        if (npc.zone) {
          zonesWithNPCs.add(npc.zone);
        }
      }

      expect(zonesWithNPCs.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe('NPC Dialogue Structure', () => {
    it('dialogue nodes have valid structure', () => {
      const indexPath = path.join(WORLD_PACK_PATH, 'npcs/index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

      for (const npcId of index.npcs) {
        const npcPath = path.join(WORLD_PACK_PATH, 'npcs', `${npcId}.json`);
        if (!fs.existsSync(npcPath)) continue;

        const npc = JSON.parse(fs.readFileSync(npcPath, 'utf8'));
        if (!npc.dialogue) continue;

        for (const [nodeId, node] of Object.entries(npc.dialogue)) {
          const dialogueNode = node as { text?: string; options?: unknown[] };
          expect(dialogueNode.text, `NPC ${npcId} node ${nodeId} missing text`).toBeDefined();
          expect(typeof dialogueNode.text).toBe('string');
        }
      }
    });

    it('NPCs have greeting node', () => {
      const indexPath = path.join(WORLD_PACK_PATH, 'npcs/index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

      let npcsWithGreeting = 0;
      for (const npcId of index.npcs) {
        const npcPath = path.join(WORLD_PACK_PATH, 'npcs', `${npcId}.json`);
        if (!fs.existsSync(npcPath)) continue;

        const npc = JSON.parse(fs.readFileSync(npcPath, 'utf8'));
        if (npc.dialogue && npc.dialogue.greeting) {
          npcsWithGreeting++;
        }
      }

      expect(npcsWithGreeting).toBeGreaterThanOrEqual(8);
    });
  });
});
