> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：M1-rules
> 对应 schema 字段：screen.meta.product.rules（4 类齐）

# Step C: 用户认证-登录（M1）— 业务规则（4 类齐全）★ 核心

> R-PRODUCT-01: rules ≥ 4 条，4 类各至少 1 条。
> R-PRODUCT-03: 业务状态机字段+枚举值必须显式写出。

## 推理过程

### 1. 候选规则池（穷举）

#### 数据规则候选

- [x] 手机号：11 位中国大陆号段，正则 `/^1[3-9]\d{9}$/`
- [x] 验证码：6 位纯数字
- [x] 密码：6-20 位，至少含字母 + 数字（不强制大小写 / 特殊字符）
- [x] `view.loginMode` ∈ { `'code'` | `'password'` }（默认 `'code'`）
- [x] `view.form.policy` ∈ { `true` | `false` }（默认 `false`）
- [ ] 邮箱注册——否决（用户用手机号习惯）
- [ ] 用户名/账号——否决（手机号即账号）

#### 业务规则候选

- [x] 登录方式互斥切换（同时只有一种）
- [x] 协议必勾才能提交
- [x] 失败状态机：`view.failureCount` 累加；累计 ≥ 5 触发 `view.lockedUntil = now() + 30min`
- [x] `view.lockedUntil > now()` 时：登录按钮 disabled + 显示"账号已锁定剩余 N 分钟"
- [x] `globalView.session.status === 'active'` 时：进入屏立即跳 `01-home`（避免重复登录）
- [x] 成功后写入 `globalView.session = { status:'active', token, user, expiresAt }`
- [x] 跳转目标：消费 `globalView.nav.authRedirectTo`（若有），否则 `01-home`
- [x] 验证码倒计时：`view.codeCountdown ∈ [0, 60]`，60 → 0 是唯一方向
- [ ] 密码强度评级（弱/中/强可视化）——否决（非 P0；保留极简登录页）
- [ ] 记住我（自动登录 30 天）——否决（本期不做长期 token；后续 interaction 评估）

#### 安全规则候选

- [x] 验证码同号 60s 冷却（`view.codeCountdown > 0` 时按钮 disabled）
- [x] 验证码当日同号 ≤ 10 次（后端限流，前端读 `LIMIT_EXCEEDED` 错误码兜底提示）
- [x] 密码错误累计 ≥ 5 次 → 锁定 30 分钟（前端 `failureCount + lockedUntil` + 后端兜底）
- [x] 协议未勾选不可提交（合规）
- [x] 离线（`globalView.network.status === 'offline'`）阻断提交
- [x] 短信通道失败不消耗当日额度（后端保证）
- [ ] 图形验证码前置——否决（本期不做；后续异常活动可叠加）
- [ ] 设备指纹绑定——否决（后端做，前端无感；不在产品阶段写）

#### 边界 Case 候选

- [x] 提交按钮 800ms 防抖（前端）
- [x] 进行中 fetch 时再次点击 → `view.submitting=true` 守卫忽略
- [x] `screenExit`（离开屏）→ `effect.cancel ds-login` + `ui.stopTimer codeCD`
- [x] 手机号超出 11 位 → 截断到 11 位（前端 input maxLength + JS 兜底）
- [x] 切后台 / 锁屏唤醒 → 前端不做特殊处理（系统 timer 自然冻结，恢复后倒计时差异由 onTick 自然校正）
- [x] `screenEnter` 时 session 已 active → 立即 `nav.go 01-home`（避免重复登录）
- [ ] 输入法切换 / 中文键盘卡顿——交给系统（不在产品阶段处理）

### 2. 多角度验证（关键阈值）

#### 验证："密码错 5 次锁 30 分钟"（取自 D5 决策）

| 维度 | 取 N=3, M=10 | **取 N=5, M=30** | 取 N=10, M=60 |
|------|-------------|------------------|---------------|
| 用户角度 | 严格但易误锁（手抖也锁）| ✅ 5 次容错对正常用户够；30min 惩罚不致无法找回 | 宽松但暴破风险高 |
| 商业角度 | 客诉多（找回流程压力大）| ✅ 平衡 | 安全事故多 |
| 技术角度 | failureCount + lockedUntil 两个 view 变量即可，成本一致 | 同左 | 同左 |
| 竞品角度 | 飞书 3 次 | ✅ 微信 5 次 / 钉钉 5 次（中位数）| 罕见 |

