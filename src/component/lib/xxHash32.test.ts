import { describe, it, expect } from "vitest";
import { PRIME32_1, xxHash32, toUtf8 } from "./xxHash32.js";

describe("toUtf8", () => {
  describe("ASCII characters (1-byte sequences)", () => {
    it("encodes empty string", () => {
      expect(toUtf8("")).toEqual(new Uint8Array([]));
    });

    it("encodes single ASCII character", () => {
      expect(toUtf8("A")).toEqual(new Uint8Array([0x41]));
    });

    it("encodes ASCII string", () => {
      expect(toUtf8("Hello")).toEqual(
        new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]),
      );
    });

    it("encodes ASCII printable characters", () => {
      expect(toUtf8("abc123!@#")).toEqual(
        new Uint8Array([0x61, 0x62, 0x63, 0x31, 0x32, 0x33, 0x21, 0x40, 0x23]),
      );
    });

    it("encodes null character (U+0000)", () => {
      expect(toUtf8("\x00")).toEqual(new Uint8Array([0x00]));
    });

    it("encodes DEL character (U+007F)", () => {
      expect(toUtf8("\x7f")).toEqual(new Uint8Array([0x7f]));
    });
  });

  describe("2-byte sequences (U+0080 to U+07FF)", () => {
    it("encodes U+0080 (first 2-byte character)", () => {
      expect(toUtf8("\u0080")).toEqual(new Uint8Array([0xc2, 0x80]));
    });

    it("encodes U+00A9 (© copyright symbol)", () => {
      expect(toUtf8("©")).toEqual(new Uint8Array([0xc2, 0xa9]));
    });

    it("encodes U+00E9 (é)", () => {
      expect(toUtf8("é")).toEqual(new Uint8Array([0xc3, 0xa9]));
    });

    it("encodes U+07FF (last 2-byte character)", () => {
      expect(toUtf8("\u07ff")).toEqual(new Uint8Array([0xdf, 0xbf]));
    });

    it("encodes mixed ASCII and 2-byte characters", () => {
      expect(toUtf8("café")).toEqual(
        new Uint8Array([0x63, 0x61, 0x66, 0xc3, 0xa9]),
      );
    });
  });

  describe("3-byte sequences (U+0800 to U+FFFF, excluding surrogates)", () => {
    it("encodes U+0800 (first 3-byte character)", () => {
      expect(toUtf8("\u0800")).toEqual(new Uint8Array([0xe0, 0xa0, 0x80]));
    });

    it("encodes U+20AC (€ euro sign)", () => {
      expect(toUtf8("€")).toEqual(new Uint8Array([0xe2, 0x82, 0xac]));
    });

    it("encodes U+4E2D (中 Chinese character)", () => {
      expect(toUtf8("中")).toEqual(new Uint8Array([0xe4, 0xb8, 0xad]));
    });

    it("encodes U+65E5 (日 Japanese kanji)", () => {
      expect(toUtf8("日")).toEqual(new Uint8Array([0xe6, 0x97, 0xa5]));
    });

    it("encodes U+D7FF (last character before surrogate range)", () => {
      expect(toUtf8("\ud7ff")).toEqual(new Uint8Array([0xed, 0x9f, 0xbf]));
    });

    it("encodes U+E000 (first character after surrogate range)", () => {
      expect(toUtf8("\ue000")).toEqual(new Uint8Array([0xee, 0x80, 0x80]));
    });

    it("encodes U+FFFF (last 3-byte character)", () => {
      expect(toUtf8("\uffff")).toEqual(new Uint8Array([0xef, 0xbf, 0xbf]));
    });

    it("encodes Japanese string", () => {
      expect(toUtf8("日本語")).toEqual(
        new Uint8Array([
          0xe6,
          0x97,
          0xa5, // 日
          0xe6,
          0x9c,
          0xac, // 本
          0xe8,
          0xaa,
          0x9e, // 語
        ]),
      );
    });
  });

  describe("4-byte sequences (surrogate pairs, U+10000 to U+10FFFF)", () => {
    it("encodes U+10000 (first 4-byte character)", () => {
      // U+10000 = surrogate pair D800 DC00
      expect(toUtf8("\ud800\udc00")).toEqual(
        new Uint8Array([0xf0, 0x90, 0x80, 0x80]),
      );
    });

    it("encodes U+1F98A (🦊 fox emoji)", () => {
      expect(toUtf8("🦊")).toEqual(new Uint8Array([0xf0, 0x9f, 0xa6, 0x8a]));
    });

    it("encodes U+1F430 (🐰 rabbit emoji)", () => {
      expect(toUtf8("🐰")).toEqual(new Uint8Array([0xf0, 0x9f, 0x90, 0xb0]));
    });

    it("encodes U+10FFFF (last valid Unicode code point)", () => {
      // U+10FFFF = surrogate pair DBFF DFFF
      expect(toUtf8("\udbff\udfff")).toEqual(
        new Uint8Array([0xf4, 0x8f, 0xbf, 0xbf]),
      );
    });

    it("encodes multiple emojis", () => {
      expect(toUtf8("🦊🐱")).toEqual(
        new Uint8Array([
          0xf0,
          0x9f,
          0xa6,
          0x8a, // 🦊
          0xf0,
          0x9f,
          0x90,
          0xb1, // 🐱
        ]),
      );
    });
  });

  describe("mixed character encodings", () => {
    it("encodes ASCII + 2-byte + 3-byte characters", () => {
      expect(toUtf8("Hello©中")).toEqual(
        new Uint8Array([
          0x48,
          0x65,
          0x6c,
          0x6c,
          0x6f, // Hello
          0xc2,
          0xa9, // ©
          0xe4,
          0xb8,
          0xad, // 中
        ]),
      );
    });

    it("encodes all encoding types in one string", () => {
      expect(toUtf8("A©中🦊")).toEqual(
        new Uint8Array([
          0x41, // A
          0xc2,
          0xa9, // ©
          0xe4,
          0xb8,
          0xad, // 中
          0xf0,
          0x9f,
          0xa6,
          0x8a, // 🦊
        ]),
      );
    });

    it("encodes realistic multilingual text", () => {
      expect(toUtf8("Hello, 世界! 🌍")).toEqual(
        new Uint8Array([
          0x48,
          0x65,
          0x6c,
          0x6c,
          0x6f,
          0x2c,
          0x20, // "Hello, "
          0xe4,
          0xb8,
          0x96, // 世
          0xe7,
          0x95,
          0x8c, // 界
          0x21,
          0x20, // "! "
          0xf0,
          0x9f,
          0x8c,
          0x8d, // 🌍
        ]),
      );
    });
  });

  describe("compatibility with TextEncoder", () => {
    const testCases = [
      "",
      "Hello",
      "café",
      "日本語",
      "🦊",
      "Hello, 世界! 🌍",
      "The quick brown fox jumps over the lazy dog",
      "特殊字符: ©®™€£¥",
      "🐰🦊",
      "\x00\x7f\u0080\u07ff\u0800\uffff",
    ];

    it.each(testCases)(
      'produces identical output to TextEncoder for: "%s"',
      (text) => {
        const expected = new TextEncoder().encode(text);
        const actual = toUtf8(text);
        expect(actual).toEqual(expected);
      },
    );
  });

  describe("edge cases", () => {
    it("encodes string with only spaces", () => {
      expect(toUtf8("   ")).toEqual(new Uint8Array([0x20, 0x20, 0x20]));
    });

    it("encodes string with newlines and tabs", () => {
      expect(toUtf8("\n\t\r")).toEqual(new Uint8Array([0x0a, 0x09, 0x0d]));
    });

    it("encodes very long ASCII string", () => {
      const longString = "a".repeat(1000);
      const expected = new Uint8Array(1000).fill(0x61);
      expect(toUtf8(longString)).toEqual(expected);
    });

    it("encodes repeated emoji", () => {
      const emojiString = "🦊".repeat(3);
      expect(toUtf8(emojiString)).toEqual(
        new Uint8Array([
          0xf0, 0x9f, 0xa6, 0x8a, 0xf0, 0x9f, 0xa6, 0x8a, 0xf0, 0x9f, 0xa6,
          0x8a,
        ]),
      );
    });
  });

  describe("byte array properties", () => {
    it("returns Uint8Array instance", () => {
      const result = toUtf8("test");
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("returns array with correct length for ASCII", () => {
      const result = toUtf8("Hello");
      expect(result.length).toBe(5);
    });

    it("returns array with correct length for multi-byte characters", () => {
      const result = toUtf8("日本"); // 2 characters, 6 bytes total
      expect(result.length).toBe(6);
    });

    it("returns array with correct length for emojis", () => {
      const result = toUtf8("🦊"); // 1 character, 4 bytes
      expect(result.length).toBe(4);
    });
  });
});

