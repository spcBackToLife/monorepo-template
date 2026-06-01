# 截图工具（screenshot-tool）— SKILL 通用 reference

> 适用 SKILL：design-planner / design-executor / material-painter / theme-generator
> 适用任务：所有需要"看真实渲染图"的环节（自审 / 终验 / 素材验证 / 主题预览）
> 当前角色：**临时替代** `mcp/generate_snapshots` —— 直到 `apps/design-api` 内置 SnapshotsService 修复后两者并存

---

## 1. 为什么需要这份 reference

### 1.1 `mcp/generate_snapshots` 的已知 bug

`apps/design-api/src/modules/snapshots/snapshots.service.ts` 走的 URL 是：

```
http://localhost:5174/preview/<projectId>?screen=<id>
```

但 `apps/design_front` **没有 `/preview` 路由**——只有 `/editor/:id` 是 PrivateRoute。React Router 把所有 `/preview/*` fallback 到 `<Navigate to="/" replace />`，再经过 PrivateRoute 重定向到 design_front 自己的登录页（5 元素：登录 / 邮箱 / 密码 / 登录按钮 / 没有账号？去注册）。

**这就是 self-review.md 反复报"snapshot 持续返回 5 元素简化登录页 + 黑底"的真正根因**——不是 puppeteer 失败，是 puppeteer 没登录态被踢到登录页。

📎 完整诊断见 `视觉SaaS化-第一性诊断与事前预防-2026-06-01.md` §3 + 当时的截图对账记录。

### 1.2 替代方案：本地脚本 `scripts/screenshot-screen.mjs`

monorepo 根目录有一份 puppeteer 脚本，端到端跑通了：

```
注册截图 bot → 登录拿 JWT → 注入 localStorage → 访问 /editor/:id
              → 等 SchemaRenderer → 切预览模式 → 截 [data-preview-root] → 写盘
```

调用方拿到 PNG 路径 → Read 即得真图。

---

## 2. 用法（任何 SKILL 跑自审/对账时直接复制）

### 2.1 默认用法（推荐）

```
node scripts/screenshot-screen.mjs <projectId>
```

- **mode 默认是 `preview`**（切到预览模式截图），输出**纯 schema 渲染**，无任何编辑器 chrome
- 截当前 active 屏（editor 默认显示 active）
- 输出路径 `.tica-tmps/snapshots/<projectId>-<timestamp>.png`
- stdout 最后一行就是绝对路径，捕获方式：`path=$(node scripts/screenshot-screen.mjs <projectId> | tail -1)`

### 2.2 完整参数

```
node scripts/screenshot-screen.mjs <projectId> [screenId] [outputPath] [--mode=preview|editor]
```

| 参数 | 必填 | 说明 |
|---|:---:|---|
| projectId | ✅ | 设计项目 ID |
| screenId | ❌ | 多屏项目截特定屏；不传截 active 屏 |
| outputPath | ❌ | 自定义输出绝对路径；不传走默认 .tica-tmps/snapshots/... |
| --mode=preview | ❌ | （默认）切预览模式截图 — 纯 schema 渲染，无工具栏，无浮动 dock |
| --mode=editor | ❌ | 保留编辑画布样式（重置缩放 + 隐藏选中框）— 看设备 frame 边界时用 |

### 2.3 环境变量

| 变量 | 默认 | 用途 |
|---|---|---|
| CHROME_PATH | macOS 自动找 | 系统 Chrome 不在标准位置时显式给路径 |
| DESIGN_FRONT_URL | http://localhost:5174 | 前端地址 |
| DESIGN_API_URL | http://localhost:3001 | 后端地址 |
| SCREENSHOT_BOT_EMAIL/PASSWORD | screenshot-bot@local.dev / screenshotbot123 | 自动注册的截图 bot 账号 |

### 2.4 前置条件

- `design-api:3001` + `design_front:5174` 在跑
- 系统已装 Chrome（macOS 默认 / Linux apt-get / Windows 标准安装）
- 项目 ID 真实存在（schema 已落库）

---

## 3. 在 SKILL 任务中如何调用（标准 Bash 模式）

```bash
# Step 1: 跑脚本拿截图路径
SCREENSHOT_PATH=$(node scripts/screenshot-screen.mjs <projectId> 2>/dev/null | tail -1)

# Step 2: AI 用 Read 工具看图
#   Read tool: file_path = "$SCREENSHOT_PATH"
```

或在 Claude 工具调用层面：

```
Bash: node scripts/screenshot-screen.mjs <projectId>
      → 拿 stdout 最后一行作为 path
Read: file_path = <path>
      → AI 看图
```

### 3.1 多次截图比对（before/after）

```bash
# 改 schema 前
BEFORE=$(node scripts/screenshot-screen.mjs <projectId> 2>/dev/null | tail -1)

# 跑 MCP 改样式
# ...

# 改 schema 后
AFTER=$(node scripts/screenshot-screen.mjs <projectId> 2>/dev/null | tail -1)
```

