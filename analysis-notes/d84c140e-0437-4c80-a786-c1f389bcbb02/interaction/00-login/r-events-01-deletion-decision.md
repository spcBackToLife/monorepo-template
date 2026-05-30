# R-EVENTS-01 删除决策（v2.4）

> 时间：2026-05-30
> 触发场景：interaction-designer 处理 00-login 屏 `I-M1-integrity` 任务时 checker 误报 4 条 R-EVENTS-01
> 结论：彻底删除 R-EVENTS-01 + `INTERACTIVE_TRIGGERS` 硬编码白名单 + summary 关键词启发式

## 1. 触发现象

00-login 屏 schema 完成度本应 0 错（17 个 interaction 任务全部 done，coverage 三轴全 ✓），但 integrity 报 4 个 R-EVENTS-01：

| 节点 | meta.summary 关键节选 | 实际事件 | checker 判定 |
|------|------|------|------|
| PhoneInput | "受控双向绑定 view.form.phone；onBlur 用 /^1[3-9]\d{9}$/ 校验..." | events: `[{ trigger: 'blur', actions: [...真实 logic.if 校验链] }]` | ❌ 误报"缺 trigger" |
| CredentialInput | "受控双向绑定 view.form.credential；onBlur 按 view.loginMode 分支校验..." | events: `[{ trigger: 'blur', actions: [...真实校验链] }]` | ❌ 误报"缺 trigger" |
| PhoneError | "手机号失焦校验错的行内提示位：textContent 接 {{state.view.errors.phone}}；...由 PhoneInput.blur 事件...写入..." | events: `[]`（纯展示节点） | ❌ 误报"缺 trigger" |
| CredentialError | （同上结构）| events: `[]` | ❌ 误报"缺 trigger" |

## 2. 根因（第一性原理拷问）

### 2.1 老实现是什么

```ts
// features/design-schema/src/integrity/index.ts (v2.0~v2.3)
const INTERACTIVE_TRIGGERS = new Set(['click','doubleClick','longPress','change','submit']);

function checkNodeEventsCoverage(node, issues) {
  const hint = (node.meta?.interaction?.summary ?? '').toLowerCase();
  if (/click|tap|点击|按下|长按|hover|焦点|focus|blur|change|输入/.test(hint)) {
    // 启发式：summary 含交互动词 → 视为"声明了交互意图"
  } else return;

  // 看实际 events 中有没有命中 INTERACTIVE_TRIGGERS 白名单的项
  const real = (node.events ?? []).filter(e => INTERACTIVE_TRIGGERS.has(e.trigger));
  if (real.length === 0) push(R-EVENTS-01);  // 误报源头
}
```

两个机制叠加产生的荒谬：
- **正则白名单**（含 `blur/focus/输入`）—— 触发"声明了交互意图"判定
- **`INTERACTIVE_TRIGGERS` 硬编码白名单**（仅 5 个 trigger，缺 `blur/focus/hover/longPress`）—— 看不到 PhoneInput 真实存在的 `blur` 事件
- 结果：**实际做对了的节点反而被报错**

### 2.2 为什么会埋下这种机制

R-EVENTS-01 在 v2.0 引入，目的：拦截"AI 在 meta 自报'我做完交互了'，但 events[] 实际为空"的造假。当时还没有 expectedArtifacts 机制，唯一兜底办法只能从 meta.summary 嗅探暗示词。

这是**当时的无奈之选，不是好设计**。

### 2.3 为什么现在必须删

v2.2 引入了 **expectedArtifacts**（任务级机器对账，§0.1.8）——"声明 vs 产物不一致"已被更可靠的机制接管：

| 维度 | 旧 R-EVENTS-01 | 新 expectedArtifacts |
|------|---------|---------|
| 怎么"声明完成" | AI 在 meta.summary 写自然语言 | plan 任务声明 `{kind, path, ...}` 结构指纹 |
| 怎么验证 | 关键词正则猜 summary 是不是暗示交互 | service 端按 path 查 schema 真值 |
| 误判率 | 高（语言匹配天然不精确） | 0（结构判断零歧义） |
| AI 介入 | 还要"避词"防误判 | 只关心做对设计 |

