/** Style property group definition */
export interface StyleGroup {
  label: string;
  key: string;
  properties: { key: string; label: string; type: 'text' | 'number' | 'color' | 'select'; options?: string[] }[];
}

export const STYLE_GROUPS: StyleGroup[] = [
  {
    label: '布局',
    key: 'layout',
    properties: [
      { key: 'display', label: 'Display', type: 'select', options: ['flex', 'block', 'inline-flex', 'inline', 'grid', 'none'] },
      { key: 'flexDirection', label: 'Flex方向', type: 'select', options: ['row', 'column', 'row-reverse', 'column-reverse'] },
      { key: 'justifyContent', label: '主轴对齐', type: 'select', options: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
      { key: 'alignItems', label: '交叉轴对齐', type: 'select', options: ['flex-start', 'center', 'flex-end', 'stretch', 'baseline'] },
      { key: 'gap', label: 'Gap', type: 'text' },
      { key: 'position', label: 'Position', type: 'select', options: ['static', 'relative', 'absolute', 'fixed'] },
      { key: 'left', label: 'Left', type: 'text' },
      { key: 'top', label: 'Top', type: 'text' },
      { key: 'right', label: 'Right', type: 'text' },
      { key: 'bottom', label: 'Bottom', type: 'text' },
    ],
  },
  {
    label: '尺寸',
    key: 'sizing',
    properties: [
      { key: 'width', label: '宽度', type: 'text' },
      { key: 'height', label: '高度', type: 'text' },
      { key: 'minWidth', label: '最小宽度', type: 'text' },
      { key: 'maxWidth', label: '最大宽度', type: 'text' },
      { key: 'padding', label: 'Padding', type: 'text' },
      { key: 'margin', label: 'Margin', type: 'text' },
    ],
  },
  {
    label: '颜色',
    key: 'color',
    properties: [
      { key: 'backgroundColor', label: '背景色', type: 'color' },
      { key: 'color', label: '文字色', type: 'color' },
      { key: 'opacity', label: '透明度', type: 'text' },
    ],
  },
  {
    label: '字体',
    key: 'typography',
    properties: [
      { key: 'fontSize', label: '字号', type: 'text' },
      { key: 'fontWeight', label: '字重', type: 'select', options: ['400', '500', '600', '700'] },
      { key: 'lineHeight', label: '行高', type: 'text' },
      { key: 'textAlign', label: '对齐', type: 'select', options: ['left', 'center', 'right', 'justify'] },
    ],
  },
  {
    label: '边框',
    key: 'border',
    properties: [
      { key: 'border', label: 'Border', type: 'text' },
      { key: 'borderRadius', label: '圆角', type: 'text' },
      { key: 'boxShadow', label: '阴影', type: 'text' },
    ],
  },
];
