import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api } from "../_generated/api.js";
import schema from "../schema.js";
import { modules } from "../test.setup.js";
import type { FunctionReturnType } from "convex/server";

type ExecuteResult = FunctionReturnType<typeof api.point.query.execute>;

const opts = {
  minLevel: 4,
  maxLevel: 16,
  levelMod: 2,
  maxCells: 8,
};

test("polygon query - triangle", async () => {
  const t = convexTest(schema, modules);

  const trianglePolygon = {
    exterior: [
      { latitude: 1, longitude: 0 },
      { latitude: 0, longitude: 1 },
      { latitude: -1, longitude: 0 },
    ],
  };

  const points = [
    {
      key: "inside1",
      coordinates: { latitude: 0, longitude: 0.3 },
      sortKey: 1,
      filterKeys: {},
    },
    {
      key: "inside2",
      coordinates: { latitude: 0.2, longitude: 0.2 },
      sortKey: 2,
      filterKeys: {},
    },
    {
      key: "outside1",
      coordinates: { latitude: 2, longitude: 2 },
      sortKey: 3,
      filterKeys: {},
    },
    {
      key: "outside2",
      coordinates: { latitude: -2, longitude: -2 },
      sortKey: 4,
      filterKeys: {},
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polygon", polygon: trianglePolygon },
      filtering: [],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toEqual(["inside1", "inside2"]);
});

test("polygon query - square region", async () => {
  const t = convexTest(schema, modules);

  const squarePolygon = {
    exterior: [
      { latitude: 1, longitude: -1 },
      { latitude: 1, longitude: 1 },
      { latitude: -1, longitude: 1 },
      { latitude: -1, longitude: -1 },
    ],
  };

  const points = [
    {
      key: "center",
      coordinates: { latitude: 0, longitude: 0 },
      sortKey: 1,
      filterKeys: {},
    },
    {
      key: "corner",
      coordinates: { latitude: 0.9, longitude: 0.9 },
      sortKey: 2,
      filterKeys: {},
    },
    {
      key: "outside",
      coordinates: { latitude: 2, longitude: 0 },
      sortKey: 3,
      filterKeys: {},
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polygon", polygon: squarePolygon },
      filtering: [],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toEqual(["center", "corner"]);
});

test("polygon query - with filtering", async () => {
  const t = convexTest(schema, modules);

  const polygon = {
    exterior: [
      { latitude: 1, longitude: -1 },
      { latitude: 1, longitude: 1 },
      { latitude: -1, longitude: 1 },
      { latitude: -1, longitude: -1 },
    ],
  };

  const points = [
    {
      key: "coffee1",
      coordinates: { latitude: 0, longitude: 0 },
      sortKey: 1,
      filterKeys: { category: "coffee" },
    },
    {
      key: "coffee2",
      coordinates: { latitude: 0.5, longitude: 0.5 },
      sortKey: 2,
      filterKeys: { category: "coffee" },
    },
    {
      key: "tea1",
      coordinates: { latitude: -0.5, longitude: -0.5 },
      sortKey: 3,
      filterKeys: { category: "tea" },
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polygon", polygon },
      filtering: [
        { occur: "must", filterKey: "category", filterValue: "coffee" },
      ],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toEqual(["coffee1", "coffee2"]);
});

test("polygon query - concave L-shape", async () => {
  const t = convexTest(schema, modules);

  const lShapePolygon = {
    exterior: [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 2 },
      { latitude: 1, longitude: 2 },
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 1 },
      { latitude: 2, longitude: 0 },
    ],
  };

  const points = [
    {
      key: "in_bottom",
      coordinates: { latitude: 0.5, longitude: 1.5 },
      sortKey: 1,
      filterKeys: {},
    },
    {
      key: "in_left",
      coordinates: { latitude: 1.5, longitude: 0.5 },
      sortKey: 2,
      filterKeys: {},
    },
    {
      key: "in_notch",
      coordinates: { latitude: 1.5, longitude: 1.5 },
      sortKey: 3,
      filterKeys: {},
    },
    {
      key: "outside",
      coordinates: { latitude: 3, longitude: 3 },
      sortKey: 4,
      filterKeys: {},
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polygon", polygon: lShapePolygon },
      filtering: [],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toEqual(["in_bottom", "in_left"]);
});

test("polygon query - pagination with cursor", async () => {
  const t = convexTest(schema, modules);

  const squarePolygon = {
    exterior: [
      { latitude: 1, longitude: -1 },
      { latitude: 1, longitude: 1 },
      { latitude: -1, longitude: 1 },
      { latitude: -1, longitude: -1 },
    ],
  };

  const numPoints = 10;
  for (let i = 0; i < numPoints; i++) {
    await t.mutation(api.point.insert, {
      document: {
        key: `point_${i}`,
        coordinates: {
          latitude: (i / numPoints) * 1.5 - 0.75,
          longitude: (i / numPoints) * 1.5 - 0.75,
        },
        sortKey: i,
        filterKeys: {},
      },
      ...opts,
    });
  }

  const pageSize = 3;
  const allResults: string[] = [];
  let nextCursor: string | undefined = undefined;

  for (let page = 0; page < 5; page++) {
    const result: ExecuteResult = await t.query(api.point.query.execute, {
      query: {
        shape: { type: "polygon" as const, polygon: squarePolygon },
        filtering: [] as {
          occur: "should" | "must";
          filterKey: string;
          filterValue: string;
        }[],
        sorting: { interval: {} },
        maxResults: pageSize,
      },
      cursor: nextCursor,
      ...opts,
      logLevel: "INFO" as const,
    });

    for (const r of result.results) {
      if (!allResults.includes(r.key)) {
        allResults.push(r.key);
      }
    }

    if (!result.nextCursor) {
      break;
    }
    nextCursor = result.nextCursor;
  }

  expect(allResults.length).toBe(numPoints);
});

test("polygon query - large polygon with many vertices", async () => {
  const t = convexTest(schema, modules);

  const numVertices = 60;
  const radius = 1;
  const center = { latitude: 0, longitude: 0 };
  const circleVertices = [];

  for (let i = 0; i < numVertices; i++) {
    const angle = (2 * Math.PI * i) / numVertices;
    circleVertices.push({
      latitude: center.latitude + radius * Math.sin(angle),
      longitude: center.longitude + radius * Math.cos(angle),
    });
  }

  const circlePolygon = { exterior: circleVertices };

  const points = [
    {
      key: "center",
      coordinates: { latitude: 0, longitude: 0 },
      sortKey: 1,
      filterKeys: {},
    },
    {
      key: "near_edge",
      coordinates: { latitude: 0.5, longitude: 0 },
      sortKey: 2,
      filterKeys: {},
    },
    {
      key: "outside",
      coordinates: { latitude: 2, longitude: 0 },
      sortKey: 3,
      filterKeys: {},
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polygon", polygon: circlePolygon },
      filtering: [],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toEqual(["center", "near_edge"]);
});

test("polyline query - points within buffer distance are returned", async () => {
  const t = convexTest(schema, modules);

  const polyline = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
  ];

  const bufferMeters = 100000;

  const points = [
    {
      key: "on_line",
      coordinates: { latitude: 0, longitude: 0.5 },
      sortKey: 1,
      filterKeys: {},
    },
    {
      key: "close_north",
      coordinates: { latitude: 0.5, longitude: 0.5 },
      sortKey: 2,
      filterKeys: {},
    },
    {
      key: "far_north",
      coordinates: { latitude: 5, longitude: 0.5 },
      sortKey: 3,
      filterKeys: {},
    },
    {
      key: "far_away",
      coordinates: { latitude: 10, longitude: 10 },
      sortKey: 4,
      filterKeys: {},
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polyline", polyline, bufferMeters },
      filtering: [],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toContain("on_line");
  expect(keys).toContain("close_north");
  expect(keys).not.toContain("far_north");
  expect(keys).not.toContain("far_away");
});

test("polyline query - single segment (2 points)", async () => {
  const t = convexTest(schema, modules);

  const polyline = [
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  ];

  const bufferMeters = 100000;

  const points = [
    {
      key: "midpoint",
      coordinates: { latitude: 0.5, longitude: 0 },
      sortKey: 1,
      filterKeys: {},
    },
    {
      key: "endpoint1",
      coordinates: { latitude: 0, longitude: 0 },
      sortKey: 2,
      filterKeys: {},
    },
    {
      key: "outside",
      coordinates: { latitude: 5, longitude: 5 },
      sortKey: 3,
      filterKeys: {},
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polyline", polyline, bufferMeters },
      filtering: [],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toContain("midpoint");
  expect(keys).toContain("endpoint1");
  expect(keys).not.toContain("outside");
});

test("polyline query - multi-segment polyline", async () => {
  const t = convexTest(schema, modules);

  const polyline = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 1, longitude: 1 },
  ];

  const bufferMeters = 100000;

  const points = [
    {
      key: "on_first_segment",
      coordinates: { latitude: 0, longitude: 0.5 },
      sortKey: 1,
      filterKeys: {},
    },
    {
      key: "on_second_segment",
      coordinates: { latitude: 0.5, longitude: 1 },
      sortKey: 2,
      filterKeys: {},
    },
    {
      key: "at_corner",
      coordinates: { latitude: 0, longitude: 1 },
      sortKey: 3,
      filterKeys: {},
    },
    {
      key: "outside",
      coordinates: { latitude: 10, longitude: 10 },
      sortKey: 4,
      filterKeys: {},
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polyline", polyline, bufferMeters },
      filtering: [],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toContain("on_first_segment");
  expect(keys).toContain("on_second_segment");
  expect(keys).toContain("at_corner");
  expect(keys).not.toContain("outside");
});

test("polyline query - with filters", async () => {
  const t = convexTest(schema, modules);

  const polyline = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
  ];

  const bufferMeters = 100000;

  const points = [
    {
      key: "gas1",
      coordinates: { latitude: 0, longitude: 0.3 },
      sortKey: 1,
      filterKeys: { category: "gas" },
    },
    {
      key: "gas2",
      coordinates: { latitude: 0, longitude: 0.7 },
      sortKey: 2,
      filterKeys: { category: "gas" },
    },
    {
      key: "food1",
      coordinates: { latitude: 0, longitude: 0.5 },
      sortKey: 3,
      filterKeys: { category: "food" },
    },
  ];

  for (const point of points) {
    await t.mutation(api.point.insert, {
      document: point,
      ...opts,
    });
  }

  const result = await t.query(api.point.query.execute, {
    query: {
      shape: { type: "polyline", polyline, bufferMeters },
      filtering: [{ occur: "must", filterKey: "category", filterValue: "gas" }],
      sorting: { interval: {} },
      maxResults: 10,
    },
    ...opts,
    logLevel: "INFO",
  });

  const keys = result.results.map((r) => r.key).sort();
  expect(keys).toEqual(["gas1", "gas2"]);
});

test("polyline query - pagination with cursor", async () => {
  const t = convexTest(schema, modules);

  const polyline = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 2 },
  ];

  const bufferMeters = 100000;

  const numPoints = 10;
  for (let i = 0; i < numPoints; i++) {
    await t.mutation(api.point.insert, {
      document: {
        key: `point_${i}`,
        coordinates: { latitude: 0, longitude: i * 0.2 },
        sortKey: i,
        filterKeys: {},
      },
      ...opts,
    });
  }

  const pageSize = 3;
  const allResults: string[] = [];
  let nextCursor: string | undefined = undefined;

  for (let page = 0; page < 5; page++) {
    const result: ExecuteResult = await t.query(api.point.query.execute, {
      query: {
        shape: { type: "polyline" as const, polyline, bufferMeters },
        filtering: [] as {
          occur: "should" | "must";
          filterKey: string;
          filterValue: string;
        }[],
        sorting: { interval: {} },
        maxResults: pageSize,
      },
      cursor: nextCursor,
      ...opts,
      logLevel: "INFO" as const,
    });

    for (const r of result.results) {
      if (!allResults.includes(r.key)) {
        allResults.push(r.key);
      }
    }

    if (!result.nextCursor) {
      break;
    }
    nextCursor = result.nextCursor;
  }

  expect(allResults.length).toBe(numPoints);
});
