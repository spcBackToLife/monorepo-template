/**
 * ThemeConfigContext —— 把项目级 ThemeConfig 注入到渲染器深层
 *
 * 为什么要这个 Context：
 *   resolveTokens / resolveStyles / resolveNodeStyles 都依赖 themeConfig 才能把
 *   "$token:colors.primary" 解析成实际颜色 "#5B6CFF"。
 *   但 SchemaRenderer / PreviewRenderer / schemaLayoutMap 调用 resolveNodeStyles 时
 *   原本根本不传 themeConfig（renderer 不知道这东西的存在），导致 token 永远 fall-through。
 *
 * 修复：
 *   - design-engine 提供 ThemeConfigProvider
 *   - design-front (apps/design_front) 在 Canvas / Preview 外层 wrap Provider，
 *     传入 editorStore.project?.themeConfig
 *   - SchemaRenderer / PreviewRenderer / schemaLayoutMap 通过 useThemeConfig() 读
 *     并把它传给 resolveNodeStyles 第 5 参
 *
 * 不传 / null = 历史行为兼容（token 字符串原样透传，浏览器忽略）—— 不会强制要求集成方注入。
 */
import React, { createContext, useContext } from 'react';
import type { ThemeConfig } from '@globallink/design-schema';

const Ctx = createContext<ThemeConfig | null | undefined>(undefined);

export function ThemeConfigProvider({
  themeConfig,
  children,
}: {
  themeConfig: ThemeConfig | null | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  return <Ctx.Provider value={themeConfig}>{children}</Ctx.Provider>;
}

/** 读取当前 ThemeConfig（可能 undefined / null —— resolveTokens 里会 fallback 原样透传） */
export function useThemeConfig(): ThemeConfig | null | undefined {
  return useContext(Ctx);
}
