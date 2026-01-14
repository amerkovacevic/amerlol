// STL Monitor Data Service
// Handles fetching from various public APIs

import { 
  Incident, 
  Camera, 
  WeatherAlert, 
  TransitAlert, 
  NewsItem,
  CrimeRecord,
  AccidentRecord,
  GeoPoint,
  IncidentCategory,
  ConfidenceLevel,
  EAST_STL_BOUNDS,
  STL_BOUNDS
} from "./types"

// ============================================================================
// GEOGRAPHIC HELPERS - GEOGRAPHICAL FENCES
// ============================================================================
// 
// These functions enforce strict geographical boundaries to ensure incidents
// are only displayed within the Greater St. Louis metropolitan area.
//
// STL_BOUNDS defines the overall metro area:
//   - North: 38.85° (approximately Florissant, Hazelwood)
//   - South: 38.35° (approximately Arnold, Oakville)
//   - East: -89.85° (approximately Collinsville, Fairview Heights, IL)
//   - West: -90.55° (approximately Wildwood, Eureka, MO)
//
// EAST_STL_BOUNDS defines the restricted Illinois side area:
//   - Only East St. Louis city and immediate bridge corridors
//   - North: 38.65°, South: 38.58°
//   - East: -89.98°, West: -90.15°
//
// All geocoded locations MUST pass these bounds checks before being displayed.

// Helper to check if a point is within East St. Louis bounds
export function isWithinEastSTL(point: GeoPoint): boolean {
  return (
    point.lat >= EAST_STL_BOUNDS.south &&
    point.lat <= EAST_STL_BOUNDS.north &&
    point.lng >= EAST_STL_BOUNDS.west &&
    point.lng <= EAST_STL_BOUNDS.east
  )
}

// Helper to check if a point is within STL Metro bounds
// This is the PRIMARY geographical fence - all incidents must pass this check
export function isWithinSTLMetro(point: GeoPoint): boolean {
  const within = (
    point.lat >= STL_BOUNDS.bounds.south &&
    point.lat <= STL_BOUNDS.bounds.north &&
    point.lng >= STL_BOUNDS.bounds.west &&
    point.lng <= STL_BOUNDS.bounds.east
  )
  
  if (!within) {
    console.warn(`[Geographic Fence] Point (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}) is outside STL Metro bounds`)
  }
  
  return within
}

// Calculate distance from STL center to determine if location is reasonable
export function distanceFromSTLCenter(point: GeoPoint): number {
  return calculateDistance(point, STL_BOUNDS.center)
}

// Validate that a location is both within bounds AND reasonable distance from center
// This provides a secondary check for vague articles
export function isValidSTLLocation(point: GeoPoint, maxDistanceMiles: number = 50): boolean {
  if (!isWithinSTLMetro(point)) {
    return false
  }
  
  const distance = distanceFromSTLCenter(point)
  if (distance > maxDistanceMiles) {
    console.warn(`[Geographic Fence] Location is ${distance.toFixed(1)} miles from STL center (max: ${maxDistanceMiles}mi)`)
    return false
  }
  
  return true
}

// Calculate distance between two points in miles
export function calculateDistance(p1: GeoPoint, p2: GeoPoint): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (p2.lat - p1.lat) * Math.PI / 180
  const dLng = (p2.lng - p1.lng) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ============================================================================
// ST. LOUIS GEOCODING - Location keyword lookup
// ============================================================================

interface LocationEntry {
  name: string
  aliases: string[]
  location: GeoPoint
  type: "neighborhood" | "landmark" | "road" | "intersection" | "bridge" | "city"
}

