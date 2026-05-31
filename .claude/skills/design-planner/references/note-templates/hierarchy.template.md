# 模板：D-X-hierarchy（视觉层级）

> 拷贝本骨架到 `analysis-notes/<projectId>/design/<screenId>/hierarchy.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-<screenId>-hierarchy
> 对应 schema 字段：screen.meta.design.layers + 每节点 styles.zIndex

## 1. 4 层视觉模型

| 层 | zIndex | 包含什么 | 视觉特征 |
|----|:------:|---------|---------|
| 前景 | 3 | LoadingOverlay / ErrorToast | 高对比度 / 阻断交互 |
| 中景（高）| 2 | FormCard / FooterLinks | 主要内容 / 高可读 |
| 中景（低）| 1 | HeaderArea / BrandLogo / BrandSlogan | 标题区 / 品牌 |
| 背景 | 0 | PageBackground / PinkCircleDeco / MintLeafDeco | 装饰 / 氛围 |
| 遮罩（按需）| 30 | Modal / BottomSheet | 临时阻断 |

## 2. 视觉流向（用户视线路径）

```
进入页面 → 视线首先落在 ___________
        → 被 ___________ 引导
        → 沿 ___________ 移动到 ___________
        → 最终停在 ___________（CTA）
```

## 3. 各层包含的节点（穷举）

### 前景（z=3）
- ___________

### 中景高（z=2）
- ___________

### 中景低（z=1）
- ___________

### 背景（z=0）
- ___________（装饰节点，由 D-X-decorations 任务建）

## 4. 候选层级方案对比

### 方案 A：FormCard 在 z=2，BrandLogo 在 z=1
- 优点：表单优先，符合"信任路径"
- 缺点：品牌可能被压低

### 方案 B：BrandLogo 在 z=2 与 FormCard 同层
- 优点：品牌强化
- 缺点：竞争视觉焦点

→ **采用 ___________**，理由：___________

## 5. ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId, screenId,
  patch: {
    design: {
      layers: [
        { name: "前景",  zIndex: 3, elements: ["LoadingOverlay","ErrorToast"] },
        { name: "中景",  zIndex: 2, elements: ["FormCard","FooterLinks"] },
        { name: "中景",  zIndex: 1, elements: ["HeaderArea","BrandLogo","BrandSlogan"] },
        { name: "背景",  zIndex: 0, elements: ["PageBackground","PinkCircleDeco","MintLeafDeco"] }
      ]
    }
  }
}
```

后续 D-X-styles 任务为每个节点写 styles 时，zIndex 必须与本表一致。
```
