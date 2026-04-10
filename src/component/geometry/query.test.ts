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

const MANHATTAN_ROUTE = [
  { latitude: 40.71, longitude: -74.01 },
  { latitude: 40.75, longitude: -73.99 },
  { latitude: 40.8, longitude: -73.96 },
];

describe("Geometry query", () => {
  describe("intersects", () => {
    test("finds polygon intersecting rectangle", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const result = await t.query(api.geometry.query.intersects, {
        logLevel: "INFO",
        shape: {
          type: "rectangle",
          rectangle: {
            south: 40.75,
            north: 40.76,
            west: -73.99,
            east: -73.98,
          },
        },
      });

      expect(result.results.length).toBe(1);
      expect(result.results[0].key).toBe("manhattan");
    });

    test("returns empty for non-intersecting shapes", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const result = await t.query(api.geometry.query.intersects, {
        logLevel: "INFO",
        shape: {
          type: "rectangle",
          rectangle: {
            south: 40.7,
            north: 40.75,
            west: -74.1,
            east: -74.05,
          },
        },
      });

      expect(result.results.length).toBe(0);
    });

    test("finds polyline intersecting query polygon", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "route",
        type: "polyline",
        coordinates: MANHATTAN_ROUTE,
      });

      const result = await t.query(api.geometry.query.intersects, {
        logLevel: "INFO",
        shape: {
          type: "polygon",
          polygon: {
            exterior: [
              { latitude: 40.745, longitude: -74.0 },
              { latitude: 40.745, longitude: -73.98 },
              { latitude: 40.755, longitude: -73.98 },
              { latitude: 40.755, longitude: -74.0 },
            ],
          },
        },
      });

      expect(result.results.length).toBe(1);
      expect(result.results[0].key).toBe("route");
    });
  });

  describe("nearest", () => {
    test("finds polygons within distance", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const nearPoint = { latitude: 40.75, longitude: -74.05 };

      const result = await t.query(api.geometry.query.nearest, {
        logLevel: "INFO",
        point: nearPoint,
        maxDistance: 5000,
        limit: 100,
        filtering: [],
      });

      expect(result.results.length).toBe(1);
      expect(result.results[0].key).toBe("manhattan");
    });

    test("respects maxDistance", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const farPoint = { latitude: 40.75, longitude: -74.05 };

      const result = await t.query(api.geometry.query.nearest, {
        logLevel: "INFO",
        point: farPoint,
        maxDistance: 10,
        limit: 100,
        filtering: [],
      });

      expect(result.results.length).toBe(0);
    });

    test("respects limit", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      await t.mutation(api.geometry.insert, {
        sortKey: 1,
        key: "manhattan2",
        type: "polygon",
        coordinates: {
          exterior: [
            { latitude: 40.9, longitude: -74.0 },
            { latitude: 40.9, longitude: -73.9 },
            { latitude: 41.0, longitude: -73.9 },
            { latitude: 41.0, longitude: -74.0 },
          ],
        },
      });

      const nearPoint = { latitude: 40.75, longitude: -74.05 };

      const result = await t.query(api.geometry.query.nearest, {
        logLevel: "INFO",
        point: nearPoint,
        maxDistance: 50000,
        limit: 1,
        filtering: [],
      });

      expect(result.results.length).toBe(1);
    });

    test("returns sorted by distance", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "far",
        type: "polygon",
        coordinates: {
          exterior: [
            { latitude: 41.0, longitude: -74.0 },
            { latitude: 41.0, longitude: -73.9 },
            { latitude: 41.1, longitude: -73.9 },
            { latitude: 41.1, longitude: -74.0 },
          ],
        },
      });

      await t.mutation(api.geometry.insert, {
        sortKey: 1,
        key: "near",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const nearPoint = { latitude: 40.73, longitude: -74.06 };

      const result = await t.query(api.geometry.query.nearest, {
        logLevel: "INFO",
        point: nearPoint,
        maxDistance: 50000,
        limit: 2,
        filtering: [],
      });

      expect(result.results[0].key).toBe("near");
      expect(result.results[1].key).toBe("far");
    });

    test("finds polylines within distance", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "route",
        type: "polyline",
        coordinates: MANHATTAN_ROUTE,
      });

      const nearPoint = { latitude: 40.78, longitude: -73.97 };

      const result = await t.query(api.geometry.query.nearest, {
        logLevel: "INFO",
        point: nearPoint,
        maxDistance: 5000,
        limit: 100,
        filtering: [],
      });

      expect(result.results.length).toBe(1);
      expect(result.results[0].key).toBe("route");
    });

    test("respects filterKeys", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
        filterKeys: { type: "borough" },
      });

      const nearPoint = { latitude: 40.75, longitude: -74.05 };

      const result = await t.query(api.geometry.query.nearest, {
        logLevel: "INFO",
        point: nearPoint,
        maxDistance: 5000,
        limit: 100,
        filtering: [
          { occur: "must", filterKey: "type", filterValue: "borough" },
        ],
      });

      expect(result.results.length).toBe(1);

      const result2 = await t.query(api.geometry.query.nearest, {
        logLevel: "INFO",
        point: nearPoint,
        maxDistance: 5000,
        limit: 100,
        filtering: [{ occur: "must", filterKey: "type", filterValue: "city" }],
      });

      expect(result2.results.length).toBe(0);
    });
  });
});
