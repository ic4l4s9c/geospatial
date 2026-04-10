import type { Point, Polygon, Primitive, Rectangle } from "../../validators.js";

export type GeometryResultMap = {
  polygon: {
    key: string;
    type: "polygon";
    coordinates: Polygon;
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    sortKey: number;
  };
  polyline: {
    key: string;
    type: "polyline";
    coordinates: Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    sortKey: number;
  };
};

export type AnyGeometryResult = GeometryResultMap[keyof GeometryResultMap];

export type GeometryResult<
  T extends "polygon" | "polyline" = "polygon" | "polyline",
> = T extends keyof GeometryResultMap
  ? GeometryResultMap[T]
  : AnyGeometryResult;

export type WithDistance<T> = T & { distance: number };

export type FilterCondition = {
  occur: "must" | "should";
  filterKey: string;
  filterValue: Primitive;
};
