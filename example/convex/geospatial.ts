import { Geospatial } from "@convex-dev/geospatial";
import { components } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const geospatial = new Geospatial<Id<"locations">, { name: string }>(
  components.geospatial,
);
