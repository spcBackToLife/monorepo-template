import type { CSSProperties } from '../types/css';
import type { PrimitiveNodeType } from '../types/node';

// ===== Categories =====

export type PrimitiveCategory = 'layout' | 'text' | 'form' | 'media' | 'list' | 'navigation' | 'annotation';

/** Descriptor for a registered primitive element */
export interface PrimitiveDescriptor {
  /** The HTML tag / node type */
  type: PrimitiveNodeType;
  /** Display name in the UI */
  label: string;
  /** Category for grouping in the element panel */
  category: PrimitiveCategory;
  /** Default CSS styles applied on creation */
  defaultStyles: CSSProperties;
  /** Allowed prop keys for this element (e.g., src for img) */
  allowedProps: string[];
  /** Short description for tooltips */
  description: string;
}

// ===== Registry =====

const PRIMITIVES: PrimitiveDescriptor[] = [
  // — Layout —
  {
    type: 'div',
    label: 'Container',
    category: 'layout',
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      minHeight: '40px',
      minWidth: '40px',
    },
    allowedProps: [],
    description: 'Generic flex container',
  },
  {
    type: 'section',
    label: 'Section',
    category: 'layout',
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      width: '100%',
    },
    allowedProps: [],
    description: 'Section container',
  },
  {
    type: 'main',
    label: 'Main',
    category: 'layout',
    defaultStyles: {
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      width: '100%',
    },
    allowedProps: [],
    description: 'Main content area',
  },
  {
    type: 'header',
    label: 'Header',
    category: 'layout',
    defaultStyles: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      width: '100%',
    },
    allowedProps: [],
    description: 'Header section',
  },
  {
    type: 'footer',
    label: 'Footer',
    category: 'layout',
    defaultStyles: {
      display: 'flex',
      alignItems: 'center',
      padding: '12px 16px',
      width: '100%',
    },
    allowedProps: [],
    description: 'Footer section',
  },

  // — Text —
  {
    type: 'h1',
    label: 'Heading 1',
    category: 'text',
    defaultStyles: {
      fontSize: '32px',
      fontWeight: 700,
      lineHeight: 1.2,
      margin: 0,
      width: 'fit-content',
    },
    allowedProps: [],
    description: 'Large heading',
  },
  {
    type: 'h2',
    label: 'Heading 2',
    category: 'text',
    defaultStyles: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.3,
      margin: 0,
      width: 'fit-content',
    },
    allowedProps: [],
    description: 'Medium heading',
  },
  {
    type: 'h3',
    label: 'Heading 3',
    category: 'text',
    defaultStyles: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.4,
      margin: 0,
      width: 'fit-content',
    },
    allowedProps: [],
    description: 'Small heading',
  },
  {
    type: 'p',
    label: 'Paragraph',
    category: 'text',
    defaultStyles: {
      fontSize: '14px',
      lineHeight: 1.5,
      margin: 0,
      width: 'fit-content',
    },
    allowedProps: [],
    description: 'Paragraph text',
  },
  {
    type: 'span',
    label: 'Text',
    category: 'text',
    defaultStyles: {
      fontSize: '14px',
      width: 'fit-content',
    },
    allowedProps: [],
    description: 'Inline text',
  },
  {
    type: 'a',
    label: 'Link',
    category: 'text',
    defaultStyles: {
      fontSize: '14px',
      color: '#1677ff',
      textDecoration: 'none',
      cursor: 'pointer',
      width: 'fit-content',
    },
    allowedProps: ['href', 'target', 'rel'],
    description: 'Hyperlink',
  },

  // — Form —
  {
    type: 'button',
    label: 'Button',
    category: 'form',
    defaultStyles: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 500,
      borderRadius: '6px',
      border: '1px solid #d9d9d9',
      backgroundColor: '#ffffff',
      cursor: 'pointer',
      minHeight: '32px',
    },
    allowedProps: ['disabled', 'type'],
    description: 'Clickable button',
  },
  {
    type: 'input',
    label: 'Input',
    category: 'form',
    defaultStyles: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      width: '100%',
      minHeight: '32px',
      boxSizing: 'border-box',
    },
    allowedProps: ['placeholder', 'type', 'value', 'disabled', 'maxLength', 'pattern'],
    description: 'Text input field',
  },
  {
    type: 'textarea',
    label: 'Text Area',
    category: 'form',
    defaultStyles: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      width: '100%',
      minHeight: '80px',
      resize: 'vertical',
      boxSizing: 'border-box',
    },
    allowedProps: ['placeholder', 'rows', 'disabled', 'maxLength'],
    description: 'Multi-line text area',
  },
  {
    type: 'select',
    label: 'Select',
    category: 'form',
    defaultStyles: {
      padding: '8px 12px',
      fontSize: '14px',
      border: '1px solid #d9d9d9',
      borderRadius: '6px',
      width: '100%',
      minHeight: '32px',
      boxSizing: 'border-box',
    },
    allowedProps: ['disabled', 'multiple'],
    description: 'Dropdown select',
  },

  // — Media —
  {
    type: 'img',
    label: 'Image',
    category: 'media',
    defaultStyles: {
      maxWidth: '100%',
      height: 'auto',
      objectFit: 'cover',
    },
    allowedProps: ['src', 'alt', 'width', 'height', 'loading'],
    description: 'Image element',
  },

  // — List —
  {
    type: 'ul',
    label: 'Unordered List',
    category: 'list',
    defaultStyles: {
      margin: 0,
      padding: '0 0 0 20px',
      listStyle: 'disc',
    },
    allowedProps: [],
    description: 'Bulleted list',
  },
  {
    type: 'ol',
    label: 'Ordered List',
    category: 'list',
    defaultStyles: {
      margin: 0,
      padding: '0 0 0 20px',
      listStyle: 'decimal',
    },
    allowedProps: [],
    description: 'Numbered list',
  },
  {
    type: 'li',
    label: 'List Item',
    category: 'list',
    defaultStyles: {
      fontSize: '14px',
      lineHeight: 1.5,
    },
    allowedProps: [],
    description: 'List item',
  },

  // — Navigation —
  {
    type: 'nav',
    label: 'Navigation',
    category: 'navigation',
    defaultStyles: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    allowedProps: [],
    description: 'Navigation container',
  },

  // — Annotation —
  {
    type: 'annotation',
    label: 'Annotation',
    category: 'annotation',
    defaultStyles: {
      position: 'absolute',
      border: '2px dashed #faad14',
      backgroundColor: 'rgba(250, 173, 20, 0.08)',
      borderRadius: '4px',
      padding: '8px',
      fontSize: '12px',
      color: '#faad14',
      pointerEvents: 'none',
    },
    allowedProps: ['content', 'author'],
    description: 'Design annotation / comment marker',
  },
];