AI 用 Read 分别看 BEFORE / AFTER → 对比视觉变化。

### 3.2 失败排查

| 现象 | 原因 | 处理 |
|---|---|---|
| `Chrome 未找到` | 非 macOS / Chrome 装在非标准路径 | 设置 CHROME_PATH 环境变量 |
| `auth 失败：login 不通过 + register 也失败` | design-api 没在跑 | 启动 design-api（pnpm dev:api）|
| `[data-screen-id] 未找到` 超时 | design_front 没在跑 / 项目 ID 不存在 / 项目无屏 | 验证服务 + 验证 projectId |
| 截图是 5 元素登录页 | 预期不会再出现（脚本已注入 token）；如发生说明 token 过期 + register 也失败 | 删 .tica-tmps/.screenshot-bot-token 重试 |
| 截图是黑底 | preview 模式的 dataContext 异常 | 用 `--mode=editor` 看是否同样黑；都黑说明 schema 数据问题 |

---

## 4. 与 MCP `generate_snapshots` 的关系

| 能力 | mcp/generate_snapshots（service 内置）| scripts/screenshot-screen.mjs（本工具）|
|---|---|---|
| 真渲染 schema | ❌ 当前坏（路由不存在 + 没登录态）| ✅ 走 /editor + 注入 token |
| 多 viewport | ✅ 接口设计支持（multi-viewport 未实现）| ❌ 单 viewport（默认 active 视口）|
| 整 frame 长图 | ✅ 接口设计支持 | ❌（preview 模式按 viewport 截）|
| 调用方便 | ✅ 单 MCP call | ⚠️ Bash + Read 两步 |
| 当前可用 | ❌ | ✅ |

→ **当前优先用本工具**。等 SnapshotsService 修复后（按 §5 方案）两者并存：
- 单屏快速看效果 → 本工具（轻量、稳定）
- 多 viewport / 长图 / 跨屏汇总 → mcp/generate_snapshots

---

## 5. 修复 mcp/generate_snapshots 的指引（未来工作）

要让 `apps/design-api/src/modules/snapshots/snapshots.service.ts` 真能用，需 3 处改动（已在 scripts/screenshot-screen.mjs 验证可行）：

```ts
// (a) URL 改路径 — 行 135
// 旧：const url = `${this.getPreviewBaseUrl()}/preview/${projectId}?screen=${screenId}`;
// 新：const url = `${this.getPreviewBaseUrl()}/editor/${projectId}`;

// (b) 启动浏览器后注入 JWT
//     新建 SnapshotAuthService 跑 register（fail-safe）+ login 拿 token
//     page.goto(getPreviewBaseUrl()) → page.evaluate(localStorage.setItem ...)
//     再 page.goto(editorUrl)

// (c) 等 [data-screen-id] 后切预览模式 + 截 [data-preview-root] [data-screen-id]
//     await page.waitForSelector('[data-screen-id]', ...)
//     await page.evaluate(() => document.querySelector('button[title^="预览"]').click())
//     await page.waitForSelector('[data-preview-root] [data-screen-id]', ...)
//     const handle = await page.$('[data-preview-root] [data-screen-id]');
//     await handle.screenshot({ path, type, fullPage: false });
```

参考 `scripts/screenshot-screen.mjs` 行 ~95-200 完整实现。

---

## 6. 与"机器视觉对账"重构的关系（事前预防方案 §3）

`视觉SaaS化-第一性诊断与事前预防-2026-06-01.md` §3 提出：把 self-review 5 维评分从"AI 自评"改为"机器对账"。其中：
- §3.1（修 snapshot 服务）= 本 reference 的当前作用域 ✅ 已临时解锁
- §3.2（self-review 改机器对账）= 待做 — 需要在拿到截图基础上做颜色直方图 / SSIM / multimodal LLM 比对
- §3.3（visual_diff_with_reference MCP）= 待做 — 需要先有 visualReferences[] 字段（事前预防方案 §1.1）

→ 本 reference 是机器视觉对账链路的**第一块基石**。

---

## 7. 自检（任何 SKILL 用本工具前）

- [ ] design-api 和 design_front 都在跑（`curl -s http://localhost:3001/health`、`curl -s http://localhost:5174/`）
- [ ] 项目 ID 真实（先 `query/project_info` 验证）
- [ ] 系统 Chrome 已装（macOS 默认、Linux apt-get install google-chrome、Windows 装 Chrome）
- [ ] 截图后真用 Read 看了图（看不到 = 自审等于没做）
- [ ] 看图后写了具体观察到的问题（不是模板套话"识别度 4/5"，是"右上 BgBlobTopRight 12% alpha 在 #FCFCFD 底色上肉眼几乎不可见"这种像素级描述）

任一未通过 → 截图能力没有被有效利用，回 §3 重新走流程。
