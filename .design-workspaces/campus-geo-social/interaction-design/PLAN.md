# 交互设计 · 任务清单（PLAN）

> 由 `plan-gen.ts` 自动生成。每完成一项必须把 `[ ]` 改成 `[x]`。
> 重新运行 `plan-gen.ts` 会保留已打勾的项，并追加新出现的任务。

**总进度**: 87/256 (34.0%)

---

## ✅ 00-splash · 启动页  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-splash.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [x] `pages/00-splash/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）

### 节点级深钻

- [x] `pages/00-splash/<block>/<element>.json` — 7 个节点（brand-area/_component,logo + status-area/_component,progress,retry-btn + update-modal/_component,store-btn）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 待全部 64 页完成后统一运行

---

## ✅ 00-onboarding · 新用户引导  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-onboarding.md`
- [x] `pages/00-onboarding/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-onboarding/<block>/<element>.json` — 10 个节点（top-bar/_component,skip-btn + swiper/_component,page-1..4 + page-indicator/_component,dots + bottom-cta-btn）

### 收尾

- [ ] 待统一收尾

---

## ✅ 00-login · 登录页  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-login.md`
- [x] `pages/00-login/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-login/<block>/<element>.json` — 11 个节点（top-area/_component + mode-toggle + form-card/_component,phone-input,code-input,password-input,send-code-btn + submit-btn + footer/_component,register-link,forgot-link）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-register · 注册页  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-register.md`
- [x] `pages/00-register/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-register/<block>/<element>.json` — 14 个节点（top-area + form-card 5 项 + agreement-row 5 项 + submit-btn + footer 2 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-forgot-password · 忘记密码  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-forgot-password.md`
- [x] `pages/00-forgot-password/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-forgot-password/<block>/<element>.json` — 10 个节点（app-bar 2 项 + progress-indicator + form-card 6 项 + submit-btn）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-auth-school-select · 选择学校  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-auth-school-select.md`
- [x] `pages/00-auth-school-select/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-auth-school-select/<block>/<element>.json` — 16 个节点（app-bar 2 项 + search-input + hot-list 2 项 + result-list 2 项 + empty-state + not-found-link + campus-sheet 4 项 + appeal-sheet 3 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-auth-id-card · 上传学生证（OCR）  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-auth-id-card.md`
- [x] `pages/00-auth-id-card/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-auth-id-card/<block>/<element>.json` — 16 个节点（app-bar 2 项 + why-card 2 项 + preview-area 2 项 + actions 4 项 + ocr-result 2 项 + manual-toggle + permission-denied-card 2 项 + submit-btn）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-auth-xuexin · 学信网授权  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-auth-xuexin.md`
- [x] `pages/00-auth-xuexin/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-auth-xuexin/<block>/<element>.json` — 9 个节点（app-bar 2 项 + info-card 2 项 + privacy-note + start-auth-btn + awaiting-card 2 项 + fallback-btn）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-auth-face · 人脸核身  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-auth-face.md`
- [x] `pages/00-auth-face/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-auth-face/<block>/<element>.json` — 15 个节点（app-bar 2 项 + info-card 2 项 + start-btn + face-camera 5 项 + error-card 3 项 + permission-denied-card 2 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-auth-status · 认证状态等待  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-auth-status.md`
- [x] `pages/00-auth-status/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-auth-status/<block>/<element>.json` — 14 个节点（app-bar 2 项 + status-card 5 项 + cta-area 6 项 + refresh-trigger）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 00-profile-init · 完善基础资料  (3/4)

### 视觉先行

- [x] `interaction-design/pages/00-profile-init.md`
- [x] `pages/00-profile-init/_page.json#interaction`

### 节点级深钻

