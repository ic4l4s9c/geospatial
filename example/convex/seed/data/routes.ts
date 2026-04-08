import type { Point } from "@convex-dev/geospatial";
import { WithoutSystemFields } from "convex/server";
import { Doc } from "../../_generated/dataModel";

export type RouteSeedDoc = WithoutSystemFields<Doc<"routes">> & {
  coordinates: Point[];
};

export const ROUTES_SEED_DATA: RouteSeedDoc[] = [
  {
    name: "Brooklyn Bridge Walk",
    description:
      "Classic 1.3-mile pedestrian crossing of the Brooklyn Bridge with panoramic skyline views.",
    mode: "walking",
    tags: ["scenic", "historic", "iconic", "views", "free"],
    durationMinutes: 30,
    coordinates: [
      { latitude: 40.6961, longitude: -73.995 },
      { latitude: 40.7, longitude: -73.996 },
      { latitude: 40.703, longitude: -73.9965 },
      { latitude: 40.7061, longitude: -73.9969 },
      { latitude: 40.708, longitude: -73.996 },
      { latitude: 40.71, longitude: -73.994 },
    ],
  },
  {
    name: "High Line Stroll",
    description:
      "2.33-mile elevated walkway through Chelsea and Hudson Yards with curated art installations.",
    mode: "walking",
    tags: ["urban", "art", "scenic", "gardens", "free"],
    durationMinutes: 45,
    coordinates: [
      { latitude: 40.7396, longitude: -74.0089 },
      { latitude: 40.743, longitude: -74.0068 },
      { latitude: 40.747, longitude: -74.005 },
      { latitude: 40.751, longitude: -74.003 },
      { latitude: 40.755, longitude: -74.001 },
      { latitude: 40.758, longitude: -73.9997 },
      { latitude: 40.76, longitude: -73.998 },
      { latitude: 40.7622, longitude: -73.9997 },
    ],
  },
  {
    name: "Battery Park to Brooklyn Bridge Walk",
    description:
      "Southern Manhattan waterfront promenade from Battery Park past Wall Street to the Brooklyn Bridge.",
    mode: "walking",
    tags: ["waterfront", "scenic", "historic", "free"],
    durationMinutes: 40,
    coordinates: [
      { latitude: 40.7033, longitude: -74.017 },
      { latitude: 40.704, longitude: -74.013 },
      { latitude: 40.7049, longitude: -74.01 },
      { latitude: 40.7057, longitude: -74.007 },
      { latitude: 40.7061, longitude: -73.9969 },
    ],
  },
  {
    name: "Museum Mile Walk",
    description:
      "A stroll along Fifth Avenue past nine world-class museums from the Met to El Museo del Barrio.",
    mode: "walking",
    tags: ["museums", "cultural", "upper-east-side", "scenic"],
    durationMinutes: 35,
    coordinates: [
      { latitude: 40.7794, longitude: -73.9632 },
      { latitude: 40.782, longitude: -73.961 },
      { latitude: 40.783, longitude: -73.9595 },
      { latitude: 40.785, longitude: -73.958 },
      { latitude: 40.788, longitude: -73.956 },
      { latitude: 40.791, longitude: -73.9546 },
    ],
  },
  {
    name: "Williamsburg Street Art Walk",
    description:
      "Curated walking tour of Williamsburg's world-renowned outdoor murals and street art.",
    mode: "walking",
    tags: ["art", "brooklyn", "street-art", "free", "cultural"],
    durationMinutes: 50,
    coordinates: [
      { latitude: 40.7143, longitude: -73.9614 },
      { latitude: 40.716, longitude: -73.959 },
      { latitude: 40.7175, longitude: -73.957 },
      { latitude: 40.719, longitude: -73.954 },
      { latitude: 40.72, longitude: -73.951 },
      { latitude: 40.7155, longitude: -73.948 },
    ],
  },
  {
    name: "Central Park Great Loop",
    description:
      "Complete 6.1-mile loop around the interior drive, one of the best urban walks in the world.",
    mode: "walking",
    tags: ["park", "nature", "free", "popular", "loop"],
    durationMinutes: 120,
    coordinates: [
      { latitude: 40.7644, longitude: -73.973 },
      { latitude: 40.77, longitude: -73.972 },
      { latitude: 40.776, longitude: -73.968 },
      { latitude: 40.7851, longitude: -73.9683 },
      { latitude: 40.792, longitude: -73.962 },
      { latitude: 40.7968, longitude: -73.958 },
      { latitude: 40.793, longitude: -73.973 },
      { latitude: 40.78, longitude: -73.982 },
      { latitude: 40.77, longitude: -73.986 },
      { latitude: 40.7644, longitude: -73.973 },
    ],
  },
  {
    name: "DUMBO to Cobble Hill Waterfront Walk",
    description:
      "Brooklyn waterfront promenade offering unmatched views of Manhattan and the bridges.",
    mode: "walking",
    tags: ["waterfront", "scenic", "brooklyn", "views", "free"],
    durationMinutes: 35,
    coordinates: [
      { latitude: 40.7023, longitude: -73.9944 },
      { latitude: 40.7, longitude: -73.996 },
      { latitude: 40.698, longitude: -73.999 },
      { latitude: 40.695, longitude: -74.002 },
      { latitude: 40.692, longitude: -74.005 },
    ],
  },
  {
    name: "Greenwich Village Literary Walk",
    description:
      "Walking tour of the Village's literary landmarks, from Dylan Thomas haunts to Jack Kerouac's streets.",
    mode: "walking",
    tags: ["literary", "historic", "cultural", "manhattan", "bohemian"],
    durationMinutes: 60,
    coordinates: [
      { latitude: 40.7309, longitude: -74.0022 },
      { latitude: 40.73, longitude: -74.001 },
      { latitude: 40.7308, longitude: -73.9998 },
      { latitude: 40.732, longitude: -73.9975 },
      { latitude: 40.7335, longitude: -73.996 },
      { latitude: 40.7345, longitude: -73.995 },
    ],
  },
  {
    name: "Central Park Loop (Cycling)",
    description:
      "6.1-mile car-free loop around Central Park, NYC's premier cycling circuit.",
    mode: "cycling",
    tags: ["park", "free", "popular", "loop", "scenic"],
    durationMinutes: 30,
    coordinates: [
      { latitude: 40.7644, longitude: -73.973 },
      { latitude: 40.77, longitude: -73.97 },
      { latitude: 40.778, longitude: -73.968 },
      { latitude: 40.7851, longitude: -73.9683 },
      { latitude: 40.792, longitude: -73.969 },
      { latitude: 40.7968, longitude: -73.97 },
      { latitude: 40.795, longitude: -73.982 },
      { latitude: 40.78, longitude: -73.987 },
      { latitude: 40.77, longitude: -73.986 },
      { latitude: 40.7644, longitude: -73.973 },
    ],
  },
  {
    name: "Hudson River Greenway — Full Length",
    description:
      "11-mile dedicated cycling path along the western edge of Manhattan from Battery Park to Inwood.",
    mode: "cycling",
    tags: ["greenway", "waterfront", "dedicated-lane", "scenic", "long-ride"],
    durationMinutes: 70,
    coordinates: [
      { latitude: 40.7033, longitude: -74.017 },
      { latitude: 40.72, longitude: -74.012 },
      { latitude: 40.74, longitude: -74.006 },
      { latitude: 40.75, longitude: -74.004 },
      { latitude: 40.76, longitude: -74.0 },
      { latitude: 40.78, longitude: -73.99 },
      { latitude: 40.8, longitude: -73.97 },
      { latitude: 40.82, longitude: -73.95 },
      { latitude: 40.85, longitude: -73.935 },
    ],
  },
  {
    name: "Brooklyn Waterfront Bike Path",
    description:
      "Scenic cycling route along Brooklyn's East River waterfront from Greenpoint to Red Hook.",
    mode: "cycling",
    tags: ["waterfront", "brooklyn", "scenic", "dedicated-lane"],
    durationMinutes: 45,
    coordinates: [
      { latitude: 40.73, longitude: -73.954 },
      { latitude: 40.72, longitude: -73.958 },
      { latitude: 40.71, longitude: -73.965 },
      { latitude: 40.7023, longitude: -73.9944 },
      { latitude: 40.69, longitude: -74.005 },
      { latitude: 40.675, longitude: -74.015 },
    ],
  },
  {
    name: "Prospect Park Cycling Loop",
    description:
      "3.35-mile car-free loop through Prospect Park, Brooklyn's finest cycling circuit.",
    mode: "cycling",
    tags: ["park", "brooklyn", "loop", "free", "popular"],
    durationMinutes: 20,
    coordinates: [
      { latitude: 40.66, longitude: -73.972 },
      { latitude: 40.665, longitude: -73.97 },
      { latitude: 40.67, longitude: -73.968 },
      { latitude: 40.672, longitude: -73.972 },
      { latitude: 40.67, longitude: -73.976 },
      { latitude: 40.665, longitude: -73.978 },
      { latitude: 40.66, longitude: -73.972 },
    ],
  },
  {
    name: "Citi Bike Commuter Route — Midtown to FiDi",
    description:
      "Popular 4-mile Citi Bike commuter corridor connecting Midtown offices to the Financial District.",
    mode: "cycling",
    tags: ["commuter", "citi-bike", "urban", "practical"],
    durationMinutes: 25,
    coordinates: [
      { latitude: 40.755, longitude: -73.984 },
      { latitude: 40.75, longitude: -73.986 },
      { latitude: 40.743, longitude: -73.989 },
      { latitude: 40.735, longitude: -73.992 },
      { latitude: 40.727, longitude: -73.995 },
      { latitude: 40.72, longitude: -73.998 },
      { latitude: 40.71, longitude: -74.01 },
      { latitude: 40.7049, longitude: -74.013 },
    ],
  },
  {
    name: "M15 Bus — 1st Avenue (Full Route)",
    description:
      "NYC's busiest bus route running the length of Manhattan along 1st Avenue.",
    mode: "transit",
    tags: ["bus", "manhattan", "north-south", "frequent"],
    durationMinutes: 75,
    coordinates: [
      { latitude: 40.702, longitude: -73.9826 },
      { latitude: 40.71, longitude: -73.981 },
      { latitude: 40.72, longitude: -73.98 },
      { latitude: 40.73, longitude: -73.979 },
      { latitude: 40.74, longitude: -73.977 },
      { latitude: 40.75, longitude: -73.975 },
      { latitude: 40.76, longitude: -73.973 },
      { latitude: 40.77, longitude: -73.9715 },
      { latitude: 40.78, longitude: -73.97 },
      { latitude: 40.79, longitude: -73.969 },
    ],
  },
  {
    name: "B63 Bus — 5th Avenue Brooklyn",
    description:
      "Brooklyn's main north-south bus serving Park Slope and Bay Ridge along 5th Avenue.",
    mode: "transit",
    tags: ["bus", "brooklyn", "north-south", "frequent"],
    durationMinutes: 55,
    coordinates: [
      { latitude: 40.701, longitude: -73.983 },
      { latitude: 40.69, longitude: -73.984 },
      { latitude: 40.68, longitude: -73.985 },
      { latitude: 40.67, longitude: -73.986 },
      { latitude: 40.66, longitude: -73.9875 },
      { latitude: 40.645, longitude: -73.99 },
      { latitude: 40.63, longitude: -73.992 },
    ],
  },
  {
    name: "L Train — Canarsie to 8th Avenue",
    description:
      "NYC Subway L line connecting Canarsie in Brooklyn to 8th Avenue in Manhattan.",
    mode: "transit",
    tags: ["subway", "l-train", "brooklyn", "manhattan", "underground"],
    durationMinutes: 40,
    coordinates: [
      { latitude: 40.6463, longitude: -73.9016 },
      { latitude: 40.6552, longitude: -73.9179 },
      { latitude: 40.6633, longitude: -73.9337 },
      { latitude: 40.6784, longitude: -73.9536 },
      { latitude: 40.7004, longitude: -73.9551 },
      { latitude: 40.7143, longitude: -73.9614 },
      { latitude: 40.722, longitude: -73.9831 },
      { latitude: 40.7406, longitude: -74.0021 },
      { latitude: 40.7401, longitude: -74.0074 },
    ],
  },
  {
    name: "7 Train — Flushing to Times Square",
    description:
      "Iconic Queens subway connector linking Flushing's international food corridor to Midtown.",
    mode: "transit",
    tags: ["subway", "7-train", "queens", "manhattan", "international"],
    durationMinutes: 45,
    coordinates: [
      { latitude: 40.7596, longitude: -73.8303 },
      { latitude: 40.745, longitude: -73.848 },
      { latitude: 40.746, longitude: -73.883 },
      { latitude: 40.748, longitude: -73.92 },
      { latitude: 40.746, longitude: -73.951 },
      { latitude: 40.7546, longitude: -73.9863 },
    ],
  },
  {
    name: "NYC Ferry — East River Route",
    description:
      "NYC Ferry East River route connecting Astoria, Long Island City, DUMBO, and Wall Street.",
    mode: "ferry",
    tags: ["ferry", "waterfront", "scenic", "east-river", "commuter"],
    durationMinutes: 50,
    coordinates: [
      { latitude: 40.7712, longitude: -73.9302 },
      { latitude: 40.748, longitude: -73.953 },
      { latitude: 40.724, longitude: -73.958 },
      { latitude: 40.71, longitude: -73.968 },
      { latitude: 40.7023, longitude: -73.9944 },
      { latitude: 40.701, longitude: -74.014 },
    ],
  },
  {
    name: "Staten Island Ferry",
    description:
      "Free 25-minute ferry ride offering spectacular views of the Statue of Liberty and Manhattan skyline.",
    mode: "ferry",
    tags: ["ferry", "free", "iconic", "views", "statue-of-liberty"],
    durationMinutes: 25,
    coordinates: [
      { latitude: 40.7014, longitude: -74.013 },
      { latitude: 40.696, longitude: -74.02 },
      { latitude: 40.685, longitude: -74.045 },
      { latitude: 40.6438, longitude: -74.0774 },
    ],
  },
  {
    name: "NYC Ferry — South Brooklyn Route",
    description:
      "NYC Ferry connecting Bay Ridge, Red Hook, and Pier 11 in Lower Manhattan.",
    mode: "ferry",
    tags: ["ferry", "brooklyn", "commuter", "waterfront"],
    durationMinutes: 40,
    coordinates: [
      { latitude: 40.635, longitude: -74.029 },
      { latitude: 40.65, longitude: -74.02 },
      { latitude: 40.675, longitude: -74.013 },
      { latitude: 40.688, longitude: -74.01 },
      { latitude: 40.701, longitude: -74.014 },
    ],
  },
  {
    name: "FDR Drive — Full Length",
    description:
      "Limited-access highway running the length of Manhattan's east side from the Battery to Harlem.",
    mode: "driving",
    tags: ["highway", "manhattan", "fast", "north-south"],
    durationMinutes: 30,
    coordinates: [
      { latitude: 40.701, longitude: -74.011 },
      { latitude: 40.71, longitude: -73.999 },
      { latitude: 40.72, longitude: -73.983 },
      { latitude: 40.735, longitude: -73.976 },
      { latitude: 40.75, longitude: -73.971 },
      { latitude: 40.77, longitude: -73.964 },
      { latitude: 40.79, longitude: -73.956 },
      { latitude: 40.81, longitude: -73.944 },
    ],
  },
  {
    name: "Belt Parkway — Brooklyn Segment",
    description:
      "Scenic parkway along Brooklyn's southern waterfront connecting the outer boroughs.",
    mode: "driving",
    tags: ["highway", "brooklyn", "scenic", "waterfront"],
    durationMinutes: 35,
    coordinates: [
      { latitude: 40.64, longitude: -74.02 },
      { latitude: 40.62, longitude: -73.99 },
      { latitude: 40.6, longitude: -73.95 },
      { latitude: 40.59, longitude: -73.9 },
      { latitude: 40.58, longitude: -73.85 },
      { latitude: 40.605, longitude: -73.79 },
    ],
  },
];
