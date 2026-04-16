import { describe, it, expect, suite } from "vitest";
import { PRIME32_1, xxHash32 } from "./xxHash32.js";

describe("xxHash32", () => {
  suite("official upstream test vectors", () => {
    /*
     * See: https://github.com/easyaspi314/xxhash-clean/blob/master/xxhash32-ref.c
     * */
    const cases = [
      ["empty buffer with seed=0", 0, 0, 0x02cc5d05],
      ["empty buffer with seed=PRIME32_1", 0, PRIME32_1, 0x36b78ae7],
      ["1 byte with seed=0", 1, 0, 0xb85cbee5],
      ["1 byte with seed=PRIME32_1", 1, PRIME32_1, 0xd5845d64],
      ["14 bytes with seed=0", 14, 0, 0xe5aa0ab4],
      ["14 bytes with seed=PRIME32_1", 14, PRIME32_1, 0x4481951d],
      ["101 bytes with seed=0", 101, 0, 0x1f1aa412],
      ["101 bytes with seed=PRIME32_1", 101, PRIME32_1, 0x498ec8e2],
    ] as const satisfies Array<[string, number, number, number]>;

    it.each(cases)("hashes %s correctly", (_label, length, seed, expected) => {
      const input = TEST_BUFFER.slice(0, length);
      expect(xxHash32(input, seed) >>> 0).toBe(expected);
    });
  });

  suite("empty input handling", () => {
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

  suite("string vs Uint8Array equivalence", () => {
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

  suite("seed sensitivity", () => {
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

  suite("input sensitivity", () => {
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

  suite("output contract", () => {
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

  suite("boundary conditions and large inputs", () => {
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
