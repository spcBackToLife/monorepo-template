> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：I-global-overlay-events
> 对应 schema 字段：project.globalOverlays[*].rootNode 内交互节点的 events（整组替换）
> expectedArtifacts：[{ kind: "arrayMin", path: "globalOverlays", min: 1 }]

# Step I-global-overlay-events — globalOverlays 节点补 events

> 详细规范见 `schema-spec/overlays.md` §3。
> 上游依赖：
> - `global/overlays.md`（product 阶段已建 2 个 overlay 骨架：`global-offline-banner` + `global-session-expired`；按钮节点 ID：`offlineRetryBtn` / `sessionReLoginBtn`）
> - `global/state-fill.md`（已完整化 4 类 globalView：session / network / preferences / nav）
> - `interaction/00-login/errors.md` D-E2（离线提示由全局 banner 承担，不重复 Toast）

## 0. 探针 + 操作路径决策（D-GO0）

**探针**：尝试 `event/add { nodeId: "offlineRetryBtn" }`——
返回 `Node offlineRetryBtn not found`。

**根因**：`event/add` 只在 screen 树查找节点，**globalOverlays 节点不在任何 screen 树内**。

**MCP 工具路径**：源码 `apps/design-mcp/src/tools/domain/meta.ts` 暴露专门 op：
```
meta/set_global_overlays { projectId, overlays: OverlayNode[] }   // 整组替换
```

⚠️ `meta/set_project` 在描述里**显式禁止**传 globalOverlays（v2.2 改造）。
⚠️ template 里"方案 2 用 event/add"——不可行（已实测）。

**决策**：用 `meta/set_global_overlays` 整组替换。
- 输入参数 `overlays` 必须是**完整两个 overlay**（带原 product 已落字段 + 新增 events）
- 数据源：product 阶段 `global/overlays.md` "★ 沉淀到 schema 的结论" 段是权威源（与当前 schema 实际内容 1:1 对应）

## 推理过程

### 1. 现有 globalOverlays 清单

| overlay id | type | showWhen | 内部需补 events 的节点 |
|------------|------|----------|-----------|
| global-offline-banner | custom（顶部 banner，无 backdrop）| `{{ globalView.network.status === 'offline' }}` | `offlineRetryBtn`（"重试"按钮）|
| global-session-expired | modal（阻断性，backdrop 不可点关）| `{{ globalView.session && globalView.session.status === 'expired' }}` | `sessionReLoginBtn`（"去登录"按钮）|

⚠️ product 阶段 concerns.md / overlays.md 明确决定 **不引入** `global-error-boundary` / `global-app-update` / `global-maintenance`——本任务**沿用**该决策，不补这 3 类，避免 scope creep。

### 2. 每个交互节点的 events 设计

#### 2.1 offlineRetryBtn — "重试"按钮

**user story**：网络断开 → 顶部 banner 显示 → 用户点击"重试"→ 触发宿主检测网络 → 检测成功后宿主回写 `globalView.network.status='online'`，banner 自动消失。

**actions 链翻译**：

| 步骤 | action | 理由 |
|------|--------|------|
| 1 | `state.set globalView.network.retryCount = retryCount + 1` | 给用户看"已重试 N 次"的进度反馈（design 阶段可绑到 banner 文案） |
| 2 | `custom platform.checkNetwork` | 网络检测是宿主能力（H5 跑 `navigator.onLine` / 小程序跑 `wx.getNetworkType`）；通过 custom 委托给宿主，由宿主回写 `globalView.network.status` |

**否决候选**：
- ❌ A：自己写 `effect.fetch ds-ping`——会增加一个数据源依赖，且 ping 本身可能在离线状态返回不可靠结果
- ❌ B：直接 `state.set globalView.network.status='online'` 然后失败时再切回——把"乐观假设"内嵌到事件链，与实际网络状态不同步
- ✅ C：委托宿主（决策 D-GO1）——单一真理源（宿主 listener）维护 network.status

**condition 不设**：用户点重试时无需前置条件——按钮本就只在 banner 显示时可见（banner 自身 showWhen=offline），且重复点击是用户表达迫切感的合理行为，不去拦。

**boundary**：
- 用户在 banner 显示期间反复点重试——`retryCount` 会持续 +1（让用户看到尝试在发生），无害
- 网络恢复后 banner 自动消失（showWhen 失活），无需手动清理 retryCount（保留作为下次离线的累计计数，由宿主决定何时重置——本期不内嵌重置逻辑）

#### 2.2 sessionReLoginBtn — "去登录"按钮

**user story**：用户在某屏操作，token 过期 → 全局 401 拦截器把 `globalView.session.status='expired'` → modal 弹出 → 用户点击"去登录"→ 跳转到 00-login，并保留来源屏 ID（登录成功后跳回）。

**actions 链翻译**：

