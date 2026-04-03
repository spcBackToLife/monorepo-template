# 编辑器产品设计 100% 落地规划

> **范围**：`design_docs/02-product/editor` 下 **11 个子系统** README 中描述的全部产品能力（含各文档 §「MVP 与后期功能分界」清单、正文中的交互/边界/接口约定）。  
> **目标**：以产品文档为验收标准，逐项实现直至可对照文档做 UAT。  
> **说明**：各子文档内的 `- [ ]` 自检表多数仍为未勾选——本规划将其 **全部纳入 backlog**，并与代码现状解耦，避免「以为做了 / 文档没更新」的歧义。

---

## 一、先说清楚：之前问题出在哪

1. **「已设计」≠「已实现」**：总纲里「状态」列写的是 **文档是否成稿**（✅ 已设计），不是 **工程是否交付**。  
2. **各文档 §MVP 清单大量为 `[ ]`**：产品作者自己也标成未完成；代码里有一部分已做但未回写文档，容易让人以为「和没做一样」。  
3. **沟通上应区分**：**架构/骨架**（有） vs **文档级完整体验**（需按下列清单收口）。

---

## 二、全量能力清单（按子系统）— 未实现 = 待办

下列从各 README 的 **MVP / Phase 2+** 与正文强约定合并而来；**凡出现在此表的，均视为产品承诺项**，需实现或通过明确「砍需求」走变更流程（不默认砍）。

### 01 中央画布 `01-canvas`

| 批次 | 能力项（摘自文档） |
|------|-------------------|
| **MVP 收口** | SchemaRenderer 与文档验收口径一致；EditorOverlay 完整框架；三套坐标与父容器坐标在交互中一致；单击/拖拽/框选；选中蓝框 + 8 resize；方块/容器绘制工具；缩放（Cmd+滚轮、Cmd+0/1）；Space+平移；视口设备框；hitTest 包围盒缓存（与 z-index/父子同尺寸等边界一致） |
| **Phase 2** | 兄弟对齐辅助线（文档级：含等距检测与标注）；**8px 栅格吸附与开关**；**等距标注**；**Alt+Hover 间距标注（粉色）**；**画布/元素右键菜单**（与 §十 一致）；Shift 等比缩放、Alt 中心缩放；多选拖拽与多选 resize；双击/快捷键深层选择；文本工具创建与行内编辑 |
| **Phase 3** | 从组件库拖入；Flex 内布局流拖拽排序；视口溢出检测与警告；大量节点虚拟化；锁定/隐藏；注释工具；文档中与高 DPI/性能相关的剩余项 |
| **总纲快捷键/行为** | 与总纲 §七、§13 边界表一致：如拖出视口警告、最小尺寸、Enter/Escape 层级导航等（凡文档有而代码无的，一律进 backlog） |

### 02 工具栏 `02-toolbar`

| 批次 | 能力项 |
|------|--------|
| **MVP** | 底部工具栏胶囊框架；V/F/R/T；工具状态机与自动回退；快捷键；顶部：撤销/重做、缩放、视口切换；Space 抓手 |
| **Phase 2** | 容器/元素/文本子类型下拉与记忆；组件工具与组件库面板；持续创建模式；快捷键 tooltip；注释工具；顶栏全局状态与数据集切换；缩放下拉与精确输入 |
| **Phase 3** | 代码视图分屏；导出菜单（多技术栈 + PNG/SVG）；全景截图；快捷键引导；响应式布局；快捷键自定义 |

### 03 右侧属性面板 `03-property-panel`

| 批次 | 能力项 |
|------|--------|
| **MVP** | 320px 框架、Tab、元素信息条；样式 Tab 全组（布局/尺寸/盒模型间距/定位/背景/边框/文字）；统一数值控件与颜色选择器；无选/单选 |
| **Phase 2** | 属性 Tab 按类型；类型切换；交互 Tab 事件卡片；状态 Tab 与样式联动、业务状态；Tab 徽标；多选合并编辑 |
| **Phase 3** | 数据 Tab 全套；组件 Props 区；全局状态规则；状态预览切换器 |
| **Phase 4** | 拖拽调值；背景/阴影高级；色板；面板宽拖拽；锁定/可见性；data-* 自定义；样式右键菜单 |

