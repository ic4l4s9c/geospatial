/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as document from "../document.js";
import type * as geometry from "../geometry.js";
import type * as geometry_query from "../geometry/query.js";
import type * as lib_approximateCounter from "../lib/approximateCounter.js";
import type * as lib_cursor from "../lib/cursor.js";
import type * as lib_d64 from "../lib/d64.js";
import type * as lib_geometryQuery from "../lib/geometryQuery.js";
import type * as lib_goRuntime from "../lib/goRuntime.js";
import type * as lib_interval from "../lib/interval.js";
import type * as lib_logging from "../lib/logging.js";
import type * as lib_pointQuery from "../lib/pointQuery.js";
import type * as lib_primitive from "../lib/primitive.js";
import type * as lib_s2Bindings from "../lib/s2Bindings.js";
import type * as lib_s2wasm from "../lib/s2wasm.js";
import type * as lib_xxhash from "../lib/xxhash.js";
import type * as polygon_measure from "../polygon/measure.js";
import type * as polygon_query from "../polygon/query.js";
import type * as polyline_measure from "../polyline/measure.js";
import type * as polyline_query from "../polyline/query.js";
import type * as query from "../query.js";
import type * as streams_cellRange from "../streams/cellRange.js";
import type * as streams_constants from "../streams/constants.js";
import type * as streams_databaseRange from "../streams/databaseRange.js";
import type * as streams_filterKeyRange from "../streams/filterKeyRange.js";
import type * as streams_intersection from "../streams/intersection.js";
import type * as streams_union from "../streams/union.js";
import type * as streams_zigzag from "../streams/zigzag.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  document: typeof document;
  geometry: typeof geometry;
  "geometry/query": typeof geometry_query;
  "lib/approximateCounter": typeof lib_approximateCounter;
  "lib/cursor": typeof lib_cursor;
  "lib/d64": typeof lib_d64;
  "lib/geometryQuery": typeof lib_geometryQuery;
  "lib/goRuntime": typeof lib_goRuntime;
  "lib/interval": typeof lib_interval;
  "lib/logging": typeof lib_logging;
  "lib/pointQuery": typeof lib_pointQuery;
  "lib/primitive": typeof lib_primitive;
  "lib/s2Bindings": typeof lib_s2Bindings;
  "lib/s2wasm": typeof lib_s2wasm;
  "lib/xxhash": typeof lib_xxhash;
  "polygon/measure": typeof polygon_measure;
  "polygon/query": typeof polygon_query;
  "polyline/measure": typeof polyline_measure;
  "polyline/query": typeof polyline_query;
  query: typeof query;
  "streams/cellRange": typeof streams_cellRange;
  "streams/constants": typeof streams_constants;
  "streams/databaseRange": typeof streams_databaseRange;
  "streams/filterKeyRange": typeof streams_filterKeyRange;
  "streams/intersection": typeof streams_intersection;
  "streams/union": typeof streams_union;
  "streams/zigzag": typeof streams_zigzag;
  validators: typeof validators;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
