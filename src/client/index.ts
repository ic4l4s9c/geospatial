import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationResult,
} from "convex/server";
import type { Point, Primitive, Rectangle } from "../component/validators.js";
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

type GeospatialBase<Key extends string = string> = {
  key: Key;
  coordinates: Point;
};

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type GeospatialDocument<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = GeospatialBase<Key> & {
  filterKeys: Filters;
  sortKey: number;
};

export type InsertDocument<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = WithOptional<GeospatialDocument<Key, Filters>, "sortKey">;

export type NearestResult<Key extends string = string> = GeospatialBase<Key> & {
  distance: number;
};

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
  q: GeospatialFilterBuilder<GeospatialDocument<Key, Filters>>,
) => GeospatialFilterExpression<GeospatialDocument<Key, Filters>>;

type GeospatialConfig = Required<Omit<GeospatialOptions, "logLevel">> &
  Pick<GeospatialOptions, "logLevel">;

/**
 * Entry point returned by `geo.query(ctx)`. Call `.within()` or `.nearest()` to choose a query strategy.
 */
class GeospatialQueryBuilder<
  Key extends string,
  Filters extends GeospatialFilters,
> {
  constructor(
    private ctx: QueryCtx,
    private component: ComponentApi,
    private config: GeospatialConfig,
  ) {}

  /**
   * Query for all keys within a rectangle.
   */
  within(rectangle: Rectangle): WithinQueryBuilder<Key, Filters> {
    return new WithinQueryBuilder(this.ctx, this.component, this.config, {
      type: "rectangle",
      rectangle,
    });
  }

  /**
   * Query for the nearest keys to a point.
   */
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
  ): Promise<PaginationResult<GeospatialBase<Key>>> {
    const filterBuilder = new FilterBuilder<GeospatialDocument<Key, Filters>>();
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
  async collect(): Promise<NearestResult<Key>[]> {
    const filterBuilder = new FilterBuilder<GeospatialDocument<Key, Filters>>();
    if (this.#filter) {
      this.#filter(filterBuilder);
    }
    const result = await this.ctx.runQuery(this.component.query.nearestPoints, {
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

export class Geospatial<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> {
  readonly #config: GeospatialConfig;

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
  }

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
    { key, coordinates, filterKeys, sortKey }: InsertDocument<Key, Filters>,
  ): Promise<void> {
    await ctx.runMutation(this.component.document.insert, {
      document: {
        key,
        coordinates,
        filterKeys,
        sortKey: sortKey ?? Date.now(),
      },
      minLevel: this.#config.minLevel,
      maxLevel: this.#config.maxLevel,
      levelMod: this.#config.levelMod,
      maxCells: this.#config.maxCells,
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
  ): Promise<GeospatialDocument<Key, Filters> | null> {
    const result = await ctx.runQuery(this.component.document.get, { key });
    return result as Narrow<
      NonNullable<typeof result>,
      { key: Key; filterKeys: Filters }
    > | null;
  }

  /**
   * Remove a key-coordinate pair from the index.
   *
   * @param ctx - The Convex mutation context.
   * @param key - The unique string key to remove from the index.
   * @returns - `true` if the key was found and removed, `false` otherwise.
   */
  async delete(ctx: MutationCtx, key: Key): Promise<boolean> {
    return await ctx.runMutation(this.component.document.remove, {
      key,
      minLevel: this.#config.minLevel,
      maxLevel: this.#config.maxLevel,
      levelMod: this.#config.levelMod,
      maxCells: this.#config.maxCells,
    });
  }

  /**
   * Begin a geospatial query. Call `.within(rectangle)` for area queries or
   * `.nearest(point)` for nearest-neighbor queries.
   *
   * @param ctx - The Convex query context.
   */
  query(ctx: QueryCtx): GeospatialQueryBuilder<Key, Filters> {
    return new GeospatialQueryBuilder(ctx, this.component, this.#config);
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
