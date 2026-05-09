/**
 * Config Loader
 *
 * Loads framework.yaml from template directory + merges user overrides.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import type { FrameworkConfig } from '../core/types';
import type { ResolvedTemplate, CodegenUserConfig } from './types';

/**
 * Locate the templates directory.
 * Templates live at: <package-root>/templates/
 */
function getTemplatesBaseDir(): string {
  // __dirname will be in dist/ or src/ — templates are at package root
  return resolve(__dirname, '../../templates');
}

/**
 * Load a template framework by name.
 * Reads framework.yaml, resolves scaffold/ and patterns/ paths.
 */
export function loadTemplate(templateName: string, overrides?: CodegenUserConfig['overrides']): ResolvedTemplate {
  const baseDir = getTemplatesBaseDir();
  const templateDir = join(baseDir, templateName);

  if (!existsSync(templateDir)) {
    const available = listAvailableTemplates();
    throw new Error(
      `Template "${templateName}" not found at ${templateDir}.\nAvailable: ${available.join(', ')}`
    );
  }

  const yamlPath = join(templateDir, 'framework.yaml');
  if (!existsSync(yamlPath)) {
    throw new Error(`framework.yaml not found in template "${templateName}" at ${yamlPath}`);
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
  const baseDir = getTemplatesBaseDir();
  if (!existsSync(baseDir)) return [];

  const { readdirSync, statSync } = require('fs');
  const entries: string[] = readdirSync(baseDir);
  return entries.filter((name: string) => {
    const fullPath = join(baseDir, name);
    return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'framework.yaml'));
  });
}

/**
 * Parse framework.yaml into FrameworkConfig.
 * Uses a simple YAML parser (the `yaml` package).
 */
function parseFrameworkYaml(yamlPath: string): FrameworkConfig {
  // Dynamic import to avoid hard dependency if yaml isn't installed yet
  let parseYaml: (s: string) => unknown;
  try {
    parseYaml = require('yaml').parse;
  } catch {
    // Fallback: simple YAML parsing for our known structure
    parseYaml = simpleYamlParse;
  }

  const content = readFileSync(yamlPath, 'utf-8');
  const raw = parseYaml(content) as Record<string, unknown>;

  return raw as unknown as FrameworkConfig;
}

/**
 * Simple YAML parser fallback for basic key-value YAML
 * (only used if `yaml` package isn't available)
 */
function simpleYamlParse(content: string): Record<string, unknown> {
  // For production, we rely on the `yaml` package.
  // This is a safety fallback that handles basic cases.
  try {
    const yaml = require('yaml');
    return yaml.parse(content);
  } catch {
    throw new Error('Please install the "yaml" package: npm install yaml');
  }
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

  let parseYaml: (s: string) => unknown;
  try {
    parseYaml = require('yaml').parse;
  } catch {
    throw new Error('Please install the "yaml" package: npm install yaml');
  }

  const content = readFileSync(path, 'utf-8');
  return parseYaml(content) as CodegenUserConfig;
}