R-EVENTS-01 已无存在意义，继续保留唯一的"贡献"就是误报。**这是典型的「双版本并存」遗留**——违反 AGENTS.md §9.1。

## 3. 修复方案（删 1 件 + 加 1 件）

### 3.1 删（彻底，不留兼容）

1. `features/design-schema/src/integrity/index.ts`
   - ❌ 删 `INTERACTIVE_TRIGGERS` 集合（连带启发式正则）
   - ❌ 删 `checkNodeEventsCoverage` —— R-EVENTS-01 整段
   - ✅ R-EVENTS-02 改为：**任意 trigger 只要 actions=[] 就报**（去白名单后纯结构）
   - ✅ R-STATUS-01 改为：`ready.events=true && (events 数组没任一项 actions 非空)` —— 去白名单
2. `STAGE-CONTRACT.md` §7：删 R-EVENTS-01 行，加 v2.4 重构说明
3. 各 SKILL.md 引用同步更新

### 3.2 加（让 expectedArtifacts 真正能盖住"屏内有交互"这件事）

1. `features/design-schema/src/types/meta.ts`：新增 ArtifactCheck.kind
   ```ts
   | { kind: 'anyNodeHasEvents'; path: string; min?: number; message?: string }
   ```
2. `features/design-schema/src/integrity/verify-artifact.ts`：实现该 kind
   - 递归扫从 `path` 起的节点子树（含 children + repeat.template）
   - 统计满足 `events[i].actions.length > 0` 的节点数
   - ≥ min 视为通过
3. `features/design-schema/src/integrity/index.ts`：顺便实现 R-EVENTS-03（之前 spec 标"待实现"）
   - 扫 events 中所有 effect.fetch（含 logic.if/switch 嵌套）
   - 既无 onSuccess 也无 onError → 报错

### 3.3 改造后的因果闭环

| 原 R-EVENTS-01 拦的场景 | 改造后由谁拦 |
|---|---|
| 屏内 events 整组没写 | `I-X-events` 的 `anyNodeHasEvents` expectedArtifacts |
| 单节点 event 写了 trigger 没填 actions | R-EVENTS-02（去白名单后） |
| effect.fetch 缺 onSuccess/onError | R-EVENTS-03（v2.4 落实） |
| 屏 phase 升 interaction-defined 但整体没动 | 屏级各任务 expectedArtifacts |
| 单节点 ready.events=true 但 events 实际为空 | R-STATUS-01（去白名单后） |

每条都是**结构判断、零误判**。

## 4. 验证

修复完 build → integrity 重跑 00-login 屏：

```
{ "issues": [], "counts": { "error": 0, "warning": 0, "info": 0 } }
```

✅ 4 条历史误报全部消失，且没有引入回归（其余 17 个 done 任务的 R-PLAN-01 / R-EVENTS-02 / R-EVENTS-03 / R-PHASE-01 / R-STATUS-* 全部沉默）。

## 5. 经验沉淀

1. **结构判断 > 自然语言启发式**：checker 是工具不是 NLP，绝不应该用关键词正则去推理 AI 的设计意图
2. **类型与白名单必须同步**：EventTrigger 类型有 15 个，硬编码白名单只挑 5 个 → 必然出 bug。教训：能用类型表达的就别用 `Set` 兜底
3. **范式迁移要彻底删旧代码**：v2.2 引入 expectedArtifacts 后 R-EVENTS-01 已名存实亡，没有 v2.3 删干净是个遗漏 → AGENTS.md §9.1 红线
4. **AI 自治 > 工具兜底**：interaction-designer 给输入框加 blur 校验、加行内派生显示节点是教科书级标准设计，不该被任何规则拦下
