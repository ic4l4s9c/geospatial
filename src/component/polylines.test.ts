import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";
import { modules } from "./test.setup.js";
import { validatePolyline } from "./polylines.js";

const MANHATTAN_STREET_POLYLINE = [
  { latitude: 40.748, longitude: -73.985 },
  { latitude: 40.749, longitude: -73.983 },
  { latitude: 40.751, longitude: -73.98 },
  { latitude: 40.753, longitude: -73.977 },
];

const DIAGONAL_POLYLINE = [
  { latitude: 0, longitude: 0 },
  { latitude: 1, longitude: 1 },
];

const SHIFTED_DIAGONAL_POLYLINE = [
  { latitude: 10, longitude: 10 },
  { latitude: 11, longitude: 11 },
];

describe("validatePolyline", () => {
  test("throws when coordinates is not an array", () => {
    expect(() => validatePolyline("not-an-array")).toThrow(
      "Invalid polyline: coordinates must be an array",
    );
  });

  test("throws when coordinates is null", () => {
    expect(() => validatePolyline(null)).toThrow(
      "Invalid polyline: coordinates must be an array",
    );
  });

  test("throws when coordinates has fewer than 2 points", () => {
    expect(() => validatePolyline([{ latitude: 0, longitude: 0 }])).toThrow(
      "Polyline must have at least 2 points",
    );
  });

  test("throws when coordinates is an empty array", () => {
    expect(() => validatePolyline([])).toThrow(
      "Polyline must have at least 2 points",
    );
  });

  test("does not throw when polyline has exactly 2 points", () => {
    const coords = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
    ];
    expect(validatePolyline(coords)).toEqual(coords);
  });

  test("does not throw when polyline has more than 2 points", () => {
    const coords = [
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
      { latitude: 3, longitude: 3 },
    ];
    expect(validatePolyline(coords)).toEqual(coords);
  });
});

describe("polyline storage", () => {
  describe("insert", () => {
    test("stores polyline and generates a bounding box", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "manhattan-street",
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
      });

      const polyline = await t.query(api.polylines.get, {
        key: "manhattan-street",
      });

      expect(polyline).not.toBeNull();
      expect(polyline?.boundingBox).toMatchObject({
        north: expect.any(Number),
        south: expect.any(Number),
        east: expect.any(Number),
        west: expect.any(Number),
      });
    });

    test("throws when inserting a polyline with a duplicate key", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "manhattan-street",
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
      });

      await expect(
        t.mutation(api.polylines.insert, {
          document: {
            sortKey: 0,
            key: "manhattan-street",
            coordinates: MANHATTAN_STREET_POLYLINE,
          },
        }),
      ).rejects.toThrow(/already exists/);
    });

    test("throws when inserting a polyline with fewer than 2 points", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.polylines.insert, {
          document: {
            sortKey: 0,
            key: "single-point",
            coordinates: [{ latitude: 0, longitude: 0 }],
          },
        }),
      ).rejects.toThrow(/at least 2 points/);
    });
  });

  describe("remove", () => {
    test("deletes the polyline so it can no longer be retrieved", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "manhattan-street",
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
      });

      await t.mutation(api.polylines.del, { key: "manhattan-street" });

      const polyline = await t.query(api.polylines.get, {
        key: "manhattan-street",
      });
      expect(polyline).toBeNull();
    });

    test("returns false when removing a polyline that does not exist", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.polylines.del, {
        key: "nonexistent",
      });

      expect(result).toBe(false);
    });

    test("returns true when removing a polyline that exists", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "manhattan-street",
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
      });

      const result = await t.mutation(api.polylines.del, {
        key: "manhattan-street",
      });

      expect(result).toBe(true);
    });
  });

  describe("update", () => {
    test("replaces coordinates and recalculates the bounding box", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal",
          coordinates: DIAGONAL_POLYLINE,
        },
      });

      await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal",
          coordinates: SHIFTED_DIAGONAL_POLYLINE,
        },
      });

      const polyline = await t.query(api.polylines.get, { key: "diagonal" });

      expect(polyline?.boundingBox).toMatchObject({
        south: 10,
        north: 11,
        west: 10,
        east: 11,
      });
    });

    test("returns false when updating a polyline that does not exist", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.polylines.update, {
        document: {
          key: "nonexistent",
          coordinates: DIAGONAL_POLYLINE,
        },
      });

      expect(result).toBe(false);
    });

    test("returns true when updating a polyline that exists", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal",
          coordinates: DIAGONAL_POLYLINE,
        },
      });

      const result = await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal",
          coordinates: SHIFTED_DIAGONAL_POLYLINE,
        },
      });

      expect(result).toBe(true);
    });

    test("updates sortKey without changing coordinates", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal",
          coordinates: DIAGONAL_POLYLINE,
        },
      });

      await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal",
          sortKey: 99,
        },
      });

      const polyline = await t.query(api.polylines.get, { key: "diagonal" });

      expect(polyline?.sortKey).toBe(99);
      expect(polyline?.coordinates).toEqual(DIAGONAL_POLYLINE);
    });

    test("updates filterKeys without changing coordinates", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal",
          coordinates: DIAGONAL_POLYLINE,
          filterKeys: { category: "original" },
        },
      });

      const result = await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal",
          filterKeys: { category: "updated" },
        },
      });

      expect(result).toBe(true);

      const polyline = await t.query(api.polylines.get, { key: "diagonal" });
      expect(polyline?.filterKeys).toEqual({ category: "updated" });
      expect(polyline?.coordinates).toEqual(DIAGONAL_POLYLINE);
    });

    test("updates coordinates with both sortKey and filterKeys", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal",
          coordinates: DIAGONAL_POLYLINE,
          filterKeys: { category: "original" },
        },
      });

      const result = await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal",
          coordinates: SHIFTED_DIAGONAL_POLYLINE,
          sortKey: 99,
          filterKeys: { category: "updated" },
        },
      });

      expect(result).toBe(true);

      const polyline = await t.query(api.polylines.get, { key: "diagonal" });
      expect(polyline?.sortKey).toBe(99);
      expect(polyline?.filterKeys).toEqual({ category: "updated" });
      expect(polyline?.coordinates).toEqual(SHIFTED_DIAGONAL_POLYLINE);
    });
  });

  describe("get", () => {
    test("returns null for a key that does not exist", async () => {
      const t = convexTest(schema, modules);

      const polyline = await t.query(api.polylines.get, {
        key: "nonexistent",
      });

      expect(polyline).toBeNull();
    });

    test("returns the stored coordinates unchanged", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal",
          coordinates: DIAGONAL_POLYLINE,
        },
      });

      const polyline = await t.query(api.polylines.get, { key: "diagonal" });

      expect(polyline?.coordinates).toEqual(DIAGONAL_POLYLINE);
    });
  });
});
