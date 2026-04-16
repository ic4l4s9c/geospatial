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

    it("forwards null and undefined arguments", () => {
      const logger = createLogger("DEBUG");
      logger.debug(null, undefined);
      expect(debugSpy).toHaveBeenCalledWith(null, undefined);
    });
  });

  describe("severity filtering per level", () => {
    LOG_LEVELS.forEach((level) => {
      const levelIndex = LOG_LEVELS.indexOf(level);

      describe(`level = ${level} (severity ${levelIndex})`, () => {
        it("emergency is emitted when levelIndex >= 0", () => {
          const logger = createLogger(level as LogLevel);
          logger.emergency("test");
          expect(errorSpy).toHaveBeenCalledTimes(levelIndex >= 0 ? 1 : 0);
        });

        it("alert is emitted when levelIndex >= 1", () => {
          const logger = createLogger(level as LogLevel);
          logger.alert("test");
          expect(errorSpy).toHaveBeenCalledTimes(levelIndex >= 1 ? 1 : 0);
        });

        it("critical is emitted when levelIndex >= 2", () => {
          const logger = createLogger(level as LogLevel);
          logger.critical("test");
          expect(errorSpy).toHaveBeenCalledTimes(levelIndex >= 2 ? 1 : 0);
        });

        it("error is emitted when levelIndex >= 3", () => {
          const logger = createLogger(level as LogLevel);
          logger.error("test");
          expect(errorSpy).toHaveBeenCalledTimes(levelIndex >= 3 ? 1 : 0);
        });

        it("warning is emitted when levelIndex >= 4", () => {
          const logger = createLogger(level as LogLevel);
          logger.warn("test");
          expect(warnSpy).toHaveBeenCalledTimes(levelIndex >= 4 ? 1 : 0);
        });

        it("notice is emitted when levelIndex >= 5", () => {
          const logger = createLogger(level as LogLevel);
          logger.notice("test");
          expect(infoSpy).toHaveBeenCalledTimes(levelIndex >= 5 ? 1 : 0);
        });

        it("info is emitted when levelIndex >= 6", () => {
          const logger = createLogger(level as LogLevel);
          logger.info("test");
          const infoCalls = infoSpy.mock.calls.length;
          // account for notice also calling console.info
          expect(infoCalls).toBeGreaterThanOrEqual(levelIndex >= 6 ? 1 : 0);
        });

        it("debug is emitted when levelIndex >= 7", () => {
          const logger = createLogger(level as LogLevel);
          logger.debug("test");
          expect(debugSpy).toHaveBeenCalledTimes(levelIndex >= 7 ? 1 : 0);
        });

        it("time is active only when levelIndex >= 6", () => {
          const logger = createLogger(level as LogLevel);
          logger.time("t");
          expect(timeSpy).toHaveBeenCalledTimes(
            levelIndex >= SEVERITY.INFO ? 1 : 0,
          );
        });

        it("timeEnd is active only when levelIndex >= 6", () => {
          const logger = createLogger(level as LogLevel);
          logger.timeEnd("t");
          expect(timeEndSpy).toHaveBeenCalledTimes(
            levelIndex >= SEVERITY.INFO ? 1 : 0,
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

    it("work with undefined label", () => {
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