describe("xxHash32", () => {
  describe("official upstream test vectors", () => {
    /*
     * See: https://github.com/easyaspi314/xxhash-clean/blob/master/xxhash32-ref.c
     * */
    const cases: Array<[string, number, number, number]> = [
      ["empty buffer with seed=0", 0, 0, 0x02cc5d05],
      ["empty buffer with seed=PRIME32_1", 0, PRIME32_1, 0x36b78ae7],
      ["1 byte with seed=0", 1, 0, 0xb85cbee5],
      ["1 byte with seed=PRIME32_1", 1, PRIME32_1, 0xd5845d64],
      ["14 bytes with seed=0", 14, 0, 0xe5aa0ab4],
      ["14 bytes with seed=PRIME32_1", 14, PRIME32_1, 0x4481951d],
      ["101 bytes with seed=0", 101, 0, 0x1f1aa412],
      ["101 bytes with seed=PRIME32_1", 101, PRIME32_1, 0x498ec8e2],
    ];

    it.each(cases)("hashes %s correctly", (_label, length, seed, expected) => {
      const input = TEST_BUFFER.slice(0, length);
      expect(xxHash32(input, seed) >>> 0).toBe(expected);
    });
  });

  describe("empty input handling", () => {
    it("hashes empty Uint8Array with default seed", () => {
      expect(xxHash32(new Uint8Array(0)) >>> 0).toBe(0x02cc5d05);
    });

    it("hashes empty string with default seed", () => {
      expect(xxHash32("") >>> 0).toBe(0x02cc5d05);
    });

    it("hashes empty Uint8Array with explicit seed=0", () => {
      expect(xxHash32(new Uint8Array(0), 0) >>> 0).toBe(0x02cc5d05);
    });
  });

  describe("string vs Uint8Array equivalence", () => {
    const testStrings = [
      "hello",
      "Hello, World!",
      "The quick brown fox jumps over the lazy dog",
      "xxHash",
      "🦊",
      "日本語",
    ];

    it.each(testStrings)(
      'produces identical hash for string and UTF-8 bytes: "%s"',
      (str) => {
        const bytes = new TextEncoder().encode(str);
        expect(xxHash32(str)).toBe(xxHash32(bytes));
      },
    );
  });

  describe("seed sensitivity", () => {
    const input = new TextEncoder().encode("seed-test");

    it("produces different hashes for different seeds (0 vs 1)", () => {
      expect(xxHash32(input, 0)).not.toBe(xxHash32(input, 1));
    });

    it("produces different hashes for different seeds (0 vs PRIME32_1)", () => {
      expect(xxHash32(input, 0)).not.toBe(xxHash32(input, PRIME32_1));
    });

    it("produces consistent hash for same seed (determinism)", () => {
      expect(xxHash32(input, 42)).toBe(xxHash32(input, 42));
    });

    it("treats default seed as seed=0", () => {
      expect(xxHash32(input)).toBe(xxHash32(input, 0));
    });
  });

  describe("input sensitivity", () => {
    it("produces different hash when single byte changes", () => {
      const a = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const b = new Uint8Array([0x00, 0x01, 0x02, 0xff]);
      expect(xxHash32(a)).not.toBe(xxHash32(b));
    });

    it("produces different hash when byte order changes", () => {
      const a = new Uint8Array([0x01, 0x02]);
      const b = new Uint8Array([0x02, 0x01]);
      expect(xxHash32(a)).not.toBe(xxHash32(b));
    });

    it("produces different hash when byte is appended", () => {
      const a = new Uint8Array([0xde, 0xad, 0xbe]);
      const b = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      expect(xxHash32(a)).not.toBe(xxHash32(b));
    });
  });

  describe("output contract", () => {
    const input = new TextEncoder().encode("contract-check");

    it("returns a number type", () => {
      expect(typeof xxHash32(input)).toBe("number");
    });

    it("returns a valid 32-bit unsigned integer", () => {
      const h = xxHash32(input) >>> 0;
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    });

    it("produces deterministic results across multiple calls", () => {
      const first = xxHash32(input, 0);
      for (let i = 0; i < 10; i++) {
        expect(xxHash32(input, 0)).toBe(first);
      }
    });
  });

  describe("boundary conditions and large inputs", () => {
    it("handles exactly 16 bytes (one full stripe)", () => {
      const input = new Uint8Array(16).fill(0xab);
      expect(() => xxHash32(input)).not.toThrow();
      expect(typeof xxHash32(input)).toBe("number");
    });

    it("handles exactly 15 bytes (one byte short of full stripe)", () => {
      const input = new Uint8Array(15).fill(0xcd);
      expect(() => xxHash32(input)).not.toThrow();
    });

    it("produces stable hash for 1 KB of zeroes", () => {
      const input = new Uint8Array(1024);
      const h = xxHash32(input);
      expect(xxHash32(input)).toBe(h);
    });

    it("produces stable hash for 1 KB of 0xFF bytes", () => {
      const input = new Uint8Array(1024).fill(0xff);
      const h = xxHash32(input);
      expect(xxHash32(input)).toBe(h);
    });

    it("produces different hashes for 1 KB of zeroes vs 0xFF bytes", () => {
      const zeros = new Uint8Array(1024);
      const ones = new Uint8Array(1024).fill(0xff);
      expect(xxHash32(zeros)).not.toBe(xxHash32(ones));
    });
  });
});

/** Replicates the official xxHash reference test buffer exactly.
 *  C reference: byte_gen = PRIME32_1; test_data[i] = byte_gen >> 24; byte_gen *= byte_gen;
 */
function buildTestBuffer(size: number): Uint8Array {
  const buf = new Uint8Array(size);
  let byteGen = PRIME32_1;
  for (let i = 0; i < size; i++) {
    buf[i] = (byteGen >>> 24) & 0xff;
    byteGen = Math.imul(byteGen, byteGen) >>> 0;
  }
  return buf;
}

const TEST_BUFFER = buildTestBuffer(101);