**最终选择 N=5, M=30**——竞品中位数 + 用户误锁率可接受。

#### 验证："验证码 60s 冷却"

| 维度 | 取 30s | **取 60s** | 取 120s |
|------|-------|-----------|---------|
| 用户角度 | 等得短，但易重复触发 | ✅ 短信延迟一般 5~10s，60s 留足等待空间 | 等太久，焦躁 |
| 商业角度 | 短信成本高（重复触发）| ✅ 短信成本可控 | 用户流失率高 |
| 技术角度 | 实现一致 | 一致 | 一致 |
| 竞品角度 | 罕见 | ✅ 微信/钉钉/飞书 60s（行业标准）| 部分银行 |

**最终选择 60s**——行业标准。

#### 验证："密码 6-20 位，含字母+数字"

| 维度 | 取 6-12 / 字母+数字 | **取 6-20 / 字母+数字** | 取 8-30 / 字母+数字+特殊符号 |
|------|--------|--------|--------|
| 用户角度 | 上限 12 位过短 | ✅ 大学生记忆友好 | 强制特殊符号易忘 |
| 商业角度 | - | - | 注册转化下降 |
| 技术角度 | bcrypt 哈希长度无差异 | 同 | 同 |
| 竞品角度 | 罕见 | ✅ 微信/QQ/小红书都接受 6-20 字母+数字 | 银行类 App |

**最终选择 6-20 字母+数字**——校园社交场景不必用银行级强度。

### 3. 替代方案与否决

| 候选 | 否决理由 |
|------|---------|
| 渐进锁定（1 次 1 分 / 3 次 5 分 / 5 次 30 分）| 复杂度收益比低；用户更怕"突然锁定"；保留单档 5 次 30min 简洁 |
| 人脸识别解锁 | 不接活体检测；产品价值不匹配 |
| 邮箱注册作为备选 | 大学生用手机号习惯；增加 UI 复杂度（多一个 tab）|
| 图形验证码前置 | 本期不做；只在被风控触发时才弹（后续增强）|
| "记住我" 30 天自动登录 | 本期 token 短期策略；后续 interaction 评估 |
| 密码强度可视化（弱/中/强）| 非 P0；保留极简登录页风格 |
| 短信验证码 4 位 | 6 位行业标准，安全性更高（防爆破） |

### 4. 业务状态机字段 ★ R-PRODUCT-03

本屏承载有状态业务对象（**会话 session + 失败计数 failureCount + 倒计时 codeCountdown**），必须显式写清：

#### 4.1 会话状态机（globalView.session）

```
状态字段：globalView.session.status
枚举值：  { 'anonymous'（占位 null 表示）| 'active' | 'expired' }
状态转换：
  - null/anonymous → active：登录成功（00-login Step 7 onSuccess 写入）
  - active → expired：token 过期（后续屏幕的 fetch 触发；本屏不写）
  - expired/active → null：用户主动登出（其他屏；本屏不写）
```

#### 4.2 提交状态机（view.submitting + effects.dsLogin.status 派生）

```
状态字段：view.submitting + state.effects.dsLogin.status
枚举值：  view.submitting ∈ { true | false }（默认 false）
        effects.dsLogin.status ∈ { 'idle' | 'pending' | 'success' | 'error' }（运行时由 effect.fetch 维护）
状态转换：
  - idle → submitting：用户点击 SubmitBtn 通过守卫
  - submitting → success：onSuccess 触发后置 actions（写 session + nav.go）
  - submitting → error：onError 触发分支（CREDENTIAL/LOCKED/LIMIT_EXCEEDED/5xx）
  - error → submitting：用户重试
  - * → idle：screenExit 触发 effect.cancel
```

#### 4.3 失败计数状态机（view.failureCount + view.lockedUntil）

```
状态字段：view.failureCount ∈ number（默认 0）
        view.lockedUntil ∈ { null | timestamp }（默认 null）
状态转换：
  - failureCount=N (N<5) → 凭证错 → failureCount=N+1
  - failureCount=4 → 凭证错 → failureCount=5 + lockedUntil=now()+30min（进入 locked）
  - locked + now > lockedUntil → 自动解锁（lockedUntil=null + failureCount=0）
  - 任意状态 → 登录成功 → failureCount=0 + lockedUntil=null
```

#### 4.4 验证码倒计时（view.codeCountdown）

