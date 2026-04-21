import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { test as fcTest } from "@fast-check/vitest";
import { arbitraryDocuments } from "../../__tests__/fixtures.js";
import schema from "../schema.js";
import { modules } from "../test.setup.js";
import { S2Bindings } from "./s2Bindings.js";
import { ClosestPointQuery } from "./closestPointQuery.js";
import { createLogger } from "./logging.js";
import { api } from "../_generated/api.js";

const config = {
  minLevel: 4,
  maxLevel: 16,
  levelMod: 2,
  maxCells: 8,
};

test("closest point query - basic functionality", async () => {
  const t = convexTest(schema, modules);
  const s2 = await S2Bindings.load();
  const logger = createLogger("INFO");

  // Insert some test points
  const points = [
    {
      key: "point1",
      coordinates: { latitude: 0, longitude: 0 },
      sortKey: 1,
      filterKeys: { category: "coffee" },
    },
    {
      key: "point2",
      coordinates: { latitude: 1, longitude: 1 },
      sortKey: 2,
      filterKeys: { category: "tea" },
    },
    {
      key: "point3",
      coordinates: { latitude: -1, longitude: -1 },
      sortKey: 3,
      filterKeys: { category: "coffee" },
    },
  ];

  // Insert all points
  for (const point of points) {
    await t.mutation(api.points.insert, {
      document: point,
      config,
    });
  }

  await t.run(async (ctx) => {
    // Test finding closest point to origin
    const query1 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      1000, // maxDistance in meters
      1, // limit
      config.minLevel,
      config.maxLevel,
      config.levelMod,
    );
    const result1 = await query1.execute(ctx);
    expect(result1.page.length).toBe(1);
    expect(result1.page[0].key).toBe("point1");
    expect(result1.page[0].distance).toBeLessThan(1);

    // Test finding closest points to (1,1)
    const query2 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 1, longitude: 1 },
      10000000,
      2,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
    );
    const result2 = await query2.execute(ctx);
    expect(result2.page.length).toBe(2);
    expect(result2.page[0].key).toBe("point2");
    expect(result2.page[1].key).toBe("point1");
    expect(result2.page[0].distance).toBeLessThan(result2.page[1].distance);

    // Test maxDistance constraint
    const query3 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      50, // Small radius in meters
      10,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
    );
    const result3 = await query3.execute(ctx);
    expect(result3.page.length).toBe(1);
    expect(result3.page[0].key).toBe("point1");

    // Test 'must' filter
    const query4 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      10000000,
      3,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
      [
        {
          occur: "must",
          filterKey: "category",
          filterValue: "coffee",
        },
      ],
    );
    const result4 = await query4.execute(ctx);
    expect(result4.page.length).toBe(2);
    expect(result4.page.map((r) => r.key).sort()).toEqual(["point1", "point3"]);

    // Test 'should' filter (must match at least one)
    const query5 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      10000000,
      3,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
      [
        {
          occur: "should",
          filterKey: "category",
          filterValue: "tea",
        },
      ],
    );
    const result5 = await query5.execute(ctx);
    expect(result5.page.length).toBe(1);
    expect(result5.page[0].key).toBe("point2");

    // Test sort key interval
    const query6 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      10000000,
      3,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
      [],
      { startInclusive: 3 },
    );
    const result6 = await query6.execute(ctx);
    expect(result6.page.length).toBe(1);
    expect(result6.page[0].key).toBe("point3");

    // Test multiple 'should' filters
    const query7 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      10000000,
      3,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
      [
        {
          occur: "should",
          filterKey: "category",
          filterValue: "tea",
        },
        {
          occur: "should",
          filterKey: "category",
          filterValue: "coffee",
        },
      ],
    );
    const result7 = await query7.execute(ctx);
    expect(result7.page.length).toBe(3);
    expect(new Set(result7.page.map((r) => r.key))).toEqual(
      new Set(["point1", "point2", "point3"]),
    );
  });
});

test("closest point query - cursor pagination", async () => {
  const t = convexTest(schema, modules);
  const s2 = await S2Bindings.load();
  const logger = createLogger("INFO");

  const points = [
    {
      key: "p0",
      coordinates: { latitude: 0, longitude: 0 },
      sortKey: 1,
      filterKeys: { category: "a" },
    },
    {
      key: "p1",
      coordinates: { latitude: 0.01, longitude: 0 },
      sortKey: 2,
      filterKeys: { category: "a" },
    },
    {
      key: "p2",
      coordinates: { latitude: 0.02, longitude: 0 },
      sortKey: 3,
      filterKeys: { category: "a" },
    },
    {
      key: "p3",
      coordinates: { latitude: 0.03, longitude: 0 },
      sortKey: 4,
      filterKeys: { category: "a" },
    },
    {
      key: "p4",
      coordinates: { latitude: 0.04, longitude: 0 },
      sortKey: 5,
      filterKeys: { category: "a" },
    },
  ];

  for (const point of points) {
    await t.mutation(api.points.insert, { document: point, config });
  }

  await t.run(async (ctx) => {
    const query1 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      10000000,
      3,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
    );
    const result1 = await query1.execute(ctx);
    expect(result1.page.length).toBe(3);
    expect(result1.page[0].key).toBe("p0");
    expect(result1.page[1].key).toBe("p1");
    expect(result1.page[2].key).toBe("p2");
    expect(result1.continueCursor).toBeDefined();

    const query2 = new ClosestPointQuery(
      s2,
      logger,
      { latitude: 0, longitude: 0 },
      10000000,
      3,
      config.minLevel,
      config.maxLevel,
      config.levelMod,
      [],
      {},
      result1.continueCursor,
    );
    const result2 = await query2.execute(ctx);
    expect(result2.page.length).toBe(2);
    expect(result2.page[0].key).toBe("p3");
    expect(result2.page[1].key).toBe("p4");
    expect(result2.continueCursor).toBe("");

    const allKeys = [...result1.page, ...result2.page].map((p) => p.key);
    expect(new Set(allKeys)).toEqual(new Set(["p0", "p1", "p2", "p3", "p4"]));
  });
});

fcTest.prop({ documents: arbitraryDocuments })(
  "closest point query - property based testing",
  async ({ documents }) => {
    const t = convexTest(schema, modules);
    const s2 = await S2Bindings.load();
    const logger = createLogger("INFO");

    // Insert all documents
    for (const document of documents) {
      await t.mutation(api.points.insert, {
        document,
        config,
      });
    }

    await t.run(async (ctx) => {
      const testPoint = { latitude: 0, longitude: 0 };
      const query = new ClosestPointQuery(
        s2,
        logger,
        testPoint,
        1000,
        documents.length,
        config.minLevel,
        config.maxLevel,
        config.levelMod,
      );
      const results = await query.execute(ctx);

      for (let i = 1; i < results.page.length; i++) {
        expect(results.page[i - 1].distance).toBeLessThanOrEqual(
          results.page[i].distance,
        );
      }

      for (const result of results.page) {
        expect(result.distance).toBeLessThanOrEqual(1000);
      }
    });
  },
  10000,
);
