import { useMemo } from 'react';
import { Tag, Table } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import type { ComponentNode, ComponentTemplate, Screen } from '@globallink/design-schema';
import { SchemaRenderer } from '@globallink/design-engine';
import type { ScreenAnalysis, ModuleSpec, ElementSpec } from '../types';
import { buildIsolatedScreen } from '../../Panorama/PanoramaPage';
import { getEditorStaticAssetOrigin } from '@/views/editor/utils/staticAssetOrigin';

interface Props {
  screenAnalysis: ScreenAnalysis;
  chapterNum: number;
  assets: ComponentTemplate[];
  viewport: { width: number; height: number };
  onViewInFlow: (edgeId: string) => void;
}

export function ScreenSection({ screenAnalysis: sa, chapterNum, assets, viewport, onViewInFlow }: Props) {
  return (
    <div className="prd-chapter">
      <h2 className="prd-chapter-title">
        第{chapterNum}章 · {sa.screen.name}
      </h2>

      {/* === Page overview === */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 24 }}>
        {/* Page screenshot */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <MiniPagePreview screen={sa.screen} assets={assets} viewport={viewport} scale={0.22} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            {sa.nodeCount} 个组件 · {sa.eventCount} 个事件 ·{' '}
            {(sa.screen.domainStates ?? []).length} 个状态变量 ·{' '}
            {(sa.screen.apiEndpoints ?? []).length} 个 API
          </div>

          {/* Incoming / outgoing navs */}
          <div style={{ display: 'flex', gap: 32 }}>
            {sa.incomingNavs.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>入口来源</div>
                {dedup(sa.incomingNavs).map((nav, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>
                    ← {nav.label}
                    <FlowLink edgeId={nav.edgeId} onClick={onViewInFlow} />
                  </div>
                ))}
              </div>
            )}
            {sa.outgoingNavs.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>出口去向</div>
                {dedup(sa.outgoingNavs).map((nav, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#475569', padding: '2px 0' }}>
                    → {nav.label}
                    <FlowLink edgeId={nav.edgeId} onClick={onViewInFlow} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* === Modules === */}
      {sa.modules.map((mod, mi) => (
        <ModuleSection
          key={mi}
          module={mod}
          index={mi + 1}
          screen={sa.screen}
          assets={assets}
          viewport={viewport}
          onViewInFlow={onViewInFlow}
        />
      ))}

      {/* === State Analysis === */}
      {sa.stateAnalysis.length > 0 && (
        <>
          <h3 className="prd-section-title">状态定义与流转</h3>
          {sa.stateAnalysis.map((sv) => (
            <div key={sv.variable.id} className="prd-env-card">
              <div className="prd-env-name">{sv.variable.label}（{sv.variable.name}）</div>
              <div className="prd-env-values">
                {sv.variable.values.map((v) => (
                  <span key={v.value} className={`prd-env-value-tag ${v.value === sv.variable.defaultValue ? 'prd-env-value-tag--default' : ''}`}>
                    {v.label}
                  </span>
                ))}
              </div>
              {sv.writers.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: '#ef4444' }}>写入：</span>
                  {sv.writers.map((w, i) => (
                    <span key={i} style={{ color: '#475569' }}>
                      {i > 0 && '、'}{w.nodeName} {w.trigger}时 → "{w.value}"
                    </span>
                  ))}
                </div>
              )}
              {sv.readers.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: '#22c55e' }}>响应：</span>
                  {sv.readers.map((r, i) => (
                    <span key={i} style={{ color: '#475569' }}>
                      {i > 0 && '、'}{r.nodeName}（当"{r.value}"时 → {r.effect}）
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* === Data & API === */}
      {((sa.screen.dataSources ?? []).length > 0 || (sa.screen.apiEndpoints ?? []).length > 0) && (
        <>
          <h3 className="prd-section-title">数据与 API</h3>
          {(sa.screen.dataSources ?? []).map((ds) => (
            <div key={ds.id} className="prd-env-card">
              <div className="prd-env-name">📊 {ds.name}（{ds.lifecycle === 'api' ? 'API数据源' : '静态数据'}）</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {ds.scenarios.length} 个数据场景：{ds.scenarios.map((s) => s.name).join('、')}
              </div>
            </div>
          ))}
          {(sa.screen.apiEndpoints ?? []).map((ep) => (
            <div key={ep.definition.id} className="prd-env-card">
              <div className="prd-env-name">
                📡 {ep.definition.name}
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>{ep.definition.method} {ep.definition.path}</Tag>
              </div>
              {ep.scenarios.length > 0 && (
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Mock 场景：{ep.scenarios.map((s) => `${s.name}(${s.statusCode})`).join('、')}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* === Event Summary Table === */}
      {sa.eventSummary.length > 0 && (
        <>
          <h3 className="prd-section-title">交互事件汇总</h3>
          <Table
            size="small"
            pagination={false}
            dataSource={sa.eventSummary.map((e, i) => ({ ...e, key: i }))}
            columns={[
              { title: '元素', dataIndex: 'nodeName', width: 120 },
              { title: '触发', dataIndex: 'trigger', width: 100, render: (t: string) => <Tag color={triggerColor(t)}>{t}</Tag> },
              { title: '行为描述', dataIndex: 'description', ellipsis: true },
              { title: '', width: 40, render: (_: unknown, r: { edgeId: string }) => <FlowLink edgeId={r.edgeId} onClick={onViewInFlow} /> },
            ]}
          />
        </>
      )}
    </div>
  );
}

// ===== Module Section =====

function ModuleSection({ module: mod, index, screen, assets, viewport, onViewInFlow }: {
  module: ModuleSpec; index: number; screen: Screen;
  assets: ComponentTemplate[]; viewport: { width: number; height: number };
  onViewInFlow: (edgeId: string) => void;
}) {
  // Separate detailed elements (have behavior) from simple ones
  const detailed = mod.elements.filter((e) => e.isDetailed);
  const simple = mod.elements.filter((e) => !e.isDetailed);

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 className="prd-section-title">{index}. {mod.name}</h3>

      {/* Module screenshot */}
      <div style={{ marginBottom: 16 }}>
        <MiniNodePreview node={mod.rootNode} screen={screen} assets={assets} viewport={viewport} />
      </div>

      {/* Simple elements table */}
      {simple.length > 0 && (
        <Table
          size="small"
          pagination={false}
          style={{ marginBottom: 16 }}
          dataSource={simple.map((e, i) => ({ ...e, key: i }))}
          columns={[
            { title: '元素', dataIndex: 'name', width: 120, render: (name: string, r: ElementSpec) => <span style={{ fontWeight: 500 }}>{name}</span> },
            { title: '类型', dataIndex: 'type', width: 80, render: (t: string) => <Tag style={{ fontSize: 10 }}>{t}</Tag> },
            { title: '描述', dataIndex: 'description' },
          ]}
        />
      )}

      {/* Detailed element cards */}
      {detailed.map((el) => (
        <DetailedElementCard key={el.nodeId} element={el} screen={screen} assets={assets} viewport={viewport} onViewInFlow={onViewInFlow} />
      ))}
    </div>
  );
}

// ===== Detailed Element Card =====

function DetailedElementCard({ element: el, screen, assets, viewport, onViewInFlow: _onViewInFlow }: {
  element: ElementSpec; screen: Screen;
  assets: ComponentTemplate[]; viewport: { width: number; height: number };
  onViewInFlow: (edgeId: string) => void;
}) {
  return (
    <div className="component-spec">
      <div className="component-spec-header">
        <span className="component-spec-name">{el.name}</span>
        <span className="component-spec-type">{el.type}</span>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {/* Element preview */}
        <div style={{ flexShrink: 0 }}>
          <MiniNodePreview node={el.node} screen={screen} assets={assets} viewport={viewport} maxWidth={200} />
        </div>
        <div style={{ flex: 1, fontSize: 13, color: '#475569' }}>
          {el.description}
        </div>
      </div>

      {/* States */}
      {el.stateDescriptions.length > 1 && (
        <div className="spec-section">
          <div className="spec-section-label">视觉状态</div>
          {el.stateDescriptions.map((s) => (
            <div key={s.name} className="spec-state-row">
              <span className="spec-state-name">{s.name}</span>
              <span className="spec-state-desc">{s.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Feature rows table */}
      {el.features.length > 0 && (
        <div className="spec-section">
          <div className="spec-section-label">功能规格</div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {el.features.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 12px 6px 0', fontWeight: 500, color: '#334155', whiteSpace: 'nowrap', verticalAlign: 'top', width: 140 }}>
                    {f.label}
                  </td>
                  <td style={{ padding: '6px 0', color: '#475569', lineHeight: 1.6 }}>
                    {f.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== Screenshot Renderers =====

function MiniPagePreview({ screen, assets, viewport, scale = 0.25 }: {
  screen: Screen; assets: ComponentTemplate[];
  viewport: { width: number; height: number }; scale?: number;
}) {
  const w = Math.round(viewport.width * scale);
  const h = Math.round(viewport.height * scale);
  return (
    <div style={{
      width: w, height: h, overflow: 'hidden', borderRadius: 8,
      border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      background: screen.backgroundColor || '#fff',
    }}>
      <div style={{ width: viewport.width, height: viewport.height, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <SchemaRenderer screen={screen} assets={assets} staticAssetOrigin={getEditorStaticAssetOrigin()} hideGhostNodes editorCanvasOptimize={false} />
      </div>
    </div>
  );
}

function MiniNodePreview({ node, screen, assets, viewport, maxWidth = 300 }: {
  node: ComponentNode; screen: Screen;
  assets: ComponentTemplate[]; viewport: { width: number; height: number };
  maxWidth?: number;
}) {
  const isolated = useMemo(
    () => buildIsolatedScreen(screen, node, viewport.width),
    [screen, node, viewport.width],
  );

  return (
    <div style={{
      display: 'inline-block', overflow: 'hidden', borderRadius: 8,
      border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      background: screen.backgroundColor || '#fff', maxWidth, padding: 8,
    }}>
      <div style={{ pointerEvents: 'none', maxWidth: maxWidth - 16 }}>
        <SchemaRenderer screen={isolated} assets={assets} staticAssetOrigin={getEditorStaticAssetOrigin()} hideGhostNodes editorCanvasOptimize={false} />
      </div>
    </div>
  );
}

// ===== Helpers =====

function FlowLink({ edgeId, onClick }: { edgeId: string; onClick: (id: string) => void }) {
  return (
    <span className="prd-flow-link" onClick={() => onClick(edgeId)}>
      <ApartmentOutlined />
    </span>
  );
}

function dedup<T extends { edgeId: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  return arr.filter((a) => { if (seen.has(a.edgeId)) return false; seen.add(a.edgeId); return true; });
}

function triggerColor(trigger: string): string {
  if (['click', 'hover', 'focus', 'blur', 'longPress'].includes(trigger)) return 'blue';
  if (trigger.startsWith('screen')) return 'purple';
  if (trigger.startsWith('scroll')) return 'green';
  return 'default';
}
