export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

export interface LoggerOptions {
  level?: LogLevel;
  namespace?: string;
}

export class Logger {
  private readonly level: LogLevel;
  private readonly namespace?: string;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.Info;
    this.namespace = options.namespace;
  }

  private shouldLog(level: LogLevel): boolean {
    const order: LogLevel[] = [LogLevel.Debug, LogLevel.Info, LogLevel.Warn, LogLevel.Error];
    return order.indexOf(level) >= order.indexOf(this.level);
  }

  private prefix(): string {
    return this.namespace ? `[${this.namespace}]` : '';
  }

  debug(...args: unknown[]) {
    if (this.shouldLog(LogLevel.Debug)) console.debug(this.prefix(), ...args);
  }
  info(...args: unknown[]) {
    if (this.shouldLog(LogLevel.Info)) console.info(this.prefix(), ...args);
  }
  warn(...args: unknown[]) {
    if (this.shouldLog(LogLevel.Warn)) console.warn(this.prefix(), ...args);
  }
  error(...args: unknown[]) {
    if (this.shouldLog(LogLevel.Error)) console.error(this.prefix(), ...args);
  }
}

export function createLogger(options?: LoggerOptions) {
  return new Logger(options);
}
