import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";
import { modules } from "./test.setup.js";
import { validatePolyline } from "./polylines.js";
import { type PolylineKey } from "./schema.js";

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
          key: "manhattan-street" as PolylineKey,
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const polyline = await t.query(api.polylines.get, {
        key: "manhattan-street" as PolylineKey,
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
          key: "manhattan-street" as PolylineKey,
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      await expect(
        t.mutation(api.polylines.insert, {
          document: {
            sortKey: 0,
            key: "manhattan-street" as PolylineKey,
            coordinates: MANHATTAN_STREET_POLYLINE,
          },
          config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
        }),
      ).rejects.toThrow(/already exists/);
    });

    test("throws when inserting a polyline with fewer than 2 points", async () => {
      const t = convexTest(schema, modules);

      await expect(
        t.mutation(api.polylines.insert, {
          document: {
            sortKey: 0,
            key: "single-point" as PolylineKey,
            coordinates: [{ latitude: 0, longitude: 0 }],
          },
          config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
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
          key: "manhattan-street" as PolylineKey,
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      await t.mutation(api.polylines.del, {
        key: "manhattan-street" as PolylineKey,
      });

      const polyline = await t.query(api.polylines.get, {
        key: "manhattan-street" as PolylineKey,
      });
      expect(polyline).toBeNull();
    });

    test("returns false when removing a polyline that does not exist", async () => {
      const t = convexTest(schema, modules);

      const result = await t.mutation(api.polylines.del, {
        key: "nonexistent" as PolylineKey,
      });

      expect(result).toBe(false);
    });

    test("returns true when removing a polyline that exists", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "manhattan-street" as PolylineKey,
          coordinates: MANHATTAN_STREET_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.mutation(api.polylines.del, {
        key: "manhattan-street" as PolylineKey,
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
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: SHIFTED_DIAGONAL_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const polyline = await t.query(api.polylines.get, {
        key: "diagonal" as PolylineKey,
      });

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
          key: "nonexistent" as PolylineKey,
          coordinates: DIAGONAL_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result).toBe(false);
    });

    test("returns true when updating a polyline that exists", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: SHIFTED_DIAGONAL_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result).toBe(true);
    });

    test("updates sortKey without changing coordinates", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal" as PolylineKey,
          sortKey: 99,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const polyline = await t.query(api.polylines.get, {
        key: "diagonal" as PolylineKey,
      });

      expect(polyline?.sortKey).toBe(99);
      expect(polyline?.coordinates).toEqual(DIAGONAL_POLYLINE);
    });

    test("updates filterKeys without changing coordinates", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_POLYLINE,
          filterKeys: { category: "original" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal" as PolylineKey,
          filterKeys: { category: "updated" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result).toBe(true);

      const polyline = await t.query(api.polylines.get, {
        key: "diagonal" as PolylineKey,
      });
      expect(polyline?.filterKeys).toEqual({ category: "updated" });
      expect(polyline?.coordinates).toEqual(DIAGONAL_POLYLINE);
    });

    test("updates coordinates with both sortKey and filterKeys", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_POLYLINE,
          filterKeys: { category: "original" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.mutation(api.polylines.update, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: SHIFTED_DIAGONAL_POLYLINE,
          sortKey: 99,
          filterKeys: { category: "updated" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result).toBe(true);

      const polyline = await t.query(api.polylines.get, {
        key: "diagonal" as PolylineKey,
      });
      expect(polyline?.sortKey).toBe(99);
      expect(polyline?.filterKeys).toEqual({ category: "updated" });
      expect(polyline?.coordinates).toEqual(SHIFTED_DIAGONAL_POLYLINE);
    });
  });

  describe("get", () => {
    test("returns null for a key that does not exist", async () => {
      const t = convexTest(schema, modules);

      const polyline = await t.query(api.polylines.get, {
        key: "nonexistent" as PolylineKey,
      });

      expect(polyline).toBeNull();
    });

    test("returns the stored coordinates unchanged", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          sortKey: 0,
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_POLYLINE,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const polyline = await t.query(api.polylines.get, {
        key: "diagonal" as PolylineKey,
      });

      expect(polyline?.coordinates).toEqual(DIAGONAL_POLYLINE);
    });
  });
});
