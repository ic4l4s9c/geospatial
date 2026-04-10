import { expect, test, describe } from "vitest";
import { S2Bindings } from "./s2Bindings.js";
import { test as fcTest, fc } from "@fast-check/vitest";

test("S2Bindings - coverPolygon basic", async () => {
  const s2 = await S2Bindings.load();

  const points = [
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
    { latitude: 0.5, longitude: 1 },
  ];

  const cells = s2.coverPolygon(points, 4, 16, 2, 8);

  expect(cells.length).toBeGreaterThan(0);
  expect(cells.length).toBeLessThanOrEqual(8);
});

test("S2Bindings - polygonContainsPoint", async () => {
  const s2 = await S2Bindings.load();

  const squarePoints = [
    { latitude: 1, longitude: -1 },
    { latitude: 1, longitude: 1 },
    { latitude: -1, longitude: 1 },
    { latitude: -1, longitude: -1 },
  ];

  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 0, longitude: 0 }),
  ).toBe(true);

  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 0.5, longitude: 0.5 }),
  ).toBe(true);

  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 2, longitude: 2 }),
  ).toBe(false);
  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 0, longitude: 5 }),
  ).toBe(false);
});

test("S2Bindings - polygon with clockwise points normalizes correctly", async () => {
  const s2 = await S2Bindings.load();

  const clockwiseSquare = [
    { latitude: -1, longitude: -1 },
    { latitude: -1, longitude: 1 },
    { latitude: 1, longitude: 1 },
    { latitude: 1, longitude: -1 },
  ];

  expect(
    s2.polygonContainsPoint(clockwiseSquare, { latitude: 0, longitude: 0 }),
  ).toBe(true);
  expect(
    s2.polygonContainsPoint(clockwiseSquare, { latitude: 5, longitude: 5 }),
  ).toBe(false);
});

test("S2Bindings - large polygon covering", async () => {
  const s2 = await S2Bindings.load();

  const numVertices = 100;
  const vertices = [];
  for (let i = 0; i < numVertices; i++) {
    const angle = (2 * Math.PI * i) / numVertices;
    vertices.push({
      latitude: Math.sin(angle) * 0.5,
      longitude: Math.cos(angle) * 0.5,
    });
  }

  const cells = s2.coverPolygon(vertices, 4, 16, 2, 8);

  expect(cells.length).toBeGreaterThan(0);
  expect(cells.length).toBeLessThanOrEqual(8);
});

test("S2Bindings - points near polygon boundary", async () => {
  const s2 = await S2Bindings.load();

  const squarePoints = [
    { latitude: 1, longitude: -1 },
    { latitude: 1, longitude: 1 },
    { latitude: -1, longitude: 1 },
    { latitude: -1, longitude: -1 },
  ];

  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 0.999, longitude: 0 }),
  ).toBe(true);
  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 0, longitude: 0.999 }),
  ).toBe(true);

  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 1.001, longitude: 0 }),
  ).toBe(false);
  expect(
    s2.polygonContainsPoint(squarePoints, { latitude: 0, longitude: 1.001 }),
  ).toBe(false);

  const cornerResult = s2.polygonContainsPoint(squarePoints, {
    latitude: 1,
    longitude: 1,
  });
  expect(typeof cornerResult).toBe("boolean");
});

test("S2Bindings - concave polygon containment", async () => {
  const s2 = await S2Bindings.load();

  const lShape = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 2 },
    { latitude: 1, longitude: 2 },
    { latitude: 1, longitude: 1 },
    { latitude: 2, longitude: 1 },
    { latitude: 2, longitude: 0 },
  ];

  expect(
    s2.polygonContainsPoint(lShape, { latitude: 0.5, longitude: 0.5 }),
  ).toBe(true);
  expect(
    s2.polygonContainsPoint(lShape, { latitude: 0.5, longitude: 1.5 }),
  ).toBe(true);
  expect(
    s2.polygonContainsPoint(lShape, { latitude: 1.5, longitude: 0.5 }),
  ).toBe(true);

  expect(
    s2.polygonContainsPoint(lShape, { latitude: 1.5, longitude: 1.5 }),
  ).toBe(false);

  expect(s2.polygonContainsPoint(lShape, { latitude: 3, longitude: 3 })).toBe(
    false,
  );
});

