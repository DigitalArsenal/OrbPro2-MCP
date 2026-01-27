/**
 * Command Parser - Translates natural language and LLM outputs to CesiumJS commands
 * Includes fallback parsing for when the LLM doesn't produce clean JSON
 */

import type { CesiumCommand, CartographicPosition } from '../cesium/types';
import type { ToolCall } from './web-llm-engine';

// Known location database for natural language processing
// Exported for use by MCP server and other components
export const KNOWN_LOCATIONS: Record<string, CartographicPosition> = {
  // ============================================
  // MAJOR US CITIES (with nicknames and aliases)
  // ============================================
  // New York
  'new york': { longitude: -74.006, latitude: 40.7128 },
  'new york city': { longitude: -74.006, latitude: 40.7128 },
  'nyc': { longitude: -74.006, latitude: 40.7128 },
  'the big apple': { longitude: -74.006, latitude: 40.7128 },
  'big apple': { longitude: -74.006, latitude: 40.7128 },
  'gotham': { longitude: -74.006, latitude: 40.7128 },
  'manhattan': { longitude: -73.9712, latitude: 40.7831 },
  'brooklyn': { longitude: -73.9442, latitude: 40.6782 },
  'queens': { longitude: -73.7949, latitude: 40.7282 },
  'bronx': { longitude: -73.8648, latitude: 40.8448 },
  'the bronx': { longitude: -73.8648, latitude: 40.8448 },
  'staten island': { longitude: -74.1502, latitude: 40.5795 },
  // Los Angeles
  'los angeles': { longitude: -118.2437, latitude: 34.0522 },
  'la': { longitude: -118.2437, latitude: 34.0522 },
  'l.a.': { longitude: -118.2437, latitude: 34.0522 },
  'city of angels': { longitude: -118.2437, latitude: 34.0522 },
  'la la land': { longitude: -118.2437, latitude: 34.0522 },
  'hollywood': { longitude: -118.3287, latitude: 34.0928 },
  'beverly hills': { longitude: -118.4000, latitude: 34.0696 },
  'santa monica': { longitude: -118.4912, latitude: 34.0195 },
  // San Francisco
  'san francisco': { longitude: -122.4194, latitude: 37.7749 },
  'sf': { longitude: -122.4194, latitude: 37.7749 },
  's.f.': { longitude: -122.4194, latitude: 37.7749 },
  'frisco': { longitude: -122.4194, latitude: 37.7749 },
  'the city by the bay': { longitude: -122.4194, latitude: 37.7749 },
  'san fran': { longitude: -122.4194, latitude: 37.7749 },
  'silicon valley': { longitude: -121.8863, latitude: 37.3861 },
  'palo alto': { longitude: -122.1430, latitude: 37.4419 },
  'cupertino': { longitude: -122.0322, latitude: 37.3230 },
  'mountain view': { longitude: -122.0838, latitude: 37.3861 },
  // Chicago
  'chicago': { longitude: -87.6298, latitude: 41.8781 },
  'chi-town': { longitude: -87.6298, latitude: 41.8781 },
  'chitown': { longitude: -87.6298, latitude: 41.8781 },
  'the windy city': { longitude: -87.6298, latitude: 41.8781 },
  'windy city': { longitude: -87.6298, latitude: 41.8781 },
  'second city': { longitude: -87.6298, latitude: 41.8781 },
  // Houston
  'houston': { longitude: -95.3698, latitude: 29.7604 },
  'h-town': { longitude: -95.3698, latitude: 29.7604 },
  'space city': { longitude: -95.3698, latitude: 29.7604 },
  // Miami
  'miami': { longitude: -80.1918, latitude: 25.7617 },
  'magic city': { longitude: -80.1918, latitude: 25.7617 },
  'the 305': { longitude: -80.1918, latitude: 25.7617 },
  'miami beach': { longitude: -80.1300, latitude: 25.7907 },
  'south beach': { longitude: -80.1341, latitude: 25.7825 },
  // Seattle
  'seattle': { longitude: -122.3321, latitude: 47.6062 },
  'emerald city': { longitude: -122.3321, latitude: 47.6062 },
  'the emerald city': { longitude: -122.3321, latitude: 47.6062 },
  'rain city': { longitude: -122.3321, latitude: 47.6062 },
  'jet city': { longitude: -122.3321, latitude: 47.6062 },
  // Boston
  'boston': { longitude: -71.0589, latitude: 42.3601 },
  'beantown': { longitude: -71.0589, latitude: 42.3601 },
  'bean town': { longitude: -71.0589, latitude: 42.3601 },
  'the hub': { longitude: -71.0589, latitude: 42.3601 },
  'titletown': { longitude: -71.0589, latitude: 42.3601 },
  'cambridge': { longitude: -71.1097, latitude: 42.3736 },
  // Washington DC
  'washington': { longitude: -77.0369, latitude: 38.9072 },
  'washington dc': { longitude: -77.0369, latitude: 38.9072 },
  'washington d.c.': { longitude: -77.0369, latitude: 38.9072 },
  'dc': { longitude: -77.0369, latitude: 38.9072 },
  'd.c.': { longitude: -77.0369, latitude: 38.9072 },
  'the district': { longitude: -77.0369, latitude: 38.9072 },
  'the capital': { longitude: -77.0369, latitude: 38.9072 },
  'dmv': { longitude: -77.0369, latitude: 38.9072 },
  // Las Vegas
  'las vegas': { longitude: -115.1398, latitude: 36.1699 },
  'vegas': { longitude: -115.1398, latitude: 36.1699 },
  'sin city': { longitude: -115.1398, latitude: 36.1699 },
  'the strip': { longitude: -115.1723, latitude: 36.1147 },
  // Denver
  'denver': { longitude: -104.9903, latitude: 39.7392 },
  'mile high city': { longitude: -104.9903, latitude: 39.7392 },
  'the mile high city': { longitude: -104.9903, latitude: 39.7392 },
  // Phoenix
  'phoenix': { longitude: -112.0740, latitude: 33.4484 },
  'phx': { longitude: -112.0740, latitude: 33.4484 },
  'valley of the sun': { longitude: -112.0740, latitude: 33.4484 },
  'scottsdale': { longitude: -111.9261, latitude: 33.4942 },
  // Philadelphia
  'philadelphia': { longitude: -75.1652, latitude: 39.9526 },
  'philly': { longitude: -75.1652, latitude: 39.9526 },
  'the city of brotherly love': { longitude: -75.1652, latitude: 39.9526 },
  'brotherly love': { longitude: -75.1652, latitude: 39.9526 },
  // San Diego
  'san diego': { longitude: -117.1611, latitude: 32.7157 },
  'sd': { longitude: -117.1611, latitude: 32.7157 },
  "america's finest city": { longitude: -117.1611, latitude: 32.7157 },
  // Dallas
  'dallas': { longitude: -96.7970, latitude: 32.7767 },
  'big d': { longitude: -96.7970, latitude: 32.7767 },
  'dfw': { longitude: -97.0380, latitude: 32.8998 },
  'fort worth': { longitude: -97.3308, latitude: 32.7555 },
  // Atlanta
  'atlanta': { longitude: -84.3880, latitude: 33.7490 },
  'atl': { longitude: -84.3880, latitude: 33.7490 },
  'hotlanta': { longitude: -84.3880, latitude: 33.7490 },
  'the a': { longitude: -84.3880, latitude: 33.7490 },
  // Other US Cities
  'orlando': { longitude: -81.3792, latitude: 28.5383 },
  'honolulu': { longitude: -157.8583, latitude: 21.3069 },
  'anchorage': { longitude: -149.9003, latitude: 61.2181 },
  'portland': { longitude: -122.6750, latitude: 45.5152 },
  'pdx': { longitude: -122.6750, latitude: 45.5152 },
  'stumptown': { longitude: -122.6750, latitude: 45.5152 },
  'austin': { longitude: -97.7431, latitude: 30.2672 },
  'keep austin weird': { longitude: -97.7431, latitude: 30.2672 },
  'nashville': { longitude: -86.7816, latitude: 36.1627 },
  'music city': { longitude: -86.7816, latitude: 36.1627 },
  'new orleans': { longitude: -90.0715, latitude: 29.9511 },
  'nola': { longitude: -90.0715, latitude: 29.9511 },
  'the big easy': { longitude: -90.0715, latitude: 29.9511 },
  'detroit': { longitude: -83.0458, latitude: 42.3314 },
  'motor city': { longitude: -83.0458, latitude: 42.3314 },
  'motown': { longitude: -83.0458, latitude: 42.3314 },
  'minneapolis': { longitude: -93.2650, latitude: 44.9778 },
  'twin cities': { longitude: -93.2650, latitude: 44.9778 },
  'st paul': { longitude: -93.0900, latitude: 44.9537 },
  'saint paul': { longitude: -93.0900, latitude: 44.9537 },
  'baltimore': { longitude: -76.6122, latitude: 39.2904 },
  'charm city': { longitude: -76.6122, latitude: 39.2904 },
  'bmore': { longitude: -76.6122, latitude: 39.2904 },
  'pittsburgh': { longitude: -79.9959, latitude: 40.4406 },
  'steel city': { longitude: -79.9959, latitude: 40.4406 },
  'the burgh': { longitude: -79.9959, latitude: 40.4406 },
  'cleveland': { longitude: -81.6944, latitude: 41.4993 },
  'the land': { longitude: -81.6944, latitude: 41.4993 },
  'salt lake city': { longitude: -111.8910, latitude: 40.7608 },
  'slc': { longitude: -111.8910, latitude: 40.7608 },
  'san antonio': { longitude: -98.4936, latitude: 29.4241 },
  'the alamo': { longitude: -98.4861, latitude: 29.4260 },
  'indianapolis': { longitude: -86.1581, latitude: 39.7684 },
  'indy': { longitude: -86.1581, latitude: 39.7684 },
  'kansas city': { longitude: -94.5786, latitude: 39.0997 },
  'kc': { longitude: -94.5786, latitude: 39.0997 },
  'memphis': { longitude: -90.0490, latitude: 35.1495 },
  'buffalo': { longitude: -78.8784, latitude: 42.8864 },
  'tampa': { longitude: -82.4572, latitude: 27.9506 },
  'tampa bay': { longitude: -82.4572, latitude: 27.9506 },
  'raleigh': { longitude: -78.6382, latitude: 35.7796 },
  'charlotte': { longitude: -80.8431, latitude: 35.2271 },
  'the queen city': { longitude: -80.8431, latitude: 35.2271 },
  'jacksonville': { longitude: -81.6557, latitude: 30.3322 },
  'jax': { longitude: -81.6557, latitude: 30.3322 },

  // ============================================
  // SCIENTIFIC & RESEARCH FACILITIES
  // ============================================
  'cern': { longitude: 6.0554, latitude: 46.2330 },
  'large hadron collider': { longitude: 6.0554, latitude: 46.2330 },
  'lhc': { longitude: 6.0554, latitude: 46.2330 },
  'fermilab': { longitude: -88.2575, latitude: 41.8319 },
  'fermi national laboratory': { longitude: -88.2575, latitude: 41.8319 },
  'nasa': { longitude: -95.0930, latitude: 29.5519 },
  'johnson space center': { longitude: -95.0930, latitude: 29.5519 },
  'jsc': { longitude: -95.0930, latitude: 29.5519 },
  'kennedy space center': { longitude: -80.6040, latitude: 28.5728 },
  'ksc': { longitude: -80.6040, latitude: 28.5728 },
  'cape canaveral': { longitude: -80.6077, latitude: 28.3922 },
  'jpl': { longitude: -118.1729, latitude: 34.2013 },
  'jet propulsion laboratory': { longitude: -118.1729, latitude: 34.2013 },
  'goddard': { longitude: -76.8527, latitude: 38.9912 },
  'goddard space flight center': { longitude: -76.8527, latitude: 38.9912 },
  'mit': { longitude: -71.0921, latitude: 42.3601 },
  'massachusetts institute of technology': { longitude: -71.0921, latitude: 42.3601 },
  'stanford': { longitude: -122.1697, latitude: 37.4275 },
  'stanford university': { longitude: -122.1697, latitude: 37.4275 },
  'harvard': { longitude: -71.1167, latitude: 42.3770 },
  'harvard university': { longitude: -71.1167, latitude: 42.3770 },
  'caltech': { longitude: -118.1253, latitude: 34.1377 },
  'los alamos': { longitude: -106.3031, latitude: 35.8800 },
  'los alamos national laboratory': { longitude: -106.3031, latitude: 35.8800 },
  'lanl': { longitude: -106.3031, latitude: 35.8800 },
  'oak ridge': { longitude: -84.2696, latitude: 36.0104 },
  'oak ridge national laboratory': { longitude: -84.2696, latitude: 36.0104 },
  'sandia': { longitude: -106.5678, latitude: 35.0439 },
  'sandia national laboratories': { longitude: -106.5678, latitude: 35.0439 },
  'brookhaven': { longitude: -72.8764, latitude: 40.8703 },
  'brookhaven national laboratory': { longitude: -72.8764, latitude: 40.8703 },
  'area 51': { longitude: -115.8111, latitude: 37.2350 },
  'groom lake': { longitude: -115.8111, latitude: 37.2350 },
  'pentagon': { longitude: -77.0558, latitude: 38.8719 },
  'the pentagon': { longitude: -77.0558, latitude: 38.8719 },

  // ============================================
  // WORLD CAPITALS
  // ============================================
  'london': { longitude: -0.1276, latitude: 51.5074 },
  'paris': { longitude: 2.3522, latitude: 48.8566 },
  'tokyo': { longitude: 139.6917, latitude: 35.6895 },
  'beijing': { longitude: 116.4074, latitude: 39.9042 },
  'berlin': { longitude: 13.4050, latitude: 52.5200 },
  'rome': { longitude: 12.4964, latitude: 41.9028 },
  'madrid': { longitude: -3.7038, latitude: 40.4168 },
  'moscow': { longitude: 37.6173, latitude: 55.7558 },
  'cairo': { longitude: 31.2357, latitude: 30.0444 },
  'delhi': { longitude: 77.1025, latitude: 28.7041 },
  'new delhi': { longitude: 77.2090, latitude: 28.6139 },
  'ottawa': { longitude: -75.6972, latitude: 45.4215 },
  'canberra': { longitude: 149.1300, latitude: -35.2809 },
  'brasilia': { longitude: -47.8825, latitude: -15.7942 },
  'buenos aires': { longitude: -58.3816, latitude: -34.6037 },
  'mexico city': { longitude: -99.1332, latitude: 19.4326 },
  'stockholm': { longitude: 18.0686, latitude: 59.3293 },
  'oslo': { longitude: 10.7522, latitude: 59.9139 },
  'copenhagen': { longitude: 12.5683, latitude: 55.6761 },
  'helsinki': { longitude: 24.9384, latitude: 60.1699 },
  'warsaw': { longitude: 21.0122, latitude: 52.2297 },
  'prague': { longitude: 14.4378, latitude: 50.0755 },
  'budapest': { longitude: 19.0402, latitude: 47.4979 },
  'athens': { longitude: 23.7275, latitude: 37.9838 },
  'lisbon': { longitude: -9.1393, latitude: 38.7223 },
  'dublin': { longitude: -6.2603, latitude: 53.3498 },
  'amsterdam': { longitude: 4.9041, latitude: 52.3676 },
  'brussels': { longitude: 4.3517, latitude: 50.8503 },
  'vienna': { longitude: 16.3738, latitude: 48.2082 },
  'bern': { longitude: 7.4474, latitude: 46.9480 },
  'kyiv': { longitude: 30.5234, latitude: 50.4501 },
  'kiev': { longitude: 30.5234, latitude: 50.4501 },
  'ankara': { longitude: 32.8597, latitude: 39.9334 },
  'tehran': { longitude: 51.3890, latitude: 35.6892 },
  'riyadh': { longitude: 46.6753, latitude: 24.7136 },
  'abu dhabi': { longitude: 54.3773, latitude: 24.4539 },
  'doha': { longitude: 51.5310, latitude: 25.2854 },
  'kuwait city': { longitude: 47.9774, latitude: 29.3759 },
  'muscat': { longitude: 58.4059, latitude: 23.5880 },
  'amman': { longitude: 35.9106, latitude: 31.9454 },
  'jerusalem': { longitude: 35.2137, latitude: 31.7683 },
  'damascus': { longitude: 36.2765, latitude: 33.5138 },
  'baghdad': { longitude: 44.3661, latitude: 33.3152 },
  'kabul': { longitude: 69.1723, latitude: 34.5553 },
  'islamabad': { longitude: 73.0479, latitude: 33.6844 },
  'kathmandu': { longitude: 85.3240, latitude: 27.7172 },
  'dhaka': { longitude: 90.4125, latitude: 23.8103 },
  'colombo': { longitude: 79.8612, latitude: 6.9271 },
  'bangkok': { longitude: 100.5018, latitude: 13.7563 },
  'hanoi': { longitude: 105.8342, latitude: 21.0278 },
  'phnom penh': { longitude: 104.9282, latitude: 11.5564 },
  'vientiane': { longitude: 102.6331, latitude: 17.9757 },
  'naypyidaw': { longitude: 96.1297, latitude: 19.7633 },
  'seoul': { longitude: 126.9780, latitude: 37.5665 },
  'pyongyang': { longitude: 125.7625, latitude: 39.0392 },
  'taipei': { longitude: 121.5654, latitude: 25.0330 },
  'manila': { longitude: 120.9842, latitude: 14.5995 },
  'jakarta': { longitude: 106.8456, latitude: -6.2088 },
  'kuala lumpur': { longitude: 101.6869, latitude: 3.1390 },
  'singapore': { longitude: 103.8198, latitude: 1.3521 },
  'wellington': { longitude: 174.7762, latitude: -41.2866 },
  'suva': { longitude: 178.4419, latitude: -18.1416 },
  'addis ababa': { longitude: 38.7578, latitude: 9.0054 },
  'nairobi': { longitude: 36.8219, latitude: -1.2921 },
  'pretoria': { longitude: 28.1881, latitude: -25.7479 },
  'cape town': { longitude: 18.4241, latitude: -33.9249 },
  'rabat': { longitude: -6.8498, latitude: 34.0209 },
  'algiers': { longitude: 3.0588, latitude: 36.7538 },
  'tunis': { longitude: 10.1658, latitude: 36.8065 },
  'tripoli': { longitude: 13.1913, latitude: 32.8872 },
  'accra': { longitude: -0.1870, latitude: 5.6037 },
  'lagos': { longitude: 3.3792, latitude: 6.5244 },
  'abuja': { longitude: 7.4951, latitude: 9.0579 },
  'kinshasa': { longitude: 15.2663, latitude: -4.4419 },
  'luanda': { longitude: 13.2343, latitude: -8.8390 },
  'harare': { longitude: 31.0492, latitude: -17.8292 },
  'lusaka': { longitude: 28.2871, latitude: -15.3875 },
  'lima': { longitude: -77.0428, latitude: -12.0464 },
  'bogota': { longitude: -74.0721, latitude: 4.7110 },
  'santiago': { longitude: -70.6693, latitude: -33.4489 },
  'montevideo': { longitude: -56.1645, latitude: -34.9011 },
  'caracas': { longitude: -66.9036, latitude: 10.4806 },
  'quito': { longitude: -78.4678, latitude: -0.1807 },
  'la paz': { longitude: -68.1193, latitude: -16.4897 },
  'asuncion': { longitude: -57.5759, latitude: -25.2637 },
  'havana': { longitude: -82.3666, latitude: 23.1136 },
  'panama city': { longitude: -79.5197, latitude: 8.9824 },
  'san jose': { longitude: -84.0907, latitude: 9.9281 },
  'guatemala city': { longitude: -90.5069, latitude: 14.6349 },
  'reykjavik': { longitude: -21.8277, latitude: 64.1466 },

  // ============================================
  // MAJOR INTERNATIONAL CITIES
  // ============================================
  'shanghai': { longitude: 121.4737, latitude: 31.2304 },
  'hong kong': { longitude: 114.1694, latitude: 22.3193 },
  'sydney': { longitude: 151.2093, latitude: -33.8688 },
  'melbourne': { longitude: 144.9631, latitude: -37.8136 },
  'munich': { longitude: 11.5820, latitude: 48.1351 },
  'milan': { longitude: 9.1900, latitude: 45.4642 },
  'barcelona': { longitude: 2.1734, latitude: 41.3851 },
  'dubai': { longitude: 55.2708, latitude: 25.2048 },
  'mumbai': { longitude: 72.8777, latitude: 19.0760 },
  'bangalore': { longitude: 77.5946, latitude: 12.9716 },
  'toronto': { longitude: -79.3832, latitude: 43.6532 },
  'vancouver': { longitude: -123.1207, latitude: 49.2827 },
  'sao paulo': { longitude: -46.6333, latitude: -23.5505 },
  'rio de janeiro': { longitude: -43.1729, latitude: -22.9068 },
  'johannesburg': { longitude: 28.0473, latitude: -26.2041 },
  'istanbul': { longitude: 28.9784, latitude: 41.0082 },
  'zurich': { longitude: 8.5417, latitude: 47.3769 },
  'geneva': { longitude: 6.1432, latitude: 46.2044 },
  'edinburgh': { longitude: -3.1883, latitude: 55.9533 },
  'ho chi minh': { longitude: 106.6297, latitude: 10.8231 },
  'saigon': { longitude: 106.6297, latitude: 10.8231 },
  'osaka': { longitude: 135.5022, latitude: 34.6937 },
  'kyoto': { longitude: 135.7681, latitude: 35.0116 },
  'shenzhen': { longitude: 114.0579, latitude: 22.5431 },
  'guangzhou': { longitude: 113.2644, latitude: 23.1291 },
  'chennai': { longitude: 80.2707, latitude: 13.0827 },
  'kolkata': { longitude: 88.3639, latitude: 22.5726 },
  'hyderabad': { longitude: 78.4867, latitude: 17.3850 },
  'perth': { longitude: 115.8605, latitude: -31.9505 },
  'brisbane': { longitude: 153.0251, latitude: -27.4698 },
  'auckland': { longitude: 174.7633, latitude: -36.8485 },
  'montreal': { longitude: -73.5673, latitude: 45.5017 },
  'calgary': { longitude: -114.0719, latitude: 51.0447 },

  // ============================================
  // MAJOR AIRPORTS (with codes)
  // ============================================
  'lax': { longitude: -118.4085, latitude: 33.9416 },
  'los angeles airport': { longitude: -118.4085, latitude: 33.9416 },
  'jfk': { longitude: -73.7781, latitude: 40.6413 },
  'jfk airport': { longitude: -73.7781, latitude: 40.6413 },
  'lhr': { longitude: -0.4543, latitude: 51.4700 },
  'heathrow': { longitude: -0.4543, latitude: 51.4700 },
  'heathrow airport': { longitude: -0.4543, latitude: 51.4700 },
  'cdg': { longitude: 2.5479, latitude: 49.0097 },
  'charles de gaulle': { longitude: 2.5479, latitude: 49.0097 },
  'paris airport': { longitude: 2.5479, latitude: 49.0097 },
  'dxb': { longitude: 55.3644, latitude: 25.2528 },
  'dubai airport': { longitude: 55.3644, latitude: 25.2528 },
  'hnd': { longitude: 139.7798, latitude: 35.5494 },
  'haneda': { longitude: 139.7798, latitude: 35.5494 },
  'nrt': { longitude: 140.3929, latitude: 35.7720 },
  'narita': { longitude: 140.3929, latitude: 35.7720 },
  'sin': { longitude: 103.9915, latitude: 1.3644 },
  'changi': { longitude: 103.9915, latitude: 1.3644 },
  'changi airport': { longitude: 103.9915, latitude: 1.3644 },
  'hkg': { longitude: 113.9185, latitude: 22.3080 },
  'hong kong airport': { longitude: 113.9185, latitude: 22.3080 },
  'fra': { longitude: 8.5622, latitude: 50.0379 },
  'frankfurt airport': { longitude: 8.5622, latitude: 50.0379 },
  'ams': { longitude: 4.7683, latitude: 52.3105 },
  'schiphol': { longitude: 4.7683, latitude: 52.3105 },
  'amsterdam airport': { longitude: 4.7683, latitude: 52.3105 },
  'icn': { longitude: 126.4407, latitude: 37.4602 },
  'incheon': { longitude: 126.4407, latitude: 37.4602 },
  'pek': { longitude: 116.5975, latitude: 40.0799 },
  'beijing airport': { longitude: 116.5975, latitude: 40.0799 },
  'pvg': { longitude: 121.8083, latitude: 31.1443 },
  'pudong': { longitude: 121.8083, latitude: 31.1443 },
  'shanghai airport': { longitude: 121.8083, latitude: 31.1443 },
  'syd': { longitude: 151.1772, latitude: -33.9399 },
  'sydney airport': { longitude: 151.1772, latitude: -33.9399 },
  'ord': { longitude: -87.9073, latitude: 41.9742 },
  'ohare': { longitude: -87.9073, latitude: 41.9742 },
  'chicago airport': { longitude: -87.9073, latitude: 41.9742 },
  'hartsfield': { longitude: -84.4281, latitude: 33.6407 },
  'hartsfield jackson': { longitude: -84.4281, latitude: 33.6407 },
  'atlanta airport': { longitude: -84.4281, latitude: 33.6407 },
  'dfw airport': { longitude: -97.0380, latitude: 32.8998 },
  'dallas airport': { longitude: -97.0380, latitude: 32.8998 },
  'dallas fort worth airport': { longitude: -97.0380, latitude: 32.8998 },
  'sfo': { longitude: -122.3789, latitude: 37.6213 },
  'san francisco airport': { longitude: -122.3789, latitude: 37.6213 },
  'mia': { longitude: -80.2870, latitude: 25.7959 },
  'miami airport': { longitude: -80.2870, latitude: 25.7959 },
  'iah': { longitude: -95.3414, latitude: 29.9902 },
  'houston airport': { longitude: -95.3414, latitude: 29.9902 },
  'bkk': { longitude: 100.7501, latitude: 13.6900 },
  'suvarnabhumi': { longitude: 100.7501, latitude: 13.6900 },
  'bangkok airport': { longitude: 100.7501, latitude: 13.6900 },
  'ist': { longitude: 28.8141, latitude: 41.2608 },
  'istanbul airport': { longitude: 28.8141, latitude: 41.2608 },
  'lgw': { longitude: -0.1821, latitude: 51.1537 },
  'gatwick': { longitude: -0.1821, latitude: 51.1537 },
  'man': { longitude: -2.2750, latitude: 53.3588 },
  'manchester airport': { longitude: -2.2750, latitude: 53.3588 },
  'muc': { longitude: 11.7861, latitude: 48.3537 },
  'munich airport': { longitude: 11.7861, latitude: 48.3537 },
  'fcO': { longitude: 12.2389, latitude: 41.8003 },
  'fiumicino': { longitude: 12.2389, latitude: 41.8003 },
  'rome airport': { longitude: 12.2389, latitude: 41.8003 },
  'bcn': { longitude: 2.0785, latitude: 41.2971 },
  'barcelona airport': { longitude: 2.0785, latitude: 41.2971 },
  'mex': { longitude: -99.0721, latitude: 19.4361 },
  'mexico city airport': { longitude: -99.0721, latitude: 19.4361 },
  'gru': { longitude: -46.4730, latitude: -23.4356 },
  'guarulhos': { longitude: -46.4730, latitude: -23.4356 },
  'sao paulo airport': { longitude: -46.4730, latitude: -23.4356 },
  'del': { longitude: 77.1025, latitude: 28.5562 },
  'indira gandhi airport': { longitude: 77.1025, latitude: 28.5562 },
  'delhi airport': { longitude: 77.1025, latitude: 28.5562 },
  'bom': { longitude: 72.8679, latitude: 19.0896 },
  'mumbai airport': { longitude: 72.8679, latitude: 19.0896 },
  'yyz': { longitude: -79.6248, latitude: 43.6777 },
  'pearson': { longitude: -79.6248, latitude: 43.6777 },
  'toronto airport': { longitude: -79.6248, latitude: 43.6777 },
  'yvr': { longitude: -123.1815, latitude: 49.1967 },
  'vancouver airport': { longitude: -123.1815, latitude: 49.1967 },
  'cpt': { longitude: 18.6017, latitude: -33.9715 },
  'cape town airport': { longitude: 18.6017, latitude: -33.9715 },
  'jnb': { longitude: 28.2460, latitude: -26.1392 },
  'johannesburg airport': { longitude: 28.2460, latitude: -26.1392 },

  // ============================================
  // NATURAL WONDERS
  // ============================================
  'victoria falls': { longitude: 25.8572, latitude: -17.9243 },
  'great barrier reef': { longitude: 145.7710, latitude: -16.2864 },
  'grand canyon': { longitude: -112.1401, latitude: 36.0544 },
  'niagara falls': { longitude: -79.0377, latitude: 43.0962 },
  'mount everest': { longitude: 86.9250, latitude: 27.9881 },
  'mount fuji': { longitude: 138.7274, latitude: 35.3606 },
  'yellowstone': { longitude: -110.5885, latitude: 44.4280 },
  'yosemite': { longitude: -119.5383, latitude: 37.8651 },
  'iguazu falls': { longitude: -54.4438, latitude: -25.6953 },
  'iguacu falls': { longitude: -54.4438, latitude: -25.6953 },
  'angel falls': { longitude: -62.5356, latitude: 5.9701 },
  'northern lights': { longitude: -21.9426, latitude: 64.9631 },
  'aurora borealis': { longitude: -21.9426, latitude: 64.9631 },
  'tromso': { longitude: 18.9553, latitude: 69.6492 },
  'fairbanks': { longitude: -147.7164, latitude: 64.8378 },
  'amazon rainforest': { longitude: -60.0217, latitude: -3.4653 },
  'amazon river': { longitude: -60.0217, latitude: -3.4653 },
  'sahara desert': { longitude: 8.1155, latitude: 23.4162 },
  'gobi desert': { longitude: 103.6517, latitude: 42.5883 },
  'serengeti': { longitude: 34.8333, latitude: -2.3333 },
  'kilimanjaro': { longitude: 37.3556, latitude: -3.0674 },
  'mount kilimanjaro': { longitude: 37.3556, latitude: -3.0674 },
  'k2': { longitude: 76.5133, latitude: 35.8808 },
  'matterhorn': { longitude: 7.6586, latitude: 45.9766 },
  'mont blanc': { longitude: 6.8652, latitude: 45.8326 },
  'denali': { longitude: -151.0074, latitude: 63.0695 },
  'mount mckinley': { longitude: -151.0074, latitude: 63.0695 },
  'dead sea': { longitude: 35.4731, latitude: 31.5018 },
  'uluru': { longitude: 131.0369, latitude: -25.3444 },
  'ayers rock': { longitude: 131.0369, latitude: 25.3444 },
  'ha long bay': { longitude: 107.0431, latitude: 20.9101 },
  'halong bay': { longitude: 107.0431, latitude: 20.9101 },
  'table mountain': { longitude: 18.4241, latitude: -33.9628 },
  'galapagos': { longitude: -90.5659, latitude: -0.8295 },
  'galapagos islands': { longitude: -90.5659, latitude: -0.8295 },
  'blue hole': { longitude: -87.5347, latitude: 17.3156 },
  'belize blue hole': { longitude: -87.5347, latitude: 17.3156 },
  'fjords': { longitude: 6.5575, latitude: 60.4720 },
  'norwegian fjords': { longitude: 6.5575, latitude: 60.4720 },
  'geirangerfjord': { longitude: 7.2058, latitude: 62.1013 },
  'pamukkale': { longitude: 29.1247, latitude: 37.9204 },
  'plitvice lakes': { longitude: 15.6102, latitude: 44.8654 },
  'antelope canyon': { longitude: -111.3743, latitude: 36.8619 },
  'bryce canyon': { longitude: -112.1871, latitude: 37.5930 },
  'zion': { longitude: -113.0263, latitude: 37.2982 },
  'zion national park': { longitude: -113.0263, latitude: 37.2982 },
  'glacier bay': { longitude: -136.8998, latitude: 58.6658 },
  'banff': { longitude: -115.5708, latitude: 51.1784 },
  'banff national park': { longitude: -115.5708, latitude: 51.1784 },

  // ============================================
  // HISTORICAL SITES
  // ============================================
  'eiffel tower': { longitude: 2.2945, latitude: 48.8584 },
  'statue of liberty': { longitude: -74.0445, latitude: 40.6892 },
  'big ben': { longitude: -0.1246, latitude: 51.5007 },
  'colosseum': { longitude: 12.4924, latitude: 41.8902 },
  'taj mahal': { longitude: 78.0421, latitude: 27.1751 },
  'great wall': { longitude: 116.5704, latitude: 40.4319 },
  'great wall of china': { longitude: 116.5704, latitude: 40.4319 },
  'pyramids': { longitude: 31.1342, latitude: 29.9792 },
  'giza pyramids': { longitude: 31.1342, latitude: 29.9792 },
  'great pyramid': { longitude: 31.1342, latitude: 29.9792 },
  'sphinx': { longitude: 31.1376, latitude: 29.9753 },
  'machu picchu': { longitude: -72.5450, latitude: -13.1631 },
  'stonehenge': { longitude: -1.8262, latitude: 51.1789 },
  'petra': { longitude: 35.4444, latitude: 30.3285 },
  'angkor wat': { longitude: 103.8670, latitude: 13.4125 },
  'acropolis': { longitude: 23.7257, latitude: 37.9715 },
  'parthenon': { longitude: 23.7264, latitude: 37.9715 },
  'pompeii': { longitude: 14.4850, latitude: 40.7462 },
  'chichen itza': { longitude: -88.5686, latitude: 20.6843 },
  'teotihuacan': { longitude: -98.8433, latitude: 19.6925 },
  'forbidden city': { longitude: 116.3972, latitude: 39.9169 },
  'tiananmen square': { longitude: 116.3912, latitude: 39.9055 },
  'terracotta army': { longitude: 109.2781, latitude: 34.3844 },
  'terracotta warriors': { longitude: 109.2781, latitude: 34.3844 },
  'hagia sophia': { longitude: 28.9800, latitude: 41.0086 },
  'blue mosque': { longitude: 28.9767, latitude: 41.0054 },
  'versailles': { longitude: 2.1204, latitude: 48.8049 },
  'palace of versailles': { longitude: 2.1204, latitude: 48.8049 },
  'notre dame': { longitude: 2.3499, latitude: 48.8530 },
  'notre dame de paris': { longitude: 2.3499, latitude: 48.8530 },
  'louvre': { longitude: 2.3376, latitude: 48.8606 },
  'vatican': { longitude: 12.4534, latitude: 41.9029 },
  'vatican city': { longitude: 12.4534, latitude: 41.9029 },
  'sistine chapel': { longitude: 12.4545, latitude: 41.9029 },
  'st peters basilica': { longitude: 12.4534, latitude: 41.9022 },
  'tower of london': { longitude: -0.0761, latitude: 51.5081 },
  'westminster abbey': { longitude: -0.1273, latitude: 51.4993 },
  'buckingham palace': { longitude: -0.1419, latitude: 51.5014 },
  'alhambra': { longitude: -3.5883, latitude: 37.1760 },
  'sagrada familia': { longitude: 2.1744, latitude: 41.4036 },
  'neuschwanstein': { longitude: 10.7498, latitude: 47.5576 },
  'neuschwanstein castle': { longitude: 10.7498, latitude: 47.5576 },
  'kremlin': { longitude: 37.6176, latitude: 55.7520 },
  'red square': { longitude: 37.6218, latitude: 55.7539 },
  'easter island': { longitude: -109.3497, latitude: -27.1127 },
  'moai': { longitude: -109.3497, latitude: -27.1127 },
  'abu simbel': { longitude: 31.6256, latitude: 22.3360 },
  'luxor temple': { longitude: 32.6392, latitude: 25.6996 },
  'valley of the kings': { longitude: 32.6015, latitude: 25.7402 },
  'karnak': { longitude: 32.6577, latitude: 25.7188 },
  'bagan': { longitude: 94.8617, latitude: 21.1717 },
  'borobudur': { longitude: 110.2038, latitude: -7.6079 },
  'meiji shrine': { longitude: 139.6993, latitude: 35.6764 },
  'sensoji': { longitude: 139.7966, latitude: 35.7148 },
  'sensoji temple': { longitude: 139.7966, latitude: 35.7148 },
  'fushimi inari': { longitude: 135.7727, latitude: 34.9671 },
  'kinkakuji': { longitude: 135.7292, latitude: 35.0394 },
  'golden pavilion': { longitude: 135.7292, latitude: 35.0394 },
  'hiroshima memorial': { longitude: 132.4536, latitude: 34.3955 },
  'hiroshima peace memorial': { longitude: 132.4536, latitude: 34.3955 },
  'potala palace': { longitude: 91.1172, latitude: 29.6575 },
  'gyeongbokgung': { longitude: 126.9770, latitude: 37.5796 },
  'gyeongbokgung palace': { longitude: 126.9770, latitude: 37.5796 },

  // ============================================
  // MODERN LANDMARKS
  // ============================================
  'burj khalifa': { longitude: 55.2744, latitude: 25.1972 },
  'burj al arab': { longitude: 55.1852, latitude: 25.1412 },
  'palm jumeirah': { longitude: 55.1386, latitude: 25.1124 },
  'sydney opera house': { longitude: 151.2153, latitude: -33.8568 },
  'christ the redeemer': { longitude: -43.2105, latitude: -22.9519 },
  'cn tower': { longitude: -79.3871, latitude: 43.6426 },
  'space needle': { longitude: -122.3493, latitude: 47.6205 },
  'golden gate bridge': { longitude: -122.4783, latitude: 37.8199 },
  'empire state building': { longitude: -73.9857, latitude: 40.7484 },
  'one world trade center': { longitude: -74.0134, latitude: 40.7127 },
  'freedom tower': { longitude: -74.0134, latitude: 40.7127 },
  'chrysler building': { longitude: -73.9755, latitude: 40.7516 },
  'times square': { longitude: -73.9855, latitude: 40.7580 },
  'central park': { longitude: -73.9654, latitude: 40.7829 },
  'brooklyn bridge': { longitude: -73.9969, latitude: 40.7061 },
  'hollywood sign': { longitude: -118.3217, latitude: 34.1341 },
  'walk of fame': { longitude: -118.3400, latitude: 34.1016 },
  'hollywood walk of fame': { longitude: -118.3400, latitude: 34.1016 },
  'marina bay sands': { longitude: 103.8610, latitude: 1.2834 },
  'petronas towers': { longitude: 101.7117, latitude: 3.1579 },
  'taipei 101': { longitude: 121.5648, latitude: 25.0339 },
  'shanghai tower': { longitude: 121.5055, latitude: 31.2335 },
  'oriental pearl tower': { longitude: 121.4950, latitude: 31.2397 },
  'tokyo tower': { longitude: 139.7454, latitude: 35.6586 },
  'tokyo skytree': { longitude: 139.8107, latitude: 35.7101 },
  'london eye': { longitude: -0.1195, latitude: 51.5033 },
  'the shard': { longitude: -0.0865, latitude: 51.5045 },
  'tower bridge': { longitude: -0.0754, latitude: 51.5055 },
  'atomium': { longitude: 4.3419, latitude: 50.8947 },
  'brandenburg gate': { longitude: 13.3777, latitude: 52.5163 },
  'reichstag': { longitude: 13.3761, latitude: 52.5186 },
  'berlin wall': { longitude: 13.4105, latitude: 52.5074 },
  'la defense': { longitude: 2.2418, latitude: 48.8920 },
  'arc de triomphe': { longitude: 2.2950, latitude: 48.8738 },
  'opera house paris': { longitude: 2.3317, latitude: 48.8720 },
  'palais garnier': { longitude: 2.3317, latitude: 48.8720 },
  'vatican museums': { longitude: 12.4559, latitude: 41.9065 },
  'trevi fountain': { longitude: 12.4833, latitude: 41.9009 },
  'spanish steps': { longitude: 12.4823, latitude: 41.9060 },
  'leaning tower of pisa': { longitude: 10.3966, latitude: 43.7230 },
  'leaning tower': { longitude: 10.3966, latitude: 43.7230 },
  'pisa': { longitude: 10.3966, latitude: 43.7230 },
  'rialto bridge': { longitude: 12.3358, latitude: 45.4381 },
  'venice': { longitude: 12.3155, latitude: 45.4408 },
  'santorini': { longitude: 25.4615, latitude: 36.3932 },
  'dubai frame': { longitude: 55.3001, latitude: 25.2350 },
  'museum of the future': { longitude: 55.2821, latitude: 25.2205 },
  'gardens by the bay': { longitude: 103.8636, latitude: 1.2816 },
  'jewel changi': { longitude: 103.9893, latitude: 1.3604 },

  // ============================================
  // UNESCO WORLD HERITAGE SITES
  // ============================================
  'galapagos marine reserve': { longitude: -90.5659, latitude: -0.8295 },
  'old havana': { longitude: -82.3494, latitude: 23.1351 },
  'historic center of mexico city': { longitude: -99.1333, latitude: 19.4326 },
  'historic center of lima': { longitude: -77.0282, latitude: -12.0453 },
  'historic center of salvador': { longitude: -38.5108, latitude: -12.9777 },
  'old town of dubrovnik': { longitude: 18.1094, latitude: 42.6507 },
  'dubrovnik': { longitude: 18.1094, latitude: 42.6507 },
  'old town of prague': { longitude: 14.4205, latitude: 50.0875 },
  'historic centre of vienna': { longitude: 16.3738, latitude: 48.2082 },
  'historic centre of salzburg': { longitude: 13.0550, latitude: 47.8095 },
  'salzburg': { longitude: 13.0550, latitude: 47.8095 },
  'historic centre of bruges': { longitude: 3.2247, latitude: 51.2093 },
  'bruges': { longitude: 3.2247, latitude: 51.2093 },
  'historic centre of florence': { longitude: 11.2558, latitude: 43.7696 },
  'florence': { longitude: 11.2558, latitude: 43.7696 },
  'historic centre of rome': { longitude: 12.4964, latitude: 41.9028 },
  'cinque terre': { longitude: 9.7100, latitude: 44.1264 },
  'amalfi coast': { longitude: 14.6027, latitude: 40.6340 },
  'amalfi': { longitude: 14.6027, latitude: 40.6340 },
  'old city of jerusalem': { longitude: 35.2326, latitude: 31.7767 },
  'medina of fez': { longitude: -4.9998, latitude: 34.0633 },
  'fez': { longitude: -4.9998, latitude: 34.0633 },
  'medina of marrakesh': { longitude: -7.9811, latitude: 31.6295 },
  'marrakesh': { longitude: -7.9811, latitude: 31.6295 },
  'robben island': { longitude: 18.3714, latitude: -33.8068 },
  'great zimbabwe': { longitude: 30.9339, latitude: -20.2723 },
  'timbuktu': { longitude: -3.0074, latitude: 16.7735 },
  'lalibela': { longitude: 39.0472, latitude: 12.0319 },
  'rock churches of lalibela': { longitude: 39.0472, latitude: 12.0319 },
  'historic cairo': { longitude: 31.2611, latitude: 30.0455 },
  'medina of tunis': { longitude: 10.1701, latitude: 36.7983 },
  'old town of lijiang': { longitude: 100.2330, latitude: 26.8721 },
  'lijiang': { longitude: 100.2330, latitude: 26.8721 },
  'jiuzhaigou': { longitude: 103.9188, latitude: 33.2600 },
  'zhangjiajie': { longitude: 110.4792, latitude: 29.1172 },
  'mount huangshan': { longitude: 118.1590, latitude: 30.1375 },
  'huangshan': { longitude: 118.1590, latitude: 30.1375 },
  'suzhou gardens': { longitude: 120.6195, latitude: 31.2989 },
  'suzhou': { longitude: 120.6195, latitude: 31.2989 },
  'hoi an': { longitude: 108.3380, latitude: 15.8801 },
  'historic town of hoi an': { longitude: 108.3380, latitude: 15.8801 },
  'ayutthaya': { longitude: 100.5877, latitude: 14.3532 },
  'sukhothai': { longitude: 99.7037, latitude: 17.0176 },
  'luang prabang': { longitude: 102.1372, latitude: 19.8856 },
  'hampi': { longitude: 76.4610, latitude: 15.3350 },
  'khajuraho': { longitude: 79.9199, latitude: 24.8318 },
  'ajanta caves': { longitude: 75.7033, latitude: 20.5519 },
  'ellora caves': { longitude: 75.1791, latitude: 20.0268 },

  // ============================================
  // SPORTS VENUES
  // ============================================
  'wembley': { longitude: -0.2795, latitude: 51.5560 },
  'wembley stadium': { longitude: -0.2795, latitude: 51.5560 },
  'camp nou': { longitude: 2.1228, latitude: 41.3809 },
  'santiago bernabeu': { longitude: -3.6883, latitude: 40.4531 },
  'old trafford': { longitude: -2.2913, latitude: 53.4631 },
  'anfield': { longitude: -2.9607, latitude: 53.4308 },
  'emirates stadium': { longitude: -0.1085, latitude: 51.5549 },
  'san siro': { longitude: 9.1239, latitude: 45.4781 },
  'giuseppe meazza': { longitude: 9.1239, latitude: 45.4781 },
  'allianz arena': { longitude: 11.6249, latitude: 48.2188 },
  'signal iduna park': { longitude: 7.4516, latitude: 51.4926 },
  'parc des princes': { longitude: 2.2530, latitude: 48.8414 },
  'stade de france': { longitude: 2.3636, latitude: 48.9244 },
  'maracana': { longitude: -43.2302, latitude: -22.9121 },
  'maracana stadium': { longitude: -43.2302, latitude: -22.9121 },
  'estadio azteca': { longitude: -99.1506, latitude: 19.3029 },
  'melbourne cricket ground': { longitude: 144.9834, latitude: -37.8200 },
  'mcg': { longitude: 144.9834, latitude: -37.8200 },
  'lords': { longitude: -0.1728, latitude: 51.5294 },
  'lords cricket ground': { longitude: -0.1728, latitude: 51.5294 },
  'wimbledon': { longitude: -0.2135, latitude: 51.4340 },
  'all england club': { longitude: -0.2135, latitude: 51.4340 },
  'roland garros': { longitude: 2.2533, latitude: 48.8472 },
  'us open tennis': { longitude: -73.8456, latitude: 40.7500 },
  'flushing meadows': { longitude: -73.8456, latitude: 40.7500 },
  'australian open': { longitude: 144.9784, latitude: -37.8216 },
  'madison square garden': { longitude: -73.9934, latitude: 40.7505 },
  'msg': { longitude: -73.9934, latitude: 40.7505 },
  'yankee stadium': { longitude: -73.9262, latitude: 40.8296 },
  'fenway park': { longitude: -71.0972, latitude: 42.3467 },
  'dodger stadium': { longitude: -118.2400, latitude: 34.0739 },
  'lambeau field': { longitude: -88.0622, latitude: 44.5013 },
  'sofi stadium': { longitude: -118.3392, latitude: 33.9534 },
  'at&t stadium': { longitude: -97.0929, latitude: 32.7473 },
  'dallas cowboys stadium': { longitude: -97.0929, latitude: 32.7473 },
  'superdome': { longitude: -90.0811, latitude: 29.9511 },
  'caesars superdome': { longitude: -90.0811, latitude: 29.9511 },
  'staples center': { longitude: -118.2673, latitude: 34.0430 },
  'crypto.com arena': { longitude: -118.2673, latitude: 34.0430 },
  'united center': { longitude: -87.6742, latitude: 41.8807 },
  'td garden': { longitude: -71.0621, latitude: 42.3662 },
  'oracle park': { longitude: -122.3893, latitude: 37.7786 },
  'petco park': { longitude: -117.1570, latitude: 32.7076 },
  'indianapolis motor speedway': { longitude: -86.2347, latitude: 39.7950 },
  'indy 500': { longitude: -86.2347, latitude: 39.7950 },
  'daytona speedway': { longitude: -81.0228, latitude: 29.1852 },
  'daytona 500': { longitude: -81.0228, latitude: 29.1852 },
  'monaco grand prix': { longitude: 7.4204, latitude: 43.7347 },
  'monaco circuit': { longitude: 7.4204, latitude: 43.7347 },
  'silverstone': { longitude: -1.0169, latitude: 52.0786 },
  'silverstone circuit': { longitude: -1.0169, latitude: 52.0786 },
  'monza': { longitude: 9.2811, latitude: 45.6205 },
  'monza circuit': { longitude: 9.2811, latitude: 45.6205 },
  'spa francorchamps': { longitude: 5.9714, latitude: 50.4372 },
  'nurburgring': { longitude: 6.9475, latitude: 50.3356 },
  'suzuka': { longitude: 136.5339, latitude: 34.8431 },
  'suzuka circuit': { longitude: 136.5339, latitude: 34.8431 },
  'pebble beach': { longitude: -121.9473, latitude: 36.5725 },
  'pebble beach golf': { longitude: -121.9473, latitude: 36.5725 },
  'st andrews': { longitude: -2.8020, latitude: 56.3434 },
  'st andrews golf': { longitude: -2.8020, latitude: 56.3434 },
  'augusta national': { longitude: -82.0207, latitude: 33.5021 },
  'the masters': { longitude: -82.0207, latitude: 33.5021 },
  'olympic stadium tokyo': { longitude: 139.7143, latitude: 35.6780 },
  'bird nest': { longitude: 116.3907, latitude: 39.9930 },
  'beijing national stadium': { longitude: 116.3907, latitude: 39.9930 },
  'olympic park london': { longitude: -0.0166, latitude: 51.5383 },
};