```
状态字段：view.codeCountdown ∈ [0, 60]
状态转换：
  - 0 → 60：发送验证码成功（启动 ui.startTimer）
  - 60 → ... → 0：每秒 -1（onTick）
  - * → 0：screenExit（ui.stopTimer）
```

## 4 类规则收敛（最终落 schema 的版本）

把上面候选规则池的 ✅ 项浓缩成精简语句。schema 里 rules 控制在 8~10 条以内（既覆盖 4 类齐，又不过载）：

### 数据规则（≥ 1 条）
- **数据规则**: 手机号 `/^1[3-9]\d{9}$/` 11 位；验证码 6 位纯数字；密码 6-20 位含字母+数字；`view.loginMode ∈ {'code'|'password'}`（默认 'code'）；`view.form.policy ∈ {true|false}` 默认 false 必勾才能提交

### 业务规则（≥ 1 条；含状态机）
- **业务规则**: 登录成功写 `globalView.session = {status:'active', token, user, expiresAt}` 并消费 `globalView.nav.authRedirectTo` 跳回（无则跳 '01-home'）；进屏检测 `session.status === 'active'` 立即跳 '01-home' 避免重登
- **业务规则**: 失败状态机——`view.failureCount` 累加；连续 ≥5 触发 `view.lockedUntil = now()+30min` 进入锁定；`now() > lockedUntil` 自动解锁（`failureCount=0` + `lockedUntil=null`）；登录成功也清零

### 安全规则（≥ 1 条）
- **安全规则**: 验证码同号 60s 冷却（`view.codeCountdown > 0` 按钮 disabled）+ 当日 ≤10 次（后端 LIMIT_EXCEEDED 兜底）；密码错 ≥5 次锁 30 分钟；协议必勾才能提交（合规红线）；离线状态阻断提交（`globalView.network.status === 'offline'` 时按钮 disabled）

### 边界 Case（≥ 1 条）
- **边界 Case**: 提交 800ms 防抖 + `view.submitting` 守卫忽略重复点击；`screenExit` 触发 `effect.cancel ds-login` + `ui.stopTimer codeCD`；手机号 input maxLength=11 截断；网络切换由系统 timer 自然校正

---

## ★ 沉淀到 schema 的结论

```jsonc
// MCP: meta/set_screen
{
  projectId: "d84c140e-0437-4c80-a786-c1f389bcbb02",
  screenId: "sc_27ee2293945046b69cc00",
  patch: {
    product: {
      fromModules: ["M1", "M5", "M6"],
      rules: [
        "数据规则: 手机号 /^1[3-9]\\d{9}$/ 11 位；验证码 6 位纯数字；密码 6-20 位含字母+数字；view.loginMode ∈ {'code'|'password'}（默认 'code'）；view.form.policy ∈ {true|false}（默认 false 必勾才能提交）",
        "业务规则: 登录成功写 globalView.session = {status:'active',token,user,expiresAt} 并消费 globalView.nav.authRedirectTo 跳回（无则 nav.go '01-home'）；进屏 session.status === 'active' 立即跳 01-home 避免重登",
        "业务规则: 失败状态机——view.failureCount 累加；连续 ≥5 触发 view.lockedUntil = now()+30min 进入锁定；now() > lockedUntil 自动解锁（failureCount=0 + lockedUntil=null）；登录成功也清零",
        "业务规则: 验证码倒计时 view.codeCountdown ∈ [0,60]；发送成功 0→60 启动 ui.startTimer；每秒 -1；screenExit 时 stopTimer 归 0",
        "安全规则: 验证码同号 60s 冷却（view.codeCountdown>0 按钮 disabled）+ 当日 ≤10 次（后端 LIMIT_EXCEEDED 兜底提示）；密码错 ≥5 次锁 30 分钟；协议必勾才能提交（合规红线）；离线状态（globalView.network.status==='offline'）阻断提交",
        "边界 Case: 提交 800ms 防抖 + view.submitting 守卫忽略重复点击；screenExit 触发 effect.cancel ds-login + ui.stopTimer codeCD；PhoneInput maxLength=11 自动截断"
      ]
    }
  }
}
```

> 最终 6 条规则覆盖 4 类（数据×1 / 业务×3 / 安全×1 / 边界×1），全部状态机字段 + 枚举值显式列出，满足 R-PRODUCT-01 与 R-PRODUCT-03。
