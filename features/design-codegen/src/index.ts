import { DESIGN_SCHEMA_VERSION } from '@globallink/design-schema';
import type { Screen, ComponentNode } from '@globallink/design-schema';

export function getCodegenSchemaVersion(): string {
  return DESIGN_SCHEMA_VERSION;
}

export type CodegenTarget = 'react-tsx' | 'react-css-modules' | 'html' | 'vue-sfc';

export interface CodegenResult {
  target: CodegenTarget;
  files: CodegenFile[];
}

export interface CodegenFile {
  path: string;
  content: string;
  language: string;
}

export interface CodegenPlugin {
  target: CodegenTarget;
  generate(screen: Screen): CodegenFile[];
}

const plugins = new Map<CodegenTarget, CodegenPlugin>();

export function registerCodegenPlugin(plugin: CodegenPlugin): void {
  plugins.set(plugin.target, plugin);
}

export function getRegisteredTargets(): CodegenTarget[] {
  return Array.from(plugins.keys());
}

export function generateCode(screen: Screen, target: CodegenTarget): CodegenResult {
  const plugin = plugins.get(target);
  if (plugin) {
    return { target, files: plugin.generate(screen) };
  }

  if (target === 'react-tsx') {
    return { target, files: [generateBuiltinReactTSX(screen)] };
  }
  if (target === 'html') {
    return { target, files: [generateBuiltinHTML(screen)] };
  }

  return { target, files: [{ path: `${screen.name || 'screen'}.txt`, content: `/* ${target}: not yet supported */`, language: 'text' }] };
}

function generateBuiltinReactTSX(screen: Screen): CodegenFile {
  const componentName = toPascalCase(screen.name || 'Screen');
  const lines: string[] = [];
  lines.push(`import React from 'react';`);
  lines.push('');
  lines.push(`export function ${componentName}() {`);
  lines.push(`  return (`);
  lines.push(renderJSXNode(screen.rootNode, 4));
  lines.push(`  );`);
  lines.push(`}`);
  return { path: `${componentName}.tsx`, content: lines.join('\n'), language: 'tsx' };
}

function generateBuiltinHTML(screen: Screen): CodegenFile {
  const lines: string[] = [];
  lines.push('<!DOCTYPE html>');
  lines.push(`<html lang="zh"><head><meta charset="UTF-8"><title>${screen.name || 'Page'}</title>`);
  lines.push('<style>');
  collectCSS(screen.rootNode, lines);
  lines.push('</style></head><body>');
  lines.push(renderHTMLNode(screen.rootNode, 2));
  lines.push('</body></html>');
  return { path: `${screen.name || 'page'}.html`, content: lines.join('\n'), language: 'html' };
}

function renderJSXNode(node: ComponentNode, indent: number): string {
  const pad = ' '.repeat(indent);
  const tag = node.type.startsWith('component:') ? 'div' : node.type;
  if (tag === 'annotation') return '';
  const styles = node.styles as Record<string, string> | undefined;
  const styleAttr = styles && Object.keys(styles).length > 0
    ? ` style={{ ${Object.entries(styles).filter(([, v]) => v).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} }}`
    : '';
  const text = (node.props as Record<string, unknown>)?.textContent;
  const children = (node.children ?? []).filter((c) => c.type !== 'annotation');
  if (children.length === 0 && !text) return `${pad}<${tag}${styleAttr} />`;
  const inner = [
    ...(text ? [`${pad}  ${String(text)}`] : []),
    ...children.map((c) => renderJSXNode(c, indent + 2)).filter(Boolean),
  ];
  return [`${pad}<${tag}${styleAttr}>`, ...inner, `${pad}</${tag}>`].join('\n');
}

function renderHTMLNode(node: ComponentNode, indent: number): string {
  const pad = ' '.repeat(indent);
  const tag = node.type.startsWith('component:') ? 'div' : node.type;
  if (tag === 'annotation') return '';
  const styles = node.styles as Record<string, string> | undefined;
  const styleAttr = styles && Object.keys(styles).length > 0
    ? ` style="${Object.entries(styles).filter(([, v]) => v).map(([k, v]) => `${camelToKebab(k)}: ${v}`).join('; ')}"`
    : '';
  const text = (node.props as Record<string, unknown>)?.textContent;
  const children = (node.children ?? []).filter((c) => c.type !== 'annotation');
  if (children.length === 0 && !text) return `${pad}<${tag} id="${node.id}"${styleAttr}></${tag}>`;
  const inner = [
    ...(text ? [`${pad}  ${String(text)}`] : []),
    ...children.map((c) => renderHTMLNode(c, indent + 2)).filter(Boolean),
  ];
  return [`${pad}<${tag} id="${node.id}"${styleAttr}>`, ...inner, `${pad}</${tag}>`].join('\n');
}

function collectCSS(node: ComponentNode, out: string[]): void {
  const styles = node.styles as Record<string, string> | undefined;
  if (styles && Object.keys(styles).length > 0) {
    const props = Object.entries(styles).filter(([, v]) => v).map(([k, v]) => `  ${camelToKebab(k)}: ${v};`).join('\n');
    out.push(`#${node.id} {\n${props}\n}`);
  }
  for (const c of node.children ?? []) collectCSS(c, out);
}

function toPascalCase(s: string): string {
  return s.replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase()).replace(/^./, (c) => c.toUpperCase()) || 'Component';
}

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}
