# 校园足迹社交 — 设计状态

## 基本信息
- 创建时间: 2026-05-27
- 最后更新: 2026-05-27 10:31
- 关联项目 ID: 待创建

## 阶段进度
- [x] product-analysis: 已完成（7个模块 + PRD汇总）
- [x] interaction-design: 已完成（全局规范 + 9个核心页面）
- [x] design-plan/Phase 1: 已完成（全局设计系统 design-system.md）✅ 重新分析
- [ ] design-plan/Phase 2: 进行中（3/9 页面完成）
- [ ] design-plan/Phase 3: 未开始
- [ ] design-plan/Phase 4: 未开始
- [ ] theme: 未开始
- [ ] material: 未开始
- [ ] ui-design: 未开始

## 当前焦点
阶段: design-plan Phase 2
状态: 01-home-map ✅ + 02-publish-moment ✅ + 03-fishing ✅ 完成
下一步: 04-register 页面深钻

## 新版设计规划结构（design-planner 技能 v2）
```
每个页面文件夹:
├── visual.md              ← ★ 视觉灵魂(先写)
├── index.md               ← 页面骨架(消费visual规格)
├── components/
│   ├── [name].visual.md   ← ★ 组件视觉(先写)
│   └── [name].md          ← 组件结构+交互(后写)
└── materials/
    └── [ID]-[name].md     ← 素材独立文档(6节完整)
```

## 产出文件索引
```
design-plan/
├── plan.md                              ← 执行计划(40任务)
├── design-system.md                     ← Phase 1 全局Token
├── pages/
│   ├── 01-home-map/                     ✅
│   │   ├── index.md                     (9章)
│   │   ├── components/map-bubble.md, preview-card.md
│   │   └── materials/I-01~I-05 (5个)
│   ├── 02-publish-moment/               ✅
│   │   ├── index.md                     (9章)
│   │   ├── components/visibility-sheet.md
│   │   └── materials/I-06~I-07 (2个)
│   ├── 03-fishing/                      ✅
│   │   ├── index.md                     (9章)
│   │   ├── components/fishing-card.md, greeting-sheet.md
│   │   └── materials/I-08~I-10 (3个)
│   ├── 04-register/                     ✅
│   │   ├── index.md                     (9章)
│   │   ├── components/code-input.md, password-strength.md, interest-picker.md
│   │   └── materials/I-11~I-15 (5个)
│   ├── 05-login/                        ✅
│   │   ├── index.md                     (9章)
│   │   └── materials/I-16~I-17 (2个)
│   ├── 06-moment-detail/                ✅
│   │   ├── index.md                     (9章)
│   │   ├── components/comment-item.md, image-viewer.md
│   │   └── materials/I-18~I-20 (3个)
│   ├── 07-chat/                         ✅
│   │   ├── index.md                     (9章)
│   │   ├── components/message-bubble.md, chat-input-bar.md
│   │   └── materials/I-21~I-23 (3个)
│   ├── 08-message-list/                 ✅
│   │   ├── index.md                     (9章)
│   │   ├── components/conversation-item.md, segment-tabs.md
│   │   └── materials/I-24~I-25 (2个)
│   └── 09-shop/                         ✅
│       ├── index.md                     (9章)
│       ├── components/shop-card.md, purchase-modal.md
│       └── materials/I-26~I-29 (4个)
└── components/
    ├── 01-glow-button/index.md          ✅
    ├── 02-input-field/index.md          ✅
    └── 03-navbar-tabbar/index.md        ✅
```

## 已确认决策
- 位置精度：精确GPS米级，仅限校园范围（校外不开放）
- 可见距离：10米内解锁可见
- 捞人付费：每日3次免费 + 1元/次额外
- 学校认证：MVP不强制，留入口后续升级
- 动态生命周期：永久保留
- 视觉风格：暗色底色 + 活力荧光色 = 「午夜校园发光派对」
- 主色方案：Primary蓝(#4F8CFF) + Secondary紫(#7C5CFC) + Accent红(#FF6B6B) + Gold金(#FFB830)

## 待确认事项
- 无

## 已知阻塞
- 需要在设计编辑器中创建项目才能执行 T-01+
