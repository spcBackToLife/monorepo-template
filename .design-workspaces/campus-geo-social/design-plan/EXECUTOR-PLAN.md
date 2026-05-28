# Executor 任务计划

> 生成时间: 2026-05-28T15:02:32.381Z
> 总任务数: 19
> 范围: 00-login

---

## 00-login（19 个节点）

### 00-login/_page
- **名称**: 登录页
- **类型**: page
- **摘要**: 暖白底+顶部粉色渐变+角落装饰+居中品牌+表单卡+药丸CTA的青春治愈登录页

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - product-analysis/modules/M5-user-auth.md
  - interaction-design/pages/00-login.md

### 00-login/mode-toggle
- **名称**: 登录方式切换
- **类型**: element
- **摘要**: 登录方式切换胶囊 bg:#F5EDE6 radius:full h:32，active tab bg:primary color:white spring 200ms

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/submit-btn
- **名称**: 登录按钮
- **类型**: element
- **摘要**: 登录主按钮 h:48 w:100% bg:primary color:white radius:full shadow-sm，5态(disabled/enabled/hover/pressed/loading/success)

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 素材绘制 (material-painter) ⚠️ 节点有 materials 依赖
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md
  - design-plan/pages/00-login/materials/I-04-checkmark-success.md

### 00-login/footer/_component
- **名称**: 页脚链接区
- **类型**: component
- **摘要**: 底部辅助链接区 flex row center gap:16 mt:24，两个primary色文字链接+竖线分隔

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/footer/forgot-link
- **名称**: 忘记密码链接
- **类型**: element
- **摘要**: 忘记密码链接 body 14px color:primary，active时primaryActive+scale(0.98)

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/footer/register-link
- **名称**: 注册链接
- **类型**: element
- **摘要**: 注册链接 body 14px color:primary，active时primaryActive+scale(0.98)

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/form-card/_component
- **名称**: 登录表单卡
- **类型**: component
- **摘要**: 白色表单卡片容器：bg:surface radius:lg(16) padding:24px shadow-sm，承载双模态输入框组

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/form-card/code-input
- **名称**: 验证码输入（6 格）
- **类型**: element
- **摘要**: 6格验证码输入，每格w:36 h:48 radius:md border center，auto-advance

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/form-card/password-input
- **名称**: 密码输入框（含眼睛切换）
- **类型**: element
- **摘要**: 密码输入框 h:48 radius:md，右侧内联 eye-toggle(I-01/I-02) 44×44触摸区

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 素材绘制 (material-painter) ⚠️ 节点有 materials 依赖
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md
  - design-plan/pages/00-login/materials/I-01-eye-open.md
  - design-plan/pages/00-login/materials/I-02-eye-closed.md

### 00-login/form-card/phone-input
- **名称**: 手机号输入框
- **类型**: element
- **摘要**: 手机号输入框 h:48 radius:md border:1px#FFE0E8 focus:2px#FF6F91+ring font:body-lg

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/form-card/send-code-btn
- **名称**: 获取验证码按钮
- **类型**: element
- **摘要**: 获取验证码文字按钮 color:primary font:body/500，disabled时textTertiary+倒计时文案

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/top-area/_component
- **名称**: 品牌头部
- **类型**: component
- **摘要**: 品牌头部：Logo 64×64 + Slogan h3，flex column center，pt:80px pb:32px

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md

### 00-login/top-area/logo
- **名称**: 品牌 Logo
- **类型**: element
- **摘要**: 品牌Logo图标 64×64, src=B-01 brand-logo

- [ ] 读取节点 JSON + 所有 ref 文档
- [ ] 结构搭建 (page-builder)
- [ ] 样式设置
- [ ] 事件/交互绑定
- [ ] 素材绘制 (material-painter) ⚠️ 节点有 materials 依赖
- [ ] 验证 checklist
- [ ] 回写 implementation

📖 需读文档:
  - interaction-design/pages/00-login.md
  - design-plan/pages/00-login/materials/B-01-brand-logo.md

### 00-login/_materials/B-01
- **名称**: brand-logo (Brand 64x64)
- **类型**: material
- **摘要**: 绘制素材 brand-logo → 应用到 pages/00-login/top-area/logo

- [ ] 读取素材规格文档 (§6 绘制要求)
- [ ] 调用 material-painter 绘制
- [ ] export_and_apply 到目标节点
- [ ] 建立素材槽位
- [ ] 验证视觉效果
- **绑定节点**: pages/00-login/top-area/logo

📖 需读文档:
  - design-plan/pages/00-login/materials/B-01-brand-logo.md

### 00-login/_materials/D-02
- **名称**: pink-circle (Decoration 80x80)
- **类型**: material
- **摘要**: 绘制素材 pink-circle → 应用到 pages/00-login/_page

- [ ] 读取素材规格文档 (§6 绘制要求)
- [ ] 调用 material-painter 绘制
- [ ] export_and_apply 到目标节点
- [ ] 建立素材槽位
- [ ] 验证视觉效果
- **绑定节点**: pages/00-login/_page

📖 需读文档:
  - design-plan/pages/00-login/materials/D-02-pink-circle.md

### 00-login/_materials/D-03
- **名称**: mint-leaf (Decoration 60x40)
- **类型**: material
- **摘要**: 绘制素材 mint-leaf → 应用到 pages/00-login/_page

- [ ] 读取素材规格文档 (§6 绘制要求)
- [ ] 调用 material-painter 绘制
- [ ] export_and_apply 到目标节点
- [ ] 建立素材槽位
- [ ] 验证视觉效果
- **绑定节点**: pages/00-login/_page

📖 需读文档:
  - design-plan/pages/00-login/materials/D-03-mint-leaf.md

### 00-login/_materials/I-01
- **名称**: eye-open (Icon 20x20)
- **类型**: material
- **摘要**: 绘制素材 eye-open → 应用到 pages/00-login/form-card/password-input

- [ ] 读取素材规格文档 (§6 绘制要求)
- [ ] 调用 material-painter 绘制
- [ ] export_and_apply 到目标节点
- [ ] 建立素材槽位
- [ ] 验证视觉效果
- **绑定节点**: pages/00-login/form-card/password-input

📖 需读文档:
  - design-plan/pages/00-login/materials/I-01-eye-open.md

### 00-login/_materials/I-02
- **名称**: eye-closed (Icon 20x20)
- **类型**: material
- **摘要**: 绘制素材 eye-closed → 应用到 pages/00-login/form-card/password-input

- [ ] 读取素材规格文档 (§6 绘制要求)
- [ ] 调用 material-painter 绘制
- [ ] export_and_apply 到目标节点
- [ ] 建立素材槽位
- [ ] 验证视觉效果
- **绑定节点**: pages/00-login/form-card/password-input

📖 需读文档:
  - design-plan/pages/00-login/materials/I-02-eye-closed.md

### 00-login/_materials/I-04
- **名称**: checkmark-success (Icon 20x20)
- **类型**: material
- **摘要**: 绘制素材 checkmark-success → 应用到 pages/00-login/submit-btn

- [ ] 读取素材规格文档 (§6 绘制要求)
- [ ] 调用 material-painter 绘制
- [ ] export_and_apply 到目标节点
- [ ] 建立素材槽位
- [ ] 验证视觉效果
- **绑定节点**: pages/00-login/submit-btn

📖 需读文档:
  - design-plan/pages/00-login/materials/I-04-checkmark-success.md
