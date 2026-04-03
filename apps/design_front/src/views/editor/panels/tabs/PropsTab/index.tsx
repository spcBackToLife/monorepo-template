import { useState, useMemo, useRef, type ReactNode } from 'react';
import { Empty, Switch } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';
import {
  getElementProps,
  getAllPrimitives,
  isComponentInstanceType,
  type ComponentPropDefinition,
  type PrimitiveNodeType,
} from '@globallink/design-schema';
import { resolveAssetUrl } from '@globallink/design-engine';
import { API_BASE } from '@/api/client';
import { NumericInput } from '../../../controls/NumericInput';
import { ColorPicker } from '../../../controls/ColorPicker';
import { ExpressionInput } from '../../../controls/ExpressionInput';

/**
 * Tasks 2.4.6–2.4.7 — Props Tab
 *
 * Section 1: HTML Element Props (for primitive nodes)
 * Section 2: Component Instance Props (for component:XXX nodes)
 */
export const PropsTab = observer(function PropsTab() {
  const nodeId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;
  const [propSearch, setPropSearch] = useState('');

  if (!nodeId) {
    return <Empty description="请先选中一个元素" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const node = findNodeInScreens(screens, nodeId);
  if (!node) {
    return <Empty description="节点未找到" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const isComponentInstance = isComponentInstanceType(node.type);
  const nodeProps = (node.props ?? {}) as Record<string, unknown>;

  const handlePropChange = (key: string, value: unknown) => {
    editorStore.execute({
      type: 'updateComponentProps',
      params: {
        nodeId,
        props: { [key]: value },
      },
    });
  };

  return (
    <div className="flex flex-col gap-0.5 p-2 text-xs">
      <input
        type="text"
        className="w-full h-7 px-2 mb-1 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 bg-white"
        placeholder="搜索属性…"
        value={propSearch}
        onChange={(e) => setPropSearch(e.target.value)}
      />
      {!isComponentInstance && (
        <ElementTypeSection nodeId={nodeId} currentType={node.type as PrimitiveNodeType} />
      )}

      {/* Section 1: HTML Element Props */}
      {!isComponentInstance && (
        <ElementPropsSection
          nodeType={node.type as PrimitiveNodeType}
          nodeId={nodeId}
          props={nodeProps}
          onChange={handlePropChange}
          searchFilter={propSearch}
        />
      )}

      {/* Section 2: Component Instance Props */}
      {isComponentInstance && (
        <ComponentInstancePropsSection
          nodeId={nodeId}
          props={nodeProps}
          templateRef={node.templateRef}
          onChange={handlePropChange}
          searchFilter={propSearch}
        />
      )}

      <ListBindingSection nodeId={nodeId} />

      {/* Common: Text content for text-like elements */}
      {!isComponentInstance && (
        <TextContentSection
          nodeType={node.type as PrimitiveNodeType}
          nodeId={nodeId}
          children={node.children}
        />
      )}

      {/* Custom attributes (data-*) */}
      <CustomAttributesSection nodeId={nodeId} props={nodeProps} onChange={handlePropChange} />
    </div>
  );
});

// ===================================================================
// List binding (__listData) — W6-050
// ===================================================================

const ListBindingSection = observer(function ListBindingSection({ nodeId }: { nodeId: string }) {
  const [open, setOpen] = useState(true);
  const node = findNodeInScreens(editorStore.screens, nodeId);
  const raw = node?.props?.__listData;
  const value = typeof raw === 'string' ? raw : '';

  const apply = (next: string) => {
    editorStore.execute({
      type: 'updateComponentProps',
      params: { nodeId, props: { __listData: next } },
    });
  };

  const handleCopy = async () => {
    const t = value.trim() || '{{data.items}}';
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      // ignore
    }
  };

  return (
    <CollapsibleSection title="列表绑定 (__listData)" open={open} onToggle={() => setOpen(!open)}>
      <p className="text-[10px] text-gray-500 mb-1.5 leading-snug">
        绑定到数组字段（如 data 下的列表），子树将按项重复渲染，与预览一致。
      </p>
      <ExpressionInput
        value={value}
        onChange={(v) => apply(v)}
        placeholder="{{data.items}}"
      />
      <div className="flex flex-wrap gap-1 mt-1.5">
        <button
          type="button"
          className="h-6 px-2 text-[10px] rounded border border-gray-200 bg-white hover:bg-gray-50"
          onClick={() => void handleCopy()}
        >
          复制表达式
        </button>
        <button
          type="button"
          className="h-6 px-2 text-[10px] rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          onClick={() => apply('')}
          disabled={!value}
        >
          清除
        </button>
      </div>
    </CollapsibleSection>
  );
});

// ===================================================================
// Element type (primitive → changeElementType)
// ===================================================================

function ElementTypeSection({
  nodeId,
  currentType,
}: {
  nodeId: string;
  currentType: PrimitiveNodeType;
}) {
  const [open, setOpen] = useState(true);
  const options = useMemo(() => getAllPrimitives(), []);

  return (
    <CollapsibleSection title="节点类型" open={open} onToggle={() => setOpen(!open)}>
      <select
        className="w-full h-7 px-2 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 bg-white"
        value={currentType}
        onChange={(e) => {
          editorStore.execute({
            type: 'changeElementType',
            params: { nodeId, newType: e.target.value as PrimitiveNodeType },
          });
        }}
      >
        {options.map((p) => (
          <option key={p.type} value={p.type}>
            {p.label} ({p.type})
          </option>
        ))}
      </select>
    </CollapsibleSection>
  );
}

// ===================================================================
// Section 1: HTML Element Props
// ===================================================================

interface ElementPropsSectionProps {
  nodeType: PrimitiveNodeType;
  nodeId: string;
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  searchFilter?: string;
}

const ElementPropsSection = observer(function ElementPropsSection({
  nodeType,
  nodeId,
  props,
  onChange,
  searchFilter = '',
}: ElementPropsSectionProps) {
  const [open, setOpen] = useState(true);
  const allElementProps = getElementProps(nodeType);
  const elementProps = searchFilter
    ? allElementProps.filter((p) => {
        const q = searchFilter.toLowerCase();
        return p.key.toLowerCase().includes(q) || p.label.toLowerCase().includes(q);
      })
    : allElementProps;

  if (allElementProps.length === 0) {
    return (
      <CollapsibleSection title="元素属性" open={open} onToggle={() => setOpen(!open)}>
        <div className="text-gray-400 text-[10px] py-1">
          此元素类型 ({nodeType}) 没有可编辑的属性
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <CollapsibleSection title={`元素属性 (${elementProps.length})`} open={open} onToggle={() => setOpen(!open)}>
      <div className="flex flex-col gap-1.5">
        {elementProps.map((propDef) => (
          <PropControl
            key={propDef.key}
            propKey={propDef.key}
            type={propDef.type}
            label={propDef.label}
            value={props[propDef.key] ?? propDef.defaultValue}
            defaultValue={propDef.defaultValue}
            enumValues={propDef.enumValues}
            description={propDef.description}
            onChange={(v) => onChange(propDef.key, v)}
            nodeId={nodeId}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
});

// ===================================================================
// Section 2: Component Instance Props
// ===================================================================

interface ComponentInstancePropsSectionProps {
  nodeId: string;
  props: Record<string, unknown>;
  templateRef?: { templateId: string; mode: string };
  onChange: (key: string, value: unknown) => void;
  searchFilter?: string;
}

const ComponentInstancePropsSection = observer(function ComponentInstancePropsSection({
  nodeId,
  props,
  templateRef,
  onChange,
  searchFilter = '',
}: ComponentInstancePropsSectionProps) {
  const [open, setOpen] = useState(true);

  // Try to find the template's prop definitions from the project's component assets
  const project = editorStore.project;
  const template = templateRef && project
    ? project.componentAssets?.find((t) => t.id === templateRef.templateId)
    : null;

  const propDefinitions: ComponentPropDefinition[] = template?.propDefinitions ?? [];

  if (propDefinitions.length === 0) {
    return (
      <>
        <TemplateRefActions nodeId={nodeId} templateRef={templateRef} />
        <CollapsibleSection title="组件属性" open={open} onToggle={() => setOpen(!open)}>
        <div className="text-gray-400 text-[10px] py-1">
          此组件没有定义可编辑的属性
        </div>
        {/* Still show raw props if any */}
        {Object.keys(props).length > 0 && (
          <div className="mt-1">
            <div className="text-[10px] text-gray-500 mb-1">原始属性:</div>
            {Object.entries(props).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1 text-xs mb-1">
                <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate" title={key}>
                  {key}
                </span>
                <input
                  type="text"
                  className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
                  value={String(value ?? '')}
                  onChange={(e) => onChange(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>
      </>
    );
  }

  const filteredDefs = searchFilter
    ? propDefinitions.filter((def) => {
        const q = searchFilter.toLowerCase();
        return def.key.toLowerCase().includes(q) || def.label.toLowerCase().includes(q) || (def.group ?? '').toLowerCase().includes(q);
      })
    : propDefinitions;

  const groups: Record<string, ComponentPropDefinition[]> = {};
  for (const def of filteredDefs) {
    const group = def.group || '基本';
    if (!groups[group]) groups[group] = [];
    groups[group].push(def);
  }

  return (
    <>
      <TemplateRefActions nodeId={nodeId} templateRef={templateRef} />
      {Object.entries(groups).map(([groupName, defs]) => (
        <ComponentPropGroup
          key={groupName}
          groupName={groupName}
          definitions={defs}
          props={props}
          onChange={onChange}
          nodeId={nodeId}
        />
      ))}
    </>
  );
});

function TemplateRefActions({
  nodeId,
  templateRef,
}: {
  nodeId: string;
  templateRef?: { templateId: string; mode: string };
}) {
  if (!templateRef || templateRef.mode !== 'reference') return null;

  return (
    <div className="flex flex-wrap gap-1 mb-1 p-2 rounded border border-amber-100 bg-amber-50/80">
      <span className="text-[10px] text-amber-800 w-full">引用模板实例</span>
      <button
        type="button"
        className="px-2 py-0.5 text-[10px] rounded border border-gray-300 bg-white hover:bg-gray-50"
        onClick={() => {
          const r = editorStore.execute({ type: 'detachInstance', params: { nodeId } });
          if (!r.success) return;
        }}
      >
        脱离模板
      </button>
      <button
        type="button"
        className="px-2 py-0.5 text-[10px] rounded border border-blue-300 bg-white hover:bg-blue-50 text-blue-700"
        onClick={() => {
          editorStore.execute({ type: 'syncInstance', params: { nodeId } });
        }}
      >
        从模板同步
      </button>
    </div>
  );
}

// ===================================================================
// Component Prop Group
// ===================================================================

interface ComponentPropGroupProps {
  groupName: string;
  definitions: ComponentPropDefinition[];
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  nodeId?: string;
}

function ComponentPropGroup({ groupName, definitions, props, onChange, nodeId }: ComponentPropGroupProps) {
  const [open, setOpen] = useState(true);

  return (
    <CollapsibleSection title={groupName} open={open} onToggle={() => setOpen(!open)}>
      <div className="flex flex-col gap-1.5">
        {definitions.map((def) => (
          <PropControl
            key={def.key}
            propKey={def.key}
            type={def.type}
            label={def.label}
            value={props[def.key] ?? def.defaultValue}
            defaultValue={def.defaultValue}
            enumValues={def.enumValues}
            description={def.description}
            onChange={(v) => onChange(def.key, v)}
            nodeId={nodeId}
          />
        ))}
      </div>
    </CollapsibleSection>
  );
}

// ===================================================================
// Text Content Section (for text-like elements)
// ===================================================================

interface TextContentSectionProps {
  nodeType: PrimitiveNodeType;
  nodeId: string;
  children?: unknown;
}

const TEXT_ELEMENTS: PrimitiveNodeType[] = ['p', 'h1', 'h2', 'h3', 'span', 'button', 'a', 'li'];

function TextContentSection({ nodeType, nodeId, children }: TextContentSectionProps) {
  const [open, setOpen] = useState(true);

  if (!TEXT_ELEMENTS.includes(nodeType)) return null;

  const node = findNodeInScreens(editorStore.screens, nodeId);
  const existingText = (() => {
    const propText = (node?.props as Record<string, unknown>)?.textContent;
    if (typeof propText === 'string') return propText;
    if (typeof children === 'string') return children;
    if (Array.isArray(children) && children.length > 0 && typeof children[0] === 'string') return children[0];
    return '';
  })();

  const [localText, setLocalText] = useState(existingText);

  return (
    <CollapsibleSection title="文本内容" open={open} onToggle={() => setOpen(!open)}>
      <textarea
        className="w-full h-16 px-1.5 py-1 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 resize-y"
        placeholder="输入文本内容..."
        value={localText}
        onChange={(e) => {
          setLocalText(e.target.value);
          editorStore.execute({
            type: 'updateComponentProps',
            params: {
              nodeId,
              props: { textContent: e.target.value },
            },
          });
        }}
      />
    </CollapsibleSection>
  );
}

/** 图片 URL + 本地上传 → asset://uploads/… */
function ImagePropField({
  label,
  value,
  description,
  onChange,
  bindSlot,
}: {
  label: string;
  value: unknown;
  description?: string;
  onChange: (v: unknown) => void;
  bindSlot?: ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const projectId = editorStore.project?.id;

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !projectId) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/projects/${projectId}/assets/upload`, {
      method: 'POST',
      body: fd,
    });
    const data = (await res.json()) as { url?: string };
    if (!res.ok || !data.url) return;
    const path = data.url.replace(/^\//, '');
    onChange(`asset://${path}`);
  };

  return (
    <div className="flex flex-col gap-1" title={description}>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
          value={String(value ?? '')}
          placeholder="URL 或 asset://uploads/…"
          onChange={(e) => onChange(e.target.value)}
        />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void upload(e)} />
        <button
          type="button"
          className="flex-shrink-0 px-1.5 py-0.5 text-[10px] border border-gray-200 rounded hover:bg-gray-50"
          disabled={!projectId}
          onClick={() => fileRef.current?.click()}
        >
          上传
        </button>
        {bindSlot}
      </div>
      {typeof value === 'string' && value.length > 0 && (
        <div className="ml-[68px]">
          <img
            src={resolveAssetUrl(value)}
            alt={label}
            className="w-full max-h-24 object-contain rounded border border-gray-200 bg-gray-50"
            onError={(err) => {
              (err.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </div>
  );
}

// ===================================================================
// Task 2.4.7: PropControl — renders appropriate control per type
// ===================================================================

interface PropControlProps {
  propKey: string;
  type: string;
  label: string;
  value: unknown;
  defaultValue: unknown;
  enumValues?: string[];
  description?: string;
  onChange: (value: unknown) => void;
  nodeId?: string;
}

function PropControl({
  propKey,
  type,
  label,
  value,
  defaultValue,
  enumValues,
  description,
  onChange,
  nodeId,
}: PropControlProps) {
  const [bindMode, setBindMode] = useState(false);

  // Check if this prop has a bound expression
  const nodeForBind = nodeId ? findNodeInScreens(editorStore.screens, nodeId) : null;
  const boundExpression = nodeForBind
    ? (() => {
        const p = (nodeForBind.props ?? {}) as Record<string, unknown>;
        const legacy = p[`__bind:${propKey}`];
        if (typeof legacy === 'string') return legacy;
        const raw = p[propKey];
        if (typeof raw === 'string' && /\{\{.+?\}\}/.test(raw)) return raw;
        return undefined;
      })()
    : undefined;

  const isExpressionBound = bindMode || !!boundExpression;

  const handleBindToggle = () => {
    if (isExpressionBound && !bindMode) {
      // Already bound, switch to edit mode
      setBindMode(true);
    } else {
      setBindMode(!bindMode);
    }
  };

  const handleExpressionChange = (expression: string) => {
    if (!nodeId) return;
    editorStore.execute({
      type: 'bindData',
      params: { nodeId, propKey, expression },
    });
  };

  // Expression/bind mode: show ExpressionInput
  if (isExpressionBound) {
    return (
      <div className="flex flex-col gap-0.5" title={description}>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
          <ExpressionInput
            value={boundExpression ?? ''}
            onChange={handleExpressionChange}
            placeholder={`{{data.${propKey}}}`}
          />
          <button
            type="button"
            className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-amber-500 hover:text-gray-500 transition-colors"
            onClick={handleBindToggle}
            title="Switch to direct value"
          >
            🔗
          </button>
        </div>
      </div>
    );
  }

  // Normal mode with bind toggle button
  const bindButton = nodeId ? (
    <button
      type="button"
      className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-300 hover:text-amber-500 transition-colors text-[10px]"
      onClick={handleBindToggle}
      title="Bind to data expression"
    >
      🔗
    </button>
  ) : null;
  switch (type) {
    case 'string':
    case 'textarea':
      return (
        <div className="flex items-center gap-1 text-xs" title={description}>
          <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
          {type === 'textarea' ? (
            <textarea
              className="flex-1 h-14 px-1.5 py-1 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 resize-y"
              value={String(value ?? '')}
              placeholder={String(defaultValue ?? '')}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input
              type="text"
              className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
              value={String(value ?? '')}
              placeholder={String(defaultValue ?? '')}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
          {bindButton}
        </div>
      );

    case 'number':
      return (
        <div className="flex items-center gap-1">
          <NumericInput
            label={label}
            value={String(value ?? '')}
            onChange={(v) => {
              const num = parseFloat(v);
              onChange(isNaN(num) ? v : num);
            }}
            placeholder={String(defaultValue ?? '0')}
            units={['']}
          />
          {bindButton}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center gap-1 text-xs" title={description}>
          <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
          <Switch
            size="small"
            checked={Boolean(value)}
            onChange={(checked) => onChange(checked)}
          />
          <span className="flex-1" />
          {bindButton}
        </div>
      );

    case 'enum':
    case 'options':
      return (
        <div className="flex items-center gap-1 text-xs" title={description}>
          <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
          <select
            className="flex-1 h-6 px-1 border border-gray-200 rounded text-xs bg-white outline-none focus:border-blue-400 min-w-0"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">-</option>
            {(enumValues ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          {bindButton}
        </div>
      );

    case 'color':
      return (
        <ColorPicker
          label={label}
          value={String(value ?? '')}
          onChange={(v) => onChange(v)}
        />
      );

    case 'image':
      return (
        <ImagePropField
          label={label}
          value={value}
          description={description}
          onChange={onChange}
          bindSlot={bindButton}
        />
      );

    case 'action':
      return (
        <div className="flex flex-col gap-0.5 text-xs" title={description}>
          <div className="flex items-center gap-1">
            <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
            <input
              type="text"
              className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
              value={String(value ?? '')}
              placeholder="动作标识 / 处理器名"
              onChange={(e) => onChange(e.target.value)}
            />
            {bindButton}
          </div>
        </div>
      );

    case 'url':
      return (
        <div className="flex items-center gap-1 text-xs" title={description}>
          <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
          <div className="flex items-center flex-1 border border-gray-200 rounded h-6 focus-within:border-blue-400">
            <span className="px-1 text-gray-400 flex-shrink-0">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </span>
            <input
              type="text"
              className="flex-1 h-full px-1 bg-transparent outline-none text-xs text-gray-800 min-w-0"
              value={String(value ?? '')}
              placeholder="https://..."
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>
      );

    default:
      // Fallback: text input
      return (
        <div className="flex items-center gap-1 text-xs" title={description}>
          <span className="text-gray-500 w-16 text-right flex-shrink-0 truncate">{label}</span>
          <input
            type="text"
            className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}

// ===================================================================
// Custom attributes (data-*) editor
// ===================================================================

function CustomAttributesSection({
  nodeId,
  props,
  onChange,
}: {
  nodeId: string;
  props: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');

  const customKeys = Object.keys(props).filter(
    (k) => k.startsWith('data-') || k.startsWith('aria-') || k === 'role' || k === 'tabIndex',
  );

  const handleAdd = () => {
    let key = newKey.trim();
    if (!key) return;
    if (!key.startsWith('data-') && !key.startsWith('aria-') && key !== 'role' && key !== 'tabIndex') {
      key = `data-${key}`;
    }
    onChange(key, newVal || '');
    setNewKey('');
    setNewVal('');
  };

  const handleRemove = (key: string) => {
    editorStore.execute({
      type: 'updateComponentProps',
      params: { nodeId, props: { [key]: undefined } },
    });
  };

  return (
    <CollapsibleSection title="自定义属性" open={open} onToggle={() => setOpen(!open)}>
      {customKeys.length === 0 && (
        <div className="text-[10px] text-gray-400 py-1">暂无 data-* / aria-* 属性</div>
      )}
      <div className="flex flex-col gap-1">
        {customKeys.map((key) => (
          <div key={key} className="flex items-center gap-1 text-xs group">
            <span className="text-purple-600 font-mono text-[10px] w-20 text-right flex-shrink-0 truncate" title={key}>{key}</span>
            <input
              type="text"
              className="flex-1 h-6 px-1.5 border border-gray-200 rounded text-xs outline-none focus:border-blue-400 font-mono"
              value={String(props[key] ?? '')}
              onChange={(e) => onChange(key, e.target.value)}
            />
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-[10px] p-0.5"
              onClick={() => handleRemove(key)}
            >×</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-1">
        <input
          type="text"
          className="w-20 h-6 px-1.5 border border-dashed border-gray-200 rounded text-[10px] outline-none font-mono"
          placeholder="data-xxx"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <input
          type="text"
          className="flex-1 h-6 px-1.5 border border-dashed border-gray-200 rounded text-[10px] outline-none"
          placeholder="值"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button
          type="button"
          className="h-6 px-2 text-[10px] text-blue-500 hover:text-blue-600"
          onClick={handleAdd}
          disabled={!newKey.trim()}
        >+</button>
      </div>
    </CollapsibleSection>
  );
}

// ===================================================================
// Shared: Collapsible Section
// ===================================================================

interface CollapsibleSectionProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({ title, open, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        type="button"
        className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900"
        onClick={onToggle}
      >
        <span>{title}</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="pb-2">{children}</div>}
    </div>
  );
}