// Comprehensive St. Louis location database for geocoding
const STL_LOCATIONS: LocationEntry[] = [
  // === NEIGHBORHOODS - ST. LOUIS CITY ===
  { name: "Downtown", aliases: ["downtown st. louis", "downtown stl", "city center"], location: { lat: 38.6270, lng: -90.1994 }, type: "neighborhood" },
  { name: "Central West End", aliases: ["cwe", "central west end"], location: { lat: 38.6434, lng: -90.2613 }, type: "neighborhood" },
  { name: "Forest Park", aliases: ["forest park"], location: { lat: 38.6377, lng: -90.2854 }, type: "neighborhood" },
  { name: "Tower Grove", aliases: ["tower grove south", "tower grove east", "tower grove"], location: { lat: 38.6047, lng: -90.2553 }, type: "neighborhood" },
  { name: "Soulard", aliases: ["soulard"], location: { lat: 38.6086, lng: -90.2108 }, type: "neighborhood" },
  { name: "The Hill", aliases: ["the hill", "italian hill"], location: { lat: 38.6174, lng: -90.2755 }, type: "neighborhood" },
  { name: "Lafayette Square", aliases: ["lafayette square", "lafayette park"], location: { lat: 38.6153, lng: -90.2233 }, type: "neighborhood" },
  { name: "Cherokee Street", aliases: ["cherokee", "cherokee street"], location: { lat: 38.5972, lng: -90.2397 }, type: "neighborhood" },
  { name: "Benton Park", aliases: ["benton park"], location: { lat: 38.5997, lng: -90.2222 }, type: "neighborhood" },
  { name: "South City", aliases: ["south city", "south st. louis", "south stl"], location: { lat: 38.5750, lng: -90.2500 }, type: "neighborhood" },
  { name: "North City", aliases: ["north city", "north st. louis", "north stl"], location: { lat: 38.6800, lng: -90.2100 }, type: "neighborhood" },
  { name: "Shaw", aliases: ["shaw neighborhood", "shaw"], location: { lat: 38.6189, lng: -90.2497 }, type: "neighborhood" },
  { name: "Dogtown", aliases: ["dogtown", "clayton-tamm"], location: { lat: 38.6292, lng: -90.3000 }, type: "neighborhood" },
  { name: "The Grove", aliases: ["the grove", "grove"], location: { lat: 38.6317, lng: -90.2439 }, type: "neighborhood" },
  { name: "Grand Center", aliases: ["grand center", "midtown"], location: { lat: 38.6400, lng: -90.2333 }, type: "neighborhood" },
  { name: "Carondelet", aliases: ["carondelet"], location: { lat: 38.5558, lng: -90.2550 }, type: "neighborhood" },
  { name: "Dutchtown", aliases: ["dutchtown"], location: { lat: 38.5750, lng: -90.2350 }, type: "neighborhood" },
  { name: "Holly Hills", aliases: ["holly hills"], location: { lat: 38.5558, lng: -90.2667 }, type: "neighborhood" },
  { name: "Baden", aliases: ["baden"], location: { lat: 38.7258, lng: -90.1908 }, type: "neighborhood" },
  { name: "Walnut Park", aliases: ["walnut park"], location: { lat: 38.7117, lng: -90.2475 }, type: "neighborhood" },
  { name: "Penrose", aliases: ["penrose"], location: { lat: 38.6892, lng: -90.2294 }, type: "neighborhood" },
  { name: "Fairground", aliases: ["fairground", "fairgrounds"], location: { lat: 38.6650, lng: -90.2133 }, type: "neighborhood" },
  { name: "Old North", aliases: ["old north st. louis", "old north"], location: { lat: 38.6625, lng: -90.2003 }, type: "neighborhood" },
  { name: "Hyde Park", aliases: ["hyde park"], location: { lat: 38.6600, lng: -90.2050 }, type: "neighborhood" },
  { name: "Skinker DeBaliviere", aliases: ["skinker debaliviere", "skinker-debaliviere"], location: { lat: 38.6508, lng: -90.2833 }, type: "neighborhood" },
  { name: "Bevo Mill", aliases: ["bevo mill", "bevo"], location: { lat: 38.5700, lng: -90.2500 }, type: "neighborhood" },
  { name: "Gravois Park", aliases: ["gravois park"], location: { lat: 38.5900, lng: -90.2400 }, type: "neighborhood" },
  { name: "Marine Villa", aliases: ["marine villa"], location: { lat: 38.5800, lng: -90.2200 }, type: "neighborhood" },
  { name: "McKinley Heights", aliases: ["mckinley heights"], location: { lat: 38.6000, lng: -90.2200 }, type: "neighborhood" },
  { name: "Benton Park West", aliases: ["benton park west"], location: { lat: 38.6000, lng: -90.2300 }, type: "neighborhood" },
  { name: "Fox Park", aliases: ["fox park"], location: { lat: 38.6100, lng: -90.2300 }, type: "neighborhood" },
  { name: "Lafayette Square", aliases: ["lafayette square", "lafayette park"], location: { lat: 38.6153, lng: -90.2233 }, type: "neighborhood" },
  { name: "Peabody Darst Webbe", aliases: ["peabody darst webbe", "peabody"], location: { lat: 38.6200, lng: -90.2100 }, type: "neighborhood" },
  { name: "Gate District", aliases: ["gate district"], location: { lat: 38.6250, lng: -90.2100 }, type: "neighborhood" },
  { name: "Lucas Park", aliases: ["lucas park"], location: { lat: 38.6300, lng: -90.2000 }, type: "neighborhood" },
  { name: "Downtown West", aliases: ["downtown west"], location: { lat: 38.6300, lng: -90.2100 }, type: "neighborhood" },
  { name: "Downtown", aliases: ["downtown st. louis", "downtown stl", "city center"], location: { lat: 38.6270, lng: -90.1994 }, type: "neighborhood" },
  { name: "Carr Square", aliases: ["carr square"], location: { lat: 38.6400, lng: -90.2000 }, type: "neighborhood" },
  { name: "Columbus Square", aliases: ["columbus square"], location: { lat: 38.6450, lng: -90.2000 }, type: "neighborhood" },
  { name: "Old North St. Louis", aliases: ["old north st. louis", "old north"], location: { lat: 38.6625, lng: -90.2003 }, type: "neighborhood" },
  { name: "St. Louis Place", aliases: ["st. louis place"], location: { lat: 38.6700, lng: -90.2000 }, type: "neighborhood" },
  { name: "Jeff Vanderlou", aliases: ["jeff vanderlou", "jvl"], location: { lat: 38.6800, lng: -90.2100 }, type: "neighborhood" },
  { name: "Ville", aliases: ["the ville"], location: { lat: 38.6900, lng: -90.2200 }, type: "neighborhood" },
  { name: "Kingsway West", aliases: ["kingsway west"], location: { lat: 38.7000, lng: -90.2300 }, type: "neighborhood" },
  { name: "Kingsway East", aliases: ["kingsway east"], location: { lat: 38.7000, lng: -90.2400 }, type: "neighborhood" },
  { name: "Fountain Park", aliases: ["fountain park"], location: { lat: 38.7100, lng: -90.2500 }, type: "neighborhood" },
  { name: "Academy", aliases: ["academy"], location: { lat: 38.7200, lng: -90.2600 }, type: "neighborhood" },
  { name: "Kings Oak", aliases: ["kings oak"], location: { lat: 38.7300, lng: -90.2700 }, type: "neighborhood" },
  { name: "Mark Twain", aliases: ["mark twain"], location: { lat: 38.7400, lng: -90.2800 }, type: "neighborhood" },
  { name: "Mark Twain I-70 Industrial", aliases: ["mark twain industrial"], location: { lat: 38.7500, lng: -90.2900 }, type: "neighborhood" },
  { name: "College Hill", aliases: ["college hill"], location: { lat: 38.6600, lng: -90.2400 }, type: "neighborhood" },
  { name: "Fairground", aliases: ["fairground", "fairgrounds"], location: { lat: 38.6650, lng: -90.2133 }, type: "neighborhood" },
  { name: "O'Fallon", aliases: ["o'fallon neighborhood", "ofallon neighborhood"], location: { lat: 38.6800, lng: -90.2200 }, type: "neighborhood" },
  { name: "Penrose", aliases: ["penrose"], location: { lat: 38.6892, lng: -90.2294 }, type: "neighborhood" },
  { name: "Walnut Park East", aliases: ["walnut park east"], location: { lat: 38.7117, lng: -90.2475 }, type: "neighborhood" },
  { name: "Walnut Park West", aliases: ["walnut park west"], location: { lat: 38.7117, lng: -90.2500 }, type: "neighborhood" },
  { name: "Baden", aliases: ["baden"], location: { lat: 38.7258, lng: -90.1908 }, type: "neighborhood" },
  { name: "Riverview", aliases: ["riverview"], location: { lat: 38.7500, lng: -90.2000 }, type: "neighborhood" },
  { name: "Near North Riverfront", aliases: ["near north riverfront", "riverfront"], location: { lat: 38.7600, lng: -90.1900 }, type: "neighborhood" },
  { name: "Hyde Park", aliases: ["hyde park"], location: { lat: 38.6600, lng: -90.2050 }, type: "neighborhood" },
  { name: "Near South Side", aliases: ["near south side", "near south"], location: { lat: 38.6000, lng: -90.2200 }, type: "neighborhood" },
  { name: "Midtown", aliases: ["midtown", "grand center"], location: { lat: 38.6400, lng: -90.2333 }, type: "neighborhood" },
  { name: "Forest Park Southeast", aliases: ["forest park southeast", "the grove"], location: { lat: 38.6317, lng: -90.2439 }, type: "neighborhood" },
  { name: "Tower Grove East", aliases: ["tower grove east", "tge"], location: { lat: 38.6000, lng: -90.2500 }, type: "neighborhood" },
  { name: "Tower Grove South", aliases: ["tower grove south", "tgs"], location: { lat: 38.6047, lng: -90.2553 }, type: "neighborhood" },
  { name: "Compton Heights", aliases: ["compton heights"], location: { lat: 38.6200, lng: -90.2300 }, type: "neighborhood" },
  { name: "Mount Pleasant", aliases: ["mount pleasant"], location: { lat: 38.5600, lng: -90.2400 }, type: "neighborhood" },
  { name: "Carondelet", aliases: ["carondelet"], location: { lat: 38.5558, lng: -90.2550 }, type: "neighborhood" },
  { name: "Patch", aliases: ["the patch"], location: { lat: 38.5500, lng: -90.2600 }, type: "neighborhood" },
  { name: "Holly Hills", aliases: ["holly hills"], location: { lat: 38.5558, lng: -90.2667 }, type: "neighborhood" },
  { name: "Boulevard Heights", aliases: ["boulevard heights"], location: { lat: 38.5400, lng: -90.2700 }, type: "neighborhood" },
  { name: "Princeton Heights", aliases: ["princeton heights"], location: { lat: 38.5700, lng: -90.2800 }, type: "neighborhood" },
  { name: "Southampton", aliases: ["southampton"], location: { lat: 38.5800, lng: -90.2900 }, type: "neighborhood" },
  { name: "St. Louis Hills", aliases: ["st. louis hills", "st louis hills"], location: { lat: 38.5900, lng: -90.3000 }, type: "neighborhood" },
  { name: "Wydown Skinker", aliases: ["wydown skinker"], location: { lat: 38.6500, lng: -90.3000 }, type: "neighborhood" },
  { name: "DeBaliviere Place", aliases: ["debaliviere place", "debaliviere"], location: { lat: 38.6500, lng: -90.2900 }, type: "neighborhood" },
  { name: "West End", aliases: ["west end"], location: { lat: 38.6400, lng: -90.2700 }, type: "neighborhood" },
  { name: "Visitation Park", aliases: ["visitation park"], location: { lat: 38.6500, lng: -90.2700 }, type: "neighborhood" },
  { name: "Academy", aliases: ["academy"], location: { lat: 38.7200, lng: -90.2600 }, type: "neighborhood" },
  { name: "Fountain Park", aliases: ["fountain park"], location: { lat: 38.7100, lng: -90.2500 }, type: "neighborhood" },
  { name: "Kingsway East", aliases: ["kingsway east"], location: { lat: 38.7000, lng: -90.2400 }, type: "neighborhood" },
  { name: "Kingsway West", aliases: ["kingsway west"], location: { lat: 38.7000, lng: -90.2300 }, type: "neighborhood" },
  { name: "Mark Twain", aliases: ["mark twain"], location: { lat: 38.7400, lng: -90.2800 }, type: "neighborhood" },
  { name: "Mark Twain I-70 Industrial", aliases: ["mark twain industrial"], location: { lat: 38.7500, lng: -90.2900 }, type: "neighborhood" },
  { name: "Kings Oak", aliases: ["kings oak"], location: { lat: 38.7300, lng: -90.2700 }, type: "neighborhood" },
  { name: "Near North Riverfront", aliases: ["near north riverfront", "riverfront"], location: { lat: 38.7600, lng: -90.1900 }, type: "neighborhood" },
  
  // === ST. LOUIS COUNTY MUNICIPALITIES ===
  { name: "Clayton", aliases: ["clayton"], location: { lat: 38.6426, lng: -90.3239 }, type: "city" },
  { name: "University City", aliases: ["university city", "u city"], location: { lat: 38.6600, lng: -90.3100 }, type: "city" },
  { name: "Kirkwood", aliases: ["kirkwood"], location: { lat: 38.5833, lng: -90.4086 }, type: "city" },
  { name: "Webster Groves", aliases: ["webster groves", "webster"], location: { lat: 38.5925, lng: -90.3572 }, type: "city" },
  { name: "Maplewood", aliases: ["maplewood"], location: { lat: 38.6128, lng: -90.3231 }, type: "city" },
  { name: "Richmond Heights", aliases: ["richmond heights"], location: { lat: 38.6286, lng: -90.3219 }, type: "city" },
  { name: "Brentwood", aliases: ["brentwood"], location: { lat: 38.6175, lng: -90.3489 }, type: "city" },
  { name: "Ferguson", aliases: ["ferguson"], location: { lat: 38.7442, lng: -90.3053 }, type: "city" },
  { name: "Florissant", aliases: ["florissant"], location: { lat: 38.7892, lng: -90.3225 }, type: "city" },
  { name: "Hazelwood", aliases: ["hazelwood"], location: { lat: 38.7714, lng: -90.3708 }, type: "city" },
  { name: "Overland", aliases: ["overland"], location: { lat: 38.7003, lng: -90.3625 }, type: "city" },
  { name: "Creve Coeur", aliases: ["creve coeur"], location: { lat: 38.6606, lng: -90.4228 }, type: "city" },
  { name: "Maryland Heights", aliases: ["maryland heights"], location: { lat: 38.7131, lng: -90.4297 }, type: "city" },
  { name: "Chesterfield", aliases: ["chesterfield"], location: { lat: 38.6631, lng: -90.5772 }, type: "city" },
  { name: "Ballwin", aliases: ["ballwin"], location: { lat: 38.5950, lng: -90.5461 }, type: "city" },
  { name: "Manchester", aliases: ["manchester"], location: { lat: 38.5970, lng: -90.5092 }, type: "city" },
  { name: "Des Peres", aliases: ["des peres"], location: { lat: 38.6009, lng: -90.4328 }, type: "city" },
  { name: "Affton", aliases: ["affton"], location: { lat: 38.5506, lng: -90.3331 }, type: "city" },
  { name: "Lemay", aliases: ["lemay"], location: { lat: 38.5333, lng: -90.2833 }, type: "city" },
  { name: "Mehlville", aliases: ["mehlville"], location: { lat: 38.5086, lng: -90.3192 }, type: "city" },
  { name: "Oakville", aliases: ["oakville"], location: { lat: 38.4711, lng: -90.3056 }, type: "city" },
  { name: "Fenton", aliases: ["fenton"], location: { lat: 38.5128, lng: -90.4358 }, type: "city" },
  { name: "Valley Park", aliases: ["valley park"], location: { lat: 38.5492, lng: -90.4925 }, type: "city" },
  { name: "Sunset Hills", aliases: ["sunset hills"], location: { lat: 38.5389, lng: -90.4075 }, type: "city" },
  { name: "Crestwood", aliases: ["crestwood"], location: { lat: 38.5567, lng: -90.3817 }, type: "city" },
  { name: "Shrewsbury", aliases: ["shrewsbury"], location: { lat: 38.5903, lng: -90.3331 }, type: "city" },
  { name: "Ladue", aliases: ["ladue"], location: { lat: 38.6400, lng: -90.3825 }, type: "city" },
  { name: "Frontenac", aliases: ["frontenac"], location: { lat: 38.6350, lng: -90.4147 }, type: "city" },
  { name: "Town and Country", aliases: ["town and country", "town & country"], location: { lat: 38.6125, lng: -90.4633 }, type: "city" },
  { name: "Wildwood", aliases: ["wildwood"], location: { lat: 38.5828, lng: -90.6628 }, type: "city" },
  { name: "Eureka", aliases: ["eureka"], location: { lat: 38.5028, lng: -90.6278 }, type: "city" },
  { name: "Pacific", aliases: ["pacific"], location: { lat: 38.4811, lng: -90.7417 }, type: "city" },
  { name: "Arnold", aliases: ["arnold"], location: { lat: 38.4328, lng: -90.3775 }, type: "city" },
  { name: "Jennings", aliases: ["jennings"], location: { lat: 38.7192, lng: -90.2603 }, type: "city" },
  { name: "Normandy", aliases: ["normandy"], location: { lat: 38.7206, lng: -90.2972 }, type: "city" },
  { name: "Pagedale", aliases: ["pagedale"], location: { lat: 38.6831, lng: -90.3075 }, type: "city" },
  { name: "Wellston", aliases: ["wellston"], location: { lat: 38.6725, lng: -90.2992 }, type: "city" },
  { name: "Bel-Ridge", aliases: ["bel-ridge", "bel ridge"], location: { lat: 38.7092, lng: -90.3253 }, type: "city" },
  { name: "Bellefontaine Neighbors", aliases: ["bellefontaine neighbors"], location: { lat: 38.7403, lng: -90.2264 }, type: "city" },
  { name: "Berkeley", aliases: ["berkeley"], location: { lat: 38.7547, lng: -90.3311 }, type: "city" },
  { name: "Black Jack", aliases: ["black jack"], location: { lat: 38.7931, lng: -90.2672 }, type: "city" },
  { name: "Bridgeton", aliases: ["bridgeton"], location: { lat: 38.7506, lng: -90.4114 }, type: "city" },
  { name: "Calverton Park", aliases: ["calverton park"], location: { lat: 38.7103, lng: -90.3153 }, type: "city" },
  { name: "Charlack", aliases: ["charlack"], location: { lat: 38.6781, lng: -90.3431 }, type: "city" },
  { name: "Cool Valley", aliases: ["cool valley"], location: { lat: 38.7281, lng: -90.3092 }, type: "city" },
  { name: "Country Club Hills", aliases: ["country club hills"], location: { lat: 38.7203, lng: -90.2753 }, type: "city" },
  { name: "Edmundson", aliases: ["edmundson"], location: { lat: 38.7361, lng: -90.3453 }, type: "city" },
  { name: "Ellisville", aliases: ["ellisville"], location: { lat: 38.5925, lng: -90.5872 }, type: "city" },
  { name: "Glendale", aliases: ["glendale"], location: { lat: 38.5953, lng: -90.3831 }, type: "city" },
  { name: "Hanley Hills", aliases: ["hanley hills"], location: { lat: 38.6875, lng: -90.3231 }, type: "city" },
  { name: "Hillsdale", aliases: ["hillsdale"], location: { lat: 38.6831, lng: -90.2853 }, type: "city" },
  { name: "Kinloch", aliases: ["kinloch"], location: { lat: 38.7403, lng: -90.3253 }, type: "city" },
  { name: "Lakeshire", aliases: ["lakeshire"], location: { lat: 38.5381, lng: -90.3403 }, type: "city" },
  { name: "Mackenzie", aliases: ["mackenzie"], location: { lat: 38.5753, lng: -90.3203 }, type: "city" },
  { name: "Moline Acres", aliases: ["moline acres"], location: { lat: 38.7472, lng: -90.2403 }, type: "city" },
  { name: "Northwoods", aliases: ["northwoods"], location: { lat: 38.7042, lng: -90.2803 }, type: "city" },
  { name: "Olivette", aliases: ["olivette"], location: { lat: 38.6653, lng: -90.3753 }, type: "city" },
  { name: "Pine Lawn", aliases: ["pine lawn"], location: { lat: 38.6953, lng: -90.2753 }, type: "city" },
  { name: "Riverview", aliases: ["riverview"], location: { lat: 38.7553, lng: -90.2103 }, type: "city" },
  { name: "Rock Hill", aliases: ["rock hill"], location: { lat: 38.6081, lng: -90.3781 }, type: "city" },
  { name: "St. Ann", aliases: ["st. ann", "st ann"], location: { lat: 38.7272, lng: -90.3831 }, type: "city" },
  { name: "St. John", aliases: ["st. john", "st john"], location: { lat: 38.7131, lng: -90.3431 }, type: "city" },
  { name: "Sycamore Hills", aliases: ["sycamore hills"], location: { lat: 38.7003, lng: -90.3453 }, type: "city" },
  { name: "Velda City", aliases: ["velda city"], location: { lat: 38.6931, lng: -90.2931 }, type: "city" },
  { name: "Velda Village Hills", aliases: ["velda village hills"], location: { lat: 38.6903, lng: -90.2953 }, type: "city" },
  { name: "Vinita Park", aliases: ["vinita park"], location: { lat: 38.6903, lng: -90.3253 }, type: "city" },
  { name: "Warson Woods", aliases: ["warson woods"], location: { lat: 38.6081, lng: -90.3831 }, type: "city" },
  { name: "Winchester", aliases: ["winchester"], location: { lat: 38.5903, lng: -90.5281 }, type: "city" },
  { name: "Woodson Terrace", aliases: ["woodson terrace"], location: { lat: 38.7281, lng: -90.3581 }, type: "city" },
  
  // === ST. CHARLES COUNTY ===
  { name: "St. Charles County", aliases: ["st. charles county", "st charles county", "st. charles co"], location: { lat: 38.8000, lng: -90.6000 }, type: "city" },
  { name: "St. Charles", aliases: ["st. charles", "st charles"], location: { lat: 38.7831, lng: -90.4811 }, type: "city" },
  { name: "O'Fallon", aliases: ["o'fallon", "ofallon", "o fallon"], location: { lat: 38.8106, lng: -90.6997 }, type: "city" },
  { name: "St. Peters", aliases: ["st. peters", "st peters"], location: { lat: 38.8003, lng: -90.6264 }, type: "city" },
  { name: "Wentzville", aliases: ["wentzville"], location: { lat: 38.8114, lng: -90.8525 }, type: "city" },
  { name: "Lake Saint Louis", aliases: ["lake saint louis", "lake st. louis", "lake st louis"], location: { lat: 38.7875, lng: -90.7856 }, type: "city" },
  { name: "Cottleville", aliases: ["cottleville"], location: { lat: 38.7469, lng: -90.6542 }, type: "city" },
  { name: "Dardenne Prairie", aliases: ["dardenne prairie"], location: { lat: 38.7500, lng: -90.7281 }, type: "city" },
  { name: "Weldon Spring", aliases: ["weldon spring"], location: { lat: 38.7131, lng: -90.6381 }, type: "city" },
  { name: "Portage des Sioux", aliases: ["portage des sioux"], location: { lat: 38.9258, lng: -90.3453 }, type: "city" },
  
  // === FRANKLIN COUNTY ===
  { name: "Franklin County", aliases: ["franklin county", "franklin co"], location: { lat: 38.4000, lng: -91.0000 }, type: "city" },
  { name: "Washington", aliases: ["washington mo", "washington missouri"], location: { lat: 38.5581, lng: -91.0125 }, type: "city" },
  { name: "Union", aliases: ["union mo", "union missouri"], location: { lat: 38.4458, lng: -91.0081 }, type: "city" },
  { name: "Pacific", aliases: ["pacific mo", "pacific missouri"], location: { lat: 38.4811, lng: -90.7417 }, type: "city" },
  
  // === LINCOLN COUNTY ===
  { name: "Lincoln County", aliases: ["lincoln county", "lincoln co"], location: { lat: 39.0500, lng: -90.9500 }, type: "city" },
  { name: "Troy", aliases: ["troy mo", "troy missouri"], location: { lat: 38.9797, lng: -90.9806 }, type: "city" },
  { name: "Winfield", aliases: ["winfield mo", "winfield missouri"], location: { lat: 39.0000, lng: -90.7331 }, type: "city" },
  
  // === WARREN COUNTY ===
  { name: "Warren County", aliases: ["warren county", "warren co"], location: { lat: 38.7500, lng: -91.1500 }, type: "city" },
  { name: "Warrenton", aliases: ["warrenton mo", "warrenton missouri"], location: { lat: 38.8111, lng: -91.1414 }, type: "city" },
  
  // === MADISON COUNTY (IL) ===
  { name: "Madison County", aliases: ["madison county il", "madison county illinois"], location: { lat: 38.8000, lng: -89.9000 }, type: "city" },
  { name: "Edwardsville", aliases: ["edwardsville"], location: { lat: 38.8114, lng: -89.9531 }, type: "city" },
  { name: "Glen Carbon", aliases: ["glen carbon"], location: { lat: 38.7481, lng: -89.9831 }, type: "city" },
  { name: "Maryville", aliases: ["maryville il", "maryville illinois"], location: { lat: 38.7231, lng: -89.9553 }, type: "city" },
  { name: "Troy", aliases: ["troy il", "troy illinois"], location: { lat: 38.7289, lng: -89.8831 }, type: "city" },
  { name: "Highland", aliases: ["highland il", "highland illinois"], location: { lat: 38.7392, lng: -89.6714 }, type: "city" },
  
  // === ST. CLAIR COUNTY (IL) ===
  { name: "St. Clair County", aliases: ["st. clair county", "st clair county il"], location: { lat: 38.6000, lng: -89.9000 }, type: "city" },
  { name: "Belleville", aliases: ["belleville il", "belleville illinois"], location: { lat: 38.5200, lng: -89.9831 }, type: "city" },
  { name: "Collinsville", aliases: ["collinsville il", "collinsville illinois"], location: { lat: 38.6703, lng: -89.9842 }, type: "city" },
  { name: "O'Fallon", aliases: ["o'fallon il", "ofallon il", "o fallon illinois"], location: { lat: 38.5925, lng: -89.9111 }, type: "city" },
  { name: "Fairview Heights", aliases: ["fairview heights il", "fairview heights illinois"], location: { lat: 38.5889, lng: -89.9903 }, type: "city" },
  { name: "Shiloh", aliases: ["shiloh il", "shiloh illinois"], location: { lat: 38.5614, lng: -89.8972 }, type: "city" },
  { name: "Swansea", aliases: ["swansea il", "swansea illinois"], location: { lat: 38.5331, lng: -89.9881 }, type: "city" },
  { name: "Cahokia", aliases: ["cahokia il", "cahokia illinois"], location: { lat: 38.5703, lng: -90.1903 }, type: "city" },
  { name: "Cahokia Heights", aliases: ["cahokia heights il", "cahokia heights illinois"], location: { lat: 38.5703, lng: -90.1903 }, type: "city" },
  { name: "Caseyville", aliases: ["caseyville il", "caseyville illinois"], location: { lat: 38.6367, lng: -90.0264 }, type: "city" },
  { name: "Granite City", aliases: ["granite city il", "granite city illinois"], location: { lat: 38.7014, lng: -90.1481 }, type: "city" },
  { name: "Venice", aliases: ["venice il", "venice illinois"], location: { lat: 38.6714, lng: -90.1692 }, type: "city" },
  { name: "Madison", aliases: ["madison il", "madison illinois"], location: { lat: 38.6825, lng: -90.1564 }, type: "city" },
  { name: "Alton", aliases: ["alton il", "alton illinois"], location: { lat: 38.8903, lng: -90.1842 }, type: "city" },
  
  // === JEFFERSON COUNTY (South of Meramec River) ===
  { name: "Jefferson County", aliases: ["jefferson county", "jeff co", "jeffco"], location: { lat: 38.3000, lng: -90.5000 }, type: "city" },
  { name: "Crystal City", aliases: ["crystal city"], location: { lat: 38.2208, lng: -90.3792 }, type: "city" },
  { name: "Festus", aliases: ["festus"], location: { lat: 38.2206, lng: -90.3958 }, type: "city" },
  { name: "Herculaneum", aliases: ["herculaneum"], location: { lat: 38.2681, lng: -90.3803 }, type: "city" },
  { name: "De Soto", aliases: ["de soto", "desoto"], location: { lat: 38.1389, lng: -90.5556 }, type: "city" },
  { name: "Hillsboro", aliases: ["hillsboro"], location: { lat: 38.2311, lng: -90.5619 }, type: "city" },
  { name: "Pevely", aliases: ["pevely"], location: { lat: 38.2831, lng: -90.3958 }, type: "city" },
  { name: "Barnhart", aliases: ["barnhart"], location: { lat: 38.3431, lng: -90.4042 }, type: "city" },
  { name: "Imperial", aliases: ["imperial"], location: { lat: 38.3689, lng: -90.3753 }, type: "city" },
  { name: "High Ridge", aliases: ["high ridge"], location: { lat: 38.4642, lng: -90.5275 }, type: "city" },
  { name: "House Springs", aliases: ["house springs"], location: { lat: 38.4081, lng: -90.5681 }, type: "city" },
  { name: "Cedar Hill", aliases: ["cedar hill"], location: { lat: 38.3531, lng: -90.6417 }, type: "city" },
  { name: "Byrnes Mill", aliases: ["byrnes mill"], location: { lat: 38.4378, lng: -90.5708 }, type: "city" },
  { name: "Meramec River", aliases: ["meramec river", "meramec"], location: { lat: 38.4500, lng: -90.4000 }, type: "landmark" },
  
  // === ILLINOIS SIDE (East St. Louis Area Only) ===
  { name: "East St. Louis", aliases: ["east st. louis", "east stl", "e. st. louis"], location: { lat: 38.6245, lng: -90.1507 }, type: "city" },
  { name: "Washington Park", aliases: ["washington park"], location: { lat: 38.6350, lng: -90.0933 }, type: "city" },
  { name: "Fairmont City", aliases: ["fairmont city"], location: { lat: 38.6553, lng: -90.0992 }, type: "city" },
  
  // === MAJOR LANDMARKS ===
  { name: "Gateway Arch", aliases: ["gateway arch", "the arch", "arch grounds", "jefferson national expansion memorial"], location: { lat: 38.6247, lng: -90.1848 }, type: "landmark" },
  { name: "Busch Stadium", aliases: ["busch stadium", "cardinals stadium"], location: { lat: 38.6226, lng: -90.1931 }, type: "landmark" },
  { name: "Enterprise Center", aliases: ["enterprise center", "scottrade center", "kiel center", "blues arena"], location: { lat: 38.6269, lng: -90.2028 }, type: "landmark" },
  { name: "Union Station", aliases: ["union station", "st. louis union station"], location: { lat: 38.6317, lng: -90.2069 }, type: "landmark" },
  { name: "City Hall", aliases: ["city hall", "st. louis city hall"], location: { lat: 38.6272, lng: -90.1958 }, type: "landmark" },
  { name: "Scottrade Center", aliases: ["scottrade"], location: { lat: 38.6269, lng: -90.2028 }, type: "landmark" },
  { name: "The Dome", aliases: ["the dome at america's center", "edward jones dome", "dome"], location: { lat: 38.6328, lng: -90.1886 }, type: "landmark" },
  { name: "America's Center", aliases: ["america's center", "convention center"], location: { lat: 38.6333, lng: -90.1900 }, type: "landmark" },
  { name: "St. Louis Zoo", aliases: ["st. louis zoo", "the zoo"], location: { lat: 38.6350, lng: -90.2900 }, type: "landmark" },
  { name: "Art Museum", aliases: ["saint louis art museum", "art museum", "slam"], location: { lat: 38.6394, lng: -90.2942 }, type: "landmark" },
  { name: "Science Center", aliases: ["science center", "st. louis science center"], location: { lat: 38.6308, lng: -90.2708 }, type: "landmark" },
  { name: "History Museum", aliases: ["history museum", "missouri history museum"], location: { lat: 38.6453, lng: -90.2858 }, type: "landmark" },
  { name: "Botanical Garden", aliases: ["botanical garden", "missouri botanical garden", "shaw's garden"], location: { lat: 38.6128, lng: -90.2594 }, type: "landmark" },
  { name: "Barnes-Jewish Hospital", aliases: ["barnes", "barnes-jewish", "barnes jewish hospital", "bjh"], location: { lat: 38.6372, lng: -90.2633 }, type: "landmark" },
  { name: "SLU", aliases: ["saint louis university", "slu", "st. louis university"], location: { lat: 38.6367, lng: -90.2342 }, type: "landmark" },
  { name: "Washington University", aliases: ["washington university", "washu", "wash u"], location: { lat: 38.6488, lng: -90.3108 }, type: "landmark" },
  { name: "UMSL", aliases: ["umsl", "university of missouri st. louis"], location: { lat: 38.7108, lng: -90.3114 }, type: "landmark" },
  { name: "Lambert Airport", aliases: ["lambert", "stl airport", "lambert airport", "st. louis airport", "lambert international"], location: { lat: 38.7487, lng: -90.3700 }, type: "landmark" },
  { name: "Ballpark Village", aliases: ["ballpark village"], location: { lat: 38.6233, lng: -90.1914 }, type: "landmark" },
  { name: "City Museum", aliases: ["city museum"], location: { lat: 38.6333, lng: -90.2003 }, type: "landmark" },
  { name: "Soldiers Memorial", aliases: ["soldiers memorial"], location: { lat: 38.6319, lng: -90.1967 }, type: "landmark" },
  { name: "Kiener Plaza", aliases: ["kiener plaza"], location: { lat: 38.6261, lng: -90.1900 }, type: "landmark" },
  { name: "Citygarden", aliases: ["citygarden", "city garden"], location: { lat: 38.6258, lng: -90.1892 }, type: "landmark" },
  { name: "Tower Grove Park", aliases: ["tower grove park"], location: { lat: 38.6056, lng: -90.2533 }, type: "landmark" },
  { name: "Carondelet Park", aliases: ["carondelet park"], location: { lat: 38.5611, lng: -90.2661 }, type: "landmark" },
  { name: "Francis Park", aliases: ["francis park"], location: { lat: 38.6022, lng: -90.2922 }, type: "landmark" },
  { name: "The Muny", aliases: ["the muny", "muny", "municipal opera"], location: { lat: 38.6367, lng: -90.2833 }, type: "landmark" },
  { name: "The Fabulous Fox", aliases: ["fabulous fox", "fox theatre", "the fox"], location: { lat: 38.6400, lng: -90.2322 }, type: "landmark" },
  { name: "Powell Symphony Hall", aliases: ["powell hall", "powell symphony hall"], location: { lat: 38.6386, lng: -90.2378 }, type: "landmark" },
  { name: "Peabody Opera House", aliases: ["peabody opera house", "peabody"], location: { lat: 38.6356, lng: -90.2072 }, type: "landmark" },
  { name: "Chaifetz Arena", aliases: ["chaifetz arena", "chaifetz"], location: { lat: 38.6328, lng: -90.2317 }, type: "landmark" },
  { name: "St. Louis Cathedral", aliases: ["cathedral basilica", "st. louis cathedral", "cathedral"], location: { lat: 38.6400, lng: -90.2600 }, type: "landmark" },
  { name: "Old Courthouse", aliases: ["old courthouse", "st. louis old courthouse"], location: { lat: 38.6250, lng: -90.1892 }, type: "landmark" },
  { name: "Laclede's Landing", aliases: ["laclede's landing", "lacledes landing"], location: { lat: 38.6300, lng: -90.1850 }, type: "landmark" },
  { name: "Soulard Market", aliases: ["soulard market", "soulard farmers market"], location: { lat: 38.6086, lng: -90.2108 }, type: "landmark" },
  { name: "Anheuser-Busch Brewery", aliases: ["anheuser-busch", "budweiser brewery", "ab brewery"], location: { lat: 38.5981, lng: -90.2092 }, type: "landmark" },
  { name: "Grant's Farm", aliases: ["grants farm", "grant's farm"], location: { lat: 38.5500, lng: -90.3500 }, type: "landmark" },
  { name: "Six Flags St. Louis", aliases: ["six flags", "six flags st. louis", "six flags stl"], location: { lat: 38.5131, lng: -90.6758 }, type: "landmark" },
  { name: "Missouri Botanical Garden", aliases: ["missouri botanical garden", "botanical garden", "mo bot", "shaw's garden"], location: { lat: 38.6128, lng: -90.2594 }, type: "landmark" },
  { name: "Laumeier Sculpture Park", aliases: ["laumeier", "laumeier sculpture park"], location: { lat: 38.5500, lng: -90.4000 }, type: "landmark" },
  { name: "Cahokia Mounds", aliases: ["cahokia mounds", "monks mound"], location: { lat: 38.6564, lng: -90.0625 }, type: "landmark" },
  { name: "Lewis and Clark State Historic Site", aliases: ["lewis and clark", "lewis & clark"], location: { lat: 38.8000, lng: -90.1000 }, type: "landmark" },
  { name: "Jefferson Barracks", aliases: ["jefferson barracks", "jefferson barracks park"], location: { lat: 38.4700, lng: -90.2200 }, type: "landmark" },
  { name: "Fort Belle Fontaine", aliases: ["fort belle fontaine", "belle fontaine"], location: { lat: 38.8000, lng: -90.2000 }, type: "landmark" },
  { name: "Ulysses S. Grant National Historic Site", aliases: ["grant's farm", "white haven"], location: { lat: 38.5500, lng: -90.3500 }, type: "landmark" },
  { name: "Eugene Field House", aliases: ["eugene field house"], location: { lat: 38.6300, lng: -90.2000 }, type: "landmark" },
  { name: "Campbell House Museum", aliases: ["campbell house", "campbell house museum"], location: { lat: 38.6400, lng: -90.2000 }, type: "landmark" },
  { name: "Chatillon-DeMenil Mansion", aliases: ["chatillon-demenil", "demenil mansion"], location: { lat: 38.6000, lng: -90.2200 }, type: "landmark" },
  { name: "St. Louis Art Museum", aliases: ["saint louis art museum", "art museum", "slam", "forest park art museum"], location: { lat: 38.6394, lng: -90.2942 }, type: "landmark" },
  { name: "Missouri History Museum", aliases: ["missouri history museum", "history museum", "forest park history museum"], location: { lat: 38.6453, lng: -90.2858 }, type: "landmark" },
  { name: "St. Louis Science Center", aliases: ["st. louis science center", "science center", "forest park science center"], location: { lat: 38.6308, lng: -90.2708 }, type: "landmark" },
  { name: "St. Louis Zoo", aliases: ["st. louis zoo", "the zoo", "forest park zoo"], location: { lat: 38.6350, lng: -90.2900 }, type: "landmark" },
  { name: "Forest Park", aliases: ["forest park"], location: { lat: 38.6377, lng: -90.2854 }, type: "landmark" },
  { name: "Tower Grove Park", aliases: ["tower grove park"], location: { lat: 38.6056, lng: -90.2533 }, type: "landmark" },
  { name: "Carondelet Park", aliases: ["carondelet park"], location: { lat: 38.5611, lng: -90.2661 }, type: "landmark" },
  { name: "Francis Park", aliases: ["francis park"], location: { lat: 38.6022, lng: -90.2922 }, type: "landmark" },
  { name: "Willmore Park", aliases: ["willmore park"], location: { lat: 38.5500, lng: -90.3000 }, type: "landmark" },
  { name: "O'Fallon Park", aliases: ["o'fallon park", "ofallon park"], location: { lat: 38.6800, lng: -90.2200 }, type: "landmark" },
  { name: "Fairground Park", aliases: ["fairground park", "fairgrounds park"], location: { lat: 38.6650, lng: -90.2133 }, type: "landmark" },
  { name: "Lafayette Park", aliases: ["lafayette park"], location: { lat: 38.6153, lng: -90.2233 }, type: "landmark" },
  { name: "Benton Park", aliases: ["benton park"], location: { lat: 38.5997, lng: -90.2222 }, type: "landmark" },
  { name: "Soulard Park", aliases: ["soulard park"], location: { lat: 38.6086, lng: -90.2108 }, type: "landmark" },
  { name: "Cherokee Park", aliases: ["cherokee park"], location: { lat: 38.5972, lng: -90.2397 }, type: "landmark" },
  { name: "Compton Hill Reservoir Park", aliases: ["compton hill", "compton hill reservoir"], location: { lat: 38.6200, lng: -90.2300 }, type: "landmark" },
  { name: "Ruth Park", aliases: ["ruth park"], location: { lat: 38.6000, lng: -90.2500 }, type: "landmark" },
  { name: "Wilmore Park", aliases: ["wilmore park"], location: { lat: 38.5500, lng: -90.3000 }, type: "landmark" },
  { name: "St. Louis University Hospital", aliases: ["slu hospital", "st. louis university hospital"], location: { lat: 38.6367, lng: -90.2342 }, type: "landmark" },
  { name: "SSM Health St. Louis University Hospital", aliases: ["ssm slu hospital", "ssm health slu"], location: { lat: 38.6367, lng: -90.2342 }, type: "landmark" },
  { name: "Mercy Hospital St. Louis", aliases: ["mercy hospital", "mercy st. louis"], location: { lat: 38.6400, lng: -90.2500 }, type: "landmark" },
  { name: "St. Louis Children's Hospital", aliases: ["children's hospital", "st. louis children's"], location: { lat: 38.6372, lng: -90.2633 }, type: "landmark" },
  { name: "St. Mary's Hospital", aliases: ["st. mary's hospital", "st mary's"], location: { lat: 38.6000, lng: -90.2500 }, type: "landmark" },
  { name: "Missouri Baptist Medical Center", aliases: ["missouri baptist", "mo baptist hospital"], location: { lat: 38.6400, lng: -90.4000 }, type: "landmark" },
  { name: "St. Luke's Hospital", aliases: ["st. luke's hospital", "st lukes"], location: { lat: 38.6000, lng: -90.4000 }, type: "landmark" },
  { name: "St. Anthony's Medical Center", aliases: ["st. anthony's", "st anthonys"], location: { lat: 38.5500, lng: -90.3500 }, type: "landmark" },
  { name: "Memorial Hospital", aliases: ["memorial hospital belleville"], location: { lat: 38.5200, lng: -89.9831 }, type: "landmark" },
  { name: "St. Elizabeth's Hospital", aliases: ["st. elizabeth's", "st elizabeths"], location: { lat: 38.6000, lng: -89.9500 }, type: "landmark" },
  { name: "St. Louis Galleria", aliases: ["galleria", "st. louis galleria", "the galleria"], location: { lat: 38.6400, lng: -90.3400 }, type: "landmark" },
  { name: "West County Center", aliases: ["west county center", "west county mall"], location: { lat: 38.6000, lng: -90.4000 }, type: "landmark" },
  { name: "South County Center", aliases: ["south county center", "south county mall"], location: { lat: 38.5500, lng: -90.3500 }, type: "landmark" },
  { name: "Mid Rivers Mall", aliases: ["mid rivers", "mid rivers mall"], location: { lat: 38.8000, lng: -90.6000 }, type: "landmark" },
  { name: "St. Louis Mills", aliases: ["st. louis mills", "st louis mills", "mills mall"], location: { lat: 38.7500, lng: -90.4000 }, type: "landmark" },
  { name: "St. Charles Convention Center", aliases: ["st. charles convention center"], location: { lat: 38.7831, lng: -90.4811 }, type: "landmark" },
  { name: "Family Arena", aliases: ["family arena", "st. charles family arena"], location: { lat: 38.8000, lng: -90.6000 }, type: "landmark" },
  { name: "Ameristar Casino", aliases: ["ameristar", "ameristar casino st. charles"], location: { lat: 38.7831, lng: -90.4811 }, type: "landmark" },
  { name: "Harrah's Casino", aliases: ["harrah's", "harrahs casino"], location: { lat: 38.7500, lng: -90.2000 }, type: "landmark" },
  { name: "River City Casino", aliases: ["river city", "river city casino"], location: { lat: 38.5500, lng: -90.3000 }, type: "landmark" },
  { name: "Hollywood Casino", aliases: ["hollywood casino", "hollywood casino st. louis"], location: { lat: 38.6000, lng: -90.2000 }, type: "landmark" },
  { name: "Lumiere Place", aliases: ["lumiere", "lumiere place", "lumiere casino"], location: { lat: 38.6300, lng: -90.1850 }, type: "landmark" },
  { name: "St. Louis Aquarium", aliases: ["st. louis aquarium", "aquarium"], location: { lat: 38.6317, lng: -90.2069 }, type: "landmark" },
  { name: "St. Louis Wheel", aliases: ["st. louis wheel", "ferris wheel"], location: { lat: 38.6317, lng: -90.2069 }, type: "landmark" },
  { name: "St. Louis Carousel", aliases: ["st. louis carousel"], location: { lat: 38.6317, lng: -90.2069 }, type: "landmark" },
  { name: "St. Louis Union Station", aliases: ["union station", "st. louis union station"], location: { lat: 38.6317, lng: -90.2069 }, type: "landmark" },
  { name: "Mississippi River", aliases: ["mississippi river", "the mississippi"], location: { lat: 38.6300, lng: -90.1800 }, type: "landmark" },
  { name: "Missouri River", aliases: ["missouri river"], location: { lat: 38.8000, lng: -90.5000 }, type: "landmark" },
  { name: "Meramec River", aliases: ["meramec river", "meramec"], location: { lat: 38.4500, lng: -90.4000 }, type: "landmark" },
  { name: "Cuivre River", aliases: ["cuivre river"], location: { lat: 39.0000, lng: -90.9000 }, type: "landmark" },
  { name: "Big River", aliases: ["big river"], location: { lat: 38.2000, lng: -90.6000 }, type: "landmark" },
  
  // === MAJOR HIGHWAYS & INTERSTATES ===
  { name: "I-70", aliases: ["i-70", "interstate 70", "i70"], location: { lat: 38.6550, lng: -90.2350 }, type: "road" },
  { name: "I-64", aliases: ["i-64", "interstate 64", "i64", "us-40", "highway 40", "us 40"], location: { lat: 38.6300, lng: -90.2500 }, type: "road" },
  { name: "I-44", aliases: ["i-44", "interstate 44", "i44"], location: { lat: 38.5900, lng: -90.3000 }, type: "road" },
  { name: "I-55", aliases: ["i-55", "interstate 55", "i55"], location: { lat: 38.6000, lng: -90.2000 }, type: "road" },
  { name: "I-270", aliases: ["i-270", "interstate 270", "i270"], location: { lat: 38.7000, lng: -90.4000 }, type: "road" },
  { name: "I-170", aliases: ["i-170", "interstate 170", "i170"], location: { lat: 38.6700, lng: -90.3100 }, type: "road" },
  { name: "I-255", aliases: ["i-255", "interstate 255", "i255"], location: { lat: 38.5000, lng: -90.1500 }, type: "road" },
  { name: "I-70 Business", aliases: ["i-70 business", "i70 business"], location: { lat: 38.7831, lng: -90.4811 }, type: "road" },
  { name: "US 67", aliases: ["us-67", "us 67", "highway 67"], location: { lat: 38.7500, lng: -90.3000 }, type: "road" },
  { name: "MO 141", aliases: ["mo-141", "mo 141", "highway 141"], location: { lat: 38.6000, lng: -90.5000 }, type: "road" },
  { name: "MO 94", aliases: ["mo-94", "mo 94", "highway 94"], location: { lat: 38.6000, lng: -90.2000 }, type: "road" },
  { name: "MO 30", aliases: ["mo-30", "mo 30", "highway 30"], location: { lat: 38.5000, lng: -90.4000 }, type: "road" },
  { name: "MO 100", aliases: ["mo-100", "mo 100", "highway 100"], location: { lat: 38.6000, lng: -90.4000 }, type: "road" },
  { name: "MO 21", aliases: ["mo-21", "mo 21", "highway 21"], location: { lat: 38.5000, lng: -90.3000 }, type: "road" },
  { name: "MO 340", aliases: ["mo-340", "mo 340", "highway 340"], location: { lat: 38.6500, lng: -90.4000 }, type: "road" },
  { name: "MO 367", aliases: ["mo-367", "mo 367", "highway 367"], location: { lat: 38.7500, lng: -90.2000 }, type: "road" },
  { name: "IL 3", aliases: ["il-3", "il 3", "highway 3", "route 3"], location: { lat: 38.6000, lng: -90.1000 }, type: "road" },
  { name: "IL 157", aliases: ["il-157", "il 157", "highway 157"], location: { lat: 38.6000, lng: -89.9500 }, type: "road" },
  { name: "IL 159", aliases: ["il-159", "il 159", "highway 159"], location: { lat: 38.6000, lng: -89.9000 }, type: "road" },
  { name: "IL 111", aliases: ["il-111", "il 111", "highway 111"], location: { lat: 38.6000, lng: -90.0500 }, type: "road" },
  
  // === MAJOR STREETS ===
  { name: "Grand Boulevard", aliases: ["grand", "grand blvd", "grand avenue", "south grand", "north grand"], location: { lat: 38.6150, lng: -90.2422 }, type: "road" },
  { name: "Kingshighway", aliases: ["kingshighway", "kingshighway blvd", "kings highway"], location: { lat: 38.6200, lng: -90.2617 }, type: "road" },
  { name: "Natural Bridge", aliases: ["natural bridge", "natural bridge road"], location: { lat: 38.6900, lng: -90.2500 }, type: "road" },
  { name: "Page Avenue", aliases: ["page", "page avenue", "page ave", "page blvd"], location: { lat: 38.6950, lng: -90.3500 }, type: "road" },
  { name: "Olive Street", aliases: ["olive", "olive street", "olive blvd", "olive boulevard"], location: { lat: 38.6450, lng: -90.3000 }, type: "road" },
  { name: "Lindell Boulevard", aliases: ["lindell", "lindell blvd", "lindell boulevard"], location: { lat: 38.6400, lng: -90.2700 }, type: "road" },
  { name: "Market Street", aliases: ["market street", "market"], location: { lat: 38.6275, lng: -90.2050 }, type: "road" },
  { name: "Washington Avenue", aliases: ["washington ave", "washington avenue", "washington"], location: { lat: 38.6315, lng: -90.2000 }, type: "road" },
  { name: "Delmar Boulevard", aliases: ["delmar", "delmar blvd", "delmar loop", "delmar boulevard"], location: { lat: 38.6550, lng: -90.3000 }, type: "road" },
  { name: "Clayton Road", aliases: ["clayton road", "clayton rd", "clayton"], location: { lat: 38.6350, lng: -90.3500 }, type: "road" },
  { name: "Manchester Road", aliases: ["manchester road", "manchester rd", "manchester"], location: { lat: 38.6000, lng: -90.4000 }, type: "road" },
  { name: "Gravois Road", aliases: ["gravois", "gravois road", "gravois ave", "gravois avenue"], location: { lat: 38.5600, lng: -90.2800 }, type: "road" },
  { name: "Chippewa Street", aliases: ["chippewa", "chippewa street"], location: { lat: 38.5850, lng: -90.2600 }, type: "road" },
  { name: "Arsenal Street", aliases: ["arsenal", "arsenal street"], location: { lat: 38.6100, lng: -90.2400 }, type: "road" },
  { name: "Broadway", aliases: ["broadway", "north broadway", "south broadway"], location: { lat: 38.6350, lng: -90.1900 }, type: "road" },
  { name: "Jefferson Avenue", aliases: ["jefferson", "jefferson ave", "jefferson avenue"], location: { lat: 38.6200, lng: -90.2180 }, type: "road" },
  { name: "Tucker Boulevard", aliases: ["tucker", "tucker blvd", "12th street"], location: { lat: 38.6280, lng: -90.1970 }, type: "road" },
  { name: "Hampton Avenue", aliases: ["hampton", "hampton ave", "hampton avenue"], location: { lat: 38.6050, lng: -90.2800 }, type: "road" },
  { name: "Lindbergh Boulevard", aliases: ["lindbergh", "lindbergh blvd", "lindbergh boulevard"], location: { lat: 38.6000, lng: -90.3600 }, type: "road" },
  { name: "Big Bend", aliases: ["big bend", "big bend blvd", "big bend boulevard"], location: { lat: 38.6200, lng: -90.3400 }, type: "road" },
  { name: "Tesson Ferry Road", aliases: ["tesson ferry", "tesson ferry road", "tesson ferry rd"], location: { lat: 38.5500, lng: -90.3500 }, type: "road" },
  { name: "Watson Road", aliases: ["watson", "watson road", "watson rd"], location: { lat: 38.5800, lng: -90.3800 }, type: "road" },
  { name: "Laclede Station Road", aliases: ["laclede station", "laclede station road"], location: { lat: 38.5700, lng: -90.3200 }, type: "road" },
  { name: "Lemay Ferry Road", aliases: ["lemay ferry", "lemay ferry road", "lemay ferry rd"], location: { lat: 38.5300, lng: -90.2800 }, type: "road" },
  { name: "River Des Peres", aliases: ["river des peres", "des peres river"], location: { lat: 38.5800, lng: -90.2500 }, type: "road" },
  { name: "Riverview Drive", aliases: ["riverview drive", "riverview"], location: { lat: 38.7500, lng: -90.2000 }, type: "road" },
  { name: "Hall Street", aliases: ["hall", "hall street"], location: { lat: 38.6500, lng: -90.2000 }, type: "road" },
  { name: "14th Street", aliases: ["14th", "14th street"], location: { lat: 38.6300, lng: -90.1950 }, type: "road" },
  { name: "18th Street", aliases: ["18th", "18th street"], location: { lat: 38.6250, lng: -90.1900 }, type: "road" },
  { name: "Vandeventer Avenue", aliases: ["vandeventer", "vandeventer ave", "vandeventer avenue"], location: { lat: 38.6400, lng: -90.2500 }, type: "road" },
  { name: "Compton Avenue", aliases: ["compton", "compton ave", "compton avenue"], location: { lat: 38.6200, lng: -90.2300 }, type: "road" },
  { name: "Soulard Street", aliases: ["soulard street"], location: { lat: 38.6100, lng: -90.2100 }, type: "road" },
  { name: "Russell Boulevard", aliases: ["russell", "russell blvd", "russell boulevard"], location: { lat: 38.6000, lng: -90.2200 }, type: "road" },
  { name: "Sidney Street", aliases: ["sidney", "sidney street"], location: { lat: 38.5900, lng: -90.2400 }, type: "road" },
  { name: "Lafayette Avenue", aliases: ["lafayette", "lafayette ave", "lafayette avenue"], location: { lat: 38.6150, lng: -90.2250 }, type: "road" },
  { name: "Park Avenue", aliases: ["park", "park ave", "park avenue"], location: { lat: 38.6400, lng: -90.2600 }, type: "road" },
  { name: "Union Boulevard", aliases: ["union", "union blvd", "union boulevard"], location: { lat: 38.6500, lng: -90.2700 }, type: "road" },
  { name: "Skinker Boulevard", aliases: ["skinker", "skinker blvd", "skinker boulevard"], location: { lat: 38.6500, lng: -90.2900 }, type: "road" },
  { name: "McPherson Avenue", aliases: ["mcpherson", "mcpherson ave", "mcpherson avenue"], location: { lat: 38.6450, lng: -90.2800 }, type: "road" },
  { name: "Waterman Boulevard", aliases: ["waterman", "waterman blvd", "waterman boulevard"], location: { lat: 38.6400, lng: -90.2900 }, type: "road" },
  { name: "Forest Park Parkway", aliases: ["forest park parkway", "forest park pkwy"], location: { lat: 38.6400, lng: -90.2800 }, type: "road" },
  { name: "McKnight Road", aliases: ["mcknight", "mcknight road", "mcknight rd"], location: { lat: 38.6800, lng: -90.3200 }, type: "road" },
  { name: "Dorsett Road", aliases: ["dorsett", "dorsett road", "dorsett rd"], location: { lat: 38.7000, lng: -90.4000 }, type: "road" },
  { name: "St. Charles Rock Road", aliases: ["st. charles rock road", "st charles rock road", "st. charles rock rd"], location: { lat: 38.7200, lng: -90.3500 }, type: "road" },
  { name: "New Halls Ferry Road", aliases: ["new halls ferry", "new halls ferry road"], location: { lat: 38.7500, lng: -90.3000 }, type: "road" },
  { name: "Old Halls Ferry Road", aliases: ["old halls ferry", "old halls ferry road"], location: { lat: 38.7400, lng: -90.2800 }, type: "road" },
  { name: "West Florissant Avenue", aliases: ["west florissant", "west florissant ave"], location: { lat: 38.7500, lng: -90.3000 }, type: "road" },
  { name: "North Florissant Avenue", aliases: ["north florissant", "north florissant ave"], location: { lat: 38.7000, lng: -90.2500 }, type: "road" },
  { name: "South Florissant Avenue", aliases: ["south florissant", "south florissant ave"], location: { lat: 38.6500, lng: -90.3000 }, type: "road" },
  { name: "Riverview Boulevard", aliases: ["riverview blvd", "riverview boulevard"], location: { lat: 38.7500, lng: -90.2000 }, type: "road" },
  { name: "Lewis and Clark Boulevard", aliases: ["lewis and clark", "lewis & clark blvd"], location: { lat: 38.8000, lng: -90.5000 }, type: "road" },
  { name: "First Capitol Drive", aliases: ["first capitol", "first capitol drive"], location: { lat: 38.7800, lng: -90.4800 }, type: "road" },
  { name: "Zumbehl Road", aliases: ["zumbehl", "zumbehl road"], location: { lat: 38.8000, lng: -90.6000 }, type: "road" },
  { name: "Highway K", aliases: ["highway k", "hwy k", "route k"], location: { lat: 38.8000, lng: -90.7000 }, type: "road" },
  { name: "Highway N", aliases: ["highway n", "hwy n", "route n"], location: { lat: 38.7500, lng: -90.6500 }, type: "road" },
  { name: "Highway DD", aliases: ["highway dd", "hwy dd", "route dd"], location: { lat: 38.6000, lng: -90.5000 }, type: "road" },
  { name: "Highway 61", aliases: ["highway 61", "hwy 61", "route 61"], location: { lat: 38.5000, lng: -90.3000 }, type: "road" },
  { name: "Highway 30", aliases: ["highway 30", "hwy 30", "route 30"], location: { lat: 38.5000, lng: -90.4000 }, type: "road" },
  
  // === BRIDGES ===
  { name: "Poplar Street Bridge", aliases: ["poplar street bridge", "poplar st bridge", "poplar bridge"], location: { lat: 38.6200, lng: -90.1700 }, type: "bridge" },
  { name: "MLK Bridge", aliases: ["mlk bridge", "martin luther king bridge", "martin luther king jr bridge"], location: { lat: 38.6350, lng: -90.1750 }, type: "bridge" },
  { name: "Eads Bridge", aliases: ["eads bridge"], location: { lat: 38.6280, lng: -90.1790 }, type: "bridge" },
  { name: "Stan Musial Bridge", aliases: ["stan musial bridge", "new mississippi river bridge", "stan span", "stan the man bridge"], location: { lat: 38.6420, lng: -90.1700 }, type: "bridge" },
  { name: "Jefferson Barracks Bridge", aliases: ["jefferson barracks bridge", "jb bridge", "jefferson barracks"], location: { lat: 38.4700, lng: -90.2200 }, type: "bridge" },
  { name: "Chain of Rocks Bridge", aliases: ["chain of rocks bridge", "chain of rocks"], location: { lat: 38.7550, lng: -90.1700 }, type: "bridge" },
  { name: "McKinley Bridge", aliases: ["mckinley bridge"], location: { lat: 38.6500, lng: -90.1800 }, type: "bridge" },
  { name: "Meramec River Bridge", aliases: ["meramec bridge", "meramec river bridge"], location: { lat: 38.4500, lng: -90.4000 }, type: "bridge" },
  { name: "I-270 Bridge", aliases: ["i-270 bridge", "270 bridge"], location: { lat: 38.7000, lng: -90.4000 }, type: "bridge" },
  { name: "I-55 Bridge", aliases: ["i-55 bridge", "55 bridge"], location: { lat: 38.6000, lng: -90.1700 }, type: "bridge" },
  { name: "I-64 Bridge", aliases: ["i-64 bridge", "64 bridge", "highway 40 bridge"], location: { lat: 38.6300, lng: -90.1700 }, type: "bridge" },
  { name: "I-70 Bridge", aliases: ["i-70 bridge", "70 bridge"], location: { lat: 38.6550, lng: -90.1700 }, type: "bridge" },
  { name: "Daniel Boone Bridge", aliases: ["daniel boone bridge"], location: { lat: 38.8000, lng: -90.5000 }, type: "bridge" },
  { name: "Blanchette Bridge", aliases: ["blanchette bridge"], location: { lat: 38.7831, lng: -90.4811 }, type: "bridge" },
  { name: "Discovery Bridge", aliases: ["discovery bridge"], location: { lat: 38.8100, lng: -90.5000 }, type: "bridge" },
  
  // === INTERSECTIONS / INTERCHANGES ===
  { name: "I-64 at Grand", aliases: ["i-64 and grand", "highway 40 at grand", "64 and grand"], location: { lat: 38.6300, lng: -90.2420 }, type: "intersection" },
  { name: "I-70 at I-270", aliases: ["i-70 and i-270", "70/270 interchange", "70 and 270"], location: { lat: 38.7600, lng: -90.3800 }, type: "intersection" },
  { name: "I-44 at I-270", aliases: ["i-44 and i-270", "44/270 interchange", "44 and 270"], location: { lat: 38.5400, lng: -90.4200 }, type: "intersection" },
  { name: "I-64 at I-170", aliases: ["i-64 and i-170", "64/170 interchange", "64 and 170"], location: { lat: 38.6350, lng: -90.3100 }, type: "intersection" },
  { name: "I-70 at I-170", aliases: ["i-70 and i-170", "70/170 interchange", "70 and 170"], location: { lat: 38.7050, lng: -90.3100 }, type: "intersection" },
  { name: "I-55 at I-270", aliases: ["i-55 and i-270", "55/270 interchange", "55 and 270"], location: { lat: 38.5000, lng: -90.3000 }, type: "intersection" },
  { name: "I-44 at I-55", aliases: ["i-44 and i-55", "44/55 interchange", "44 and 55"], location: { lat: 38.5900, lng: -90.2500 }, type: "intersection" },
  { name: "I-64 at I-55", aliases: ["i-64 and i-55", "64/55 interchange", "64 and 55", "highway 40 and 55"], location: { lat: 38.6200, lng: -90.2000 }, type: "intersection" },
  { name: "I-70 at I-55", aliases: ["i-70 and i-55", "70/55 interchange", "70 and 55"], location: { lat: 38.6500, lng: -90.2000 }, type: "intersection" },
  { name: "I-270 at I-170", aliases: ["i-270 and i-170", "270/170 interchange", "270 and 170"], location: { lat: 38.7000, lng: -90.3500 }, type: "intersection" },
  { name: "I-270 at Page", aliases: ["i-270 and page", "270 and page", "270/page"], location: { lat: 38.7000, lng: -90.3500 }, type: "intersection" },
  { name: "I-270 at Natural Bridge", aliases: ["i-270 and natural bridge", "270 and natural bridge"], location: { lat: 38.7000, lng: -90.3000 }, type: "intersection" },
  { name: "I-270 at St. Charles Rock Road", aliases: ["i-270 and st. charles rock", "270 and st charles rock"], location: { lat: 38.7200, lng: -90.3500 }, type: "intersection" },
  { name: "I-44 at Lindbergh", aliases: ["i-44 and lindbergh", "44 and lindbergh"], location: { lat: 38.6000, lng: -90.3600 }, type: "intersection" },
  { name: "I-44 at Hampton", aliases: ["i-44 and hampton", "44 and hampton"], location: { lat: 38.5900, lng: -90.2800 }, type: "intersection" },
  { name: "I-44 at Kingshighway", aliases: ["i-44 and kingshighway", "44 and kingshighway"], location: { lat: 38.5900, lng: -90.2600 }, type: "intersection" },
  { name: "I-64 at Kingshighway", aliases: ["i-64 and kingshighway", "64 and kingshighway", "highway 40 and kingshighway"], location: { lat: 38.6300, lng: -90.2600 }, type: "intersection" },
  { name: "I-64 at Skinker", aliases: ["i-64 and skinker", "64 and skinker", "highway 40 and skinker"], location: { lat: 38.6400, lng: -90.2900 }, type: "intersection" },
  { name: "I-70 at Natural Bridge", aliases: ["i-70 and natural bridge", "70 and natural bridge"], location: { lat: 38.6900, lng: -90.2500 }, type: "intersection" },
  { name: "I-70 at Goodfellow", aliases: ["i-70 and goodfellow", "70 and goodfellow"], location: { lat: 38.6800, lng: -90.2400 }, type: "intersection" },
  { name: "Grand and Gravois", aliases: ["grand and gravois"], location: { lat: 38.6000, lng: -90.2400 }, type: "intersection" },
  { name: "Grand and Chippewa", aliases: ["grand and chippewa"], location: { lat: 38.5900, lng: -90.2400 }, type: "intersection" },
  { name: "Kingshighway and Chippewa", aliases: ["kingshighway and chippewa"], location: { lat: 38.5900, lng: -90.2600 }, type: "intersection" },
  { name: "Kingshighway and Arsenal", aliases: ["kingshighway and arsenal"], location: { lat: 38.6100, lng: -90.2600 }, type: "intersection" },
  { name: "Kingshighway and Lindell", aliases: ["kingshighway and lindell"], location: { lat: 38.6400, lng: -90.2600 }, type: "intersection" },
  { name: "Lindbergh and Manchester", aliases: ["lindbergh and manchester"], location: { lat: 38.6000, lng: -90.4000 }, type: "intersection" },
  { name: "Lindbergh and Clayton", aliases: ["lindbergh and clayton"], location: { lat: 38.6400, lng: -90.3800 }, type: "intersection" },
  { name: "Big Bend and Manchester", aliases: ["big bend and manchester"], location: { lat: 38.6000, lng: -90.4000 }, type: "intersection" },
  { name: "Clayton and Big Bend", aliases: ["clayton and big bend"], location: { lat: 38.6400, lng: -90.3400 }, type: "intersection" },
  { name: "Clayton and Lindbergh", aliases: ["clayton and lindbergh"], location: { lat: 38.6400, lng: -90.3800 }, type: "intersection" },
  { name: "Delmar and Skinker", aliases: ["delmar and skinker", "delmar loop"], location: { lat: 38.6550, lng: -90.3000 }, type: "intersection" },
  { name: "Delmar and Kingshighway", aliases: ["delmar and kingshighway"], location: { lat: 38.6550, lng: -90.2600 }, type: "intersection" },
  { name: "Market and Tucker", aliases: ["market and tucker", "market and 12th"], location: { lat: 38.6280, lng: -90.2000 }, type: "intersection" },
  { name: "Market and Broadway", aliases: ["market and broadway"], location: { lat: 38.6300, lng: -90.1900 }, type: "intersection" },
  { name: "Washington and Tucker", aliases: ["washington and tucker", "washington and 12th"], location: { lat: 38.6315, lng: -90.2000 }, type: "intersection" },
  { name: "Olive and Tucker", aliases: ["olive and tucker", "olive and 12th"], location: { lat: 38.6450, lng: -90.2000 }, type: "intersection" },
  { name: "Olive and Grand", aliases: ["olive and grand"], location: { lat: 38.6450, lng: -90.2400 }, type: "intersection" },
  { name: "Page and Lindbergh", aliases: ["page and lindbergh"], location: { lat: 38.6950, lng: -90.3600 }, type: "intersection" },
  { name: "Page and I-270", aliases: ["page and i-270", "page and 270"], location: { lat: 38.7000, lng: -90.3500 }, type: "intersection" },
  { name: "Natural Bridge and I-270", aliases: ["natural bridge and i-270", "natural bridge and 270"], location: { lat: 38.7000, lng: -90.3000 }, type: "intersection" },
  { name: "St. Charles Rock Road and I-270", aliases: ["st. charles rock and i-270", "st charles rock and 270"], location: { lat: 38.7200, lng: -90.3500 }, type: "intersection" },
  { name: "Highway 40 and I-270", aliases: ["highway 40 and i-270", "hwy 40 and 270", "i-64 and i-270"], location: { lat: 38.7000, lng: -90.4000 }, type: "intersection" },
]

