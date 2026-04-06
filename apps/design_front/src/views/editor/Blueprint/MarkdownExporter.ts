import type { BlueprintAnalysis } from './types';

export function exportToMarkdown(analysis: BlueprintAnalysis, projectName: string): string {
  const lines: string[] = [];
  const s = analysis.overview.stats;

  lines.push(`# ${projectName} — 产品需求文档`);
  lines.push(`> 自动生成于 ${new Date().toISOString().slice(0, 10)}，来源：DesignUI Schema\n`);

  // Overview
  lines.push(`## 第一章 · 产品概览\n`);
  lines.push(`| 指标 | 数值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 产品名称 | ${analysis.overview.name} |`);
  lines.push(`| 目标平台 | ${analysis.overview.platform} (${analysis.overview.viewport.width}×${analysis.overview.viewport.height}) |`);
  lines.push(`| 页面数 | ${s.screenCount} |`);
  lines.push(`| 组件数 | ${s.componentCount} |`);
  lines.push(`| 交互事件数 | ${s.eventCount} |`);
  lines.push(`| 状态变量数 | ${s.stateVarCount} |`);
  lines.push(`| API 数 | ${s.apiCount} |\n`);

  // Globals
  if (analysis.globals.envStates.length > 0 || analysis.globals.templates.length > 0) {
    lines.push(`## 第二章 · 全局定义\n`);
    for (const es of analysis.globals.envStates) {
      lines.push(`### 环境变量：${es.variable.label}（\`${es.variable.name}\`）`);
      lines.push(`可选值：${es.variable.values.map((v) => `${v.label}${v.value === es.variable.defaultValue ? ' *(默认)*' : ''}`).join(' / ')}`);
      lines.push(`影响 ${es.consumerCount} 个组件\n`);
    }
  }

  // Screens
  for (let i = 0; i < analysis.screens.length; i++) {
    const sa = analysis.screens[i];
    lines.push(`## 第${i + 3}章 · ${sa.screen.name}\n`);
    lines.push(`> ${sa.nodeCount} 组件 · ${sa.eventCount} 事件 · ${(sa.screen.domainStates ?? []).length} 状态变量\n`);

    if (sa.incomingNavs.length > 0) lines.push(`**入口来源**：${sa.incomingNavs.map((n) => n.label).join('；')}\n`);
    if (sa.outgoingNavs.length > 0) lines.push(`**出口去向**：${sa.outgoingNavs.map((n) => n.label).join('；')}\n`);

    // Modules
    for (let mi = 0; mi < sa.modules.length; mi++) {
      const mod = sa.modules[mi];
      lines.push(`### ${mi + 1}. ${mod.name}\n`);

      for (const el of mod.elements) {
        if (!el.isDetailed) continue;

        lines.push(`#### ${el.name}（\`${el.type}\`）\n`);
        lines.push(`${el.description}\n`);

        if (el.features.length > 0) {
          lines.push(`| 功能点 | 描述 |`);
          lines.push(`|--------|------|`);
          for (const f of el.features) {
            lines.push(`| ${f.label} | ${f.value.replace(/\n/g, ' ')} |`);
          }
          lines.push('');
        }

        if (el.stateDescriptions.length > 1) {
          lines.push(`**视觉状态**：`);
          for (const sd of el.stateDescriptions) {
            lines.push(`- **${sd.name}**：${sd.description}`);
          }
          lines.push('');
        }
      }
    }

    // States
    if (sa.stateAnalysis.length > 0) {
      lines.push(`### 状态定义\n`);
      for (const sv of sa.stateAnalysis) {
        lines.push(`**${sv.variable.label}**（\`${sv.variable.name}\`）：${sv.variable.values.map((v) => v.label).join(' / ')}`);
        if (sv.writers.length) lines.push(`- 写入：${sv.writers.map((w) => `${w.nodeName} ${w.trigger}时→"${w.value}"`).join('、')}`);
        if (sv.readers.length) lines.push(`- 响应：${sv.readers.map((r) => `${r.nodeName}(${r.value}→${r.effect})`).join('、')}`);
        lines.push('');
      }
    }

    // Event summary
    if (sa.eventSummary.length > 0) {
      lines.push(`### 交互事件汇总\n`);
      lines.push(`| 元素 | 触发 | 行为描述 |`);
      lines.push(`|------|------|---------|`);
      for (const e of sa.eventSummary) {
        lines.push(`| ${e.nodeName} | ${e.trigger} | ${e.description.replace(/\n/g, ' ')} |`);
      }
      lines.push('');
    }
  }

  // Appendix
  if (analysis.indices.stateVars.length > 0) {
    lines.push(`## 附录 A · 状态变量索引\n`);
    lines.push(`| 名称 | 标签 | 作用域 | 可选值 | 写入/消费 |`);
    lines.push(`|------|------|--------|--------|-----------|`);
    for (const sv of analysis.indices.stateVars) {
      lines.push(`| ${sv.name} | ${sv.label} | ${sv.scope} | ${sv.values.join(', ')} | ${sv.writerCount}/${sv.readerCount} |`);
    }
    lines.push('');
  }

  if (analysis.indices.apis.length > 0) {
    lines.push(`## 附录 B · API 索引\n`);
    lines.push(`| 页面 | 名称 | 方法 | 路径 | 调用者 |`);
    lines.push(`|------|------|------|------|--------|`);
    for (const a of analysis.indices.apis) {
      lines.push(`| ${a.screenName} | ${a.name} | ${a.method} | ${a.path} | ${a.callerNodes.join(', ')} |`);
    }
    lines.push('');
  }

  lines.push(`---\n*由 DesignUI Blueprint 自动生成*`);
  return lines.join('\n');
}
