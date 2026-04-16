import type {
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
  PaginationResult,
} from "convex/server";
import type { Point, Primitive, Rectangle } from "../component/validators.js";
import { LOG_LEVELS, type LogLevel } from "../component/lib/logging.js";
import { FilterBuilderImpl, type GeospatialQuery } from "./query.js";
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
} satisfies Required<Omit<GeospatialIndexOptions, "logLevel">>;

export type GeospatialFilters = Record<string, Primitive | Primitive[]>;
export type GeospatialDocument<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = {
  key: Key;
  coordinates: Point;
  filterKeys: Filters;
  sortKey: number;
};

type Narrow<T, Overrides extends Partial<T>> = Omit<T, keyof Overrides> &
  Overrides;

export type InsertOptions<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> = Omit<GeospatialDocument<Key, Filters>, "sortKey"> &
  Partial<Pick<GeospatialDocument<Key, Filters>, "sortKey">>;

export type NearestQueryOptions<
  Doc extends GeospatialDocument = GeospatialDocument,
> = {
  point: Point;
  limit: number;
  maxDistance?: number;
  filter?: NonNullable<GeospatialQuery<Doc>["filter"]>;
};

export interface GeospatialIndexOptions {
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

export class GeospatialIndex<
  Key extends string = string,
  Filters extends GeospatialFilters = GeospatialFilters,
> {
  readonly #config: Required<Omit<GeospatialIndexOptions, "logLevel">> &
    Pick<GeospatialIndexOptions, "logLevel">;

  /**
   * Create a new geospatial index, powered by S2 and Convex. This index maps unique string keys to geographic coordinates
   * on the Earth's surface, with the ability to efficiently query for all keys within a given geographic area.
   *
   * @param component - The registered geospatial index from `components`.
   * @param options - The options to configure the index.
   */
  constructor(
    private component: ComponentApi,
    options?: GeospatialIndexOptions,
  ) {
    let logLevel: LogLevel | undefined;
    if (process.env.GEOSPATIAL_LOG_LEVEL != null) {
      if (LOG_LEVELS.includes(process.env.GEOSPATIAL_LOG_LEVEL)) {
        logLevel = process.env.GEOSPATIAL_LOG_LEVEL as LogLevel;
      } else {
        logLevel = "INFO";
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
    { key, coordinates, filterKeys, sortKey }: InsertOptions<Key, Filters>,
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
   * Query for keys within a given shape.
   *
   * @param ctx - The Convex query context.
   * @param query - The query to execute.
   * @param cursor - The continuation cursor to use for paginating through results.
   * @returns - An array of objects with the key-coordinate pairs and optionally a continuation cursor.
   */
  async query(
    ctx: QueryCtx,
    query: GeospatialQuery<GeospatialDocument<Key, Filters>>,
    cursor?: string,
  ) {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialDocument<Key, Filters>
    >();
    if (query.filter) {
      query.filter(filterBuilder);
    }
    const result = await ctx.runQuery(this.component.query.execute, {
      query: {
        rectangle: query.shape.rectangle,
        filtering: filterBuilder.filterConditions,
        sorting: { interval: filterBuilder.interval ?? {} },
        maxResults: query.limit ?? 64,
      },
      cursor,
      minLevel: this.#config.minLevel,
      maxLevel: this.#config.maxLevel,
      levelMod: this.#config.levelMod,
      maxCells: this.#config.maxCells,
      logLevel: this.#config.logLevel,
    });
    return result as PaginationResult<
      Narrow<(typeof result.page)[number], { key: Key }>
    >;
  }

  /**
   * Query for the nearest points to a given point.
   *
   * @param ctx - The Convex query context.
   * @param options - The nearest query parameters.
   * @returns - An array of objects with the key-coordinate pairs and their distance from the query point in meters.
   */
  async nearest(
    ctx: QueryCtx,
    {
      point,
      limit,
      maxDistance,
      filter,
    }: NearestQueryOptions<GeospatialDocument<Key, Filters>>,
  ) {
    const filterBuilder = new FilterBuilderImpl<
      GeospatialDocument<Key, Filters>
    >();
    if (filter) {
      filter(filterBuilder);
    }

    const result = await ctx.runQuery(this.component.query.nearestPoints, {
      point,
      maxDistance,
      maxResults: limit,
      minLevel: this.#config.minLevel,
      maxLevel: this.#config.maxLevel,
      levelMod: this.#config.levelMod,
      logLevel: this.#config.logLevel,
      filtering: filterBuilder.filterConditions,
      sorting: { interval: filterBuilder.interval ?? {} },
    });
    return result as Narrow<(typeof result)[number], { key: Key }>[];
  }

  /**
   * Debug the S2 cells that would be queried for a given rectangle.
   *
   * @param ctx - The Convex query context.
   * @param rectangle - The geographic area to query.
   * @param maxResolution - The maximum resolution to use when querying.
   * @returns - An array of S2 cell identifiers and their vertices.
   */
  async debugCells(
    ctx: QueryCtx,
    rectangle: Rectangle,
    maxResolution?: number,
  ): Promise<{ token: string; vertices: Point[] }[]> {
    return await ctx.runQuery(this.component.debug.cells, {
      rectangle,
      minLevel: this.#config.minLevel,
      maxLevel: maxResolution ?? this.#config.maxLevel,
      levelMod: this.#config.levelMod,
      maxCells: this.#config.maxCells,
    });
  }
}

export type FilterValue<
  Doc extends GeospatialDocument,
  FieldName extends keyof Doc["filterKeys"],
> = ExtractArray<Doc["filterKeys"][FieldName]>;

type QueryCtx = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
type MutationCtx = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runQuery" | "runMutation"
>;

export type FilterObject<Doc extends GeospatialDocument> = {
  [K in keyof Doc["filterKeys"] & string]: {
    filterKey: K;
    filterValue: ExtractArray<Doc["filterKeys"][K]>;
    occur: "should" | "must";
  };
}[keyof Doc["filterKeys"] & string];

type ExtractArray<T> = T extends (infer U)[] ? U : T;
