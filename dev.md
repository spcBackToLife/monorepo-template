# TODO

[] 处理 features 的全局引用路径
[] 处理所有项目的 eslint、prettier 等
[] 启动 app 热更新：packages 和 features 变更
[] 处理 packages 的发布
[] 更新项目结构文档
[] packages 项目生成脚手架？ui、sdk、app

# monorepo 中的依赖与开发

`apps/h5-mobile` 依赖 `packages/ui-sdk-demo`

- 在 ui-sdk-demo 执行：pnpm run watch
- 在 `apps/h5-mobile` 中引用包：`"@sass/ui-sdk-demo": "workspace:*"`
- 启动 `apps/h5-mobile`，改动 `ui-sdk-demo` 后，即可自动更新内容
