/**
 * Shared semantic type aliases for opaque JSON payloads.
 *
 * These replace raw `Record<string, unknown>` throughout the codebase,
 * giving each usage site a name that communicates intent.
 */

/** Opaque canvas JSON blob from the material editor (Fabric.js state) */
export type CanvasJSON = Record<string, unknown>;

/** User-defined data scenario payload (arbitrary JSON the user provides) */
export type DataPayload = Record<string, unknown>;

/** Material editor preset configuration (gradients, shadows, etc.) */
export type MaterialPresetConfig = Record<string, unknown>;

/** Component asset schema — a serialized ComponentNode subtree */
export type ComponentAssetSchema = Record<string, unknown>;