### 04 状态系统 `04-state-system`

| 批次 | 能力项 |
|------|--------|
| **MVP** | 交互状态内置；业务状态 CRUD；状态 Tab UI；与样式 Tab 联动与覆盖标记；叠加算法；setActiveState；预览切换器；交互状态默认样式建议 |
| **Phase 3** | 全局状态变量 CRUD；绑定/解绑；解析叠加；预览器+顶栏；条件可见性 |
| **Phase 4** | 组合预览矩阵；绑定排序；实例继承覆盖；子元素条件可见；状态过渡动画；导出映射 |

### 05 数据驱动 `05-data-driven`

| 批次 | 能力项 |
|------|--------|
| **MVP** | DataSet 与 Screen 扩展；数据集 CRUD；切换 Operation；JSON 编辑器；`{{data.xxx}}` 与解析；面板绑定 UX；自动补全；顶栏数据集切换；数据 Tab |
| **Phase 4** | 可视化 JSON 编辑；默认值与模板串；列表绑定与编辑态展示；预设模板；画布/树绑定标记；复制路径 |
| **Phase 5** | 全景截图矩阵与引擎与浏览器；样式值绑定；AI 数据集（远期标注） |

### 06 组件 Props `06-component-props`

| 批次 | 能力项 |
|------|--------|
| **MVP** | HTML 属性注册表；属性 Tab 动态表单；changeElementType；PropType 控件；组件实例 Props 面板；updateComponentProps |
| **Phase 3** | 保存为资产向导；propBindings；引用/脱离；image/action/options 等完整控件 |
| **Phase 4** | 状态下 Props 覆盖；数据绑定；AI/MCP；分组搜索；嵌套穿透 |

### 07 资产管理 `07-asset-management`

| 批次 | 能力项 |
|------|--------|
| **MVP** | ComponentTemplate + saveAsTemplate；保存流程；资产库面板；拖入实例化；引用/脱离；静态资源与 asset://；素材列表面板 |
| **Phase 5** | 骨架/风格完整流程；详情与版本；缩略图等 |
| **Phase 6** | **素材设计器**（图层/渐变/图片/混合/导出）；团队与 AI（文档列出的） |

### 08 组件树与页面 `08-layer-tree`

| 批次 | 能力项 |
|------|--------|
| **MVP** | 左侧面板分区；树递归；节点行；展开折叠；与画布双向选中滚动；Hover；页面列表与新建；**右键菜单** |
| **Phase 2** | 拖拽改层级与父子；多选拖拽；显示隐藏/锁定；重命名；键盘排序；页面排序与复制删除 |
| **Phase 3–4** | 搜索、虚拟滚动、过滤器、缩略图等文档项 |

### 09 交互与事件 `09-interaction-bindding`

| 批次 | 能力项 |
|------|--------|
| **MVP** | trigger + 单 action；5 触发器 + 4 行为；交互 Tab；闪电标记；add/remove/updateEvent Operations |
| **Phase 5** | 事件链、toggleVisible、hover 反转、元素选择器、禁用、描述字段 |
| **Phase 6** | 条件事件、custom、延时、导航图、跳转关联线、导出 |

### 10 预览模式 `10-preview-mode`

| 批次 | 能力项 |
|------|--------|
| **MVP** | 进入/退出；覆盖层关闭与 DOM 事件；控制条；深灰背景居中；事件引擎；伪类注入；表单与滚动；快捷键 |
| **Phase 5** | 跳转动画、导航栈、数据集/全局状态切换、平滑动画、hover 反转、toggleVisible |
| **Phase 6** | 设备框、PreviewController、AI 测试与分享等 |

### 11 协作与同步 `11-collaboration`

| 批次 | 能力项 |
|------|--------|
| **MVP（文档 Phase 5）** | WS 握手、operation 协议、心跳、回声去重、远程应用、持久化队列、保存指示、AI Toast、重连与补发 |
| **Phase 6** | 离线缓存与合并、选择性撤销等 |
| **Phase 7** | 多人光标、在线列表、冲突与 OT/CRDT 等 |

---

## 三、横向：总纲层「跨子系统」必须一致的能力

以下在 **总纲** 或 **01-canvas** 中反复出现，实施时需统一验收：

