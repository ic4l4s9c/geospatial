import { expect, test, describe } from "vitest";
import { toKey } from "./primitive.js";

describe("toKey", () => {
  test("formats strings with 's:' prefix", () => {
    expect(toKey("hello")).toBe("s:hello");
    expect(toKey("")).toBe("s:");
  });

  test("formats numbers with 'n:' prefix", () => {
    expect(toKey(123)).toBe("n:123");
    expect(toKey(0)).toBe("n:0");
    expect(toKey(-4.5)).toBe("n:-4.5");
  });

  test("formats booleans with 'b:' prefix", () => {
    expect(toKey(true)).toBe("b:true");
    expect(toKey(false)).toBe("b:false");
  });

  test("formats null as 'null'", () => {
    expect(toKey(null)).toBe("null");
  });

  test("formats int64 (bigint) with 'i:' prefix", () => {
    expect(toKey(BigInt(123))).toBe("i:123");
    expect(toKey(BigInt(0))).toBe("i:0");
    expect(toKey(BigInt(-9007199254740991))).toBe("i:-9007199254740991");
  });
});
