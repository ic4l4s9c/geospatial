import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationResult,
} from "convex/server";
import type {
  Point,
  Polygon,
  Polyline,
  Primitive,
  Rectangle,
} from "../component/validators.js";
import { LOG_LEVELS, type LogLevel } from "../component/lib/logging.js";
import {
  FilterBuilder,
  type GeospatialQuery,
  type GeospatialFilterBuilder,
  type GeospatialFilterExpression,
  type QueryShape,
} from "./query.js";
import type { ComponentApi } from "../component/_generated/component.js";

export type { Point, Primitive, GeospatialQuery, Rectangle };

declare global {
  const Convex: Record<string, unknown>;
}
if (typeof Convex === "undefined") {
  throw new Error(
    "this is Convex backend code, but it's running somewhere else!",
  );
}

export const GEOSPATIAL_DEFAULTS = {
  minLevel: 4,
  maxLevel: 16,
  maxCells: 8,
  levelMod: 2,
  logLevel: "INFO",
} satisfies Required<GeospatialOptions>;

export type GeospatialFilters = Record<string, Primitive | Primitive[]>;

export type GeospatialDocument<
  Type extends "point" | "polygon" | "polyline" =
    | "point"
    | "polygon"
    | "polyline",
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = {
  key: Key;
  coordinates: Type extends "point"
    ? Point
    : Type extends "polygon"
      ? Polygon
      : Type extends "polyline"
        ? Polyline
        : Point | Polygon | Polyline;
  boundingBox?: Type extends "point" ? never : Rectangle;
  filterKeys: Filters;
  sortKey: number;
};

export type WithDistance<Type> = Type & {
  distance: number;
};

/** Make only the keys in K optional, keep the rest unchanged. */
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make all keys optional except those in K. */
type RequireOnly<T, K extends keyof T> = Partial<T> & Pick<T, K>;

type Narrow<T, Overrides extends Partial<T>> = Omit<T, keyof Overrides> &
  Overrides;

export interface GeospatialOptions {
  /**
   * The minimum S2 cell level to use when querying. Defaults to 4.
   */
  minLevel?: number;
  /**
   * The maximum S2 cell level to use when querying. Defaults to 16.
   */
  maxLevel?: number;
  /**
   * The distance between levels when indexing, implying a branching factor of `4^levelMod`. Defaults to 2.
   */
  levelMod?: number;
  /**
   * The maximum number of cells to use when querying. Defaults to 8.
   */
  maxCells?: number;
  /**
   * The log level to use when logging. Defaults to the `GEOSPATIAL_LOG_LEVEL` environment variable, or "INFO" if not set.
   */
  logLevel?: LogLevel;
}

type FilterFn<Key extends string, Filters extends GeospatialFilters> = (
  q: GeospatialFilterBuilder<GeospatialDocument<"point", Key, Filters>>,
) => GeospatialFilterExpression<GeospatialDocument<"point", Key, Filters>>;

type GeospatialConfig = Required<Omit<GeospatialOptions, "logLevel">> &
  Pick<GeospatialOptions, "logLevel">;

/**
 * Builder for a rectangle (within) query. Call `.filter()`, `.limit()`, then `.paginate()`.
 */
class WithinQueryBuilder<
  Key extends string,
  Filters extends GeospatialFilters,
> {
  #filter?: FilterFn<Key, Filters>;
  #limit?: number;

  constructor(
    private ctx: QueryCtx,
    private component: ComponentApi,
    private config: GeospatialConfig,
    private shape: QueryShape,
  ) {}

  /**
   * Add a filter expression to the query.
   */
  filter(fn: FilterFn<Key, Filters>): this {
    this.#filter = fn;
    return this;
  }

  /**
   * Set a limit on the number of results returned (default: 64).
   */
  limit(n: number): this {
    this.#limit = n;
    return this;
  }

  /**
   * Execute the query and return a paginated result.
   */
  async paginate(
    cursor?: string,
  ): Promise<
    PaginationResult<
      Omit<GeospatialDocument<"point", Key>, "filterKeys" | "sortKey">
    >
  > {
    const filterBuilder = new FilterBuilder<
      GeospatialDocument<"point", Key, Filters>
    >();
    if (this.#filter) {
      this.#filter(filterBuilder);
    }
    const result = await this.ctx.runQuery(this.component.query.execute, {
      query: {
        rectangle: this.shape.rectangle,
        filtering: filterBuilder.filterConditions,
        sorting: { interval: filterBuilder.interval ?? {} },
        maxResults: this.#limit ?? 64,
      },
      cursor,
      minLevel: this.config.minLevel,
      maxLevel: this.config.maxLevel,
      levelMod: this.config.levelMod,
      maxCells: this.config.maxCells,
      logLevel: this.config.logLevel,
    });
    return result as PaginationResult<
      Narrow<(typeof result.page)[number], { key: Key }>
    >;
  }
}

