/**
 * Config Loader
 *
 * Loads framework.yaml from template packages + merges user overrides.
 * Templates are now independent packages (e.g. @globallink/codegen-template-react).
 *
 * Discovery strategy:
 * 1. Resolve template package directory via require.resolve (finds package.json)
 * 2. Read framework.yaml from the package root
 * 3. Use convention-based paths for scaffold/, patterns/, splitting/
 */

import { createRequire } from 'module';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { parse as parseYaml } from 'yaml';
import type { FrameworkConfig } from '../core/types';
import type { ResolvedTemplate, CodegenUserConfig } from './types';

// ═══════════════════════════════════════════════════════════════
// Template Meta Interface
// ═══════════════════════════════════════════════════════════════

export interface TemplateMeta {
  name: string;
  description: string;
  adapter: string;
  frameworkYamlPath: string;
  scaffoldDir: string;
  patternsDir: string;
  splittingDir: string;
}

// ═══════════════════════════════════════════════════════════════
// Template name → package name mapping
// ═══════════════════════════════════════════════════════════════

const templatePackageMap: Record<string, string> = {
  'react-feature-modular': '@globallink/codegen-template-react',
  'react': '@globallink/codegen-template-react',
};

/**
 * Resolve a template package directory from its package name.
 * Uses require.resolve to find the package.json, then extracts the directory.
 */
function resolveTemplatePackageDir(packageName: string): string {
  const req = createRequire(import.meta.url);
  // Resolve the package.json to find the package root
  const pkgJsonPath = req.resolve(`${packageName}/package.json`);
  return dirname(pkgJsonPath);
}

/**
 * Load a template framework by name.
 * Resolves the template package directory and reads framework.yaml + paths.
 */
export function loadTemplate(templateName: string, overrides?: CodegenUserConfig['overrides']): ResolvedTemplate {
  const packageName = templatePackageMap[templateName]
    || `@globallink/codegen-template-${templateName}`;

  let templateDir: string;
  try {
    templateDir = resolveTemplatePackageDir(packageName);
  } catch (err: unknown) {
    const available = listAvailableTemplates();
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Template "${templateName}" not found (tried package "${packageName}").\n` +
      `Error: ${message}\n` +
      `Available templates: ${available.join(', ')}`
    );
  }

  const yamlPath = join(templateDir, 'framework.yaml');
  if (!existsSync(yamlPath)) {
    throw new Error(`framework.yaml not found for template "${templateName}" at ${yamlPath}`);
  }

  const config = parseFrameworkYaml(yamlPath);

  // Apply user overrides
  if (overrides) {
    if (overrides.splitting) {
      Object.assign(config.splitting, overrides.splitting);
      if (overrides.splitting.component) {
        Object.assign(config.splitting.component, overrides.splitting.component);
      }
      if (overrides.splitting.hook) {
        Object.assign(config.splitting.hook, overrides.splitting.hook);
      }
    }
    if (overrides.codeStyle) {
      for (const [key, val] of Object.entries(overrides.codeStyle)) {
        if (val && typeof val === 'object') {
          Object.assign((config.codeStyle as unknown as Record<string, unknown>)[key] || {}, val);
        }
      }
    }
    if (overrides.fileOrganization) {
      for (const [key, val] of Object.entries(overrides.fileOrganization)) {
        if (val && typeof val === 'object') {
          Object.assign((config.fileOrganization as unknown as Record<string, unknown>)[key] || {}, val);
        }
      }
    }
  }

  return {
    config,
    scaffoldDir: join(templateDir, 'scaffold'),
    patternsDir: join(templateDir, 'patterns'),
    templateDir,
  };
}

/**
 * List all available template framework names.
 */
export function listAvailableTemplates(): string[] {
  return Object.keys(templatePackageMap);
}

/**
 * Parse framework.yaml into FrameworkConfig.
 */
function parseFrameworkYaml(yamlPath: string): FrameworkConfig {
  const content = readFileSync(yamlPath, 'utf-8');
  const raw = parseYaml(content) as Record<string, unknown>;
  return raw as unknown as FrameworkConfig;
}

/**
 * Deep merge utility (source overrides target for defined values)
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const srcVal = source[key];
    if (srcVal === undefined) continue;

    if (
      typeof srcVal === 'object' && srcVal !== null && !Array.isArray(srcVal) &&
      typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(
        result[key] as Record<string, unknown>,
        srcVal as Record<string, unknown>
      ) as T[keyof T];
    } else {
      result[key] = srcVal as T[keyof T];
    }
  }
  return result;
}

/**
 * Load user config file (codegen.config.yaml) if it exists.
 */
export function loadUserConfig(configPath?: string): CodegenUserConfig | null {
  const path = configPath || resolve(process.cwd(), 'codegen.config.yaml');
  if (!existsSync(path)) return null;

  const content = readFileSync(path, 'utf-8');
  return parseYaml(content) as CodegenUserConfig;
}