describe("property-based polygon tests", () => {
  const s2Promise = S2Bindings.load();

  const arbitraryConvexPolygon = fc
    .tuple(
      fc.float({ min: Math.fround(-45), max: Math.fround(45), noNaN: true }),
      fc.float({ min: Math.fround(-90), max: Math.fround(90), noNaN: true }),
      fc.float({ min: Math.fround(0.1), max: Math.fround(5), noNaN: true }),
      fc.integer({ min: 3, max: 20 }),
    )
    .map(
      ([centerLat, centerLng, radius, numVertices]): {
        center: { latitude: number; longitude: number };
        vertices: { latitude: number; longitude: number }[];
        radius: number;
      } => {
        const vertices: { latitude: number; longitude: number }[] = [];
        for (let i = 0; i < numVertices; i++) {
          const angle = (2 * Math.PI * i) / numVertices;
          vertices.push({
            latitude: centerLat + radius * Math.sin(angle) * 0.5,
            longitude: centerLng + radius * Math.cos(angle),
          });
        }
        return {
          center: { latitude: centerLat, longitude: centerLng },
          vertices,
          radius,
        };
      },
    );

  fcTest.prop({ polygon: arbitraryConvexPolygon })(
    "center point is always inside convex polygon",
    async ({ polygon }) => {
      const s2 = await s2Promise;
      const contains = s2.polygonContainsPoint(
        polygon.vertices,
        polygon.center,
      );
      expect(contains).toBe(true);
    },
  );

  fcTest.prop({ polygon: arbitraryConvexPolygon })(
    "far away point is always outside polygon",
    async ({ polygon }) => {
      const s2 = await s2Promise;
      const farPoint = {
        latitude: Math.max(
          -89,
          Math.min(89, polygon.center.latitude + polygon.radius * 3),
        ),
        longitude: polygon.center.longitude + polygon.radius * 3,
      };
      const contains = s2.polygonContainsPoint(polygon.vertices, farPoint);
      expect(contains).toBe(false);
    },
  );

  fcTest.prop({ polygon: arbitraryConvexPolygon })(
    "coverPolygon returns valid cells",
    async ({ polygon }) => {
      const s2 = await s2Promise;
      const cells = s2.coverPolygon(polygon.vertices, 4, 16, 2, 8);

      expect(cells.length).toBeGreaterThan(0);
      expect(cells.length).toBeLessThanOrEqual(8);

      for (const cell of cells) {
        expect(typeof cell).toBe("bigint");
        expect(cell).toBeGreaterThan(0n);
      }
    },
  );
});

test("S2Bindings - coverPolylineBuffered basic", async () => {
  const s2 = await S2Bindings.load();

  const points = [
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
  ];

  const cells = s2.coverPolylineBuffered(points, 10000, 4, 16, 2, 8, 4);

  expect(cells.length).toBeGreaterThan(0);
  expect(cells.length).toBeLessThanOrEqual(100);
});

test("S2Bindings - distanceToPolyline", async () => {
  const s2 = await S2Bindings.load();

  const polylinePoints = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
  ];

  const distanceOnLine = s2.distanceToPolyline(polylinePoints, {
    latitude: 0,
    longitude: 0.5,
  });
  const metersOnLine = s2.chordAngleToMeters(distanceOnLine);
  expect(metersOnLine).toBeLessThan(1);

  const distanceNorth = s2.distanceToPolyline(polylinePoints, {
    latitude: 1,
    longitude: 0.5,
  });
  const metersNorth = s2.chordAngleToMeters(distanceNorth);
  expect(metersNorth).toBeGreaterThan(100000);
  expect(metersNorth).toBeLessThan(120000);
});

test("S2Bindings - distanceToPolyline at endpoints", async () => {
  const s2 = await S2Bindings.load();

  const polylinePoints = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
  ];

  const distanceBeyond = s2.distanceToPolyline(polylinePoints, {
    latitude: 0,
    longitude: 2,
  });
  const metersBeyond = s2.chordAngleToMeters(distanceBeyond);

  expect(metersBeyond).toBeGreaterThan(100000);
  expect(metersBeyond).toBeLessThan(120000);
});

test("S2Bindings - distanceToPolyline multi-segment", async () => {
  const s2 = await S2Bindings.load();

  const polylinePoints = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 1, longitude: 1 },
  ];

  const distance = s2.distanceToPolyline(polylinePoints, {
    latitude: 0.5,
    longitude: 1,
  });
  const meters = s2.chordAngleToMeters(distance);
  expect(meters).toBeLessThan(1);
});

describe("property-based polyline tests", () => {
  const s2Promise = S2Bindings.load();

  const arbitraryPolyline = fc
    .tuple(
      fc.float({ min: Math.fround(-45), max: Math.fround(45), noNaN: true }),
      fc.float({ min: Math.fround(-90), max: Math.fround(90), noNaN: true }),
      fc.integer({ min: 2, max: 20 }),
    )
    .map(
      ([centerLat, centerLng, numPoints]): {
        points: { latitude: number; longitude: number }[];
        center: { latitude: number; longitude: number };
      } => {
        const points: { latitude: number; longitude: number }[] = [];
        for (let i = 0; i < numPoints; i++) {
          points.push({
            latitude: centerLat + i * 0.1,
            longitude: centerLng + i * 0.1,
          });
        }
        return {
          points,
          center: { latitude: centerLat, longitude: centerLng },
        };
      },
    );

  fcTest.prop({ polyline: arbitraryPolyline })(
    "coverPolylineBuffered returns valid cells",
    async ({ polyline }) => {
      const s2 = await s2Promise;
      const cells = s2.coverPolylineBuffered(
        polyline.points,
        10000,
        4,
        16,
        2,
        8,
        4,
      );

      expect(cells.length).toBeGreaterThan(0);
      expect(cells.length).toBeLessThanOrEqual(200);

      for (const cell of cells) {
        expect(typeof cell).toBe("bigint");
        expect(cell).toBeGreaterThan(0n);
      }
    },
  );

  fcTest.prop({ polyline: arbitraryPolyline })(
    "point on first vertex has zero distance",
    async ({ polyline }) => {
      const s2 = await s2Promise;
      const firstPoint = polyline.points[0];
      const distance = s2.distanceToPolyline(polyline.points, firstPoint);
      const meters = s2.chordAngleToMeters(distance);
      expect(meters).toBeLessThan(1);
    },
  );
});