/**
 * Builder for a nearest-neighbor query. Call `.filter()`, `.limit()`, then `.collect()`.
 */
class NearestQueryBuilder<
  Key extends string,
  Filters extends GeospatialFilters,
> {
  #filter?: FilterFn<Key, Filters>;
  #limit?: number;

  constructor(
    private ctx: QueryCtx,
    private component: ComponentApi,
    private config: GeospatialConfig,
    private point: Point,
    private maxDistance?: number,
  ) {}

  /**
   * Add a filter expression to the query.
   */
  filter(fn: FilterFn<Key, Filters>): this {
    this.#filter = fn;
    return this;
  }

  /**
   * Set a limit on the number of results returned (default: 64).
   */
  limit(n: number): this {
    this.#limit = n;
    return this;
  }

  /**
   * Execute the query and return all results.
   */
  async collect(): Promise<
    WithDistance<
      Omit<GeospatialDocument<"point", Key>, "filterKeys" | "sortKey">
    >[]
  > {
    const filterBuilder = new FilterBuilder<
      GeospatialDocument<"point", Key, Filters>
    >();
    if (this.#filter) {
      this.#filter(filterBuilder);
    }
    const result = await this.ctx.runQuery(this.component.query.nearest, {
      point: this.point,
      maxDistance: this.maxDistance,
      maxResults: this.#limit ?? 64,
      minLevel: this.config.minLevel,
      maxLevel: this.config.maxLevel,
      levelMod: this.config.levelMod,
      logLevel: this.config.logLevel,
      filtering: filterBuilder.filterConditions,
      sorting: { interval: filterBuilder.interval ?? {} },
    });
    return result as Narrow<(typeof result)[number], { key: Key }>[];
  }
}

class GeospatialQueryBuilder<
  Key extends string,
  Filters extends GeospatialFilters,
> {
  constructor(
    private ctx: QueryCtx,
    private component: ComponentApi,
    private config: GeospatialConfig,
  ) {}

  within(rectangle: Rectangle): WithinQueryBuilder<Key, Filters> {
    return new WithinQueryBuilder(this.ctx, this.component, this.config, {
      type: "rectangle",
      rectangle,
    });
  }

  nearest(
    point: Point,
    options?: { maxDistance?: number },
  ): NearestQueryBuilder<Key, Filters> {
    return new NearestQueryBuilder(
      this.ctx,
      this.component,
      this.config,
      point,
      options?.maxDistance,
    );
  }
}

/**
 * Measurement operations for polygon geometries.
 * All distances are in meters; areas are in square meters.
 *
 * Access via `geospatial.polygons.measure`.
 */
class PolygonMeasureNamespace {
  constructor(private component: ComponentApi) {}

  /**
   * Calculate the perimeter of a polygon in meters.
   * Uses great-circle distance on Earth's surface.
   *
   * @param ctx - The Convex query context.
   * @param polygon - The polygon to measure.
   * @returns The perimeter length in meters.
   */
  async perimeter(ctx: QueryCtx, polygon: Polygon): Promise<number> {
    return ctx.runQuery(this.component.polygons.measure.perimeter, { polygon });
  }

  /**
   * Calculate the area of a polygon in square meters.
   * Uses spherical geometry on Earth's surface.
   *
   * @param ctx - The Convex query context.
   * @param polygon - The polygon to measure.
   * @returns The area in square meters.
   */
  async area(ctx: QueryCtx, polygon: Polygon): Promise<number> {
    return ctx.runQuery(this.component.polygons.measure.area, { polygon });
  }

