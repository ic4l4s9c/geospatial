/**
 * Logger module compatible with RFC 5424 "The Syslog Protocol" severity levels.
 *
 * Defines the eight severity levels specified in RFC 5424 (Section 6.2.1, Table 2),
 * ordered from most severe (0 - Emergency) to least severe (7 - Debug).
 * Lower numerical values indicate higher severity; messages with a severity
 * numerically less than or equal to the configured level are emitted.
 *
 * @see {@link https://tools.ietf.org/html/rfc5424#section-6.2.1 | RFC 5424 §6.2.1 - PRI}
 *
 * Severity mapping (RFC 5424 Table 2):
 *
 * | Code | Level      | Description                            |
 * |------|------------|----------------------------------------|
 * | 0    | EMERGENCY  | System is unusable                     |
 * | 1    | ALERT      | Action must be taken immediately       |
 * | 2    | CRITICAL   | Critical conditions                    |
 * | 3    | ERROR      | Error conditions                       |
 * | 4    | WARNING    | Warning conditions                     |
 * | 5    | NOTICE     | Normal but significant condition       |
 * | 6    | INFO       | Informational messages                 |
 * | 7    | DEBUG      | Debug-level messages                   |
 */
import { v, type Infer } from "convex/values";

/**
 * Convex validator for RFC 5424 syslog severity levels.
 *
 * Each literal corresponds to a severity value defined in RFC 5424 §6.2.1:
 * - `"EMERGENCY"` — Severity 0: system is unusable
 * - `"ALERT"` — Severity 1: action must be taken immediately
 * - `"CRITICAL"` — Severity 2: critical conditions
 * - `"ERROR"` — Severity 3: error conditions
 * - `"WARNING"` — Severity 4: warning conditions
 * - `"NOTICE"` — Severity 5: normal but significant condition
 * - `"INFO"` — Severity 6: informational messages
 * - `"DEBUG"` — Severity 7: debug-level messages
 *
 * @see {@link https://tools.ietf.org/html/rfc5424#section-6.2.1 | RFC 5424 §6.2.1}
 */
export const logLevel = v.union(
  v.literal("EMERGENCY"),
  v.literal("ALERT"),
  v.literal("CRITICAL"),
  v.literal("ERROR"),
  v.literal("WARNING"),
  v.literal("NOTICE"),
  v.literal("INFO"),
  v.literal("DEBUG"),
);
export type LogLevel = Infer<typeof logLevel>;

/**
 * Logger interface providing methods for each RFC 5424 severity level,
 * plus timing utilities.
 *
 * Each severity method logs its arguments when the logger's configured
 * level permits it. Severity methods map to `console` methods as follows:
 * - EMERGENCY, ALERT, CRITICAL, ERROR → `console.error`
 * - WARNING → `console.warn`
 * - NOTICE, INFO → `console.info`
 * - DEBUG → `console.debug`
 *
 * `time` and `timeEnd` are enabled when the configured level is INFO (6) or above.
 *
 * @see {@link https://tools.ietf.org/html/rfc5424#section-6.2.1 | RFC 5424 §6.2.1}
 */
export type Logger = {
  /** Severity 0 — System is unusable. Outputs via `console.error`. */
  emergency: (...args: unknown[]) => void;
  /** Severity 1 — Action must be taken immediately. Outputs via `console.error`. */
  alert: (...args: unknown[]) => void;
  /** Severity 2 — Critical conditions. Outputs via `console.error`. */
  critical: (...args: unknown[]) => void;
  /** Severity 3 — Error conditions. Outputs via `console.error`. */
  error: (...args: unknown[]) => void;
  /** Severity 4 — Warning conditions. Outputs via `console.warn`. */
  warn: (...args: unknown[]) => void;
  /** Severity 5 — Normal but significant condition. Outputs via `console.info`. */
  notice: (...args: unknown[]) => void;
  /** Severity 6 — Informational messages. Outputs via `console.info`. */
  info: (...args: unknown[]) => void;
  /** Severity 7 — Debug-level messages. Outputs via `console.debug`. */
  debug: (...args: unknown[]) => void;
  /** Starts a timer labeled `label`. Active when configured level is INFO (6) or DEBUG (7). */
  time: (label?: string) => void;
  /** Ends a timer labeled `label`. Active when configured level is INFO (6) or DEBUG (7). */
  timeEnd: (label?: string) => void;
};

