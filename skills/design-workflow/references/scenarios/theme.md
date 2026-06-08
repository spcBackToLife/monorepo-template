# 场景：主题配置

## 何时使用

项目首次设计前，或需要切换/修改主题风格时。

## 核心概念

- **`theme-generator` 技能**：生成主题配置
- **`theme/check`**：检查主题是否已配置
- **`$token:`**：引用主题变量

## 操作步骤

### 步骤 1：检查主题状态

```javascript
theme / check → {
  projectId: "xxx"
}
```

### 步骤 2：如果未配置，调用 theme-generator

如果 `customized=false`：

```
停止设计！提示用户：
「项目尚未制定主题风格。请描述期望的风格（如"轻奢暗色科技风"、"清新自然风"），
我将调用 theme-generator 技能生成主题配置。」
```

### 步骤 3：使用主题变量

```javascript
// 在样式中使用
style / update → {
  nodeId: "<node-id>",
  styles: {
    backgroundColor: "$token:colors.primary",
    color: "$token:colors.onPrimary",
    padding: "$token:spacing.md",
    borderRadius: "$token:radius.md",
    fontSize: "$token:font.body.fontSize",
    boxShadow: "$token:shadow.md"
  }
}
```

## 主题变量清单

```markdown
## 颜色
- $token:colors.primary - 主色
- $token:colors.onPrimary - 主色上的文字色
- $token:colors.secondary - 辅助色
- $token:colors.surface - 表面色（卡片/弹窗背景）
- $token:colors.background - 页面背景色
- $token:colors.textPrimary - 主文字色
- $token:colors.textSecondary - 辅助文字色
- $token:colors.error - 错误色
- $token:colors.success - 成功色

## 间距
- $token:spacing.xs - 4px
- $token:spacing.sm - 8px
- $token:spacing.md - 16px
- $token:spacing.lg - 24px
- $token:spacing.xl - 32px
- $token:spacing.2xl - 48px
- $token:spacing.3xl - 64px

## 圆角
- $token:radius.sm - 4px
- $token:radius.md - 8px
- $token:radius.lg - 12px
- $token:radius.xl - 16px
- $token:radius.full - 9999px

## 字体
- $token:font.h1 - { fontSize: "32px", fontWeight: 700 }
- $token:font.h2 - { fontSize: "24px", fontWeight: 700 }
- $token:font.body - { fontSize: "16px", fontWeight: 400 }
- $token:font.caption - { fontSize: "14px", fontWeight: 400 }

## 阴影
- $token:shadow.sm - 0 1px 2px rgba(0,0,0,0.05)
- $token:shadow.md - 0 4px 6px rgba(0,0,0,0.1)
- $token:shadow.lg - 0 10px 15px rgba(0,0,0,0.1)
```

## 常见问题

### 问题 1：主题变量不生效

**原因**：
- theme 未配置
- token 路径错误

**解决**：
1. 先调用 theme/check 检查
2. 检查 token 路径是否正确

## 示例代码

完整示例见 `references/examples/login-page.md`（主题配置部分）。
