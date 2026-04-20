import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api.js";
import schema from "../schema.js";
import { modules } from "../test.setup.js";

const MANHATTAN_ROUTE = [
  { latitude: 40.71, longitude: -74.01 },
  { latitude: 40.75, longitude: -73.99 },
  { latitude: 40.78, longitude: -73.96 },
];

describe("polyline.measure", () => {
  describe("length", () => {
    test("calculates length of polyline", async () => {
      const t = convexTest(schema, modules);

      const length = await t.query(api.polylines.measure.length, {
        polyline: MANHATTAN_ROUTE,
      });

      expect(length).toBeGreaterThan(7_000);
      expect(length).toBeLessThan(12_000);
    });

    test("calculates length of short segment", async () => {
      const t = convexTest(schema, modules);

      const length = await t.query(api.polylines.measure.length, {
        polyline: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 1 },
        ],
      });

      expect(length).toBeGreaterThan(100_000);
      expect(length).toBeLessThan(120_000);
    });
  });

  describe("centroid", () => {
    test("calculates centroid of polyline", async () => {
      const t = convexTest(schema, modules);

      const centroid = await t.query(api.polylines.measure.centroid, {
        polyline: MANHATTAN_ROUTE,
      });

      expect(centroid.latitude).toBeGreaterThan(40.71);
      expect(centroid.latitude).toBeLessThan(40.78);
      expect(centroid.longitude).toBeGreaterThan(-74.01);
      expect(centroid.longitude).toBeLessThan(-73.96);
    });

    test("calculates centroid of straight line", async () => {
      const t = convexTest(schema, modules);

      const centroid = await t.query(api.polylines.measure.centroid, {
        polyline: [
          { latitude: 0, longitude: 0 },
          { latitude: 0, longitude: 10 },
        ],
      });

      expect(centroid.latitude).toBeCloseTo(0, 1);
      expect(centroid.longitude).toBeCloseTo(5, 1);
    });
  });
});
