import type { Point } from "@convex-dev/geospatial";
import { WithoutSystemFields } from "convex/server";
import { Doc } from "../../_generated/dataModel";

export type AreaSeedDoc = WithoutSystemFields<Doc<"areas">> & {
  coordinates: Point[];
};

export const AREAS_SEED_DATA: AreaSeedDoc[] = [
  {
    name: "Manhattan Outline",
    description: "Simplified outline of the Manhattan borough.",
    type: "borough",
    tags: ["borough", "manhattan", "official"],
    color: "#3B82F6",
    coordinates: [
      { latitude: 40.6998, longitude: -74.02 },
      { latitude: 40.7, longitude: -73.97 },
      { latitude: 40.73, longitude: -73.973 },
      { latitude: 40.78, longitude: -73.94 },
      { latitude: 40.85, longitude: -73.91 },
      { latitude: 40.87, longitude: -73.935 },
      { latitude: 40.85, longitude: -73.96 },
      { latitude: 40.79, longitude: -73.97 },
      { latitude: 40.74, longitude: -74.01 },
      { latitude: 40.6998, longitude: -74.02 },
    ],
  },
  {
    name: "Brooklyn Outline",
    description: "Simplified outline of the Brooklyn borough.",
    type: "borough",
    tags: ["borough", "brooklyn", "official"],
    color: "#10B981",
    coordinates: [
      { latitude: 40.57, longitude: -74.04 },
      { latitude: 40.58, longitude: -73.93 },
      { latitude: 40.64, longitude: -73.87 },
      { latitude: 40.69, longitude: -73.86 },
      { latitude: 40.74, longitude: -73.91 },
      { latitude: 40.7, longitude: -73.97 },
      { latitude: 40.65, longitude: -74.02 },
      { latitude: 40.57, longitude: -74.04 },
    ],
  },
  {
    name: "Queens Outline",
    description: "Simplified outline of the Queens borough.",
    type: "borough",
    tags: ["borough", "queens", "official"],
    color: "#8B5CF6",
    coordinates: [
      { latitude: 40.69, longitude: -73.86 },
      { latitude: 40.64, longitude: -73.87 },
      { latitude: 40.58, longitude: -73.93 },
      { latitude: 40.55, longitude: -73.77 },
      { latitude: 40.6, longitude: -73.7 },
      { latitude: 40.76, longitude: -73.7 },
      { latitude: 40.79, longitude: -73.8 },
      { latitude: 40.74, longitude: -73.91 },
      { latitude: 40.69, longitude: -73.86 },
    ],
  },
  {
    name: "Lower Manhattan",
    description:
      "Financial District and civic centre at the southern tip of Manhattan.",
    type: "district",
    tags: ["financial", "historic", "commercial", "manhattan"],
    color: "#1D4ED8",
    coordinates: [
      { latitude: 40.7, longitude: -74.02 },
      { latitude: 40.7, longitude: -73.97 },
      { latitude: 40.72, longitude: -73.97 },
      { latitude: 40.72, longitude: -74.02 },
      { latitude: 40.7, longitude: -74.02 },
    ],
  },
  {
    name: "Tribeca",
    description:
      "Trendy Triangle Below Canal Street neighbourhood known for its cast-iron architecture.",
    type: "district",
    tags: ["trendy", "residential", "restaurants", "manhattan"],
    color: "#2563EB",
    coordinates: [
      { latitude: 40.715, longitude: -74.015 },
      { latitude: 40.715, longitude: -74.0 },
      { latitude: 40.72, longitude: -74.0 },
      { latitude: 40.72, longitude: -74.015 },
      { latitude: 40.715, longitude: -74.015 },
    ],
  },
  {
    name: "SoHo",
    description:
      "Cast-iron architecture, high-end boutiques, and art galleries south of Houston.",
    type: "district",
    tags: ["shopping", "art", "historic", "manhattan", "trendy"],
    color: "#7C3AED",
    coordinates: [
      { latitude: 40.723, longitude: -74.006 },
      { latitude: 40.723, longitude: -73.997 },
      { latitude: 40.727, longitude: -73.997 },
      { latitude: 40.727, longitude: -74.006 },
      { latitude: 40.723, longitude: -74.006 },
    ],
  },
  {
    name: "Greenwich Village",
    description:
      "Bohemian neighbourhood with tree-lined streets, jazz clubs, and NYU.",
    type: "district",
    tags: ["bohemian", "nightlife", "restaurants", "historic", "manhattan"],
    color: "#5B21B6",
    coordinates: [
      { latitude: 40.728, longitude: -74.008 },
      { latitude: 40.728, longitude: -73.995 },
      { latitude: 40.736, longitude: -73.995 },
      { latitude: 40.736, longitude: -74.008 },
      { latitude: 40.728, longitude: -74.008 },
    ],
  },
  {
    name: "Chelsea",
    description:
      "Art galleries, the High Line, and vibrant nightlife on the West Side.",
    type: "district",
    tags: ["art", "nightlife", "lgbtq+", "manhattan", "galleries"],
    color: "#EC4899",
    coordinates: [
      { latitude: 40.738, longitude: -74.01 },
      { latitude: 40.738, longitude: -73.995 },
      { latitude: 40.752, longitude: -73.995 },
      { latitude: 40.752, longitude: -74.01 },
      { latitude: 40.738, longitude: -74.01 },
    ],
  },
  {
    name: "Midtown Manhattan",
    description:
      "NYC's business and tourism hub, home to Times Square, skyscrapers, and theatres.",
    type: "district",
    tags: ["business", "shopping", "tourism", "manhattan", "theatre"],
    color: "#F59E0B",
    coordinates: [
      { latitude: 40.74, longitude: -74.005 },
      { latitude: 40.74, longitude: -73.95 },
      { latitude: 40.77, longitude: -73.95 },
      { latitude: 40.77, longitude: -74.005 },
      { latitude: 40.74, longitude: -74.005 },
    ],
  },
  {
    name: "Upper East Side",
    description:
      "Wealthy residential neighbourhood home to Museum Mile and fine dining.",
    type: "district",
    tags: ["residential", "wealthy", "museums", "manhattan", "upscale"],
    color: "#0EA5E9",
    coordinates: [
      { latitude: 40.765, longitude: -73.97 },
      { latitude: 40.765, longitude: -73.95 },
      { latitude: 40.8, longitude: -73.95 },
      { latitude: 40.8, longitude: -73.97 },
      { latitude: 40.765, longitude: -73.97 },
    ],
  },
  {
    name: "Upper West Side",
    description:
      "Cultural and intellectual neighbourhood alongside Central Park and Riverside Park.",
    type: "district",
    tags: ["residential", "cultural", "parks", "manhattan", "family-friendly"],
    color: "#14B8A6",
    coordinates: [
      { latitude: 40.765, longitude: -73.99 },
      { latitude: 40.765, longitude: -73.97 },
      { latitude: 40.8, longitude: -73.97 },
      { latitude: 40.8, longitude: -73.99 },
      { latitude: 40.765, longitude: -73.99 },
    ],
  },
  {
    name: "Harlem",
    description:
      "Historic African-American cultural capital with jazz heritage and soul food.",
    type: "district",
    tags: ["cultural", "historic", "jazz", "manhattan", "soul-food"],
    color: "#F97316",
    coordinates: [
      { latitude: 40.8, longitude: -73.98 },
      { latitude: 40.8, longitude: -73.93 },
      { latitude: 40.83, longitude: -73.93 },
      { latitude: 40.83, longitude: -73.98 },
      { latitude: 40.8, longitude: -73.98 },
    ],
  },
  {
    name: "Williamsburg",
    description:
      "Trendy Brooklyn neighbourhood known for its music scene, street art, and hipster culture.",
    type: "neighborhood",
    tags: ["trendy", "nightlife", "art", "brooklyn", "hipster"],
    color: "#6366F1",
    coordinates: [
      { latitude: 40.7, longitude: -73.97 },
      { latitude: 40.7, longitude: -73.945 },
      { latitude: 40.725, longitude: -73.945 },
      { latitude: 40.725, longitude: -73.97 },
      { latitude: 40.7, longitude: -73.97 },
    ],
  },
  {
    name: "DUMBO",
    description:
      "Cobblestoned neighbourhood under the Manhattan Bridge with start-ups and river views.",
    type: "neighborhood",
    tags: ["tech", "art", "waterfront", "brooklyn", "views"],
    color: "#0891B2",
    coordinates: [
      { latitude: 40.702, longitude: -73.998 },
      { latitude: 40.702, longitude: -73.99 },
      { latitude: 40.706, longitude: -73.99 },
      { latitude: 40.706, longitude: -73.998 },
      { latitude: 40.702, longitude: -73.998 },
    ],
  },
  {
    name: "Park Slope",
    description:
      "Family-friendly neighbourhood bordering Prospect Park with brownstones and cafes.",
    type: "neighborhood",
    tags: [
      "family-friendly",
      "residential",
      "parks",
      "brooklyn",
      "brownstones",
    ],
    color: "#059669",
    coordinates: [
      { latitude: 40.66, longitude: -73.99 },
      { latitude: 40.66, longitude: -73.97 },
      { latitude: 40.68, longitude: -73.97 },
      { latitude: 40.68, longitude: -73.99 },
      { latitude: 40.66, longitude: -73.99 },
    ],
  },
  {
    name: "Midtown Delivery Zone A",
    description:
      "Primary food-delivery coverage zone for central Midtown Manhattan.",
    type: "delivery-zone",
    tags: ["delivery", "commercial", "manhattan"],
    color: "#EF4444",
    coordinates: [
      { latitude: 40.748, longitude: -73.998 },
      { latitude: 40.748, longitude: -73.975 },
      { latitude: 40.758, longitude: -73.975 },
      { latitude: 40.758, longitude: -73.998 },
      { latitude: 40.748, longitude: -73.998 },
    ],
  },
  {
    name: "Downtown Brooklyn Delivery Zone",
    description:
      "Delivery zone serving Downtown Brooklyn and Brooklyn Heights.",
    type: "delivery-zone",
    tags: ["delivery", "brooklyn", "residential"],
    color: "#F59E0B",
    coordinates: [
      { latitude: 40.688, longitude: -73.995 },
      { latitude: 40.688, longitude: -73.975 },
      { latitude: 40.702, longitude: -73.975 },
      { latitude: 40.702, longitude: -73.995 },
      { latitude: 40.688, longitude: -73.995 },
    ],
  },
  {
    name: "Williamsburg Express Delivery Zone",
    description:
      "Fast-delivery zone covering the core of Williamsburg, Brooklyn.",
    type: "delivery-zone",
    tags: ["delivery", "express", "brooklyn", "williamsburg"],
    color: "#F97316",
    coordinates: [
      { latitude: 40.705, longitude: -73.965 },
      { latitude: 40.705, longitude: -73.95 },
      { latitude: 40.72, longitude: -73.95 },
      { latitude: 40.72, longitude: -73.965 },
      { latitude: 40.705, longitude: -73.965 },
    ],
  },
  {
    name: "Central Park Boundary",
    description: "Official boundary of Central Park as a mapped region.",
    type: "park-boundary",
    tags: ["park", "official", "green-space", "manhattan"],
    color: "#16A34A",
    coordinates: [
      { latitude: 40.7644, longitude: -73.973 },
      { latitude: 40.7644, longitude: -73.958 },
      { latitude: 40.7968, longitude: -73.958 },
      { latitude: 40.7968, longitude: -73.973 },
      { latitude: 40.7644, longitude: -73.973 },
    ],
  },
  {
    name: "Prospect Park Boundary",
    description: "Official boundary of Prospect Park in Brooklyn.",
    type: "park-boundary",
    tags: ["park", "official", "green-space", "brooklyn"],
    color: "#15803D",
    coordinates: [
      { latitude: 40.6511, longitude: -73.975 },
      { latitude: 40.6511, longitude: -73.962 },
      { latitude: 40.672, longitude: -73.962 },
      { latitude: 40.672, longitude: -73.975 },
      { latitude: 40.6511, longitude: -73.975 },
    ],
  },
  {
    name: "Columbia University Campus Zone",
    description:
      "Speed and safety zone surrounding Columbia University campus in Morningside Heights.",
    type: "school-zone",
    tags: ["university", "safety", "speed-limit", "manhattan"],
    color: "#93C5FD",
    coordinates: [
      { latitude: 40.8045, longitude: -73.968 },
      { latitude: 40.8045, longitude: -73.959 },
      { latitude: 40.8105, longitude: -73.959 },
      { latitude: 40.8105, longitude: -73.968 },
      { latitude: 40.8045, longitude: -73.968 },
    ],
  },
  {
    name: "NYU Campus Zone",
    description:
      "Safety zone around New York University's Washington Square campus.",
    type: "school-zone",
    tags: [
      "university",
      "safety",
      "speed-limit",
      "manhattan",
      "greenwich-village",
    ],
    color: "#7DD3FC",
    coordinates: [
      { latitude: 40.728, longitude: -73.999 },
      { latitude: 40.728, longitude: -73.994 },
      { latitude: 40.7325, longitude: -73.994 },
      { latitude: 40.7325, longitude: -73.999 },
      { latitude: 40.728, longitude: -73.999 },
    ],
  },
  {
    name: "Red Hook Flood Zone",
    description: "FEMA-designated high-risk flood zone in Red Hook, Brooklyn.",
    type: "flood-zone",
    tags: ["flood", "fema", "risk", "brooklyn", "waterfront"],
    color: "#FECACA",
    coordinates: [
      { latitude: 40.671, longitude: -74.02 },
      { latitude: 40.671, longitude: -74.0 },
      { latitude: 40.685, longitude: -74.0 },
      { latitude: 40.685, longitude: -74.02 },
      { latitude: 40.671, longitude: -74.02 },
    ],
  },
  {
    name: "Lower Manhattan Flood Zone",
    description: "Coastal flood risk area at the southern tip of Manhattan.",
    type: "flood-zone",
    tags: ["flood", "fema", "risk", "manhattan", "waterfront"],
    color: "#FCA5A5",
    coordinates: [
      { latitude: 40.699, longitude: -74.02 },
      { latitude: 40.699, longitude: -74.005 },
      { latitude: 40.706, longitude: -74.005 },
      { latitude: 40.706, longitude: -74.02 },
      { latitude: 40.699, longitude: -74.02 },
    ],
  },
  {
    name: "Times Square Special District",
    description:
      "Specially regulated district controlling signage, retail, and development around Times Square.",
    type: "special-district",
    tags: ["entertainment", "tourism", "commercial", "manhattan", "neon"],
    color: "#FDE047",
    coordinates: [
      { latitude: 40.754, longitude: -73.992 },
      { latitude: 40.754, longitude: -73.983 },
      { latitude: 40.762, longitude: -73.983 },
      { latitude: 40.762, longitude: -73.992 },
      { latitude: 40.754, longitude: -73.992 },
    ],
  },
  {
    name: "Hudson Yards Special District",
    description:
      "NYC's newest neighbourhood built atop a rail yard on the Far West Side.",
    type: "special-district",
    tags: ["new-development", "luxury", "commercial", "manhattan", "modern"],
    color: "#A78BFA",
    coordinates: [
      { latitude: 40.752, longitude: -74.005 },
      { latitude: 40.752, longitude: -74.0 },
      { latitude: 40.756, longitude: -74.0 },
      { latitude: 40.756, longitude: -74.005 },
      { latitude: 40.752, longitude: -74.005 },
    ],
  },
];