// Geocode text to find St. Louis location
// Returns null if no specific location found (prevents vague articles from being placed)
export function geocodeText(text: string): { location: GeoPoint; confidence: ConfidenceLevel; matchedLocation: string } | null {
  const lowerText = text.toLowerCase()
  
  // Check for Jefferson County mention first - prioritize it
  const mentionsJeffersonCounty = /\bjefferson\s+county\b/i.test(text) || /\bjeff\s+co\b/i.test(text) || /\bjeffco\b/i.test(text)
  
  // Score matches by type priority
  const matches: Array<{ entry: LocationEntry; score: number }> = []
  
  for (const entry of STL_LOCATIONS) {
    // Check name (exact match gets higher score)
    const nameLower = entry.name.toLowerCase()
    if (lowerText.includes(nameLower)) {
      // Prefer word boundaries for better matching (e.g., "Fenton" not "Fentonsville")
      const wordBoundaryRegex = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      const hasWordBoundary = wordBoundaryRegex.test(text)
      let score = getTypeScore(entry.type) + (hasWordBoundary ? 15 : 10)
      
      // Boost score if Jefferson County is mentioned and this is a Jefferson County location
      if (mentionsJeffersonCounty && entry.name.toLowerCase().includes("jefferson")) {
        score += 20 // Strong boost for Jefferson County matches
      } else if (mentionsJeffersonCounty && isJeffersonCountyLocation(entry.location)) {
        score += 15 // Boost for any location in Jefferson County when county is mentioned
      }
      
      matches.push({ entry, score })
      continue
    }
    
    // Check aliases
    for (const alias of entry.aliases) {
      const aliasLower = alias.toLowerCase()
      if (lowerText.includes(aliasLower)) {
        const wordBoundaryRegex = new RegExp(`\\b${aliasLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        const hasWordBoundary = wordBoundaryRegex.test(text)
        let score = getTypeScore(entry.type) + (hasWordBoundary ? 10 : 5)
        
        // Boost score if Jefferson County is mentioned and this is a Jefferson County location
        if (mentionsJeffersonCounty && entry.name.toLowerCase().includes("jefferson")) {
          score += 20
        } else if (mentionsJeffersonCounty && isJeffersonCountyLocation(entry.location)) {
          score += 15
        }
        
        matches.push({ entry, score })
        break
      }
    }
  }
  
  if (matches.length === 0) return null
  
  // Sort by score (higher is better)
  matches.sort((a, b) => b.score - a.score)
  const bestMatch = matches[0]
  
  // If Jefferson County is mentioned but best match is not in Jefferson County, 
  // look for a Jefferson County specific match
  if (mentionsJeffersonCounty && !isJeffersonCountyLocation(bestMatch.entry.location)) {
    const jeffCoMatch = matches.find(m => isJeffersonCountyLocation(m.entry.location))
    if (jeffCoMatch && jeffCoMatch.score >= 10) {
      // Use Jefferson County match if it has reasonable score
      return createGeocodeResult(jeffCoMatch.entry, jeffCoMatch.score)
    }
  }
  
  // Use helper function to create result
  return createGeocodeResult(bestMatch.entry, bestMatch.score)
}

function getTypeScore(type: LocationEntry["type"]): number {
  switch (type) {
    case "intersection": return 20
    case "bridge": return 18
    case "landmark": return 15
    case "neighborhood": return 12
    case "city": return 10
    case "road": return 8
    default: return 5
  }
}

// Check if a location is in Jefferson County (south of Meramec River)
// Meramec River is approximately at latitude 38.45-38.50
// Jefferson County is south of this river
function isJeffersonCountyLocation(point: GeoPoint): boolean {
  // Jefferson County is roughly south of latitude 38.45
  // And within the STL metro bounds (west of -89.85, east of -90.55)
  return point.lat < 38.45 && 
         point.lat >= 38.20 && // Southern boundary of metro area
         point.lng >= -90.70 && // Western boundary
         point.lng <= -90.20    // Eastern boundary (roughly)
}

// Helper to create geocode result with validation
function createGeocodeResult(entry: LocationEntry, score: number): { location: GeoPoint; confidence: ConfidenceLevel; matchedLocation: string } | null {
  // Determine confidence based on match quality
  let confidence: ConfidenceLevel = "low"
  if (score >= 20) {
    confidence = "high"
  } else if (score >= 15) {
    confidence = "high"
  } else if (score >= 12) {
    confidence = "medium"
  } else if (score >= 10) {
    confidence = "medium"
  } else {
    return null // Score too low
  }
  
  // Add small jitter to avoid all incidents at exact same spot
  const jitter = 0.002 // ~200m radius
  const location = {
    lat: entry.location.lat + (Math.random() - 0.5) * jitter,
    lng: entry.location.lng + (Math.random() - 0.5) * jitter,
  }
  
  // CRITICAL: Validate location is within STL metro bounds AND reasonable distance
  if (!isValidSTLLocation(location, 50)) {
    console.warn(`[Geocoding] Location ${entry.name} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}) failed geographical fence check, rejecting`)
    return null
  }
  
  // Special validation for Jefferson County - ensure it's south of Meramec River
  if (isJeffersonCountyLocation(entry.location) && location.lat >= 38.45) {
    console.warn(`[Geocoding] Jefferson County location ${entry.name} placed too far north (${location.lat.toFixed(4)}), adjusting south of Meramec River`)
    // Adjust to be clearly south of Meramec River
    location.lat = Math.min(location.lat, 38.40)
  }
  
  console.log(`[Geocoding] Matched "${entry.name}" (${entry.type}) with ${confidence} confidence at (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})${isJeffersonCountyLocation(entry.location) ? ' [Jefferson County]' : ''}`)
  
  return {
    location,
    confidence,
    matchedLocation: entry.name,
  }
}

// ============================================================================
// NEWS SOURCES & RSS FETCHING
// ============================================================================

interface RSSFeed {
  name: string
  url: string
  type: "rss" | "atom"
}

// St. Louis area news RSS feeds with fallback URLs
interface RSSFeedWithFallbacks extends RSSFeed {
  fallbackUrls?: string[]
}

const STL_NEWS_FEEDS: RSSFeedWithFallbacks[] = [
  // St. Louis Post-Dispatch - uses search-based RSS
  { 
    name: "St. Louis Post-Dispatch", 
    url: "https://www.stltoday.com/search/?f=rss&t=article&c=news/local&l=50&s=start_time&sd=desc", 
    type: "rss",
    fallbackUrls: ["https://www.stltoday.com/rss/"]
  },
  
  // KSDK (NBC affiliate) - verified RSS feed
  { 
    name: "KSDK News", 
    url: "https://www.ksdk.com/feeds/syndication/rss/news/local", 
    type: "rss",
    fallbackUrls: ["https://www.ksdk.com/rss/"]
  },
  
  // Fox 2 Now (KTVI) - verified RSS feed (this one is working)
  { 
    name: "Fox 2 Now", 
    url: "https://fox2now.com/feed/", 
    type: "rss"
  },
  
  // Riverfront Times - try alternative feed URL
  { 
    name: "Riverfront Times", 
    url: "https://www.riverfronttimes.com/feed", 
    type: "rss",
    fallbackUrls: [
      "https://www.riverfronttimes.com/stlouis/Rss.xml",
      "https://www.riverfronttimes.com/rss/"
    ]
  },
]

// Parse RSS/Atom feed XML
function parseRSSFeed(xml: string, feedName: string): Array<{
  title: string
  link: string
  description: string
  pubDate: Date
}> {
  const items: Array<{ title: string; link: string; description: string; pubDate: Date }> = []
  
  if (!xml || xml.trim().length === 0) {
    console.warn(`[RSS Parse] ${feedName}: Empty XML response`)
    return items
  }
  
  // Check if it looks like RSS/Atom XML
  if (!xml.includes("<rss") && !xml.includes("<feed") && !xml.includes("<item") && !xml.includes("<entry")) {
    console.warn(`[RSS Parse] ${feedName}: Response doesn't appear to be RSS/Atom XML (first 200 chars: ${xml.substring(0, 200)})`)
    return items
  }
  
  try {
    // Simple regex-based XML parsing (works for most RSS feeds)
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const atomEntryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    
    const itemMatches = Array.from(xml.matchAll(itemRegex))
    const entryMatches = Array.from(xml.matchAll(atomEntryRegex))
    
    console.log(`[RSS Parse] ${feedName}: Found ${itemMatches.length} RSS items, ${entryMatches.length} Atom entries`)
    
    // Process RSS items
    for (const itemMatch of itemMatches) {
      const itemXml = itemMatch[1]
      
      const title = extractTag(itemXml, "title") || ""
      const link = extractTag(itemXml, "link") || extractTag(itemXml, "guid") || ""
      const description = extractTag(itemXml, "description") || extractTag(itemXml, "content:encoded") || extractTag(itemXml, "content") || ""
      const pubDateStr = extractTag(itemXml, "pubDate") || extractTag(itemXml, "dc:date") || extractTag(itemXml, "published") || ""
      
      if (title && link) {
        try {
          const pubDate = pubDateStr ? new Date(pubDateStr) : new Date()
          items.push({
            title: decodeHTMLEntities(title),
            link: decodeHTMLEntities(link),
            description: stripHTML(decodeHTMLEntities(description)),
            pubDate: isNaN(pubDate.getTime()) ? new Date() : pubDate,
          })
        } catch (e) {
          console.warn(`[RSS Parse] ${feedName}: Error parsing item "${title.substring(0, 50)}..."`, e)
        }
      }
    }
    
    // Process Atom entries
    for (const entryMatch of entryMatches) {
      const entryXml = entryMatch[1]
      
      const title = extractTag(entryXml, "title") || ""
      const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']*)["'][^>]*>/i) || entryXml.match(/<link[^>]*>([^<]*)<\/link>/i)
      const link = linkMatch ? linkMatch[1] : ""
      const summary = extractTag(entryXml, "summary") || extractTag(entryXml, "content") || ""
      const updated = extractTag(entryXml, "updated") || extractTag(entryXml, "published") || ""
      
      if (title && link) {
        try {
          const pubDate = updated ? new Date(updated) : new Date()
          items.push({
            title: decodeHTMLEntities(title),
            link: decodeHTMLEntities(link),
            description: stripHTML(decodeHTMLEntities(summary)),
            pubDate: isNaN(pubDate.getTime()) ? new Date() : pubDate,
          })
        } catch (e) {
          console.warn(`[RSS Parse] ${feedName}: Error parsing entry "${title.substring(0, 50)}..."`, e)
        }
      }
    }
    
    console.log(`[RSS Parse] ${feedName}: Successfully parsed ${items.length} items`)
  } catch (error) {
    console.error(`[RSS Parse] ${feedName}: Error parsing feed -`, error)
  }
  
  return items
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i")
  const cdataMatch = xml.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1]
  
  // Handle regular content
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500) // Limit length
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
}

