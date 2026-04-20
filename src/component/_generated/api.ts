/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as debug from "../debug.js";
import type * as lib_approximateCounter from "../lib/approximateCounter.js";
import type * as lib_closestPointQuery from "../lib/closestPointQuery.js";
import type * as lib_d64 from "../lib/d64.js";
import type * as lib_geometry_bbox from "../lib/geometry/bbox.js";
import type * as lib_geometry_points from "../lib/geometry/points.js";
import type * as lib_goRuntime from "../lib/goRuntime.js";
import type * as lib_interval from "../lib/interval.js";
import type * as lib_logging from "../lib/logging.js";
import type * as lib_s2Bindings from "../lib/s2Bindings.js";
import type * as lib_s2wasm from "../lib/s2wasm.js";
import type * as lib_tupleKey from "../lib/tupleKey.js";
import type * as lib_xxHash32 from "../lib/xxHash32.js";
import type * as points from "../points.js";
import type * as polygons from "../polygons.js";
import type * as polygons_measure from "../polygons/measure.js";
import type * as polylines from "../polylines.js";
import type * as polylines_measure from "../polylines/measure.js";
import type * as query from "../query.js";
import type * as streams_cellRange from "../streams/cellRange.js";
import type * as streams_constants from "../streams/constants.js";
import type * as streams_databaseRange from "../streams/databaseRange.js";
import type * as streams_filterKeyRange from "../streams/filterKeyRange.js";
import type * as streams_intersection from "../streams/intersection.js";
import type * as streams_union from "../streams/union.js";
import type * as streams_zigzag from "../streams/zigzag.js";
import type * as validators from "../validators.js";
import type * as validators_primitive from "../validators/primitive.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  debug: typeof debug;
  "lib/approximateCounter": typeof lib_approximateCounter;
  "lib/closestPointQuery": typeof lib_closestPointQuery;
  "lib/d64": typeof lib_d64;
  "lib/geometry/bbox": typeof lib_geometry_bbox;
  "lib/geometry/points": typeof lib_geometry_points;
  "lib/goRuntime": typeof lib_goRuntime;
  "lib/interval": typeof lib_interval;
  "lib/logging": typeof lib_logging;
  "lib/s2Bindings": typeof lib_s2Bindings;
  "lib/s2wasm": typeof lib_s2wasm;
  "lib/tupleKey": typeof lib_tupleKey;
  "lib/xxHash32": typeof lib_xxHash32;
  points: typeof points;
  polygons: typeof polygons;
  "polygons/measure": typeof polygons_measure;
  polylines: typeof polylines;
  "polylines/measure": typeof polylines_measure;
  query: typeof query;
  "streams/cellRange": typeof streams_cellRange;
  "streams/constants": typeof streams_constants;
  "streams/databaseRange": typeof streams_databaseRange;
  "streams/filterKeyRange": typeof streams_filterKeyRange;
  "streams/intersection": typeof streams_intersection;
  "streams/union": typeof streams_union;
  "streams/zigzag": typeof streams_zigzag;
  validators: typeof validators;
  "validators/primitive": typeof validators_primitive;
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
