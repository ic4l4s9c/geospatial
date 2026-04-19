import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";
import { modules } from "./test.setup.js";
import { validatePolygonCoordinates } from "./polygons.js";

const MANHATTAN_POLYGON = {
  exterior: [
    { latitude: 40.7, longitude: -74.02 },
    { latitude: 40.7, longitude: -73.97 },
    { latitude: 40.8, longitude: -73.93 },
    { latitude: 40.88, longitude: -73.93 },
    { latitude: 40.88, longitude: -73.94 },
    { latitude: 40.8, longitude: -74.01 },
  ],
};

const UNIT_SQUARE_POLYGON = {
  exterior: [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 1, longitude: 1 },
    { latitude: 1, longitude: 0 },
  ],
};

const SHIFTED_SQUARE_POLYGON = {
  exterior: [
    { latitude: 10, longitude: 10 },
    { latitude: 10, longitude: 11 },
    { latitude: 11, longitude: 11 },
    { latitude: 11, longitude: 10 },
  ],
};

describe("validatePolygonCoordinates", () => {
  test("throws when exterior is missing", () => {
    expect(() => validatePolygonCoordinates({})).toThrow(
      "Invalid polygon: missing 'exterior' array",
    );
  });

  test("throws when exterior is null", () => {
    expect(() => validatePolygonCoordinates({ exterior: null })).toThrow(
      "Invalid polygon: missing 'exterior' array",
    );
  });

  test("throws when exterior is not an array", () => {
    expect(() =>
      validatePolygonCoordinates({ exterior: "not-an-array" }),
    ).toThrow("Invalid polygon: missing 'exterior' array");
  });

  test("throws when the input itself is null", () => {
    expect(() => validatePolygonCoordinates(null)).toThrow(
      "Invalid polygon: missing 'exterior' array",
    );
  });

  test("throws when exterior has fewer than 3 points", () => {
    expect(() =>
      validatePolygonCoordinates({
        exterior: [
          { latitude: 0, longitude: 0 },
          { latitude: 1, longitude: 1 },
        ],
      }),
    ).toThrow("Polygon must have at least 3 exterior points");
  });

  test("throws when exterior is an empty array", () => {
    expect(() => validatePolygonCoordinates({ exterior: [] })).toThrow(
      "Polygon must have at least 3 exterior points",
    );
  });

  test("throws when 'holes' array is provided", () => {
    expect(() =>
      validatePolygonCoordinates({
        exterior: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
        ],
        holes: [[]],
      }),
    ).toThrow("Polygon holes are not supported");
  });

  test("throws when 'interiors' array is provided", () => {
    expect(() =>
      validatePolygonCoordinates({
        exterior: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
        ],
        interiors: [[]],
      }),
    ).toThrow("Polygon holes are not supported");
  });

  test("throws when 'interior' array is provided", () => {
    expect(() =>
      validatePolygonCoordinates({
        exterior: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
        ],
        interior: [[]],
      }),
    ).toThrow("Polygon holes are not supported");
  });

  test("does not throw when holes array is empty", () => {
    expect(() =>
      validatePolygonCoordinates({
        exterior: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
          { latitude: 1, longitude: 1 },
        ],
        holes: [],
      }),
    ).not.toThrow();
  });

  test("returns the exterior points for a valid polygon", () => {
    const exterior = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: 1, longitude: 1 },
    ];
    expect(validatePolygonCoordinates({ exterior })).toEqual(exterior);
  });
});