  /**
   * Calculate the centroid of a polygon.
   * Returns the geographic center point.
   *
   * @param ctx - The Convex query context.
   * @param polygon - The polygon to measure.
   * @returns The centroid `{ latitude, longitude }`.
   */
  async centroid(ctx: QueryCtx, polygon: Polygon): Promise<Point> {
    return ctx.runQuery(this.component.polygons.measure.centroid, { polygon });
  }
}

/**
 * Measurement operations for polyline geometries.
 * All distances are in meters.
 *
 * Access via `geospatial.polylines.measure`.
 */
class PolylineMeasureNamespace {
  constructor(private component: ComponentApi) {}

  /**
   * Calculate the length of a polyline in meters.
   * Uses great-circle distance on Earth's surface.
   *
   * @param ctx - The Convex query context.
   * @param polyline - The polyline to measure.
   * @returns The length in meters.
   */
  async length(ctx: QueryCtx, polyline: Polyline): Promise<number> {
    return ctx.runQuery(this.component.polylines.measure.length, { polyline });
  }

  /**
   * Calculate the centroid of a polyline.
   * Returns the weighted center point along the line.
   *
   * @param ctx - The Convex query context.
   * @param polyline - The polyline to measure.
   * @returns The centroid `{ latitude, longitude }`.
   */
  async centroid(ctx: QueryCtx, polyline: Polyline): Promise<Point> {
    return ctx.runQuery(this.component.polylines.measure.centroid, {
      polyline,
    });
  }
}

/**
 * Namespace for point geometry operations: insert, get, delete, query.
 */
class PointsNamespace<Key extends string, Filters extends GeospatialFilters> {
  constructor(
    private component: ComponentApi,
    private config: GeospatialConfig,
  ) {}

  /**
   * Insert a new key-coordinate pair into the index.
   *
   * @param ctx - The Convex mutation context.
   * @param key - The unique string key to associate with the coordinate.
   * @param coordinates - The geographic coordinate `{ latitude, longitude }` to associate with the key.
   * @param filterKeys - The filter keys to associate with the key.
   * @param sortKey - The sort key to associate with the key, defaults to `Date.now()`.
   */
  async insert(
    ctx: MutationCtx,
    {
      key,
      coordinates,
      filterKeys,
      sortKey,
    }: PartialBy<GeospatialDocument<"point", Key, Filters>, "sortKey">,
  ): Promise<void> {
    await ctx.runMutation(this.component.points.insert, {
      document: {
        key,
        coordinates,
        filterKeys,
        sortKey: sortKey ?? Date.now(),
      },
      config: this.config,
    });
  }

  /**
   * Retrieve the coordinate associated with a specific key.
   *
   * @param ctx - The Convex query context.
   * @param key - The unique string key to retrieve the coordinate for.
   * @returns - The geographic coordinate `{ latitude, longitude }` associated with the key, or `null` if the key is not found.
   */
  async get(
    ctx: QueryCtx,
    key: Key,
  ): Promise<GeospatialDocument<"point", Key, Filters> | null> {
    const result = await ctx.runQuery(this.component.points.get, { key });
    return result as Narrow<
      NonNullable<typeof result>,
      { key: Key; filterKeys: Filters }
    > | null;
  }

  /**
   * Update an existing point in the index. Only fields provided are changed;
   * `key` is always required to identify the entry.
   *
   * @param ctx - The Convex mutation context.
   * @param document - Partial document; `key` is required, all other fields are optional.
   * @returns `true` if the entry was found and updated, `false` otherwise.
   */
  async update(
    ctx: MutationCtx,
    document: RequireOnly<GeospatialDocument<"point", Key, Filters>, "key">,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.points.update, {
      document,
      config: this.config,
    });
  }

  /**
   * Remove a key-coordinate pair from the index.
   *
   * @param ctx - The Convex mutation context.
   * @param key - The unique string key to remove from the index.
   * @returns - `true` if the key was found and removed, `false` otherwise.
   */
  async delete(ctx: MutationCtx, key: Key): Promise<boolean> {
    return await ctx.runMutation(this.component.points.del, {
      key,
      config: this.config,
    });
  }

  /**
   * Begin a geospatial query over points. Call `.within(rectangle)` or
   * `.nearest(point)` to choose a query strategy.
   */
  query(ctx: QueryCtx): GeospatialQueryBuilder<Key, Filters> {
    return new GeospatialQueryBuilder(ctx, this.component, this.config);
  }
}

