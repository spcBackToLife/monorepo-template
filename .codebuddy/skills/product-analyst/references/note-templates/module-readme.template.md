# 模块 <M> — 索引

> 模块所有任务的 md 链接 + 关键决策汇总。
> 模块所有任务 done 后，AI 在此汇总；不是某个 plan 任务的产物，是模块完工标志。

## 子任务清单

| 任务 | md 文件 | 状态 |
|------|---------|:----:|
| <M>-stories | `A-stories.md` | ✅ |
| <M>-flows | `B-flows.md` | ✅ |
| <M>-rules | `C-rules.md` | ✅ |
| <M>-data | `D-data.md` | ✅ |
| <M>-skeleton | `../../screens/<screenId>/skeleton.md` | ✅ |
| <M>-state-shape | `../../screens/<screenId>/state-shape.md` | ✅ |
| <M>-coverage | `../../screens/<screenId>/coverage.md` | ✅ |
| <M>-integrity | （schema 中检查）| ✅ |

## 模块涉及的屏幕

- `<screenId-1>`（主屏）
- `<screenId-2>`（子流程）
- ...

## 模块涉及的 API

- `ds-xxx`（含 typeDef）
- ...

## 模块间关联

### 依赖
- 本模块用到哪些其他模块的能力（如"内容发布依赖用户认证"）

### 被依赖
- 哪些模块会消费本模块的产出

### 跨模块跳转
- `<from-screen>` → `<to-screen>`（trigger: ...）

## 关键决策

[模块层面的关键决策汇总——不在 `decisions/` 单独立项的小决策]

- 决策 1：选 X 而非 Y，理由 ...
- 决策 2：暂不做 Z，理由 ...

## 完工证据

- ✅ rules 4 类齐（参 `C-rules.md`）
- ✅ 每个 API 有 typeDef
- ✅ 节点骨架建好（参 schema）
- ✅ state/data 占位齐
- ✅ 三轴覆盖核对通过
- ✅ `query/integrity { screenId }` 0 错