| 步骤 | action | 理由 |
|------|--------|------|
| 1 | `state.set globalView.nav.authRedirectTo = $currentScreenId`（占位表达式） | 写"登录后跳回哪"——boundaries D-B10 协议要求 |
| 2 | `state.set globalView.session = { status:'anonymous', token:null, refreshToken:null, user:null, expiresAt:null, lastActivityAt:null }` | 主动清空过期 session（不依赖 nav.go 后的副作用清理）—— 防止跳到 00-login 后 #1 screenEnter 仍读到 'expired' 状态 |
| 3 | `nav.go targetScreenId='00-login'` | 跳登录屏 |

**关键决策 D-GO2：currentScreenId 怎么取？**

`globalView.nav.authRedirectTo` 要写"当前屏的 id"。表达式作用域中**没有内置 `$currentScreenId`**（v2-actions-cheatsheet §4 列出的作用域仅 state.*/item/index/parent/$last/$.*）——这是 spec 模板里的占位，实际写时需选定方案：

- **候选 A**：宿主在每次 nav.go 时维护 `globalView.nav.lastVisited = <fromScreenId>`——sessionReLoginBtn 直接写 `value: "{{ globalView.nav.lastVisited }}"`
  - 优势：复用 product 阶段已建的 `nav.lastVisited` 字段（语义高度一致——"刚才在哪"）
  - 劣势：lastVisited 在用户 idle 状态可能落后（但本场景 user 是从其他屏触发 401 → 立即弹 modal，时序上 lastVisited 就是来源屏）
- **候选 B**：让宿主在拦截 401 时同时把当前屏 ID 写入 `globalView.nav.authRedirectTo`——按钮 click 时该值已就位，无需再 set
  - 优势：解耦——按钮链只做 session 清空 + 跳转
  - 劣势：依赖宿主做更多事；按钮的 actions 链表达不出"为什么登录后能跳回"的完整意图
- **决策**：**A**——复用 `lastVisited`，actions 链自描述完整、宿主只需维护 lastVisited 这一最小契约
  - 写法：`{ type: 'state.set', path: 'globalView.nav.authRedirectTo', value: '{{ globalView.nav.lastVisited }}' }`

**关键决策 D-GO3：是否清空 session.user？**

- **候选 A**：保留 user（"重登后用户不变，无需重新填手机号"）—— template 注释中提出
- **候选 B**：全清（含 user）—— template 实际推荐
- **决策**：**B（全清）**——理由：
  1. 当前架构下 00-login 不读 `globalView.session.user`，重登场景下 00-login 仍要求重新输手机号
  2. 保留 user 会让 #1 screenEnter 的 `session.status === 'active'` 判断逻辑变复杂（"status=anonymous + user 非空" 是个尴尬中间态）
  3. 安全考虑：过期 session 全清，避免 user 信息泄露到 anonymous 态

**boundary**：
- backdrop.dismissible=false 阻止误关——product 阶段已写，无需再调
- session.status 转换路径：expired → anonymous（清空时）→ active（登录成功时）—— state-fill.md 决策 D-GS6 保留 refreshing 枚举给未来 refresh 流程，本任务不涉及

### 3. 是否需要补 screenEnter / 其他 trigger？

| 候选 trigger | 是否需要 | 理由 |
|---|---|---|
| `screenEnter` on banner rootNode | ❌ | banner 显隐由 showWhen 表达式驱动，不需要 enter 副作用 |
| `screenExit` on modal rootNode | ❌ | modal 是 modal 不是 screen，无 screenExit 概念 |
| `change` on retryBtn | ❌ | 不是 input，不存在 change |
| `click` on banner.offlineIcon / offlineText | ❌ | 纯展示节点，无交互意图（未在 product 阶段 meta.summary 中声明） |
| `click` on modal.title / desc | ❌ | 同上 |

**结论**：本任务只补 **2 条 click events**（offlineRetryBtn + sessionReLoginBtn）。

### 4. 红线自检

| 红线 | 触发条件 | 本任务结果 |
|------|---------|----------|
| R-GLOBAL-OVERLAY-01 | globalOverlays 节点存在但内部按钮缺 events | ✅ 2 个核心按钮均补 events |
| R-GLOBAL-OVERLAY-02 | global-session-expired/offline-banner/error-boundary 三类核心 overlay 缺 events | ✅ 前两类有 events；error-boundary 决策不引入（concerns/overlays 已定） |
| R-OVERLAY-CONFLICT-01 | 同 overlay 同时用 showWhen + ui.showOverlay | ✅ 全部 showWhen 驱动，无 ui.showOverlay 调用 |
| R-EVENTS-02 | event 没 actions | ✅ 2 条事件均有 actions ≥ 1 |
| R-EVENTS-03（待实现）| effect.fetch 缺 onSuccess/onError | ✅ 本任务不用 effect.fetch（custom 委托宿主） |

### 5. expectedArtifacts 自检

任务声明 `[{ kind: "arrayMin", path: "globalOverlays", min: 1 }]`——
- 当前 globalOverlays 数组 length = 2 → ≥ 1 ✓

### 6. 决策汇总

