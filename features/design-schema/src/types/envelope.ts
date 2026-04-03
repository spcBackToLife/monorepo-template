/** Wrapper around an Operation with metadata for sync/collaboration */
export interface OperationEnvelope {
  /** Server-assigned unique ID */
  id: string;
  /** Client-generated UUID for echo deduplication */
  fingerprint: string;
  /** The actual operation */
  operation: unknown; // We use unknown here to avoid circular dep with design-operations
  /** Who initiated this operation */
  author: 'user' | 'ai';
  /** Author identifier (user ID or AI session ID) */
  authorId?: string;
  /** Server-assigned monotonic sequence number */
  seq?: number;
  /** ISO 8601 timestamp */
  timestamp: string;
}
