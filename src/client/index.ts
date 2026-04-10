import type {
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import type {
  Point,
  Polygon,
  Polyline,
  Primitive,
  QueryShape,
  Rectangle,
} from "../component/validators.js";
import { LOG_LEVELS, type LogLevel } from "../component/lib/logging.js";
import {
  FilterBuilderImpl,
  type GeospatialQuery,
  type GeospatialFilterBuilder,
  type GeospatialFilterExpression,
} from "./query.js";
import type { ComponentApi } from "../component/_generated/component.js";

export type { Point, Polygon, Polyline, Primitive, GeospatialQuery, Rectangle };
export { MIN_CELL_LEVEL, MAX_CELL_LEVEL } from "../component/lib/s2Bindings.js";

declare global {
  const Convex: Record<string, unknown>;
}
if (typeof Convex === "undefined") {
  throw new Error(
    "this is Convex backend code, but it's running somewhere else!",
  );
}

export const DEFAULT_MIN_LEVEL = 4;
export const DEFAULT_MAX_LEVEL = 16;
export const DEFAULT_MAX_CELLS = 8;
export const DEFAULT_LEVEL_MOD = 2;

export type GeospatialFilters = Record<string, Primitive | Primitive[]>;
export type PointGeometry<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = {
  key: Key;
  type: "point";
  coordinates: Point;
  filterKeys: Filters;
  sortKey: number;
};

export type PolygonGeometry<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = {
  key: Key;
  type: "polygon";
  coordinates: Polygon;
  boundingBox: Rectangle;
  filterKeys: Filters;
  sortKey: number;
};

export type PolylineGeometry<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = {
  key: Key;
  type: "polyline";
  coordinates: Polyline;
  boundingBox: Rectangle;
  filterKeys: Filters;
  sortKey: number;
};

export type GeospatialGeometry<
  Type extends "point" | "polygon" | "polyline" =
    | "point"
    | "polygon"
    | "polyline",
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = Type extends "point"
  ? PointGeometry<Key, Filters>
  : Type extends "polygon"
    ? PolygonGeometry<Key, Filters>
    : Type extends "polyline"
      ? PolylineGeometry<Key, Filters>
      :
          | PointGeometry<Key, Filters>
          | PolygonGeometry<Key, Filters>
          | PolylineGeometry<Key, Filters>;

export type WithDistance<Type> = Type & {
  distance: number;
};

export type NearestQueryOptions<
  Type extends "point" | "polygon" | "polyline",
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = {
  point: Point;
  limit: number;
  maxDistance?: number;
  filter?: NonNullable<
    GeospatialQuery<GeospatialGeometry<Type, Key, Filters>>["filter"]
  >;
  cursor?: string;
};

export interface GeospatialIndexOptions {
  /**
   * The minimum S2 cell level to use when querying. Defaults to 4.
   */
  readonly minLevel?: number;
  /**
   * The maximum S2 cell level to use when querying. Defaults to 16.
   */
  readonly maxLevel?: number;
  /**
   * The distance between levels when indexing, implying a branching factor of `4^levelMod`. Defaults to 2.
   */
  readonly levelMod?: number;
  /**
   * The maximum number of cells to use when querying. Defaults to 8.
   */
  readonly maxCells?: number;
  /**
   * The log level to use when logging. Defaults to the `GEOSPATIAL_LOG_LEVEL` environment variable, or "INFO" if not set.
   */
  readonly logLevel?: LogLevel;
}

export interface GeospatialIndexCore extends Required<GeospatialIndexOptions> {
  readonly component: ComponentApi;
}

export class PointsNamespace<
  PointKey extends string,
  PointFilters extends GeospatialFilters,
> {
  constructor(private core: GeospatialIndexCore) {}

  /**
   * Insert a new key-coordinate pair into the index.
   *
   * @param ctx        - The Convex mutation context.
   * @param key        - The unique string key to associate with the coordinate.
   * @param point      - The geographic coordinate `{ latitude, longitude }`.
   * @param filterKeys - The filter keys to associate with the key.
   * @param sortKey    - Sort key for ordering results, defaults to a random number.
   */
  async insert(
    ctx: MutationCtx,
    key: PointKey,
    point: Point,
    filterKeys?: PointFilters,
    sortKey?: number,
  ): Promise<void> {
    await ctx.runMutation(this.core.component.point.insert, {
      document: {
        key,
        coordinates: point,
        filterKeys,
        sortKey: sortKey ?? Math.random(),
      },
      minLevel: this.core.minLevel,
      maxLevel: this.core.maxLevel,
      levelMod: this.core.levelMod,
      maxCells: this.core.maxCells,
    });
  }

  /**
   * Retrieve the document associated with a specific key.
   *
   * @param ctx - The Convex query context.
   * @param key - The unique string key to look up.
   * @returns The document, or `null` if the key is not found.
   */
  async get(
    ctx: QueryCtx,
    key: PointKey,
  ): Promise<GeospatialGeometry<"point", PointKey, PointFilters> | null> {
    const result = await ctx.runQuery(this.core.component.point.get, {
      key,
    });
    return result as
      | (typeof result & GeospatialGeometry<"point", PointKey, PointFilters>)
      | null;
  }

  /**
   * Update an existing key's coordinates, filter keys, or sort key.
   * Only the fields provided will change; omitted fields keep their
   * existing values.
   *
   * @param ctx        - The Convex mutation context.
   * @param key        - The unique string key to update.
   * @param point      - New geographic coordinate `{ latitude, longitude }`,
   *                     keeps existing if omitted.
   * @param filterKeys - New filter keys to associate with the key, keeps
   *                     existing if omitted. All filter keys must be provided
   *                     together when updating — partial filter key updates
   *                     are not supported.
   * @param sortKey    - New sort key, keeps existing if omitted.
   * @returns `true` if the key existed and was updated, `false` otherwise.
   */
  async update(
    ctx: MutationCtx,
    key: PointKey,
    point?: Point,
    filterKeys?: PointFilters,
    sortKey?: number,
  ): Promise<boolean> {
    return await ctx.runMutation(this.core.component.point.update, {
      key,
      coordinates: point,
      filterKeys,
      sortKey,
      minLevel: this.core.minLevel,
      maxLevel: this.core.maxLevel,
      levelMod: this.core.levelMod,
      maxCells: this.core.maxCells,
    });
  }

  /**
   * Remove a key-coordinate pair from the index.
   *
   * @param ctx - The Convex mutation context.
   * @param key - The unique string key to remove.
   * @returns `true` if the key was found and removed, `false` otherwise.
   */
  async remove(ctx: MutationCtx, key: PointKey): Promise<boolean> {
    return await ctx.runMutation(this.core.component.point.remove, {
      key,
      minLevel: this.core.minLevel,
      maxLevel: this.core.maxLevel,
      levelMod: this.core.levelMod,
      maxCells: this.core.maxCells,
    });
  }

  /**
   * Query for keys within a given shape.
   *
   * @param ctx    - The Convex query context.
   * @param query  - The query to execute.
   * @returns Matching key-coordinate pairs and an optional continuation cursor.
   */
  async query(
    ctx: QueryCtx,
    query: GeospatialQuery<GeospatialGeometry<"point", PointKey, PointFilters>>,
  ): Promise<{
    results: { key: PointKey; coordinates: Point }[];
    nextCursor?: string;
  }> {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialGeometry<"point", PointKey, PointFilters>
    >();
    if (query.filter) {
      query.filter(filterBuilder);
    }
    const result = await ctx.runQuery(this.core.component.point.query.execute, {
      query: {
        shape: query.shape,
        filtering: filterBuilder.filterConditions,
        sorting: { interval: filterBuilder.interval ?? {} },
        maxResults: query.limit ?? 64,
      },
      cursor: query.cursor,
      minLevel: this.core.minLevel,
      maxLevel: this.core.maxLevel,
      levelMod: this.core.levelMod,
      maxCells: this.core.maxCells,
      logLevel: this.core.logLevel,
    });

    return result as typeof result & {
      results: { key: PointKey; coordinates: Point }[];
      nextCursor?: string;
    };
  }

  /**
   * Find the nearest points to a given location.
   *
   * @param ctx     - The Convex query context.
   * @param options - Query parameters including point, limit, and optional maxDistance.
   * @returns Key-coordinate pairs with their distance from the query point in meters.
   */

  async nearest(
    ctx: QueryCtx,
    options: NearestQueryOptions<"point", PointKey, PointFilters>,
  ): Promise<{
    results: WithDistance<
      GeospatialGeometry<"point", PointKey, PointFilters>
    >[];
    nextCursor?: string;
  }> {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialGeometry<"point", PointKey, PointFilters>
    >();
    if (options.filter) {
      options.filter(filterBuilder);
    }

    const result = await ctx.runQuery(
      this.core.component.point.query.nearest,
      {
        point: options.point,
        maxDistance: options.maxDistance,
        maxResults: options.limit,
        minLevel: this.core.minLevel,
        maxLevel: this.core.maxLevel,
        levelMod: this.core.levelMod,
        logLevel: this.core.logLevel,
        filtering: filterBuilder.filterConditions,
        sorting: { interval: filterBuilder.interval ?? {} },
        cursor: options.cursor,
      },
    );

    return result as typeof result & {
      results: WithDistance<
        GeospatialGeometry<"point", PointKey, PointFilters>
      >[];
      nextCursor?: string;
    };
  }
}

export class PolygonsNamespace<
  PolygonKey extends string,
  PolygonFilters extends GeospatialFilters,
> {
  constructor(private core: GeospatialIndexCore) {}

  /**
   * Insert a polygon into the spatial index.
   *
   * @note Polygon holes are not supported in v1. Use multiple non-overlapping
   *       polygons as a workaround.
   *
   * @param ctx        - The Convex mutation context.
   * @param key        - The unique string key to associate with the polygon.
   * @param polygon    - The polygon geometry with exterior ring.
   * @param filterKeys - Optional filter keys for querying.
   * @param sortKey    - Optional sort key for ordering results.
   */
  async insert(
    ctx: MutationCtx,
    key: PolygonKey,
    polygon: Polygon,
    filterKeys?: PolygonFilters,
    sortKey?: number,
  ): Promise<void> {
    await ctx.runMutation(this.core.component.geometry.insert, {
      key,
      type: "polygon",
      coordinates: polygon,
      filterKeys,
      sortKey: sortKey ?? Math.random(),
    });
  }

  /**
   * Get a polygon by key.
   *
   * @param ctx - The Convex query context.
   * @param key - The unique string key to retrieve.
   * @returns The stored polygon or `null` if not found.
   */
  async get(
    ctx: QueryCtx,
    key: PolygonKey,
  ): Promise<GeospatialGeometry<"polygon", PolygonKey, PolygonFilters> | null> {
    const result = await ctx.runQuery(this.core.component.geometry.get, {
      key,
    });

    return result as
      | (typeof result &
          GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>)
      | null;
  }

  /**
   * Update a polygon's coordinates or metadata.
   *
   * @param ctx     - The Convex mutation context.
   * @param key     - The unique string key of the polygon to update.
   * @param polygon - New polygon geometry, triggers re-indexing when provided.
   * @param filterKeys - New filter keys.
   * @param sortKey   - New sort key.
   */
  async update(
    ctx: MutationCtx,
    key: PolygonKey,
    polygon?: Polygon,
    filterKeys?: PolygonFilters,
    sortKey?: number,
  ): Promise<boolean> {
    return await ctx.runMutation(this.core.component.geometry.update, {
      key,
      coordinates: polygon,
      filterKeys,
      sortKey,
    });
  }

  /**
   * Remove a polygon from the spatial index.
   *
   * @param ctx - The Convex mutation context.
   * @param key - The unique string key of the polygon to remove.
   */
  async remove(ctx: MutationCtx, key: PolygonKey): Promise<boolean> {
    return await ctx.runMutation(this.core.component.geometry.remove, { key });
  }

  /**
   * Find all polygons that contain a given point.
   *
   * @param ctx    - The Convex query context.
   * @param point  - The geographic point to check.
   * @param options - Optional query options: filterKeys, limit, cursor.
   * @returns Results array and an optional continuation cursor.
   *
   * @example
   * const { results, nextCursor } = await geo.polygons.contains(ctx,
   *   { latitude: 40.7128, longitude: -74.0060 },
   *   { filter: (q) => q.eq("type", "delivery-zone"), limit: 10 }
   * );
   */
  async contains(
    ctx: QueryCtx,
    point: Point,
    options?: {
      filter?: (
        q: GeospatialFilterBuilder<
          GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
        >,
      ) => GeospatialFilterExpression<
        GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
      >;
      limit?: number;
      cursor?: string;
    },
  ): Promise<{
    results: GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>[];
    nextCursor?: string;
  }> {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
    >();
    if (options?.filter) {
      options.filter(filterBuilder);
    }

    const result = await ctx.runQuery(
      this.core.component.polygon.query.contains,
      {
        point,
        filtering: filterBuilder.filterConditions,
        limit: options?.limit,
        cursor: options?.cursor,
      },
    );
    return result as typeof result & {
      results: GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>[];
      nextCursor?: string;
    };
  }

  /**
   * Find all polygons that intersect a given shape.
   *
   * @param ctx    - The Convex query context.
   * @param shape  - The query shape (rectangle or polygon, no holes).
   * @param options - Optional query options: filter, limit, cursor.
   * @returns Results array and an optional continuation cursor.
   *
   * @example
   * const { results, nextCursor } = await geo.polygons.intersects(ctx,
   *   { type: "rectangle", rectangle: { south: 40, north: 41, west: -75, east: -74 } },
   *   { limit: 10 }
   * );
   */
  async intersects(
    ctx: QueryCtx,
    shape: QueryShape,
    options?: {
      filter?: (
        q: GeospatialFilterBuilder<
          GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
        >,
      ) => GeospatialFilterExpression<
        GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
      >;
      limit?: number;
      cursor?: string;
    },
  ): Promise<{
    results: GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>[];
    nextCursor?: string;
  }> {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
    >();
    if (options?.filter) {
      options.filter(filterBuilder);
    }

    const result = await ctx.runQuery(
      this.core.component.polygon.query.intersects,
      {
        shape,
        filtering: filterBuilder.filterConditions,
        limit: options?.limit,
        cursor: options?.cursor,
      },
    );
    return result as typeof result & {
      results: GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>[];
      nextCursor?: string;
    };
  }

  /**
   * Find polygons within a given distance of a point, sorted by distance ascending.
   *
   * @note Near poles (|latitude| > 85°), precision may be degraded due to
   *       longitude compression. Use smaller `maxDistance` values in these areas.
   *
   * @param ctx     - The Convex query context.
   * @param options - Query parameters including point, limit, maxDistance, filter, and cursor.
   * @returns Results sorted by distance ascending and an optional continuation cursor.
   *
   * @example
   * const { results, nextCursor } = await geo.polygons.nearest(ctx, {
   *   point: { latitude: 40.7128, longitude: -74.0060 },
   *   maxDistance: 5000,
   *   limit: 10,
   * });
   */
  async nearest(
    ctx: QueryCtx,
    options: NearestQueryOptions<"polygon", PolygonKey, PolygonFilters>,
  ): Promise<{
    results: WithDistance<
      GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
    >[];
    nextCursor?: string;
  }> {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
    >();
    if (options.filter) {
      options.filter(filterBuilder);
    }

    const result = await ctx.runQuery(
      this.core.component.polygon.query.nearest,
      {
        point: options.point,
        maxDistance: options.maxDistance,
        limit: options.limit,
        filtering: filterBuilder.filterConditions,
        cursor: options.cursor,
      },
    );
    return result as typeof result & {
      results: WithDistance<
        GeospatialGeometry<"polygon", PolygonKey, PolygonFilters>
      >[];
      nextCursor?: string;
    };
  }

  /**
   * Calculate the area of a polygon in square meters.
   *
   * @param ctx     - The Convex query context.
   * @param polygon - The polygon geometry.
   * @returns The area in square meters.
   */
  async area(ctx: QueryCtx, polygon: Polygon): Promise<number> {
    return await ctx.runQuery(this.core.component.polygon.measure.area, {
      polygon,
    });
  }

  /**
   * Calculate the perimeter of a polygon in meters.
   *
   * @param ctx     - The Convex query context.
   * @param polygon - The polygon geometry.
   * @returns The perimeter in meters.
   */
  async perimeter(ctx: QueryCtx, polygon: Polygon): Promise<number> {
    return await ctx.runQuery(this.core.component.polygon.measure.perimeter, {
      polygon,
    });
  }

  /**
   * Calculate the centroid of a polygon.
   *
   * @param ctx     - The Convex query context.
   * @param polygon - The polygon geometry.
   * @returns The centroid point.
   */
  async centroid(ctx: QueryCtx, polygon: Polygon): Promise<Point> {
    return await ctx.runQuery(this.core.component.polygon.measure.centroid, {
      polygon,
    });
  }
}

export class PolylinesNamespace<
  PolylineKey extends string,
  PolylineFilters extends GeospatialFilters,
> {
  constructor(private core: GeospatialIndexCore) {}

  /**
   * Insert a polyline into the spatial index.
   *
   * @param ctx        - The Convex mutation context.
   * @param key        - The unique string key to associate with the polyline.
   * @param polyline   - The polyline as an ordered array of points.
   * @param filterKeys - Optional filter keys for querying.
   * @param sortKey    - Optional sort key for ordering results.
   */
  async insert(
    ctx: MutationCtx,
    key: PolylineKey,
    polyline: Polyline,
    filterKeys?: PolylineFilters,
    sortKey?: number,
  ): Promise<void> {
    await ctx.runMutation(this.core.component.geometry.insert, {
      key,
      type: "polyline",
      coordinates: polyline,
      filterKeys,
      sortKey: sortKey ?? Math.random(),
    });
  }

  /**
   * Get a polyline by key.
   *
   * @param ctx - The Convex query context.
   * @param key - The unique string key to retrieve.
   * @returns The stored polyline or `null` if not found.
   */
  async get(
    ctx: QueryCtx,
    key: PolylineKey,
  ): Promise<GeospatialGeometry<
    "polyline",
    PolylineKey,
    PolylineFilters
  > | null> {
    const result = await ctx.runQuery(this.core.component.geometry.get, {
      key,
    });
    return result as
      | (typeof result &
          GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>)
      | null;
  }

  /**
   * Update a polyline's coordinates or metadata.
   *
   * @param ctx     - The Convex mutation context.
   * @param key     - The unique string key of the polyline to update.
   * @param polyline - New polyline geometry, triggers re-indexing when provided.
   * @param filterKeys - New filter keys.
   * @param sortKey   - New sort key.
   */
  async update(
    ctx: MutationCtx,
    key: PolylineKey,
    polyline?: Polyline,
    filterKeys?: PolylineFilters,
    sortKey?: number,
  ): Promise<boolean> {
    return await ctx.runMutation(this.core.component.geometry.update, {
      key,
      coordinates: polyline,
      filterKeys,
      sortKey,
    });
  }

  /**
   * Remove a polyline from the spatial index.
   *
   * @param ctx - The Convex mutation context.
   * @param key - The unique string key of the polyline to remove.
   */
  async remove(ctx: MutationCtx, key: PolylineKey): Promise<boolean> {
    return await ctx.runMutation(this.core.component.geometry.remove, { key });
  }

  /**
   * Find all polylines that intersect a given shape.
   *
   * @param ctx    - The Convex query context.
   * @param shape  - The query shape (rectangle or polygon, no holes).
   * @param options - Optional query options: filter, limit, cursor.
   * @returns Results array and an optional continuation cursor.
   *
   * @example
   * const { results, nextCursor } = await geo.polylines.intersects(ctx,
   *   { type: "rectangle", rectangle: { south: 40, north: 41, west: -75, east: -74 } },
   *   { limit: 10 }
   * );
   */
  async intersects(
    ctx: QueryCtx,
    shape: QueryShape,
    options?: {
      filter?: (
        q: GeospatialFilterBuilder<
          GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>
        >,
      ) => GeospatialFilterExpression<
        GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>
      >;
      limit?: number;
      cursor?: string;
    },
  ): Promise<{
    results: GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>[];
    nextCursor?: string;
  }> {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>
    >();
    if (options?.filter) {
      options.filter(filterBuilder);
    }

    const result = await ctx.runQuery(
      this.core.component.polyline.query.intersects,
      {
        shape,
        filtering: filterBuilder.filterConditions,
        limit: options?.limit,
        cursor: options?.cursor,
      },
    );
    return result as typeof result & {
      results: GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>[];
      nextCursor?: string;
    };
  }

  /**
   * Find polylines within a given distance of a point, sorted by distance ascending.
   *
   * @note Near poles (|latitude| > 85°), precision may be degraded due to
   *       longitude compression. Use smaller `maxDistance` values in these areas.
   *
   * @param ctx     - The Convex query context.
   * @param options - Query parameters including point, limit, maxDistance, filter, and cursor.
   * @returns Results sorted by distance ascending and an optional continuation cursor.
   *
   * @example
   * const { results, nextCursor } = await geo.polylines.nearest(ctx, {
   *   point: { latitude: 40.7128, longitude: -74.0060 },
   *   maxDistance: 5000,
   *   limit: 10,
   * });
   */
  async nearest(
    ctx: QueryCtx,
    options: NearestQueryOptions<"polyline", PolylineKey, PolylineFilters>,
  ): Promise<{
    results: WithDistance<
      GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>
    >[];
    nextCursor?: string;
  }> {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>
    >();
    if (options.filter) {
      options.filter(filterBuilder);
    }

    const result = await ctx.runQuery(
      this.core.component.polyline.query.nearest,
      {
        point: options.point,
        maxDistance: options.maxDistance,
        limit: options.limit,
        filtering: filterBuilder.filterConditions,
        cursor: options.cursor,
      },
    );
    return result as typeof result & {
      results: WithDistance<
        GeospatialGeometry<"polyline", PolylineKey, PolylineFilters>
      >[];
      nextCursor?: string;
    };
  }

  /**
   * Calculate the length of a polyline in meters.
   *
   * @param ctx      - The Convex query context.
   * @param polyline - The polyline as an ordered array of points.
   * @returns The length in meters.
   */
  async length(ctx: QueryCtx, polyline: Polyline): Promise<number> {
    return await ctx.runQuery(this.core.component.polyline.measure.length, {
      polyline,
    });
  }

  /**
   * Calculate the centroid of a polyline.
   *
   * @param ctx      - The Convex query context.
   * @param polyline - The polyline as an ordered array of points.
   * @returns The centroid point.
   */
  async centroid(ctx: QueryCtx, polyline: Polyline): Promise<Point> {
    return await ctx.runQuery(this.core.component.polyline.measure.centroid, {
      polyline,
    });
  }
}

export class GeospatialIndex<
  PointKey extends string = string,
  PointFilters extends GeospatialFilters = GeospatialFilters,
  PolygonKey extends string = string,
  PolygonFilters extends GeospatialFilters = GeospatialFilters,
  PolylineKey extends string = string,
  PolylineFilters extends GeospatialFilters = GeospatialFilters,
> {
  readonly logLevel: LogLevel;

  readonly minLevel: number;
  readonly maxLevel: number;
  readonly levelMod: number;
  readonly maxCells: number;

  /**
   * Point-based geospatial operations.
   */
  readonly points: PointsNamespace<PointKey, PointFilters>;

  /**
   * Polygon-based geospatial operations.
   */
  readonly polygons: PolygonsNamespace<PolygonKey, PolygonFilters>;

  /**
   * Polyline-based geospatial operations.
   */
  readonly polylines: PolylinesNamespace<PolylineKey, PolylineFilters>;

  /**
   * Create a new geospatial index, powered by S2 and Convex, for working with
   * points, polygons, and polylines on the Earth's surface, with the ability
   * to efficiently query for all keys within a given geographic area.
   *
   * @param component - The registered geospatial index from `components`.
   * @param options   - Options to configure the index.
   */
  constructor(
    protected component: ComponentApi,
    options?: GeospatialIndexOptions,
  ) {
    let DEFAULT_LOG_LEVEL: LogLevel = "INFO";
    if (process.env.GEOSPATIAL_LOG_LEVEL) {
      if (
        (LOG_LEVELS as readonly string[]).includes(
          process.env.GEOSPATIAL_LOG_LEVEL,
        )
      ) {
        DEFAULT_LOG_LEVEL = process.env.GEOSPATIAL_LOG_LEVEL as LogLevel;
      } else {
        console.warn(
          `Invalid log level (${process.env.GEOSPATIAL_LOG_LEVEL}), defaulting to "${DEFAULT_LOG_LEVEL}"`,
        );
      }
    }
    this.logLevel = options?.logLevel ?? DEFAULT_LOG_LEVEL;
    this.minLevel = options?.minLevel ?? DEFAULT_MIN_LEVEL;
    this.maxLevel = options?.maxLevel ?? DEFAULT_MAX_LEVEL;
    this.levelMod = options?.levelMod ?? DEFAULT_LEVEL_MOD;
    this.maxCells = options?.maxCells ?? DEFAULT_MAX_CELLS;

    const core: GeospatialIndexCore = {
      component: this.component,
      minLevel: this.minLevel,
      maxLevel: this.maxLevel,
      levelMod: this.levelMod,
      maxCells: this.maxCells,
      logLevel: this.logLevel,
    };

    this.points = new PointsNamespace<PointKey, PointFilters>(core);
    this.polygons = new PolygonsNamespace<PolygonKey, PolygonFilters>(core);
    this.polylines = new PolylinesNamespace<PolylineKey, PolylineFilters>(core);
  }

  /**
   * Debug the S2 cells that would be queried for a given rectangle.
   *
   * @param ctx           - The Convex query context.
   * @param rectangle     - The geographic area to query.
   * @param maxResolution - The maximum cell level to use when querying.
   * @returns S2 cell tokens and their corner vertices.
   */
  async debugCells(
    ctx: QueryCtx,
    rectangle: Rectangle,
    maxResolution?: number,
  ): Promise<{ token: string; vertices: Point[] }[]> {
    return await ctx.runQuery(this.component.debug.cells, {
      rectangle,
      minLevel: this.minLevel,
      maxLevel: maxResolution ?? this.maxLevel,
      levelMod: this.levelMod,
      maxCells: this.maxCells,
    });
  }
}

type QueryCtx = {
  runQuery: <Query extends FunctionReference<"query", "public" | "internal">>(
    query: Query,
    ...args: OptionalRestArgs<Query>
  ) => Promise<FunctionReturnType<Query>>;
};

type MutationCtx = {
  runMutation: <
    Mutation extends FunctionReference<"mutation", "public" | "internal">,
  >(
    mutation: Mutation,
    ...args: OptionalRestArgs<Mutation>
  ) => Promise<FunctionReturnType<Mutation>>;
} & QueryCtx;

export type FilterValue<
  Doc extends GeospatialGeometry,
  FieldName extends keyof NonNullable<Doc["filterKeys"]> & string,
> = ExtractArray<NonNullable<Doc["filterKeys"]>[FieldName]>;

export type FilterObject<Doc extends GeospatialGeometry> = {
  [K in keyof NonNullable<Doc["filterKeys"]> & string]: {
    filterKey: K;
    filterValue: ExtractArray<NonNullable<Doc["filterKeys"]>[K]>;
    occur: "should" | "must";
  };
}[keyof NonNullable<Doc["filterKeys"]> & string];

type ExtractArray<T> = T extends (infer U)[] ? U : T;
