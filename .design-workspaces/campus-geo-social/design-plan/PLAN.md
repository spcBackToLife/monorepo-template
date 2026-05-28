# 设计规划 · 任务清单（PLAN）

> 由 `plan-gen.ts` 自动生成。每完成一项必须把 `[ ]` 改成 `[x]`。
> 重新运行 `plan-gen.ts` 会保留已打勾的项，并追加新出现的任务。

**总进度**: 1/569 (0%)

---

## ⬜ 00-splash · 启动页  (0/13)

### 视觉先行

- [ ] `design-plan/pages/00-splash/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-splash/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-splash/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-splash/00-splash/brand-area/_block#design` — [区块] 00-splash/brand-area: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-splash/00-splash/brand-area/logo#design` — [元素] 主 Logo: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-splash/00-splash/status-area/_block#design` — [区块] 00-splash/status-area: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-splash/00-splash/status-area/progress#design` — [元素] 隐式进度指示: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-splash/00-splash/status-area/retry-btn#design` — [元素] 重试按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-splash/00-splash/update-modal/_block#design` — [组件] update-modal: 先写 components/update-modal/update-modal.visual.md → 再写 update-modal.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/00-splash/00-splash/update-modal/store-btn#design` — [元素] 去应用商店按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-splash/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-splash/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-splash` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-onboarding · 新用户引导  (0/16)

### 视觉先行

- [ ] `design-plan/pages/00-onboarding/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-onboarding/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-onboarding/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-onboarding/00-onboarding/bottom-cta-btn#design` — [元素] 底部 CTA: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-onboarding/00-onboarding/page-indicator/_block#design` — [区块] 00-onboarding/page-indicator: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-onboarding/00-onboarding/page-indicator/dots#design` — [元素] 圆点指示器组合: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-onboarding/00-onboarding/swiper/_block#design` — [区块] 00-onboarding/swiper: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-onboarding/00-onboarding/swiper/page-1#design` — [元素] 第1屏 · 地理动态: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-onboarding/00-onboarding/swiper/page-2#design` — [元素] 第2屏 · 捞网交友: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-onboarding/00-onboarding/swiper/page-3#design` — [元素] 第3屏 · 时空胶囊: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-onboarding/00-onboarding/swiper/page-4#design` — [元素] 第4屏 · 跨校漫游: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-onboarding/00-onboarding/top-bar/_block#design` — [区块] 00-onboarding/top-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-onboarding/00-onboarding/top-bar/skip-btn#design` — [元素] 跳过按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-onboarding/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-onboarding/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-onboarding` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ✅ 00-login · 登录页  (17/18)

### 视觉先行

- [x] `design-plan/pages/00-login/visual.md`

### 节点级深钻

- [x] `pages/00-login/_page.json#design`
- [x] `pages/00-login/mode-toggle#design`
- [x] `pages/00-login/submit-btn#design`
- [x] `pages/00-login/footer/_block#design`
- [x] `pages/00-login/footer/forgot-link#design`
- [x] `pages/00-login/footer/register-link#design`
- [x] `pages/00-login/form-card/_block#design`
- [x] `pages/00-login/form-card/code-input#design`
- [x] `pages/00-login/form-card/password-input#design`
- [x] `pages/00-login/form-card/phone-input#design`
- [x] `pages/00-login/form-card/send-code-btn#design`
- [x] `pages/00-login/top-area/_block#design`
- [x] `pages/00-login/top-area/logo#design`

### 素材

