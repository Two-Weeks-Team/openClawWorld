/**
 * Unified Command Interface
 * Defines the common structure for CLI command definitions
 */

/**
 * Tool information for documentation
 */
export interface ToolInfo {
  name: string;
  description: string;
  required: boolean;
  sideEffects: 'none' | 'world' | 'chat';
  parameters?: ParameterInfo[];
}

/**
 * Parameter information for tool documentation
 */
export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

/**
 * Unified command definition that can be transformed to any CLI format
 */
export interface UnifiedCommand {
  /** Command name (e.g., "ocw-tools") */
  name: string;
  /** Command description */
  description: string;
  /** List of tool names used by this command */
  tools: string[];
  /** Optional argument hint (e.g., "[--agents=N]") */
  arguments?: string;
  /** Main instruction content in Markdown format */
  instructions: string;
  /** Optional tool details for comprehensive documentation */
  toolDetails?: ToolInfo[];
}

/**
 * CLI adapter configuration
 */
export interface AdapterConfig {
  /** Output directory for generated commands */
  outputDir: string;
  /** File extension (without dot) */
  extension: string;
  /** Whether to include frontmatter */
  includeFrontmatter?: boolean;
}
