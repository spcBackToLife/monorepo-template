# 00-auth-face · 人脸核身 · 交互规格

> **产品来源**：`product-analysis/modules/M5-user-auth.md#b1-注册主线-happy-path`
> **全局规范**：`interaction-design/overview.md`
> **关键约束**：不允许暂存退出（中途退出需重走）

---

## 状态机

### States

| State | 含义 |
|------|------|
| `idle` | 默认：引导卡 + 「开始检测」按钮 |
| `permission-asking` | 申请相机权限 |
| `permission-denied` | 权限被拒 |
| `initializing` | 相机初始化（1s 内）|
| `action:eye-blink` | 指令"请眨眼" |
| `action:mouth-open` | 指令"请张嘴" |
| `action:shake-head` | 指令"请轻轻摇头" |
| `comparing` | 全部动作完成，后端比对中 |
| `success` | 比对通过 |
| `error:lighting` | 实时反馈：光线不足 |
| `error:angle` | 实时反馈：角度不对 |
| `error:multiple-faces` | 检测到多张脸 |
| `error:liveness` | 活体动作未通过（单次） |
| `error:no-match` | 与学信网/学生证人脸不匹配 |
| `error:max-retries` | 累计 3 次失败 → 转人工审核 |

### Transitions

```
idle → permission-asking:    点击「开始检测」
permission-asking → initializing: 授权
permission-asking → permission-denied: 拒绝
initializing → action:eye-blink: 相机就绪
action:eye-blink → action:mouth-open: 检测通过
action:mouth-open → action:shake-head: 检测通过
action:shake-head → comparing: 全部完成
comparing → success: 比对通过
comparing → error:no-match: 与已采集人脸不一致
action:* → error:lighting/angle/multiple-faces: 实时检测异常（不计入失败次数）
action:* → error:liveness: 单个动作判定失败
error:liveness × 3 → error:max-retries: 累计 3 次
error:lighting/angle/multiple-faces → action:*: 异常恢复后自动继续（不重新开始）
success → routed: push 00-auth-status
```

### Effects

| 转换 | UI |
|-----|----|
| → initializing | 全屏相机预览 + 椭圆引导框 + 文案「将脸部对准框内」|
| → action:* | 顶部大字指令「请眨眼」+ icon 动画 + 倒计时 5s |
| → error:lighting/angle/multiple-faces | 顶部 Toast 实时浮提示（如「光线太暗，请到亮处」），1.5s 后自动消失或异常持续显示 |
| → error:liveness | 全屏遮罩「未检测到动作 (1/3)」 + 「再试一次」按钮 |
| → error:max-retries | 全屏占位「检测多次失败，请提交手持证件视频」+ 「上传视频」按钮 |
| → comparing | 全屏「正在比对…」+ AI 扫描动画（粒子环绕脸部）|
| → success | ✓ 动画 + 触觉 success + 1s 后跳转 |

---

## 操作清单

| # | 操作 | 触发 | 前置 | 反馈 | 失败 | 边界 |
|---|------|------|-----|------|------|------|
| 1 | 返回 | click `app-bar/back-btn` | — | scale | L4 Modal「退出将重走完整流程，是否退出?」| 确认退出回 xuexin | 警告 |
| 2 | 点击开始检测 | click `start-btn` | idle | press + 触觉 light | 进 permission-asking | 拒绝→permission-denied | — |
| 3 | 完成活体动作 | 检测 `face-camera/preview` 帧 | action:* | 动作图标实时跟随 | 单动作失败→error:liveness | 自动检测，无 user click |
| 4 | 再试一次 | click `error-card/retry-btn` | error:liveness | press | 回到当前 action 阶段 | 累计 3 次失败→error:max-retries | — |
| 5 | 上传手持视频（人工审核）| click `error-card/upload-video-btn` | error:max-retries / error:no-match | press | 唤起视频拍摄/相册 | 视频 ≥30s 否则 Toast「请录制至少 5s」 | 文件 ≤50MB |
| 6 | 去设置（权限）| click `permission-denied-card/settings-btn` | permission-denied | press | 跳系统设置 | — | 回来重新检测权限 |

---

## 加载策略

- 相机初始化：< 1s 占位（黑屏 + spinner）
- 比对中：全屏动画（L5），最长 10s 后超时
- 上传视频：进度条（0-100%）

---

## 错误处理

| 错误 | UI |
|------|----|
| 光线/角度/多脸 | 实时小提示，不打断流程 |
| 单动作失败 | error:liveness 全屏 + 重试 |
| 3 次失败 | error:max-retries 全屏 + 上传视频路径 |
| 与已采集人脸不匹配 | error:no-match L4 Modal「未通过人脸比对」+ 上传视频 / 联系客服 |
| 比对接口超时 | Toast「网络异常」+ 重试 |
| 权限拒绝 | L5 占位 + 去设置 |

---

## 边界情况

- 用户切到后台 → 释放相机；返回 → 重新初始化
- 系统通知/电话打断 → 暂停当前动作 + 恢复后继续
- 设备无前置相机 → idle 阶段直接显示「设备不支持」+ 联系客服
- 用户戴口罩/眼镜 → 提示「请取下口罩」（眼镜可保留）
- 中途网络断开 → 比对阶段失败 → 自动重试 1 次

---

## 节点骨架

```
00-auth-face/
├── _page.json
├── app-bar/
│   ├── _component.json
│   └── back-btn.json
├── info-card/
│   ├── _component.json             (引导：为什么 + 注意事项 + 隐私说明)
│   └── help-btn.json           (展开/收起)
├── start-btn.json
├── face-camera/
│   ├── _component.json
│   ├── preview.json            (实时预览，trigger=onFrame 活体检测)
│   ├── guide-frame.json        (椭圆引导框，纯展示但作为独立 element)
│   ├── hint-text.json          (顶部指令文案 + 实时异常提示，纯展示)
│   └── action-icon.json        (动作图标动画)
├── error-card/
│   ├── _component.json             (component: liveness/no-match/max-retries 的占位)
│   ├── retry-btn.json
│   └── upload-video-btn.json
└── permission-denied-card/
    ├── _component.json
    └── settings-btn.json
```

通用组件：`ConfirmDialog`、`Toast`、`EmptyState`

---

## 产品需求覆盖

- ✅ 规则 1 (动作指令 + 活体) → action:eye-blink/mouth-open/shake-head 三态
- ✅ 规则 2 (3 次失败转人工审核) → error:max-retries + 操作 #5
- ✅ 规则 3 (光线/角度实时提示) → error:lighting/angle/multiple-faces 浮提示
- ✅ 规则 4 (6 个月清理原图，保留特征) → 服务端处理
- ✅ 规则 5 (不允许暂存退出) → 操作 #1 退出 Modal 警告
