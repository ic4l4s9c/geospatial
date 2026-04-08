/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as areas from "../areas.js";
import type * as constants from "../constants.js";
import type * as example from "../example.js";
import type * as geospatial from "../geospatial.js";
import type * as places from "../places.js";
import type * as routes from "../routes.js";
import type * as seed from "../seed.js";
import type * as seed_areas from "../seed/areas.js";
import type * as seed_data_areas from "../seed/data/areas.js";
import type * as seed_data_places from "../seed/data/places.js";
import type * as seed_data_routes from "../seed/data/routes.js";
import type * as seed_places from "../seed/places.js";
import type * as seed_routes from "../seed/routes.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  areas: typeof areas;
  constants: typeof constants;
  example: typeof example;
  geospatial: typeof geospatial;
  places: typeof places;
  routes: typeof routes;
  seed: typeof seed;
  "seed/areas": typeof seed_areas;
  "seed/data/areas": typeof seed_data_areas;
  "seed/data/places": typeof seed_data_places;
  "seed/data/routes": typeof seed_data_routes;
  "seed/places": typeof seed_places;
  "seed/routes": typeof seed_routes;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  geospatial: import("@convex-dev/geospatial/_generated/component.js").ComponentApi<"geospatial">;
};
