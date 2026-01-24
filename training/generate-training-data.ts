/**
 * Training Data Generator
 * Generates comprehensive training examples for fine-tuning the Cesium SLM
 * Target: 10,000+ varied examples covering all MCP tools
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Location Database
// ============================================================================

interface Location {
  name: string;
  aliases: string[];
  longitude: number;
  latitude: number;
  height?: number;
  type: 'city' | 'landmark' | 'natural' | 'country' | 'region';
}

const LOCATIONS: Location[] = [
  // Major World Cities
  { name: 'New York', aliases: ['NYC', 'New York City', 'Manhattan', 'the Big Apple'], longitude: -74.006, latitude: 40.7128, type: 'city' },
  { name: 'London', aliases: ['London UK', 'London England'], longitude: -0.1276, latitude: 51.5074, type: 'city' },
  { name: 'Paris', aliases: ['Paris France'], longitude: 2.3522, latitude: 48.8566, type: 'city' },
  { name: 'Tokyo', aliases: ['Tokyo Japan'], longitude: 139.6917, latitude: 35.6895, type: 'city' },
  { name: 'Sydney', aliases: ['Sydney Australia'], longitude: 151.2093, latitude: -33.8688, type: 'city' },
  { name: 'Los Angeles', aliases: ['LA', 'L.A.'], longitude: -118.2437, latitude: 34.0522, type: 'city' },
  { name: 'San Francisco', aliases: ['SF', 'San Fran', 'Frisco'], longitude: -122.4194, latitude: 37.7749, type: 'city' },
  { name: 'Chicago', aliases: ['Chi-Town', 'the Windy City'], longitude: -87.6298, latitude: 41.8781, type: 'city' },
  { name: 'Moscow', aliases: ['Moscow Russia'], longitude: 37.6173, latitude: 55.7558, type: 'city' },
  { name: 'Beijing', aliases: ['Beijing China', 'Peking'], longitude: 116.4074, latitude: 39.9042, type: 'city' },
  { name: 'Dubai', aliases: ['Dubai UAE'], longitude: 55.2708, latitude: 25.2048, type: 'city' },
  { name: 'Singapore', aliases: ['Singapore City'], longitude: 103.8198, latitude: 1.3521, type: 'city' },
  { name: 'Hong Kong', aliases: ['HK'], longitude: 114.1694, latitude: 22.3193, type: 'city' },
  { name: 'Shanghai', aliases: ['Shanghai China'], longitude: 121.4737, latitude: 31.2304, type: 'city' },
  { name: 'Mumbai', aliases: ['Bombay', 'Mumbai India'], longitude: 72.8777, latitude: 19.0760, type: 'city' },
  { name: 'Delhi', aliases: ['New Delhi', 'Delhi India'], longitude: 77.1025, latitude: 28.7041, type: 'city' },
  { name: 'Cairo', aliases: ['Cairo Egypt'], longitude: 31.2357, latitude: 30.0444, type: 'city' },
  { name: 'Istanbul', aliases: ['Constantinople', 'Istanbul Turkey'], longitude: 28.9784, latitude: 41.0082, type: 'city' },
  { name: 'Rome', aliases: ['Rome Italy', 'Roma'], longitude: 12.4964, latitude: 41.9028, type: 'city' },
  { name: 'Berlin', aliases: ['Berlin Germany'], longitude: 13.4050, latitude: 52.5200, type: 'city' },
  { name: 'Madrid', aliases: ['Madrid Spain'], longitude: -3.7038, latitude: 40.4168, type: 'city' },
  { name: 'Barcelona', aliases: ['Barcelona Spain'], longitude: 2.1734, latitude: 41.3851, type: 'city' },
  { name: 'Amsterdam', aliases: ['Amsterdam Netherlands'], longitude: 4.9041, latitude: 52.3676, type: 'city' },
  { name: 'Vienna', aliases: ['Vienna Austria', 'Wien'], longitude: 16.3738, latitude: 48.2082, type: 'city' },
  { name: 'Prague', aliases: ['Prague Czech Republic', 'Praha'], longitude: 14.4378, latitude: 50.0755, type: 'city' },
  { name: 'Stockholm', aliases: ['Stockholm Sweden'], longitude: 18.0686, latitude: 59.3293, type: 'city' },
  { name: 'Copenhagen', aliases: ['Copenhagen Denmark'], longitude: 12.5683, latitude: 55.6761, type: 'city' },
  { name: 'Athens', aliases: ['Athens Greece'], longitude: 23.7275, latitude: 37.9838, type: 'city' },
  { name: 'Lisbon', aliases: ['Lisbon Portugal', 'Lisboa'], longitude: -9.1393, latitude: 38.7223, type: 'city' },
  { name: 'Dublin', aliases: ['Dublin Ireland'], longitude: -6.2603, latitude: 53.3498, type: 'city' },
  { name: 'Toronto', aliases: ['Toronto Canada'], longitude: -79.3832, latitude: 43.6532, type: 'city' },
  { name: 'Vancouver', aliases: ['Vancouver Canada'], longitude: -123.1207, latitude: 49.2827, type: 'city' },
  { name: 'Mexico City', aliases: ['CDMX', 'Ciudad de Mexico'], longitude: -99.1332, latitude: 19.4326, type: 'city' },
  { name: 'Sao Paulo', aliases: ['Sao Paulo Brazil'], longitude: -46.6333, latitude: -23.5505, type: 'city' },
  { name: 'Rio de Janeiro', aliases: ['Rio', 'Rio Brazil'], longitude: -43.1729, latitude: -22.9068, type: 'city' },
  { name: 'Buenos Aires', aliases: ['Buenos Aires Argentina'], longitude: -58.3816, latitude: -34.6037, type: 'city' },
  { name: 'Cape Town', aliases: ['Cape Town South Africa'], longitude: 18.4241, latitude: -33.9249, type: 'city' },
  { name: 'Seoul', aliases: ['Seoul South Korea'], longitude: 126.9780, latitude: 37.5665, type: 'city' },
  { name: 'Bangkok', aliases: ['Bangkok Thailand'], longitude: 100.5018, latitude: 13.7563, type: 'city' },
  { name: 'Jakarta', aliases: ['Jakarta Indonesia'], longitude: 106.8456, latitude: -6.2088, type: 'city' },
  { name: 'Kuala Lumpur', aliases: ['KL', 'Kuala Lumpur Malaysia'], longitude: 101.6869, latitude: 3.1390, type: 'city' },
  { name: 'Manila', aliases: ['Manila Philippines'], longitude: 120.9842, latitude: 14.5995, type: 'city' },
  { name: 'Melbourne', aliases: ['Melbourne Australia'], longitude: 144.9631, latitude: -37.8136, type: 'city' },
  { name: 'Auckland', aliases: ['Auckland New Zealand'], longitude: 174.7633, latitude: -36.8485, type: 'city' },
  { name: 'Wellington', aliases: ['Wellington New Zealand'], longitude: 174.7762, latitude: -41.2866, type: 'city' },
  { name: 'Helsinki', aliases: ['Helsinki Finland'], longitude: 24.9384, latitude: 60.1699, type: 'city' },
  { name: 'Oslo', aliases: ['Oslo Norway'], longitude: 10.7522, latitude: 59.9139, type: 'city' },
  { name: 'Warsaw', aliases: ['Warsaw Poland', 'Warszawa'], longitude: 21.0122, latitude: 52.2297, type: 'city' },
  { name: 'Budapest', aliases: ['Budapest Hungary'], longitude: 19.0402, latitude: 47.4979, type: 'city' },
  { name: 'Brussels', aliases: ['Brussels Belgium'], longitude: 4.3517, latitude: 50.8503, type: 'city' },

  // Famous Landmarks
  { name: 'Eiffel Tower', aliases: ['the Eiffel Tower', 'Tour Eiffel'], longitude: 2.2945, latitude: 48.8584, height: 50000, type: 'landmark' },
  { name: 'Statue of Liberty', aliases: ['the Statue of Liberty', 'Lady Liberty'], longitude: -74.0445, latitude: 40.6892, height: 30000, type: 'landmark' },
  { name: 'Big Ben', aliases: ['Elizabeth Tower', 'the Big Ben'], longitude: -0.1246, latitude: 51.5007, height: 30000, type: 'landmark' },
  { name: 'Colosseum', aliases: ['the Colosseum', 'Roman Colosseum'], longitude: 12.4924, latitude: 41.8902, height: 30000, type: 'landmark' },
  { name: 'Taj Mahal', aliases: ['the Taj Mahal'], longitude: 78.0421, latitude: 27.1751, height: 30000, type: 'landmark' },
  { name: 'Great Wall of China', aliases: ['the Great Wall', 'Great Wall'], longitude: 116.5704, latitude: 40.4319, height: 50000, type: 'landmark' },
  { name: 'Pyramids of Giza', aliases: ['the Pyramids', 'Giza Pyramids', 'Great Pyramid'], longitude: 31.1342, latitude: 29.9792, height: 50000, type: 'landmark' },
  { name: 'Machu Picchu', aliases: ['Machu Pichu'], longitude: -72.5450, latitude: -13.1631, height: 30000, type: 'landmark' },
  { name: 'Christ the Redeemer', aliases: ['Cristo Redentor'], longitude: -43.2105, latitude: -22.9519, height: 30000, type: 'landmark' },
  { name: 'Sydney Opera House', aliases: ['the Opera House'], longitude: 151.2153, latitude: -33.8568, height: 30000, type: 'landmark' },
  { name: 'Burj Khalifa', aliases: ['Burj Dubai'], longitude: 55.2744, latitude: 25.1972, height: 50000, type: 'landmark' },
  { name: 'Golden Gate Bridge', aliases: ['the Golden Gate', 'GG Bridge'], longitude: -122.4783, latitude: 37.8199, height: 30000, type: 'landmark' },
  { name: 'Empire State Building', aliases: ['ESB'], longitude: -73.9857, latitude: 40.7484, height: 30000, type: 'landmark' },
  { name: 'Tower of Pisa', aliases: ['Leaning Tower', 'Pisa Tower'], longitude: 10.3963, latitude: 43.7230, height: 20000, type: 'landmark' },
  { name: 'Stonehenge', aliases: ['the Stonehenge'], longitude: -1.8262, latitude: 51.1789, height: 30000, type: 'landmark' },
  { name: 'Petra', aliases: ['Petra Jordan', 'the Treasury'], longitude: 35.4444, latitude: 30.3285, height: 30000, type: 'landmark' },
  { name: 'Angkor Wat', aliases: ['Angkor', 'Angkor Temple'], longitude: 103.8670, latitude: 13.4125, height: 30000, type: 'landmark' },
  { name: 'Acropolis', aliases: ['the Acropolis', 'Parthenon'], longitude: 23.7257, latitude: 37.9715, height: 20000, type: 'landmark' },
  { name: 'Brandenburg Gate', aliases: ['Brandenburger Tor'], longitude: 13.3777, latitude: 52.5163, height: 20000, type: 'landmark' },
  { name: 'Notre Dame', aliases: ['Notre Dame Cathedral', 'Notre-Dame'], longitude: 2.3499, latitude: 48.8530, height: 20000, type: 'landmark' },

  // Natural Wonders
  { name: 'Grand Canyon', aliases: ['the Grand Canyon'], longitude: -112.1401, latitude: 36.0544, height: 100000, type: 'natural' },
  { name: 'Mount Everest', aliases: ['Everest', 'Mt. Everest', 'Mt Everest'], longitude: 86.9250, latitude: 27.9881, height: 100000, type: 'natural' },
  { name: 'Niagara Falls', aliases: ['the Niagara Falls', 'Niagara'], longitude: -79.0377, latitude: 43.0962, height: 30000, type: 'natural' },
  { name: 'Mount Fuji', aliases: ['Fuji', 'Mt. Fuji', 'Fujiyama'], longitude: 138.7274, latitude: 35.3606, height: 100000, type: 'natural' },
  { name: 'Victoria Falls', aliases: ['the Victoria Falls'], longitude: 25.8572, latitude: -17.9243, height: 50000, type: 'natural' },
  { name: 'Great Barrier Reef', aliases: ['the Great Barrier Reef', 'Barrier Reef'], longitude: 145.7731, latitude: -16.2864, height: 100000, type: 'natural' },
  { name: 'Amazon Rainforest', aliases: ['the Amazon', 'Amazon Basin'], longitude: -60.0217, latitude: -3.4653, height: 500000, type: 'natural' },
  { name: 'Yellowstone', aliases: ['Yellowstone National Park', 'Yellowstone Park'], longitude: -110.5885, latitude: 44.4280, height: 200000, type: 'natural' },
  { name: 'Yosemite', aliases: ['Yosemite National Park', 'Yosemite Valley'], longitude: -119.5383, latitude: 37.8651, height: 100000, type: 'natural' },
  { name: 'Sahara Desert', aliases: ['the Sahara', 'Sahara'], longitude: 9.3174, latitude: 23.4162, height: 1000000, type: 'natural' },
  { name: 'Antarctica', aliases: ['the Antarctic', 'South Pole region'], longitude: 0, latitude: -82.8628, height: 5000000, type: 'natural' },
  { name: 'Arctic', aliases: ['the Arctic', 'North Pole region'], longitude: 0, latitude: 90, height: 5000000, type: 'natural' },
  { name: 'Mount Kilimanjaro', aliases: ['Kilimanjaro', 'Mt Kilimanjaro'], longitude: 37.3556, latitude: -3.0674, height: 100000, type: 'natural' },
  { name: 'Dead Sea', aliases: ['the Dead Sea'], longitude: 35.4732, latitude: 31.5111, height: 50000, type: 'natural' },
  { name: 'Matterhorn', aliases: ['the Matterhorn', 'Monte Cervino'], longitude: 7.6585, latitude: 45.9763, height: 50000, type: 'natural' },

  // Additional Cities
  { name: 'Denver', aliases: ['Denver Colorado'], longitude: -104.9903, latitude: 39.7392, type: 'city' },
  { name: 'Phoenix', aliases: ['Phoenix Arizona'], longitude: -112.0740, latitude: 33.4484, type: 'city' },
  { name: 'Philadelphia', aliases: ['Philly'], longitude: -75.1652, latitude: 39.9526, type: 'city' },
  { name: 'San Diego', aliases: ['SD'], longitude: -117.1611, latitude: 32.7157, type: 'city' },
  { name: 'Dallas', aliases: ['Dallas Texas'], longitude: -96.7970, latitude: 32.7767, type: 'city' },
  { name: 'Austin', aliases: ['Austin Texas'], longitude: -97.7431, latitude: 30.2672, type: 'city' },
  { name: 'Nashville', aliases: ['Nashville Tennessee'], longitude: -86.7816, latitude: 36.1627, type: 'city' },
  { name: 'Detroit', aliases: ['Motor City'], longitude: -83.0458, latitude: 42.3314, type: 'city' },
  { name: 'Portland', aliases: ['Portland Oregon'], longitude: -122.6765, latitude: 45.5152, type: 'city' },
  { name: 'Las Vegas', aliases: ['Vegas', 'Sin City'], longitude: -115.1398, latitude: 36.1699, type: 'city' },
  { name: 'Atlanta', aliases: ['ATL'], longitude: -84.3880, latitude: 33.7490, type: 'city' },
  { name: 'Minneapolis', aliases: ['Twin Cities'], longitude: -93.2650, latitude: 44.9778, type: 'city' },
  { name: 'New Orleans', aliases: ['NOLA', 'Big Easy'], longitude: -90.0715, latitude: 29.9511, type: 'city' },
  { name: 'Cleveland', aliases: ['Cleveland Ohio'], longitude: -81.6944, latitude: 41.4993, type: 'city' },
  { name: 'Pittsburgh', aliases: ['Pittsburgh PA'], longitude: -79.9959, latitude: 40.4406, type: 'city' },
  { name: 'Cincinnati', aliases: ['Cincy'], longitude: -84.5120, latitude: 39.1031, type: 'city' },
  { name: 'Kansas City', aliases: ['KC'], longitude: -94.5786, latitude: 39.0997, type: 'city' },
  { name: 'Orlando', aliases: ['Orlando Florida'], longitude: -81.3792, latitude: 28.5383, type: 'city' },
  { name: 'Tampa', aliases: ['Tampa Bay'], longitude: -82.4572, latitude: 27.9506, type: 'city' },
  { name: 'Montreal', aliases: ['Montreal Canada'], longitude: -73.5673, latitude: 45.5017, type: 'city' },
  { name: 'Calgary', aliases: ['Calgary Canada'], longitude: -114.0719, latitude: 51.0447, type: 'city' },
  { name: 'Edmonton', aliases: ['Edmonton Canada'], longitude: -113.4909, latitude: 53.5461, type: 'city' },
  { name: 'Zurich', aliases: ['Zurich Switzerland'], longitude: 8.5417, latitude: 47.3769, type: 'city' },
  { name: 'Geneva', aliases: ['Geneva Switzerland'], longitude: 6.1432, latitude: 46.2044, type: 'city' },
  { name: 'Milan', aliases: ['Milano'], longitude: 9.1900, latitude: 45.4642, type: 'city' },
  { name: 'Naples', aliases: ['Napoli'], longitude: 14.2681, latitude: 40.8518, type: 'city' },
  { name: 'Florence', aliases: ['Firenze'], longitude: 11.2558, latitude: 43.7696, type: 'city' },
  { name: 'Venice', aliases: ['Venezia'], longitude: 12.3155, latitude: 45.4408, type: 'city' },
  { name: 'Edinburgh', aliases: ['Edinburgh Scotland'], longitude: -3.1883, latitude: 55.9533, type: 'city' },
  { name: 'Manchester', aliases: ['Manchester UK'], longitude: -2.2426, latitude: 53.4808, type: 'city' },
  { name: 'Liverpool', aliases: ['Liverpool UK'], longitude: -2.9916, latitude: 53.4084, type: 'city' },
  { name: 'Munich', aliases: ['Munchen', 'Munich Germany'], longitude: 11.5820, latitude: 48.1351, type: 'city' },
  { name: 'Frankfurt', aliases: ['Frankfurt Germany'], longitude: 8.6821, latitude: 50.1109, type: 'city' },
  { name: 'Hamburg', aliases: ['Hamburg Germany'], longitude: 9.9937, latitude: 53.5511, type: 'city' },
  { name: 'Cologne', aliases: ['Koln'], longitude: 6.9603, latitude: 50.9375, type: 'city' },
  { name: 'Lyon', aliases: ['Lyon France'], longitude: 4.8357, latitude: 45.7640, type: 'city' },
  { name: 'Marseille', aliases: ['Marseilles'], longitude: 5.3698, latitude: 43.2965, type: 'city' },
  { name: 'Nice', aliases: ['Nice France'], longitude: 7.2620, latitude: 43.7102, type: 'city' },
  { name: 'Seville', aliases: ['Sevilla'], longitude: -5.9845, latitude: 37.3891, type: 'city' },
  { name: 'Valencia', aliases: ['Valencia Spain'], longitude: -0.3763, latitude: 39.4699, type: 'city' },
  { name: 'Porto', aliases: ['Oporto'], longitude: -8.6291, latitude: 41.1579, type: 'city' },
  { name: 'Krakow', aliases: ['Cracow'], longitude: 19.9450, latitude: 50.0647, type: 'city' },
  { name: 'Kiev', aliases: ['Kyiv'], longitude: 30.5234, latitude: 50.4501, type: 'city' },
  { name: 'St Petersburg', aliases: ['Saint Petersburg'], longitude: 30.3351, latitude: 59.9343, type: 'city' },
  { name: 'Osaka', aliases: ['Osaka Japan'], longitude: 135.5022, latitude: 34.6937, type: 'city' },
  { name: 'Kyoto', aliases: ['Kyoto Japan'], longitude: 135.7681, latitude: 35.0116, type: 'city' },
  { name: 'Nagoya', aliases: ['Nagoya Japan'], longitude: 136.9066, latitude: 35.1815, type: 'city' },
  { name: 'Shenzhen', aliases: ['Shenzhen China'], longitude: 114.0579, latitude: 22.5431, type: 'city' },
  { name: 'Guangzhou', aliases: ['Canton'], longitude: 113.2644, latitude: 23.1291, type: 'city' },
  { name: 'Chengdu', aliases: ['Chengdu China'], longitude: 104.0668, latitude: 30.5728, type: 'city' },
  { name: 'Hangzhou', aliases: ['Hangzhou China'], longitude: 120.1551, latitude: 30.2741, type: 'city' },
  { name: 'Nanjing', aliases: ['Nanking'], longitude: 118.7969, latitude: 32.0603, type: 'city' },
  { name: 'Busan', aliases: ['Pusan'], longitude: 129.0756, latitude: 35.1796, type: 'city' },
  { name: 'Hanoi', aliases: ['Ha Noi'], longitude: 105.8542, latitude: 21.0285, type: 'city' },
  { name: 'Ho Chi Minh City', aliases: ['Saigon', 'HCMC'], longitude: 106.6297, latitude: 10.8231, type: 'city' },
  { name: 'Phuket', aliases: ['Phuket Thailand'], longitude: 98.3923, latitude: 7.8804, type: 'city' },
  { name: 'Bali', aliases: ['Bali Indonesia'], longitude: 115.1889, latitude: -8.4095, type: 'city' },
  { name: 'Chennai', aliases: ['Madras'], longitude: 80.2707, latitude: 13.0827, type: 'city' },
  { name: 'Kolkata', aliases: ['Calcutta'], longitude: 88.3639, latitude: 22.5726, type: 'city' },
  { name: 'Hyderabad', aliases: ['Hyderabad India'], longitude: 78.4867, latitude: 17.3850, type: 'city' },
  { name: 'Ahmedabad', aliases: ['Ahmedabad India'], longitude: 72.5714, latitude: 23.0225, type: 'city' },
  { name: 'Tel Aviv', aliases: ['Tel Aviv Israel'], longitude: 34.7818, latitude: 32.0853, type: 'city' },
  { name: 'Jerusalem', aliases: ['Jerusalem Israel'], longitude: 35.2137, latitude: 31.7683, type: 'city' },
  { name: 'Doha', aliases: ['Doha Qatar'], longitude: 51.5310, latitude: 25.2854, type: 'city' },
  { name: 'Abu Dhabi', aliases: ['Abu Dhabi UAE'], longitude: 54.3773, latitude: 24.4539, type: 'city' },
  { name: 'Riyadh', aliases: ['Riyadh Saudi Arabia'], longitude: 46.6753, latitude: 24.7136, type: 'city' },
  { name: 'Casablanca', aliases: ['Casablanca Morocco'], longitude: -7.5898, latitude: 33.5731, type: 'city' },
  { name: 'Marrakech', aliases: ['Marrakesh'], longitude: -7.9811, latitude: 31.6295, type: 'city' },
  { name: 'Nairobi', aliases: ['Nairobi Kenya'], longitude: 36.8219, latitude: -1.2921, type: 'city' },
  { name: 'Accra', aliases: ['Accra Ghana'], longitude: -0.1870, latitude: 5.6037, type: 'city' },
  { name: 'Addis Ababa', aliases: ['Addis'], longitude: 38.7578, latitude: 9.0320, type: 'city' },
  { name: 'Lima', aliases: ['Lima Peru'], longitude: -77.0428, latitude: -12.0464, type: 'city' },
  { name: 'Bogota', aliases: ['Bogota Colombia'], longitude: -74.0721, latitude: 4.7110, type: 'city' },
  { name: 'Santiago', aliases: ['Santiago Chile'], longitude: -70.6693, latitude: -33.4489, type: 'city' },
  { name: 'Caracas', aliases: ['Caracas Venezuela'], longitude: -66.9036, latitude: 10.4806, type: 'city' },
  { name: 'Havana', aliases: ['La Habana'], longitude: -82.3666, latitude: 23.1136, type: 'city' },
  { name: 'Panama City', aliases: ['Panama'], longitude: -79.5197, latitude: 8.9824, type: 'city' },
  { name: 'San Jose', aliases: ['San Jose Costa Rica'], longitude: -84.0907, latitude: 9.9281, type: 'city' },
  { name: 'Perth', aliases: ['Perth Australia'], longitude: 115.8605, latitude: -31.9505, type: 'city' },
  { name: 'Brisbane', aliases: ['Brisbane Australia'], longitude: 153.0251, latitude: -27.4698, type: 'city' },
  { name: 'Adelaide', aliases: ['Adelaide Australia'], longitude: 138.6007, latitude: -34.9285, type: 'city' },
  { name: 'Christchurch', aliases: ['Christchurch NZ'], longitude: 172.6362, latitude: -43.5321, type: 'city' },

  // More Landmarks
  { name: 'Sagrada Familia', aliases: ['La Sagrada Familia'], longitude: 2.1744, latitude: 41.4036, height: 20000, type: 'landmark' },
  { name: 'Tower Bridge', aliases: ['London Bridge'], longitude: -0.0754, latitude: 51.5055, height: 20000, type: 'landmark' },
  { name: 'Buckingham Palace', aliases: ['the Palace'], longitude: -0.1419, latitude: 51.5014, height: 20000, type: 'landmark' },
  { name: 'Vatican', aliases: ['Vatican City', 'St Peters'], longitude: 12.4534, latitude: 41.9029, height: 20000, type: 'landmark' },
  { name: 'Kremlin', aliases: ['Moscow Kremlin', 'the Kremlin'], longitude: 37.6176, latitude: 55.7520, height: 20000, type: 'landmark' },
  { name: 'Forbidden City', aliases: ['the Forbidden City'], longitude: 116.3972, latitude: 39.9163, height: 30000, type: 'landmark' },
  { name: 'Tiananmen Square', aliases: ['Tiananmen'], longitude: 116.3912, latitude: 39.9087, height: 20000, type: 'landmark' },
  { name: 'Marina Bay Sands', aliases: ['MBS'], longitude: 103.8610, latitude: 1.2834, height: 20000, type: 'landmark' },
  { name: 'CN Tower', aliases: ['Toronto Tower'], longitude: -79.3871, latitude: 43.6426, height: 20000, type: 'landmark' },
  { name: 'Space Needle', aliases: ['Seattle Space Needle'], longitude: -122.3493, latitude: 47.6205, height: 20000, type: 'landmark' },
  { name: 'Hollywood Sign', aliases: ['the Hollywood Sign'], longitude: -118.3215, latitude: 34.1341, height: 20000, type: 'landmark' },
  { name: 'Mount Rushmore', aliases: ['Rushmore', 'Mt Rushmore'], longitude: -103.4591, latitude: 43.8791, height: 30000, type: 'landmark' },
  { name: 'Alcatraz', aliases: ['Alcatraz Island'], longitude: -122.4230, latitude: 37.8270, height: 20000, type: 'landmark' },
  { name: 'Hoover Dam', aliases: ['the Hoover Dam'], longitude: -114.7377, latitude: 36.0160, height: 30000, type: 'landmark' },
  { name: 'Chichen Itza', aliases: ['Chichen Itza Mexico'], longitude: -88.5686, latitude: 20.6843, height: 30000, type: 'landmark' },
  { name: 'Easter Island', aliases: ['Rapa Nui'], longitude: -109.3497, latitude: -27.1127, height: 50000, type: 'landmark' },
  { name: 'Galapagos', aliases: ['Galapagos Islands'], longitude: -90.9656, latitude: -0.9538, height: 100000, type: 'natural' },
  { name: 'Serengeti', aliases: ['Serengeti National Park'], longitude: 34.8888, latitude: -2.3333, height: 200000, type: 'natural' },
  { name: 'Himalaya', aliases: ['the Himalayas', 'Himalayan Mountains'], longitude: 86.9250, latitude: 27.9881, height: 500000, type: 'natural' },
  { name: 'Alps', aliases: ['the Alps', 'Swiss Alps'], longitude: 7.6500, latitude: 46.0000, height: 300000, type: 'natural' },
  { name: 'Rocky Mountains', aliases: ['the Rockies'], longitude: -105.7821, latitude: 40.3428, height: 300000, type: 'natural' },
  { name: 'Andes', aliases: ['the Andes', 'Andes Mountains'], longitude: -70.0000, latitude: -32.6532, height: 500000, type: 'natural' },
  { name: 'Great Lakes', aliases: ['the Great Lakes'], longitude: -84.0000, latitude: 45.0000, height: 500000, type: 'natural' },
  { name: 'Nile River', aliases: ['the Nile'], longitude: 31.5000, latitude: 25.0000, height: 500000, type: 'natural' },
  { name: 'Amazon River', aliases: ['the Amazon River'], longitude: -55.0000, latitude: -3.0000, height: 500000, type: 'natural' },
  { name: 'Mississippi River', aliases: ['the Mississippi'], longitude: -90.0000, latitude: 32.0000, height: 500000, type: 'natural' },
];

// ============================================================================
// Command Templates
// ============================================================================

const FLY_TO_TEMPLATES = [
  'Show me {location}',
  'Fly to {location}',
  'Go to {location}',
  'Navigate to {location}',
  'Take me to {location}',
  'Zoom to {location}',
  'Move to {location}',
  "Let's go to {location}",
  'Can you show me {location}?',
  'I want to see {location}',
  'Fly the camera to {location}',
  'Center on {location}',
  'Focus on {location}',
  'Pan to {location}',
  'Jump to {location}',
  'Teleport to {location}',
  'View {location}',
  "What does {location} look like?",
  'Display {location}',
  'Bring up {location}',
  'Head to {location}',
  'Travel to {location}',
  'Look at {location}',
  'Point the camera at {location}',
  'Where is {location}?',
  'Find {location}',
  'Locate {location}',
  'Search for {location}',
  'Get me to {location}',
  'Explore {location}',
  'Visit {location}',
  'Show {location} on the map',
  'Fly over {location}',
  'Move the view to {location}',
  'Switch to {location}',
  'Go see {location}',
  'I would like to see {location}',
  'Please show me {location}',
  'Could you fly to {location}?',
  'Navigate the camera to {location}',
];

const ADD_POINT_TEMPLATES = [
  'Add a {color} marker at {location}',
  'Put a {color} point at {location}',
  'Mark {location} with a {color} marker',
  'Place a {color} pin at {location}',
  'Add a marker at {location}',
  'Put a point on {location}',
  'Mark {location}',
  'Add a {color} dot at {location}',
  'Drop a {color} marker on {location}',
  'Place a marker at {location} in {color}',
  'Create a {color} point at {location}',
  'Show a {color} marker at {location}',
];

const ADD_LABEL_TEMPLATES = [
  'Add a label {text} at {location}',
  'Put text {text} at {location}',
  'Label {location} with {text}',
  'Add text {text} to {location}',
  'Write {text} at {location}',
  'Display {text} at {location}',
  'Show text {text} near {location}',
  'Create a label saying {text} at {location}',
];

const ADD_POLYLINE_TEMPLATES = [
  'Draw a line from {loc1} to {loc2}',
  'Connect {loc1} to {loc2}',
  'Draw a {color} line from {loc1} to {loc2}',
  'Create a path from {loc1} to {loc2}',
  'Add a line connecting {loc1} and {loc2}',
  'Draw a route from {loc1} to {loc2}',
  'Show the connection between {loc1} and {loc2}',
  'Trace a line from {loc1} to {loc2}',
];

const ADD_POLYGON_TEMPLATES = [
  'Draw a triangle connecting {loc1}, {loc2}, and {loc3}',
  'Create a polygon around {loc1}',
  'Add a {color} polygon at {location}',
  'Draw a shape connecting {loc1}, {loc2}, and {loc3}',
  'Create a filled area from {loc1} to {loc2} to {loc3}',
];

const ADD_CIRCLE_TEMPLATES = [
  'Draw a circle around {location} with {radius}km radius',
  'Create a {radius}km circle at {location}',
  'Add a {color} circle around {location}',
  'Draw a {radius} kilometer radius circle at {location}',
  'Create a circular area of {radius}km around {location}',
  'Add a {radius}km radius circle centered on {location}',
  'Draw a flat circle at {location}',
  'Add an ellipse around {location}',
];

// 3D Shape Templates - IMPORTANT: These create 3D volumes, not flat shapes
const ADD_SPHERE_TEMPLATES = [
  'Add a {color} sphere at {location}',
  'Put a sphere over {location}',
  'Create a sphere at {location}',
  'Add a {radius}km sphere to {location}',
  'Put a {radius}km radius sphere at {location}',
  'Add a sphere to {location} {radius}km in radius',
  'Create a {color} sphere over {location}',
  'Add a ball at {location}',
  'Put a ball over {location}',
  'Create a 3D sphere at {location}',
  'Add a {color} ball at {location}',
  'Place a sphere at {location}',
  'Add a sphere {radius}km in radius at {location}',
  'I want a sphere at {location}',
  'Add a sphere to {location}',
  'Put a {color} sphere over {location}',
  'Create a large sphere at {location}',
  'Add a {radius} kilometer sphere to {location}',
  'Make a sphere at {location}',
  'Show a sphere at {location}',
  'Add a sphere above {location}',
  'Put a sphere over {location} with {radius}km radius',
  'Add a {radius}km sphere above {location}',
  'Create a sphere {radius}km in radius at {location} {height}km above the ground',
];

const ADD_BOX_TEMPLATES = [
  'Add a box at {location}',
  'Put a {color} box at {location}',
  'Create a cube at {location}',
  'Add a 3D box at {location}',
  'Place a box over {location}',
  'Add a rectangular box at {location}',
];

const ADD_CYLINDER_TEMPLATES = [
  'Add a cylinder at {location}',
  'Put a {color} cylinder at {location}',
  'Create a cylinder at {location}',
  'Add a tall cylinder at {location}',
  'Create a cone at {location}',
  'Add a {color} cone at {location}',
];

const ADD_CORRIDOR_TEMPLATES = [
  'Draw a corridor from {loc1} to {loc2}',
  'Create a road from {loc1} to {loc2}',
  'Add a {width}m wide corridor from {loc1} to {loc2}',
  'Draw a path {width} meters wide from {loc1} to {loc2}',
];

const ADD_WALL_TEMPLATES = [
  'Create a wall around {location}',
  'Add walls around {location}',
  'Build a wall at {location}',
];

const ADD_RECTANGLE_TEMPLATES = [
  'Draw a rectangle at {location}',
  'Add a {color} rectangle over {location}',
  'Create a rectangular area at {location}',
];

const FLY_TO_ENTITY_TEMPLATES = [
  'Fly to the {entityName}',
  'Go to the {entityName}',
  'Zoom to the {entityName}',
  'Navigate to the {entityName}',
  'Show me the {entityName}',
  'Fly to {entityName}',
  'Go to {entityName}',
  'Zoom to {entityName}',
];

const ZOOM_IN_TEMPLATES = [
  'Zoom in',
  'Get closer',
  'Zoom in more',
  'Move closer',
  'Zoom in a bit',
  'Get a closer look',
  'Magnify',
  'Zoom in slightly',
  'Increase zoom',
  'Closer please',
];

const ZOOM_OUT_TEMPLATES = [
  'Zoom out',
  'Move back',
  'Zoom out more',
  'Pull back',
  'Zoom out a bit',
  'Get a wider view',
  'Zoom out slightly',
  'Decrease zoom',
  'Further away',
  'Show more area',
];

const SCENE_MODE_TEMPLATES = {
  '2D': [
    'Switch to 2D mode',
    'Show the flat map',
    'Use 2D view',
    'Change to 2D',
    'Go to 2D mode',
    'Show me the flat view',
    'Display as a flat map',
    'Switch to map view',
  ],
  '3D': [
    'Switch to 3D mode',
    'Show the globe',
    'Use 3D view',
    'Change to 3D',
    'Go to 3D mode',
    'Show the 3D globe',
    'Display as a globe',
    'Switch to globe view',
  ],
  'COLUMBUS_VIEW': [
    'Switch to Columbus view',
    'Use 2.5D view',
    'Show Columbus projection',
    'Change to Columbus view',
    'Go to Columbus mode',
    'Use the flat globe view',
  ],
};

const TIME_TEMPLATES = {
  play: [
    'Play the animation',
    'Start the animation',
    'Play',
    'Start time',
    'Animate',
    'Begin animation',
    'Start the simulation',
    'Play the timeline',
    'Unpause',
    'Resume animation',
  ],
  pause: [
    'Pause the animation',
    'Stop the animation',
    'Pause',
    'Stop time',
    'Freeze',
    'Pause the simulation',
    'Stop the timeline',
    'Hold animation',
    'Pause here',
  ],
};

// ============================================================================
// Camera Control Templates
// ============================================================================

const SET_VIEW_TEMPLATES = [
  'Jump to {location}',
  'Teleport to {location}',
  'Instantly go to {location}',
  'Set camera to {location}',
  'Position camera at {location}',
  'Set view to {location}',
  'Snap to {location}',
  'Immediately show {location}',
  'Quick jump to {location}',
  'Instant view of {location}',
  'Set the view to {location}',
  'Position at {location}',
  'Snap the camera to {location}',
  'Instantly move to {location}',
  'Teleport the camera to {location}',
  'Jump the view to {location}',
  'Set camera position at {location}',
  'Quick teleport to {location}',
  'Instant jump to {location}',
  'Set the camera at {location}',
  'Snap view to {location}',
  'Immediately go to {location}',
  'Position view at {location}',
  'Direct jump to {location}',
  'Set my position at {location}',
  'Teleport me to {location}',
  'Jump camera to {location}',
  'Set location to {location}',
  'Instant move to {location}',
  'Quick snap to {location}',
  'Immediately position at {location}',
  'Set position at {location}',
  'Jump view to {location}',
  'Snap camera at {location}',
  'Instant position at {location}',
  'Set my view to {location}',
];

const GET_CAMERA_TEMPLATES = [
  'Where am I?',
  "What's my position?",
  'Camera location',
  'Current position',
  'Show coordinates',
  'Get camera position',
  "What's the current location?",
  'Show my coordinates',
  'Where is the camera?',
  "What's the camera position?",
  'Current camera location',
  'Get current position',
  'Show current coordinates',
  'Tell me my position',
  'What are my coordinates?',
  'Where am I looking?',
  'Get my location',
  'Show camera position',
  'Current view position',
  "What's the view location?",
  'Report camera position',
  'Get coordinates',
  'Camera coordinates',
  'View coordinates',
  'Position info',
  'Location info',
  'Show position',
  'Display coordinates',
  'Get location',
  'What coordinates am I at?',
  'Show my position',
  'Report position',
  'Camera info',
  'View info',
  'Position report',
  'Get view position',
];

const ROTATE_CAMERA_TEMPLATES = [
  'Turn left',
  'Turn right',
  'Look up',
  'Look down',
  'Pan camera left',
  'Pan camera right',
  'Rotate view left',
  'Rotate view right',
  'Tilt up',
  'Tilt down',
  'Pan left',
  'Pan right',
  'Rotate left',
  'Rotate right',
  'Turn the camera left',
  'Turn the camera right',
  'Rotate the view up',
  'Rotate the view down',
  'Look left',
  'Look right',
  'Swivel left',
  'Swivel right',
  'Pivot left',
  'Pivot right',
  'Turn view left',
  'Turn view right',
  'Pan the camera up',
  'Pan the camera down',
  'Tilt the camera up',
  'Tilt the camera down',
  'Spin left',
  'Spin right',
  'Rotate camera left',
  'Rotate camera right',
  'Move view left',
  'Move view right',
  'Shift view left',
  'Shift view right',
];

const TRACK_ENTITY_TEMPLATES = [
  'Follow the {entityType}',
  'Track the {entityType}',
  'Keep eye on the {entityType}',
  'Watch the {entityType}',
  'Follow {entityName}',
  'Track {entityName}',
  'Keep following the {entityType}',
  'Stay on the {entityType}',
  'Lock on to the {entityType}',
  'Lock onto {entityName}',
  'Keep tracking the {entityType}',
  'Follow along with the {entityType}',
  'Stay with the {entityType}',
  'Keep watching the {entityType}',
  'Monitor the {entityType}',
  'Pursue the {entityType}',
  'Chase the {entityType}',
  'Trail the {entityType}',
  'Shadow the {entityType}',
  'Keep up with the {entityType}',
  'Follow that {entityType}',
  'Track that {entityType}',
  'Watch that {entityType}',
  'Focus on the {entityType}',
  'Lock camera on {entityName}',
  'Keep camera on {entityName}',
  'Follow entity {entityName}',
  'Track entity {entityName}',
  'Attach to the {entityType}',
  'Attach camera to {entityName}',
];

// ============================================================================
// Data Loading Templates
// ============================================================================

const LOAD_GEOJSON_TEMPLATES = [
  'Load GeoJSON from {url}',
  'Import GeoJSON {url}',
  'Open GeoJSON file {url}',
  'Load the GeoJSON {url}',
  'Import GeoJSON data from {url}',
  'Open GeoJSON {url}',
  'Load GeoJSON data {url}',
  'Fetch GeoJSON from {url}',
  'Get GeoJSON {url}',
  'Add GeoJSON from {url}',
  'Read GeoJSON {url}',
  'Parse GeoJSON {url}',
  'Load GeoJSON file from {url}',
  'Import GeoJSON file {url}',
  'Display GeoJSON from {url}',
  'Show GeoJSON {url}',
  'Render GeoJSON from {url}',
  'Load geo JSON from {url}',
  'Import geo json {url}',
  'Add GeoJSON data from {url}',
];

const LOAD_KML_TEMPLATES = [
  'Load KML from {url}',
  'Import KML {url}',
  'Open KML file {url}',
  'Load the KML {url}',
  'Import KML data from {url}',
  'Open KMZ {url}',
  'Load KMZ file {url}',
  'Load KMZ from {url}',
  'Import KMZ {url}',
  'Open KMZ file {url}',
  'Fetch KML from {url}',
  'Get KML {url}',
  'Add KML from {url}',
  'Read KML {url}',
  'Load KML file from {url}',
  'Import KML file {url}',
  'Display KML from {url}',
  'Show KML {url}',
  'Load Google Earth file {url}',
  'Import Google Earth data {url}',
];

const LOAD_CZML_TEMPLATES = [
  'Load CZML from {url}',
  'Import CZML data {url}',
  'Open CZML file {url}',
  'Load the CZML {url}',
  'Import CZML from {url}',
  'Open CZML {url}',
  'Load CZML data {url}',
  'Fetch CZML from {url}',
  'Get CZML {url}',
  'Add CZML from {url}',
  'Read CZML {url}',
  'Parse CZML {url}',
  'Load CZML file from {url}',
  'Import CZML file {url}',
  'Display CZML from {url}',
  'Show CZML {url}',
  'Load Cesium data from {url}',
  'Import Cesium animation {url}',
  'Load animation data {url}',
  'Import time-dynamic data {url}',
];

const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'white', 'black', 'gray'];

const RADII = [10, 25, 50, 100, 200, 500, 1000];

// Entity types for tracking
const ENTITY_TYPES = [
  'satellite',
  'aircraft',
  'plane',
  'ship',
  'vehicle',
  'drone',
  'rocket',
  'station',
  'target',
  'object',
  'marker',
  'point',
  'vessel',
  'helicopter',
  'car',
  'truck',
  'train',
  'balloon',
  'missile',
  'projectile',
];

// Sample entity names for tracking
const ENTITY_NAMES = [
  'ISS',
  'Hubble',
  'Dragon',
  'Starlink-1',
  'GPS-IIF',
  'Flight-123',
  'Ship-Alpha',
  'Drone-7',
  'Rocket-X',
  'Target-1',
  'Vehicle-A',
  'Station-3',
  'Sat-42',
  'Object-9',
  'Aircraft-B',
  'Helicopter-2',
  'Vessel-5',
  'Train-Express',
  'Balloon-High',
  'Projectile-M',
];

// Sample URLs for data loading
const SAMPLE_URLS = {
  geojson: [
    'https://example.com/data.geojson',
    'https://api.example.com/features.json',
    'https://data.gov/boundaries.geojson',
    'https://maps.example.org/points.geojson',
    '/data/local-features.geojson',
    './assets/regions.geojson',
    'https://cdn.example.com/cities.geojson',
    'https://geodata.example.net/countries.json',
    'https://api.mapbox.com/data.geojson',
    'https://storage.example.com/parcels.geojson',
  ],
  kml: [
    'https://example.com/data.kml',
    'https://earth.google.com/places.kml',
    'https://maps.example.org/tour.kmz',
    '/data/local-places.kml',
    './assets/landmarks.kmz',
    'https://cdn.example.com/routes.kml',
    'https://geodata.example.net/overlay.kmz',
    'https://storage.example.com/markers.kml',
    'https://api.example.com/export.kml',
    'https://data.gov/features.kmz',
  ],
  czml: [
    'https://example.com/animation.czml',
    'https://cesium.com/data/satellites.czml',
    'https://api.example.org/trajectory.czml',
    '/data/local-animation.czml',
    './assets/simulation.czml',
    'https://cdn.example.com/orbits.czml',
    'https://geodata.example.net/timeline.czml',
    'https://storage.example.com/tracking.czml',
    'https://api.example.com/flight-path.czml',
    'https://data.gov/dynamic-data.czml',
  ],
};

const LABEL_TEXTS = [
  'Hello',
  'Here',
  'Important',
  'Note',
  'Visit',
  'Start',
  'End',
  'Destination',
  'Home',
  'Work',
  'Point of Interest',
  'Landmark',
  'Check this out',
  'Meeting point',
];

// ============================================================================
// Data Generation Functions
// ============================================================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

function generateFlyToExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const template = randomChoice(FLY_TO_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template.replace('{location}', nameOrAlias);
  const output = JSON.stringify({
    tool: 'flyTo',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      height: location.height || 500000,
    },
  });

  return { instruction, output };
}

function generateAddPointExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POINT_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addPoint',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      name: location.name,
      color,
    },
  });

  return { instruction, output };
}

function generateAddLabelExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const text = randomChoice(LABEL_TEXTS);
  const template = randomChoice(ADD_LABEL_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{text}', text);

  const output = JSON.stringify({
    tool: 'addLabel',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      text,
      color: 'white',
    },
  });

  return { instruction, output };
}

function generateAddPolylineExample(): { instruction: string; output: string } {
  const locations = shuffle(LOCATIONS).slice(0, 2);
  const loc1 = locations[0]!;
  const loc2 = locations[1]!;
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POLYLINE_TEMPLATES);

  const instruction = template
    .replace('{loc1}', loc1.name)
    .replace('{loc2}', loc2.name)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addPolyline',
    arguments: {
      positions: [
        { longitude: loc1.longitude, latitude: loc1.latitude },
        { longitude: loc2.longitude, latitude: loc2.latitude },
      ],
      name: `${loc1.name} to ${loc2.name}`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddPolygonExample(): { instruction: string; output: string } {
  const locations = shuffle(LOCATIONS.filter(l => l.type === 'city')).slice(0, 3);
  const loc1 = locations[0]!;
  const loc2 = locations[1]!;
  const loc3 = locations[2]!;
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_POLYGON_TEMPLATES);

  const instruction = template
    .replace('{loc1}', loc1.name)
    .replace('{loc2}', loc2.name)
    .replace('{loc3}', loc3.name)
    .replace('{location}', loc1.name)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addPolygon',
    arguments: {
      positions: [
        { longitude: loc1.longitude, latitude: loc1.latitude },
        { longitude: loc2.longitude, latitude: loc2.latitude },
        { longitude: loc3.longitude, latitude: loc3.latitude },
      ],
      name: `${loc1.name} Triangle`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddCircleExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const radius = randomChoice(RADII);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_CIRCLE_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{radius}', radius.toString())
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addCircle',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      radius: radius * 1000, // Convert km to meters
      name: `${location.name} Area`,
      color,
    },
  });

  return { instruction, output };
}

// ============================================================================
// 3D Shape Generators
// ============================================================================

function generateAddSphereExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const radius = randomChoice(RADII);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_SPHERE_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);
  const height = Math.random() > 0.7 ? randomChoice([1, 5, 10, 20, 50]) : undefined;

  let instruction = template
    .replace(/{location}/g, nameOrAlias)
    .replace(/{radius}/g, radius.toString())
    .replace(/{color}/g, color);

  if (height !== undefined) {
    instruction = instruction.replace(/{height}/g, height.toString());
  } else {
    // Remove height placeholder if not used
    instruction = instruction.replace(/ {height}km above the ground/g, '');
  }

  const args: Record<string, unknown> = {
    longitude: location.longitude,
    latitude: location.latitude,
    radius: radius * 1000, // Convert km to meters
    name: `${location.name} Sphere`,
    color,
  };

  if (height !== undefined) {
    args.height = height * 1000; // Convert km to meters
  }

  const output = JSON.stringify({
    tool: 'addSphere',
    arguments: args,
  });

  return { instruction, output };
}

function generateAddBoxExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_BOX_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);
  const size = randomChoice([100, 200, 500, 1000, 2000]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addBox',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      dimensionX: size,
      dimensionY: size,
      dimensionZ: size * 2,
      name: `${location.name} Box`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddCylinderExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_CYLINDER_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);
  const isCone = template.includes('cone');

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{color}', color);

  const output = JSON.stringify({
    tool: 'addCylinder',
    arguments: {
      longitude: location.longitude,
      latitude: location.latitude,
      length: randomChoice([100, 300, 500, 1000]),
      topRadius: isCone ? 0 : randomChoice([50, 100, 200]),
      bottomRadius: randomChoice([50, 100, 200]),
      name: isCone ? `${location.name} Cone` : `${location.name} Cylinder`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddCorridorExample(): { instruction: string; output: string } {
  const locations = shuffle(LOCATIONS).slice(0, 2);
  const loc1 = locations[0]!;
  const loc2 = locations[1]!;
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_CORRIDOR_TEMPLATES);
  const width = randomChoice([10, 50, 100, 500]);

  const instruction = template
    .replace('{loc1}', loc1.name)
    .replace('{loc2}', loc2.name)
    .replace('{color}', color)
    .replace('{width}', width.toString());

  const output = JSON.stringify({
    tool: 'addCorridor',
    arguments: {
      positions: [
        { longitude: loc1.longitude, latitude: loc1.latitude },
        { longitude: loc2.longitude, latitude: loc2.latitude },
      ],
      width,
      name: `${loc1.name} to ${loc2.name} Corridor`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddWallExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_WALL_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{color}', color);

  // Create a simple square wall around the location
  const offset = 0.01; // About 1km
  const positions = [
    { longitude: location.longitude - offset, latitude: location.latitude + offset },
    { longitude: location.longitude + offset, latitude: location.latitude + offset },
    { longitude: location.longitude + offset, latitude: location.latitude - offset },
    { longitude: location.longitude - offset, latitude: location.latitude - offset },
    { longitude: location.longitude - offset, latitude: location.latitude + offset }, // Close the loop
  ];

  const output = JSON.stringify({
    tool: 'addWall',
    arguments: {
      positions,
      maximumHeights: [500, 500, 500, 500, 500],
      minimumHeights: [0, 0, 0, 0, 0],
      name: `${location.name} Wall`,
      color,
    },
  });

  return { instruction, output };
}

function generateAddRectangleExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const color = randomChoice(COLORS);
  const template = randomChoice(ADD_RECTANGLE_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template
    .replace('{location}', nameOrAlias)
    .replace('{color}', color);

  const offset = 0.05; // About 5km

  const output = JSON.stringify({
    tool: 'addRectangle',
    arguments: {
      west: location.longitude - offset,
      south: location.latitude - offset,
      east: location.longitude + offset,
      north: location.latitude + offset,
      name: `${location.name} Rectangle`,
      color,
    },
  });

  return { instruction, output };
}

function generateFlyToEntityExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const template = randomChoice(FLY_TO_ENTITY_TEMPLATES);
  const entitySuffix = randomChoice(['Sphere', 'Box', 'Marker', 'Point', 'Label']);
  const entityName = `${location.name} ${entitySuffix}`;

  const instruction = template.replace(/{entityName}/g, entityName);

  const output = JSON.stringify({
    tool: 'flyToEntity',
    arguments: {
      entityId: entityName,
      duration: 3,
    },
  });

  return { instruction, output };
}

function generateZoomExample(): { instruction: string; output: string } {
  const zoomIn = Math.random() > 0.5;
  const templates = zoomIn ? ZOOM_IN_TEMPLATES : ZOOM_OUT_TEMPLATES;
  const instruction = randomChoice(templates);

  const amounts = [100000, 200000, 500000, 1000000, 2000000];
  const amount = randomChoice(amounts) * (zoomIn ? 1 : -1);

  const output = JSON.stringify({
    tool: 'zoom',
    arguments: { amount },
  });

  return { instruction, output };
}

function generateSceneModeExample(): { instruction: string; output: string } {
  const mode = randomChoice(['2D', '3D', 'COLUMBUS_VIEW'] as const);
  const templates = SCENE_MODE_TEMPLATES[mode];
  const instruction = randomChoice(templates);

  const output = JSON.stringify({
    tool: 'setSceneMode',
    arguments: { mode },
  });

  return { instruction, output };
}

function generateTimeExample(): { instruction: string; output: string } {
  const action = Math.random() > 0.5 ? 'play' : 'pause';
  const templates = TIME_TEMPLATES[action];
  const instruction = randomChoice(templates);

  const output = JSON.stringify({
    tool: action === 'play' ? 'playAnimation' : 'pauseAnimation',
    arguments: {},
  });

  return { instruction, output };
}

function generateCoordinateExample(): { instruction: string; output: string } {
  // Generate random coordinate examples
  const lat = Math.round((Math.random() * 180 - 90) * 1000) / 1000;
  const lon = Math.round((Math.random() * 360 - 180) * 1000) / 1000;

  const templates = [
    `Go to coordinates ${lat}, ${lon}`,
    `Fly to ${lat}, ${lon}`,
    `Navigate to latitude ${lat}, longitude ${lon}`,
    `Show me location ${lat}N, ${lon}E`,
    `Take me to ${lat}, ${lon}`,
  ];

  const instruction = randomChoice(templates);
  const output = JSON.stringify({
    tool: 'flyTo',
    arguments: {
      longitude: lon,
      latitude: lat,
      height: 500000,
    },
  });

  return { instruction, output };
}

// ============================================================================
// Camera Control Generators
// ============================================================================

function generateSetViewExample(): { instruction: string; output: string } {
  const location = randomChoice(LOCATIONS);
  const template = randomChoice(SET_VIEW_TEMPLATES);
  const nameOrAlias = Math.random() > 0.3 ? location.name : randomChoice([location.name, ...location.aliases]);

  const instruction = template.replace('{location}', nameOrAlias);

  // Generate random heading, pitch, roll for variety
  const heading = Math.random() > 0.5 ? Math.round(Math.random() * 360) : undefined;
  const pitch = Math.random() > 0.5 ? Math.round(-90 + Math.random() * 90) : undefined;

  const args: Record<string, unknown> = {
    longitude: location.longitude,
    latitude: location.latitude,
    height: location.height || 500000,
  };

  if (heading !== undefined) args.heading = heading;
  if (pitch !== undefined) args.pitch = pitch;

  const output = JSON.stringify({
    tool: 'setView',
    arguments: args,
  });

  return { instruction, output };
}

function generateGetCameraExample(): { instruction: string; output: string } {
  const instruction = randomChoice(GET_CAMERA_TEMPLATES);

  const output = JSON.stringify({
    tool: 'getCamera',
    arguments: {},
  });

  return { instruction, output };
}

function generateRotateCameraExample(): { instruction: string; output: string } {
  const template = randomChoice(ROTATE_CAMERA_TEMPLATES);

  // Determine rotation direction and axis from template
  const isHorizontal = template.includes('left') || template.includes('right');
  const isPositive = template.includes('right') || template.includes('up');

  // Generate rotation amount in degrees
  const amount = randomChoice([5, 10, 15, 30, 45, 90]);
  const adjustedAmount = isPositive ? amount : -amount;

  const args: Record<string, unknown> = {};
  if (isHorizontal) {
    args.heading = adjustedAmount;
  } else {
    args.pitch = adjustedAmount;
  }

  const output = JSON.stringify({
    tool: 'rotateCamera',
    arguments: args,
  });

  return { instruction: template, output };
}

function generateTrackEntityExample(): { instruction: string; output: string } {
  const template = randomChoice(TRACK_ENTITY_TEMPLATES);
  const entityType = randomChoice(ENTITY_TYPES);
  const entityName = randomChoice(ENTITY_NAMES);

  const instruction = template
    .replace('{entityType}', entityType)
    .replace('{entityName}', entityName);

  // Use entity name if template used {entityName}, otherwise generate an ID based on type
  const entityId = template.includes('{entityName}')
    ? entityName
    : `${entityType}-${Math.floor(Math.random() * 100)}`;

  const output = JSON.stringify({
    tool: 'trackEntity',
    arguments: {
      entityId,
    },
  });

  return { instruction, output };
}

// ============================================================================
// Data Loading Generators
// ============================================================================

function generateLoadGeoJSONExample(): { instruction: string; output: string } {
  const template = randomChoice(LOAD_GEOJSON_TEMPLATES);
  const url = randomChoice(SAMPLE_URLS.geojson);

  const instruction = template.replace('{url}', url);

  const output = JSON.stringify({
    tool: 'loadGeoJSON',
    arguments: {
      url,
    },
  });

  return { instruction, output };
}

function generateLoadKMLExample(): { instruction: string; output: string } {
  const template = randomChoice(LOAD_KML_TEMPLATES);
  const url = randomChoice(SAMPLE_URLS.kml);

  const instruction = template.replace('{url}', url);

  const output = JSON.stringify({
    tool: 'loadKML',
    arguments: {
      url,
    },
  });

  return { instruction, output };
}

function generateLoadCZMLExample(): { instruction: string; output: string } {
  const template = randomChoice(LOAD_CZML_TEMPLATES);
  const url = randomChoice(SAMPLE_URLS.czml);

  const instruction = template.replace('{url}', url);

  const output = JSON.stringify({
    tool: 'loadCZML',
    arguments: {
      url,
    },
  });

  return { instruction, output };
}

// ============================================================================
// Main Generator
// ============================================================================

function generateTrainingData(count: number): Array<{ instruction: string; output: string }> {
  const examples: Array<{ instruction: string; output: string }> = [];
  const generators = [
    // Camera controls
    { fn: generateFlyToExample, weight: 20 },
    { fn: generateFlyToEntityExample, weight: 8 },
    { fn: generateZoomExample, weight: 6 },
    { fn: generateCoordinateExample, weight: 2 },
    { fn: generateSetViewExample, weight: 8 },
    { fn: generateGetCameraExample, weight: 6 },
    { fn: generateRotateCameraExample, weight: 6 },
    { fn: generateTrackEntityExample, weight: 5 },
    // 2D Entities
    { fn: generateAddPointExample, weight: 12 },
    { fn: generateAddLabelExample, weight: 6 },
    { fn: generateAddPolylineExample, weight: 6 },
    { fn: generateAddPolygonExample, weight: 4 },
    { fn: generateAddCircleExample, weight: 6 },
    // 3D Shapes - HIGH WEIGHT to train sphere vs circle distinction
    { fn: generateAddSphereExample, weight: 15 },
    { fn: generateAddBoxExample, weight: 4 },
    { fn: generateAddCylinderExample, weight: 4 },
    { fn: generateAddCorridorExample, weight: 3 },
    { fn: generateAddWallExample, weight: 2 },
    { fn: generateAddRectangleExample, weight: 3 },
    // Scene
    { fn: generateSceneModeExample, weight: 4 },
    { fn: generateTimeExample, weight: 3 },
    // Data Loading
    { fn: generateLoadGeoJSONExample, weight: 4 },
    { fn: generateLoadKMLExample, weight: 3 },
    { fn: generateLoadCZMLExample, weight: 3 },
  ];

  const totalWeight = generators.reduce((sum, g) => sum + g.weight, 0);

  for (let i = 0; i < count; i++) {
    let r = Math.random() * totalWeight;
    for (const gen of generators) {
      r -= gen.weight;
      if (r <= 0) {
        examples.push(gen.fn());
        break;
      }
    }
  }

  return examples;
}

// ============================================================================
// Output
// ============================================================================

function main() {
  const targetCount = 15000; // Generate extra to account for deduplication
  console.log(`Generating ${targetCount} training examples...`);

  const examples = generateTrainingData(targetCount);

  // Deduplicate
  const seen = new Set<string>();
  const unique = examples.filter(ex => {
    const key = ex.instruction.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Generated ${unique.length} unique examples`);

  // Write to file
  const outputPath = path.join(__dirname, 'generated-training-data.jsonl');
  const content = unique.map(ex => JSON.stringify(ex)).join('\n');
  fs.writeFileSync(outputPath, content);

  console.log(`Wrote training data to ${outputPath}`);

  // Statistics
  const toolCounts: Record<string, number> = {};
  for (const ex of unique) {
    try {
      const output = JSON.parse(ex.output);
      toolCounts[output.tool] = (toolCounts[output.tool] || 0) + 1;
    } catch {}
  }

  console.log('\nTool distribution:');
  for (const [tool, count] of Object.entries(toolCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tool}: ${count} (${((count / unique.length) * 100).toFixed(1)}%)`);
  }
}

main();
