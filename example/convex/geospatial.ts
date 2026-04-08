import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { GeospatialIndex } from "@convex-dev/geospatial";

export const geospatial = new GeospatialIndex<
  Id<"places">,
  {
    category: string;
    tags: string[];
  },
  Id<"areas">,
  {
    type: string;
    tags: string[];
  },
  Id<"routes">,
  {
    mode: string;
    tags: string[];
  }
>(components.geospatial);