// Generate a short summary from article description
function generateSummary(title: string, description: string): string {
  // If description is short enough, use it
  if (description.length <= 150) return description
  
  // Otherwise, truncate intelligently
  const sentences = description.split(/[.!?]+/)
  let summary = ""
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue
    
    if (summary.length + trimmed.length > 150) {
      break
    }
    summary += (summary ? ". " : "") + trimmed
  }
  
  if (summary && !summary.endsWith(".")) {
    summary += "..."
  }
  
  return summary || description.slice(0, 150) + "..."
}

// Check if article is relevant to St. Louis area
function isSTLRelevant(title: string, description: string): boolean {
  const text = (title + " " + description).toLowerCase()
  
  // Keywords that indicate STL relevance
  const stlKeywords = [
    "st. louis", "st louis", "stl", "missouri", "mo.",
    "downtown", "metro", "county", "city of st",
    "cardinals", "blues", "gateway arch", "busch stadium",
    "i-70", "i-64", "i-44", "i-55", "i-270", "highway 40",
    "ferguson", "clayton", "kirkwood", "florissant", "chesterfield",
    "university city", "maplewood", "webster groves", "ballwin",
    "metrolink", "metro transit", "lambert", "arch",
    "forest park", "tower grove", "soulard", "the hill",
    "central west end", "dogtown", "the grove",
    "north county", "south county", "west county",
    "creve coeur", "maryland heights", "overland",
    "east st. louis", "east stl", "belleville", "collinsville",
    "jefferson county", "jeff co", "jeffco", "jefferson co",
    "festus", "crystal city", "herculaneum", "de soto", "hillsboro",
    "pevely", "barnhart", "imperial", "high ridge", "house springs",
    "cedar hill", "byrnes mill", "meramec river", "meramec"
  ]
  
  // For feeds from STL sources, be more lenient - they're likely local news
  // Check for any location reference from our database
  const hasLocationMatch = STL_LOCATIONS.some(loc => {
    if (text.includes(loc.name.toLowerCase())) return true
    return loc.aliases.some(alias => text.includes(alias.toLowerCase()))
  })
  
  return stlKeywords.some(keyword => text.includes(keyword)) || hasLocationMatch
}