// Color name mappings (used for validation in future enhancements)
const _COLOR_NAMES = new Set([
  'red', 'green', 'blue', 'yellow', 'orange', 'purple',
  'pink', 'cyan', 'white', 'black', 'gray', 'grey',
  'magenta', 'lime', 'navy', 'teal', 'maroon', 'olive',
]);
void _COLOR_NAMES; // Suppress unused variable warning

export interface ParseResult {
  success: boolean;
  commands: CesiumCommand[];
  message?: string;
  naturalLanguageResponse?: string;
}

export class CommandParser {
  parseToolCall(toolCall: ToolCall): ParseResult {
    try {
      const command = this.toolCallToCommand(toolCall);
      if (command) {
        return {
          success: true,
          commands: [command],
        };
      }
      return {
        success: false,
        commands: [],
        message: `Unknown tool: ${toolCall.name}`,
      };
    } catch (error) {
      return {
        success: false,
        commands: [],
        message: error instanceof Error ? error.message : 'Failed to parse tool call',
      };
    }
  }

  parseToolCalls(toolCalls: ToolCall[]): ParseResult {
    const commands: CesiumCommand[] = [];
    const errors: string[] = [];

    for (const toolCall of toolCalls) {
      const result = this.parseToolCall(toolCall);
      if (result.success) {
        commands.push(...result.commands);
      } else if (result.message) {
        errors.push(result.message);
      }
    }

    return {
      success: commands.length > 0,
      commands,
      message: errors.length > 0 ? errors.join('; ') : undefined,
    };
  }

