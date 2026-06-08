# 模板：D-templates（通用业务组件抽模板）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/system/templates.md`
> 项目级任务——通常在多屏设计推进过程中持续做（每抽出一个新模板就在 notes 追加），全部抽完才标 done。

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-templates
> 对应 schema 字段：project.componentAssets[]

## 1. 跨屏复用判定

对每个 Molecule / Organism 候选（参考 methodology/03-atomic-design.md）：

| 候选 | Atomic 层 | 出现屏数 | 同屏出现次数 | 是产品识别度组件？ | 决策 | templateId |
|------|:---------:|:--------:|:-----------:|:-----------------:|:----:|------------|
| PhoneInput | molecule | 4 | 1 | 否 | ✅ 抽 | tpl_phoneInput |
| FormCard | organism | 3 | 1 | 否 | ✅ 抽 | tpl_formCard |
| BrandLogo | molecule | 6 | 1 | 是 | ✅ 抽 | tpl_brandLogo |
| ModeToggle | molecule | 2 | 1 | 否 | ✅ 抽 | tpl_modeToggle |
| FormField (label+input+error) | molecule | 8 | 多次 | 否 | ✅ 抽 | tpl_formField |
| LoginCardBg | atom | 1 | 1 | 否 | ❌ 不抽 | - |
| EmptyState | organism | 5（每个空态独立）| 1 | 否 | ❌ 不抽（每个空态结构不同）| - |

## 2. 抽模板顺序（Atom → Molecule → Organism）

按依赖顺序：
1. 先抽不依赖其他模板的（PhoneInput / BrandLogo / ModeToggle）
2. 再抽依赖底层模板的（FormCard 包含 FormField）
3. 最后抽顶层 Organism

## 3. 每个模板的抽取记录

### tpl_phoneInput
**抽取时机**：00-login 屏完成 PhoneInput 设计后立刻抽

```jsonc
asset/save_as_template {
  projectId,
  rootNodeId: "<00-login 屏的 PhoneInput 实例 id>",
  templateName: "PhoneInput",
  kind: "molecule",
  category: "form",
  description: "手机号输入框，带验证状态视觉反馈",
  propDefinitions: [
    { name: "value",       type: "string",   description: "受控值" },
    { name: "onChange",    type: "event",    description: "输入回调" },
    { name: "error",       type: "string",   description: "错误信息（非空时显示红框+红字）" },
    { name: "placeholder", type: "string",   default: "请输入手机号" },
    { name: "disabled",    type: "boolean",  default: false }
  ]
}
→ project.componentAssets 新增 tpl_phoneInput
```

后续屏（01-register / 02-forgot / ...）使用：
```jsonc
asset/instantiate {
  projectId,
  templateId: "tpl_phoneInput",
  parentId: "<目标 FormCard id>",
  propValues: {
    value: "{{state.view.form.phone}}",
    error: "{{state.view.errors.phone}}",
    placeholder: "请输入手机号"
  }
}
```

### tpl_formCard
**抽取时机**：02-forgot 屏发现 FormCard 与 00-login / 01-register 结构高度一致后

```jsonc
asset/save_as_template {
  ...
  kind: "organism",
  propDefinitions: [
    { name: "title",       type: "string" },
    { name: "subtitle",    type: "string" },
    { name: "fieldsSlot",  type: "slot",     description: "字段插槽" },
    { name: "actionsSlot", type: "slot",     description: "底部按钮插槽" }
  ]
}
```

[继续每个抽取的模板...]

## 4. 模板更新记录

如某模板被改后，所有 detached=false 的实例自动同步：
```
日期 / 模板 / 改动 / 影响实例数
2026-XX-XX / tpl_phoneInput / borderRadius lg → md / 4 个屏的 4 个实例自动同步
```

## 5. detached 实例核查

```jsonc
// 跑完所有屏后检查
for each templateId in project.componentAssets:
  → 查找所有 instance（asset/list 或 element 查询带 templateRef 的节点）
  → 统计 detached=false / true 比例
  → 若 detached 比例 > 10% → 检查为什么 detach（是否需要扩展 propDefinitions）
```

| 模板 | 总实例 | detached=false | detached=true | 评估 |
|------|:------:|:--------------:|:-------------:|------|
| tpl_phoneInput | 4 | 4 | 0 | ✅ 100% 同步 |
| tpl_formCard | 3 | 3 | 0 | ✅ |
| tpl_brandLogo | 6 | 5 | 1 (登录页特例) | ⚠️ 检查为什么 detach |

## 6. 单页项目特例

如果项目只有 1 屏 → 没有跨屏复用需求 → status=skipped + notes：
```
"单页项目（仅 00-login），无跨屏复用需求；所有节点直接写不抽模板。"
```

## 7. ★ 沉淀到 schema 的结论

```jsonc
// 1. 每个抽取的模板（asset/save_as_template）
[列每个 asset/save_as_template 调用]

// 2. 每个屏使用模板的实例（asset/instantiate）
[列每个 asset/instantiate 调用]

// 3. 项目级 componentAssets 数组校验
expectedArtifacts: [{ kind: 'arrayMin', path: 'componentAssets', min: 1 }]
```

⚠️ **后续任务约束**：
- D-audit 维度 4：模板抽取覆盖率核查
- D-audit 时检查 detached 实例是否需要重新 sync 或扩展 props
- 如果用户后续改了某模板 → 所有 instance 自动同步（除非 detach）
```
