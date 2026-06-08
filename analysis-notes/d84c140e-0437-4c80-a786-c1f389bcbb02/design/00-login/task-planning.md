# v9 Phase E — 任务规划

> 基于 designGoals + goalElementMap 派发 5 个 craft 任务。
> 执行顺序：G1 → G2 → G3 → G4 → G5 → self-review
> 与 v8 对接策略：不推翻 v8 styles/states/meta，仅 materials 补 BrandLogo PNG 真画素材债。

---

## 任务清单

| 任务 ID | 任务目标 | 涉及元素 | 状态 |
|---|---|---|---|
| D-00-login-v9-G1-craft | G1 mood: 屏底+装饰+留白协同 | screen/BrandLogo/HeaderArea/FormCard/2 BgBlob | 待执行 |
| D-00-login-v9-G2-craft | G2 cta: SubmitBtn 主角化 + 邻居弱化 | SubmitBtn/GetCodeBtn/Links/FormCard | 待执行 |
| D-00-login-v9-G3-craft | G3 trust: checkbox+错误+链接温和 | PolicyCheckVisual/native/CheckMark/Errors/Links | 待执行 |
| D-00-login-v9-G4-craft | G4 brand: BrandLogo 100x100 PNG+主色应用 | BrandLogo/Slogan/SubmitBtn/Terms/Privacy | 待执行 |
| D-00-login-v9-G5-craft | G5 state: Tab+LockedView+countdown 状态反馈 | ModeToggle/LockedView/NormalFormView/Countdown | 待执行 |

---

## 执行顺序与依赖

```
G1 (mood) → G2 (cta) → G3 (trust) → G4 (state) → G5 (brand) → self-review
```

**依赖说明**：
- G1 是氛围基础，先执行
- G2 在主视觉区域，依赖 G1 屏底
- G3 在 G2 之后（错误提示与按钮交互相关）
- G4 与 G1 共享 BrandLogo，G1 完成后再细化 BrandLogo
- G5 状态反馈独立，最后执行
- self-review 在所有 craft 完成后执行

---

## 每个 craft 任务的 expectedArtifacts

### D-00-login-v9-G1-craft

```json
"expectedArtifacts": [
  {
    "kind": "nonEmpty",
    "path": "rootNode"
  },
  {
    "kind": "hasKeys",
    "path": "meta.design.goalElementMap[0].changes",
    "keys": ["styles", "structure", "materials", "visualStates", "layout"]
  }
]
```

### D-00-login-v9-G2-craft

```json
"expectedArtifacts": [
  {
    "kind": "nodeHasEvent",
    "nodeId": "<SubmitBtn>",
    "trigger": "click"
  },
  {
    "kind": "hasKeys",
    "path": "meta.design.goalElementMap[1].changes",
    "keys": ["styles", "visualStates", "layout"]
  }
]
```

### D-00-login-v9-G3-craft

```json
"expectedArtifacts": [
  {
    "kind": "nodeHasEvent",
    "nodeId": "<PolicyCheckVisual>",
    "trigger": "click"
  },
  {
    "kind": "hasKeys",
    "path": "meta.design.goalElementMap[2].changes",
    "keys": ["styles", "visualStates"]
  }
]
```

### D-00-login-v9-G4-craft

```json
"expectedArtifacts": [
  {
    "kind": "nonEmpty",
    "path": "rootNode.children[0].meta.design.materialSpec"
  },
  {
    "kind": "hasKeys",
    "path": "meta.design.goalElementMap[3].changes",
    "keys": ["styles", "structure", "materials"]
  }
]
```

### D-00-login-v9-G5-craft

```json
"expectedArtifacts": [
  {
    "kind": "nodeHasEvent",
    "nodeId": "<ModeToggle>",
    "trigger": "click"
  },
  {
    "kind": "hasKeys",
    "path": "meta.design.goalElementMap[4].changes",
    "keys": ["styles", "visualStates"]
  }
]
```

---

## 与 v8 对接策略

- **不推翻 v8 已完成内容**：styles/visualStates/meta 全部保留
- **仅 materials 补货**：BrandLogo PNG 真画素材（v8 仅 spec 没画）
- **增量改动**：每个 craft 任务按 goalElementMap.changes 最小改动，不重写 v8 产物
- **截图自审**：每完成一个 craft 任务，截图对账 successCriteria

---

## ★ 沉淀到 schema 的结论

待调用 `meta/update_plan_task` 写入 5 个 craft 任务到 `meta.plan`。
