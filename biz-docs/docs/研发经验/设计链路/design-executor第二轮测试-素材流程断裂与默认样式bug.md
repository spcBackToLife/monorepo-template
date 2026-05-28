# design-executor第二轮测试-素材流程断裂与默认样式bug

## 类型

架构设计

## 上下文

- **项目**: design-ui-monorepo / campus-geo-social
- **场景**: 第二轮 executor 测试，已加红线后仍在装饰元素上违规
- **时间**: 2026-05-28
- **前置**: 第一轮测试发现"批量执行+跳过文档"问题并修复了 SKILL 红线

---

## 问题描述

### 问题 1: 素材流程断裂——红线写了但触发不了

**现象**: D-02 (pink-circle) 和 D-03 (mint-leaf) 应该用 material-painter 绘制到素材工程画布，再 export_and_apply 到节点建立槽位关联。实际直接写了 `background: radial-gradient(...)` CSS 凑形状。

**红线原文**: "🚫 有 materials 字段的节点，必须调用 material-painter。不得用色块/emoji 占位"

**为什么红线没生效**:

| 设计假设 | 实际数据结构 | 断裂点 |
|---|---|---|
| 节点 JSON 里有 `materials` 字段 | `_page.json` 本身**没有** materials 字段 | 红线触发条件匹配不到 |
| 素材信息挂在节点上 | 素材索引在独立的 `_materials.json` 文件里 | executor 流程没有"读 _materials.json"的步骤 |
| 装饰层是独立任务 | task-gen 只扫描有 `implementation` 的节点文件 | 装饰不在任务列表里，没有执行入口 |

**结论**: 这不是"AI 偷懒"——是**流程设计有结构性漏洞**，红线的触发条件与实际数据架构不匹配。

### 问题 2: MCP element/add 默认样式 bug

**现象**: 创建 `position:absolute` 的 div 时，编辑器自动注入:
```css
display: flex;
flexDirection: column;
flex: 1;
minHeight: 40px;
minWidth: 40px;
```

导致 absolute 定位的装饰元素被撑开而不是浮动显示。

**根因**: design-api 的 element.add 操作对所有新建 div 统一应用默认样式，没有根据用户传入的 styles 做智能判断（如 position:absolute 时不应加 flex/minHeight）。

---

## 解决方案

### 素材流程修复（架构层面）

#### 方案: task-gen 把素材生成为独立任务

```
修改 task-gen.ts:
1. 扫描每个页面的 _materials.json
2. 为每个素材条目生成独立任务:
   - type: "material"
   - path: "00-login/_materials/D-02"
   - ref: 素材 md 文档路径
   - boundNodes: 目标节点列表
3. 素材任务排在对应页面节点之后（先有节点才能 apply 素材）
```

生成的 EXECUTOR-PLAN.md 会多出素材任务:
```markdown
### 00-login/_materials/D-02 (pink-circle)
- [ ] 读取素材规格文档
- [ ] 调用 material-painter 绘制
- [ ] export_and_apply 到目标节点
- [ ] 建立素材槽位
- [ ] 验证视觉效果
📖 需读: design-plan/pages/00-login/materials/D-02-pink-circle.md
```

#### executor SKILL 红线修正

```
旧: "有 materials 字段的节点，必须调用 material-painter"
新: "EXECUTOR-PLAN.md 中 type=material 的任务，必须调用 material-painter 绘制+export_and_apply。
    禁止用 CSS 背景/渐变/emoji 替代素材绘制。"
```

### MCP 默认样式修复

```
修改 design-api element.add 逻辑:
- 如果用户传入 styles 包含 position: "absolute" | "fixed"
  → 不注入 flex/minHeight/minWidth/flex:1
  → 只保留用户传入的样式
- 否则（正常 flow 元素）
  → 保持现有默认值
```

---

## 对未来设计的启示

1. **红线的触发条件必须匹配数据结构** — 不是写个笼统的"有 X 就做 Y"，要精确到"哪个文件的哪个字段"
2. **独立文件 = 独立任务** — `_materials.json` 是独立文件，里面的每个素材应该是独立任务，不能被淹没在页面节点任务里
3. **素材绘制是独立工序** — 不是"搭结构时顺便画"，而是"结构搭好后，专门一轮素材绘制"
4. **MCP 工具的默认行为要可预测** — 创建元素时注入的默认样式不应与用户传入的样式冲突

---

## Tags

`design-executor` `material-painter` `素材槽位` `红线失效` `数据结构不匹配` `MCP默认样式` `流程架构`
