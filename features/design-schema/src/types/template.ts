import type { ComponentNode } from './node';

/** Scope determines where a component template is available */
export type TemplateScope = 'project' | 'team' | 'global';

/** A reusable component template in the asset library */
export interface ComponentTemplate {
  /** Unique template identifier */
  id: string;
  /** Template name */
  name: string;
  /** Optional description */
  description?: string;
  /** Category for grouping */
  category: string;
  /** Searchable tags */
  tags: string[];
  /** Thumbnail image (base64 or URL) */
  thumbnail?: string;
  /** The component tree schema */
  schema: ComponentNode;
  /** Availability scope */
  scope: TemplateScope;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}