  parseNaturalLanguage(input: string): ParseResult {
    const normalizedInput = input.toLowerCase().trim();

    // Try to extract commands from natural language
    const commands: CesiumCommand[] = [];

    // Check for zoom + location requests first (e.g., "zoom in so I can see the statue of liberty")
    // These should fly to the location at a close altitude
    const zoomSeeMatch = normalizedInput.match(/(?:zoom|get)\s+(?:in\s+)?(?:closer\s+)?(?:so\s+(?:i\s+can\s+)?|to\s+)?(?:see|view)\s+(?:the\s+)?(?:actual\s+)?(.+)/i);
    if (zoomSeeMatch) {
      const location = this.extractLocation(zoomSeeMatch[1]!);
      if (location) {
        commands.push({
          type: 'camera.flyTo',
          destination: { ...location, height: 500 },
          duration: 2,
        });
      }
    }

    // Navigation commands - use appropriate height based on location type
    if (commands.length === 0 && this.matchesPattern(normalizedInput, ['fly to', 'go to', 'show me', 'take me to', 'navigate to', 'zoom to'])) {
      const location = this.extractLocation(normalizedInput);
      if (location) {
        // Use 15km (15000m) for landmarks and specific locations - allows seeing the area clearly
        // The executor defaults to 1000km if no height specified, which is too high for local views
        commands.push({
          type: 'camera.flyTo',
          destination: { ...location, height: location.height || 15000 },
          duration: 3,
        });
      }
    }

    // Geometry creation commands with location lookup
    const geometryResult = this.parseGeometryCreation(normalizedInput);
    if (geometryResult) {
      commands.push(geometryResult);
    }

    // Zoom commands - only process if we haven't already handled a zoom+location request above
    // Check if we already added a flyTo from the zoomSeeMatch (lines 788-800)
    const alreadyHandledZoom = commands.some(c => c.type === 'camera.flyTo');

    if (!alreadyHandledZoom) {
      // Check for "zoom to [location]" pattern
      const zoomToLocationMatch = normalizedInput.match(/zoom\s+(?:in\s+)?(?:to|on|at)\s+(?:see\s+)?(?:the\s+)?(.+?)(?:\s+fills|\s+in\s+frame|\s+in\s+view)?$/i);
      if (zoomToLocationMatch) {
        const locationText = zoomToLocationMatch[1]!.trim();
        const location = this.extractLocation(locationText);
        if (location) {
          // Fly to location at a close altitude (500m for landmarks, allows seeing detail)
          commands.push({
            type: 'camera.flyTo',
            destination: { ...location, height: 500 },
            duration: 2,
          });
        }
      }
      // Check for "zoom so [location] fills" pattern
      else if (normalizedInput.match(/zoom\s+(?:in\s+)?(?:so|until|that)\s+(?:the\s+)?(.+?)\s+fills/i)) {
        const match = normalizedInput.match(/zoom\s+(?:in\s+)?(?:so|until|that)\s+(?:the\s+)?(.+?)\s+fills/i);
        if (match) {
          const location = this.extractLocation(match[1]!);
          if (location) {
            commands.push({
              type: 'camera.flyTo',
              destination: { ...location, height: 300 },
              duration: 2,
            });
          }
        }
      }
      // Simple zoom in/out - only if the command is JUST "zoom in" or "zoom out" (not part of a longer phrase)
      else if (/^(?:really\s+)?zoom\s+in\s*$/.test(normalizedInput)) {
        commands.push({ type: 'camera.zoom', amount: 10000 });
      } else if (/^(?:really\s+)?zoom\s+out\s*$/.test(normalizedInput)) {
        commands.push({ type: 'camera.zoom', amount: -50000 });
      }
    }

    // Scene mode commands
    if (this.matchesPattern(normalizedInput, ['2d mode', 'flat mode', 'map view', 'switch to 2d'])) {
      commands.push({ type: 'scene.mode', mode: '2D' });
    } else if (this.matchesPattern(normalizedInput, ['3d mode', 'globe mode', 'switch to 3d', 'show the globe'])) {
      commands.push({ type: 'scene.mode', mode: '3D' });
    } else if (this.matchesPattern(normalizedInput, ['columbus view', 'columbus mode'])) {
      commands.push({ type: 'scene.mode', mode: 'COLUMBUS_VIEW' });
    }

    // Animation commands
    if (this.matchesPattern(normalizedInput, ['play', 'start animation', 'animate'])) {
      commands.push({ type: 'time.play' });
    } else if (this.matchesPattern(normalizedInput, ['pause', 'stop animation', 'stop'])) {
      commands.push({ type: 'time.pause' });
    }

    if (commands.length > 0) {
      return { success: true, commands };
    }

    return {
      success: false,
      commands: [],
      message: 'Could not understand the command',
    };
  }

