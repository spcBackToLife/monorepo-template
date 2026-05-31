/**
 * Schema 字段关系 lint —— 与 expression lint（E001-E008）命名空间分离。
 *
 * 设计哲学：
 *   - expression-lang 的 E* 错误码管「表达式内部语法/语义」（spec.json 真相源）
 *   - 本文件的 R-* 错误码管「schema 字段间的关系契约」（types/node.ts JSDoc 真相源）
 *   - 两者形态对齐 OperationResult.issues 结构，MCP / AI 消费侧统一处理
 *
 * 当前覆盖：
 *   - R-NODE-FIELD-01: ComponentNode 同时设置非空叶子文本（textContent/text）+ children
 *     → children 不会渲染（PrimitiveRenderer.readInlineTextFromProps 优先级）
 *   - R-NODE-FIELD-02: input/textarea/select 节点同时挂 bind + change event → 双写
 *   - R-FIELD-DEPRECATED-01: logic.switch.cases[].when → cases.match (knownMigrations)
 *   - R-NAV-TARGET-01: nav.go.targetScreenId 引用项目内不存在的屏（字面量目标）
 *
 * 后续可扩展：
 *   - R-NAV-TARGET-02: nav.go.animation 字段不在 spec 允许列表
 *   - R-EVENT-DESC-01: event 缺 description
 */

import type { Action, ComponentNode, DesignProject } from '@globallink/design-schema';

/**
 * 与 OperationResult.issues 中单条 ref 的形态对齐。
 * 不依赖 design-expression 的 ExpressionFieldRef，因为本 lint 不来自表达式 walker。
 */
export interface SchemaFieldLintRef {
  nodeId?: string;
  screenId?: string;
  fieldPath: string;
  rawValue: string;
  issues: Array<{
    code: string;
    level: 'error' | 'warning';
    message: string;
    hint?: string;
    specRef?: string;
    suggestedFix?: string;
  }>;
}

/**
 * 检查单个节点的字段关系契约。
 *
 * @param node      待检查节点
 * @param basePath  字段路径前缀（如 "rootNode.children[0]"），用于 issues.fieldPath 拼接
 * @returns         所有违反契约的 ref（warning 级；当前无 error 级）
 */
export function lintComponentNodeFieldRelations(
  node: ComponentNode,
  basePath = node.id ?? 'unknown',
): SchemaFieldLintRef[] {
  const refs: SchemaFieldLintRef[] = [];

  // ========== R-NODE-FIELD-01: textContent/text vs children 互斥 ==========
  // 与 PrimitiveRenderer.readInlineTextFromProps 行为对齐：
  //   非空 textContent / text / 数字 0 → 优先渲染叶子文本，children 被忽略
  //   字符串 '' / undefined → fall-through 到 children
  const tc = node.props?.textContent;
  const text = node.props?.text;
  const tcIsLeaf = typeof tc === 'number' || (typeof tc === 'string' && tc !== '');
  const textIsLeaf = typeof text === 'number' || (typeof text === 'string' && text !== '');
  const leafSrc = tcIsLeaf ? 'textContent' : textIsLeaf ? 'text' : null;
  const leafVal = tcIsLeaf ? tc : textIsLeaf ? text : undefined;

  if (leafSrc && (node.children?.length ?? 0) > 0) {
    const valStr = String(leafVal).slice(0, 60);
    refs.push({
      nodeId: node.id,
      fieldPath: `${basePath}.props.${leafSrc}`,
      rawValue: valStr,
      issues: [
        {
          code: 'R-NODE-FIELD-01',
          level: 'warning',
          message: `节点同时设置非空叶子文本（${leafSrc}="${valStr.slice(0, 30)}${valStr.length > 30 ? '…' : ''}"）和 ${node.children?.length} 个 children；children 不会渲染（PrimitiveRenderer 叶子文本优先）`,
          hint: '若想渲染 children，把 props.textContent / props.text 改为 ""（空字符串）或删除该 key；若想只渲染叶子文本，删除 children',
          specRef: 'design-schema/types/node.ts ComponentNode §字段互斥矩阵 #1',
        },
      ],
    });
  }

  // ========== R-NODE-FIELD-02: bind × events[trigger='change'] 双写 ==========
  // input/textarea/select 节点 bind 已自动同步 store；再写 change event 等于双写
  if (
    node.bind?.path &&
    (node.type === 'input' || node.type === 'textarea' || node.type === 'select')
  ) {
    const changeEventIdx = node.events?.findIndex((e) => e.trigger === 'change') ?? -1;
    if (changeEventIdx >= 0) {
      refs.push({
        nodeId: node.id,
        fieldPath: `${basePath}.events[${changeEventIdx}]`,
        rawValue: 'change',
        issues: [
          {
            code: 'R-NODE-FIELD-02',
            level: 'warning',
            message: `表单节点同时设置 bind.path="${node.bind.path}" 和 trigger='change' 事件；bind 已自动同步 store，change 事件会双写`,
            hint: '通常 bind 已经够用，如需额外副作用建议用 trigger="blur" 或其它非 change trigger',
            specRef: 'design-schema/types/node.ts ComponentNode §字段互斥矩阵 #2',
          },
        ],
      });
    }
  }

  return refs;
}

