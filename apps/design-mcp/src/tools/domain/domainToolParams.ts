/**
 * MCP 领域工具 handler 入参：`registerDomainTool` 在校验后剥离 `action`，将余下字段传入 handler。
 * 字段集合随 action 变化，由各 action 的 Zod `schema` 保证合法性；此处用宽松类型承接。
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DomainToolParams = any;