- [x] `pages/00-profile-init/<block>/<element>.json` — 12 个节点（app-bar 2 项 + progress-indicator + avatar-picker + form-card 5 项 + xuexin-info-card 2 项 + submit-btn）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-home-map · 首页地图  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-home-map.md`
- [x] `pages/01-home-map/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-home-map/<block>/<element>.json` — 17 个节点（app-bar 4 项 + top-tabs + map-canvas 3 项 + radius-toggle + recenter-btn + cluster-sheet 3 项 + fab + permission-card 2 项 + roaming-banner）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-home-feed · 首页 Feed 列表  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-home-feed.md`
- [x] `pages/01-home-feed/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-home-feed/<block>/<element>.json` — 13 个节点（app-bar 4 项 + top-tabs + sort-tabs + feed-list 2 项 + empty-state 4 项 + fab）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-moment-detail · 动态详情  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-moment-detail.md`
- [x] `pages/01-moment-detail/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-moment-detail/<block>/<element>.json` — 21 个节点（app-bar 3 项 + roaming-banner + media-carousel 2 项 + author-card 3 项 + text-content + tag-row + location-card 2 项 + passers-stat-btn + action-bar 5 项 + more-menu 2 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-publish-entry · 发布入口选择  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-publish-entry.md`
- [x] `pages/01-publish-entry/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-publish-entry/<block>/<element>.json` — 8 个节点（mask + app-bar 3 项 + restricted-banner + entry-cards 3 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-publish-edit · 编辑动态  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-publish-edit.md`
- [x] `pages/01-publish-edit/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-publish-edit/<block>/<element>.json` — 18 个节点（app-bar 3 项 + media-grid 3 项 + text-editor + tag-row 3 项 + location-row + visibility-row + draft-modal 3 项 + exit-modal 4 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-publish-pick-location · 选择地点  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-publish-pick-location.md`
- [x] `pages/01-publish-pick-location/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-publish-pick-location/<block>/<element>.json` — 15 个节点（app-bar 2 项 + search-input + search-result-list 2 项 + map-canvas 3 项 + radius-toggle + recenter-btn + poi-card + confirm-btn + out-of-campus-modal 3 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-publish-visibility · 设置可见性  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-publish-visibility.md`
- [x] `pages/01-publish-visibility/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-publish-visibility/<block>/<element>.json` — 16 个节点（app-bar 3 项 + visibility-cards 2 项 + friends-row 3 项 + duration-options 3 项 + custom-duration-sheet 3 项 + anonymous-toggle + cross-campus-toggle + save-btn）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-publish-target-friends · 选择投递好友  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-publish-target-friends.md`
- [x] `pages/01-publish-target-friends/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-publish-target-friends/<block>/<element>.json` — 15 个节点（app-bar 3 项 + selected-bubbles 2 项 + search-input + top-bar 2 项 + friends-list 2 项 + letter-index 2 项 + confirm-btn + empty-state 2 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 01-comments · 评论列表  (3/4)

### 视觉先行

- [x] `interaction-design/pages/01-comments.md`
- [x] `pages/01-comments/_page.json#interaction`

### 节点级深钻

- [x] `pages/01-comments/<block>/<element>.json` — 15 个节点（app-bar 4 项 + sort-tabs + comment-list 2 项 + composer 5 项 + mention-picker 2 项 + empty-state）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 02-fishing-cast · 开网  (3/3)

### 视觉先行

- [x] `interaction-design/pages/02-fishing-cast.md` — 已完成
- [x] `pages/02-fishing-cast/_page.json#interaction` — 已完成

### 节点级深钻

- [x] `pages/02-fishing-cast/<block>/<element>.json` — 14 个节点（top-bar 3 项 + map-preview 2 项 + prediction-card + net-type-cards 3 项 + cast-btn + insufficient-sheet 3 项 + restricted-banner）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 02-fishing-result · 撒网结果  (3/3)

### 视觉先行

- [x] `interaction-design/pages/02-fishing-result.md` — 已完成
- [x] `pages/02-fishing-result/_page.json#interaction` — 已完成

### 节点级深钻

- [x] `pages/02-fishing-result/<block>/<element>.json` — 12 个节点（app-bar 2 项 + skip-btn + ceremony-animation + card-stack 2 项 + action-buttons 4 项 + empty-state 2 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 02-greet-compose · 招呼输入  (3/3)

