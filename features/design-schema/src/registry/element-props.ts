import type { PrimitiveNodeType } from '../types/node';
import type { PropType } from '../types/props';

// ===== Element Prop Registry =====

/** Definition of an editable prop for a specific HTML element type */
export interface ElementPropDefinition {
  /** Prop key (maps to HTML attribute or React prop) */
  key: string;
  /** Editor control type */
  type: PropType;
  /** Display label */
  label: string;
  /** Default value */
  defaultValue: unknown;
  /** Description for tooltip */
  description?: string;
  /** Enum values when type is 'enum' */
  enumValues?: string[];
}

/** Registry mapping each primitive element to its editable props */
export type ElementPropRegistry = Partial<Record<PrimitiveNodeType, ElementPropDefinition[]>>;

/** Built-in registry of editable props per HTML element type */
export const ELEMENT_PROP_REGISTRY: ElementPropRegistry = {
  img: [
    { key: 'src', type: 'image', label: '图片地址', defaultValue: '', description: 'Image source URL' },
    { key: 'alt', type: 'string', label: '替代文本', defaultValue: '', description: 'Alternative text for accessibility' },
    { key: 'loading', type: 'enum', label: '加载方式', defaultValue: 'lazy', enumValues: ['lazy', 'eager'], description: 'Loading strategy' },
  ],
  a: [
    { key: 'href', type: 'url', label: '链接地址', defaultValue: '#', description: 'Link URL' },
    { key: 'target', type: 'enum', label: '打开方式', defaultValue: '_self', enumValues: ['_self', '_blank', '_parent', '_top'], description: 'Link target' },
  ],
  input: [
    { key: 'placeholder', type: 'string', label: '占位文字', defaultValue: '', description: 'Placeholder text' },
    { key: 'type', type: 'enum', label: '输入类型', defaultValue: 'text', enumValues: ['text', 'password', 'email', 'number', 'tel', 'url', 'search', 'date', 'time', 'color', 'file', 'hidden', 'checkbox', 'radio'], description: 'Input type' },
    { key: 'disabled', type: 'boolean', label: '禁用', defaultValue: false, description: 'Whether the input is disabled' },
    { key: 'maxLength', type: 'number', label: '最大长度', defaultValue: undefined, description: 'Maximum character length' },
  ],
  textarea: [
    { key: 'placeholder', type: 'string', label: '占位文字', defaultValue: '', description: 'Placeholder text' },
    { key: 'rows', type: 'number', label: '行数', defaultValue: 3, description: 'Number of visible rows' },
    { key: 'disabled', type: 'boolean', label: '禁用', defaultValue: false, description: 'Whether the textarea is disabled' },
    { key: 'maxLength', type: 'number', label: '最大长度', defaultValue: undefined, description: 'Maximum character length' },
  ],
  button: [
    { key: 'disabled', type: 'boolean', label: '禁用', defaultValue: false, description: 'Whether the button is disabled' },
    { key: 'type', type: 'enum', label: '按钮类型', defaultValue: 'button', enumValues: ['button', 'submit', 'reset'], description: 'Button type' },
  ],
  select: [
    { key: 'disabled', type: 'boolean', label: '禁用', defaultValue: false, description: 'Whether the select is disabled' },
    { key: 'multiple', type: 'boolean', label: '多选', defaultValue: false, description: 'Allow multiple selections' },
  ],
};

/** Get editable props for a given element type */
export function getElementProps(type: PrimitiveNodeType): ElementPropDefinition[] {
  return ELEMENT_PROP_REGISTRY[type] ?? [];
}