// ============================================================================
// CORS PROXIES - Multiple fallbacks for reliability
// ============================================================================

const CORS_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://api.allorigins.win/get?url=", // Alternative endpoint (returns JSON)
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://thingproxy.freeboard.io/fetch/",
]

async function fetchWithCorsProxy(url: string, timeout: number = 10000): Promise<string | null> {
  // Try direct fetch first (works for some feeds that allow CORS)
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const directResponse = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "Mozilla/5.0 (compatible; STLMonitor/1.0)",
      },
    })
    
    clearTimeout(timeoutId)
    
    if (directResponse.ok) {
      const text = await directResponse.text()
      if (isValidRSSContent(text)) {
        console.log(`[CORS] Direct fetch succeeded for ${url.substring(0, 50)}...`)
        return text
      }
    }
  } catch (e) {
    // Direct fetch failed, try proxies
  }
  
  // Try CORS proxies
  for (const proxy of CORS_PROXIES) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      let proxyUrl = proxy + encodeURIComponent(url)
      let response: Response
      
      // Handle allorigins.win /get endpoint which returns JSON
      if (proxy.includes("api.allorigins.win/get")) {
        response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
          },
        })
        
        clearTimeout(timeoutId)
        
        if (response.ok) {
          try {
            const json = await response.json()
            const text = json.contents || json.content || ""
            if (isValidRSSContent(text)) {
              console.log(`[CORS] Proxy ${proxy.substring(0, 30)}... succeeded (JSON) for ${url.substring(0, 50)}...`)
              return text
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
        continue
      }
      
      // Standard proxy request
      proxyUrl = proxy + encodeURIComponent(url)
      response = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const text = await response.text()
        // Validate it's actually RSS/XML content (not HTML error page)
        if (isValidRSSContent(text)) {
          console.log(`[CORS] Proxy ${proxy.substring(0, 30)}... succeeded for ${url.substring(0, 50)}...`)
          return text
        } else {
          // Check if it's an HTML error page
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            console.warn(`[CORS] Proxy ${proxy.substring(0, 30)}... returned HTML error page for ${url.substring(0, 50)}...`)
          } else {
            console.warn(`[CORS] Proxy ${proxy.substring(0, 30)}... returned non-RSS content for ${url.substring(0, 50)}...`)
          }
        }
      }
    } catch (e) {
      // Try next proxy
      continue
    }
  }
  
  console.warn(`[CORS] All proxies failed for ${url.substring(0, 50)}...`)
  return null
}

