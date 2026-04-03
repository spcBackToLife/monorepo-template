import type { ComponentNode } from './node';
import type { ComponentPropDefinition, PropBinding } from './props';

/** Scope determines where a component template is available */
export type TemplateScope = 'project' | 'team' | 'global';

/** Two-layer asset model: skeleton (structure only) or styled (complete visual) */
export type TemplateKind = 'skeleton' | 'styled';

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
  /** Two-layer kind: skeleton (structure + behavior) vs styled (complete visual) */
  kind: TemplateKind;
  /** Standardized prop interface definitions */
  propDefinitions: ComponentPropDefinition[];
  /** Maps prop keys to internal node fields */
  propBindings: PropBinding[];
  /** Template version (monotonically increasing) */
  version: number;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}