| 决策 ID | 内容 | 决定 |
|---|---|---|
| D-GO0 | MCP 操作路径 | 用 `meta/set_global_overlays` 整组替换；event/add 不能用 |
| D-GO1 | 重试网络的实现 | `custom platform.checkNetwork` 委托宿主，不在前端 fetch ping |
| D-GO2 | sessionReLoginBtn 怎么记录"来源屏" | 复用 `globalView.nav.lastVisited`（宿主维护），写入 authRedirectTo |
| D-GO3 | 重登时是否清空 session.user | 全清——避免 anonymous+user 非空的尴尬中间态 |
| D-GO4 | 是否引入 global-error-boundary | 否——concerns/overlays 已决策不引入 |

---

## ★ 沉淀到 schema 的结论

本任务 1 个 MCP 调用：

```jsonc
// MCP: meta/set_global_overlays（整组替换，含 product 阶段已落字段 + 本任务补的 events）
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  overlays: [
    // ===== overlay 1：离线 banner =====
    {
      id: "global-offline-banner",
      name: "全局离线条",
      type: "custom",
      showWhen: "{{ globalView.network.status === 'offline' }}",
      rootNode: {
        id: "offlineBannerRoot", type: "div", name: "OfflineBanner",
        styles: {}, props: {},
        states: [], events: [], activeState: "default", locked: false, visible: true,
        meta: { product: { summary: "网络断开时全局提示，提示性非阻断" } },
        children: [
          { id: "offlineIcon", type: "div", name: "WifiOffIcon",
            styles: {}, props: {}, children: [],
            states: [], events: [], activeState: "default", locked: false, visible: true,
            meta: { product: { summary: "离线图标占位" } } },
          { id: "offlineText", type: "div", name: "OfflineText",
            styles: {}, props: { textContent: "网络已断开，部分功能受限" }, children: [],
            states: [], events: [], activeState: "default", locked: false, visible: true,
            meta: { product: { summary: "离线提示文字" } } },
          { id: "offlineRetryBtn", type: "button", name: "RetryButton",
            styles: {}, props: { textContent: "重试" }, children: [],
            states: [], activeState: "default", locked: false, visible: true,
            events: [{
              trigger: "click",
              description: "用户主动重试网络：retryCount+1 + 调用宿主 platform.checkNetwork（宿主回写 globalView.network.status）",
              actions: [
                { type: "state.set",
                  path: "globalView.network.retryCount",
                  value: "{{ globalView.network.retryCount + 1 }}" },
                { type: "custom", handler: "platform.checkNetwork" }
              ]
            }],
            meta: { product: { summary: "点击重新检测网络（events 留给 interaction）" } }
          }
        ]
      }
    },

    // ===== overlay 2：session 过期 modal =====
    {
      id: "global-session-expired",
      name: "登录过期 Modal",
      type: "modal",
      showWhen: "{{ globalView.session && globalView.session.status === 'expired' }}",
      backdrop: { color: "rgba(0,0,0,0.5)", dismissible: false },
      rootNode: {
        id: "sessionExpiredRoot", type: "div", name: "SessionExpiredModal",
        styles: {}, props: {},
        states: [], events: [], activeState: "default", locked: false, visible: true,
        meta: { product: { summary: "session 过期时全屏拦截重登" } },
        children: [
          { id: "sessionExpiredTitle", type: "div", name: "ExpiredTitle",
            props: { textContent: "登录已过期" }, children: [], styles: {},
            states: [], events: [], activeState: "default", locked: false, visible: true,
            meta: { product: { summary: "标题" } } },
          { id: "sessionExpiredDesc", type: "div", name: "ExpiredDesc",
            props: { textContent: "请重新登录以继续使用" }, children: [], styles: {},
            states: [], events: [], activeState: "default", locked: false, visible: true,
            meta: { product: { summary: "描述" } } },
          { id: "sessionReLoginBtn", type: "button", name: "ReLoginBtn",
            props: { textContent: "去登录" }, children: [], styles: {},
            states: [], activeState: "default", locked: false, visible: true,
            events: [{
              trigger: "click",
              description: "session 过期跳登录页：写 authRedirectTo 保留来源屏 + 全清 session + nav.go 00-login",
              actions: [
                { type: "state.set",
                  path: "globalView.nav.authRedirectTo",
                  value: "{{ globalView.nav.lastVisited }}" },
                { type: "state.set",
                  path: "globalView.session",
                  value: {
                    status: "anonymous",
                    token: null,
                    refreshToken: null,
                    user: null,
                    expiresAt: null,
                    lastActivityAt: null
                  } },
                { type: "nav.go", targetScreenId: "00-login" }
              ]
            }],
            meta: { product: { summary: "重登入口（events 留 interaction：跳 00-login + 写 nav.authRedirectTo）" } }
          }
        ]
      }
    }
  ]
}
```

> ⚠️ 整组替换：必须把 product 阶段已落的字段（id/name/type/showWhen/backdrop/rootNode 全部 meta/styles/props）原样带回，仅在两个按钮节点上**新增 events 字段**。