- **快捷键总表**（总纲 §七）：与 02-toolbar / 01-canvas / 10-preview 对齐实现。  
- **五维 Schema 操作路径**：结构 / 样式 / 交互 / 状态 / 数据 在 **画布 + 属性 + 树** 上均可达到文档描述深度。  
- **Operation 全集**（总纲 §六 表）：未实现的 Operation 与 API、MCP 对齐补全。  
- **右键菜单**：**01 §十（画布）** + **08（树）** + **03 Phase4（样式）** 等需统一组件与快捷键，避免再删。

---

## 四、推荐实施波次（依赖顺序）— 用于排期与里程碑

> 以下为 **工程依赖上的合理顺序**；人力并行时可在同一波内拆人，但 **不要** 在 01/08/03-MVP 未稳前铺 Phase 6 协作。

| 波次 | 主题 | 主要覆盖文档 | 依赖 |
|------|------|----------------|------|
| **W1** | 画布编辑闭环 + 树 + 属性样式 MVP | 01、08、03（MVP） | 无 |
| **W2** | 工具栏 MVP + 状态系统 MVP + 画布 Phase2 核心（右键、栅格、标注、多选等） | 02、04、01 Phase2 | W1 |
| **W3** | 数据驱动 MVP + 属性数据 Tab + 顶栏数据集 | 05、03 | W2 |
| **W4** | 组件 Props MVP + 资产 MVP + 拖入画布 | 06、07 | W3 |
| **W5** | 交互绑定 MVP + 预览 MVP | 09、10 | W4 |
| **W6** | 各文档 Phase 3–4 增强（状态全局、数据可视化、资产增强、预览导航等） | 04–07、09–10 | W5 |
| **W7** | 协作 MVP（WS、同步、保存态）+ 画布性能与虚拟化 | 11、01 Phase3 | W6 |
| **W8+** | 素材设计器、AI 测试、多人协作等文档 Phase 5–7 | 07、10、11 | W7 |

**100% 定义**：上表各波次对应文档章节 **全部** 可在产品中演示并通过 UAT；自检表从 `- [ ]` 改为 `- [x]` 由产品/研发共同确认后回填 **各子 README**（避免再次失真）。

---

## 五、验收与文档维护（强制）

1. **每完成一波**：在对应 `02-product/editor/xx-xxx/README.md` 的清单上 **勾选并注明版本号**。  
2. **禁止**：仅改代码不更新文档勾选（或反之）。  
3. **本文件**：随大版本更新「波次」完成度；或迁移到项目管理工具，本文件保留为 **能力全集索引**。

---

## 六、与当前代码的粗粒度对照（便于开工，不替代逐条测试）

| 区域 | 现状（概括） | 缺口方向 |
|------|----------------|----------|
| design-engine | 双层渲染、选区、拖拽/缩放预览、部分对齐、hitTest 已演进 | 文档 Phase2/3 大量可视化与管理能力 |
| design_front | 编辑器壳、Canvas、部分面板 | 右键、完整工具栏/属性/树与文档一致 |
| design-api / WS | 部分持久化与推送 | 对齐 11-collaboration 协议与队列 |
| MCP | 部分工具 | 对齐 06/07/总纲 Operations |

---

## 七、仓库职责映射（实现时按包分工）

| 包 / 应用 | 主要职责（对应产品文档） |
|-----------|-------------------------|
| `features/design-schema` | 所有 ComponentNode / Screen / Event / State / DataSet / Template 等 **类型与校验**；与总纲 §六「Schema 扩展」一致 |
| `features/design-operations` | **Operation** 定义、执行器、与 schema 同步；总纲 §六「新增 Operations」全集 |
| `features/design-engine` | **01** 画布 DOM+Overlay、**10** PreviewRenderer/EventEngine、坐标与命中、列表/数据渲染 |
| `apps/design_front` | **02/03/08** 壳与面板、**编辑器路由**、MobX store、快捷键、与 engine 的组装 |
| `apps/design-api` | 持久化、项目/屏幕快照、WebSocket 房间、与 **11** 协议对齐 |
| `apps/design-mcp` | MCP Tools/Resources 与 API 对齐，保证 AI 路径与手动路径一致 |

