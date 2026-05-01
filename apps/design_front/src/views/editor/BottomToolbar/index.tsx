import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { App as AntdApp, Dropdown, Modal, Tooltip, type MenuProps } from 'antd';
import {
  AimOutlined,
  AppstoreOutlined,
  BlockOutlined,
  BorderOutlined,
  CodeOutlined,
  CommentOutlined,
  DragOutlined,
  FontSizeOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { generateNodeId, getPrimitiveCategories, getPrimitivesByCategory, type PrimitiveNodeType } from '@globallink/design-schema';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';
import type { ToolType } from '@/stores/editor';
import { ComponentLibrary } from '../panels/ComponentLibrary';
import { SaveTemplateToolbarButton } from '../panels/SaveTemplate';
import './bottomToolbar.css';

/**
 * 产品文档 02-toolbar：底部浮动胶囊工具栏（Figma 风格）
 * — 选择 / 平移、容器与元素下拉、文本、注释、组件库、素材、代码占位
 * — 具体 HTML 标签从 Dropdown 选择，不再占用整行 Tabs 区域
 */
export const BottomToolbar = observer(function BottomToolbar() {
  const { message } = AntdApp.useApp();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const activeTool = editorStore.activeTool;
  /** 供 observer 订阅；与快捷键 C 联动打开组件库 */
  const componentLibraryOpenNonce = editorStore.componentLibraryOpenNonce;
  const selectedParentId = editorStore.selectedNodeIds[0];
  const canInsert = Boolean(selectedParentId);

  const TEXT_TYPES = new Set(['p', 'span', 'h1', 'h2', 'h3', 'a']);

  const addTag = useCallback(
    (tag: string) => {
      if (!selectedParentId) {
        message.warning('请先在左侧节点树或画布中选中一个容器，再添加元素');
        return;
      }
      const parentId = selectedParentId;
      const isText = TEXT_TYPES.has(tag);
      const result = editorStore.execute({
        type: 'addElement',
        params: {
          parentId,
          tag: tag as PrimitiveNodeType,
          elementId: generateNodeId(),
          ...(isText ? {
            props: { text: 'Text' },
            styles: { minHeight: '1em', boxSizing: 'border-box' as const },
          } : {}),
        },
      });
      if (result.success) {
        const createdNodeId = result.affectedNodeIds[0] ?? null;
        editorStore.select(createdNodeId);
        if (!editorStore.toolLocked) editorStore.setActiveTool('select');
        return;
      }
      message.error(result.description);
    },
    [message, selectedParentId],
  );

  const containerMenuItems: MenuProps['items'] = useMemo(() => {
    const containerCats = ['layout'] as const;
    return containerCats.map((cat) => ({
      key: `cat-${cat}`,
      label: cat,
      children: getPrimitivesByCategory(cat).map((p) => ({
        key: p.type,
        label: (
          <span className="bottom-toolbar-menu-item">
            <code className="bottom-toolbar-menu-tag">&lt;{p.type}&gt;</code>
            <span>{p.label}</span>
          </span>
        ),
      })),
    }));
  }, []);

  const elementMenuItems: MenuProps['items'] = useMemo(() => {
    const allCats = getPrimitiveCategories().filter((c) => c !== 'layout' && c !== 'text' && c !== 'annotation');
    return allCats.map((cat) => ({
      key: `cat-${cat}`,
      label: cat,
      children: getPrimitivesByCategory(cat).map((p) => ({
        key: p.type,
        label: (
          <span className="bottom-toolbar-menu-item">
            <code className="bottom-toolbar-menu-tag">&lt;{p.type}&gt;</code>
            <span>{p.label}</span>
          </span>
        ),
      })),
    }));
  }, []);

  const textMenuItems: MenuProps['items'] = useMemo(() => {
    return getPrimitivesByCategory('text').map((p) => ({
      key: p.type,
      label: (
        <span className="bottom-toolbar-menu-item">
          <code className="bottom-toolbar-menu-tag">&lt;{p.type}&gt;</code>
          <span>{p.label}</span>
        </span>
      ),
    }));
  }, []);

  const onPrimitiveMenuClick: MenuProps['onClick'] = ({ key }) => {
    const k = String(key);
    if (k.startsWith('cat-')) return;
    addTag(k);
  };

  const setTool = (tool: ToolType) => {
    editorStore.setActiveTool(tool);
  };

  const openComponentLibraryWithTool = useCallback(() => {
    editorStore.setActiveTool('component');
    editorStore.requestOpenComponentLibrary();
  }, []);

  /** 快捷键 C / requestOpenComponentLibrary：nonce 变化 → 打开组件库 */
  useEffect(() => {
    if (componentLibraryOpenNonce > 0) {
      setLibraryOpen(true);
    }
  }, [componentLibraryOpenNonce]);

  const toolBtn = (tool: ToolType, icon: ReactNode, title: string, shortcut?: string) => (
    <Tooltip title={shortcut ? `${title} (${shortcut})` : title}>
      <button
        type="button"
        className={`bottom-toolbar__btn ${activeTool === tool ? 'bottom-toolbar__btn--active' : ''} ${editorStore.toolLocked && activeTool === tool ? 'bottom-toolbar__btn--locked' : ''}`}
        onClick={() => setTool(tool)}
        onDoubleClick={(e) => {
          e.stopPropagation();
          editorStore.toggleToolLocked();
        }}
        aria-pressed={activeTool === tool}
      >
        {icon}
      </button>
    </Tooltip>
  );

  return (
    <>
      <div className="bottom-toolbar-capsule">
        <div className="bottom-toolbar__group">
          {toolBtn('select', <AimOutlined />, '选择', 'V')}
          {toolBtn('hand', <DragOutlined />, '平移', 'Space')}
        </div>
        <div className="bottom-toolbar__sep" aria-hidden />
        <div className="bottom-toolbar__group">
          <Dropdown
            menu={{ items: containerMenuItems, onClick: onPrimitiveMenuClick }}
            trigger={['click']}
            disabled={!canInsert}
            onOpenChange={(open) => {
              if (open) setTool('container');
            }}
          >
            <Tooltip title="容器 (布局元素)">
              <button
                type="button"
                className={`bottom-toolbar__btn bottom-toolbar__btn--dropdown ${activeTool === 'container' ? 'bottom-toolbar__btn--active' : ''}`}
              >
                <BorderOutlined />
                <span className="bottom-toolbar__caret">▾</span>
              </button>
            </Tooltip>
          </Dropdown>
          <Dropdown
            menu={{ items: elementMenuItems, onClick: onPrimitiveMenuClick }}
            trigger={['click']}
            disabled={!canInsert}
            onOpenChange={(open) => {
              if (open) setTool('element');
            }}
          >
            <Tooltip title="元素 (表单/媒体/列表/导航)">
              <button
                type="button"
                className={`bottom-toolbar__btn bottom-toolbar__btn--dropdown ${activeTool === 'element' ? 'bottom-toolbar__btn--active' : ''}`}
              >
                <BlockOutlined />
                <span className="bottom-toolbar__caret">▾</span>
              </button>
            </Tooltip>
          </Dropdown>
        </div>
        <div className="bottom-toolbar__sep" aria-hidden />
        <div className="bottom-toolbar__group">
          <Tooltip title="组件库 (C)：切换为组件工具并打开组件库面板">
            <button
              type="button"
              className={`bottom-toolbar__btn ${activeTool === 'component' ? 'bottom-toolbar__btn--active' : ''}`}
              onClick={openComponentLibraryWithTool}
              aria-pressed={activeTool === 'component'}
            >
              <AppstoreOutlined />
            </button>
          </Tooltip>
          <Dropdown
            menu={{ items: textMenuItems, onClick: onPrimitiveMenuClick }}
            trigger={['click']}
            disabled={!canInsert}
            onOpenChange={(open) => {
              if (open) setTool('text');
            }}
          >
            <Tooltip title="文本 (T)">
              <button
                type="button"
                className={`bottom-toolbar__btn bottom-toolbar__btn--dropdown ${activeTool === 'text' ? 'bottom-toolbar__btn--active' : ''}`}
              >
                <FontSizeOutlined />
                <span className="bottom-toolbar__caret">▾</span>
              </button>
            </Tooltip>
          </Dropdown>
          {toolBtn('annotation', <CommentOutlined />, '注释', 'A')}
          <SaveTemplateToolbarButton />
          <Tooltip title="素材编辑器 (渐变/阴影/滤镜/画布/动画)">
            <button
              type="button"
              className="bottom-toolbar__btn"
              onClick={() => editorStore.openMaterialEditor(null, 'gradient')}
            >
              <PictureOutlined />
            </button>
          </Tooltip>
        </div>
        <div className="bottom-toolbar__sep" aria-hidden />
        <div className="bottom-toolbar__group">
          <Tooltip title="打开右侧「代码」Tab（节点 / 页面 JSON）">
            <button
              type="button"
              className="bottom-toolbar__btn"
              onClick={() => editorStore.focusRightPanelSection('code')}
            >
              <CodeOutlined />
            </button>
          </Tooltip>
        </div>
      </div>

      <Modal
        title="组件库"
        open={libraryOpen}
        onCancel={() => setLibraryOpen(false)}
        footer={null}
        width={400}
        destroyOnClose
        styles={{ body: { padding: 0 } }}
      >
        <div className="bottom-toolbar-library-wrap">
          <ComponentLibrary embedded onClose={() => setLibraryOpen(false)} />
        </div>
      </Modal>
    </>
  );
});