/**
 * 把 schema 字段 lint 的结果合并到现有 OperationResult.issues。
 *
 * 与 lint-guard.ts attachLintWarnings 对应（前者吃 ExpressionFieldRef，本函数吃 SchemaFieldLintRef）。
 * 形态完全一致，可同时合并到一个 result 上。
 */
export function attachSchemaLintWarnings<T extends { issues?: SchemaFieldLintRef[] }>(
  result: T,
  refs: SchemaFieldLintRef[],
): T {
  if (!refs.length) return result;
  return {
    ...result,
    issues: [...(result.issues ?? []), ...refs],
  };
}

// ============================================================
// Action 链 cross-field lint（F5 + F7）
// ============================================================

/**
 * 递归遍历 Action 链（含 logic.if then/else / logic.switch cases / effect.fetch onSuccess/onError）
 * 调用回调访问每个 Action（含子链）。
 */
function walkActions(actions: Action[] | undefined, visit: (a: Action) => void): void {
  if (!actions) return;
  for (const a of actions) {
    visit(a);
    // logic.if
    if (a.type === 'logic.if') {
      walkActions(a.then, visit);
      walkActions(a.else, visit);
    }
    // logic.switch
    if (a.type === 'logic.switch') {
      for (const c of a.cases ?? []) {
        walkActions(c.actions, visit);
      }
      walkActions(a.default, visit);
    }
    // effect.fetch
    if (a.type === 'effect.fetch') {
      walkActions(a.onSuccess, visit);
      walkActions(a.onError, visit);
      walkActions((a as { onComplete?: Action[] }).onComplete, visit);
    }
    // ui.startTimer
    if (a.type === 'ui.startTimer') {
      walkActions(a.onTick, visit);
      walkActions(a.onComplete, visit);
    }
    // ui.animate
    if (a.type === 'ui.animate') {
      walkActions((a as { onComplete?: Action[] }).onComplete, visit);
    }
  }
}

/**
 * 检查 Action 链中 logic.switch cases 的字段名 + nav.go targetScreenId 屏存在性。
 *
 * @param actions    待检查的 actions（含子链）
 * @param basePath   字段路径前缀，用于 issues.fieldPath
 * @param project    项目（用于 nav.go 屏存在性查询；不传则跳过 R-NAV-TARGET-01）
 * @param nodeId     上下文节点 id（用于 issues.nodeId）
 * @returns          所有违反契约的 ref（warning 级）
 */
export function lintActionChain(
  actions: Action[] | undefined,
  basePath: string,
  options: { project?: DesignProject; nodeId?: string; screenId?: string } = {},
): SchemaFieldLintRef[] {
  const refs: SchemaFieldLintRef[] = [];
  if (!actions) return refs;

  // 收集项目内所有屏 id（含 name 双兜底；nav.go 实测可能用 id 或 name）
  const validScreenIds = new Set<string>();
  if (options.project) {
    for (const s of options.project.screens) {
      validScreenIds.add(s.id);
      // screen 有 name 字段时也加入（demo 项目中常用 name 引用）
      const name = (s as { name?: string }).name;
      if (name) validScreenIds.add(name);
    }
  }

  walkActions(actions, (a) => {
    // ========== R-FIELD-DEPRECATED-01: logic.switch.cases[].when → match ==========
    if (a.type === 'logic.switch') {
      for (let i = 0; i < (a.cases?.length ?? 0); i++) {
        const c = a.cases[i] as unknown as Record<string, unknown>;
        if ('when' in c && !('match' in c)) {
          refs.push({
            nodeId: options.nodeId,
            screenId: options.screenId,
            fieldPath: `${basePath}.cases[${i}].when`,
            rawValue: String(c.when).slice(0, 60),
            issues: [
              {
                code: 'R-FIELD-DEPRECATED-01',
                level: 'warning',
                message: 'logic.switch.cases[].when 已废弃，请改用 cases[].match（spec.knownMigrations）',
                hint: '把字段名 when: 改成 match:',
                specRef: 'expression-lang spec.knownMigrations §case.when',
                suggestedFix: 'match',
              },
            ],
          });
        }
      }
    }

    // ========== R-NAV-TARGET-01: nav.go.targetScreenId 引用不存在的屏 ==========
    if (a.type === 'nav.go' && options.project) {
      const target = a.targetScreenId;
      if (typeof target === 'string' && !target.includes('{{') && !validScreenIds.has(target)) {
        refs.push({
          nodeId: options.nodeId,
          screenId: options.screenId,
          fieldPath: `${basePath}[nav.go].targetScreenId`,
          rawValue: target,
          issues: [
            {
              code: 'R-NAV-TARGET-01',
              level: 'warning',
              message: `nav.go.targetScreenId="${target}" 在项目内不存在（项目当前共 ${options.project.screens.length} 屏）`,
              hint: '若是 demo 范围之外的屏，建议在 host 层加 fallback toast；或本期暂不实现该跳转',
              specRef: 'design-engine Dispatcher nav.go runtime 行为',
            },
          ],
        });
      }
    }
  });

  return refs;
}
