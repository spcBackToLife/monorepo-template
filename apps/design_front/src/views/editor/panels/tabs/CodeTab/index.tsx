import { useState, useMemo, useCallback } from 'react';
import { App as AntdApp, Button, Segmented } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx';
import type { Screen, ComponentNode } from '@globallink/design-schema';
import { generateReactCode } from '@globallink/design-engine';
import { editorStore } from '@/stores/editor';
import { findNodeInScreens } from '@globallink/design-operations';

type CodeScope = 'node' | 'screen';
type CodeView = 'json' | 'react' | 'html';

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 右侧「代码」Tab：查看选中节点子树或当前页面 Screen 的 JSON（只读），或导出 React / HTML，支持复制。
 */
export const CodeTab = observer(function CodeTab() {
  const { message } = AntdApp.useApp();
  const [scope, setScope] = useState<CodeScope>('node');
  const [view, setView] = useState<CodeView>('json');
  const nodeId = editorStore.selectedNodeIds[0];
  const screens = editorStore.screens;
  const screen = editorStore.activeScreen;
  const project = editorStore.project;

  const node = nodeId ? findNodeInScreens(screens, nodeId) : null;

  const codegenScreen = useMemo((): Screen | null => {
    const s = screen ? (toJS(screen) as Screen) : null;
    if (!s) return null;
    if (scope === 'screen') return s;
    if (scope === 'node' && node) {
      return {
        ...s,
        name: (node.name && String(node.name)) || s.name || 'Node',
        rootNode: toJS(node) as ComponentNode,
      };
    }
    return null;
  }, [screen, scope, node]);

  const text = useMemo(() => {
    if (view === 'react' || view === 'html') {
      if (!codegenScreen) {
        if (scope === 'node' && !nodeId) {
          return '// 请在画布或左侧树中选中一个节点，或切换到「当前页面」';
        }
        return '// 无当前页面，无法生成代码';
      }
      try {
        return generateReactCode(codegenScreen, {
          format: view === 'html' ? 'html' : 'react-tsx',
          includeStyles: true,
          includeEvents: true,
        });
      } catch (e) {
        return `// 生成代码失败: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    if (scope === 'screen' && screen) {
      const plain = toJS(screen) as Screen;
      return safeStringify(plain);
    }
    if (scope === 'node' && node) {
      const plain = toJS(node) as ComponentNode;
      return safeStringify(plain);
    }
    if (scope === 'node' && !nodeId) {
      return '// 请在画布或左侧树中选中一个节点';
    }
    return '// 无可用数据';
  }, [view, scope, screen, node, nodeId, codegenScreen]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  }, [text, message]);

  return (
    <div className="flex flex-col h-full min-h-[200px] p-2 text-xs">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Segmented<CodeScope>
          size="small"
          value={scope}
          onChange={(v) => setScope(v as CodeScope)}
          options={[
            { label: '选中节点', value: 'node' },
            { label: '当前页面', value: 'screen' },
          ]}
        />
        <Segmented<CodeView>
          size="small"
          value={view}
          onChange={(v) => setView(v as CodeView)}
          options={[
            { label: 'JSON', value: 'json' },
            { label: 'React', value: 'react' },
            { label: 'HTML', value: 'html' },
          ]}
        />
        <Button type="primary" size="small" icon={<CopyOutlined />} onClick={() => void copy()}>
          复制
        </Button>
        {project && (
          <span className="text-[10px] text-gray-400 truncate max-w-[140px]" title={project.id}>
            项目 {project.name}
          </span>
        )}
      </div>
      <textarea
        readOnly
        className="flex-1 w-full min-h-[160px] p-2 font-mono text-[11px] leading-relaxed border border-gray-200 rounded bg-gray-50 text-gray-800 resize-y outline-none"
        spellCheck={false}
        value={text}
      />
      <p className="mt-1 text-[10px] text-gray-400">
        {view === 'json'
          ? '只读展示 Schema JSON。改结构请用画布与属性面板；与剪贴板粘贴配合可在支持处粘贴子树。'
          : '由当前页面或选中子树生成的 React TSX / 静态 HTML（样式与事件为占位注释），可按需再手工接入路由与状态。'}
      </p>
    </div>
  );
});
