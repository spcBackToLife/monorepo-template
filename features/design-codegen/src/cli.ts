#!/usr/bin/env node
/**
 * CLI Entry Point
 *
 * npx @globallink/design-codegen generate --input schema.json --output ./my-app
 * npx @globallink/design-codegen generate --project-id <id> --output ./my-app
 * npx @globallink/design-codegen frameworks
 */

import { resolve } from 'path';
import { generate, listAvailableTemplates } from './pipeline';
import type { GenerateInput } from './config/types';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'generate':
      await handleGenerate(args.slice(1));
      break;
    case 'frameworks':
    case 'templates':
      handleListTemplates();
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

async function handleGenerate(args: string[]) {
  const options = parseArgs(args);

  if (!options.output) {
    console.error('Error: --output is required');
    process.exit(1);
  }

  if (!options.input && !options.projectId) {
    console.error('Error: either --input or --project-id is required');
    process.exit(1);
  }

  const input: GenerateInput = {
    schemaSource: options.input
      ? { type: 'file', path: resolve(options.input) }
      : { type: 'api', projectId: options.projectId!, apiBase: options.apiBase || 'http://localhost:3000/api' },
    outputDir: resolve(options.output),
    templateName: options.template || 'react-feature-modular',
    projectName: options.name,
  };

  console.log(`\n🚀 Design Codegen`);
  console.log(`   Template: ${input.templateName}`);
  console.log(`   Output:   ${input.outputDir}`);
  console.log(`   Source:   ${input.schemaSource.type === 'file' ? input.schemaSource.path : `API (${input.schemaSource.projectId})`}`);
  console.log('');

  try {
    const result = await generate(input);
    console.log(`✅ Generated ${result.fileCount} files → ${result.outputDir}`);
    console.log('');
    console.log('Files:');
    for (const file of result.files) {
      console.log(`  ${file}`);
    }
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${result.outputDir}`);
    console.log('  npm install');
    console.log('  npm run dev');
  } catch (err) {
    console.error(`\n❌ Error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function handleListTemplates() {
  const templates = listAvailableTemplates();
  console.log('\nAvailable template frameworks:');
  for (const name of templates) {
    console.log(`  - ${name}`);
  }
  console.log('');
}

function printHelp() {
  console.log(`
Usage: design-codegen <command> [options]

Commands:
  generate      Generate code from Schema
  frameworks    List available template frameworks
  help          Show this help message

Generate options:
  --input <path>        Path to Schema JSON file
  --project-id <id>    Project ID (fetch from API)
  --output <dir>        Output directory (required)
  --template <name>     Template framework name (default: react-feature-modular)
  --name <name>         Project name (default: from schema)
  --api-base <url>      API base URL (default: http://localhost:3000/api)

Examples:
  design-codegen generate --input schema.json --output ./my-app
  design-codegen generate --project-id abc123 --output ./my-app --template react-feature-modular
  design-codegen frameworks
`);
}

function parseArgs(args: string[]): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      } else {
        result[key] = 'true';
      }
    }
  }
  return result;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
