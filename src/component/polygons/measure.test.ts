import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api.js";
import schema from "../schema.js";
import { modules } from "../test.setup.js";

const NYC_SQUARE = {
  exterior: [
    { latitude: 40.7, longitude: -74.0 },
    { latitude: 40.7, longitude: -73.99 },
    { latitude: 40.71, longitude: -73.99 },
    { latitude: 40.71, longitude: -74.0 },
  ],
};

const TEXAS_POLYGON = {
  exterior: [
    { latitude: 25.8, longitude: -106.6 },
    { latitude: 25.8, longitude: -93.5 },
    { latitude: 36.5, longitude: -100.0 },
  ],
};

describe("polygon.measure", () => {
  describe("area", () => {
    test("calculates area of small polygon", async () => {
      const t = convexTest(schema, modules);

      const area = await t.query(api.polygons.measure.area, {
        polygon: NYC_SQUARE,
      });

      expect(area).toBeGreaterThan(800_000);
      expect(area).toBeLessThan(1_500_000);
    });

    test("calculates area of large polygon", async () => {
      const t = convexTest(schema, modules);

      const area = await t.query(api.polygons.measure.area, {
        polygon: TEXAS_POLYGON,
      });

      expect(area).toBeGreaterThan(500_000_000_000);
      expect(area).toBeLessThan(1_000_000_000_000);
    });
  });

  describe("perimeter", () => {
    test("calculates perimeter of polygon", async () => {
      const t = convexTest(schema, modules);

      const perimeter = await t.query(api.polygons.measure.perimeter, {
        polygon: NYC_SQUARE,
      });

      expect(perimeter).toBeGreaterThan(3_000);
      expect(perimeter).toBeLessThan(5_000);
    });
  });

  describe("centroid", () => {
    test("calculates centroid of symmetric polygon", async () => {
      const t = convexTest(schema, modules);

      const centroid = await t.query(api.polygons.measure.centroid, {
        polygon: NYC_SQUARE,
      });

      expect(centroid.latitude).toBeCloseTo(40.705, 2);
      expect(centroid.longitude).toBeCloseTo(-73.995, 2);
    });

    test("calculates centroid of triangle", async () => {
      const t = convexTest(schema, modules);

      const centroid = await t.query(api.polygons.measure.centroid, {
        polygon: {
          exterior: [
            { latitude: 0, longitude: 0 },
            { latitude: 0, longitude: 3 },
            { latitude: 3, longitude: 0 },
          ],
        },
      });

      expect(centroid.latitude).toBeCloseTo(1, 1);
      expect(centroid.longitude).toBeCloseTo(1, 1);
    });
  });
});
