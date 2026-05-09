// ═══════════════════════════════════════════════════════════════════════════════
// Naming Utilities
// Convert between naming conventions (PascalCase, camelCase, kebab-case).
// ═══════════════════════════════════════════════════════════════════════════════

import type { NodeIR } from '../core/types';

/**
 * Split a string into word tokens.
 * Handles: kebab-case, snake_case, camelCase, PascalCase, spaces, and misc punctuation.
 */
function tokenize(s: string): string[] {
  // Replace common separators with space
  const normalized = s
    .replace(/[-_./\\]+/g, ' ')
    // Insert space before uppercase letters that follow lowercase (camelCase boundary)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    // Insert space between consecutive uppercase and the rest (e.g., "HTMLParser" → "HTML Parser")
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

  // Split on whitespace and filter out non-alphanumeric tokens
  return normalized
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((t) => t.length > 0);
}

/**
 * Convert a string to PascalCase.
 * "chat-list" → "ChatList"
 * "Chat - AI Conversation" → "ChatAIConversation"
 * "my_cool_component" → "MyCoolComponent"
 */
export function toPascalCase(s: string): string {
  const tokens = tokenize(s);
  if (tokens.length === 0) return '';
  return tokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join('');
}

/**
 * Convert a string to camelCase.
 * "chat-list" → "chatList"
 * "Chat - AI Conversation" → "chatAIConversation"
 */
export function toCamelCase(s: string): string {
  const pascal = toPascalCase(s);
  if (pascal.length === 0) return '';
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert a string to kebab-case.
 * "ChatAIConversation" → "chat-ai-conversation"
 * "chat list" → "chat-list"
 */
export function toKebabCase(s: string): string {
  const tokens = tokenize(s);
  if (tokens.length === 0) return '';
  return tokens.map((t) => t.toLowerCase()).join('-');
}

/**
 * Infer a "domain" from a data source name.
 * Takes the first segment before any separator.
 * "chat-list" → "chat"
 * "user-profile-update" → "user"
 * "messages" → "messages"
 */
export function inferDomain(name: string): string {
  const tokens = tokenize(name);
  if (tokens.length === 0) return 'common';
  return tokens[0].toLowerCase();
}

/**
 * Count total descendants of a NodeIR recursively.
 */
export function countDescendants(node: NodeIR): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countDescendants(child);
  }
  // Also count repeat template descendants if present
  if (node.repeat) {
    count += 1 + countDescendants(node.repeat.template);
  }
  return count;
}
