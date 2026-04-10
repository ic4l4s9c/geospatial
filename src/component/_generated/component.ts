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
    geometry: {
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
          coordinates:
            | {
                exterior: Array<{ latitude: number; longitude: number }>;
                holes?: Array<Array<{ latitude: number; longitude: number }>>;
              }
            | Array<{ latitude: number; longitude: number }>;
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
          type: "polygon" | "polyline";
        } | null,
        Name
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        {
          coordinates:
            | {
                exterior: Array<{ latitude: number; longitude: number }>;
                holes?: Array<Array<{ latitude: number; longitude: number }>>;
              }
            | Array<{ latitude: number; longitude: number }>;
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
          type: "polygon" | "polyline";
        },
        null,
        Name
      >;
      query: {
        intersects: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            maxCoveringCells?: number;
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
                  bufferMeters: number;
                  polyline: Array<{ latitude: number; longitude: number }>;
                  type: "polyline";
                };
          },
          {
            nextCursor?: string;
            results: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates:
                | {
                    exterior: Array<{ latitude: number; longitude: number }>;
                    holes?: Array<
                      Array<{ latitude: number; longitude: number }>
                    >;
                  }
                | Array<{ latitude: number; longitude: number }>;
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
              type: "polygon" | "polyline";
            }>;
          },
          Name
        >;
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
            limit?: number;
            maxDistance?: number;
            point: { latitude: number; longitude: number };
          },
          {
            nextCursor?: string;
            results: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates:
                | {
                    exterior: Array<{ latitude: number; longitude: number }>;
                    holes?: Array<
                      Array<{ latitude: number; longitude: number }>
                    >;
                  }
                | Array<{ latitude: number; longitude: number }>;
              distance: number;
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
              type: "polygon" | "polyline";
            }>;
          },
          Name
        >;
      };
      remove: FunctionReference<
        "mutation",
        "internal",
        { key: string },
        boolean,
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          coordinates?:
            | {
                exterior: Array<{ latitude: number; longitude: number }>;
                holes?: Array<Array<{ latitude: number; longitude: number }>>;
              }
            | Array<{ latitude: number; longitude: number }>;
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
        },
        boolean,
        Name
      >;
    };
    point: {
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
          levelMod: number;
          maxCells: number;
          maxLevel: number;
          minLevel: number;
        },
        null,
        Name
      >;
      query: {
        execute: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            levelMod: number;
            logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
            maxCells: number;
            maxLevel: number;
            minLevel: number;
            query: {
              filtering: Array<{
                filterKey: string;
                filterValue: string | number | boolean | null | bigint;
                occur: "should" | "must";
              }>;
              maxResults: number;
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
                    bufferMeters: number;
                    polyline: Array<{ latitude: number; longitude: number }>;
                    type: "polyline";
                  };
              sorting: {
                interval: { endExclusive?: number; startInclusive?: number };
              };
            };
          },
          {
            nextCursor?: string;
            results: Array<{
              coordinates: { latitude: number; longitude: number };
              key: string;
            }>;
          },
          Name
        >;
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
            logLevel: "DEBUG" | "INFO" | "WARN" | "ERROR";
            maxDistance?: number;
            maxLevel: number;
            maxResults: number;
            minLevel: number;
            point: { latitude: number; longitude: number };
            sorting: {
              interval: { endExclusive?: number; startInclusive?: number };
            };
          },
          {
            nextCursor?: string;
            results: Array<{
              coordinates: { latitude: number; longitude: number };
              distance: number;
              key: string;
            }>;
          },
          Name
        >;
      };
      remove: FunctionReference<
        "mutation",
        "internal",
        {
          key: string;
          levelMod: number;
          maxCells: number;
          maxLevel: number;
          minLevel: number;
        },
        boolean,
        Name
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
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
          levelMod: number;
          maxCells: number;
          maxLevel: number;
          minLevel: number;
          sortKey?: number;
        },
        boolean,
        Name
      >;
    };
    polygon: {
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
      query: {
        contains: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            point: { latitude: number; longitude: number };
          },
          {
            nextCursor?: string;
            results: Array<{
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
              type: "polygon";
            }>;
          },
          Name
        >;
        intersects: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            maxCoveringCells?: number;
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
                  bufferMeters: number;
                  polyline: Array<{ latitude: number; longitude: number }>;
                  type: "polyline";
                };
          },
          {
            nextCursor?: string;
            results: Array<{
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
              type: "polygon";
            }>;
          },
          Name
        >;
        nearest: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            maxDistance?: number;
            point: { latitude: number; longitude: number };
          },
          {
            nextCursor?: string;
            results: Array<{
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
              type: "polygon";
            }>;
          },
          Name
        >;
      };
    };
    polyline: {
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
      query: {
        intersects: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            maxCoveringCells?: number;
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
                  bufferMeters: number;
                  polyline: Array<{ latitude: number; longitude: number }>;
                  type: "polyline";
                };
          },
          {
            nextCursor?: string;
            results: Array<{
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
              type: "polyline";
            }>;
          },
          Name
        >;
        nearest: FunctionReference<
          "query",
          "internal",
          {
            cursor?: string;
            filtering?: Array<{
              filterKey: string;
              filterValue: string | number | boolean | null | bigint;
              occur: "should" | "must";
            }>;
            limit?: number;
            maxDistance?: number;
            point: { latitude: number; longitude: number };
          },
          {
            nextCursor?: string;
            results: Array<{
              boundingBox: {
                east: number;
                north: number;
                south: number;
                west: number;
              };
              coordinates: Array<{ latitude: number; longitude: number }>;
              distance: number;
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
              type: "polyline";
            }>;
          },
          Name
        >;
      };
    };
  };