/**
 * Namespace for polygon geometry operations: insert, get, update, delete, measure.
 */
class PolygonsNamespace<Key extends string, Filters extends GeospatialFilters> {
  /**
   * Measurement operations for polygon geometries.
   *
   * @example
   * ```ts
   * const perimeterM = await geospatial.polygons.measure.perimeter(ctx, myPolygon);
   * const areaM2     = await geospatial.polygons.measure.area(ctx, myPolygon);
   * const center     = await geospatial.polygons.measure.centroid(ctx, myPolygon);
   * ```
   */
  readonly measure: PolygonMeasureNamespace;

  constructor(
    private component: ComponentApi,
    private config: GeospatialConfig,
  ) {
    this.measure = new PolygonMeasureNamespace(component);
  }

  async insert(
    ctx: MutationCtx,
    {
      key,
      coordinates,
      filterKeys,
      sortKey,
    }: PartialBy<GeospatialDocument<"polygon", Key, Filters>, "sortKey">,
  ): Promise<void> {
    await ctx.runMutation(this.component.polygons.insert, {
      document: {
        key,
        coordinates,
        filterKeys,
        sortKey: sortKey ?? Date.now(),
      },
      config: this.config,
    });
  }

  async get(
    ctx: QueryCtx,
    key: Key,
  ): Promise<GeospatialDocument<"polygon", Key, Filters> | null> {
    const result = await ctx.runQuery(this.component.polygons.get, { key });
    return result as Narrow<
      NonNullable<typeof result>,
      { key: Key; filterKeys: Filters }
    > | null;
  }

  async update(
    ctx: MutationCtx,
    document: RequireOnly<GeospatialDocument<"polygon", Key, Filters>, "key">,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.polygons.update, {
      document,
      config: this.config,
    });
  }

  async delete(ctx: MutationCtx, key: Key): Promise<boolean> {
    return await ctx.runMutation(this.component.polygons.del, {
      key,
      config: this.config,
    });
  }
}

/**
 * Namespace for polyline geometry operations: insert, get, update, delete, measure.
 */
class PolylinesNamespace<
  Key extends string,
  Filters extends GeospatialFilters,
> {
  /**
   * Measurement operations for polyline geometries.
   *
   * @example
   * ```ts
   * const lengthM = await geospatial.polylines.measure.length(ctx, myPolyline);
   * const center  = await geospatial.polylines.measure.centroid(ctx, myPolyline);
   * ```
   */
  readonly measure: PolylineMeasureNamespace;

  constructor(
    private component: ComponentApi,
    private config: GeospatialConfig,
  ) {
    this.measure = new PolylineMeasureNamespace(component);
  }

  async insert(
    ctx: MutationCtx,
    {
      key,
      coordinates,
      filterKeys,
      sortKey,
    }: PartialBy<GeospatialDocument<"polyline", Key, Filters>, "sortKey">,
  ): Promise<void> {
    await ctx.runMutation(this.component.polylines.insert, {
      document: {
        key,
        coordinates,
        filterKeys,
        sortKey: sortKey ?? Date.now(),
      },
      config: this.config,
    });
  }

  async get(
    ctx: QueryCtx,
    key: Key,
  ): Promise<GeospatialDocument<"polyline", Key, Filters> | null> {
    const result = await ctx.runQuery(this.component.polylines.get, { key });
    return result as Narrow<
      NonNullable<typeof result>,
      { key: Key; filterKeys: Filters }
    > | null;
  }

  async update(
    ctx: MutationCtx,
    document: RequireOnly<GeospatialDocument<"polyline", Key, Filters>, "key">,
  ): Promise<boolean> {
    return ctx.runMutation(this.component.polylines.update, {
      document,
      config: this.config,
    });
  }

  async delete(ctx: MutationCtx, key: Key): Promise<boolean> {
    return await ctx.runMutation(this.component.polylines.del, {
      key,
      config: this.config,
    });
  }
}

