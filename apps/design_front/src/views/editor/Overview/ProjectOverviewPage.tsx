import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { Button, Tabs, Select, Tooltip, Tag, Empty, Modal } from 'antd';
import {
  ArrowLeftOutlined,
  DatabaseOutlined,
  PictureOutlined,
  ApiOutlined,
  PartitionOutlined,
  CloudServerOutlined,
  LinkOutlined,
  ZoomInOutlined,
} from '@ant-design/icons';
import { editorStore } from '@/stores/editor';
import { API_BASE } from '@/api/client';
import { materialProjectApi } from '@/api/materialProject';
import type { MaterialProjectSummary } from '@/api/materialProject';
import type { Screen, ComponentNode } from '@globallink/design-schema';
import './overview.css';

// ===================== Helpers =====================

/** Resolve a thumbnail/asset URL: if relative, prefix with API_BASE */
function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${API_BASE}${url}`;
}

/**
 * Get the best available preview image for a material project.
 * Priority: thumbnailUrl > exported material image (from uploads)
 */
function getMaterialPreviewUrl(
  m: { thumbnailUrl: string | null; exportedMaterialId: string | null; projectId: string },
): string | null {
  // 1. thumbnailUrl (if exists)
  const thumb = resolveUrl(m.thumbnailUrl);
  if (thumb) return thumb;

  // 2. Fallback: exported material image file
  //    /uploads is a separate proxy route (not under /api), so use root-relative path
  //    Try png first; onError handler in img tag will swap to svg
  if (m.exportedMaterialId) {
    return `/uploads/materials/${m.projectId}/${m.exportedMaterialId}.png`;
  }

  return null;
}

/** Get SVG fallback URL for when png fails */
function getMaterialSvgFallbackUrl(
  m: { exportedMaterialId: string | null; projectId: string },
): string | null {
  if (!m.exportedMaterialId) return null;
  return `/uploads/materials/${m.projectId}/${m.exportedMaterialId}.svg`;
}

/** Walk all nodes in a tree */
function walkNodes(node: ComponentNode, callback: (n: ComponentNode) => void) {
  callback(node);
  for (const child of node.children ?? []) {
    walkNodes(child, callback);
  }
}

/** Find node name by id */
function findNodeName(node: ComponentNode, id: string): string | null {
  if (node.id === id) return node.name ?? node.type ?? null;
  for (const child of node.children ?? []) {
    const found = findNodeName(child, id);
    if (found) return found;
  }
  return null;
}

/** Collect all events with nav.go actions from a screen */
function collectNavigationEvents(screen: Screen) {
  const events: Array<{
    nodeId: string;
    nodeName: string;
    trigger: string;
    targetScreenId: string;
    targetScreenName: string | null;
  }> = [];

  const allScreens = editorStore.screens;

  walkNodes(screen.rootNode, (node) => {
    for (const evt of node.events ?? []) {
      for (const action of evt.actions ?? []) {
        if (action.type === 'nav.go' && action.targetScreenId) {
          const targetScreen = allScreens.find((s) => s.id === action.targetScreenId);
          events.push({
            nodeId: node.id,
            nodeName: node.name ?? node.type ?? node.id,
            trigger: evt.trigger,
            targetScreenId: action.targetScreenId,
            targetScreenName: targetScreen?.name ?? null,
          });
        }
      }
    }
  });

  return events;
}

/** Collect all events from a screen */
function collectAllEvents(screen: Screen) {
  const events: Array<{
    nodeId: string;
    nodeName: string;
    trigger: string;
    actions: Array<{ type: string }>;
  }> = [];

  walkNodes(screen.rootNode, (node) => {
    for (const evt of node.events ?? []) {
      if (evt.actions && evt.actions.length > 0) {
        events.push({
          nodeId: node.id,
          nodeName: node.name ?? node.type ?? node.id,
          trigger: evt.trigger,
          actions: evt.actions.map((a) => ({ type: a.type })),
        });
      }
    }
  });

  return events;
}

// ===================== Material Tab =====================

interface MaterialWithMeta extends MaterialProjectSummary {
  nodeName: string | null;
  screenName: string;
}

const MaterialTab = observer(function MaterialTab() {
  const project = editorStore.project;
  const screens = editorStore.screens;
  const [materials, setMaterials] = useState<MaterialWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNodeId, setFilterNodeId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MaterialWithMeta | null>(null);

  // Collect all nodes that might have materials
  const nodeOptions = useMemo(() => {
    const opts: Array<{ value: string; label: string; screenName: string }> = [];
    for (const screen of screens) {
      walkNodes(screen.rootNode, (node) => {
        if (node.name || node.type !== 'div') {
          opts.push({
            value: node.id,
            label: `${node.name ?? node.type} (${screen.name})`,
            screenName: screen.name,
          });
        }
      });
    }
    return opts;
  }, [screens]);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const list = await materialProjectApi.list(project!.id);
        if (cancelled) return;

        // Enrich with node names
        const enriched: MaterialWithMeta[] = list.map((mp) => {
          let nodeName: string | null = null;
          let screenName = '';
          if (mp.targetNodeId) {
            for (const screen of screens) {
              const name = findNodeName(screen.rootNode, mp.targetNodeId);
              if (name) {
                nodeName = name;
                screenName = screen.name;
                break;
              }
            }
          }
          return { ...mp, nodeName, screenName };
        });

        // Only show materials that have actual content (exported image or thumbnail)
        const valid = enriched.filter(
          (m) => m.thumbnailUrl || m.exportedMaterialId,
        );

        setMaterials(valid);
      } catch (e) {
        console.error('Failed to load materials', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [project, screens]);

  const filtered = useMemo(() => {
    if (!filterNodeId) return materials;
    return materials.filter((m) => m.targetNodeId === filterNodeId);
  }, [materials, filterNodeId]);

  if (loading) {
    return <div className="overview-empty">加载素材中...</div>;
  }

  if (materials.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无素材工程"
        style={{ paddingTop: 60 }}
      />
    );
  }

  return (
    <div>
      <div className="overview-filter-bar">
        <span className="overview-filter-bar__label">筛选组件:</span>
        <Select
          allowClear
          placeholder="全部组件"
          style={{ width: 240 }}
          size="small"
          value={filterNodeId}
          onChange={(v) => setFilterNodeId(v ?? null)}
          showSearch
          optionFilterProp="label"
          options={[
            { value: null as unknown as string, label: '全部' },
            ...nodeOptions.map((n) => ({ value: n.value, label: n.label })),
          ]}
        />
        <span className="overview-topbar__badge">{filtered.length} 个素材</span>
      </div>

      <div className="overview-cards">
        {filtered.map((m) => {
          const thumbSrc = getMaterialPreviewUrl(m);
          return (
            <div
              key={m.id}
              className="overview-card"
              onClick={() => setDetailItem(m)}
            >
              <div className="overview-card__thumbnail">
                {thumbSrc ? (
                  <>
                    <img
                      src={thumbSrc}
                      alt={m.name}
                      onError={(e) => {
                        // If png fails, try svg fallback
                        const svgUrl = getMaterialSvgFallbackUrl(m);
                        const img = e.currentTarget;
                        if (svgUrl && !img.src.endsWith('.svg')) {
                          img.src = svgUrl;
                        }
                      }}
                    />
                    <span className="overview-card__zoom-hint">
                      <ZoomInOutlined />
                    </span>
                  </>
                ) : (
                  <span className="overview-card__thumbnail--empty">
                    <PictureOutlined style={{ fontSize: 24, marginBottom: 4 }} />
                    <br />
                    暂无预览
                  </span>
                )}
              </div>
              <div className="overview-card__body">
                <div className="overview-card__name">{m.name}</div>
                <div className="overview-card__meta">
                  {m.nodeName && (
                    <span className="overview-card__tag">
                      {m.nodeName}
                    </span>
                  )}
                  {m.screenName && (
                    <span className="overview-card__tag">
                      {m.screenName}
                    </span>
                  )}
                  <span className="overview-card__tag">
                    {m.canvasWidth}x{m.canvasHeight}
                  </span>
                  {m.tags?.map((tag) => (
                    <span key={tag} className="overview-card__tag overview-card__tag--active">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal — 图片为主 */}
      <Modal
        open={!!detailItem}
        onCancel={() => setDetailItem(null)}
        footer={null}
        width={720}
        title={null}
        centered
        closable
        styles={{ body: { padding: 0 } }}
      >
        {detailItem && (() => {
          const thumbSrc = getMaterialPreviewUrl(detailItem);
          return (
            <div className="overview-detail-modal">
              {/* 图片主区域 */}
              <div className="overview-detail-modal__image-area">
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt={detailItem.name}
                    className="overview-detail-modal__img"
                    onError={(e) => {
                      const svgUrl = getMaterialSvgFallbackUrl(detailItem);
                      const img = e.currentTarget;
                      if (svgUrl && !img.src.endsWith('.svg')) {
                        img.src = svgUrl;
                      }
                    }}
                  />
                ) : (
                  <div className="overview-detail-modal__placeholder">
                    <PictureOutlined style={{ fontSize: 64, color: '#cbd5e1' }} />
                    <div style={{ marginTop: 12, color: '#94a3b8', fontSize: 13 }}>暂无预览图</div>
                  </div>
                )}
              </div>

              {/* 底部信息条 */}
              <div className="overview-detail-modal__footer">
                <div className="overview-detail-modal__name">{detailItem.name}</div>
                <div className="overview-detail-modal__tags">
                  <span className="overview-detail-modal__tag">
                    {detailItem.canvasWidth} x {detailItem.canvasHeight}
                  </span>
                  {detailItem.referenceFrameWidth && detailItem.referenceFrameHeight && (
                    <span className="overview-detail-modal__tag">
                      参考框 {detailItem.referenceFrameWidth}x{detailItem.referenceFrameHeight}
                    </span>
                  )}
                  {detailItem.nodeName && (
                    <span className="overview-detail-modal__tag overview-detail-modal__tag--purple">
                      {detailItem.nodeName}
                    </span>
                  )}
                  {detailItem.screenName && (
                    <span className="overview-detail-modal__tag overview-detail-modal__tag--blue">
                      {detailItem.screenName}
                    </span>
                  )}
                  {detailItem.tags?.map((t) => (
                    <span key={t} className="overview-detail-modal__tag overview-detail-modal__tag--blue">
                      {t}
                    </span>
                  ))}
                  <span className="overview-detail-modal__tag">v{detailItem.version}</span>
                </div>
                <div className="overview-detail-modal__time">
                  更新于 {new Date(detailItem.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
});

// ===================== API Tab =====================

const ApiTab = observer(function ApiTab() {
  const screens = editorStore.screens;

  const apiSources = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      screenName: string;
      screenId: string;
      method: string;
      path: string;
      autoFetchOnEnter: boolean;
      scenarios: Array<{ id: string; name: string; statusCode: number; isActive: boolean }>;
    }> = [];

    for (const screen of screens) {
      for (const ds of screen.dataSources ?? []) {
        if (ds.type === 'api' && ds.endpoint) {
          const activeScenarioId = ds.mock?.activeScenarioId;
          list.push({
            id: ds.id,
            name: ds.name,
            screenName: screen.name,
            screenId: screen.id,
            method: ds.endpoint.method ?? 'GET',
            path: ds.endpoint.path ?? '',
            autoFetchOnEnter: ds.autoFetchOnEnter ?? false,
            scenarios: (ds.mock?.scenarios ?? []).map((sc) => ({
              id: sc.id,
              name: sc.name,
              statusCode: sc.statusCode ?? 200,
              isActive: sc.id === activeScenarioId,
            })),
          });
        }
      }
    }

    return list;
  }, [screens]);

  if (apiSources.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无 API 数据源"
        style={{ paddingTop: 60 }}
      />
    );
  }

  return (
    <div className="overview-api-list">
      {apiSources.map((api) => (
        <div key={`${api.screenId}-${api.id}`} className="overview-api-card">
          <div className="overview-api-card__header">
            <span className={`overview-api-card__method overview-api-card__method--${api.method.toLowerCase()}`}>
              {api.method}
            </span>
            <span className="overview-api-card__name">{api.name}</span>
            {api.autoFetchOnEnter && (
              <Tag color="blue" style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                自动请求
              </Tag>
            )}
          </div>
          <div className="overview-api-card__path">{api.path || '(未配置路径)'}</div>
          {api.scenarios.length > 0 && (
            <div className="overview-api-card__scenarios">
              {api.scenarios.map((sc) => (
                <span
                  key={sc.id}
                  className={`overview-api-card__scenario ${sc.isActive ? 'overview-api-card__scenario--active' : ''}`}
                >
                  {sc.name} ({sc.statusCode})
                </span>
              ))}
            </div>
          )}
          <div className="overview-api-card__screen">
            <CloudServerOutlined style={{ marginRight: 4 }} />
            页面: {api.screenName}
          </div>
        </div>
      ))}
    </div>
  );
});

// ===================== State Tab =====================

const StateTab = observer(function StateTab() {
  const screens = editorStore.screens;
  const project = editorStore.project;

  const globalViewVars = useMemo(() => {
    const viewDefs = project?.globalStateInit?.view ?? {};
    return Object.entries(viewDefs).map(([key, def]) => ({
      ...def,
      key,
    }));
  }, [project]);

  const screenStates = useMemo(() => {
    return screens.map((screen) => {
      const viewVars = Object.entries(screen.stateInit?.view ?? {}).map(([name, def]) => ({
        name,
        label: def.label ?? name,
        defaultValue: def.defaultValue,
        hasEnum: Array.isArray(def.enum) && def.enum.length > 0,
        enumCount: def.enum?.length ?? 0,
      }));

      const dataInits = Object.entries(screen.stateInit?.data ?? {}).map(([key, val]) => ({
        key,
        value: val,
      }));

      const staticSources = (screen.dataSources ?? []).filter((ds) => ds.type === 'static');

      return {
        screenId: screen.id,
        screenName: screen.name,
        viewVars,
        dataInits,
        staticSources,
      };
    });
  }, [screens]);

  const hasAnyContent = globalViewVars.length > 0 || screenStates.some(
    (s) => s.viewVars.length > 0 || s.dataInits.length > 0 || s.staticSources.length > 0,
  );

  if (!hasAnyContent) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无状态/数据定义"
        style={{ paddingTop: 60 }}
      />
    );
  }

  return (
    <div>
      {/* Global view variables */}
      {globalViewVars.length > 0 && (
        <div className="overview-state-section">
          <div className="overview-state-section__title">
            <PartitionOutlined /> 全局 View 变量
          </div>
          <table className="overview-state-table">
            <thead>
              <tr>
                <th>变量名</th>
                <th>标签</th>
                <th>默认值</th>
                <th>可选项</th>
              </tr>
            </thead>
            <tbody>
              {globalViewVars.map((v) => (
                <tr key={v.key}>
                  <td><code>{v.name}</code></td>
                  <td>{v.label ?? '-'}</td>
                  <td className="overview-state-table__value">
                    {JSON.stringify(v.defaultValue)}
                  </td>
                  <td>
                    {Array.isArray(v.enum) && v.enum.length > 0
                      ? v.enum.map((e: { label: string }) => e.label).join(', ')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-screen states */}
      {screenStates.map((ss) => {
        if (ss.viewVars.length === 0 && ss.dataInits.length === 0 && ss.staticSources.length === 0) {
          return null;
        }
        return (
          <div key={ss.screenId} className="overview-state-section">
            <div className="overview-state-section__title">
              <DatabaseOutlined /> {ss.screenName}
            </div>

            {/* View variables */}
            {ss.viewVars.length > 0 && (
              <table className="overview-state-table" style={{ marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th>View 变量</th>
                    <th>标签</th>
                    <th>默认值</th>
                    <th>Enum</th>
                  </tr>
                </thead>
                <tbody>
                  {ss.viewVars.map((v) => (
                    <tr key={v.name}>
                      <td><code>{v.name}</code></td>
                      <td>{v.label}</td>
                      <td className="overview-state-table__value">
                        {JSON.stringify(v.defaultValue)}
                      </td>
                      <td>{v.hasEnum ? `${v.enumCount} 项` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Data init */}
            {ss.dataInits.length > 0 && (
              <table className="overview-state-table" style={{ marginBottom: 12 }}>
                <thead>
                  <tr>
                    <th>Data Key</th>
                    <th>初始值</th>
                  </tr>
                </thead>
                <tbody>
                  {ss.dataInits.map((d) => (
                    <tr key={d.key}>
                      <td><code>state.data.{d.key}</code></td>
                      <td className="overview-state-table__value">
                        {typeof d.value === 'object'
                          ? JSON.stringify(d.value).slice(0, 100)
                          : String(d.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Static data sources */}
            {ss.staticSources.length > 0 && (
              <table className="overview-state-table">
                <thead>
                  <tr>
                    <th>静态数据源</th>
                    <th>初始数据</th>
                  </tr>
                </thead>
                <tbody>
                  {ss.staticSources.map((ds) => (
                    <tr key={ds.id}>
                      <td><code>{ds.name}</code></td>
                      <td className="overview-state-table__value">
                        {ds.type === 'static' && ds.initial
                          ? JSON.stringify(ds.initial).slice(0, 120)
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
});

// ===================== Navigation/Events Tab =====================

const NavigationTab = observer(function NavigationTab() {
  const screens = editorStore.screens;

  const navData = useMemo(() => {
    return screens.map((screen) => {
      const navEvents = collectNavigationEvents(screen);
      const allEvents = collectAllEvents(screen);
      return {
        screenId: screen.id,
        screenName: screen.name,
        navEvents,
        allEvents,
      };
    });
  }, [screens]);

  const hasAny = navData.some((d) => d.allEvents.length > 0);

  if (!hasAny) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="暂无事件绑定"
        style={{ paddingTop: 60 }}
      />
    );
  }

  return (
    <div className="overview-nav-flow">
      {navData.map((sd) => {
        if (sd.allEvents.length === 0) return null;
        return (
          <div key={sd.screenId} className="overview-nav-card">
            <div className="overview-nav-card__title">
              <PartitionOutlined style={{ color: '#6366f1' }} />
              {sd.screenName}
              <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>
                ({sd.allEvents.length} 个事件)
              </span>
            </div>

            {/* Navigation events highlighted */}
            {sd.navEvents.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>
                  <LinkOutlined style={{ marginRight: 4 }} />
                  页面跳转
                </div>
                <div className="overview-nav-card__events">
                  {sd.navEvents.map((nav, i) => (
                    <div key={i} className="overview-nav-card__event">
                      <span className="overview-nav-card__trigger">{nav.trigger}</span>
                      <span style={{ fontSize: 12, color: '#334155' }}>{nav.nodeName}</span>
                      <span className="overview-nav-card__arrow">→</span>
                      <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 500 }}>
                        {nav.targetScreenName ?? nav.targetScreenId}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All events */}
            <div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>
                全部事件
              </div>
              <div className="overview-nav-card__events">
                {sd.allEvents.map((evt, i) => (
                  <div key={i} className="overview-nav-card__event">
                    <span className="overview-nav-card__trigger">{evt.trigger}</span>
                    <span style={{ fontSize: 12, color: '#334155' }}>{evt.nodeName}</span>
                    <span className="overview-nav-card__action">
                      {evt.actions.map((a) => a.type).join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ===================== Main Page =====================

export const ProjectOverviewPage = observer(function ProjectOverviewPage() {
  const navigate = useNavigate();
  const project = editorStore.project;
  const screens = editorStore.screens;

  // Esc to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  if (!project) {
    return (
      <div className="overview-page">
        <div className="overview-empty">项目未加载</div>
      </div>
    );
  }

  // Count stats
  const totalDataSources = screens.reduce(
    (sum, s) => sum + (s.dataSources?.length ?? 0), 0,
  );

  const tabItems = [
    {
      key: 'materials',
      label: (
        <span>
          <PictureOutlined style={{ marginRight: 6 }} />
          素材
        </span>
      ),
      children: <MaterialTab />,
    },
    {
      key: 'api',
      label: (
        <span>
          <ApiOutlined style={{ marginRight: 6 }} />
          API 接口
        </span>
      ),
      children: <ApiTab />,
    },
    {
      key: 'state',
      label: (
        <span>
          <DatabaseOutlined style={{ marginRight: 6 }} />
          状态/数据
        </span>
      ),
      children: <StateTab />,
    },
    {
      key: 'navigation',
      label: (
        <span>
          <PartitionOutlined style={{ marginRight: 6 }} />
          导航/事件
        </span>
      ),
      children: <NavigationTab />,
    },
  ];

  return (
    <div className="overview-page">
      {/* Top Bar */}
      <div className="overview-topbar">
        <Tooltip title="返回编辑器 (Esc)">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            返回编辑器
          </Button>
        </Tooltip>

        <div className="overview-topbar__title">
          <DatabaseOutlined className="overview-topbar__icon" />
          <span className="overview-topbar__text">项目资源总览</span>
        </div>

        <span className="overview-topbar__badge">
          {screens.length} 页面
        </span>
        <span className="overview-topbar__badge">
          {totalDataSources} 数据源
        </span>
      </div>

      {/* Content */}
      <div className="overview-content">
        <Tabs
          className="overview-tabs"
          items={tabItems}
          size="middle"
        />
      </div>
    </div>
  );
});
