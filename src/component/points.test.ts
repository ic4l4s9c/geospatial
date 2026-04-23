import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "./_generated/api.js";
import schema from "./schema.js";
import { modules } from "./test.setup.js";
import { test as fcTest } from "@fast-check/vitest";
import { arbitraryDocuments } from "../__tests__/fixtures.js";
import type { PointKey } from "./schema.js";

const config = {
  minLevel: 4,
  maxLevel: 16,
  levelMod: 2,
  maxCells: 8,
};

test("CRUD operations", async () => {
  const t = convexTest(schema, modules);
  const document = {
    key: "test" as PointKey,
    coordinates: { latitude: 0, longitude: 0 },
    sortKey: 1,
    filterKeys: {},
  };
  await t.mutation(api.points.insert, {
    document,
    config,
  });
  const result = await t.query(api.points.get, { key: "test" as PointKey });
  expect(result).toEqual(document);

  const newDocument = {
    key: "test" as PointKey,
    coordinates: { latitude: 0, longitude: 0 },
    sortKey: 2,
    filterKeys: {},
  };
  await t.mutation(api.points.insert, {
    document: newDocument,
    config,
  });
  const result2 = await t.query(api.points.get, { key: "test" as PointKey });
  expect(result2).toEqual(newDocument);

  await t.mutation(api.points.del, {
    key: "test" as PointKey,
  });
  const result3 = await t.query(api.points.get, { key: "test" as PointKey });
  expect(result3).toEqual(null);

  await t.run(async (ctx) => {
    const indexEntries = await ctx.db.query("pointCells").collect();
    expect(indexEntries.length).toEqual(0);

    const filterEntries = await ctx.db.query("pointFilters").collect();
    expect(filterEntries.length).toEqual(0);
  });
});

fcTest.prop({ documents: arbitraryDocuments })(
  "insert and delete",
  async ({ documents }) => {
    const t = convexTest(schema, modules);

    const documentsByKey = new Map<PointKey, any>();

    for (const document of documents) {
      await t.mutation(api.points.insert, {
        document: {
          ...document,
          key: document.key as PointKey,
        },
        config,
      });
      const result = await t.query(api.points.get, {
        key: document.key as PointKey,
      });
      expect(result).toEqual(document);
      documentsByKey.set(document.key as PointKey, document);
    }

    for (const [key, document] of documentsByKey) {
      const result = await t.query(api.points.get, { key });
      expect(result).toEqual(document);

      await t.mutation(api.points.del, {
        key,
      });
      const result2 = await t.query(api.points.get, { key });
      expect(result2).toEqual(null);
    }
  },
  10000,
);
