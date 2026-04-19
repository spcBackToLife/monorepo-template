import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Screen, ComponentTemplate } from '@globallink/design-schema';
import { SchemaRenderer } from '@globallink/design-engine';
import { getEditorStaticAssetOrigin } from '@/views/editor/utils/staticAssetOrigin';

/**
 * 交互链路图中的页面节点 — 渲染真实页面缩略图而非文字方块。
 */
export function ScreenFlowNode({ data }: NodeProps) {
  const screen = data.screen as Screen | undefined;
  const assets = (data.assets as ComponentTemplate[]) ?? [];
  const vpWidth = (data.vpWidth as number) || 375;
  const vpHeight = (data.vpHeight as number) || 812;
  const scale = 0.22;

  const w = Math.round(vpWidth * scale);
  const h = Math.round(vpHeight * scale);

  return (
    <div className="flow-screen-node" style={{ width: w + 16, padding: 0 }}>
      <Handle type="target" position={Position.Left} />

      {/* Real page rendering */}
      {screen ? (
        <div style={{
          width: w, height: h, overflow: 'hidden', borderRadius: '8px 8px 0 0',
          background: screen.backgroundColor || '#fff', margin: 0,
        }}>
          <div style={{
            width: vpWidth, height: vpHeight,
            transform: `scale(${scale})`, transformOrigin: 'top left',
            pointerEvents: 'none',
          }}>
            <SchemaRenderer screen={screen} assets={assets} staticAssetOrigin={getEditorStaticAssetOrigin()} hideGhostNodes editorCanvasOptimize={false} />
          </div>
        </div>
      ) : (
        <div style={{ width: w, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 11 }}>
          无预览
        </div>
      )}

      {/* Label */}
      <div style={{
        padding: '6px 8px', textAlign: 'center', borderTop: '1px solid #e2e8f0',
        background: '#fff', borderRadius: '0 0 8px 8px',
      }}>
        <div className="flow-screen-node-name" style={{ fontSize: 11 }}>
          {String(data.label ?? '')}
        </div>
        <div className="flow-screen-node-stats" style={{ fontSize: 9 }}>
          {(data.eventCount as number) || 0} 事件 · {(data.nodeCount as number) || 0} 组件
        </div>
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
