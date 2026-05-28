# 节点结构树写作红线

> 这是 executor 的直接输入，必须精确到可实施级别。

## 红线 1: 组件必须内联展开

节点树中标注 [组件:X] 的位置，必须展开第一层子节点。
理由: executor 需要看到完整的节点数量才能正确估算和实施。

❌ 信息丢失:
```
└── visibility-sheet [组件:VisibilitySheet]
```

✅ 完整展开:
```
└── visibility-sheet [组件:VisibilitySheet] [visibleWhen:sheetVisible]
    (position:fixed, bottom:0, bg:Layer3, radius:24px 24px 0 0, 毛玻璃)
    ├── drag-bar (w:36, h:4, bg:text-tertiary, radius-full, mx:auto)
    ├── title (heading-md) "选择谁能看到"
    ├── options-list (flex-col)
    │   ├── option-public (h:64, flex-row) [icon:I-07] "公开"
    │   ├── option-targeted (同结构) [icon:I-08] "定向给TA"
    │   └── option-timed (同结构) [icon:I-09] "定时定向"
    └── confirm-btn "确认"
```

## 红线 2: 状态矩阵的每个非基准状态必须有对应节点

§6列出N个状态 → §8/§9节点树必须包含每个状态特有的UI结构。

❌ 信息丢失: §6写了"exhausted: FAB灰+提示Sheet弹出"但§9没有对应节点

✅ 正确: §9底部有:
```
└── exhausted-sheet [visibleWhen:pageState==='exhausted']
    (position:fixed, bottom:0, bg:Layer3, radius:24px top, padding:24px)
    ├── title (heading-md) "今日免费次数已用完"
    ├── buy-btn "购买额外撒网 ¥1"
    ├── item-btn "使用道具"
    └── hint (body-sm, text-tertiary) "明天00:00刷新"
```

## 红线 3: 每个节点行必须包含样式关键词

节点树不是纯结构，必须内联关键样式信息。
理由: executor 的聚合检索会从§4补充完整值，但§9必须提供索引线索。

❌ 信息不足: `├── publish-btn "发布"`
✅ 信息充分: `├── publish-btn (body-md 500, bg:Layer3→gradient激活, radius-sm, padding:6px 16px) "发布" [event:click→发布] [visualState:disabled→active]`

## 红线 4: 叶子节点必须有内容

无子节点的元素必须标注:
- 文字节点: 写出具体文案 "xxx" 或绑定 {{state.xxx}}
- 图标节点: 标注 [素材:ID] 或 [CSS:描述]
- 图片节点: 标注 src 来源或占位方案
