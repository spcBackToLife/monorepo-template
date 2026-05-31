# 模板：E-cross-screen-snapshot（跨屏一致性核对）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/global/cross-screen.md`
> 与 D-audit 不同：D-audit 在 design 阶段做"规格层面"对照（schema 字段），本任务在 executor 阶段做"执行层面"对照（实际截图渲染）。

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-cross-screen-snapshot
> 对应 schema 字段：核对类

## 1. 同种组件实际渲染对照

### 按钮（Button）
| 屏 | 节点 | 截图局部 | 是否符合 baseline |
|----|------|---------|:----------------:|
| 00-login | SubmitBtn | [crop URL] | ✅ |
| 01-register | RegisterBtn | [crop URL] | ✅ |
| 02-forgot | ConfirmBtn | [crop URL] | ✅ |
| 03-home | CreateBtn | [crop URL] | ✅ |

不一致项：[无]

### 输入框（Input）
[同上结构]

### 卡片 / 容器
[同上结构]

### 链接（Link）
[同上结构]

## 2. palette 跨屏一致

跨所有屏对照实际渲染色彩：
- [ ] primary 色仅出现在需要 primary 的地方 ✅
- [ ] 没有屏出现 palette 外的色 ✅
- [ ] 暗色背景和浅色背景的搭配在不同屏一致 ✅

## 3. 视觉密度均衡（实际截图感受）

按 D-audit 给的总权重对照实际感受：
| 屏 | 总权重 | 实际感受 | 是否符合 |
|----|:------:|---------|:-------:|
| 00-login | 30 | 丰富 + 表单聚焦 | ✅ |
| 01-home | 22 | 内容多但不挤 | ✅ |
| 02-forgot | 18 | 简洁工具型 | ✅ |
| ... | | | |

跨屏切换截图（模拟用户从 A 屏到 B 屏）：
- 00-login → 01-home：色调过渡自然 ✅
- 01-home → 02-settings：风格一致，无断层 ✅

## 4. 装饰风格统一

对所有屏的装饰节点截图对照：
- [ ] 装饰类（有机 + 光效）一致 ✅
- [ ] 装饰透明度等级一致 ✅
- [ ] 装饰位置策略一致 ✅

## 5. 全局 overlays 跨屏并存（详见 E-global-snapshot）

如已在 E-global-snapshot 任务核对完毕，此处仅简要确认：
- [ ] 全部场景已通过 ✅
- [ ] 风格高度统一 ✅

## 6. 不一致项 + 路由

[列出不一致 + 退回对应 SKILL]

## 7. ★ 沉淀到 schema 的结论

```jsonc
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      crossScreenExecutorVerified: true,
      verifiedAt: "<ISO>",
      notes: "5 维度跨屏核对通过"
    }
  }
}
```
```
