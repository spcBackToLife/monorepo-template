import { _Tag } from 'antd';
import type { GlobalsAnalysis } from '../types';

interface Props {
  globals: GlobalsAnalysis;
}

export function GlobalsSection({ globals }: Props) {
  return (
    <div className="prd-chapter">
      <h2 className="prd-chapter-title">第二章 · 全局定义</h2>

      {/* Environment States */}
      {globals.envStates.length > 0 && (
        <>
          <h3 className="prd-section-title">2.1 环境变量</h3>
          {globals.envStates.map((es) => (
            <div key={es.variable.id} className="prd-env-card">
              <div className="prd-env-name">
                {es.variable.label}（{es.variable.name}）
              </div>
              <div className="prd-env-values">
                {es.variable.values.map((v) => (
                  <span
                    key={v.value}
                    className={`prd-env-value-tag ${v.value === es.variable.defaultValue ? 'prd-env-value-tag--default' : ''}`}
                  >
                    {v.label}
                    {v.value === es.variable.defaultValue && ' (默认)'}
                  </span>
                ))}
              </div>
              <div className="prd-env-consumers">
                影响 {es.consumerCount} 个组件
                {es.consumersByScreen.length > 0 && (
                  <>：{es.consumersByScreen.map((c) => `${c.screenName}(${c.nodeNames.length})`).join('、')}</>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Component Templates */}
      {globals.templates.length > 0 && (
        <>
          <h3 className="prd-section-title">2.2 组件资产库</h3>
          <table className="prd-event-table" style={{ marginTop: 8 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#64748b' }}>组件名称</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#64748b' }}>分类</th>
                <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: '#64748b' }}>使用次数</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#64748b' }}>使用位置</th>
              </tr>
            </thead>
            <tbody>
              {globals.templates.map((t) => (
                <tr key={t.template.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 500 }}>{t.template.name}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>{t.template.category}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, textAlign: 'center' }}>{t.usageCount}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12, color: '#64748b' }}>{t.usedInScreens.join('、') || '未使用'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {globals.envStates.length === 0 && globals.templates.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: 13 }}>暂无全局定义</div>
      )}
    </div>
  );
}
