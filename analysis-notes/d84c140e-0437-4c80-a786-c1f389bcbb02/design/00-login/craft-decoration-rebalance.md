> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：D-00-login-craft-decoration-rebalance
> 必读方法论：methodology/06-decoration.md（v3 装饰系统单一族 + §7 css-gradient 渲染限制）

---

# D-00-login-craft-decoration-rebalance — Craft（创作执行）

## 1. 视觉目标

- 让 BgBlobTopRight 在屏底真的可见（解决 ISSUE-3）
- 添加 BgBlobBottomLeft 配重，让构图不偏头重
- 装饰系统单一族 = soft-glow（与 strategy 一致）

## 2. v2 根因诊断（重要发现）

v2 BgBlobTopRight `background: "radial-gradient(circle at 50% 50%, $token:colors.primaryLight 0%, transparent 70%)"` —— **字符串内嵌 `$token:colors.primaryLight` 不被渲染层解析**（methodology/06 §7 + 12 §6 已标），所以渲染端把整个字符串当无效值，导致装饰**完全没出现**。这是 ISSUE-3 装饰失效的真正根因，比"浓度太弱"更核心。

## 3. v3 实现策略

### 3.1 trade-off 决策：rgba 直接硬编码（接受 R-STRUCTURE-02 风险）

| 候选 | 选 / 否决 |
|---|---|
| A. 维持 $token 字符串内嵌 | ❌ 不渲染 |
| B. 改用 backgroundColor + CSS clip-path 圆形 | ❌ 单色块无渐变光晕感，不符合 soft-glow 系统 |
| C. **rgba 硬编码 + 在 meta 标"渲染层限制 trade-off"** | ✅ 选定 |
| D. UpstreamChallenge theme-generator 加 token 但渲染仍不解析 | ❌ 治标不治本 |

### 3.2 BgBlobTopRight 调整

```jsonc
styles: {
  position: "absolute",
  top: "-40px",
  right: "-60px",
  width: "200px",
  height: "200px",
  zIndex: 0,
  background: "radial-gradient(circle at 50% 50%, rgba(91, 108, 255, 0.12) 0%, transparent 70%)",
  // ↑ rgba(91,108,255) = $token:colors.primary 展开（trade-off 见 §3.1）
  borderRadius: "9999px",
  pointerEvents: "none"
}
```

### 3.3 BgBlobBottomLeft 新增

```jsonc
// element/add 到 Root.children 末尾（z-index 0 与 BgBlobTopRight 同层）
{
  type: "div",
  name: "BgBlobBottomLeft",
  parentId: "nd_6a7f2492b59b4e7eab7e1",  // Root
  styles: {
    position: "absolute",
    bottom: "-30px",
    left: "-50px",
    width: "180px",
    height: "180px",
    zIndex: 0,
    background: "radial-gradient(circle at 50% 50%, rgba(167, 118, 255, 0.08) 0%, transparent 60%)",
    // rgba(167,118,255) = $token:colors.secondary 展开
    borderRadius: "9999px",
    pointerEvents: "none"
  },
  meta: {
    design: {
      kind: "decoration",
      summary: "左下角溢出小光斑（v3 配重）",
      visualSpec: { role: "氛围-装饰", weight: 1, zIndex: 0 },
      materialSpec: {
        kind: "decoration",
        renderHint: "css-gradient",
        background: "transparent + rgba(167,118,255,0.08) → transparent radial",
        rationale: "secondary 紫给「校园温度」加一点暖紫调；与 TopRight primary 蓝紫光斑形成对角呼应（不抢戏）"
      }
    }
  }
}
```

## 4. minSignals 核查

| 节点 | role | minSignals 阈值 | 实际信号数 |
|---|---|---:|---:|
| BgBlobTopRight | 氛围-装饰 | ≥ 2 | 3（径向渐变 + alpha 12% + 200px 半溢出位置）✅ |
| BgBlobBottomLeft | 氛围-装饰 | ≥ 2 | 3（径向渐变 + alpha 8% + 180px 半溢出位置）✅ |
| 总 weight | – | ≤ 节制 4 | 2+1=3 ✅ |

## 5. ★ 沉淀到 schema

```jsonc
// 1) style/update BgBlobTopRight（修复 token 字符串内嵌）
// 2) element/add BgBlobBottomLeft 到 Root
// 3) meta/set_node 给 BgBlobBottomLeft 写 design.kind=decoration
```

## 6. 自检

- [x] v2 根因找到（字符串内嵌 token 不渲染）
- [x] trade-off 决策记录（rgba 硬编码）
- [x] 装饰系统单一族 soft-glow（两个光斑都是径向渐变 + 圆形 + 单色 alpha）
- [x] 总 weight=3 ≤ 节制上限
- [ ] 落库后等用户截图验证装饰可见