// ===== Lookup maps (built once) =====

const _byType = new Map<PrimitiveNodeType, PrimitiveDescriptor>();
const _byCategory = new Map<PrimitiveCategory, PrimitiveDescriptor[]>();

for (const p of PRIMITIVES) {
  _byType.set(p.type, p);
  const list = _byCategory.get(p.category) ?? [];
  list.push(p);
  _byCategory.set(p.category, list);
}

// ===== Public API =====

/** Get all registered primitive descriptors */
export function getAllPrimitives(): PrimitiveDescriptor[] {
  return PRIMITIVES;
}

/** Get a primitive descriptor by its node type */
export function getPrimitive(type: PrimitiveNodeType): PrimitiveDescriptor | undefined {
  return _byType.get(type);
}

/** Get all primitives in a given category */
export function getPrimitivesByCategory(category: PrimitiveCategory): PrimitiveDescriptor[] {
  return _byCategory.get(category) ?? [];
}

/** Get all available categories */
export function getPrimitiveCategories(): PrimitiveCategory[] {
  return [..._byCategory.keys()];
}

/** Check if a string is a valid primitive node type */
export function isPrimitiveType(type: string): type is PrimitiveNodeType {
  return _byType.has(type as PrimitiveNodeType);
}

/** Check if a string is a component instance type (starts with "component:") */
export function isComponentInstanceType(type: string): boolean {
  return type.startsWith('component:');
}

/** Get default styles for a primitive type */
export function getDefaultStyles(type: PrimitiveNodeType): CSSProperties {
  return { ...(getPrimitive(type)?.defaultStyles ?? {}) };
}

/** Get allowed props for a primitive type */
export function getAllowedProps(type: PrimitiveNodeType): string[] {
  return getPrimitive(type)?.allowedProps ?? [];
}
