import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api.js";
import schema from "../schema.js";
import { modules } from "../test.setup.js";

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

const POINT_INSIDE = { latitude: 40.758, longitude: -73.985 };
const POINT_OUTSIDE = { latitude: 40.73, longitude: -74.07 };

describe("Polygon Query", () => {
  describe("contains", () => {
    test("finds polygon containing point", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const result = await t.query(api.polygon.query.contains, {
        logLevel: "INFO",
        shape: POINT_INSIDE,
      });

      expect(result.results.length).toBe(1);
      expect(result.results[0].key).toBe("manhattan");
      expect(result.nextCursor).toBeUndefined();
    });

    test("returns empty for point outside all polygons", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const result = await t.query(api.polygon.query.contains, {
        logLevel: "INFO",
        shape: POINT_OUTSIDE,
      });

      expect(result.results.length).toBe(0);
    });

    test("respects filterKeys", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
        filterKeys: { borough: "manhattan" },
      });

      const results1 = await t.query(api.polygon.query.contains, {
        shape: POINT_INSIDE,
        logLevel: "INFO",
        filtering: [
          { occur: "must", filterKey: "borough", filterValue: "manhattan" },
        ],
      });
      expect(results1.results.length).toBe(1);

      const results2 = await t.query(api.polygon.query.contains, {
        shape: POINT_INSIDE,
        logLevel: "INFO",
        filtering: [
          { occur: "must", filterKey: "borough", filterValue: "brooklyn" },
        ],
      });
      expect(results2.results.length).toBe(0);
    });

    test("finds multiple overlapping polygons", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "large",
        type: "polygon",
        coordinates: {
          exterior: [
            { latitude: 40, longitude: -75 },
            { latitude: 40, longitude: -73 },
            { latitude: 42, longitude: -73 },
            { latitude: 42, longitude: -75 },
          ],
        },
      });

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "small",
        type: "polygon",
        coordinates: {
          exterior: [
            { latitude: 40.7, longitude: -74.1 },
            { latitude: 40.7, longitude: -73.9 },
            { latitude: 40.9, longitude: -73.9 },
            { latitude: 40.9, longitude: -74.1 },
          ],
        },
      });

      const result = await t.query(api.polygon.query.contains, {
        logLevel: "INFO",
        shape: { latitude: 40.8, longitude: -74.0 },
      });

      expect(result.results.length).toBe(2);
      const keys = result.results.map((r) => r.key).sort();
      expect(keys).toEqual(["large", "small"]);
    });
  });
});
