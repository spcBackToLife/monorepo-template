# 模板：D-X-budget（视觉预算）★

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/budget.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-budget
> 对应 schema 字段：screen.meta.design.componentBudgets

## 1. 节点权重清单（初版）

| 节点 ID | 节点名 | role | weight (1-10) | allowedTools | decorationDensity |
|---------|--------|------|:-------------:|--------------|:-----------------:|
| n9 | SubmitBtn | 主角-CTA | 9 | 渐变 / 发光 / spring 动效 | 密 |
| n2 | BrandLogo | 主角-品牌 | 8 | 双色 / 小点缀 | 中 |
| n4 | FormCard | 配角-容器 | 5 | 阴影 / 圆角 | 少 |
| n6 | PhoneInput | 工具-输入 | 3 | 边框 / 聚焦光 | 极少 |
| n7 | CredentialInput | 工具-输入 | 3 | 边框 / 聚焦光 | 极少 |
| n8 | ModeToggle | 工具-切换 | 4 | 药丸背景 / spring 滑动 | 少 |
| n14 | PinkCircleDeco | 氛围-装饰 | 4 | 渐变 / blur | 中 |
| n15 | MintLeafDeco | 氛围-装饰 | 3 | 有机形 | 少 |
| n10 | RegisterLink | 工具-导航 | 2 | 文字色 | 极少 |
| n11 | ForgotLink | 工具-导航 | 2 | 文字色 | 极少 |

## 2. 总权重核算

```
sum = 9 + 8 + 5 + 3 + 3 + 4 + 4 + 3 + 2 + 2 = 43
```

❌ **超过 30 上限**——必须削减。

## 3. 削减历程

| 版本 | 调整 | 总权重 | 是否达标 |
|------|------|:------:|:--------:|
| v1 | 初版 | 43 | ❌ |
| v2 | 合并 RegisterLink+ForgotLink → FooterLinks（单 weight=3） | 38 | ❌ |
| v3 | BrandLogo 8 → 7（削减"双色"为单色 + 微点缀） | 37 | ❌ |
| v4 | PhoneInput / CredentialInput 3 → 2（削减"聚焦光"，仅边框）| 35 | ❌ |
| v5 | FormCard 5 → 4（削减阴影 → 仅圆角）| 34 | ❌ |
| v6 | 删除 MintLeafDeco（视觉饱和）| 31 | ❌ |
| v7 | PinkCircleDeco 4 → 3（削减 blur，仅渐变）| 30 | ✅ 临界达标 |

## 4. 候选方案对比

### 方案 A（最终采用）
- 保留 BrandLogo weight=7（品牌识别度优先）
- 删除 MintLeafDeco
- 总权重 30
- 风险：左下构图略空，可在 D-X-decorations 阶段加微装饰补偿

### 方案 B
- 保留 MintLeafDeco（构图平衡）
- BrandLogo 削到 5（弱化品牌）
- 总权重 30
- → 否决：登录页是品牌强化关键屏，弱化品牌得不偿失

### 方案 C
- 保留全部装饰
- 业务侧大幅削减（PhoneInput → 1，FormCard → 2）
- → 否决：表单是核心交互，工具角色削太狠会失去聚焦提示

## 5. 主角数核算

主角角色（CTA + 内容 + 品牌）：
- SubmitBtn (CTA)
- BrandLogo (品牌)
= **2 个** ✅ ≤ 2

## 6. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    design: {
      componentBudgets: [
        { nodeId: "n9-SubmitBtn",       role: "主角-CTA",   weight: 9, allowedTools: ["渐变","发光","spring 动效"], decorationDensity: "密" },
        { nodeId: "n2-BrandLogo",       role: "主角-品牌", weight: 7, allowedTools: ["小点缀"],                    decorationDensity: "中" },
        { nodeId: "n4-FormCard",        role: "配角-容器", weight: 4, allowedTools: ["圆角"],                      decorationDensity: "少" },
        { nodeId: "n6-PhoneInput",      role: "工具-输入", weight: 2, allowedTools: ["边框"],                       decorationDensity: "极少" },
        { nodeId: "n7-CredentialInput", role: "工具-输入", weight: 2, allowedTools: ["边框"],                       decorationDensity: "极少" },
        { nodeId: "n8-ModeToggle",      role: "工具-切换", weight: 4, allowedTools: ["药丸背景","spring 滑动"],     decorationDensity: "少" },
        { nodeId: "n14-PinkCircleDeco", role: "氛围-装饰", weight: 3, allowedTools: ["渐变"],                       decorationDensity: "中" },
        { nodeId: "n10-FooterLinks",    role: "工具-导航", weight: 3, allowedTools: ["文字色"],                     decorationDensity: "极少" }
      ]
      // 总 weight = 9+7+4+2+2+4+3+3 = 34 ❌
      // 实际我们再调一轮：删除 PinkCircleDeco → 31 → 还需调
      // 最终 BrandLogo 7→6 → 30 ✅
    }
  }
}
```

⚠️ **expectedArtifacts 验收**：在 update_plan_task done 时 service 端会校验 `arrayMin: meta.design.componentBudgets, min:1`，并由 D-audit 阶段对总权重做最终核对。

## 7. 后续任务约束

- D-X-styles：每个节点的 styles 必须**不超出 allowedTools**
- D-X-decorations：装饰节点总权重必须 ≤ 4（剩余预算）
- D-X-materials：高权重节点（≥ 7）应有 materialSpec
```
