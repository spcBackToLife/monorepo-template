# 模板：E-global-snapshot（全局 overlay 跨屏截图核对）

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/global/snapshot.md`

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-global-snapshot
> 对应 schema 字段：核对类，无 schema 写入

## 1. 全局 overlay 显示场景核对

对每个 globalOverlay，模拟在不同屏上显示并截图：

### 场景 1：登录页 + offline-banner

```jsonc
state/view_set_preview { variable: 'globalView.network.status', value: 'offline' }
generate_snapshots { projectId, screenIds: ['00-login'] }
```
截图 URL：[URL]

核对：
- [ ] banner 在最顶部（不被 nav-bar / safe-area 遮）
- [ ] banner 色调（warning 橙）与登录页主调（粉色暖白）协调
- [ ] banner 不抢登录卡焦点
- [ ] WifiOffIcon 清晰可识别
- [ ] 重试按钮可见
- [ ] slideDown + fade 出入动画顺畅（如截图能反映）

### 场景 2：首页 + session-expired Modal

```jsonc
state/view_set_preview { variable: 'globalView.session.status', value: 'expired' }
generate_snapshots { projectId, screenIds: ['01-home'] }
```
截图 URL：[URL]

核对：
- [ ] Modal backdrop（rgba(0,0,0,0.5)）暗化首页内容（焦点转移）
- [ ] Modal 圆角 lg + 阴影 xl + 居中
- [ ] LockIcon 插画清晰
- [ ] "重新登录"按钮风格与全局 atom 按钮一致
- [ ] dismissible:false，无 X 关闭按钮

### 场景 3：error-boundary 在首页 + 设置页

```jsonc
state/view_set_preview { variable: 'globalView.errorBoundary.crashed', value: true }
generate_snapshots { projectId, screenIds: ['01-home', '04-settings'] }
```
截图 URLs：[URLs]

核对：
- [ ] 全屏遮罩在两屏一致
- [ ] ErrorIllustration 清晰、不刺眼
- [ ] "重启"按钮清晰
- [ ] 在两屏视觉表现一致

[更多场景...]

## 2. 跨 overlay 一致性核对

| 项 | 是否一致 |
|----|:-------:|
| Modal 出入动画（fade+scaleIn 300ms） | ✅ |
| BottomSheet 出入动画（slideUp 350ms） | N/A（无 BottomSheet）|
| Banner 出入动画（slideDown+fade 200ms） | ✅ |
| backdrop 透明度（关键决策 0.5）| ✅ |
| safe-area 适配 | ✅ |
| 内部 CTA 按钮风格 | ✅ |

## 3. 不一致项 + 路由

[列出不一致 + 退回对应 SKILL 处理]

## 4. ★ 沉淀到 schema 的结论

```jsonc
// 本任务以核对为主
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      globalOverlayExecutorVerified: true,
      verifiedAt: "<ISO>",
      notes: "全部 N 个 overlay 在 K 个屏上的并存场景核对通过"
    }
  }
}
```

## 5. 红线

- ❌ 不模拟 overlay 显示态就标 done → 漏验证
- ❌ 截图只看一屏不跨屏 → 失去"跨屏并存"意义
- ❌ 发现不一致不路由不退回 → 假完成
```