// Helper to validate RSS/XML content
function isValidRSSContent(text: string): boolean {
  if (!text || text.trim().length === 0) return false
  
  // Check for RSS/Atom indicators
  const hasRSS = text.includes("<rss") || text.includes("<feed") || text.includes("<item") || text.includes("<entry")
  
  // Reject HTML pages (error pages from proxies)
  const isHTML = text.includes("<!DOCTYPE") || text.includes("<html") || text.includes("<body")
  
  return hasRSS && !isHTML
}

// ============================================================================
// LOCAL NEWS FETCHING - MAIN FUNCTION
// ============================================================================

export async function fetchLocalNews(): Promise<NewsItem[]> {
  const allNews: NewsItem[] = []
  const seenUrls = new Set<string>()
  
  // Use allSettled to handle partial failures gracefully
  const feedPromises = STL_NEWS_FEEDS.map(async (feed) => {
    const startTime = Date.now()
    try {
      console.log(`[News Fetch] Attempting to fetch ${feed.name}...`)
      
      // Try primary URL first
      let xml = await fetchWithCorsProxy(feed.url)
      
      // If primary URL fails and we have fallback URLs, try them
      if (!xml && (feed as RSSFeedWithFallbacks).fallbackUrls) {
        const fallbackUrls = (feed as RSSFeedWithFallbacks).fallbackUrls!
        console.log(`[News Fetch] Primary URL failed for ${feed.name}, trying ${fallbackUrls.length} fallback URL(s)...`)
        
        for (const fallbackUrl of fallbackUrls) {
          xml = await fetchWithCorsProxy(fallbackUrl)
          if (xml) {
            console.log(`[News Fetch] ✓ ${feed.name}: Fallback URL succeeded`)
            break
          }
        }
      }
      
      if (!xml) {
        console.warn(`[News Fetch] ❌ ${feed.name}: Failed to fetch from all URLs and CORS proxies`)
        return { feed: feed.name, items: [], stats: { fetched: false, parsed: 0, relevant: 0, geocoded: 0 } }
      }
      
      const items = parseRSSFeed(xml, feed.name)
      console.log(`[News Fetch] ✓ ${feed.name}: Fetched ${items.length} items from RSS feed`)
      
      const newsItems: NewsItem[] = []
      let relevantCount = 0
      let geocodedCount = 0
      
      for (const item of items) {
        // Skip duplicates
        if (seenUrls.has(item.link)) continue
        seenUrls.add(item.link)
        
        // Skip non-STL relevant articles (basic filter)
        if (!isSTLRelevant(item.title, item.description)) {
          continue
        }
        relevantCount++
        
        // Attempt to geocode - this will return null if location is vague or outside bounds
        const geoResult = geocodeText(item.title + " " + item.description)
        
        if (!geoResult) {
          continue
        }
        geocodedCount++
        
        // Generate summary
        const summary = generateSummary(item.title, item.description)
        
        newsItems.push({
          id: `news-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: item.title,
          outlet: feed.name,
          url: item.link,
          publishedAt: item.pubDate,
          snippet: summary,
          location: geoResult.location,
          geocodingConfidence: geoResult.confidence,
        })
      }
      
      const duration = Date.now() - startTime
      console.log(`[News Fetch] ✓ ${feed.name}: ${newsItems.length} items added (${items.length} parsed, ${relevantCount} STL-relevant, ${geocodedCount} geocoded) in ${duration}ms`)
      
      return { feed: feed.name, items: newsItems, stats: { fetched: true, parsed: items.length, relevant: relevantCount, geocoded: geocodedCount } }
    } catch (error) {
      console.error(`[News Fetch] ❌ ${feed.name}: Error -`, error)
      return { feed: feed.name, items: [], stats: { fetched: false, parsed: 0, relevant: 0, geocoded: 0, error: String(error) } }
    }
  })
  
  const results = await Promise.allSettled(feedPromises)
  
  const feedStats: Array<{ feed: string; stats: any }> = []
  
  for (const result of results) {
    if (result.status === "fulfilled") {
      allNews.push(...result.value.items)
      feedStats.push({ feed: result.value.feed, stats: result.value.stats })
    } else {
      console.error(`[News Fetch] Feed promise rejected:`, result.reason)
    }
  }
  
  // Log summary per feed
  console.log(`[News Fetch] Feed Summary:`)
  feedStats.forEach(({ feed, stats }) => {
    if (stats.fetched) {
      console.log(`  ✓ ${feed}: ${stats.parsed} parsed → ${stats.relevant} relevant → ${stats.geocoded} geocoded`)
    } else {
      console.log(`  ❌ ${feed}: Failed to fetch${stats.error ? ` (${stats.error})` : ''}`)
    }
  })
  
  // Sort by publish date (newest first)
  allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
  
  // Return only recent news (last 48 hours) and limit to 100 items
  // Use 48 hours to ensure we have content for demos
  const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000
  const timeFiltered = allNews.filter(item => item.publishedAt.getTime() > twoDaysAgo)
  
  // Count by confidence level
  const highConfidence = timeFiltered.filter(n => n.location && n.geocodingConfidence === "high").length
  const mediumConfidence = timeFiltered.filter(n => n.location && n.geocodingConfidence === "medium").length
  const geocoded = timeFiltered.filter(n => n.location).length
  const notGeocoded = timeFiltered.filter(n => !n.location).length
  
  console.log(`[STL Monitor] News Summary:`)
  console.log(`  - Total fetched: ${allNews.length}`)
  console.log(`  - Within 48h: ${timeFiltered.length}`)
  console.log(`  - Geocoded: ${geocoded} (High: ${highConfidence}, Medium: ${mediumConfidence})`)
  console.log(`  - Not geocoded (rejected): ${notGeocoded}`)
  console.log(`  - Geographical fence: All geocoded locations validated within STL bounds`)
  
  return timeFiltered.slice(0, 100)
}

// Convert news items to incidents for map display
// STRICT FILTERING: Only include items with valid locations and sufficient confidence
export function newsToIncidents(news: NewsItem[]): Incident[] {
  return news
    .filter(item => {
      // Must have a location
      if (!item.location) return false
      
      // Must have at least medium confidence (reject low confidence to prevent vague placements)
      if (!item.geocodingConfidence || item.geocodingConfidence === "low") {
        console.warn(`[News Filter] Rejecting news item "${item.title.substring(0, 50)}..." - confidence too low`)
        return false
      }
      
      // CRITICAL: Validate location is within STL metro bounds
      if (!isWithinSTLMetro(item.location)) {
        console.warn(`[News Filter] Rejecting news item "${item.title.substring(0, 50)}..." - location outside STL bounds (${item.location.lat}, ${item.location.lng})`)
        return false
      }
      
      return true
    })
    .map(item => ({
      id: `news-${item.id}`,
      title: item.title,
      description: item.snippet,
      category: "news" as IncidentCategory,
      subtype: item.outlet,
      severity: 30, // News items are low severity
      confidence: item.geocodingConfidence!, // Safe to assert - we filtered out undefined
      status: "active" as const,
      location: item.location!, // Safe to assert - we filtered out undefined
      source: "Local News" as const,
      sourceUrl: item.url,
      createdAt: item.publishedAt,
      updatedAt: new Date(),
    }))
}

// ============================================================================
// TRAFFIC DATA - MoDOT & IDOT (Placeholder - Returns empty for now)
// ============================================================================

export async function fetchMoDOTIncidents(): Promise<Incident[]> {
  // MoDOT Gateway Guide API - requires implementation
  // Returns empty array until we add real MoDOT data source
  return []
}

export async function fetchMoDOTCameras(): Promise<Camera[]> {
  // MoDOT camera data - requires implementation
  return []
}

export async function fetchIDOTIncidents(): Promise<Incident[]> {
  // IDOT Getting Around Illinois API - strictly East St. Louis only
  // Returns empty array until we add real IDOT data source
  return []
}

// ============================================================================
// WEATHER DATA - NWS (Already implemented - keeping)
// ============================================================================

export async function fetchNWSAlerts(): Promise<WeatherAlert[]> {
  try {
    // NWS API is public and free: https://api.weather.gov
    const response = await fetch(
      "https://api.weather.gov/alerts/active?area=MO,IL&status=actual",
      {
        headers: {
          "User-Agent": "STLMonitor/1.0 (amer.lol)",
          "Accept": "application/geo+json"
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`NWS API error: ${response.status}`)
    }
    
    const data = await response.json()
    const alerts: WeatherAlert[] = []
    
    for (const feature of data.features || []) {
      const props = feature.properties
      
      // Filter to STL area by checking if any affected zones include STL
      const affectedZones = props.affectedZones || []
      const isSTLArea = affectedZones.some((zone: string) => 
        zone.includes("MOZ") || zone.includes("ILZ")
      ) || props.areaDesc?.toLowerCase().includes("st. louis")
      
      if (!isSTLArea) continue
      
      alerts.push({
        id: props.id,
        event: props.event,
        headline: props.headline || props.event,
        description: props.description || "",
        severity: props.severity as WeatherAlert["severity"],
        urgency: props.urgency as WeatherAlert["urgency"],
        polygon: feature.geometry?.type === "Polygon" ? feature.geometry : undefined,
        effective: new Date(props.effective),
        expires: new Date(props.expires),
        source: "NWS"
      })
    }
    
    return alerts
  } catch (error) {
    console.error("Failed to fetch NWS alerts:", error)
    return []
  }
}

export function weatherAlertsToIncidents(alerts: WeatherAlert[]): Incident[] {
  return alerts.map(alert => ({
    id: `weather-${alert.id}`,
    title: alert.headline,
    description: alert.description,
    category: "weather" as IncidentCategory,
    subtype: alert.event,
    severity: severityFromWeatherAlert(alert.severity),
    confidence: "high" as const,
    status: "active" as const,
    location: STL_BOUNDS.center, // Center for polygon alerts
    polygon: alert.polygon,
    source: "NWS" as const,
    createdAt: alert.effective,
    updatedAt: new Date(),
    expiresAt: alert.expires,
  }))
}

function severityFromWeatherAlert(severity: string): number {
  switch (severity) {
    case "Extreme": return 100
    case "Severe": return 80
    case "Moderate": return 50
    case "Minor": return 30
    default: return 20
  }
}

// ============================================================================
// TRANSIT DATA - Metro Transit (Placeholder)
// ============================================================================

export async function fetchTransitAlerts(): Promise<TransitAlert[]> {
  // Metro Transit GTFS-RT feeds - requires implementation
  return []
}

export function transitAlertsToIncidents(alerts: TransitAlert[]): Incident[] {
  return alerts.map(alert => ({
    id: `transit-${alert.id}`,
    title: alert.headerText,
    description: alert.descriptionText,
    category: "transit" as IncidentCategory,
    subtype: alert.effect,
    severity: 50,
    confidence: "high" as const,
    status: "active" as const,
    location: STL_BOUNDS.center,
    source: "Metro Transit" as const,
    createdAt: alert.activePeriods[0]?.start || new Date(),
    updatedAt: new Date(),
  }))
}

// ============================================================================
// HISTORICAL DATA (Placeholder - Analytics only)
// ============================================================================

export async function fetchHistoricalCrime(
  startDate: Date, 
  endDate: Date
): Promise<CrimeRecord[]> {
  // SLMPD crime data - requires implementation
  return []
}

export async function fetchHistoricalAccidents(
  startDate: Date,
  endDate: Date
): Promise<AccidentRecord[]> {
  // STL County accident data - requires implementation
  return []
}

// ============================================================================
// CAMERA HELPERS
// ============================================================================

export function findNearbyCameras(
  incident: Incident,
  cameras: Camera[],
  radiusMiles: number = 0.5,
  maxResults: number = 3
): Camera[] {
  const results = cameras
    .map(camera => ({
      camera,
      distance: calculateDistance(incident.location, camera.location)
    }))
    .filter(({ distance }) => distance <= radiusMiles)
    .sort((a, b) => {
      // Sort by: provider match, roadway match, then distance
      const aProviderMatch = matchesProvider(incident, a.camera) ? -1 : 0
      const bProviderMatch = matchesProvider(incident, b.camera) ? -1 : 0
      if (aProviderMatch !== bProviderMatch) return aProviderMatch - bProviderMatch
      return a.distance - b.distance
    })
    .slice(0, maxResults)
    .map(({ camera }) => camera)
  
  return results
}

function matchesProvider(incident: Incident, camera: Camera): boolean {
  if (incident.source === "MoDOT" && camera.provider === "MoDOT") return true
  if (incident.source === "IDOT (East St. Louis Only)" && camera.provider === "IDOT") return true
  return false
}

// ============================================================================
// AGGREGATION HELPERS (For Analytics)
// ============================================================================

export function aggregateByHour(records: Array<{ date: Date }>): number[] {
  const hourCounts = new Array(24).fill(0)
  records.forEach(record => {
    const hour = record.date.getHours()
    hourCounts[hour]++
  })
  return hourCounts
}

export function aggregateByDayOfWeek(records: Array<{ date: Date }>): number[] {
  const dayCounts = new Array(7).fill(0)
  records.forEach(record => {
    const day = record.date.getDay()
    dayCounts[day]++
  })
  return dayCounts
}

export function aggregateByNeighborhood(records: CrimeRecord[]): Record<string, number> {
  const counts: Record<string, number> = {}
  records.forEach(record => {
    counts[record.neighborhood] = (counts[record.neighborhood] || 0) + 1
  })
  return counts
}
