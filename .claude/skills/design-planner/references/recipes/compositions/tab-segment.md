# 复合控件配方：Tab / Segment

> 适用：登录方式切换（验证码/密码）、详情多 Tab、列表筛选、设置多分组
>
> **核心**：active vs inactive **必须 ≥ 2 个视觉信号区分**，否则用户不知道当前选中的是哪个。

---

## 1. 视觉目标

让用户**一眼看出当前激活的是哪个 Tab**，且切换时有过渡动效。

适用 visualState：default / hover / pressed / focus / disabled / **active**（业务态）/ **active-hover**（active + hover 复合）。

---

## 2. 节点结构（schema）

```jsonc
{
  type: "div",
  name: "ModeToggle",
  label: "登录模式切换",
  styles: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "$token:spacing.lg",
    borderBottom: "1px solid $token:colors.borderLight",
    position: "relative"                                // ★ 给 indicator 定位锚点
  },
  meta: { design: { kind: "visual-container" } },
  children: [
    {
      type: "button",
      name: "CodeModeBtn",
      props: { textContent: "验证码登录" },
      styles: {
        flex: "0 0 auto",
        padding: "$token:spacing.xs 0",
        backgroundColor: "transparent",
        color: "$token:colors.textSecondary",
        fontSize: "$token:typography.body.fontSize",
        fontFamily: "$token:typography.body.fontFamily",
        fontWeight: "500",
        lineHeight: "1.4",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "color $token:transitions.fast.value"
      },
      states: [
        {
          name: "active",                              // ★ 业务态
          activeWhen: "{{state.view.activeMode === 'code'}}",
          styles: {
            color: "$token:colors.textPrimary",        // ← 信号 1：字色加深
            fontWeight: "700"                          // ← 信号 2：字重加强
          }
        },
        { name: "hover", styles: { color: "$token:colors.textPrimary" } },
        { name: "pressed", styles: { transform: "scale(0.98)" } },
        { name: "focus", styles: { boxShadow: "0 0 0 2px $token:colors.primaryLight" } },
        { name: "disabled", styles: { opacity: "0.5", cursor: "not-allowed" } }
      ],
      events: [/* interaction 已写：click → state.set view.activeMode='code' */]
    },
    {
      type: "button",
      name: "PasswordModeBtn",
      props: { textContent: "密码登录" },
      // 同 CodeModeBtn，activeWhen 改为 'password'
      states: [
        {
          name: "active",
          activeWhen: "{{state.view.activeMode === 'password'}}",
          styles: {
            color: "$token:colors.textPrimary",
            fontWeight: "700"
          }
        },
        // ... hover / pressed / focus / disabled
      ]
    },
    {
      type: "div",                                     // ★ 移动指示条（信号 3）
      name: "TabIndicator",
      styles: {
        position: "absolute",
        bottom: "-1px",                                // 紧贴容器 borderBottom
        left: "0",
        height: "2px",
        width: "calc(50% - $token:spacing.lg / 2)",    // 假设两 tab 等宽（可根据实际算）
        backgroundColor: "$token:colors.primary",
        borderRadius: "1px",
        transition: "transform $token:transitions.normal.value"
      },
      states: [
        {
          name: "code-active",
          activeWhen: "{{state.view.activeMode === 'code'}}",
          styles: { transform: "translateX(0)" }
        },
        {
          name: "password-active",
          activeWhen: "{{state.view.activeMode === 'password'}}",
          styles: { transform: "translateX(calc(100% + $token:spacing.lg))" }
        }
      ]
    }
  ]
}
```

---

## 3. 视觉信号清单（active vs inactive ≥ 2）

| # | 信号 | inactive | active |
|:---:|---|---|---|
| 1 | 字色 | textSecondary | textPrimary |
| 2 | 字重 | 500 | 700 |
| 3 | 移动指示条（TabIndicator）| 不在该 tab 下 | 滑到该 tab 下 |
| 4（可选）| 底色 | transparent | primaryLight 极淡填充 |
| 5（可选）| 字色（强对比版本）| textTertiary | primary |

**最低**：1 + 2（字色 + 字重）。**强烈推荐**：1 + 2 + 3（加移动指示条）—— 最专业的 tab 都用此模式。

---

## 4. variant 扩展

### 4.1 Segment（按钮组式）
- 容器有 background: gray100 + borderRadius: radius.md
- 子 button 无 borderBottom，active 时：backgroundColor: surface + boxShadow: shadows.sm（凸起感）
- 不需要 TabIndicator（用底色区分）

### 4.2 Pill 标签式
- 子 button borderRadius: full
- inactive: bg gray100，active: bg primary + 字 textInverse

### 4.3 Vertical Tab（侧边）
- 容器 flexDirection: column
- TabIndicator 改竖线：left: 0 / width: 2px / height: var

---

## 5. 与 interaction 的接口

interaction 阶段已写：
- `state.view.activeMode: 'code' | 'password'`（或 activeTab / selectedKey 等）
- click 事件：`{ kind: 'state.set', path: 'view.activeMode', value: 'code' }`

design 阶段不动以上，只新增 TabIndicator 节点 + 各 button 的 `active` visualState（带 activeWhen 表达式扫 state.view.activeMode）。

⚠️ 如果 interaction 没暴露 activeMode 字段 → 走 UpstreamChallenge 让 interaction 补 state.view 字段定义。

---

## 6. 对账信号

`query/visual_state_distinctness { nodeId: 'CodeModeBtn', stateName: 'active' }`：

```
expected: ≥ 2 distinct override
actual: 2 (color + fontWeight) ✅
```

`query/visual_recognition_audit { nodeId: 'ModeToggle', role: '工具-切换' }`：

```
expected minSignals: ≥ 2
actual: 3 (字色 + 字重 + indicator) ✅
```

---

## 7. md 落地

```markdown
## ModeToggle 复合控件落库（参考 recipes/compositions/tab-segment.md）

### 当前状态
- ModeToggle (n40) 容器有 borderBottom，但 children CodeModeBtn / PasswordModeBtn 字色一样，无 active 视觉 ❌

### 重构方案
1. style/update CodeModeBtn / PasswordModeBtn：删 borderRadius:0（保留 transparent）
2. visual_state/add CodeModeBtn.active（activeWhen: state.view.activeMode === 'code'，styles: color textPrimary + fontWeight 700）
3. visual_state/add PasswordModeBtn.active（同，'password'）
4. element/add TabIndicator（postion absolute / bottom -1 / 2px primary 移动指示条）
5. visual_state/add TabIndicator.code-active / .password-active（transform translateX 切换）

### 自审
- 切 activeMode='code' 截图：CodeBtn 字加深加粗 + indicator 在左侧 ✅
- 切 activeMode='password' 截图：PasswordBtn 字加深加粗 + indicator 滑到右侧 ✅
- transition 200ms 平滑 ✅
```

---

## 8. 红线

- ❌ 仅静态 borderBottom 容器、子 tab 字色相同 → R-RECOG-01（登录页当前问题）
- ❌ active 仅靠 hover 区分（用户不 hover 时不知道）
- ❌ TabIndicator 无 transition → 切换瞬间跳变
- ❌ 字色 vs 字重 vs indicator 三选一仍 < 2 信号
- ❌ activeWhen 表达式拼写错误（如 `activeMode == 'code'` 单等于号）
