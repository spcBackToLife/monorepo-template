export enum ErrorCode {
  Network = 'NETWORK_ERROR',
  Timeout = 'TIMEOUT',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',
  NotFound = 'NOT_FOUND',
  Server = 'SERVER_ERROR',
  BadRequest = 'BAD_REQUEST',
  Unknown = 'UNKNOWN',
}

export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status?: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