### 视觉先行

- [x] `interaction-design/pages/02-greet-compose.md` — 已完成
- [x] `pages/02-greet-compose/_page.json#interaction` — 已完成

### 节点级深钻

- [x] `pages/02-greet-compose/<block>/<element>.json` — 17 个节点（app-bar 3 项 + diamond-cost-info + preset-list 2 项 + custom-input + emoji-trigger + emoji-picker 3 项 + send-btn + confirm-cost-sheet 3 项 + insufficient-diamonds-sheet 2 项）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 02-greets-received · 收到的招呼  (3/3)

### 视觉先行

- [x] `interaction-design/pages/02-greets-received.md` — 已完成
- [x] `pages/02-greets-received/_page.json#interaction` — 已完成

### 节点级深钻

- [x] `pages/02-greets-received/<block>/<element>.json` — 12 个节点（app-bar 2 项 + top-tabs 3 项 + greets-list 2 项 + actions 4 项 + empty-state）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 02-greets-sent · 发出的招呼  (3/3)

### 视觉先行

- [x] `interaction-design/pages/02-greets-sent.md` — 已完成
- [x] `pages/02-greets-sent/_page.json#interaction` — 已完成

### 节点级深钻

- [x] `pages/02-greets-sent/<block>/<element>.json` — 12 个节点（app-bar 3 项 + top-tabs 3 项 + greets-list 2 项 + actions 3 项 + empty-state）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 02-fishing-collections · 我的捞捕收藏  (3/3)

### 视觉先行

- [x] `interaction-design/pages/02-fishing-collections.md` — 已完成
- [x] `pages/02-fishing-collections/_page.json#interaction` — 已完成

### 节点级深钻

- [x] `pages/02-fishing-collections/<block>/<element>.json` — 10 个节点（app-bar 3 项 + collections-grid 3 项 + actions 3 项 + empty-state）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 03-capsule-bury · 埋胶囊  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/03-capsule-bury.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/03-capsule-bury/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/03-capsule-bury/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 03-capsule-list · 我的胶囊  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/03-capsule-list.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/03-capsule-list/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/03-capsule-list/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 03-capsule-riddle · 解锁谜题  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/03-capsule-riddle.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/03-capsule-riddle/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/03-capsule-riddle/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 03-capsule-open · 开启胶囊  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/03-capsule-open.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/03-capsule-open/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/03-capsule-open/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 04-campus-switch · 校园切换  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/04-campus-switch.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/04-campus-switch/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/04-campus-switch/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 04-campus-plaza · 校园广场（外校）  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/04-campus-plaza.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/04-campus-plaza/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/04-campus-plaza/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 04-campus-detail · 校园介绍页  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/04-campus-detail.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/04-campus-detail/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/04-campus-detail/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 06-conversation-list · 消息列表  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/06-conversation-list.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/06-conversation-list/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/06-conversation-list/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 06-conversation · 聊天页  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/06-conversation.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/06-conversation/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/06-conversation/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 06-friends-list · 好友列表  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/06-friends-list.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/06-friends-list/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/06-friends-list/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 06-friend-requests · 好友请求  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/06-friend-requests.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/06-friend-requests/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/06-friend-requests/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 06-add-friend · 加好友  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/06-add-friend.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/06-add-friend/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/06-add-friend/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 07-wallet · 钱包  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/07-wallet.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/07-wallet/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/07-wallet/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 07-tasks · 任务中心  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/07-tasks.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/07-tasks/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/07-tasks/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 07-shop · 道具商店  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/07-shop.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/07-shop/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/07-shop/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 07-recharge · 充值套餐  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/07-recharge.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/07-recharge/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/07-recharge/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 07-recharge-result · 充值结果  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/07-recharge-result.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/07-recharge-result/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/07-recharge-result/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 07-coin-history · 积分流水  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/07-coin-history.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/07-coin-history/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/07-coin-history/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 07-gem-history · 钻石流水  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/07-gem-history.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/07-gem-history/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/07-gem-history/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 08-notification-center · 通知中心  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/08-notification-center.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/08-notification-center/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/08-notification-center/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 09-report · 举报页  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/09-report.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/09-report/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/09-report/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 09-appeal · 申诉页  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/09-appeal.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/09-appeal/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/09-appeal/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 09-community-guidelines · 社区公约  (3/4)