/**
 * RFC 5424 severity levels ordered from most severe (0) to least severe (7).
 *
 * The array index corresponds to the numerical Severity code defined in
 * RFC 5424 §6.2.1, Table 2. This ordering is used by {@link createLogger}
 * to determine whether a message at a given severity should be emitted:
 * a message is logged when its numerical severity is less than or equal to
 * the configured level's index.
 *
 * @see {@link https://tools.ietf.org/html/rfc5424#section-6.2.1 | RFC 5424 §6.2.1}
 */
export const LOG_LEVELS: string[] = [
  "EMERGENCY",
  "ALERT",
  "CRITICAL",
  "ERROR",
  "WARNING",
  "NOTICE",
  "INFO",
  "DEBUG",
] satisfies LogLevel[];

/**
 * Numerical severity codes per RFC 5424 §6.2.1, Table 2.
 * @internal
 */
export const SEVERITY = {
  EMERGENCY: 0,
  ALERT: 1,
  CRITICAL: 2,
  ERROR: 3,
  WARNING: 4,
  NOTICE: 5,
  INFO: 6,
  DEBUG: 7,
} as const;

/**
 * Creates a {@link Logger} that filters messages based on the given RFC 5424
 * severity level.
 *
 * Only messages with a severity numerically less than or equal to `level`
 * (per RFC 5424 Table 2) are emitted. For example, passing `"WARNING"`
 * (severity 4) will emit EMERGENCY, ALERT, CRITICAL, ERROR, and WARNING
 * messages, but suppress NOTICE, INFO, and DEBUG.
 *
 * @param level - The minimum RFC 5424 severity to log. Lower values are more
 *   severe; higher values are more permissive.
 * @returns A {@link Logger} instance that filters by the given severity.
 * @throws {Error} If `level` is not a valid RFC 5424 severity.
 *
 * @see {@link https://tools.ietf.org/html/rfc5424#section-6.2.1 | RFC 5424 §6.2.1}
 *
 * @example
 * ```ts
 * const log = createLogger("WARNING");
 * log.emergency("disk failure"); // [x] printed (0 <= 4)
 * log.warning("high latency");   // [x] printed (4 <= 4)
 * log.info("request served");    // [ ] suppressed (6 > 4)
 * log.debug("payload", data);    // [ ] suppressed (7 > 4)
 * ```
 */
export function createLogger(level: LogLevel): Logger {
  const levelIndex = LOG_LEVELS.indexOf(level);
  if (levelIndex === -1) {
    throw new Error(`Invalid log level: ${level}`);
  }
  return {
    emergency: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.EMERGENCY) {
        console.error(...args);
      }
    },
    alert: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.ALERT) {
        console.error(...args);
      }
    },
    critical: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.CRITICAL) {
        console.error(...args);
      }
    },
    error: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.ERROR) {
        console.error(...args);
      }
    },
    warn: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.WARNING) {
        console.warn(...args);
      }
    },
    notice: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.NOTICE) {
        console.info(...args);
      }
    },
    info: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.INFO) {
        console.info(...args);
      }
    },
    debug: (...args: unknown[]) => {
      if (levelIndex >= SEVERITY.DEBUG) {
        console.debug(...args);
      }
    },
    time: (label?: string) => {
      if (levelIndex >= SEVERITY.INFO) {
        console.time(label);
      }
    },
    timeEnd: (label?: string) => {
      if (levelIndex >= SEVERITY.INFO) {
        console.timeEnd(label);
      }
    },
  };
}
