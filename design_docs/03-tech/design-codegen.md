# design-codegen — 跨平台代码生成

> **包名：** `@globallink/design-codegen` · **模板：** `features/lib-sdk` · **运行环境：** node
>
> **核心理念：Schema 是 "UI 的中间表示（IR）"，Codegen 是翻译器。每个目标平台一个插件。**
>
> 相关文档：[整体架构](./architecture.md) | [design-schema](./design-schema.md) | [design-operations](./design-operations.md)

---

## 代码生成管线

```
                    ┌→ ReactCodegen    → JSX + CSS Modules / Tailwind
                    │
Schema (UI IR) ─────┼→ VueCodegen      → SFC (.vue) + <style scoped>
                    │
                    ┼→ FlutterCodegen   → Dart Widget Tree + ThemeData
                    │
                    ├→ RNCodegen        → React Native + StyleSheet
                    │
                    └→ HTMLCodegen      → 纯 HTML + CSS（静态页面）
```

---

## CodegenPlugin 接口

```typescript
interface CodegenPlugin {
  name: string;                    // "react" | "vue" | "flutter" | "react-native" | "html"
  displayName: string;             // "React (TypeScript)"
  fileExtension: string;           // ".tsx" | ".vue" | ".dart"

  // 核心翻译方法
  generateComponent(node: ComponentNode, children: string[]): string;
  generateStyles(styles: CSSProperties): string;
  generateEvent(event: ComponentEvent): string;
  generateScreen(screen: Screen): GeneratedFile[];
  generateProject(project: DesignProject): GeneratedFile[];

  // 组件映射表：Schema 组件名 → 目标平台组件
  componentMap: Record<string, ComponentMapping>;
}

interface ComponentMapping {
  // 原子元素映射
  // "div" → React: <div>, Vue: <div>, Flutter: Container(), RN: <View>
  // "button" → React: <button>, Flutter: ElevatedButton(), RN: <TouchableOpacity>
  import?: string;                 // 需要的 import 语句
  tag: string;                     // 目标平台的组件/标签名
  propsTransform?: (props: Record<string, any>) => Record<string, any>;
}

interface GeneratedFile {
  path: string;                    // "src/screens/LoginScreen.tsx"
  content: string;                 // 文件内容
}
```

---

## StyleTranslator

```typescript
// CSS Properties → 目标平台样式语法
interface StyleTranslator {
  // CSS → Flutter
  // { backgroundColor: "#1890ff", borderRadius: 8, padding: 16 }
  // → BoxDecoration(color: Color(0xFF1890FF), borderRadius: BorderRadius.circular(8))
  //   + EdgeInsets.all(16)

  // CSS → React Native
  // { backgroundColor: "#1890ff", borderRadius: 8 }
  // → StyleSheet.create({ container: { backgroundColor: '#1890ff', borderRadius: 8 } })

  translate(styles: CSSProperties): string;
}
```

---

## CodegenManager

```typescript
class CodegenManager {
  // 注册插件
  registerPlugin(plugin: CodegenPlugin): void;

  // 列出所有可用目标
  listTargets(): { name: string; displayName: string }[];

  // 生成代码
  generate(project: DesignProject, target: string, options?: CodegenOptions): GeneratedFile[];
}

interface CodegenOptions {
  componentLibrary?: string;       // "antd" | "element-ui" | "material" | "none"
  styleStrategy?: "css-modules" | "tailwind" | "styled-components" | "inline";
  typescript?: boolean;
  projectTemplate?: string;        // 使用哪个项目脚手架模板
}
```

---

## CSS 跨平台映射表

Schema 能翻译到任何平台，关键在于样式层的抽象正确——CSS 属性是所有 UI 框架的"最大公约数"：

```
Schema 中的 CSS 属性:              各平台的等价表达:
──────────────────────────         ──────────────────────
flexDirection: "row"          →    Row() (Flutter) / flexDirection:'row' (RN)
gap: 8                        →    spacing: 8 (Flutter) / gap:8 (RN 0.71+)
backgroundColor: "#1890ff"    →    Color(0xFF1890FF) (Flutter)
borderRadius: 8               →    BorderRadius.circular(8) (Flutter)
fontSize: 16                  →    TextStyle(fontSize:16) (Flutter)
padding: "16px"               →    EdgeInsets.all(16) (Flutter)
```

CSS 的布局模型（Flexbox）和视觉属性，是所有 UI 框架的"最大公约数"——每个属性都有明确的跨平台映射。这就是为什么选择 CSS 作为 Schema 的样式语言是正确的。

---

**运行环境说明：** 代码生成主要在后端执行（文件 I/O 密集），但核心翻译逻辑也可在浏览器端预览。