**原则**：能进 **operations** 的变更不进 **front 里写死**；能进 **schema** 的协议不进 **引擎里魔法字符串**。

---

## 八、分波次实现说明（可拆 Epic / Story）

以下为 **按依赖排序的实现包**；每一波结束应达到 **可演示 + 可写测试 + 可回填文档勾选**。

### W1 — 基础编辑闭环（01 + 08 + 03-MVP）

| 序号 | 交付物 | 主要落地位置 | 验收要点（对照文档） |
|------|--------|----------------|----------------------|
| W1.1 | 画布：坐标系、pan/zoom、选/拖/框选/resize、绘制工具与 **文档一致** 的边界行为 | `design-engine` overlay + `design_front` Canvas | 01 §2–§5、§13 边界表 |
| W1.2 | 组件树 + 页面列表：结构、选中双向同步、新建页 | `design_front` panels | 08 MVP |
| W1.3 | 属性面板样式 Tab：布局/尺寸/盒模型/定位/背景/边框/文字 + 统一控件 | `design_front` panels | 03 MVP |
| W1.4 | 统一 **右键菜单壳**（画布/树共用数据源，菜单项按上下文过滤） | `design_front` 组件 + store | 01 §十、08 MVP（可先占位项再填满） |

**W1 完成定义**：不依赖 Phase2 增强，也能完成「建页 → 加节点 → 改样式 → 树与画布一致」。

---

### W2 — 工具栏 + 状态 MVP + 画布 Phase2 核心（02 + 04 + 01-P2）

| 序号 | 交付物 | 主要落地位置 | 验收要点 |
|------|--------|----------------|----------|
| W2.1 | 底部工具栏：工具状态机、V/F/R/T、与画布 `activeTool` 一致 | `design_front` BottomToolbar + store | 02 MVP |
| W2.2 | 顶栏：撤销重做、缩放 UI、视口切换；Space 抓手 | `design_front` Toolbar + `useZoomPan` | 02 MVP、总纲 §七 |
| W2.3 | 状态：业务状态 CRUD、状态 Tab、与样式覆盖联动、`setActiveState` | `design_front` + `design-operations` + schema | 04 MVP |
| W2.4 | 画布 Phase2：栅格开关与吸附、粉色间距与等距标注、多选拖拽/resize、Shift/Alt 约束、深层选择 | `design-engine` EditorOverlay + snapping | 01 Phase2 |
| W2.5 | 文本工具：创建 + 行内编辑入口 | `design-engine` + `design_front` | 01 Phase2 |

**W2 进度**：已全部收口，见 `design_docs/04-roadmap/editor-w2-issues.md`。

---

### W3 — 数据驱动 MVP（05 + 03 数据维度）

| 序号 | 交付物 | 主要落地位置 | 验收要点 |
|------|--------|----------------|----------|
| W3.1 | Screen `dataSets`、CRUD、switchDataSet、持久化 | `design-schema` + `design-api` + `design-operations` | 05 MVP |
| W3.2 | 表达式解析、绑定 UI、自动补全、顶栏数据集切换 | `design-engine` + `design_front` | 05 MVP |
| W3.3 | 属性面板 **数据 Tab** | `design_front` | 03 Phase3 中与数据相关部分 |

**W3 进度**：见 `design_docs/04-roadmap/editor-w3-issues.md`。已收口：`updateDataSet` 支持元数据（name/description）、PropsTab 与 `bindData` 的 `{{}}` 绑定一致、Data Tab 中文与重命名、JSON 与数据树外部同步、MCP `remove_dataset` 与增强版 `update_dataset`。

---

### W4 — Props + 资产 MVP（06 + 07 + 01 拖入）

| 序号 | 交付物 | 主要落地位置 | 验收要点 |
|------|--------|----------------|----------|
| W4.1 | HTML 属性注册表、属性 Tab、`changeElementType`、`updateComponentProps` | `design-schema` + `design-operations` + `design_front` | 06 MVP |
| W4.2 | `saveAsTemplate`、资产库面板、拖入实例化、引用/脱离、静态资源 `asset://` | `design-api` + `design_front` + `design-engine` drop | 07 MVP |
| W4.3 | MCP tools 与 **手动操作** 同一套 operations | `design-mcp` | 总纲 §三 路径 B |

