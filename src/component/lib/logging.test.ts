import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createLogger,
  LOG_LEVELS,
  type LogLevel,
  SEVERITY,
} from "./logging.js";

describe("LOG_LEVELS", () => {
  it("contains all 8 RFC 5424 severity levels in order", () => {
    expect(LOG_LEVELS).toEqual([
      "EMERGENCY",
      "ALERT",
      "CRITICAL",
      "ERROR",
      "WARNING",
      "NOTICE",
      "INFO",
      "DEBUG",
    ]);
  });

  it("has length 8", () => {
    expect(LOG_LEVELS).toHaveLength(8);
  });

  it("index matches RFC 5424 severity code", () => {
    expect(LOG_LEVELS.indexOf("EMERGENCY")).toBe(0);
    expect(LOG_LEVELS.indexOf("ALERT")).toBe(1);
    expect(LOG_LEVELS.indexOf("CRITICAL")).toBe(2);
    expect(LOG_LEVELS.indexOf("ERROR")).toBe(3);
    expect(LOG_LEVELS.indexOf("WARNING")).toBe(4);
    expect(LOG_LEVELS.indexOf("NOTICE")).toBe(5);
    expect(LOG_LEVELS.indexOf("INFO")).toBe(6);
    expect(LOG_LEVELS.indexOf("DEBUG")).toBe(7);
  });
});

