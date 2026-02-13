import { describe, it, expect, beforeEach } from 'vitest';
import {
  ValidationResult,
  ValidationSeverity,
  ValidationErrorCode,
} from '../../packages/server/src/world/WorldPackLoader.js';

describe('Validation Severity System', () => {
  let validationResult: ValidationResult;

  beforeEach(() => {
    validationResult = new ValidationResult();
  });

  describe('ValidationResult', () => {
    it('should start with no errors or warnings', () => {
      expect(validationResult.hasErrors()).toBe(false);
      expect(validationResult.hasWarnings()).toBe(false);
      expect(validationResult.getAllIssues()).toHaveLength(0);
    });

    it('should track errors separately from warnings', () => {
      validationResult.addError(
        ValidationErrorCode.ZONE_MISMATCH,
        'Zone mismatch',
        'NPC zone mismatch detected'
      );
      validationResult.addWarning(
        ValidationErrorCode.HIGH_BLOCK_PERCENTAGE,
        'High block percentage',
        'Zone has 85% blocked tiles'
      );

      expect(validationResult.hasErrors()).toBe(true);
      expect(validationResult.hasWarnings()).toBe(true);
      expect(validationResult.getErrors()).toHaveLength(1);
      expect(validationResult.getWarnings()).toHaveLength(1);
      expect(validationResult.getAllIssues()).toHaveLength(2);
    });

    it('should store error details correctly', () => {
      const context = { zoneId: 'lobby', npcId: 'test-npc' };
      validationResult.addError(
        ValidationErrorCode.ZONE_MISMATCH,
        'Zone mismatch',
        'NPC test-npc zone mismatch',
        context
      );

      const errors = validationResult.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].severity).toBe(ValidationSeverity.ERROR);
      expect(errors[0].code).toBe(ValidationErrorCode.ZONE_MISMATCH);
      expect(errors[0].message).toBe('Zone mismatch');
      expect(errors[0].detail).toBe('NPC test-npc zone mismatch');
      expect(errors[0].context).toEqual(context);
    });

    it('should store warning details correctly', () => {
      const context = { zone: 'lake', blockPercentage: 100 };
      validationResult.addWarning(
        ValidationErrorCode.HIGH_BLOCK_PERCENTAGE,
        'High block percentage',
        'Zone lake has 100% blocked tiles',
        context
      );

      const warnings = validationResult.getWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].severity).toBe(ValidationSeverity.WARN);
      expect(warnings[0].code).toBe(ValidationErrorCode.HIGH_BLOCK_PERCENTAGE);
      expect(warnings[0].message).toBe('High block percentage');
      expect(warnings[0].context).toEqual(context);
    });

    it('should accumulate multiple errors', () => {
      validationResult.addError(
        ValidationErrorCode.ZONE_MISMATCH,
        'Zone mismatch 1',
        'First mismatch'
      );
      validationResult.addError(
        ValidationErrorCode.UNKNOWN_NPC_REFERENCE,
        'Unknown NPC',
        'Second error'
      );
      validationResult.addError(ValidationErrorCode.INVALID_ZONE_ID, 'Invalid zone', 'Third error');

      expect(validationResult.getErrors()).toHaveLength(3);
    });

    it('should accumulate multiple warnings', () => {
      validationResult.addWarning(
        ValidationErrorCode.HIGH_BLOCK_PERCENTAGE,
        'High block 1',
        'First warning'
      );
      validationResult.addWarning(
        ValidationErrorCode.MIXED_ENTRANCE_TILES,
        'Mixed tiles',
        'Second warning'
      );
      validationResult.addWarning(
        ValidationErrorCode.MISSING_OPTIONAL_FIELD,
        'Missing field',
        'Third warning'
      );

      expect(validationResult.getWarnings()).toHaveLength(3);
    });
  });

  describe('ValidationSeverity', () => {
    it('should have ERROR severity', () => {
      expect(ValidationSeverity.ERROR).toBe('ERROR');
    });

    it('should have WARN severity', () => {
      expect(ValidationSeverity.WARN).toBe('WARN');
    });
  });

  describe('ValidationErrorCode', () => {
    it('should define ERROR-level codes', () => {
      expect(ValidationErrorCode.ZONE_MISMATCH).toBeDefined();
      expect(ValidationErrorCode.UNKNOWN_NPC_REFERENCE).toBeDefined();
      expect(ValidationErrorCode.UNKNOWN_FACILITY_REFERENCE).toBeDefined();
      expect(ValidationErrorCode.INVALID_ZONE_ID).toBeDefined();
      expect(ValidationErrorCode.INVALID_ENTRANCE_CONTRACT).toBeDefined();
      expect(ValidationErrorCode.FACILITY_ZONE_CONFLICT).toBeDefined();
    });

    it('should define WARN-level codes', () => {
      expect(ValidationErrorCode.HIGH_BLOCK_PERCENTAGE).toBeDefined();
      expect(ValidationErrorCode.MIXED_ENTRANCE_TILES).toBeDefined();
      expect(ValidationErrorCode.MISSING_OPTIONAL_FIELD).toBeDefined();
      expect(ValidationErrorCode.NPC_ZONE_NOT_MAPPED).toBeDefined();
    });
  });

  describe('Error/Warn Classification', () => {
    it('should classify zone mismatch as ERROR', () => {
      validationResult.addError(ValidationErrorCode.ZONE_MISMATCH, 'Zone mismatch', 'Test');
      const error = validationResult.getErrors()[0];
      expect(error.severity).toBe(ValidationSeverity.ERROR);
      expect(error.code).toBe(ValidationErrorCode.ZONE_MISMATCH);
    });

    it('should classify unknown NPC reference as ERROR', () => {
      validationResult.addError(ValidationErrorCode.UNKNOWN_NPC_REFERENCE, 'Unknown NPC', 'Test');
      const error = validationResult.getErrors()[0];
      expect(error.severity).toBe(ValidationSeverity.ERROR);
      expect(error.code).toBe(ValidationErrorCode.UNKNOWN_NPC_REFERENCE);
    });

    it('should classify high block percentage as WARN', () => {
      validationResult.addWarning(ValidationErrorCode.HIGH_BLOCK_PERCENTAGE, 'High block', 'Test');
      const warning = validationResult.getWarnings()[0];
      expect(warning.severity).toBe(ValidationSeverity.WARN);
      expect(warning.code).toBe(ValidationErrorCode.HIGH_BLOCK_PERCENTAGE);
    });

    it('should classify mixed entrance tiles as WARN', () => {
      validationResult.addWarning(ValidationErrorCode.MIXED_ENTRANCE_TILES, 'Mixed tiles', 'Test');
      const warning = validationResult.getWarnings()[0];
      expect(warning.severity).toBe(ValidationSeverity.WARN);
      expect(warning.code).toBe(ValidationErrorCode.MIXED_ENTRANCE_TILES);
    });
  });

  describe('ValidationIssue Structure', () => {
    it('should have required fields', () => {
      validationResult.addError(ValidationErrorCode.ZONE_MISMATCH, 'Message', 'Detail');
      const issue = validationResult.getErrors()[0];

      expect(issue).toHaveProperty('severity');
      expect(issue).toHaveProperty('code');
      expect(issue).toHaveProperty('message');
      expect(issue).toHaveProperty('detail');
      expect(issue).toHaveProperty('context');
    });

    it('should allow optional context', () => {
      validationResult.addError(ValidationErrorCode.ZONE_MISMATCH, 'Message', 'Detail');
      const issue = validationResult.getErrors()[0];
      expect(issue.context).toBeUndefined();
    });

    it('should include context when provided', () => {
      const context = { zoneId: 'test', count: 5 };
      validationResult.addError(ValidationErrorCode.ZONE_MISMATCH, 'Message', 'Detail', context);
      const issue = validationResult.getErrors()[0];
      expect(issue.context).toEqual(context);
    });
  });
});
