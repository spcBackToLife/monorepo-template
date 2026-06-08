# 状态机设计案例

## 案例 1: 登录页

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  idle ──(focus input)──→ inputting              │
│   ↑                        │    │              │
│   │                   (blur all) (input valid)  │
│   │                        │    ↓              │
│   └────────────────────────┘  ready            │
│                                 │              │
│                           (click login)        │
│                                 ↓              │
│                            submitting          │
│                           ↙        ↘          │
│                     success        error       │
│                       │              │         │
│                 (300ms delay)    (tap input)    │
│                       ↓              ↓         │
│                   [跳转主页]     inputting      │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 各状态的 UI 表现

| 状态 | 按钮 | 输入框 | 附加 UI |
|------|------|--------|---------|
| idle | 可点但灰色调 | 空白 + placeholder | — |
| inputting | 可点（主色） | 聚焦态（border 高亮） | 实时字数/格式提示 |
| ready | 可点（主色+微发光） | 正常 | — |
| submitting | spinner + 禁用 + "登录中" | 全部禁用 | — |
| success | ✓ + 绿色 | — | 全屏渐变遮罩 |
| error | 恢复正常 | 密码框清空+聚焦+红色border | 错误文字 shake 淡入 |

---

## 案例 2: Feed 列表页

```
States:
  loading      → 首次进入，骨架屏
  loaded       → 有数据，正常展示
  refreshing   → 下拉刷新中（保留旧数据）
  loading_more → 底部加载更多
  empty        → 无数据
  error        → 加载失败
  offline      → 断网

Transitions:
  [进入页面] → loading
  loading → loaded:    API 返回数据
  loading → empty:     API 返回空数组
  loading → error:     API 失败
  loaded → refreshing: 下拉触发
  refreshing → loaded: 刷新成功（替换数据）
  refreshing → loaded: 刷新失败（Toast + 保留旧数据）
  loaded → loading_more: 滚动到底部
  loading_more → loaded: 追加数据到列表
  [任意] → offline:  网络断开
  offline → loading:  网络恢复 + 自动重试
```

### 各状态的 UI 表现

| 状态 | 页面内容 | 顶部 | 底部 |
|------|---------|------|------|
| loading | 3-5 个骨架卡片 | — | — |
| loaded | 真实卡片列表 | 隐藏 | 加载更多触发区 |
| refreshing | 真实卡片（不清空） | Pull indicator spinning | — |
| loading_more | 真实卡片 | — | 底部 spinner |
| empty | 空态插画 + "还没有内容" + 发布按钮 | — | — |
| error | 错误插画 + "加载失败" + 重试按钮 | — | — |
| offline | 离线提示条(顶部固定) + 缓存内容(如有) | 黄色条 | — |

---

## 案例 3: 表单提交（注册）

```
States:
  editing       → 正在填写
  field_error   → 某字段校验失败
  all_valid     → 全部校验通过
  submitting    → 提交中
  server_error  → 服务端返回错误
  success       → 注册成功

Transitions:
  editing → field_error:  onBlur 校验失败
  field_error → editing:  修改该字段
  editing → all_valid:    所有字段校验通过
  all_valid → submitting: 点击注册
  submitting → success:   API 200
  submitting → server_error: API 错误
  server_error → editing: 修改字段
```

### 字段校验反馈时机

```
用户名:   onBlur 检查长度 + debounce 300ms 检查唯一性
手机号:   onChange 格式校验（11位数字）+ onBlur 格式完整性
密码:     onChange 强度指示器实时更新 + onBlur 最低强度检查
确认密码: onChange 与密码比对
验证码:   onChange 满6位自动提交
```

---

## 案例 4: 删除操作（不可逆）

```
触发 → L4 确认弹窗
  "确定删除？此操作不可撤销"
  [取消] [删除(红色, 3s倒计时后可点)]
    │
    ├── 点击取消 → 关闭弹窗，无变化
    └── 点击删除 → submitting
          ├── 成功 → 关闭弹窗 + 项目淡出 + Toast "已删除"
          └── 失败 → 关闭弹窗 + Toast "删除失败"
```

**倒计时设计**：高危操作的确认按钮在弹出后 3s 内不可点击，防误触。