export class Geospatial<
  PointKey extends string = string,
  PointFilters extends GeospatialFilters = GeospatialFilters,
  PolygonKey extends string = string,
  PolygonFilters extends GeospatialFilters = GeospatialFilters,
  PolylineKey extends string = string,
  PolylineFilters extends GeospatialFilters = GeospatialFilters,
> {
  readonly #config: GeospatialConfig;

  /** Operations scoped to point geometries. */
  readonly points: PointsNamespace<PointKey, PointFilters>;

  /** Operations scoped to polygon geometries. */
  readonly polygons: PolygonsNamespace<PolygonKey, PolygonFilters>;

  /** Operations scoped to polyline geometries. */
  readonly polylines: PolylinesNamespace<PolylineKey, PolylineFilters>;

  /**
   * Debug utilities for inspecting S2 cell geometry used by the index.
   */
  readonly debug = {
    /**
     * Debug the S2 cells that would be queried for a given rectangle.
     *
     * @param ctx - The Convex query context.
     * @param rectangle - The geographic area to query.
     * @param maxResolution - The maximum resolution to use when querying.
     * @returns - An array of S2 cell identifiers and their vertices.
     */
    cells: async (
      ctx: QueryCtx,
      rectangle: Rectangle,
      maxResolution?: number,
    ): Promise<{ token: string; vertices: Point[] }[]> => {
      return await ctx.runQuery(this.component.debug.cells, {
        rectangle,
        minLevel: this.#config.minLevel,
        maxLevel: maxResolution ?? this.#config.maxLevel,
        levelMod: this.#config.levelMod,
        maxCells: this.#config.maxCells,
      });
    },
  };

  /**
   * Create a new geospatial index, powered by S2 and Convex. This index maps unique string keys to geographic coordinates
   * on the Earth's surface, with the ability to efficiently query for all keys within a given geographic area.
   *
   * @param component - The registered geospatial index from `components`.
   * @param options - The options to configure the index.
   */
  constructor(
    private component: ComponentApi,
    options?: GeospatialOptions,
  ) {
    let logLevel: LogLevel | undefined;
    if (process.env.GEOSPATIAL_LOG_LEVEL != null) {
      if (LOG_LEVELS.includes(process.env.GEOSPATIAL_LOG_LEVEL)) {
        logLevel = process.env.GEOSPATIAL_LOG_LEVEL as LogLevel;
      } else {
        logLevel = GEOSPATIAL_DEFAULTS.logLevel;
        console.warn(
          `Invalid log level (${process.env.GEOSPATIAL_LOG_LEVEL}), defaulting to "${logLevel}"`,
        );
      }
    }

    this.#config = {
      logLevel: options?.logLevel ?? logLevel,
      minLevel: options?.minLevel ?? GEOSPATIAL_DEFAULTS.minLevel,
      maxLevel: options?.maxLevel ?? GEOSPATIAL_DEFAULTS.maxLevel,
      levelMod: options?.levelMod ?? GEOSPATIAL_DEFAULTS.levelMod,
      maxCells: options?.maxCells ?? GEOSPATIAL_DEFAULTS.maxCells,
    };

    this.points = new PointsNamespace<PointKey, PointFilters>(
      component,
      this.#config,
    );
    this.polygons = new PolygonsNamespace<PolygonKey, PolygonFilters>(
      component,
      this.#config,
    );
    this.polylines = new PolylinesNamespace<PolylineKey, PolylineFilters>(
      component,
      this.#config,
    );
  }
}

type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;

export type FilterObject<Doc extends GeospatialDocument> = {
  [K in keyof Doc["filterKeys"] & string]: {
    filterKey: K;
    filterValue: FilterValue<Doc, K>;
    occur: "should" | "must";
  };
}[keyof Doc["filterKeys"] & string];

export type FilterValue<
  Doc extends GeospatialDocument,
  FieldName extends keyof Doc["filterKeys"],
> = FlattenArray<Doc["filterKeys"][FieldName]>;

type FlattenArray<T> = T extends (infer U)[] ? U : T;
