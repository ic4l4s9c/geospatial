/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    debug: {
      cells: FunctionReference<
        "query",
        "internal",
        {
          levelMod: number;
          maxCells: number;
          maxLevel: number;
          minLevel: number;
          rectangle: {
            east: number;
            north: number;
            south: number;
            west: number;
          };
        },
        Array<{
          token: string;
          vertices: Array<{ latitude: number; longitude: number }>;
        }>,
        Name
      >;
    };
    points: {
      del: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          key: string;
        },
        boolean,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: string },
        {
          coordinates: { latitude: number; longitude: number };
          filterKeys?: Record<
            string,
            | string
            | number
            | boolean
            | null
            | bigint
            | Array<string | number | boolean | null | bigint>
          >;
          key: string;
          sortKey: number;
        } | null,
        Name
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          document: {
            coordinates: { latitude: number; longitude: number };
            filterKeys?: Record<
              string,
              | string
              | number
              | boolean
              | null
              | bigint
              | Array<string | number | boolean | null | bigint>
            >;
            key: string;
            sortKey: number;
          };
        },
        null,
        Name
      >;
      spatial: {
        nearest: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            filtering: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            levelMod: number;
            limit: number;
            logLevel?:
              | "EMERGENCY"
              | "ALERT"
              | "CRITICAL"
              | "ERROR"
              | "WARNING"
              | "NOTICE"
              | "INFO"
              | "DEBUG";
            maxDistance?: number;
            maxLevel: number;
            minLevel: number;
            point: { latitude: number; longitude: number };
            sorting: {
              interval: { endExclusive?: number; startInclusive?: number };
            };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              coordinates: { latitude: number; longitude: number };
              distance: number;
              key: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        within: FunctionReference<
          "query",
          "internal",
          {
            config: {
              levelMod: number;
              maxCells: number;
              maxLevel: number;
              minLevel: number;
            };
            cursor?: string;
            logLevel?:
              | "EMERGENCY"
              | "ALERT"
              | "CRITICAL"
              | "ERROR"
              | "WARNING"
              | "NOTICE"
              | "INFO"
              | "DEBUG";
            query: {
              filtering: Array<{
                filterKey: string;
                filterValue: string | number | boolean | null | bigint;
                occur: "should" | "must";
              }>;
              limit: number;
              rectangle: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              sorting: {
                interval: { endExclusive?: number; startInclusive?: number };
              };
            };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              coordinates: { latitude: number; longitude: number };
              key: string;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      update: FunctionReference<
        "mutation",
        "internal",
        {
          config: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          document: {
            coordinates?: { latitude: number; longitude: number };
            filterKeys?: Record<
              string,
              | string
              | number
              | boolean
              | null
              | bigint
              | Array<string | number | boolean | null | bigint>
            >;
            key: string;
            sortKey?: number;
          };
        },
        boolean,
        Name
      >;
    };
    polygons: {
      del: FunctionReference<
        "mutation",
        "internal",
        {
          config?: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          key: string;
        },
        boolean,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: string },
        {
          boundingBox: {
            east: number;
            north: number;
            south: number;
            west: number;
          };
          coordinates: {
            exterior: Array<{ latitude: number; longitude: number }>;
            holes?: Array<Array<{ latitude: number; longitude: number }>>;
          };
          filterKeys?: Record<
            string,
            | string
            | number
            | boolean
            | null
            | bigint
            | Array<string | number | boolean | null | bigint>
          >;
          key: string;
          sortKey: number;
        } | null,
        Name
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          config?: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          document: {
            coordinates: {
              exterior: Array<{ latitude: number; longitude: number }>;
              holes?: Array<Array<{ latitude: number; longitude: number }>>;
            };
            filterKeys?: Record<
              string,
              | string
              | number
              | boolean
              | null
              | bigint
              | Array<string | number | boolean | null | bigint>
            >;
            key: string;
            sortKey: number;
          };
        },
        null,
        Name
      >;
      measure: {
        area: FunctionReference<
          "query",
          "internal",
          {
            polygon: {
              exterior: Array<{ latitude: number; longitude: number }>;
              holes?: Array<Array<{ latitude: number; longitude: number }>>;
            };
          },
          number,
          Name
        >;
        centroid: FunctionReference<
          "query",
          "internal",
          {
            polygon: {
              exterior: Array<{ latitude: number; longitude: number }>;
              holes?: Array<Array<{ latitude: number; longitude: number }>>;
            };
          },
          { latitude: number; longitude: number },
          Name
        >;
        perimeter: FunctionReference<
          "query",
          "internal",
          {
            polygon: {
              exterior: Array<{ latitude: number; longitude: number }>;
              holes?: Array<Array<{ latitude: number; longitude: number }>>;
            };
          },
          number,
          Name
        >;
      };
      spatial: {
        contains: FunctionReference<
          "query",
          "internal",
          {
            config: {
              levelMod: number;
              maxCells: number;
              maxLevel: number;
              minLevel: number;
            };
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            logLevel?:
              | "EMERGENCY"
              | "ALERT"
              | "CRITICAL"
              | "ERROR"
              | "WARNING"
              | "NOTICE"
              | "INFO"
              | "DEBUG";
            shape:
              | {
                  rectangle: {
                    east: number;
                    north: number;
                    south: number;
                    west: number;
                  };
                  type: "rectangle";
                }
              | {
                  polygon: {
                    exterior: Array<{ latitude: number; longitude: number }>;
                    holes?: Array<
                      Array<{ latitude: number; longitude: number }>
                    >;
                  };
                  type: "polygon";
                }
              | {
                  point: { latitude: number; longitude: number };
                  type: "point";
                };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates: {
                exterior: Array<{ latitude: number; longitude: number }>;
                holes?: Array<Array<{ latitude: number; longitude: number }>>;
              };
              key: string;
              sortKey: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        intersects: FunctionReference<
          "query",
          "internal",
          {
            config: {
              levelMod: number;
              maxCells: number;
              maxLevel: number;
              minLevel: number;
            };
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            logLevel?:
              | "EMERGENCY"
              | "ALERT"
              | "CRITICAL"
              | "ERROR"
              | "WARNING"
              | "NOTICE"
              | "INFO"
              | "DEBUG";
            shape:
              | {
                  rectangle: {
                    east: number;
                    north: number;
                    south: number;
                    west: number;
                  };
                  type: "rectangle";
                }
              | {
                  polygon: {
                    exterior: Array<{ latitude: number; longitude: number }>;
                    holes?: Array<
                      Array<{ latitude: number; longitude: number }>
                    >;
                  };
                  type: "polygon";
                }
              | {
                  point: { latitude: number; longitude: number };
                  type: "point";
                };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates: {
                exterior: Array<{ latitude: number; longitude: number }>;
                holes?: Array<Array<{ latitude: number; longitude: number }>>;
              };
              key: string;
              sortKey: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        nearest: FunctionReference<
          "query",
          "internal",
          {
            config: {
              levelMod: number;
              maxCells: number;
              maxLevel: number;
              minLevel: number;
            };
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            logLevel?:
              | "EMERGENCY"
              | "ALERT"
              | "CRITICAL"
              | "ERROR"
              | "WARNING"
              | "NOTICE"
              | "INFO"
              | "DEBUG";
            maxDistance?: number;
            point: { latitude: number; longitude: number };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates: {
                exterior: Array<{ latitude: number; longitude: number }>;
                holes?: Array<Array<{ latitude: number; longitude: number }>>;
              };
              distance: number;
              key: string;
              sortKey: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      update: FunctionReference<
        "mutation",
        "internal",
        {
          config?: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          document: {
            coordinates?: {
              exterior: Array<{ latitude: number; longitude: number }>;
              holes?: Array<Array<{ latitude: number; longitude: number }>>;
            };
            filterKeys?: Record<
              string,
              | string
              | number
              | boolean
              | null
              | bigint
              | Array<string | number | boolean | null | bigint>
            >;
            key: string;
            sortKey?: number;
          };
        },
        boolean,
        Name
      >;
    };
    polylines: {
      del: FunctionReference<
        "mutation",
        "internal",
        {
          config?: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          key: string;
        },
        boolean,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: string },
        {
          boundingBox: {
            east: number;
            north: number;
            south: number;
            west: number;
          };
          coordinates: Array<{ latitude: number; longitude: number }>;
          filterKeys?: Record<
            string,
            | string
            | number
            | boolean
            | null
            | bigint
            | Array<string | number | boolean | null | bigint>
          >;
          key: string;
          sortKey: number;
        } | null,
        Name
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          config?: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          document: {
            coordinates: Array<{ latitude: number; longitude: number }>;
            filterKeys?: Record<
              string,
              | string
              | number
              | boolean
              | null
              | bigint
              | Array<string | number | boolean | null | bigint>
            >;
            key: string;
            sortKey: number;
          };
        },
        null,
        Name
      >;
      measure: {
        centroid: FunctionReference<
          "query",
          "internal",
          { polyline: Array<{ latitude: number; longitude: number }> },
          { latitude: number; longitude: number },
          Name
        >;
        length: FunctionReference<
          "query",
          "internal",
          { polyline: Array<{ latitude: number; longitude: number }> },
          number,
          Name
        >;
      };
      spatial: {
        intersects: FunctionReference<
          "query",
          "internal",
          {
            config: {
              levelMod: number;
              maxCells: number;
              maxLevel: number;
              minLevel: number;
            };
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            logLevel?:
              | "EMERGENCY"
              | "ALERT"
              | "CRITICAL"
              | "ERROR"
              | "WARNING"
              | "NOTICE"
              | "INFO"
              | "DEBUG";
            shape:
              | {
                  rectangle: {
                    east: number;
                    north: number;
                    south: number;
                    west: number;
                  };
                  type: "rectangle";
                }
              | {
                  polygon: {
                    exterior: Array<{ latitude: number; longitude: number }>;
                    holes?: Array<
                      Array<{ latitude: number; longitude: number }>
                    >;
                  };
                  type: "polygon";
                }
              | {
                  point: { latitude: number; longitude: number };
                  type: "point";
                };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates: Array<{ latitude: number; longitude: number }>;
              key: string;
              sortKey: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
        nearest: FunctionReference<
          "query",
          "internal",
          {
            config: {
              levelMod: number;
              maxCells: number;
              maxLevel: number;
              minLevel: number;
            };
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            logLevel?:
              | "EMERGENCY"
              | "ALERT"
              | "CRITICAL"
              | "ERROR"
              | "WARNING"
              | "NOTICE"
              | "INFO"
              | "DEBUG";
            maxDistance?: number;
            point: { latitude: number; longitude: number };
          },
          {
            continueCursor: string;
            isDone: boolean;
            page: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates: Array<{ latitude: number; longitude: number }>;
              distance: number;
              key: string;
              sortKey: number;
            }>;
            pageStatus?: "SplitRecommended" | "SplitRequired" | null;
            splitCursor?: string | null;
          },
          Name
        >;
      };
      update: FunctionReference<
        "mutation",
        "internal",
        {
          config?: {
            levelMod: number;
            maxCells: number;
            maxLevel: number;
            minLevel: number;
          };
          document: {
            coordinates?: Array<{ latitude: number; longitude: number }>;
            filterKeys?: Record<
              string,
              | string
              | number
              | boolean
              | null
              | bigint
              | Array<string | number | boolean | null | bigint>
            >;
            key: string;
            sortKey?: number;
          };
        },
        boolean,
        Name
      >;
    };
  };