### 视觉先行

- [x] `interaction-design/pages/09-community-guidelines.md`
- [x] `pages/09-community-guidelines/_page.json#interaction`

### 节点级深钻

- [x] `pages/09-community-guidelines/<block>/<element>.json` — 13 个节点（app-bar/_component,back-btn,title,toc-btn + version-banner + update-banner + content-area/_component,markdown-body + toc-sheet/_component,mask,items + bottom-cta/_component,agree-btn）

### 收尾

- [ ] 待统一收尾

---

## ⬜ 10-profile-self · 我的主页  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/10-profile-self.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/10-profile-self/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/10-profile-self/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 10-profile-other · 他人主页  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/10-profile-other.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/10-profile-other/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/10-profile-other/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 10-profile-edit · 编辑资料  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/10-profile-edit.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/10-profile-edit/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/10-profile-edit/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 10-footprints · 我的足迹  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/10-footprints.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/10-footprints/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/10-footprints/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 11-settings · 设置主菜单  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-settings.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-settings/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-settings/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 11-account-security · 账号与安全  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-account-security.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-account-security/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-account-security/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 11-change-password · 修改密码  (3/4)

### 视觉先行

- [x] `interaction-design/pages/11-change-password.md`
- [x] `pages/11-change-password/_page.json#interaction`

### 节点级深钻

- [x] `pages/11-change-password/<block>/<element>.json` — 9 个节点（app-bar 2 项 + security-note + form-card 4 项 + forgot-link + submit-btn）

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 11-devices · 设备管理  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-devices.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-devices/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-devices/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 11-privacy · 隐私设置  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-privacy.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-privacy/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-privacy/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 11-blocks · 黑名单  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-blocks.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-blocks/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-blocks/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 11-notification-prefs · 通知设置  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-notification-prefs.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-notification-prefs/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-notification-prefs/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 11-feedback · 意见反馈  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-feedback.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-feedback/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-feedback/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ✅ 11-about · 关于  (3/4)

### 视觉先行

- [x] `interaction-design/pages/11-about.md`
- [x] `pages/11-about/_page.json#interaction`

### 节点级深钻

- [x] `pages/11-about/<block>/<element>.json` — 21 个节点（app-bar/_component,back-btn,title + hero/_component,logo,app-name,version-text + menu/_component + 6 个 menu rows + contact-sheet/_component + 3 个 options + rating-banner + icp-footer/_component,text）

### 收尾

- [ ] 待统一收尾

---

## ⬜ 11-logout-account · 注销账号  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/11-logout-account.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/11-logout-account/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/11-logout-account/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---

## ⬜ 12-search · 搜索页  (0/4)

### 视觉先行

- [ ] `interaction-design/pages/12-search.md` — 写交互规格 md（状态机/操作清单/加载/错误/边界）
- [ ] `pages/12-search/_page.json#interaction` — write-node.ts 追加 _page.json 的 interaction 层（summary/ref/states/operations）
      ↳ operations 必须是 [{ op, triggerNodePath }] 结构化数组，不能是字符串数组

### 节点级深钻（按目录深度排序，父先于子）

- [ ] `pages/12-search/<block>/<element>.json` — 从 md「操作清单」逐行 create-node.ts 创建触发元素节点（含 interaction.trigger + flows）
      ↳ 每个非基准状态的独立 UI 区域也要建节点；识别出的组件用 _component.json 建组件目录

### 收尾

- [ ] `stage-gate.ts --stage interaction --mode exit` — 运行交互阶段出门校验，必须 0 ❌ 才能进入 design 阶段

---
