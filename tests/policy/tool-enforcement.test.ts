import { describe, it, expect } from 'vitest';
import {
  isToolEnabled,
  createForbiddenError,
  REQUIRED_TOOLS,
  OPTIONAL_TOOLS,
  validateConfig,
  type PluginConfig,
} from '@openclawworld/plugin';

describe('Tool Policy Enforcement Tests', () => {
  const baseConfig: PluginConfig = validateConfig({
    baseUrl: 'http://localhost:8080',
  });

  describe('isToolEnabled function', () => {
    describe('Required Tools', () => {
      it('always enables ocw.status regardless of config', () => {
        expect(isToolEnabled('ocw.status', baseConfig)).toBe(true);
        expect(isToolEnabled('ocw.status', { ...baseConfig, deniedTools: ['ocw.status'] })).toBe(
          true
        );
        expect(isToolEnabled('ocw.status', { ...baseConfig, enabledTools: [] })).toBe(true);
      });

      it('always enables ocw.observe regardless of config', () => {
        expect(isToolEnabled('ocw.observe', baseConfig)).toBe(true);
        expect(isToolEnabled('ocw.observe', { ...baseConfig, deniedTools: ['ocw.observe'] })).toBe(
          true
        );
        expect(isToolEnabled('ocw.observe', { ...baseConfig, enabledTools: [] })).toBe(true);
      });

      it('always enables ocw.poll_events regardless of config', () => {
        expect(isToolEnabled('ocw.poll_events', baseConfig)).toBe(true);
        expect(
          isToolEnabled('ocw.poll_events', { ...baseConfig, deniedTools: ['ocw.poll_events'] })
        ).toBe(true);
        expect(isToolEnabled('ocw.poll_events', { ...baseConfig, enabledTools: [] })).toBe(true);
      });
    });

    describe('Optional Tools Default Behavior', () => {
      it('disables ocw.move_to by default', () => {
        expect(isToolEnabled('ocw.move_to', baseConfig)).toBe(false);
      });

      it('disables ocw.interact by default', () => {
        expect(isToolEnabled('ocw.interact', baseConfig)).toBe(false);
      });

      it('disables ocw.chat_send by default', () => {
        expect(isToolEnabled('ocw.chat_send', baseConfig)).toBe(false);
      });
    });

    describe('Optional Tools Whitelist', () => {
      it('enables ocw.move_to when in enabledTools', () => {
        const config = { ...baseConfig, enabledTools: ['ocw.move_to'] };
        expect(isToolEnabled('ocw.move_to', config)).toBe(true);
      });

      it('enables ocw.interact when in enabledTools', () => {
        const config = { ...baseConfig, enabledTools: ['ocw.interact'] };
        expect(isToolEnabled('ocw.interact', config)).toBe(true);
      });

      it('enables ocw.chat_send when in enabledTools', () => {
        const config = { ...baseConfig, enabledTools: ['ocw.chat_send'] };
        expect(isToolEnabled('ocw.chat_send', config)).toBe(true);
      });

      it('disables optional tool not in enabledTools when whitelist is set', () => {
        const config = { ...baseConfig, enabledTools: ['ocw.move_to'] };
        expect(isToolEnabled('ocw.interact', config)).toBe(false);
        expect(isToolEnabled('ocw.chat_send', config)).toBe(false);
      });

      it('enables multiple optional tools when all in enabledTools', () => {
        const config = {
          ...baseConfig,
          enabledTools: ['ocw.move_to', 'ocw.interact', 'ocw.chat_send'],
        };
        expect(isToolEnabled('ocw.move_to', config)).toBe(true);
        expect(isToolEnabled('ocw.interact', config)).toBe(true);
        expect(isToolEnabled('ocw.chat_send', config)).toBe(true);
      });
    });

    describe('Denylist Precedence', () => {
      it('denies ocw.move_to when in deniedTools', () => {
        const config = {
          ...baseConfig,
          enabledTools: ['ocw.move_to'],
          deniedTools: ['ocw.move_to'],
        };
        expect(isToolEnabled('ocw.move_to', config)).toBe(false);
      });

      it('denies ocw.interact when in deniedTools', () => {
        const config = {
          ...baseConfig,
          enabledTools: ['ocw.interact'],
          deniedTools: ['ocw.interact'],
        };
        expect(isToolEnabled('ocw.interact', config)).toBe(false);
      });

      it('denies ocw.chat_send when in deniedTools', () => {
        const config = {
          ...baseConfig,
          enabledTools: ['ocw.chat_send'],
          deniedTools: ['ocw.chat_send'],
        };
        expect(isToolEnabled('ocw.chat_send', config)).toBe(false);
      });

      it('deniedTools takes precedence over enabledTools', () => {
        const config = {
          ...baseConfig,
          enabledTools: ['ocw.move_to', 'ocw.interact'],
          deniedTools: ['ocw.move_to'],
        };
        expect(isToolEnabled('ocw.move_to', config)).toBe(false);
        expect(isToolEnabled('ocw.interact', config)).toBe(true);
      });
    });
  });

  describe('createForbiddenError function', () => {
    it('returns forbidden error with correct structure', () => {
      const result = createForbiddenError('ocw.move_to');

      expect(result.status).toBe('error');
      expect(result.error.code).toBe('forbidden');
      expect(result.error.message).toContain('ocw.move_to');
      expect(result.error.message).toContain('enabledTools');
      expect(result.error.message).toContain('deniedTools');
      expect(result.error.retryable).toBe(false);
    });

    it('returns unique messages for different tools', () => {
      const moveToError = createForbiddenError('ocw.move_to');
      const interactError = createForbiddenError('ocw.interact');

      expect(moveToError.error.message).toContain('ocw.move_to');
      expect(interactError.error.message).toContain('ocw.interact');
      expect(moveToError.error.message).not.toBe(interactError.error.message);
    });
  });

  describe('Tool Constants', () => {
    it('REQUIRED_TOOLS contains all required tool names', () => {
      expect(REQUIRED_TOOLS).toContain('ocw.status');
      expect(REQUIRED_TOOLS).toContain('ocw.observe');
      expect(REQUIRED_TOOLS).toContain('ocw.poll_events');
      expect(REQUIRED_TOOLS).toHaveLength(3);
    });

    it('OPTIONAL_TOOLS contains all optional tool names', () => {
      expect(OPTIONAL_TOOLS).toContain('ocw.move_to');
      expect(OPTIONAL_TOOLS).toContain('ocw.interact');
      expect(OPTIONAL_TOOLS).toContain('ocw.chat_send');
      expect(OPTIONAL_TOOLS).toHaveLength(3);
    });

    it('no overlap between REQUIRED_TOOLS and OPTIONAL_TOOLS', () => {
      const overlap = REQUIRED_TOOLS.filter(t =>
        OPTIONAL_TOOLS.includes(t as (typeof OPTIONAL_TOOLS)[number])
      );
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Configuration Validation', () => {
    it('accepts config with enabledTools', () => {
      const config = validateConfig({
        baseUrl: 'http://localhost:8080',
        enabledTools: ['ocw.move_to', 'ocw.chat_send'],
      });

      expect(config.enabledTools).toEqual(['ocw.move_to', 'ocw.chat_send']);
    });

    it('accepts config with deniedTools', () => {
      const config = validateConfig({
        baseUrl: 'http://localhost:8080',
        deniedTools: ['ocw.interact'],
      });

      expect(config.deniedTools).toEqual(['ocw.interact']);
    });

    it('accepts config with both enabledTools and deniedTools', () => {
      const config = validateConfig({
        baseUrl: 'http://localhost:8080',
        enabledTools: ['ocw.move_to', 'ocw.interact'],
        deniedTools: ['ocw.interact'],
      });

      expect(config.enabledTools).toEqual(['ocw.move_to', 'ocw.interact']);
      expect(config.deniedTools).toEqual(['ocw.interact']);
    });

    it('accepts config without tool policy fields', () => {
      const config = validateConfig({
        baseUrl: 'http://localhost:8080',
      });

      expect(config.enabledTools).toBeUndefined();
      expect(config.deniedTools).toBeUndefined();
    });
  });
});