- [x] `pages/00-login/_materials.json` — 6 项（B-01/I-01/I-02/I-04/D-02/D-03）+ 6 个 materials/*.md 详情

### 收尾

- [x] `design-plan/pages/00-login/index.md` — 完成（10 章，含节点结构树 4 红线自检）
- [x] `validate.ts --page 00-login` — 0 ❌（见下方运行结果）
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 待其余 28 页完成后统一运行

---

## ⬜ 00-register · 注册页  (0/20)

### 视觉先行

- [ ] `design-plan/pages/00-register/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-register/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-register/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-register/00-register/submit-btn#design` — [元素] 注册按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/agreement-row/_block#design` — [区块] 00-register/agreement-row: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-register/00-register/agreement-row/checkbox#design` — [元素] 协议勾选框: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/agreement-row/link-guidelines#design` — [元素] 社区公约链接: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/agreement-row/link-privacy#design` — [元素] 隐私政策链接: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/agreement-row/link-user#design` — [元素] 用户协议链接: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/footer/_block#design` — [区块] 00-register/footer: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-register/00-register/footer/login-link#design` — [元素] 已有账号登录链接: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/form-card/_block#design` — [区块] 00-register/form-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-register/00-register/form-card/code-input#design` — [元素] 验证码输入（6 格）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/form-card/password-input#design` — [元素] 密码输入（含眼睛切换+强度条）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/form-card/phone-input#design` — [元素] 手机号输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/form-card/send-code-btn#design` — [元素] 获取验证码按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-register/00-register/top-area/_block#design` — [区块] 00-register/top-area: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）

### 素材

- [ ] `pages/00-register/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-register/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-register` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-forgot-password · 忘记密码  (0/16)

### 视觉先行

- [ ] `design-plan/pages/00-forgot-password/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-forgot-password/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-forgot-password/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-forgot-password/00-forgot-password/progress-indicator#design` — [元素] 步骤指示 1/2: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-forgot-password/00-forgot-password/submit-btn#design` — [元素] 重置按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-forgot-password/00-forgot-password/app-bar/_block#design` — [区块] 00-forgot-password/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-forgot-password/00-forgot-password/app-bar/back-btn#design` — [元素] 返回按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-forgot-password/00-forgot-password/form-card/_block#design` — [区块] 00-forgot-password/form-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-forgot-password/00-forgot-password/form-card/code-input#design` — [元素] 验证码输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-forgot-password/00-forgot-password/form-card/confirm-password-input#design` — [元素] 确认新密码: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-forgot-password/00-forgot-password/form-card/new-password-input#design` — [元素] 新密码输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-forgot-password/00-forgot-password/form-card/phone-input#design` — [元素] 手机号输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-forgot-password/00-forgot-password/form-card/send-code-btn#design` — [元素] 获取验证码: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-forgot-password/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-forgot-password/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-forgot-password` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-auth-school-select · 选择学校  (0/22)

### 视觉先行

- [ ] `design-plan/pages/00-auth-school-select/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-auth-school-select/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-auth-school-select/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-auth-school-select/00-auth-school-select/not-found-link#design` — [元素] 找不到我的学校: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/search-input#design` — [元素] 学校搜索输入框: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/app-bar/_block#design` — [区块] 00-auth-school-select/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-school-select/00-auth-school-select/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/appeal-sheet/_block#design` — [组件] appeal-sheet: 先写 components/appeal-sheet/appeal-sheet.visual.md → 再写 appeal-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/00-auth-school-select/00-auth-school-select/appeal-sheet/form-fields#design` — [元素] 申诉表字段组: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/appeal-sheet/submit-btn#design` — [元素] 提交申诉: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/campus-sheet/_block#design` — [组件] campus-sheet: 先写 components/campus-sheet/campus-sheet.visual.md → 再写 campus-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/00-auth-school-select/00-auth-school-select/campus-sheet/confirm-btn#design` — [元素] sheet 确认按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/campus-sheet/items#design` — [元素] 校区项列表: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/campus-sheet/mask#design` — [元素] sheet 蒙层: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/empty-state/_block#design` — [区块] 00-auth-school-select/empty-state: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-school-select/00-auth-school-select/hot-list/_block#design` — [区块] 00-auth-school-select/hot-list: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-school-select/00-auth-school-select/hot-list/items#design` — [元素] 热门学校项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-school-select/00-auth-school-select/result-list/_block#design` — [区块] 00-auth-school-select/result-list: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-school-select/00-auth-school-select/result-list/items#design` — [元素] 搜索结果项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-auth-school-select/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-auth-school-select/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-auth-school-select` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-auth-id-card · 上传学生证（OCR）  (0/22)

### 视觉先行

- [ ] `design-plan/pages/00-auth-id-card/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-auth-id-card/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-auth-id-card/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-auth-id-card/00-auth-id-card/manual-toggle#design` — [元素] 切到手动输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/submit-btn#design` — [元素] 提交: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/actions/_block#design` — [区块] 00-auth-id-card/actions: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-id-card/00-auth-id-card/actions/album-btn#design` — [元素] 相册按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/actions/capture-btn#design` — [元素] 拍照按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/actions/recapture-btn#design` — [元素] 重拍按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/app-bar/_block#design` — [区块] 00-auth-id-card/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-id-card/00-auth-id-card/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/ocr-result/_block#design` — [组件] ocr-result: 先写 components/ocr-result/ocr-result.visual.md → 再写 ocr-result.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/00-auth-id-card/00-auth-id-card/ocr-result/fields#design` — [元素] OCR 字段组（姓名/学号/院系/年级）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/permission-denied-card/_block#design` — [区块] 00-auth-id-card/permission-denied-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-id-card/00-auth-id-card/permission-denied-card/settings-btn#design` — [元素] 去系统设置: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/preview-area/_block#design` — [区块] 00-auth-id-card/preview-area: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-id-card/00-auth-id-card/preview-area/preview#design` — [元素] 实时预览/已拍图: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-id-card/00-auth-id-card/why-card/_block#design` — [区块] 00-auth-id-card/why-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-id-card/00-auth-id-card/why-card/help-btn#design` — [元素] 展开/收起: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-auth-id-card/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-auth-id-card/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-auth-id-card` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-auth-xuexin · 学信网授权  (0/15)

### 视觉先行

- [ ] `design-plan/pages/00-auth-xuexin/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-auth-xuexin/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-auth-xuexin/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/fallback-btn#design` — [元素] 走人工审核（降级）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/privacy-note#design` — [元素] 隐私承诺说明: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/start-auth-btn#design` — [元素] 开始授权: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/app-bar/_block#design` — [区块] 00-auth-xuexin/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/awaiting-card/_block#design` — [区块] 00-auth-xuexin/awaiting-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/awaiting-card/cancel-btn#design` — [元素] 取消等待: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/info-card/_block#design` — [区块] 00-auth-xuexin/info-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-xuexin/00-auth-xuexin/info-card/help-btn#design` — [元素] 展开/收起: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-auth-xuexin/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-auth-xuexin/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-auth-xuexin` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-auth-face · 人脸核身  (0/21)

### 视觉先行

- [ ] `design-plan/pages/00-auth-face/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-auth-face/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-auth-face/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-auth-face/00-auth-face/start-btn#design` — [元素] 开始检测: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/app-bar/_block#design` — [区块] 00-auth-face/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-face/00-auth-face/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/error-card/_block#design` — [组件] error-card: 先写 components/error-card/error-card.visual.md → 再写 error-card.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/00-auth-face/00-auth-face/error-card/retry-btn#design` — [元素] 再试一次: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/error-card/upload-video-btn#design` — [元素] 上传手持视频: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/face-camera/_block#design` — [区块] 00-auth-face/face-camera: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-face/00-auth-face/face-camera/action-icon#design` — [元素] 动作图标: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/face-camera/guide-frame#design` — [元素] 椭圆引导框: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/face-camera/hint-text#design` — [元素] 提示文案: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/face-camera/preview#design` — [元素] 实时预览（活体检测）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/info-card/_block#design` — [区块] 00-auth-face/info-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-face/00-auth-face/info-card/help-btn#design` — [元素] 展开/收起: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-face/00-auth-face/permission-denied-card/_block#design` — [区块] 00-auth-face/permission-denied-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-face/00-auth-face/permission-denied-card/settings-btn#design` — [元素] 去系统设置: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-auth-face/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-auth-face/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-auth-face` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-auth-status · 认证状态等待  (0/20)

### 视觉先行

- [ ] `design-plan/pages/00-auth-status/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-auth-status/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-auth-status/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-auth-status/00-auth-status/refresh-trigger#design` — [元素] 轮询触发器: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/app-bar/_block#design` — [区块] 00-auth-status/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-status/00-auth-status/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/cta-area/_block#design` — [区块] 00-auth-status/cta-area: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-status/00-auth-status/cta-area/appeal-btn#design` — [元素] 立即申诉: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/cta-area/appeal-progress-btn#design` — [元素] 查看申诉进度: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/cta-area/contact-btn#design` — [元素] 联系客服: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/cta-area/explore-btn#design` — [元素] 去探索（受限模式）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/cta-area/resubmit-btn#design` — [元素] 修改重提: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/status-card/_block#design` — [区块] 00-auth-status/status-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-auth-status/00-auth-status/status-card/animation#design` — [元素] 状态动画: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/status-card/desc#design` — [元素] 状态描述+预计时长: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/status-card/reason#design` — [元素] 驳回原因卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-auth-status/00-auth-status/status-card/title#design` — [元素] 状态标题: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-auth-status/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-auth-status/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-auth-status` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 00-profile-init · 完善基础资料  (0/18)

### 视觉先行

- [ ] `design-plan/pages/00-profile-init/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/00-profile-init/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/00-profile-init/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/00-profile-init/00-profile-init/avatar-picker#design` — [元素] 头像选择器: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/progress-indicator#design` — [元素] 进度指示: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/submit-btn#design` — [元素] 完成按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/app-bar/_block#design` — [区块] 00-profile-init/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-profile-init/00-profile-init/app-bar/skip-btn#design` — [元素] 跳过: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/form-card/_block#design` — [区块] 00-profile-init/form-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-profile-init/00-profile-init/form-card/bio-input#design` — [元素] 简介输入（textarea）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/form-card/gender-picker#design` — [元素] 性别选择（3 选 1）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/form-card/nickname-input#design` — [元素] 昵称输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/form-card/nickname-suggestion#design` — [元素] 昵称建议: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/00-profile-init/00-profile-init/xuexin-info-card/_block#design` — [区块] 00-profile-init/xuexin-info-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/00-profile-init/00-profile-init/xuexin-info-card/toggle-btn#design` — [元素] 展开/收起: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/00-profile-init/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/00-profile-init/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 00-profile-init` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-home-map · 首页地图  (0/23)

### 视觉先行

- [ ] `design-plan/pages/01-home-map/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-home-map/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-home-map/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-home-map/01-home-map/fab#design` — [元素] 发布浮动按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/radius-toggle#design` — [元素] 半径切换 50/200/500m: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/recenter-btn#design` — [元素] 回到当前位置: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/roaming-banner#design` — [元素] 跨校漫游 banner: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/top-tabs#design` — [元素] Map/Feed 切换: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/app-bar/_block#design` — [区块] 01-home-map/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-home-map/01-home-map/app-bar/campus-btn#design` — [元素] 校园切换: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/app-bar/notify-btn#design` — [元素] 通知中心: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/app-bar/search-btn#design` — [元素] 搜索按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/cluster-sheet/_block#design` — [组件] cluster-sheet: 先写 components/cluster-sheet/cluster-sheet.visual.md → 再写 cluster-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-home-map/01-home-map/cluster-sheet/items#design` — [元素] sheet 动态列表项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/cluster-sheet/mask#design` — [元素] sheet 蒙层: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/map-canvas/_block#design` — [组件] map-canvas: 先写 components/map-canvas/map-canvas.visual.md → 再写 map-canvas.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-home-map/01-home-map/map-canvas/clusters#design` — [元素] 聚合气泡: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/map-canvas/markers#design` — [元素] 动态点位 marker: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-map/01-home-map/permission-card/_block#design` — [区块] 01-home-map/permission-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-home-map/01-home-map/permission-card/grant-btn#design` — [元素] 开启定位: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-home-map/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-home-map/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-home-map` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-home-feed · 首页 Feed 列表  (0/19)

### 视觉先行

- [ ] `design-plan/pages/01-home-feed/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-home-feed/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-home-feed/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-home-feed/01-home-feed/fab#design` — [元素] 发布浮动按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/sort-tabs#design` — [元素] 排序 Tab（距离/最新/最热）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/top-tabs#design` — [元素] Map/Feed 切换: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/app-bar/_block#design` — [区块] 01-home-feed/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-home-feed/01-home-feed/app-bar/campus-btn#design` — [元素] 校园切换: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/app-bar/notify-btn#design` — [元素] 通知中心: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/app-bar/search-btn#design` — [元素] 搜索: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/empty-state/_block#design` — [组件] empty-state: 先写 components/empty-state/empty-state.visual.md → 再写 empty-state.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-home-feed/01-home-feed/empty-state/expand-radius-btn#design` — [元素] 扩大半径: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/empty-state/plaza-btn#design` — [元素] 去广场: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/empty-state/post-btn#design` — [元素] 自己来发一条: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-home-feed/01-home-feed/feed-list/_block#design` — [组件] feed-list: 先写 components/feed-list/feed-list.visual.md → 再写 feed-list.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-home-feed/01-home-feed/feed-list/items#design` — [元素] 动态卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-home-feed/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-home-feed/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-home-feed` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-moment-detail · 动态详情  (0/27)

### 视觉先行

- [ ] `design-plan/pages/01-moment-detail/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-moment-detail/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-moment-detail/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-moment-detail/01-moment-detail/passers-stat-btn#design` — [元素] 路过统计: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/roaming-banner#design` — [元素] 跨校漫游 banner: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/tag-row#design` — [元素] 标签气泡组: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/text-content#design` — [元素] 文字正文: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/action-bar/_block#design` — [区块] 01-moment-detail/action-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-moment-detail/01-moment-detail/action-bar/comment-btn#design` — [元素] 评论: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/action-bar/like-btn#design` — [元素] 点赞: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/action-bar/more-btn#design` — [元素] 更多: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/action-bar/share-btn#design` — [元素] 分享: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/app-bar/_block#design` — [区块] 01-moment-detail/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-moment-detail/01-moment-detail/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/app-bar/share-shortcut-btn#design` — [元素] 分享快捷入口: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/author-card/_block#design` — [区块] 01-moment-detail/author-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-moment-detail/01-moment-detail/author-card/avatar#design` — [元素] 作者头像: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/author-card/follow-btn#design` — [元素] 关注按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/location-card/_block#design` — [区块] 01-moment-detail/location-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-moment-detail/01-moment-detail/location-card/view-detail-btn#design` — [元素] 查看地点详情: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/media-carousel/_block#design` — [组件] media-carousel: 先写 components/media-carousel/media-carousel.visual.md → 再写 media-carousel.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-moment-detail/01-moment-detail/media-carousel/slides#design` — [元素] 媒体帧: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-moment-detail/01-moment-detail/more-menu/_block#design` — [组件] more-menu: 先写 components/more-menu/more-menu.visual.md → 再写 more-menu.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-moment-detail/01-moment-detail/more-menu/items#design` — [元素] 菜单项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-moment-detail/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-moment-detail/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-moment-detail` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-publish-entry · 发布入口选择  (0/14)

### 视觉先行

- [ ] `design-plan/pages/01-publish-entry/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-publish-entry/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-publish-entry/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-publish-entry/01-publish-entry/mask#design` — [元素] sheet 蒙层: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-entry/01-publish-entry/restricted-banner#design` — [元素] 受限提示 banner: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-entry/01-publish-entry/app-bar/_block#design` — [区块] 01-publish-entry/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-entry/01-publish-entry/app-bar/close-btn#design` — [元素] 关闭按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-entry/01-publish-entry/app-bar/handle#design` — [元素] 拖手柄: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-entry/01-publish-entry/entry-cards/_block#design` — [区块] 01-publish-entry/entry-cards: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-entry/01-publish-entry/entry-cards/capsule-btn#design` — [元素] 埋胶囊卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-entry/01-publish-entry/entry-cards/moment-btn#design` — [元素] 发动态卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-publish-entry/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-publish-entry/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-publish-entry` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-publish-edit · 编辑动态  (0/25)

### 视觉先行

- [ ] `design-plan/pages/01-publish-edit/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-publish-edit/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-publish-edit/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-publish-edit/01-publish-edit/location-row#design` — [元素] 地点行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/text-editor#design` — [元素] 文字编辑器: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/visibility-row#design` — [元素] 可见性行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/app-bar/_block#design` — [区块] 01-publish-edit/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-edit/01-publish-edit/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/app-bar/publish-btn#design` — [元素] 发布按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/draft-modal/_block#design` — [组件] draft-modal: 先写 components/draft-modal/draft-modal.visual.md → 再写 draft-modal.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-edit/01-publish-edit/draft-modal/continue-btn#design` — [元素] 继续编辑: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/draft-modal/restart-btn#design` — [元素] 重新开始: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/exit-modal/_block#design` — [组件] exit-modal: 先写 components/exit-modal/exit-modal.visual.md → 再写 exit-modal.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-edit/01-publish-edit/exit-modal/cancel-btn#design` — [元素] 取消（继续编辑）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/exit-modal/discard-btn#design` — [元素] 丢弃: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/exit-modal/save-btn#design` — [元素] 存草稿: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/media-grid/_block#design` — [组件] media-grid: 先写 components/media-grid/media-grid.visual.md → 再写 media-grid.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-edit/01-publish-edit/media-grid/add-btn#design` — [元素] + 添加媒体: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/media-grid/items#design` — [元素] 媒体项（含 delete-x/drag/retry-btn）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/tag-row/_block#design` — [区块] 01-publish-edit/tag-row: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-edit/01-publish-edit/tag-row/add-btn#design` — [元素] + 添加标签: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-edit/01-publish-edit/tag-row/items#design` — [元素] 标签气泡: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-publish-edit/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-publish-edit/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-publish-edit` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-publish-pick-location · 选择地点  (0/21)

### 视觉先行

- [ ] `design-plan/pages/01-publish-pick-location/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-publish-pick-location/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-publish-pick-location/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/confirm-btn#design` — [元素] 确认: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/poi-card#design` — [元素] POI 卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/radius-toggle#design` — [元素] 半径切换 50/200/500m: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/recenter-btn#design` — [元素] 回到当前位置: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/search-input#design` — [元素] 搜索 POI 输入框: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/app-bar/_block#design` — [区块] 01-publish-pick-location/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/map-canvas/_block#design` — [组件] map-canvas: 先写 components/map-canvas/map-canvas.visual.md → 再写 map-canvas.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/map-canvas/center-pin#design` — [元素] 中心 pin: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/map-canvas/radius-overlay#design` — [元素] 半径圈圈: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/out-of-campus-modal/_block#design` — [组件] out-of-campus-modal: 先写 components/out-of-campus-modal/out-of-campus-modal.visual.md → 再写 out-of-campus-modal.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/out-of-campus-modal/cancel-btn#design` — [元素] 取消降级: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/out-of-campus-modal/confirm-btn#design` — [元素] 确认降级: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/search-result-list/_block#design` — [区块] 01-publish-pick-location/search-result-list: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-pick-location/01-publish-pick-location/search-result-list/items#design` — [元素] POI 结果项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-publish-pick-location/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-publish-pick-location/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-publish-pick-location` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-publish-visibility · 设置可见性  (0/23)

### 视觉先行

- [ ] `design-plan/pages/01-publish-visibility/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-publish-visibility/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-publish-visibility/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-publish-visibility/01-publish-visibility/anonymous-toggle#design` — [元素] 匿名开关: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/cross-campus-toggle#design` — [元素] 跨校广场池开关: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/save-btn#design` — [元素] 保存: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/app-bar/_block#design` — [区块] 01-publish-visibility/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-visibility/01-publish-visibility/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/app-bar/cancel-btn#design` — [元素] 取消: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/custom-duration-sheet/_block#design` — [组件] custom-duration-sheet: 先写 components/custom-duration-sheet/custom-duration-sheet.visual.md → 再写 custom-duration-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-visibility/01-publish-visibility/custom-duration-sheet/confirm-btn#design` — [元素] 确认: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/custom-duration-sheet/input#design` — [元素] 天数输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/duration-options/_block#design` — [区块] 01-publish-visibility/duration-options: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-visibility/01-publish-visibility/duration-options/custom-item#design` — [元素] 自定义时效: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/duration-options/items#design` — [元素] 时效预设项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/friends-row/_block#design` — [区块] 01-publish-visibility/friends-row: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-visibility/01-publish-visibility/friends-row/avatar-bubbles#design` — [元素] 已选好友气泡: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/friends-row/select-trigger#design` — [元素] 选择投递好友: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-visibility/01-publish-visibility/visibility-cards/_block#design` — [区块] 01-publish-visibility/visibility-cards: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-visibility/01-publish-visibility/visibility-cards/items#design` — [元素] 可见性卡片项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-publish-visibility/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-publish-visibility/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-publish-visibility` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-publish-target-friends · 选择投递好友  (0/21)

### 视觉先行

- [ ] `design-plan/pages/01-publish-target-friends/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-publish-target-friends/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-publish-target-friends/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/confirm-btn#design` — [元素] 完成: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/search-input#design` — [元素] 搜索框: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/app-bar/_block#design` — [区块] 01-publish-target-friends/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/app-bar/cancel-btn#design` — [元素] 取消: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/empty-state/_block#design` — [组件] empty-state: 先写 components/empty-state/empty-state.visual.md → 再写 empty-state.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/empty-state/cast-net-btn#design` — [元素] 去捞网: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/friends-list/_block#design` — [组件] friends-list: 先写 components/friends-list/friends-list.visual.md → 再写 friends-list.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/friends-list/items#design` — [元素] 好友行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/letter-index/_block#design` — [区块] 01-publish-target-friends/letter-index: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/letter-index/items#design` — [元素] 字母项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/selected-bubbles/_block#design` — [区块] 01-publish-target-friends/selected-bubbles: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/selected-bubbles/items#design` — [元素] 已选气泡（含 x）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/top-bar/_block#design` — [区块] 01-publish-target-friends/top-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-publish-target-friends/01-publish-target-friends/top-bar/select-all-btn#design` — [元素] 全选当前可见: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-publish-target-friends/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-publish-target-friends/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-publish-target-friends` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 01-comments · 评论列表  (0/21)

### 视觉先行

- [ ] `design-plan/pages/01-comments/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/01-comments/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/01-comments/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/01-comments/01-comments/sort-tabs#design` — [元素] 排序 Tab: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/app-bar/_block#design` — [区块] 01-comments/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-comments/01-comments/app-bar/close-btn#design` — [元素] 关闭: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/app-bar/handle#design` — [元素] 拖手柄: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/app-bar/title#design` — [元素] 标题: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/comment-list/_block#design` — [组件] comment-list: 先写 components/comment-list/comment-list.visual.md → 再写 comment-list.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-comments/01-comments/comment-list/items#design` — [元素] 评论项（含 reply/avatar/long-press/double-tap）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/composer/_block#design` — [区块] 01-comments/composer: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/01-comments/01-comments/composer/add-image-btn#design` — [元素] 添加图片（V1.x）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/composer/reply-cancel-btn#design` — [元素] 取消回复: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/composer/send-btn#design` — [元素] 发送: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/composer/text-input#design` — [元素] 评论文本框: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/01-comments/01-comments/empty-state/_block#design` — [组件] empty-state: 先写 components/empty-state/empty-state.visual.md → 再写 empty-state.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-comments/01-comments/mention-picker/_block#design` — [组件] mention-picker: 先写 components/mention-picker/mention-picker.visual.md → 再写 mention-picker.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/01-comments/01-comments/mention-picker/items#design` — [元素] @ 选项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/01-comments/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/01-comments/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 01-comments` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 02-fishing-cast · 开网  (0/20)

### 视觉先行

- [ ] `design-plan/pages/02-fishing-cast/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/02-fishing-cast/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/02-fishing-cast/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/02-fishing-cast/02-fishing-cast/cast-btn#design` — [元素] 撒网按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/prediction-card#design` — [元素] 活跃预测卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/restricted-banner#design` — [元素] 门禁横幅: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/insufficient-sheet/_block#design` — [组件] insufficient-sheet: 先写 components/insufficient-sheet/insufficient-sheet.visual.md → 再写 insufficient-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-fishing-cast/02-fishing-cast/insufficient-sheet/buy-btn#design` — [元素] 去充值: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/insufficient-sheet/cancel-btn#design` — [元素] 取消: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/map-preview/_block#design` — [组件] map-preview: 先写 components/map-preview/map-preview.visual.md → 再写 map-preview.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-fishing-cast/02-fishing-cast/map-preview/radius-circle#design` — [元素] 撒网半径圈: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/net-type-cards/_block#design` — [区块] 02-fishing-cast/net-type-cards: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-fishing-cast/02-fishing-cast/net-type-cards/info-btn#design` — [元素] 网说明按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/net-type-cards/items#design` — [元素] 网卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/top-bar/_block#design` — [区块] 02-fishing-cast/top-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-fishing-cast/02-fishing-cast/top-bar/collections-entry-btn#design` — [元素] 收藏入口: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-cast/02-fishing-cast/top-bar/greets-entry-btn#design` — [元素] 招呼入口: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/02-fishing-cast/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/02-fishing-cast/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 02-fishing-cast` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 02-fishing-result · 撒网结果  (0/18)

### 视觉先行

- [ ] `design-plan/pages/02-fishing-result/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/02-fishing-result/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/02-fishing-result/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/02-fishing-result/02-fishing-result/ceremony-animation#design` — [元素] 撒网仪式动画: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-result/02-fishing-result/skip-btn#design` — [元素] 跳过: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-result/02-fishing-result/action-buttons/_block#design` — [区块] 02-fishing-result/action-buttons: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-fishing-result/02-fishing-result/action-buttons/collect-btn#design` — [元素] 收藏按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-result/02-fishing-result/action-buttons/greet-btn#design` — [元素] 打招呼按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-result/02-fishing-result/action-buttons/ignore-btn#design` — [元素] 无视按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-result/02-fishing-result/app-bar/_block#design` — [区块] 02-fishing-result/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-fishing-result/02-fishing-result/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-result/02-fishing-result/card-stack/_block#design` — [组件] card-stack: 先写 components/card-stack/card-stack.visual.md → 再写 card-stack.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-fishing-result/02-fishing-result/card-stack/items#design` — [元素] 人物卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-result/02-fishing-result/empty-state/_block#design` — [组件] empty-state: 先写 components/empty-state/empty-state.visual.md → 再写 empty-state.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-fishing-result/02-fishing-result/empty-state/cast-again-btn#design` — [元素] 再撒一网: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/02-fishing-result/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/02-fishing-result/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 02-fishing-result` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 02-greet-compose · 招呼输入  (0/23)

### 视觉先行

- [ ] `design-plan/pages/02-greet-compose/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/02-greet-compose/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/02-greet-compose/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/02-greet-compose/02-greet-compose/custom-input#design` — [元素] 自定义输入框: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/diamond-cost-info#design` — [元素] 免费次数与钻石消耗提示: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/emoji-trigger#design` — [元素] 表情按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/send-btn#design` — [元素] 发送按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/app-bar/_block#design` — [区块] 02-greet-compose/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greet-compose/02-greet-compose/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/app-bar/target-info#design` — [元素] 目标用户信息: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/confirm-cost-sheet/_block#design` — [组件] confirm-cost-sheet: 先写 components/confirm-cost-sheet/confirm-cost-sheet.visual.md → 再写 confirm-cost-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-greet-compose/02-greet-compose/confirm-cost-sheet/no-btn#design` — [元素] 取消消耗: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/confirm-cost-sheet/yes-btn#design` — [元素] 确认消耗: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/emoji-picker/_block#design` — [组件] emoji-picker: 先写 components/emoji-picker/emoji-picker.visual.md → 再写 emoji-picker.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-greet-compose/02-greet-compose/emoji-picker/items#design` — [元素] 表情项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/emoji-picker/mask#design` — [元素] 面板遮罩: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/insufficient-diamonds-sheet/_block#design` — [组件] insufficient-diamonds-sheet: 先写 components/insufficient-diamonds-sheet/insufficient-diamonds-sheet.visual.md → 再写 insufficient-diamonds-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-greet-compose/02-greet-compose/insufficient-diamonds-sheet/buy-btn#design` — [元素] 去充值: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greet-compose/02-greet-compose/preset-list/_block#design` — [区块] 02-greet-compose/preset-list: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greet-compose/02-greet-compose/preset-list/items#design` — [元素] 预设话术项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/02-greet-compose/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/02-greet-compose/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 02-greet-compose` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 02-greets-received · 收到的招呼  (0/18)

### 视觉先行

- [ ] `design-plan/pages/02-greets-received/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/02-greets-received/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/02-greets-received/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/02-greets-received/02-greets-received/app-bar/_block#design` — [区块] 02-greets-received/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-received/02-greets-received/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-received/02-greets-received/empty-state/_block#design` — [组件] empty-state: 先写 components/empty-state/empty-state.visual.md → 再写 empty-state.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-greets-received/02-greets-received/greets-list/_block#design` — [区块] 02-greets-received/greets-list: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-received/02-greets-received/greets-list/items#design` — [元素] 招呼项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-received/02-greets-received/top-tabs/_block#design` — [区块] 02-greets-received/top-tabs: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-received/02-greets-received/top-tabs/received-tab#design` — [元素] 收到 Tab: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-received/02-greets-received/top-tabs/sent-tab#design` — [元素] 发出 Tab: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-received/02-greets-received/greets-list/actions/_block#design` — [区块] 02-greets-received/greets-list/actions: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-received/02-greets-received/greets-list/actions/add-friend-btn#design` — [元素] 加好友: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-received/02-greets-received/greets-list/actions/decline-btn#design` — [元素] 拒绝: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-received/02-greets-received/greets-list/actions/reply-btn#design` — [元素] 回复: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/02-greets-received/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/02-greets-received/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 02-greets-received` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 02-greets-sent · 发出的招呼  (0/18)

### 视觉先行

- [ ] `design-plan/pages/02-greets-sent/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/02-greets-sent/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/02-greets-sent/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/02-greets-sent/02-greets-sent/app-bar/_block#design` — [区块] 02-greets-sent/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-sent/02-greets-sent/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-sent/02-greets-sent/app-bar/clear-finished-btn#design` — [元素] 清空已结束: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-sent/02-greets-sent/empty-state/_block#design` — [组件] empty-state: 先写 components/empty-state/empty-state.visual.md → 再写 empty-state.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-greets-sent/02-greets-sent/greets-list/_block#design` — [区块] 02-greets-sent/greets-list: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-sent/02-greets-sent/greets-list/items#design` — [元素] 已发项: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-sent/02-greets-sent/top-tabs/_block#design` — [区块] 02-greets-sent/top-tabs: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-sent/02-greets-sent/top-tabs/received-tab#design` — [元素] 收到 Tab: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-sent/02-greets-sent/top-tabs/sent-tab#design` — [元素] 发出 Tab: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-sent/02-greets-sent/greets-list/actions/_block#design` — [区块] 02-greets-sent/greets-list/actions: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-greets-sent/02-greets-sent/greets-list/actions/open-conversation-btn#design` — [元素] 进入会话: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-greets-sent/02-greets-sent/greets-list/actions/withdraw-btn#design` — [元素] 撤回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/02-greets-sent/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/02-greets-sent/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 02-greets-sent` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 02-fishing-collections · 我的捞捕收藏  (0/16)

### 视觉先行

- [ ] `design-plan/pages/02-fishing-collections/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/02-fishing-collections/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/02-fishing-collections/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/02-fishing-collections/02-fishing-collections/app-bar/_block#design` — [区块] 02-fishing-collections/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-fishing-collections/02-fishing-collections/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-collections/02-fishing-collections/app-bar/clear-expired-btn#design` — [元素] 清理过期: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-collections/02-fishing-collections/collections-grid/_block#design` — [区块] 02-fishing-collections/collections-grid: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-fishing-collections/02-fishing-collections/collections-grid/items#design` — [元素] 收藏卡片: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-collections/02-fishing-collections/collections-grid/sheet-mask#design` — [元素] 详情遮罩: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-collections/02-fishing-collections/empty-state/_block#design` — [组件] empty-state: 先写 components/empty-state/empty-state.visual.md → 再写 empty-state.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/02-fishing-collections/02-fishing-collections/collections-grid/actions/_block#design` — [区块] 02-fishing-collections/collections-grid/actions: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/02-fishing-collections/02-fishing-collections/collections-grid/actions/greet-btn#design` — [元素] 打招呼: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/02-fishing-collections/02-fishing-collections/collections-grid/actions/remove-btn#design` — [元素] 移除: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/02-fishing-collections/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/02-fishing-collections/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 02-fishing-collections` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 09-community-guidelines · 社区公约  (0/19)

### 视觉先行

- [ ] `design-plan/pages/09-community-guidelines/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/09-community-guidelines/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/09-community-guidelines/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/09-community-guidelines/09-community-guidelines/update-banner#design` — [元素] 新版本变更提示 Banner: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/version-banner#design` — [元素] 版本号 Banner: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/app-bar/_block#design` — [区块] 09-community-guidelines/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/09-community-guidelines/09-community-guidelines/app-bar/back-btn#design` — [元素] 返回按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/app-bar/title#design` — [元素] 页标题: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/app-bar/toc-btn#design` — [元素] 目录按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/bottom-cta/_block#design` — [区块] 09-community-guidelines/bottom-cta: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/09-community-guidelines/09-community-guidelines/bottom-cta/agree-btn#design` — [元素] 同意并继续按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/content-area/_block#design` — [区块] 09-community-guidelines/content-area: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/09-community-guidelines/09-community-guidelines/content-area/markdown-body#design` — [元素] Markdown 主体: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/toc-sheet/_block#design` — [组件] toc-sheet: 先写 components/toc-sheet/toc-sheet.visual.md → 再写 toc-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/09-community-guidelines/09-community-guidelines/toc-sheet/items#design` — [元素] 目录项列表: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/09-community-guidelines/09-community-guidelines/toc-sheet/mask#design` — [元素] 蒙层: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/09-community-guidelines/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/09-community-guidelines/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 09-community-guidelines` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 11-change-password · 修改密码  (0/15)

### 视觉先行

- [ ] `design-plan/pages/11-change-password/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-change-password/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/11-change-password/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/11-change-password/11-change-password/forgot-link#design` — [元素] 忘记密码链接: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-change-password/11-change-password/security-note#design` — [元素] 安全提示: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-change-password/11-change-password/submit-btn#design` — [元素] 保存按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-change-password/11-change-password/app-bar/_block#design` — [区块] 11-change-password/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/11-change-password/11-change-password/app-bar/back-btn#design` — [元素] 返回: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-change-password/11-change-password/form-card/_block#design` — [区块] 11-change-password/form-card: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/11-change-password/11-change-password/form-card/confirm-password-input#design` — [元素] 确认新密码: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-change-password/11-change-password/form-card/new-password-input#design` — [元素] 新密码输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-change-password/11-change-password/form-card/old-password-input#design` — [元素] 旧密码输入: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/11-change-password/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/11-change-password/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 11-change-password` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---

## ⬜ 11-about · 关于  (0/27)

### 视觉先行

- [ ] `design-plan/pages/11-about/visual.md` — ★ 视觉先行：写页面级视觉分析（情感/层级/手段/分类/素材需求/样式规格）
      ↳ 必须先于 index.md 与所有组件/素材文档

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-about/_page.json#design` — 页面级 design 层 + 写 design-plan/pages/11-about/index.md
      ↳ index.md 必须最后写，是对所有区块/节点样式的汇总+节点结构树
- [ ] `pages/11-about/11-about/rating-banner#design` — [元素] 评分入口浮层（彩蛋）: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/app-bar/_block#design` — [区块] 11-about/app-bar: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/11-about/11-about/app-bar/back-btn#design` — [元素] 返回按钮: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/app-bar/title#design` — [元素] 标题: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/contact-sheet/_block#design` — [组件] contact-sheet: 先写 components/contact-sheet/contact-sheet.visual.md → 再写 contact-sheet.md → write-node.ts 追加 design 层
      ↳ 组件 visual.md 必须先于结构文档
- [ ] `pages/11-about/11-about/contact-sheet/faq-option#design` — [元素] 常见问题: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/contact-sheet/online-option#design` — [元素] 在线客服: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/contact-sheet/ticket-option#design` — [元素] 提交工单: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/hero/_block#design` — [区块] 11-about/hero: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/11-about/11-about/hero/app-name#design` — [元素] 应用名: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/hero/logo#design` — [元素] 应用 Logo: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/hero/version-text#design` — [元素] 版本号: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/icp-footer/_block#design` — [区块] 11-about/icp-footer: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/11-about/11-about/icp-footer/text#design` — [元素] ICP 备案文本: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/menu/_block#design` — [区块] 11-about/menu: write-node.ts 追加 design 层（summary/ref/visualRef/layoutHint）
- [ ] `pages/11-about/11-about/menu/about-us-row#design` — [元素] 关于我们行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/menu/check-update-row#design` — [元素] 检查更新行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/menu/community-guidelines-row#design` — [元素] 社区公约行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/menu/contact-row#design` — [元素] 联系客服行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/menu/privacy-policy-row#design` — [元素] 隐私政策行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）
- [ ] `pages/11-about/11-about/menu/user-agreement-row#design` — [元素] 用户协议行: write-node.ts 追加 design 层（summary/ref + 多状态需 visualStates）

### 素材

- [ ] `pages/11-about/_materials.json` — 从 visual.md「素材需求清单」反推，create-node.ts 写 _materials.json 后逐个建素材 md

### 收尾

- [ ] `design-plan/pages/11-about/index.md` — 汇总：写页面 index.md（区块详细 + 节点结构树，引用前面已写的节点/组件/素材）
      ↳ 必须遵守节点结构树 4 条红线（组件内联展开/状态对应节点/样式关键词/叶子有内容）
- [ ] `validate.ts --page 11-about` — 运行节点完整性校验
- [ ] `stage-gate.ts --stage design --mode exit (整体)` — 所有页面完成后运行设计阶段出门校验

---
