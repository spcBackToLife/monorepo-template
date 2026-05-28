# 00-auth-id-card · 上传学生证（OCR） · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b1-注册主线-happy-path`
> **全局规范**：`interaction-design/overview.md`

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle` | 默认：引导卡 + 拍照/相册按钮 |
| `permission-asking` | 申请相机/相册权限 |
| `permission-denied` | 权限被拒，显示去设置 |
| `capturing` | 相机预览中（自动框定边缘检测）|
| `cropping` | 拍完进入裁剪 |
| `uploading` | 上传中 |
| `ocr-processing` | 后端 OCR 识别中 |
| `ocr-result` | 显示识别结果，用户确认/编辑 |
| `manual-input` | 3 次 OCR 失败后手动输入 |
| `submitting` | 提交最终结果 |
| `success` | 跳 00-auth-xuexin |
| `error:upload` | 上传失败 |
| `error:ocr-fail` | OCR 失败（提示重试或转手动）|

### Transitions

```
idle → permission-asking:           点击拍照/相册
permission-asking → capturing:       授权
permission-asking → permission-denied: 拒绝
capturing → cropping:                拍照确认
cropping → uploading:                确认裁剪
uploading → ocr-processing:          上传成功
ocr-processing → ocr-result:         OCR 成功
ocr-processing → error:ocr-fail:     OCR 失败
error:ocr-fail × N → manual-input:  累计 3 次后转手动
ocr-result/manual-input → submitting: 点击确认提交
submitting → success:                API 200
success → routed:                    push 00-auth-xuexin
```

### Effects

| 转换 | UI |
|-----|----|
| → capturing | 全屏相机 + 边缘检测框 + 「将学生证放入框内」 |
| → cropping | 静态图 + 4 角拖动裁剪框 + 旋转按钮 |
| → uploading | 顶部进度条 + 文案「正在上传…」|
| → ocr-processing | 「学信网正在识别…」+ AI 扫描动画 |
| → ocr-result | 卡片淡入显示「姓名」「学号」「院系」「年级」+ 每行可编辑 |
| → manual-input | 引导文案「OCR 多次失败，请手动输入；本次将转人工审核（48h）」|
| → error:ocr-fail | inline 提示「未能识别，请重拍」+ 重拍按钮 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | L4 Modal「认证未完成，是否退出?」 | 确认退出回到 school-select | — |
| 2 | 点击「为什么需要」 | click `why-card/help-btn` | — | press | 展开/收起说明（高度动画 300ms）| — | — |
| 3 | 点击拍照 | click `actions/capture-btn` | idle | press + 触觉 light | 进 permission-asking 或直接 capturing | 拒绝→permission-denied | — |
| 4 | 拍照确认 | click camera shutter | capturing | 快门动画 + 触觉 medium | 切到 cropping | — | — |
| 5 | 点击相册 | click `actions/album-btn` | idle | press | 系统相册 picker | 拒绝→permission-denied | jpg/png ≤10MB |
| 6 | 重拍 | click `actions/recapture-btn` | cropping/ocr-result | press | 回 capturing | — | — |
| 7 | 编辑 OCR 字段 | input `ocr-result/fields` | ocr-result | label 上浮 | 标记字段「已修改」+ 提交时携带 manual_corrected flag | — | 学号长度限制 |
| 8 | 切到手动输入 | click `manual-toggle` | error:ocr-fail × N | press | 进 manual-input + Toast「将转人工审核」| — | — |
| 9 | 提交 | click `submit-btn` | ocr-result/manual-input 字段齐全 | press + 触觉 medium | submitting → success | 上传失败→Toast + 重试按钮 | 重复提交防抖 800ms |
| 10 | 去设置 | click `permission-denied-card/settings-btn` | permission-denied | press | 跳系统设置 | — | 返回后重新检测权限 |

---

## 加载策略

| 场景 | 策略 |
|------|------|
| 上传中 | 顶部进度条（0-100%）+ 按钮禁用 |
| OCR 识别中 | 动画 + 文案「正在识别…」+ 取消按钮（仅 ocr 阶段允许取消）|
| 提交中 | 按钮 spinner + 表单禁用 |

OCR 处理超时 30s → 视为失败 + 提示用户重拍。

---

## 错误处理

| 错误 | UI |
|------|----|
| 权限拒绝 | 全屏 permission-denied-card + 去设置按钮 |
| 上传失败 | Toast + 重试按钮（保留已拍图）|
| OCR 失败 (<3 次) | inline + 重拍 |
| OCR 失败 (≥3 次) | 自动切到 manual-input + L2 Toast |
| 图片超 10MB | Toast「图片过大，请重拍」|
| 网络断开 | 上传/识别失败 → 自动重试 1 次 + Toast |

---

## 边界情况

- App 在 capturing 中切到后台 → 释放相机；返回时重新初始化
- 在 ocr-result 编辑后未提交退出 → 草稿保留 30 分钟（注册流通用机制）
- 学号格式异常（非数字/超长）→ inline 提示「请检查学号」
- 拍到他人学生证 → 服务端 OCR + 学信网交叉拦截（不在客户端预防）
- 高反光/模糊学生证 → 服务端识别置信度低 → 走 manual-input 提示

---

## 节点骨架

```
00-auth-id-card/
├── _page.json
├── app-bar/
│   ├── _block.json
│   └── back-btn.json
├── why-card/
│   ├── _block.json             (引导卡：为什么需要学生证 + 隐私说明)
│   └── help-btn.json           (展开/收起更多)
├── preview-area/
│   ├── _block.json             (相机预览 + 已拍图 + 裁剪框)
│   └── preview.json            (实时预览元素，trigger=onFrame 边缘检测)
├── actions/
│   ├── _block.json
│   ├── capture-btn.json        (拍照)
│   ├── album-btn.json          (相册)
│   └── recapture-btn.json      (重拍，仅 cropping/ocr-result 显示)
├── ocr-result/
│   ├── _block.json             (component: OCR 结果卡)
│   └── fields.json             (姓名/学号/院系/年级 可编辑字段组)
├── manual-toggle.json
├── permission-denied-card/
│   ├── _block.json             (全屏占位)
│   └── settings-btn.json
└── submit-btn.json
```

通用组件：`Toast`、`ConfirmDialog`（退出确认）

---

## 产品需求覆盖

- ✅ 规则 1 (OCR 3 次失败转手动+人工审核) → state `manual-input` + 操作 #8
- ✅ 规则 2 (为什么需要解释卡片) → `why-card` + 操作 #2
- ✅ 规则 3 (本地裁剪压缩 ≤10MB jpg/png) → state `cropping` + 错误处理
- ✅ 规则 4 (识别结果需用户确认) → state `ocr-result` + 操作 #7/#9
- ✅ 规则 5 (照片加密存储) → 提交后 API 处理（客户端无需呈现）
