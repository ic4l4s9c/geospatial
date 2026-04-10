import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";
import { modules } from "./test.setup.js";

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

describe("Geometry Storage", () => {
  describe("insert/remove", () => {
    test("insert polygon creates cell index entries", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      const geometry = await t.query(api.geometry.get, { key: "manhattan" });
      expect(geometry).not.toBeNull();
      expect(geometry?.type).toBe("polygon");
      expect(geometry?.boundingBox).toBeDefined();
    });

    test("insert polyline creates cell index entries", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "route",
        type: "polyline",
        coordinates: MANHATTAN_ROUTE,
      });

      const geometry = await t.query(api.geometry.get, { key: "route" });
      expect(geometry).not.toBeNull();
      expect(geometry?.type).toBe("polyline");
    });

    test("remove polygon deletes geometry and cell entries", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      await t.mutation(api.geometry.remove, { key: "manhattan" });

      const geometry = await t.query(api.geometry.get, { key: "manhattan" });
      expect(geometry).toBeNull();
    });

    test("duplicate key throws error", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "manhattan",
        type: "polygon",
        coordinates: MANHATTAN_POLYGON,
      });

      await expect(
        t.mutation(api.geometry.insert, {
          sortKey: 0,
          key: "manhattan",
          type: "polygon",
          coordinates: MANHATTAN_POLYGON,
        }),
      ).rejects.toThrow(/already exists/);
    });

    test("update geometry coordinates re-indexes", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.geometry.insert, {
        sortKey: 0,
        key: "test",
        type: "polygon",
        coordinates: {
          exterior: [
            { latitude: 0, longitude: 0 },
            { latitude: 0, longitude: 1 },
            { latitude: 1, longitude: 1 },
            { latitude: 1, longitude: 0 },
          ],
        },
      });

      await t.mutation(api.geometry.update, {
        key: "test",
        coordinates: {
          exterior: [
            { latitude: 10, longitude: 10 },
            { latitude: 10, longitude: 11 },
            { latitude: 11, longitude: 11 },
            { latitude: 11, longitude: 10 },
          ],
        },
      });

      const geometry = await t.query(api.geometry.get, { key: "test" });
      expect(geometry?.boundingBox.south).toBe(10);
    });
  });
});
