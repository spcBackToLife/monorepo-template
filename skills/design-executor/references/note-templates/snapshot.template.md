# 模板：E-X-snapshot（截图核对）★

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/<screenId>/snapshot.md`
> 5 维度逐项对照 design summary，绝不允许"看起来 OK"。

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-<screenId>-snapshot
> 对应 schema 字段：核对类，无 schema 写入；结论体现在 screen.meta.status.notes

## 1. 截图获取

```jsonc
generate_snapshots {
  projectId, screenIds: [screenId], mode: "viewport"
}
→ 拿到截图 URL
```

模拟不同状态截图（如有需要）：
- 默认态：[URL]
- loading 态（state/view_set_preview {submitting:true}）：[URL]
- error 态（state/view_set_preview {errors.phone:'...'}）：[URL]
- business 态各分支：[URLs]

## 2. 维度 1：整体视觉氛围（vs design summary）

### design.summary 描述
"暖白底 + 顶部粉色渐变氛围 + 角落装饰 + 居中品牌 + 表单卡 + 药丸 CTA"

### 实际渲染观察
- 底色：暖白（约 #FFF8F5）✅
- 顶部渐变氛围：HeaderArea 上方有 PinkCircle 渐变光晕，占屏 15% ✅
- 角落装饰：右上 PinkCircle + 左下 MintLeaf ✅
- 品牌居中：BrandLogo 居于屏幅中线 ✅
- 表单卡：FormCard 圆角 16px，边框 1px borderLight ✅
- 药丸 CTA：SubmitBtn 圆角 full，粉色填充 ✅

### 一致性
✅ 完全一致 / ⚠️ 偏差点：

## 3. 维度 2：色彩 palette 一致性

palette 声明：[colors.primary / primaryLight / secondary / bgPage / bgCard / textPrimary / textSecondary / error]

实际渲染色彩观察：
| token | 出现位置 | 是否符合 |
|-------|---------|:--------:|
| primary | SubmitBtn / BrandLogo 主体 | ✅ |
| primaryLight | PinkCircleDeco | ✅ |
| secondary | MintLeafDeco / BrandLogo 装饰点 | ✅ |
| bgPage | 屏底 | ✅ |
| bgCard | FormCard 底 | ✅ |
| textPrimary | FormTitle / labels | ✅ |
| textSecondary | FooterLinks | ✅ |
| error | (default 态未出现) | N/A |

palette 外色检查：✅ 无意外色

## 4. 维度 3：主角突出 / 视觉权重

componentBudgets：[列每个节点 + role + weight]

视觉焦点观察（用户进入此屏 0.5s 内视线落在哪）：
- 第 1 焦点：SubmitBtn ✅（最强发光 + 最强色 + 圆角 full，weight=9）
- 第 2 焦点：BrandLogo ✅（居中 + 双色，weight=7）
- 第 3 焦点：FormCard ✅（白底，weight=4）
- 辅助：装饰光晕在背景（weight=3，不抢戏）✅

主角是否清晰：✅ / 装饰是否抢戏：❌（PinkCircle 饱和度偏高）→ 修

## 5. 维度 4：装饰平衡

装饰观察：
- PinkCircleDeco：右上角 180×180，透明度 12%，渐变中心明显 ✅
- MintLeafDeco：左下角 120×120，三叶错落，饱和度 8% ✅
- 整体构图：右上重 + 左下平衡 = 对角呼吸 ✅
- z-index 正确（在内容层下方）✅
- pointerEvents:none 实际不阻挡点击 ✅

是否平衡：✅

## 6. 维度 5：衍生视图态

### Loading 态
```
state/view_set_preview { variable: 'submitting', value: true }
generate_snapshots → 截图 [URL]
核对：
  □ LoadingOverlay 半透明白底 ✅
  □ SubmitBtn 内 spinner 显示 / text 隐藏（childrenVisibility）✅
  □ FormCard 子节点 disabled（childrenStates 联动）✅
state/view_set_preview { variable: 'submitting', value: false }（恢复）
```

### Error 态
```
state/view_set_preview { variable: 'errors.phone', value: '手机号格式不正确' }
generate_snapshots → 截图 [URL]
核对：
  □ PhoneInput 边框变红（activeWhen 触发）✅
  □ PhoneError 文字显示，色彩 token:colors.error ✅
state/view_set_preview { variable: 'errors.phone', value: '' }（恢复）
```

### Business 态（如有）
[各状态分支截图核对]

### 全局 overlay 态（如有）
[在本屏触发 globalOverlays 的截图]

## 7. 不一致项 + 处理路径

### ❌ PinkCircle 饱和度偏高（维度 3 工具/装饰角色权重对比）
- 现象：装饰光晕在 12% 透明度下仍然过抢戏
- 责任方：design-planner（视觉预算）/ executor（如是 PNG 重画）
- 处理：
  - 当前 renderHint=css-gradient → 退回 design-planner 调 styles.background 透明度
  - 或如有 PNG → material-painter 重画降低饱和度

### ✅ 其他维度全部通过

## 8. ★ 沉淀到 schema 的结论

```jsonc
// 本任务以核对为主
// 不一致项已路由到对应 SKILL 处理（见 §7）

meta/set_screen {
  projectId, screenId,
  patch: {
    status: {
      // 不写 phase（由 E-X-verified 任务推进）
      notes: "snapshot 5 维度核对通过，无未处理不一致项"
    }
  }
}
```

⚠️ **后续任务约束**：
- E-X-verified：本任务通过后跑（确保 5 维度无未处理不一致）
- 全屏完整截图集在 E-snapshots 阶段统一生成（mode:frame）
```
