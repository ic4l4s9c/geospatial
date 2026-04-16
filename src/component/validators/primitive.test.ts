import { expect, test, describe } from "vitest";
import { serialize } from "./primitive.js";

describe("serialize", () => {
  test("formats strings with 's:' prefix", () => {
    expect(serialize("hello")).toBe("s:hello");
    expect(serialize("")).toBe("s:");
  });

  test("formats numbers with 'n:' prefix", () => {
    expect(serialize(123)).toBe("n:123");
    expect(serialize(0)).toBe("n:0");
    expect(serialize(-4.5)).toBe("n:-4.5");
  });

  test("formats booleans with 'b:' prefix", () => {
    expect(serialize(true)).toBe("b:true");
    expect(serialize(false)).toBe("b:false");
  });

  test("formats null as 'null'", () => {
    expect(serialize(null)).toBe("null");
  });

  test("formats int64 (bigint) with 'i:' prefix", () => {
    expect(serialize(BigInt(123))).toBe("i:123");
    expect(serialize(BigInt(0))).toBe("i:0");
    expect(serialize(BigInt(-9007199254740991))).toBe("i:-9007199254740991");
  });
});