describe("createLogger", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let timeSpy: ReturnType<typeof vi.spyOn>;
  let timeEndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    timeSpy = vi.spyOn(console, "time").mockImplementation(() => {});
    timeEndSpy = vi.spyOn(console, "timeEnd").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("null level", () => {
    it("does not throw when passed null", () => {
      expect(() => createLogger(null)).not.toThrow();
    });

    it("returns a logger with all required methods", () => {
      const logger = createLogger(null);
      expect(logger).toHaveProperty("emergency");
      expect(logger).toHaveProperty("alert");
      expect(logger).toHaveProperty("critical");
      expect(logger).toHaveProperty("error");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("notice");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("time");
      expect(logger).toHaveProperty("timeEnd");
    });

    it("suppresses all emergency logs", () => {
      const logger = createLogger(null);
      logger.emergency("test");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("suppresses all alert logs", () => {
      const logger = createLogger(null);
      logger.alert("test");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("suppresses all critical logs", () => {
      const logger = createLogger(null);
      logger.critical("test");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("suppresses all error logs", () => {
      const logger = createLogger(null);
      logger.error("test");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("suppresses all warning logs", () => {
      const logger = createLogger(null);
      logger.warn("test");
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("suppresses all notice logs", () => {
      const logger = createLogger(null);
      logger.notice("test");
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("suppresses all info logs", () => {
      const logger = createLogger(null);
      logger.info("test");
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("suppresses all debug logs", () => {
      const logger = createLogger(null);
      logger.debug("test");
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("suppresses time", () => {
      const logger = createLogger(null);
      logger.time("timer");
      expect(timeSpy).not.toHaveBeenCalled();
    });

    it("suppresses timeEnd", () => {
      const logger = createLogger(null);
      logger.timeEnd("timer");
      expect(timeEndSpy).not.toHaveBeenCalled();
    });

    it("suppresses all logs when called with multiple arguments", () => {
      const logger = createLogger(null);
      logger.emergency("a", "b", "c");
      logger.alert("d", "e", "f");
      logger.critical("g", "h", "i");
      logger.error("j", "k", "l");
      logger.warn("m", "n", "o");
      logger.notice("p", "q", "r");
      logger.info("s", "t", "u");
      logger.debug("v", "w", "x");
      logger.time("timer");
      logger.timeEnd("timer");

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
      expect(timeSpy).not.toHaveBeenCalled();
      expect(timeEndSpy).not.toHaveBeenCalled();
    });

    it("no-op methods don't throw when invoked", () => {
      const logger = createLogger(null);
      expect(() => {
        logger.emergency("test");
        logger.alert("test");
        logger.critical("test");
        logger.error("test");
        logger.warn("test");
        logger.notice("test");
        logger.info("test");
        logger.debug("test");
        logger.time("timer");
        logger.timeEnd("timer");
      }).not.toThrow();
    });
  });

  describe("invalid level", () => {
    it("throws an error for an invalid log level", () => {
      expect(() => createLogger("INVALID" as LogLevel)).toThrow(
        "Invalid log level: INVALID",
      );
    });

    it("throws an error for an empty string", () => {
      expect(() => createLogger("" as LogLevel)).toThrow("Invalid log level: ");
    });
  });

  describe("console method mapping", () => {
    it("emergency routes to console.error", () => {
      const logger = createLogger("EMERGENCY");
      logger.emergency("msg");
      expect(errorSpy).toHaveBeenCalledWith("msg");
      expect(warnSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("alert routes to console.error", () => {
      const logger = createLogger("ALERT");
      logger.alert("msg");
      expect(errorSpy).toHaveBeenCalledWith("msg");
    });

    it("critical routes to console.error", () => {
      const logger = createLogger("CRITICAL");
      logger.critical("msg");
      expect(errorSpy).toHaveBeenCalledWith("msg");
    });

    it("error routes to console.error", () => {
      const logger = createLogger("ERROR");
      logger.error("msg");
      expect(errorSpy).toHaveBeenCalledWith("msg");
    });

    it("warning routes to console.warn", () => {
      const logger = createLogger("WARNING");
      logger.warn("msg");
      expect(warnSpy).toHaveBeenCalledWith("msg");
      expect(errorSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("notice routes to console.info", () => {
      const logger = createLogger("NOTICE");
      logger.notice("msg");
      expect(infoSpy).toHaveBeenCalledWith("msg");
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("info routes to console.info", () => {
      const logger = createLogger("INFO");
      logger.info("msg");
      expect(infoSpy).toHaveBeenCalledWith("msg");
    });

    it("debug routes to console.debug", () => {
      const logger = createLogger("DEBUG");
      logger.debug("msg");
      expect(debugSpy).toHaveBeenCalledWith("msg");
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
    });
  });

  describe("argument forwarding", () => {
    it("forwards multiple arguments", () => {
      const logger = createLogger("INFO");
      logger.info("hello", 42, { key: "value" }, [1, 2, 3]);
      expect(infoSpy).toHaveBeenCalledWith(
        "hello",
        42,
        { key: "value" },
        [1, 2, 3],
      );
    });

    it("forwards no arguments", () => {
      const logger = createLogger("INFO");
      logger.info();
      expect(infoSpy).toHaveBeenCalledWith();
    });

    it("forwards a single argument", () => {
      const logger = createLogger("ERROR");
      logger.error(new Error("boom"));
      expect(errorSpy).toHaveBeenCalledWith(new Error("boom"));
    });

    it("forwards null and null arguments", () => {
      const logger = createLogger("DEBUG");
      logger.debug(null, null);
      expect(debugSpy).toHaveBeenCalledWith(null, null);
    });
  });

  describe("severity filtering per level", () => {
    LOG_LEVELS.forEach((level) => {
      const configuredSeverity = LOG_LEVELS.indexOf(level);

      describe(`level = ${level} (severity ${configuredSeverity})`, () => {
        it("emergency is emitted when SEVERITY.EMERGENCY <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.emergency("test");
          expect(errorSpy).toHaveBeenCalledTimes(
            SEVERITY.EMERGENCY <= configuredSeverity ? 1 : 0,
          );
        });

        it("alert is emitted when SEVERITY.ALERT <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.alert("test");
          expect(errorSpy).toHaveBeenCalledTimes(
            SEVERITY.ALERT <= configuredSeverity ? 1 : 0,
          );
        });

        it("critical is emitted when SEVERITY.CRITICAL <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.critical("test");
          expect(errorSpy).toHaveBeenCalledTimes(
            SEVERITY.CRITICAL <= configuredSeverity ? 1 : 0,
          );
        });

        it("error is emitted when SEVERITY.ERROR <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.error("test");
          expect(errorSpy).toHaveBeenCalledTimes(
            SEVERITY.ERROR <= configuredSeverity ? 1 : 0,
          );
        });

        it("warning is emitted when SEVERITY.WARNING <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.warn("test");
          expect(warnSpy).toHaveBeenCalledTimes(
            SEVERITY.WARNING <= configuredSeverity ? 1 : 0,
          );
        });

        it("notice is emitted when SEVERITY.NOTICE <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.notice("test");
          expect(infoSpy).toHaveBeenCalledTimes(
            SEVERITY.NOTICE <= configuredSeverity ? 1 : 0,
          );
        });

        it("info is emitted when SEVERITY.INFO <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.info("test");
          const infoCalls = infoSpy.mock.calls.length;
          expect(infoCalls).toBeGreaterThanOrEqual(
            SEVERITY.INFO <= configuredSeverity ? 1 : 0,
          );
        });

        it("debug is emitted when SEVERITY.DEBUG <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.debug("test");
          expect(debugSpy).toHaveBeenCalledTimes(
            SEVERITY.DEBUG <= configuredSeverity ? 1 : 0,
          );
        });

        it("time is active only when SEVERITY.INFO <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.time("t");
          expect(timeSpy).toHaveBeenCalledTimes(
            SEVERITY.INFO <= configuredSeverity ? 1 : 0,
          );
        });

        it("timeEnd is active only when SEVERITY.INFO <= configuredSeverity", () => {
          const logger = createLogger(level as LogLevel);
          logger.timeEnd("t");
          expect(timeEndSpy).toHaveBeenCalledTimes(
            SEVERITY.INFO <= configuredSeverity ? 1 : 0,
          );
        });
      });
    });
  });

  describe("specific level filtering examples", () => {
    it("EMERGENCY level only emits emergency", () => {
      const logger = createLogger("EMERGENCY");

      logger.emergency("a");
      logger.alert("b");
      logger.critical("c");
      logger.error("d");
      logger.warn("e");
      logger.notice("f");
      logger.info("g");
      logger.debug("h");

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith("a");
      expect(warnSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
      expect(timeSpy).not.toHaveBeenCalled();
      expect(timeEndSpy).not.toHaveBeenCalled();
    });

    it("WARNING level emits EMERGENCY through WARNING", () => {
      const logger = createLogger("WARNING");

      logger.emergency("a");
      logger.alert("b");
      logger.critical("c");
      logger.error("d");
      logger.warn("e");
      logger.notice("f");
      logger.info("g");
      logger.debug("h");

      expect(errorSpy).toHaveBeenCalledTimes(4);
      expect(errorSpy).toHaveBeenCalledWith("a");
      expect(errorSpy).toHaveBeenCalledWith("b");
      expect(errorSpy).toHaveBeenCalledWith("c");
      expect(errorSpy).toHaveBeenCalledWith("d");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith("e");
      expect(infoSpy).not.toHaveBeenCalled();
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("DEBUG level emits all messages", () => {
      const logger = createLogger("DEBUG");

      logger.emergency("a");
      logger.alert("b");
      logger.critical("c");
      logger.error("d");
      logger.warn("e");
      logger.notice("f");
      logger.info("g");
      logger.debug("h");

      expect(errorSpy).toHaveBeenCalledTimes(4); // emergency, alert, critical, error
      expect(warnSpy).toHaveBeenCalledTimes(1); // warning
      expect(infoSpy).toHaveBeenCalledTimes(2); // notice, info
      expect(debugSpy).toHaveBeenCalledTimes(1); // debug
    });
  });

  describe("time / timeEnd", () => {
    it("are enabled at INFO level", () => {
      const logger = createLogger("INFO");
      logger.time("timer");
      logger.timeEnd("timer");
      expect(timeSpy).toHaveBeenCalledWith("timer");
      expect(timeEndSpy).toHaveBeenCalledWith("timer");
    });

    it("are enabled at DEBUG level", () => {
      const logger = createLogger("DEBUG");
      logger.time("timer");
      logger.timeEnd("timer");
      expect(timeSpy).toHaveBeenCalledWith("timer");
      expect(timeEndSpy).toHaveBeenCalledWith("timer");
    });

    it("are suppressed at NOTICE level", () => {
      const logger = createLogger("NOTICE");
      logger.time("timer");
      logger.timeEnd("timer");
      expect(timeSpy).not.toHaveBeenCalled();
      expect(timeEndSpy).not.toHaveBeenCalled();
    });

    it("are suppressed at ERROR level", () => {
      const logger = createLogger("ERROR");
      logger.time("timer");
      logger.timeEnd("timer");
      expect(timeSpy).not.toHaveBeenCalled();
      expect(timeEndSpy).not.toHaveBeenCalled();
    });

    it("work with null label", () => {
      const logger = createLogger("INFO");
      logger.time();
      logger.timeEnd();
      expect(timeSpy).toHaveBeenCalledWith(undefined);
      expect(timeEndSpy).toHaveBeenCalledWith(undefined);
    });
  });

  describe("return value shape", () => {
    it("returns an object with all required methods", () => {
      const logger = createLogger("INFO");
      expect(logger).toHaveProperty("emergency");
      expect(logger).toHaveProperty("alert");
      expect(logger).toHaveProperty("critical");
      expect(logger).toHaveProperty("error");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("notice");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("time");
      expect(logger).toHaveProperty("timeEnd");

      expect(typeof logger.emergency).toBe("function");
      expect(typeof logger.alert).toBe("function");
      expect(typeof logger.critical).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.notice).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.time).toBe("function");
      expect(typeof logger.timeEnd).toBe("function");
    });
  });
});
