# 模板：E-handover（交付报告）★

> 拷贝本骨架到 `analysis-notes/<projectId>/executor/global/handover.md`
> 这是 executor 阶段的最后一份 md——也是交给用户验收的报告。

```markdown
> 这份是【过程留痕】，最终契约以 schema 为准。
> 对应任务：E-handover
> 对应 schema 字段：标 E-handover 任务 done

## 1. 项目信息

- 项目名：___________
- projectId：___________
- 项目链接：___________ （design-api 项目 URL）
- 主题风格：___________ （来自 project.meta.styleDirection.summary）
- 屏幕数：___ 个
- 全局 overlays：___ 个

## 2. 视觉成果（一句话总结）

> "___________"

例：
> "校园社交登录页：温暖治愈 + 粉色暖白主调 + 有机装饰 + 圆角 organic + spring 动效，
>  跨 5 屏视觉系统统一，全屏 token 引用率 98%，integrity 0 error。"

## 3. 屏幕清单与截图

| 屏 | 名称 | 截图 URL（首屏）| 截图 URL（全页 frame）|
|----|------|----------------|---------------------|
| 00-login | 登录页 | [URL] | [URL] |
| 01-register | 注册页 | [URL] | [URL] |
| 02-forgot | 忘记密码 | [URL] | [URL] |
| 03-home | 首页 | [URL] | [URL] |
| 04-settings | 设置 | [URL] | [URL] |

## 4. 全局 overlays（如有）

| overlay | 类型 | 触发条件 | 截图 URL |
|---------|------|---------|---------|
| OfflineBanner | banner | network.status=='offline' | [URL] |
| SessionExpiredModal | modal | session.status=='expired' | [URL] |
| AppUpdateModal | modal | env.hasNewVersion | [URL] |
| ErrorBoundary | custom | errorBoundary.crashed | [URL] |

## 5. 衍生视图态截图（关键状态）

| 屏 / 衍生态 | 截图 URL |
|-----------|---------|
| 00-login / loading | [URL] |
| 00-login / error | [URL] |
| 00-login / locked Sheet | [URL] |
| 01-home / empty | [URL] |
| 03-orderDetail / 订单各状态分支 | [URLs] |

## 6. 设计系统摘要

- ThemeConfig：[N] 个色彩 / [N] 个字号 / [N] 个间距 / [N] 个圆角
- 通用组件模板：[N] 个（PhoneInput / FormCard / BrandLogo / ...）
- token 引用率：___ %
- 视觉权重均衡：跨屏总权重 [范围]，无断层
- 装饰风格：[有机 + 光效] 跨屏统一

## 7. integrity 报告摘要

```
✅ 0 error
⚠️ X warnings（不阻塞，列出）：
  - W1: ...
  - W2: ...
✅ 所有屏 phase = "verified"
✅ 所有 plan 任务 status ∈ {done, skipped}
```

## 8. 已知 / 待办

### 已知问题（与用户确认接受）
- ___________（如"02-forgot 屏 SubmitBtn 在 24px 间距下视觉偏紧，已与设计师确认接受"）

### 后续优化建议（不在本期）
- ___________（如"考虑加 onboarding 引导动画"）

## 9. 维护说明

- 改样式：直接 style/update（如设计意图未变）
- 改素材：再调 material-painter 局部
- 改交互：退回 interaction-designer
- 改产品：退回 product-analyst
- 主题切换 / 升级：theme-generator 改 token，所有 styles 自动跟变（除 PNG 素材需重画）

## 10. 用户验收

请用户检查：
- [ ] 项目链接可访问
- [ ] 各屏视觉符合预期
- [ ] 关键交互流程跑通（登录 / 注册 / 忘记密码 / ...）
- [ ] 全局 overlays 触发正常
- [ ] 衍生视图态显示正确

如有反馈 → 单点修（不重跑整个 executor）

## 11. ★ 沉淀到 schema 的结论

```jsonc
// 标 E-handover done
update_plan_task {
  taskId: "E-handover",
  patch: {
    status: "done",
    notes: "md: executor/global/handover.md ; 项目交付完成"
  }
}

// 项目级 meta 写最终交付状态
meta/set_project {
  projectId,
  patch: {
    designSystem: {
      finalHandover: {
        deliveredAt: "<ISO>",
        screenCount: <N>,
        overlayCount: <N>,
        tokenCoverage: 0.98,
        integrityZero: true,
        notes: "项目交付完成，等待用户验收"
      }
    }
  }
}
```

## 12. 红线

- ❌ 缺截图集 / 不全（部分屏没截图）→ 验收无依据
- ❌ integrity 还有 error 就交付 → 必须先修
- ❌ 视觉成果总结空话 → 失去验收价值
- ❌ 没说明改动路径（用户不知道后续怎么维护）
```
