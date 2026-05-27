# 区块验证标准参考

> 每完成一个区块搭建任务后，对照本文档逐项检查。

---

## 通用样式检查清单

每个区块完成后，逐项核对 index.md 中的规格：

| # | 检查项 | 为什么重要 | 常见遗漏 |
|---|--------|-----------|---------|
| 1 | **文字颜色** | 暗色背景上默认黑色不可见 | 所有 span/p 必须显式设 color |
| 2 | **容器 flexDirection** | 编辑器默认 column | 水平排列必须显式设 row |
| 3 | **背景色/渐变** | 透明默认底可能露出 | 有设计底色的容器必须设 backgroundColor |
| 4 | **毛玻璃** | 3 个属性缺一不可 | backdropFilter + background(rgba) + 可选border |
| 5 | **小元素尺寸** | 无内容的 div 默认 0px | 装饰点/图标占位必须显式设 width+height |
| 6 | **圆角** | 影响整体质感 | 按钮/头像/卡片的 borderRadius |
| 7 | **阴影/发光** | 层级感核心 | FAB/按钮的 boxShadow |
| 8 | **定位方式** | fixed/absolute/sticky | 检查 position + top/bottom/left/right |
| 9 | **overflow** | 滚动区域核心 | flex:1 容器需要 overflow:hidden 或 auto |
| 10 | **z-index** | 层叠顺序 | fixed 元素需要 zIndex |

---

## 区块类型验证标准

### NavBar 类

```
必须验证:
- [ ] position: sticky, top: 0
- [ ] flexDirection: row
- [ ] alignItems: center
- [ ] justifyContent: space-between
- [ ] backdropFilter: blur(20px) saturate(1.2)
- [ ] background: rgba(r,g,b, 0.75)
- [ ] height: 44px (不含 statusBar padding)
- [ ] 左/中/右元素都可见
- [ ] 文字 color 正确
- [ ] border-bottom 微分割线
```

### TabBar 类

```
必须验证:
- [ ] position: sticky, bottom: 0（或 layoutHint: sticky-footer）
- [ ] flexDirection: row
- [ ] 每个 Tab 是 flex-col (图标+文字垂直)
- [ ] Tab 均分宽度 (flex:1 或等宽)
- [ ] 图标占位有 width/height (20×20)
- [ ] 文字可见 (color + fontSize)
- [ ] 选中态区分 (颜色不同)
- [ ] 毛玻璃效果
- [ ] safeArea padding-bottom
```

### FAB/浮动按钮类

```
必须验证:
- [ ] position: fixed (或 absolute 在 fixed 容器中)
- [ ] bottom + right 值正确
- [ ] width/height 正确 (如 56×56)
- [ ] borderRadius: 999px (完全圆形)
- [ ] background: gradient 或纯色
- [ ] boxShadow: glow 效果
- [ ] 内部图标居中 (flex center center)
- [ ] zIndex > 内容层
```

### 地图/全屏内容区类

```
必须验证:
- [ ] flex: 1 (填满剩余空间)
- [ ] position: relative (子元素 absolute 锚点)
- [ ] overflow: hidden
- [ ] backgroundColor: 设计底色
- [ ] 装饰层 position:absolute + inset:0 + pointer-events:none
```

### 空状态类

```
必须验证:
- [ ] position: absolute (在父容器内居中)
- [ ] 居中方式: top:50% + left:50% + transform:translate(-50%,-50%) 或 flex center
- [ ] visibleWhen 表达式正确
- [ ] 插画/图标 width/height 正确
- [ ] 文字 color + textAlign:center
- [ ] CTA 按钮有背景色和圆角
```

---

## 素材验证标准

| 类型 | PNG 最小体积 | 视觉验证 |
|------|:-:|---------|
| Icon (20×20) | 200B | 节点有 backgroundImage, 可辨认形状 |
| Icon (24×24) | 300B | 同上 |
| Illustration (120×120) | 500B | 节点有 backgroundImage, 有明确图案 |

验证命令:
```
1. query/screen_schema → 目标节点 → 检查 styles.backgroundImage 包含 url()
2. 如有疑问 → generate_snapshots → 肉眼检查
```

---

## 常见问题与修复

| 现象 | 根因 | 修复 |
|------|------|------|
| 文字不可见 | 未设 color（默认黑色在暗底上不可见） | style/update → color: "#ffffff" 或 $token |
| TabBar 无内容 | 高度为 0 或子元素未设尺寸 | 检查 height + 子元素 width/height |
| 背景空白无氛围 | 装饰 div 尺寸为 0 或渐变未生效 | 检查 width/height + background 写法 |
| 头像不圆 | 缺 borderRadius | style/update → borderRadius: "999px" |
| NavBar 元素竖排 | flexDirection 默认 column | style/update → flexDirection: "row" |
| 按钮无发光 | 缺 boxShadow | 对照设计文档补上 |
| 素材应用后节点变样 | export_and_apply 覆盖了容器装饰 | 应用到纯净子 div，非容器本身 |