  /**
   * Parse geometry creation commands with deterministic location lookup
   * Handles: "add a [color] [geometry] at/in/to [location]"
   */
  private parseGeometryCreation(input: string): CesiumCommand | null {
    // Check for geometry creation patterns
    const geometryPatterns = [
      /add\s+(?:a\s+)?(\w+)?\s*(sphere|box|cube|cylinder|marker|point|circle)\s+(?:at|in|to|near|by|on)\s+(.+)/i,
      /(?:create|place|put)\s+(?:a\s+)?(\w+)?\s*(sphere|box|cube|cylinder|marker|point|circle)\s+(?:at|in|to|near|by|on)\s+(.+)/i,
      /add\s+(?:a\s+)?(sphere|box|cube|cylinder|marker|point|circle)\s+(?:at|in|to|near|by|on)\s+(.+)/i,
    ];

    for (const pattern of geometryPatterns) {
      const match = input.match(pattern);
      if (match) {
        let color = 'blue';
        let geometryType: string;
        let locationText: string;

        if (match.length === 4) {
          // Pattern with color: add [color] [geometry] at [location]
          color = this.isColorName(match[1] || '') ? match[1]!.toLowerCase() : 'blue';
          geometryType = match[2]!.toLowerCase();
          locationText = match[3]!.toLowerCase();
        } else {
          // Pattern without color: add [geometry] at [location]
          geometryType = match[1]!.toLowerCase();
          locationText = match[2]!.toLowerCase();
        }

        // Also check for color in the input string if not yet found
        if (color === 'blue') {
          const colorMatch = input.match(/\b(red|green|blue|yellow|orange|purple|pink|cyan|white|black|gray|grey)\b/i);
          if (colorMatch) {
            color = colorMatch[1]!.toLowerCase();
          }
        }

        // Extract location from the text
        const location = this.extractLocation(locationText);
        if (!location) {
          // Try extracting from full input
          const fullLocation = this.extractLocation(input);
          if (!fullLocation) {
            return null;
          }
          Object.assign(location || {}, fullLocation);
        }

        // Normalize geometry type
        if (geometryType === 'cube') geometryType = 'box';
        if (geometryType === 'marker') geometryType = 'point';

        // Create the appropriate geometry command
        return this.createGeometryCommand(geometryType, location!, color);
      }
    }

    return null;
  }