**W4 进度**：见 `design_docs/04-roadmap/editor-w4-issues.md`。已收口：节点类型切换、组件实例脱离/同步、组件库卡片拖入画布、`asset://` 与素材上传面板、底部 **保存为组件** 与 Modal 内嵌组件库、属性面板图片 `asset://` 预览、MCP `detach_instance` / `sync_instance` / `change_element_type`。

**W5–W8 总索引**：`design_docs/04-roadmap/editor-roadmap-w5-w8-index.md`（含 W5～W8 issue 文件入口）。

---

### W5 — 交互 + 预览 MVP（09 + 10）

| 序号 | 交付物 | 主要落地位置 | 验收要点 |
|------|--------|----------------|----------|
| W5.1 | 事件模型：触发器 + 单 action、交互 Tab、闪电标记、事件 Operations | `design-schema` + `design-operations` + `design_front` | 09 MVP |
| W5.2 | 预览模式：Overlay 关闭、DOM 可点、事件引擎、伪类注入、表单/滚动、快捷键 | `design-engine` + `design_front` | 10 MVP |

**W5 进度**：见 `design_docs/04-roadmap/editor-w5-issues.md`。已收口：预览 **DataContext** 与 `{{data.*}}`、**EventExecutionEngine** + **CSSPseudoInjector**、**Esc 退出预览**、画布 **闪电角标**、MCP `add_event` / `remove_event`。

---

### W6 — 各子系统 Phase3–4 增强（文档「增强体验」层）

| 主题 | 涵盖文档 | 说明 |
|------|----------|------|
| 全局状态、条件可见性、状态矩阵 | 04、03 | 与 05 联动 |
| 数据可视化编辑、列表绑定、绑定标记 | 05、01、08 | |
| 资产 Phase5、Props Phase3 | 06、07 | |
| 交互 Phase5（事件链等）、预览 Phase5（导航栈等） | 09、10 | 按文档优先级拆迭代 |

**W6 建议**：按 **产品优先级** 在 04/05/07/09/10 中选 1～2 条线并行，避免同时改 5 个域。

---

### W7 — 协作 MVP + 画布性能（11 + 01-P3）

| 序号 | 交付物 | 主要落地位置 | 验收要点 |
|------|--------|----------------|----------|
| W7.1 | WebSocket 协议、operation 推送、回声去重、重连补发、保存状态、AI Toast | `design-api` + `design_front` ws + store | 11 MVP |
| W7.2 | 虚拟化、溢出警告、锁定/隐藏、注释节点 | `design-engine` + schema + operations | 01 Phase3、总纲 Schema |

---

### W8+ — 远期（文档 Phase6–7）

| 主题 | 涵盖文档 |
|------|----------|
| 素材设计器全量 | 07 §Phase6 |
| AI 自动化测试、预览分享 | 10 §Phase6 |
| 多人 OT/CRDT、光标 | 11 §Phase7 |

---

## 九、横切任务（贯穿多波，需专人跟进）

1. **快捷键注册表**：单一模块（如 `useKeyboardShortcuts`）订阅总纲 §七，避免各面板重复绑定。  
2. **右键菜单**：统一 `ContextMenu` 组件 + 命令表（复制/粘贴/层级/素材入口），画布与树仅传 `context`。  
3. **Operation 与撤销栈**：所有用户可见变更走 executor，保证协作与 MCP 重放一致。  
4. **E2E / 视觉回归**：至少覆盖 W1/W5 主路径；画布对齐线等用截图或像素差分可选。  
5. **文档回填**：每波合并前更新对应 `02-product/editor/**/README.md` 勾选。

---

## 十、建议人力与并行度（参考）

| 阶段 | 建议最低配置 | 说明 |
|------|----------------|------|
| W1–W2 | 1 引擎 + 1 前端 | 引擎负责 overlay/坐标/性能敏感路径 |
| W3–W4 | +0.5 后端 | dataset/资产 API |
| W5 | 前端全栈单域 | 事件+预览耦合紧 |
| W6+ | 按域并行 2+ feature branch | 需约定 schema 版本与 migration |

---

**文档版本**：2026-03-29（v2：补充仓库映射与分波交付）  
**维护**：产品 + 前端负责人；**权威范围**：`design_docs/02-product/editor/**/*.md`
