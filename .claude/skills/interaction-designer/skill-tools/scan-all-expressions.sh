#!/usr/bin/env bash
# scan-all-expressions.sh — 扫描一个屏的所有 expression 出没位置
#
# 用法：
#   bash scan-all-expressions.sh <schemaFile.json>
#
# 设计哲学：AI 是 stateless 的，每次进 Phase 2 不会"记得自己上次写了什么"。
# 这个脚本把整屏所有含 {{...}} 的字段拉出来，输出 7 个分类视图，
# AI 拿这表对照决策（特别是表达式形式重写时不漏字段）。
#
# 详见根因文档 EXPRESSION-LANG-ROOT-CAUSE-2026-05-31.md §6 F6
#
# 输出 7 段：
#   1. visibleWhen
#   2. bind.path
#   3. props 内含 {{ 的字段
#   4. events.actions 内表达式（state.set value / condition / logic.if when / logic.switch value/cases）
#   5. dataSources endpoint.body / params / mock.scenarios.responseBody 表达式
#   6. globalStateInit.view / stateInit.view defaultValue 内表达式（少见但可能）
#   7. ★ 已 deprecated 用法计数（按 spec.knownMigrations）
#
# 退出码：0 always（这是分析工具不是 lint 拒收，AI 自行判断）

set -e

SCHEMA="${1:-/dev/stdin}"

if [ ! -f "$SCHEMA" ] && [ "$SCHEMA" != "/dev/stdin" ]; then
  echo "Error: file not found: $SCHEMA" >&2
  echo "用法: bash scan-all-expressions.sh <schemaFile.json>" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq 未安装" >&2
  exit 1
fi

# ---------- 头部 ----------
echo "============================================================"
echo "  全 Expression 扫描报告"
echo "  schema: $SCHEMA"
echo "  生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"

# ---------- 1. visibleWhen ----------
echo ""
echo "─── 1. visibleWhen ───"
jq -r '
  [.. | objects | select(.visibleWhen != null) | "  \(.id // "?") \(.name // "?")  →  \(.visibleWhen)"] |
  if length == 0 then "  (none)" else .[] end
' "$SCHEMA"

# ---------- 2. bind.path ----------
echo ""
echo "─── 2. bind.path ───"
jq -r '
  [.. | objects | select(.bind != null) | "  \(.id // "?") \(.name // "?")  →  \(.bind.path)"] |
  if length == 0 then "  (none)" else .[] end
' "$SCHEMA"

# ---------- 3. props 含 {{ ----------
echo ""
echo "─── 3. props 含 expression ───"
jq -r '
  [.. | objects | select(.props != null and .id != null) |
    {id, name, exprProps: (.props | to_entries | map(select(.value | type=="string") | select(.value | tostring | contains("{{"))))} |
    select(.exprProps | length > 0) |
    "  \(.id) \(.name):\n" + (.exprProps | map("    .\(.key) = \(.value)") | join("\n"))
  ] |
  if length == 0 then "  (none)" else .[] end
' "$SCHEMA"

# ---------- 4. events 内表达式 ----------
echo ""
echo "─── 4. events.actions 内表达式 ───"
jq -r '
  [.. | objects | select(.events != null and .id != null) |
    {id, name, events: .events} |
    select(.events | length > 0) |
    "  \(.id) \(.name):" as $hdr |
    [$hdr] + (.events | map(
      "    [\(.trigger)]" +
      (if .condition.when then "\n      condition.when = \(.condition.when)" else "" end) +
      (if .actions then "\n      actions = " + (.actions | tostring | .[0:200]) + (if (.actions | tostring | length) > 200 then "…" else "" end) else "" end)
    ))
  ] | flatten | if length == 0 then "  (none)" else .[] end
' "$SCHEMA"

# ---------- 5. dataSources 表达式 ----------
echo ""
echo "─── 5. dataSources endpoint.body / params / mock.responseBody ───"
jq -r '
  [(.dataSources // (.. | .dataSources? | objects | values)) // [] | .. | objects |
    select(.endpoint != null or .params != null or .responseBody != null) |
    "  \(.id // .dataSourceId // "?")  endpoint.body=\(.endpoint.body // "n/a")  params=\(.params // "n/a")"
  ] | if length == 0 then "  (查不到 dataSources，可能 schema 顶层结构不同)" else .[] end
' "$SCHEMA" 2>/dev/null || echo "  (扫描失败，可能 schema 没 dataSources)"

# ---------- 6. stateInit defaultValue 含表达式（少见）----------
echo ""
echo "─── 6. stateInit.view defaultValue 含表达式（少见 / 应避免）───"
jq -r '
  [.. | objects | select(.defaultValue != null and (.defaultValue | tostring | contains("{{"))) |
    "  \(.name // "?")  defaultValue = \(.defaultValue | tostring | .[0:120])"
  ] | if length == 0 then "  (none — defaultValue 应该是字面量初值，不该含表达式)" else .[] end
' "$SCHEMA"

# ---------- 7. 已 deprecated 用法计数 ----------
echo ""
echo "─── 7. ★ 已 deprecated 用法计数（按 spec.knownMigrations）───"
DATE_NOW_COUNT=$(grep -o "Date\.now()" "$SCHEMA" 2>/dev/null | wc -l | tr -d ' ')
NEW_DATE_COUNT=$(grep -o "new Date" "$SCHEMA" 2>/dev/null | wc -l | tr -d ' ')
CASE_WHEN_COUNT=$(jq -r '[.. | objects | select(.cases != null) | .cases[] | select(.when != null and .match == null)] | length' "$SCHEMA" 2>/dev/null || echo 0)

echo "  Date.now()           : $DATE_NOW_COUNT  (期望 0; 替换为 \$.now())"
echo "  new Date()           : $NEW_DATE_COUNT  (期望 0; 替换为 \$.now())"
echo "  cases[].when         : $CASE_WHEN_COUNT  (期望 0; logic.switch case 字段是 match 不是 when)"

# ---------- 总结 ----------
echo ""
echo "─── 总结 ───"
TOTAL_DEPRECATED=$((DATE_NOW_COUNT + NEW_DATE_COUNT + CASE_WHEN_COUNT))
if [ "$TOTAL_DEPRECATED" -eq 0 ]; then
  echo "  ✓ 0 处 deprecated 用法，schema 符合 v1.0 规约"
else
  echo "  ⚠ 共 $TOTAL_DEPRECATED 处 deprecated 用法，建议按 expression-lang/spec.json knownMigrations 修复"
fi
echo ""
echo "  详细规约: features/design-expression/src/expression-lang/EXPR-LANG-SPEC.md"
echo "  已知迁移: features/design-expression/spec.json knownMigrations"
echo "============================================================"
