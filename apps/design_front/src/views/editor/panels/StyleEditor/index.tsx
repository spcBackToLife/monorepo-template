import { Input, Select, Collapse, Empty, ColorPicker } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import { STYLE_GROUPS, type StyleGroup } from './styleGroups';
import type { StyleOverrides } from '@/types/editor';
import './styleEditor.css';

const PIXEL_DEFAULT_KEYS = new Set([
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'top',
  'right',
  'bottom',
  'left',
  'gap',
  'fontSize',
  'lineHeight',
  'borderRadius',
  'borderWidth',
]);

function normalizeStyleInput(key: string, raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (!PIXEL_DEFAULT_KEYS.has(key)) return value;
  if (/^-?\d+(\.\d+)?$/.test(value)) return `${value}px`;
  return value;
}

export const StyleEditorPanel = observer(function StyleEditorPanel() {
  const nodeId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;

  if (!nodeId) {
    return <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const node = findNodeInScreens(screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const styles: StyleOverrides = node.styles;

  const handleChange = (key: string, value: string) => {
    const normalized = normalizeStyleInput(key, value);
    editorStore.execute({
      type: 'updateStyle',
      params: { nodeId, styles: { [key]: normalized || undefined } },
    });
  };

  return (
    <Collapse
      ghost
      size="small"
      defaultActiveKey={STYLE_GROUPS.map((g) => g.key)}
      items={STYLE_GROUPS.map((group) => ({
        key: group.key,
        label: group.label,
        children: <GroupFields group={group} styles={styles} onChange={handleChange} />,
      }))}
    />
  );
});

interface GroupFieldsProps {
  group: StyleGroup;
  styles: StyleOverrides;
  onChange: (key: string, value: string) => void;
}

function GroupFields({ group, styles, onChange }: GroupFieldsProps) {
  return (
    <div className="style-group">
      {group.properties.map((prop) => {
        const value = styles[prop.key];
        const strVal = value !== undefined && value !== null ? String(value) : '';

        return (
          <div className="style-row" key={prop.key}>
            <span className="style-label">{prop.label}</span>
            {prop.type === 'select' ? (
              <Select
                size="small"
                style={{ flex: 1 }}
                value={strVal || undefined}
                allowClear
                onChange={(v) => onChange(prop.key, v ?? '')}
                options={prop.options?.map((o) => ({ label: o, value: o }))}
              />
            ) : prop.type === 'color' ? (
              <ColorPicker
                size="small"
                value={strVal || undefined}
                onChange={(_, hex) => onChange(prop.key, hex)}
              />
            ) : (
              <Input
                key={`${prop.key}:${strVal}`}
                size="small"
                style={{ flex: 1 }}
                defaultValue={strVal}
                placeholder={prop.key}
                onBlur={(e) => onChange(prop.key, e.target.value)}
                onPressEnter={(e) => onChange(prop.key, (e.target as HTMLInputElement).value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
