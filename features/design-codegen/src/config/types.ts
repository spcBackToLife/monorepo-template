/**
 * Config Types
 *
 * Types for the user-facing codegen.config.yaml and the loaded framework config.
 */

import type { FrameworkConfig, SplittingRules, CodeStyle, FileOrganization } from '../core/types';

/** User's codegen.config.yaml */
export interface CodegenUserConfig {
  /** Template framework name (maps to templates/{name}/) */
  template: string;

  /** Output directory */
  output: string;

  /** Override framework rules */
  overrides?: {
    splitting?: Partial<SplittingRules>;
    codeStyle?: Partial<CodeStyle>;
    fileOrganization?: Partial<FileOrganization>;
  };
}

/** Resolved template — config + paths to scaffold & patterns directories */
export interface ResolvedTemplate {
  config: FrameworkConfig;
  scaffoldDir: string;
  patternsDir: string;
  templateDir: string;
}

/** Generate command input */
export interface GenerateInput {
  /** Schema source: file path or project ID */
  schemaSource: { type: 'file'; path: string } | { type: 'api'; projectId: string; apiBase: string };

  /** Output directory */
  outputDir: string;

  /** Template framework name */
  templateName: string;

  /** Project name (for package.json, etc.) */
  projectName?: string;

  /** User config overrides */
  overrides?: CodegenUserConfig['overrides'];
}

/** Generate command output */
export interface GenerateOutput {
  outputDir: string;
  fileCount: number;
  files: string[];
}