describe("polygon storage", () => {
  describe("insert", () => {
    test("stores polygon and generates a bounding box", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          sortKey: 0,
          key: "manhattan",
          coordinates: MANHATTAN_POLYGON,
        },
      });

      const polygon = await t.query(api.polygons.get, { key: "manhattan" });

      expect(polygon).not.toBeNull();
      expect(polygon?.boundingBox).toMatchObject({
        north: expect.any(Number),
        south: expect.any(Number),
        east: expect.any(Number),
        west: expect.any(Number),
      });
    });

    test("throws when inserting a polygon with a duplicate key", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          sortKey: 0,
          key: "manhattan",
          coordinates: MANHATTAN_POLYGON,
        },
      });

      await expect(
        t.mutation(api.polygons.insert, {
          document: {
            sortKey: 0,
            key: "manhattan",
            coordinates: MANHATTAN_POLYGON,
          },
        }),
      ).rejects.toThrow(/already exists/);
    });
  });

  describe("remove", () => {
    test("deletes the polygon so it can no longer be retrieved", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          sortKey: 0,
          key: "manhattan",
          coordinates: MANHATTAN_POLYGON,
        },
      });

      const removed = await t.mutation(api.polygons.remove, {
        key: "manhattan",
      });
      expect(removed).toBe(true);

      const polygon = await t.query(api.polygons.get, { key: "manhattan" });
      expect(polygon).toBeNull();
    });

    test("returns false when the key does not exist", async () => {
      const t = convexTest(schema, modules);

      const removed = await t.mutation(api.polygons.remove, {
        key: "nonexistent",
      });
      expect(removed).toBe(false);
    });
  });

  describe("update", () => {
    test("replaces coordinates and recalculates the bounding box", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          sortKey: 0,
          key: "square",
          coordinates: UNIT_SQUARE_POLYGON,
        },
      });

      await t.mutation(api.polygons.update, {
        document: {
          key: "square",
          coordinates: SHIFTED_SQUARE_POLYGON,
        },
      });

      const polygon = await t.query(api.polygons.get, { key: "square" });

      expect(polygon?.boundingBox).toMatchObject({
        south: 10,
        north: 11,
        west: 10,
        east: 11,
      });
    });

    test("returns false when the key does not exist", async () => {
      const t = convexTest(schema, modules);

      const updated = await t.mutation(api.polygons.update, {
        document: {
          key: "nonexistent",
          sortKey: 99,
        },
      });
      expect(updated).toBe(false);
    });

    test("updates sortKey without changing coordinates", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          sortKey: 0,
          key: "square",
          coordinates: UNIT_SQUARE_POLYGON,
        },
      });

      const updated = await t.mutation(api.polygons.update, {
        document: {
          key: "square",
          sortKey: 42,
        },
      });
      expect(updated).toBe(true);

      const polygon = await t.query(api.polygons.get, { key: "square" });
      expect(polygon?.sortKey).toBe(42);
      // Coordinates must be unchanged
      expect(polygon?.coordinates).toEqual(UNIT_SQUARE_POLYGON);
    });

    test("updates filterKeys without changing coordinates", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          sortKey: 0,
          key: "square",
          coordinates: UNIT_SQUARE_POLYGON,
          filterKeys: { category: "original" },
        },
      });

      const updated = await t.mutation(api.polygons.update, {
        document: {
          key: "square",
          filterKeys: { category: "updated" },
        },
      });
      expect(updated).toBe(true);

      const polygon = await t.query(api.polygons.get, { key: "square" });
      expect(polygon?.filterKeys).toEqual({ category: "updated" });
      expect(polygon?.coordinates).toEqual(UNIT_SQUARE_POLYGON);
    });

    test("updates coordinates with both sortKey and filterKeys", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          sortKey: 0,
          key: "square",
          coordinates: UNIT_SQUARE_POLYGON,
          filterKeys: { category: "original" },
        },
      });

      const updated = await t.mutation(api.polygons.update, {
        document: {
          key: "square",
          coordinates: SHIFTED_SQUARE_POLYGON,
          sortKey: 99,
          filterKeys: { category: "updated" },
        },
      });
      expect(updated).toBe(true);

      const polygon = await t.query(api.polygons.get, { key: "square" });
      expect(polygon?.coordinates).toEqual(SHIFTED_SQUARE_POLYGON);
      expect(polygon?.sortKey).toBe(99);
      expect(polygon?.filterKeys).toEqual({ category: "updated" });
    });
  });

  describe("get", () => {
    test("returns null for a key that does not exist", async () => {
      const t = convexTest(schema, modules);

      const polygon = await t.query(api.polygons.get, { key: "nonexistent" });
      expect(polygon).toBeNull();
    });
  });
});
