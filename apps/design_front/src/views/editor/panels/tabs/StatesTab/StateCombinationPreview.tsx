import { useMemo, useState } from 'react';
import { Button } from 'antd';
import { observer } from 'mobx-react-lite';
import { editorStore } from '@/stores/editor';

const INTERACTION_PREVIEW_OPTIONS: { label: string; value: string }[] = [
  { label: '默认（不模拟）', value: 'normal' },
  { label: 'hover', value: 'hover' },
  { label: 'active', value: 'active' },
  { label: 'focus', value: 'focus' },
  { label: 'disabled', value: 'disabled' },
];

const MAX_MATRIX_ROWS = 48;

function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.some((a) => a.length === 0)) return [];
  return arrays.reduce(
    (acc, arr) => acc.flatMap((prefix) => arr.map((x) => [...prefix, x])),
    [[]] as T[][],
  );
}

/**
 * W6-042：状态组合预览 — 全局状态笛卡尔矩阵 + 选中节点交互状态临时预览（不写入 Schema）
 */
export const StateCombinationPreview = observer(function StateCombinationPreview() {
  const screen = editorStore.activeScreen;
  const globalVars = screen?.domainStates ?? [];
  const dataSources = screen?.dataSources ?? [];
  const [matrixOpen, setMatrixOpen] = useState(true);

  const { rows, totalProduct, truncated } = useMemo(() => {
    if (globalVars.length === 0) {
      return { rows: [] as string[][], totalProduct: 1, truncated: false };
    }
    const valueArrays = globalVars.map((g) => g.values.map((v) => v.value));
    const totalProduct = valueArrays.reduce((m, a) => m * Math.max(1, a.length), 1);
    const full = cartesianProduct(valueArrays);
    const truncated = full.length > MAX_MATRIX_ROWS;
    const rows = full.slice(0, MAX_MATRIX_ROWS);
    return { rows, totalProduct, truncated };
  }, [globalVars]);

  const pin = editorStore.previewInteractionState ?? 'normal';
  const selectedId = editorStore.selectedNodeIds.length === 1 ? editorStore.selectedNodeIds[0] : null;

  const applyRow = (row: string[]) => {
    const next: Record<string, string> = {};
    globalVars.forEach((g, i) => {
      if (row[i] !== undefined) next[g.name] = row[i]!;
    });
    editorStore.applyGlobalStateCombo(next);
  };

  const comboCount =
    globalVars.length > 0
      ? `${dataSources.length || 1} 数据源 × ${totalProduct} 组全局状态 × 视口（工具栏切换）`
      : '';

  return (
    <div className="border-t border-gray-100 mt-1 pt-2">
      <button
        type="button"
        className="w-full flex items-center justify-between py-1 text-xs font-medium text-gray-700 hover:text-gray-900"
        onClick={() => setMatrixOpen(!matrixOpen)}
      >
        <span>组合预览（W6-042）</span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${matrixOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {matrixOpen && (
        <div className="flex flex-col gap-2 pb-1">
          <p className="text-[10px] text-gray-500 leading-snug m-0">
            切换下方组合会更新画布运行时全局状态；交互状态预览仅作用于当前选中节点，不修改 Schema。
          </p>

          <div>
            <div className="text-[10px] text-gray-600 mb-1">交互状态预览（选中节点）</div>
            {!selectedId ? (
              <div className="text-[10px] text-gray-400">请先单选画布上的一个节点</div>
            ) : (
              <select
                className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] bg-white outline-none focus:border-blue-400"
                value={pin}
                onChange={(e) => {
                  const v = e.target.value;
                  editorStore.setPreviewInteractionState(v === 'normal' ? null : v);
                }}
              >
                {INTERACTION_PREVIEW_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {globalVars.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-600">全局状态组合</span>
                <span className="text-[10px] text-gray-400">
                  共 {rows.length}
                  {truncated ? ` / ${totalProduct}+` : ` 组`}
                </span>
              </div>
              <div className="max-h-40 overflow-auto border border-gray-100 rounded">
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left px-1.5 py-1 font-medium w-8">#</th>
                      {globalVars.map((g) => (
                        <th key={g.name} className="text-left px-1 py-1 font-normal">
                          {g.name}
                        </th>
                      ))}
                      <th className="w-14 px-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri} className="border-t border-gray-50 hover:bg-blue-50/40">
                        <td className="px-1.5 py-0.5 text-gray-400">{ri + 1}</td>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-1 py-0.5 font-mono text-gray-700">
                            {cell}
                          </td>
                        ))}
                        <td className="px-0.5 py-0.5">
                          <button
                            type="button"
                            className="text-blue-600 hover:underline"
                            onClick={() => applyRow(row)}
                          >
                            应用
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {truncated && (
                <p className="text-[10px] text-amber-600 mt-1 m-0">仅显示前 {MAX_MATRIX_ROWS} 行，请减少变量取值数以完整浏览。</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-500">
              {comboCount ? `全景维度提示：${comboCount}（数据集与视口请在工具栏 / 数据 Tab 切换）` : '暂无全局变量时仅可用手动切换数据集与视口。'}
            </span>
            <Button
              size="small"
              type="default"
              className="text-[11px]"
              onClick={() => editorStore.focusRightPanelSection('data')}
            >
              打开数据 Tab（数据集 / JSON）
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