  private isColorName(word: string): boolean {
    const colors = ['red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray', 'grey', 'magenta', 'lime', 'navy', 'teal', 'maroon', 'olive'];
    return colors.includes(word.toLowerCase());
  }

  private createGeometryCommand(geometryType: string, location: CartographicPosition, color: string): CesiumCommand {
    const timestamp = Date.now();
    const rgba = this.colorNameToRGBA(color);

    switch (geometryType) {
      case 'sphere':
        return {
          type: 'entity.add',
          entity: {
            id: `ellipsoid_${timestamp}`,
            name: `${color.charAt(0).toUpperCase() + color.slice(1)} Sphere`,
            position: {
              cartographicDegrees: [location.longitude, location.latitude, location.height || 50000],
            },
            ellipsoid: {
              radii: { cartesian: [50000, 50000, 50000] },
              material: { solidColor: { color: { rgba } } },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'box':
        return {
          type: 'entity.add',
          entity: {
            id: `box_${timestamp}`,
            name: `${color.charAt(0).toUpperCase() + color.slice(1)} Box`,
            position: {
              cartographicDegrees: [location.longitude, location.latitude, location.height || 50000],
            },
            box: {
              dimensions: { cartesian: [50000, 50000, 100000] },
              material: { solidColor: { color: { rgba } } },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'cylinder':
        return {
          type: 'entity.add',
          entity: {
            id: `cylinder_${timestamp}`,
            name: `${color.charAt(0).toUpperCase() + color.slice(1)} Cylinder`,
            position: {
              cartographicDegrees: [location.longitude, location.latitude, location.height || 50000],
            },
            cylinder: {
              length: 100000,
              topRadius: 25000,
              bottomRadius: 25000,
              material: { solidColor: { color: { rgba } } },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'circle':
        return {
          type: 'entity.add',
          entity: {
            id: `ellipse_${timestamp}`,
            name: `${color.charAt(0).toUpperCase() + color.slice(1)} Circle`,
            position: {
              cartographicDegrees: [location.longitude, location.latitude, 0],
            },
            ellipse: {
              semiMajorAxis: 50000,
              semiMinorAxis: 50000,
              height: 0,
              material: { solidColor: { color: { rgba } } },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'point':
      default:
        return {
          type: 'entity.add',
          entity: {
            id: `point_${timestamp}`,
            name: `${color.charAt(0).toUpperCase() + color.slice(1)} Marker`,
            position: {
              cartographicDegrees: [location.longitude, location.latitude, 0],
            },
            point: {
              color: { rgba },
              pixelSize: 20,
              outlineColor: { rgba: [255, 255, 255, 255] },
              outlineWidth: 3,
              show: true,
            },
          },
        };
    }
  }

  private toolCallToCommand(toolCall: ToolCall): CesiumCommand | null {
    const { name, arguments: args } = toolCall;

    switch (name) {
      case 'flyTo':
        return {
          type: 'camera.flyTo',
          destination: {
            longitude: args['longitude'] as number,
            latitude: args['latitude'] as number,
            height: (args['height'] as number) || 1000000,
          },
          duration: (args['duration'] as number) || 3,
        };

      case 'lookAt':
        return {
          type: 'camera.lookAt',
          target: {
            longitude: args['longitude'] as number,
            latitude: args['latitude'] as number,
          },
          offset: args['range'] ? {
            heading: 0,
            pitch: -Math.PI / 4,
            range: args['range'] as number,
          } : undefined,
        };

      case 'zoom':
        return {
          type: 'camera.zoom',
          amount: args['amount'] as number,
        };

      case 'addPoint':
        return {
          type: 'entity.add',
          entity: {
            id: `point_${Date.now()}`,
            name: (args['name'] as string) || 'Point',
            position: {
              cartographicDegrees: [
                args['longitude'] as number,
                args['latitude'] as number,
                0,
              ],
            },
            point: {
              color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'red') },
              pixelSize: (args['size'] as number) || 10,
              outlineColor: { rgba: [255, 255, 255, 255] },
              outlineWidth: 2,
              show: true,
            },
          },
        };

      case 'addLabel':
        return {
          type: 'entity.add',
          entity: {
            id: `label_${Date.now()}`,
            name: args['text'] as string,
            position: {
              cartographicDegrees: [
                args['longitude'] as number,
                args['latitude'] as number,
                0,
              ],
            },
            label: {
              text: args['text'] as string,
              font: '14pt sans-serif',
              fillColor: { rgba: this.colorNameToRGBA((args['color'] as string) || 'white') },
              show: true,
            },
          },
        };

      case 'addPolyline': {
        const positions = args['positions'] as Array<{ longitude: number; latitude: number; height?: number }>;
        const coords: number[] = [];
        for (const pos of positions) {
          coords.push(pos.longitude, pos.latitude, pos.height || 0);
        }
        return {
          type: 'entity.add',
          entity: {
            id: `polyline_${Date.now()}`,
            name: (args['name'] as string) || 'Polyline',
            polyline: {
              positions: { cartographicDegrees: coords },
              width: (args['width'] as number) || 3,
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'blue') },
                },
              },
              clampToGround: true,
              show: true,
            },
          },
        };
      }

      case 'addPolygon': {
        const positions = args['positions'] as Array<{ longitude: number; latitude: number; height?: number }>;
        const coords: number[] = [];
        for (const pos of positions) {
          coords.push(pos.longitude, pos.latitude, pos.height || 0);
        }
        return {
          type: 'entity.add',
          entity: {
            id: `polygon_${Date.now()}`,
            name: (args['name'] as string) || 'Polygon',
            polygon: {
              positions: { cartographicDegrees: coords },
              height: 0,
              extrudedHeight: args['extrudedHeight'] as number | undefined,
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'blue') },
                },
              },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };
      }

      case 'addCircle':
        return {
          type: 'entity.add',
          entity: {
            id: `ellipse_${Date.now()}`,
            name: (args['name'] as string) || 'Circle',
            position: {
              cartographicDegrees: [
                args['longitude'] as number,
                args['latitude'] as number,
                0,
              ],
            },
            ellipse: {
              semiMajorAxis: args['radius'] as number,
              semiMinorAxis: args['radius'] as number,
              height: 0,
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'blue') },
                },
              },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'addSphere':
        return {
          type: 'entity.add',
          entity: {
            id: `ellipsoid_${Date.now()}`,
            name: (args['name'] as string) || 'Sphere',
            position: {
              cartographicDegrees: [
                args['longitude'] as number,
                args['latitude'] as number,
                (args['height'] as number) || 0,
              ],
            },
            ellipsoid: {
              radii: {
                cartesian: [
                  args['radius'] as number,
                  args['radius'] as number,
                  args['radius'] as number,
                ],
              },
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'blue') },
                },
              },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'addBox':
        return {
          type: 'entity.add',
          entity: {
            id: `box_${Date.now()}`,
            name: (args['name'] as string) || 'Box',
            position: {
              cartographicDegrees: [
                args['longitude'] as number,
                args['latitude'] as number,
                (args['height'] as number) || 0,
              ],
            },
            box: {
              dimensions: {
                cartesian: [
                  (args['dimensionX'] as number) || 100000,
                  (args['dimensionY'] as number) || 100000,
                  (args['dimensionZ'] as number) || 100000,
                ],
              },
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'blue') },
                },
              },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'addCylinder':
        return {
          type: 'entity.add',
          entity: {
            id: `cylinder_${Date.now()}`,
            name: (args['name'] as string) || 'Cylinder',
            position: {
              cartographicDegrees: [
                args['longitude'] as number,
                args['latitude'] as number,
                (args['height'] as number) || 0,
              ],
            },
            cylinder: {
              length: (args['length'] as number) || 100000,
              topRadius: (args['topRadius'] as number) || 50000,
              bottomRadius: (args['bottomRadius'] as number) || 50000,
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'blue') },
                },
              },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };

      case 'addWall': {
        const positions = args['positions'] as Array<{ longitude: number; latitude: number }>;
        const coords: number[] = [];
        for (const pos of positions) {
          coords.push(pos.longitude, pos.latitude, 0);
        }
        return {
          type: 'entity.add',
          entity: {
            id: `wall_${Date.now()}`,
            name: (args['name'] as string) || 'Wall',
            wall: {
              positions: { cartographicDegrees: coords },
              maximumHeights: args['maximumHeights'] as number[],
              minimumHeights: args['minimumHeights'] as number[],
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'gray') },
                },
              },
              outline: true,
              outlineColor: { rgba: [0, 0, 0, 255] },
              show: true,
            },
          },
        };
      }

      case 'addCorridor': {
        const positions = args['positions'] as Array<{ longitude: number; latitude: number }>;
        const coords: number[] = [];
        for (const pos of positions) {
          coords.push(pos.longitude, pos.latitude, 0);
        }
        return {
          type: 'entity.add',
          entity: {
            id: `corridor_${Date.now()}`,
            name: (args['name'] as string) || 'Corridor',
            corridor: {
              positions: { cartographicDegrees: coords },
              width: (args['width'] as number) || 10000,
              height: 0,
              extrudedHeight: args['extrudedHeight'] as number | undefined,
              material: {
                solidColor: {
                  color: { rgba: this.colorNameToRGBA((args['color'] as string) || 'blue') },
                },
              },
              outline: true,
              outlineColor: { rgba: [255, 255, 255, 255] },
              show: true,
            },
          },
        };
      }

      case 'removeEntity':
        return {
          type: 'entity.remove',
          id: args['id'] as string,
        };

      case 'setSceneMode':
        return {
          type: 'scene.mode',
          mode: args['mode'] as '2D' | '3D' | 'COLUMBUS_VIEW',
        };

      case 'setTime':
        return {
          type: 'time.set',
          currentTime: args['time'] as string,
          multiplier: args['multiplier'] as number | undefined,
        };

      case 'playAnimation':
        return { type: 'time.play' };

      case 'pauseAnimation':
        return { type: 'time.pause' };

      default:
        return null;
    }
  }

  private matchesPattern(input: string, patterns: string[]): boolean {
    return patterns.some(pattern => input.includes(pattern));
  }

  private extractLocation(input: string): CartographicPosition | null {
    // Check known locations
    for (const [name, position] of Object.entries(KNOWN_LOCATIONS)) {
      if (input.includes(name)) {
        return position;
      }
    }

    // Try to extract coordinates
    const coordRegex = /(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/;
    const match = input.match(coordRegex);
    if (match) {
      const first = parseFloat(match[1]!);
      const second = parseFloat(match[2]!);

      // Determine which is longitude and which is latitude
      // Latitude is typically between -90 and 90
      if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
        return { latitude: first, longitude: second };
      } else if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
        return { longitude: first, latitude: second };
      }
    }

    return null;
  }

  private colorNameToRGBA(colorName: string): [number, number, number, number] {
    const colors: Record<string, [number, number, number, number]> = {
      red: [255, 0, 0, 255],
      green: [0, 255, 0, 255],
      blue: [0, 0, 255, 255],
      yellow: [255, 255, 0, 255],
      orange: [255, 165, 0, 255],
      purple: [128, 0, 128, 255],
      pink: [255, 192, 203, 255],
      cyan: [0, 255, 255, 255],
      white: [255, 255, 255, 255],
      black: [0, 0, 0, 255],
      gray: [128, 128, 128, 255],
      grey: [128, 128, 128, 255],
      magenta: [255, 0, 255, 255],
      lime: [0, 255, 0, 255],
      navy: [0, 0, 128, 255],
      teal: [0, 128, 128, 255],
      maroon: [128, 0, 0, 255],
      olive: [128, 128, 0, 255],
    };

    return colors[colorName.toLowerCase()] || colors['red']!;
  }

  getKnownLocations(): string[] {
    return Object.keys(KNOWN_LOCATIONS);
  }

  lookupLocation(name: string): CartographicPosition | null {
    return KNOWN_LOCATIONS[name.toLowerCase()] || null;
  }
}
