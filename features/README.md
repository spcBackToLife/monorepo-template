features 私有源码包约定

- 所有 features/\* 包默认 private: true，不发布到 npm。
- apps 通过 TS/Vite alias 直接引用源码：`@features/<pkg>/...`。
- 每个包推荐结构：

```
features/
  some-feature/
    package.json
    src/
      index.ts
```

- package.json 关键字段：
  - name: @globallink/some-feature（仅作 workspace 识别）
  - private: true
  - main/module/types 指向 src/index.ts

示例：参考 `_template`。
