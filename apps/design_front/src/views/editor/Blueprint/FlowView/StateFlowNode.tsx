import { Handle, Position, type NodeProps } from '@xyflow/react';

export function StateFlowNode({ data }: NodeProps) {
  const nodeType = String(data.nodeType ?? '');
  const className = nodeType === 'api' ? 'flow-api-node' : 'flow-state-node';
  const nameClass = nodeType === 'api' ? 'flow-api-node-name' : 'flow-state-node-name';
  const values = data.values as string[] | undefined;
  const method = data.method as string | undefined;
  const path = data.path as string | undefined;

  return (
    <div className={className}>
      <Handle type="target" position={Position.Left} />
      <div className={nameClass}>
        {nodeType === 'api' && '📡 '}
        {nodeType === 'domainState' && '◇ '}
        {nodeType === 'envState' && '🌐 '}
        {String(data.label ?? '')}
      </div>
      {values && values.length > 0 && (
        <div className="flow-state-node-values">
          {values.join(' / ')}
        </div>
      )}
      {method && (
        <div className="flow-state-node-values">
          {method} {path ?? ''}
        </div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
