import type { Point } from "@convex-dev/geospatial";
import { Doc } from "../../_generated/dataModel";
import { WithoutSystemFields } from "convex/server";

export type PlaceSeedDoc = WithoutSystemFields<Doc<"places">> & {
  coordinates: Point;
};

export const PLACES_SEED_DATA: PlaceSeedDoc[] = [
  {
    name: "Central Park",
    description:
      "840-acre urban oasis in the heart of Manhattan with meadows, lakes, and iconic landmarks.",
    category: "park",
    tags: ["outdoor", "family-friendly", "free", "nature", "running"],
    rating: 4.8,
    coordinates: { latitude: 40.7851, longitude: -73.9683 },
  },
  {
    name: "Prospect Park",
    description:
      "Brooklyn's premier park, designed by the creators of Central Park, featuring a lake and forest.",
    category: "park",
    tags: ["outdoor", "family-friendly", "free", "nature", "picnic"],
    rating: 4.7,
    coordinates: { latitude: 40.6602, longitude: -73.969 },
  },
  {
    name: "Battery Park",
    description:
      "Waterfront park at the southern tip of Manhattan with views of the Statue of Liberty.",
    category: "park",
    tags: ["outdoor", "free", "waterfront", "historic"],
    rating: 4.5,
    coordinates: { latitude: 40.7033, longitude: -74.017 },
  },
  {
    name: "Riverside Park",
    description:
      "Four-mile Hudson River park on the Upper West Side, popular with joggers and cyclists.",
    category: "park",
    tags: ["outdoor", "free", "waterfront", "running", "cycling"],
    rating: 4.6,
    coordinates: { latitude: 40.8011, longitude: -73.9711 },
  },
  {
    name: "High Line",
    description:
      "Elevated linear park built on a historic freight rail line on Manhattan's West Side.",
    category: "park",
    tags: ["outdoor", "urban", "free", "art", "scenic"],
    rating: 4.6,
    coordinates: { latitude: 40.748, longitude: -74.0048 },
  },
  {
    name: "Bryant Park",
    description:
      "Midtown oasis hosting free movies, ice skating, and events throughout the year.",
    category: "park",
    tags: ["outdoor", "free", "events", "seasonal", "urban"],
    rating: 4.5,
    coordinates: { latitude: 40.7536, longitude: -73.9832 },
  },
  {
    name: "Metropolitan Museum of Art",
    description:
      "One of the world's largest and finest art museums spanning 5,000 years of history.",
    category: "museum",
    tags: ["art", "indoor", "paid", "historic", "world-class"],
    rating: 4.9,
    imageUrl: "https://example.com/met.jpg",
    coordinates: { latitude: 40.7794, longitude: -73.9632 },
  },
  {
    name: "Museum of Modern Art",
    description:
      "Premier modern and contemporary art museum housing Picasso, Van Gogh, and Warhol.",
    category: "museum",
    tags: ["art", "indoor", "paid", "modern", "world-class"],
    rating: 4.8,
    imageUrl: "https://example.com/moma.jpg",
    coordinates: { latitude: 40.7614, longitude: -73.9776 },
  },
  {
    name: "American Museum of Natural History",
    description:
      "Iconic museum featuring dinosaur fossils, planetary shows, and anthropology exhibits.",
    category: "museum",
    tags: ["science", "indoor", "paid", "family-friendly", "dinosaurs"],
    rating: 4.8,
    coordinates: { latitude: 40.7813, longitude: -73.974 },
  },
  {
    name: "Guggenheim Museum",
    description:
      "Frank Lloyd Wright's spiraling masterpiece housing an extraordinary modern art collection.",
    category: "museum",
    tags: ["art", "indoor", "paid", "architecture", "modern"],
    rating: 4.7,
    coordinates: { latitude: 40.783, longitude: -73.959 },
  },
  {
    name: "Whitney Museum of American Art",
    description:
      "Leading museum of 20th and 21st century American art in the Meatpacking District.",
    category: "museum",
    tags: ["art", "indoor", "paid", "american", "contemporary"],
    rating: 4.6,
    coordinates: { latitude: 40.7396, longitude: -74.0089 },
  },
  {
    name: "Brooklyn Museum",
    description:
      "One of the largest art museums in the US with an encyclopedic collection.",
    category: "museum",
    tags: ["art", "indoor", "paid", "brooklyn", "diverse"],
    rating: 4.7,
    coordinates: { latitude: 40.6712, longitude: -73.9636 },
  },
  {
    name: "Joe's Pizza",
    description:
      "No-frills NYC institution serving the perfect classic slice since 1975.",
    category: "restaurant",
    tags: ["food", "pizza", "quick-bite", "cheap", "iconic"],
    rating: 4.5,
    coordinates: { latitude: 40.7308, longitude: -74.002 },
  },
  {
    name: "Katz's Delicatessen",
    description:
      "Legendary Lower East Side deli famous for its pastrami and corned beef sandwiches.",
    category: "restaurant",
    tags: ["food", "deli", "iconic", "historic", "jewish"],
    rating: 4.5,
    coordinates: { latitude: 40.7223, longitude: -73.9873 },
  },
  {
    name: "Peter Luger Steak House",
    description:
      "Brooklyn's legendary steakhouse serving dry-aged porterhouse since 1887.",
    category: "restaurant",
    tags: ["food", "steak", "fine-dining", "iconic", "brooklyn"],
    rating: 4.6,
    coordinates: { latitude: 40.7099, longitude: -73.9625 },
  },
  {
    name: "Ippudo NY",
    description:
      "Authentic Japanese ramen restaurant with rich tonkotsu broth.",
    category: "restaurant",
    tags: ["food", "ramen", "japanese", "asian", "popular"],
    rating: 4.4,
    coordinates: { latitude: 40.7319, longitude: -73.9899 },
  },
  {
    name: "Gramercy Tavern",
    description:
      "James Beard Award-winning American restaurant with a warm, rustic setting.",
    category: "restaurant",
    tags: ["food", "american", "fine-dining", "award-winning", "seasonal"],
    rating: 4.7,
    coordinates: { latitude: 40.7388, longitude: -73.9882 },
  },
  {
    name: "Di Fara Pizza",
    description:
      "Brooklyn pizza legend where Dom DeMarco has been crafting pies since 1965.",
    category: "restaurant",
    tags: ["food", "pizza", "iconic", "brooklyn", "cash-only"],
    rating: 4.6,
    coordinates: { latitude: 40.6249, longitude: -73.9614 },
  },
  {
    name: "Stumptown Coffee Roasters",
    description:
      "Portland-born specialty coffee roaster with expertly crafted espresso drinks.",
    category: "cafe",
    tags: ["coffee", "specialty", "wifi", "work-friendly"],
    rating: 4.5,
    coordinates: { latitude: 40.7454, longitude: -73.9879 },
  },
  {
    name: "Abraço",
    description:
      "Tiny East Village espresso bar with exceptional coffee and baked goods.",
    category: "cafe",
    tags: ["coffee", "espresso", "small", "artisan"],
    rating: 4.7,
    coordinates: { latitude: 40.7263, longitude: -73.9847 },
  },
  {
    name: "Variety Coffee",
    description:
      "Brooklyn specialty coffee shop known for its rotating single-origin pour-overs.",
    category: "cafe",
    tags: ["coffee", "specialty", "brooklyn", "pour-over"],
    rating: 4.6,
    coordinates: { latitude: 40.7173, longitude: -73.9506 },
  },
  {
    name: "Chalait",
    description:
      "Matcha-focused café serving Japanese-inspired drinks and pastries.",
    category: "cafe",
    tags: ["coffee", "matcha", "japanese", "healthy"],
    rating: 4.4,
    coordinates: { latitude: 40.7357, longitude: -74.0018 },
  },
  {
    name: "Brooklyn Bridge",
    description:
      "Iconic 1883 suspension bridge connecting Manhattan and Brooklyn over the East River.",
    category: "landmark",
    tags: ["outdoor", "historic", "free", "iconic", "architecture"],
    rating: 4.7,
    coordinates: { latitude: 40.7061, longitude: -73.9969 },
  },
  {
    name: "Statue of Liberty",
    description:
      "Symbol of freedom and democracy, gifted by France in 1886, on Liberty Island.",
    category: "landmark",
    tags: ["historic", "paid", "iconic", "waterfront", "national-monument"],
    rating: 4.8,
    coordinates: { latitude: 40.6892, longitude: -74.0445 },
  },
  {
    name: "Empire State Building",
    description:
      "Art Deco skyscraper and NYC icon with panoramic observation decks on the 86th and 102nd floors.",
    category: "landmark",
    tags: ["indoor", "paid", "iconic", "views", "architecture"],
    rating: 4.7,
    coordinates: { latitude: 40.7484, longitude: -73.9856 },
  },
  {
    name: "One World Trade Center",
    description:
      "Tallest building in the Western Hemisphere with a soaring observatory experience.",
    category: "landmark",
    tags: ["indoor", "paid", "iconic", "views", "memorial"],
    rating: 4.7,
    coordinates: { latitude: 40.7127, longitude: -74.0134 },
  },
  {
    name: "Flatiron Building",
    description:
      "Triangular 1902 Beaux-Arts skyscraper, one of NYC's most photographed buildings.",
    category: "landmark",
    tags: ["outdoor", "free", "iconic", "architecture", "historic"],
    rating: 4.6,
    coordinates: { latitude: 40.7411, longitude: -73.9897 },
  },
  {
    name: "Grand Central Terminal",
    description:
      "Magnificent 1913 Beaux-Arts station with the famous celestial ceiling mural.",
    category: "landmark",
    tags: ["indoor", "free", "iconic", "architecture", "historic", "transit"],
    rating: 4.8,
    coordinates: { latitude: 40.7527, longitude: -73.9772 },
  },
  {
    name: "Rockefeller Center",
    description:
      "Art Deco complex with Top of the Rock observatory, ice rink, and NBC Studios.",
    category: "landmark",
    tags: ["indoor", "paid", "iconic", "entertainment", "seasonal"],
    rating: 4.7,
    coordinates: { latitude: 40.7587, longitude: -73.9787 },
  },
  {
    name: "Coney Island Boardwalk",
    description:
      "Historic beachfront boardwalk with amusement rides, Nathan's hot dogs, and ocean views.",
    category: "landmark",
    tags: ["outdoor", "free", "beach", "historic", "seasonal", "brooklyn"],
    rating: 4.4,
    coordinates: { latitude: 40.5755, longitude: -73.9707 },
  },
  {
    name: "The Plaza Hotel",
    description:
      "Legendary Beaux-Arts landmark on Fifth Avenue offering unparalleled luxury since 1907.",
    category: "hotel",
    tags: ["luxury", "historic", "iconic", "five-star"],
    rating: 4.6,
    coordinates: { latitude: 40.7645, longitude: -73.9744 },
  },
  {
    name: "Ace Hotel New York",
    description:
      "Hip Nomad hotel with a buzzing lobby bar popular with creatives and remote workers.",
    category: "hotel",
    tags: ["boutique", "hip", "wifi", "bar", "work-friendly"],
    rating: 4.4,
    coordinates: { latitude: 40.7454, longitude: -73.9887 },
  },
  {
    name: "1 Hotel Brooklyn Bridge",
    description:
      "Eco-luxury hotel with stunning Manhattan skyline views and farm-to-table dining.",
    category: "hotel",
    tags: ["luxury", "eco-friendly", "waterfront", "views", "brooklyn"],
    rating: 4.7,
    coordinates: { latitude: 40.7023, longitude: -73.9944 },
  },
  {
    name: "Chelsea Market",
    description:
      "Bustling food hall and shopping destination in a converted Nabisco factory.",
    category: "shopping",
    tags: ["food", "indoor", "market", "unique", "artisan"],
    rating: 4.6,
    coordinates: { latitude: 40.7424, longitude: -74.006 },
  },
  {
    name: "Strand Book Store",
    description:
      "Iconic independent bookstore with 18 miles of books, rare finds, and author events.",
    category: "shopping",
    tags: ["books", "indoor", "iconic", "independent", "literary"],
    rating: 4.7,
    coordinates: { latitude: 40.733, longitude: -73.991 },
  },
  {
    name: "Smorgasburg",
    description:
      "America's largest weekly open-air food market with 100+ vendors in Williamsburg.",
    category: "shopping",
    tags: ["food", "outdoor", "market", "weekend", "brooklyn", "seasonal"],
    rating: 4.6,
    coordinates: { latitude: 40.7223, longitude: -73.9572 },
  },
  {
    name: "Madison Square Garden",
    description:
      "World's most famous arena hosting concerts, Knicks, Rangers, and major events.",
    category: "entertainment",
    tags: ["indoor", "paid", "sports", "concerts", "iconic"],
    rating: 4.5,
    coordinates: { latitude: 40.7505, longitude: -73.9934 },
  },
  {
    name: "Radio City Music Hall",
    description:
      "Art Deco entertainment palace seating 6,000 and home to the famous Rockettes.",
    category: "entertainment",
    tags: ["indoor", "paid", "historic", "concerts", "iconic"],
    rating: 4.7,
    coordinates: { latitude: 40.7599, longitude: -73.9799 },
  },
  {
    name: "Brooklyn Academy of Music",
    description:
      "America's oldest performing arts academy presenting cutting-edge opera, theater, and dance.",
    category: "entertainment",
    tags: ["indoor", "paid", "theater", "dance", "brooklyn", "arts"],
    rating: 4.7,
    coordinates: { latitude: 40.6856, longitude: -73.9779 },
  },
  {
    name: "NewYork-Presbyterian Hospital",
    description:
      "Top-ranked academic medical center affiliated with Cornell and Columbia universities.",
    category: "hospital",
    tags: ["healthcare", "emergency", "top-ranked"],
    rating: 4.3,
    coordinates: { latitude: 40.764, longitude: -73.9545 },
  },
  {
    name: "Mount Sinai Hospital",
    description:
      "World-class medical center on the Upper East Side with internationally recognised research.",
    category: "hospital",
    tags: ["healthcare", "emergency", "research", "top-ranked"],
    rating: 4.2,
    coordinates: { latitude: 40.79, longitude: -73.9529 },
  },
  {
    name: "Penn Station",
    description:
      "America's busiest train station serving Amtrak, NJ Transit, and LIRR.",
    category: "transit",
    tags: ["transit", "train", "indoor", "busy"],
    rating: 3.2,
    coordinates: { latitude: 40.7506, longitude: -73.9971 },
  },
  {
    name: "Port Authority Bus Terminal",
    description:
      "World's busiest bus terminal handling 225,000 daily commuters across 7,000 buses.",
    category: "transit",
    tags: ["transit", "bus", "indoor", "intercity"],
    rating: 3.0,
    coordinates: { latitude: 40.7571, longitude: -73.9901 },
  },
  {
    name: "JFK International Airport",
    description:
      "New York's largest international airport with six terminals serving 60+ airlines.",
    category: "transit",
    tags: ["transit", "airport", "international", "queens"],
    rating: 3.5,
    coordinates: { latitude: 40.6413, longitude: -73.7781 },
  },
];
