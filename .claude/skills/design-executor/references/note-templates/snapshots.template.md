# 模板：E-snapshots（全屏完整截图集）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/global/snapshots.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-snapshots
> 对应 schema 字段：核对类，无 schema 写入；产物是截图集 URLs

## 1. 截图模式

```jsonc
generate_snapshots {
  projectId,
  screenIds: [<所有屏 IDs>],
  mode: "frame",                  // ★ 完整页面，不只是首屏
  format: "png"
}
```

`mode: "frame"` 截整页（含滚动区域）；`viewport` 仅截首屏。

## 2. 全屏截图集

| 屏 | 截图 URL | 备注 |
|----|---------|------|
| 00-login | [URL] | |
| 01-home | [URL] | 长页面，含底部 |
| 02-forgot | [URL] | |
| 03-settings | [URL] | |
| 04-error | [URL] | |
| ... | | |

## 3. 不同视口预设（如有）

如项目有多视口预设（手机 / 平板）：
```jsonc
generate_snapshots {
  projectId,
  screenIds: [...],
  viewportIds: [<手机 vp id>, <平板 vp id>],
  mode: "frame"
}
```

| 屏 | 手机 | 平板 |
|----|------|------|
| 00-login | [URL] | [URL] |
| ... | | |

## 4. 全局 overlay 触发态截图集（已在 E-global-snapshot 完成 → 此处汇总）

| 触发态 | 屏 | 截图 URL |
|-------|----|---------|
| globalView.network.status='offline' | 00-login | [URL] |
| globalView.session.status='expired' | 01-home | [URL] |
| ... | | |

## 5. 衍生视图态截图集（已在各屏 E-X-snapshot 完成 → 此处汇总）

| 屏 | 衍生态 | 截图 URL |
|----|-------|---------|
| 00-login | loading | [URL] |
| 00-login | error | [URL] |
| 01-home | empty | [URL] |
| 01-home | loading | [URL] |
| 03-orderDetail | order pending_payment | [URL] |
| 03-orderDetail | order shipping | [URL] |
| ... | | |

## 6. ★ 沉淀到 schema 的结论

```jsonc
// 本任务以截图集为产物
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      finalSnapshots: {
        generatedAt: "<ISO>",
        byScreen: {
          "00-login": "<URL>",
          "01-home": "<URL>",
          ...
        },
        derivativeStates: { ... },
        globalOverlayStates: { ... }
      }
    }
  }
}
```

⚠️ **后续约束**：
- E-handover：截图集 URLs 写入交付报告
```
