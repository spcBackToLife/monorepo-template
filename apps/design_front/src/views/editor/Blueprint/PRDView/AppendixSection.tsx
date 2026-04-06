import { Tag } from 'antd';
import type { BlueprintIndices } from '../types';

interface Props {
  indices: BlueprintIndices;
}

export function AppendixSection({ indices }: Props) {
  return (
    <div className="prd-chapter">
      <h2 className="prd-chapter-title">附录 · 完整索引</h2>

      {/* A. Event Index */}
      {indices.events.length > 0 && (
        <div className="prd-appendix-group">
          <h3 className="prd-section-title">A. 事件索引（共 {indices.events.length} 个）</h3>
          <table className="prd-event-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>页面</th>
                <th style={th}>元素</th>
                <th style={th}>触发器</th>
                <th style={th}>行为描述</th>
              </tr>
            </thead>
            <tbody>
              {indices.events.map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>—</td>
                  <td style={td}>{e.nodeName}</td>
                  <td style={td}><Tag style={{ fontSize: 10 }}>{e.trigger}</Tag></td>
                  <td style={td}>{e.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* B. State Variables Index */}
      {indices.stateVars.length > 0 && (
        <div className="prd-appendix-group">
          <h3 className="prd-section-title">B. 状态变量索引（共 {indices.stateVars.length} 个）</h3>
          <table className="prd-event-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>名称</th>
                <th style={th}>标签</th>
                <th style={th}>作用域</th>
                <th style={th}>可选值</th>
                <th style={th}>写入者</th>
                <th style={th}>消费者</th>
              </tr>
            </thead>
            <tbody>
              {indices.stateVars.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{s.name}</td>
                  <td style={td}>{s.label}</td>
                  <td style={td}>{s.scope}</td>
                  <td style={td}>{s.values.join(', ')}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{s.writerCount}</td>
                  <td style={{ ...td, textAlign: 'center' }}>{s.readerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* C. API Index */}
      {indices.apis.length > 0 && (
        <div className="prd-appendix-group">
          <h3 className="prd-section-title">C. API 索引（共 {indices.apis.length} 个）</h3>
          <table className="prd-event-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>页面</th>
                <th style={th}>接口名称</th>
                <th style={th}>方法</th>
                <th style={th}>路径</th>
                <th style={th}>调用者</th>
              </tr>
            </thead>
            <tbody>
              {indices.apis.map((a, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{a.screenName}</td>
                  <td style={td}>{a.name}</td>
                  <td style={td}><Tag color="blue" style={{ fontSize: 10 }}>{a.method}</Tag></td>
                  <td style={td}>{a.path}</td>
                  <td style={td}>{a.callerNodes.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* D. Data Bindings Index */}
      {indices.dataBindings.length > 0 && (
        <div className="prd-appendix-group">
          <h3 className="prd-section-title">D. 数据绑定索引（共 {indices.dataBindings.length} 个）</h3>
          <table className="prd-event-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={th}>页面</th>
                <th style={th}>组件</th>
                <th style={th}>属性</th>
                <th style={th}>表达式</th>
              </tr>
            </thead>
            <tbody>
              {indices.dataBindings.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={td}>{d.screenName}</td>
                  <td style={td}>{d.nodeName}</td>
                  <td style={td}>{d.propKey}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#6366f1' }}>{d.expression}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '8px 12px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 12,
  color: '#64748b',
};

const td: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 12,
  color: '#475569',
};
